import mongoose from "mongoose";
import qrcode from "qrcode-terminal";
import { Client, LocalAuth, RemoteAuth, Message } from "whatsapp-web.js";
import { MongoWhatsappStore } from "./mongo-whatsapp-store";
import { IncomingMessage, MessagingProvider } from "../types/messaging";

export class WhatsAppProvider implements MessagingProvider {
  private static readonly QR_RENDER_COOLDOWN_MS = 180000; // 3 minutos;;
  private static readonly MESSAGE_DEDUP_TTL_MS = 10 * 60 * 1000;
  private static readonly DEFAULT_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

  private client: Client;
  private onMessageHandler: ((message: IncomingMessage) => Promise<void>) | null = null;
  private readonly recentMessageIds = new Map<string, number>();
  private readonly pairingPhoneNumber: string | null;
  private readonly authPath: string;
  private readonly authClientId: string;
  private readonly chromePath: string | undefined;
  private readonly browserLogEnabled: boolean;
  private readonly browserUserAgent: string;
  private readonly pairingShowNotification: boolean;
  private readonly pairingRetryDelayMs: number;
  private readonly pairingMaxAttempts: number;
  private readonly pairingQrFallbackEnabled: boolean;
  private diagnosticsRegistered = false;
  private pairingCodeEnabled = false;
  private pairingFailureCount = 0;
  private qrFallbackStarted = false;
  private pairingRetryTimeout: NodeJS.Timeout | null = null;
  private lastQrRenderedAt = 0;

  constructor() {
    this.chromePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined;
    this.authPath = process.env.WHATSAPP_AUTH_PATH?.trim() || ".wwebjs_auth";
    this.authClientId =
      process.env.WHATSAPP_AUTH_CLIENT_ID?.trim() || "proconbot-jacarei";
    this.browserLogEnabled = this.isTruthy(process.env.WHATSAPP_BROWSER_LOGS);
    this.browserUserAgent =
      process.env.WHATSAPP_USER_AGENT?.trim() ||
      WhatsAppProvider.DEFAULT_USER_AGENT;
    this.pairingShowNotification = this.parseBooleanEnv(
      process.env.WHATSAPP_PAIRING_SHOW_NOTIFICATION,
      false
    );
    this.pairingRetryDelayMs = this.parseRetryDelay(
      process.env.WHATSAPP_PAIRING_RETRY_DELAY_MS
    );
    this.pairingMaxAttempts = this.parsePositiveInteger(
      process.env.WHATSAPP_PAIRING_MAX_ATTEMPTS,
      3
    );
    this.pairingQrFallbackEnabled = this.parseBooleanEnv(
      process.env.WHATSAPP_PAIRING_FALLBACK_QR,
      true
    );
    this.pairingPhoneNumber = this.normalizePhoneNumber(
      process.env.WHATSAPP_PHONE_NUMBER
    );
    this.pairingCodeEnabled = Boolean(this.pairingPhoneNumber);

    this.client = this.createClient();
    this.registerEvents();
    this.wrapPairingCodeRequest();
  }

  private createClient(): Client {
    const authStrategy = this.buildAuthStrategy();
    const puppetHeadless = this.parseBooleanEnv(process.env.PUPPETEER_HEADLESS, true);
    const puppetUserDataDir = process.env.PUPPETEER_USER_DATA_DIR?.trim();
    const useUserDataDir = authStrategy instanceof LocalAuth && Boolean(puppetUserDataDir);

    return new Client({
      authStrategy,
      ...(this.isPairingCodeActive()
        ? {
            pairWithPhoneNumber: {
              phoneNumber: this.pairingPhoneNumber!,
              showNotification: this.pairingShowNotification,
              intervalMs: 180000
            }
          }
        : {}),
      puppeteer: {
        headless: puppetHeadless,
        dumpio: this.browserLogEnabled,
        protocolTimeout: 120000,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter",
          "--no-first-run",
          "--no-default-browser-check",
          "--window-size=1280,720"
        ],
        ...(this.chromePath ? { executablePath: this.chromePath } : {}),
        ...(useUserDataDir ? { userDataDir: puppetUserDataDir } : {})
      },
      userAgent: this.browserUserAgent
    });
  }

  /**
   * Seleciona a estratégia de autenticação:
   * - MongoDB conectado → RemoteAuth + MongoWhatsappStore
   *   (sessão persiste no banco entre deploys no Railway)
   * - Sem MongoDB → LocalAuth
   *   (sessão gravada em disco, adequado para desenvolvimento local)
   */
  private buildAuthStrategy(): LocalAuth | RemoteAuth {
    if (mongoose.connection.readyState === 1) {
      console.log(
        "[WhatsApp] MongoDB conectado — usando RemoteAuth (sessão persistida no banco)."
      );
      return new RemoteAuth({
        clientId: this.authClientId,
        dataPath: this.authPath,
        store: new MongoWhatsappStore(),
        backupSyncIntervalMs: 300_000 // sincroniza a cada 5 min
      });
    }

    console.log("[WhatsApp] Sem MongoDB — usando LocalAuth (sessão em disco).");
    return new LocalAuth({
      clientId: this.authClientId,
      dataPath: this.authPath
    });
  }

  async initialize(): Promise<void> {
    this.logStartupContext();
    const diagnosticsWatcher = this.startDiagnosticsWatcher();

    try {
      await this.client.initialize();
      clearInterval(diagnosticsWatcher);
      this.attachBrowserDiagnostics();
    } catch (error) {
      clearInterval(diagnosticsWatcher);
      this.logError("Falha ao inicializar cliente do WhatsApp", error);
      this.attachBrowserDiagnostics();
      throw error;
    }
  }

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.onMessageHandler = handler;
  }

  private registerEvents(): void {
    this.client.on("qr", (qr: string) => {
      if (this.isPairingCodeActive()) {
        console.log(
          "[WhatsApp] QR recebido, mas o pareamento por codigo esta ativo. Aguarde o codigo de 8 caracteres no log."
        );
        return;
      }

      if (!this.shouldRenderQrNow()) {
        const remainingMs =
          WhatsAppProvider.QR_RENDER_COOLDOWN_MS -
          (Date.now() - this.lastQrRenderedAt);
        console.log(
          `[WhatsApp] Novo QR recebido. Aguardando ${Math.ceil(
            remainingMs / 1000
          )}s para exibir novamente.`
        );
        return;
      }

      console.log("QR Code recebido. Escaneie com o WhatsApp:");
      this.lastQrRenderedAt = Date.now();
      qrcode.generate(qr, { small: true });
    });

    this.client.on("code", (code: string) => {
      console.log(
        `[WhatsApp] Codigo de pareamento recebido para ${this.maskPhoneNumber(
          this.pairingPhoneNumber
        )}: ${code}`
      );
      console.log(
        "[WhatsApp] No celular, abra WhatsApp > Dispositivos conectados > Conectar um dispositivo > Conectar com numero de telefone."
      );
    });

    this.client.on("authenticated", () => {
      console.log("[WhatsApp] Autenticado com sucesso.");
    });

    this.client.on("loading_screen", (percent: string | number, message: string) => {
      console.log(`[WhatsApp] Carregando sessao (${percent}%): ${message}`);
    });

    this.client.on("change_state", (state: string) => {
      console.log(`[WhatsApp] Estado alterado: ${state}`);
    });

    this.client.on("ready", () => {
      console.log("[WhatsApp] Conectado e pronto para uso.");
    });

    this.client.on("auth_failure", (message: string) => {
      console.error("[WhatsApp] Falha na autenticação:", message);
    });

    this.client.on("disconnected", (reason: string) => {
      console.warn("[WhatsApp] Desconectado:", reason);
    });

    this.client.on("error", (error: unknown) => {
      this.logError("Evento de erro do cliente WhatsApp", error);
    });

    this.client.on("message", async (message: Message) => {
      if (this.shouldIgnore(message)) return;
      if (this.wasRecentlyHandled(message)) return;

      if (this.onMessageHandler) {
        await this.onMessageHandler({
          from: message.from,
          body: message.body,
          timestamp: new Date().toISOString(),
          reply: async (text: string) => {
            await message.reply(text);
          }
        });
      }
    });
  }

  private shouldIgnore(message: Message): boolean {
    return (
      message.fromMe || 
      message.from === "status@broadcast" || 
      message.from.endsWith("@g.us")
    );
  }

  private wasRecentlyHandled(message: Message): boolean {
    const messageId = this.getMessageId(message);

    if (!messageId) {
      return false;
    }

    const now = Date.now();
    this.pruneRecentMessageIds(now);

    if (this.recentMessageIds.has(messageId)) {
      console.warn(`[WhatsApp] Mensagem duplicada ignorada: ${messageId}`);
      return true;
    }

    this.recentMessageIds.set(messageId, now);
    return false;
  }

  private getMessageId(message: Message): string | null {
    const messageWithId = message as Message & {
      id?: {
        _serialized?: string;
        id?: string;
      };
    };

    return messageWithId.id?._serialized || messageWithId.id?.id || null;
  }

  private pruneRecentMessageIds(now: number): void {
    for (const [messageId, handledAt] of this.recentMessageIds.entries()) {
      if (now - handledAt > WhatsAppProvider.MESSAGE_DEDUP_TTL_MS) {
        this.recentMessageIds.delete(messageId);
      }
    }
  }

  private shouldRenderQrNow(): boolean {
    return Date.now() - this.lastQrRenderedAt >= WhatsAppProvider.QR_RENDER_COOLDOWN_MS;
  }

  private normalizePhoneNumber(phoneNumber?: string): string | null {
    const sanitized = phoneNumber?.replace(/\D/g, "") ?? "";
    return sanitized.length > 0 ? sanitized : null;
  }

  private isPairingCodeActive(): boolean {
    return this.pairingCodeEnabled && Boolean(this.pairingPhoneNumber);
  }

  private parseRetryDelay(value?: string): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1000) {
      return 15000;
    }

    return parsed;
  }

  private parsePositiveInteger(value: string | undefined, defaultValue: number): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return defaultValue;
    }

    return parsed;
  }

  private isTruthy(value?: string): boolean {
    if (!value) {
      return false;
    }

    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  private logStartupContext(): void {
    console.log("[WhatsApp] Inicializando cliente.");
    console.log(
      `[WhatsApp] Chromium: ${process.env.PUPPETEER_EXECUTABLE_PATH || "padrao do Puppeteer"}`
    );
    console.log(`[WhatsApp] Client ID da sessao: ${this.authClientId}`);
    console.log(`[WhatsApp] User-Agent do navegador: ${this.browserUserAgent}`);
    console.log(`[WhatsApp] Diretorio de autenticacao: ${this.authPath}`);
    console.log(
      `[WhatsApp] Pareamento por codigo: ${this.pairingPhoneNumber ? "ativado" : "desativado"}`
    );

    if (this.pairingPhoneNumber) {
      console.log(
        `[WhatsApp] Numero configurado para pareamento: ${this.maskPhoneNumber(
          this.pairingPhoneNumber
        )}`
      );
      console.log(
        `[WhatsApp] Retry do pareamento por codigo: ${this.pairingRetryDelayMs} ms`
      );
      console.log(
        `[WhatsApp] Tentativas antes do fallback para QR: ${this.pairingMaxAttempts}`
      );
      console.log(
        `[WhatsApp] Fallback para QR: ${
          this.pairingQrFallbackEnabled ? "ativado" : "desativado"
        }`
      );
      console.log(
        `[WhatsApp] Notificacao de pareamento no celular: ${
          this.pairingShowNotification ? "ativada" : "desativada"
        }`
      );
    }
  }

  private startDiagnosticsWatcher(): NodeJS.Timeout {
    return setInterval(() => {
      this.attachBrowserDiagnostics();
    }, 1000);
  }

  private parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value.trim() === "") {
      return defaultValue;
    }

    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  private wrapPairingCodeRequest(): void {
    const client = this.client as Client & {
      requestPairingCode?: (
        phoneNumber: string,
        showNotification?: boolean,
        intervalMs?: number
      ) => Promise<string>;
    };

    if (!client.requestPairingCode) {
      return;
    }

    const originalRequestPairingCode = client.requestPairingCode.bind(client);

    client.requestPairingCode = async (
      phoneNumber: string,
      showNotification = this.pairingShowNotification,
      intervalMs = 180000
    ): Promise<string> => {
      try {
        const code = await originalRequestPairingCode(
          phoneNumber,
          showNotification,
          intervalMs
        );

        if (code) {
          console.log(
            `[WhatsApp] Solicitacao de codigo concluida para ${this.maskPhoneNumber(
              phoneNumber
            )}.`
          );
        }

        return code;
      } catch (error) {
        if (showNotification) {
          console.warn(
            "[WhatsApp] Pareamento com notificacao falhou. Tentando novamente sem notificacao no celular."
          );

          try {
            return await originalRequestPairingCode(
              phoneNumber,
              false,
              intervalMs
            );
          } catch (retryError) {
            this.logError(
              `Falha ao solicitar codigo de pareamento sem notificacao para ${this.maskPhoneNumber(
                phoneNumber
              )}`,
              retryError
            );
          }
        }

        this.pairingFailureCount++;
        this.logError(
          `Falha ao solicitar codigo de pareamento para ${this.maskPhoneNumber(
            phoneNumber
          )}`,
          error
        );
        await this.logPairingStateSnapshot({
          phoneNumber,
          showNotification: false,
          intervalMs,
          source: "requestPairingCode"
        });

        if (this.shouldFallbackToQr()) {
          this.scheduleQrFallback();
          return "";
        }

        this.schedulePairingRetry(phoneNumber, false, intervalMs);
        return "";
      }
    };
  }

  private attachBrowserDiagnostics(): void {
    if (this.diagnosticsRegistered) {
      return;
    }

    const page = (this.client as Client & {
      pupPage?: {
        on(event: string, listener: (...args: unknown[]) => void): void;
        url(): string;
      };
    }).pupPage;

    if (!page) {
      console.warn("[WhatsApp] Pagina Puppeteer ainda nao disponivel para diagnostico.");
      return;
    }

    this.diagnosticsRegistered = true;

    page.on("pageerror", (error: unknown) => {
      this.logError("Erro JavaScript na pagina do WhatsApp Web", error);
    });

    page.on("error", (error: unknown) => {
      this.logError("Erro fatal da pagina do WhatsApp Web", error);
    });

    if (this.browserLogEnabled) {
      page.on("console", (message: { type(): string; text(): string }) => {
        console.log(`[WhatsApp][browser:${message.type()}] ${message.text()}`);
      });

      page.on(
        "requestfailed",
        (request: {
          method(): string;
          url(): string;
          failure(): { errorText: string } | null;
        }) => {
          const failure = request.failure();
          console.warn(
            `[WhatsApp][browser:requestfailed] ${request.method()} ${request.url()} - ${
              failure?.errorText || "erro desconhecido"
            }`
          );
        }
      );
    }

    console.log(`[WhatsApp] Diagnostico do navegador ativo em ${page.url()}.`);
  }

  private schedulePairingRetry(
    phoneNumber: string,
    showNotification: boolean,
    intervalMs: number
  ): void {
    if (this.pairingRetryTimeout || this.qrFallbackStarted) {
      return;
    }

    console.warn(
      `[WhatsApp] Novo pareamento por codigo sera tentado em ${this.pairingRetryDelayMs} ms ` +
        `(numero=${this.maskPhoneNumber(phoneNumber)}, notify=${showNotification}, intervalMs=${intervalMs}).`
    );

    this.pairingRetryTimeout = setTimeout(() => {
      this.pairingRetryTimeout = null;

      void (this.client as Client & {
        requestPairingCode(
          phoneNumber: string,
          showNotification?: boolean,
          intervalMs?: number
        ): Promise<string>;
      })
        .requestPairingCode(phoneNumber, showNotification, intervalMs)
        .catch((error: unknown) => {
          this.logError("Falha ao repetir solicitacao do codigo", error);
        });
    }, this.pairingRetryDelayMs);
  }

  private shouldFallbackToQr(): boolean {
    return (
      this.pairingQrFallbackEnabled &&
      this.isPairingCodeActive() &&
      this.pairingFailureCount >= this.pairingMaxAttempts
    );
  }

  private scheduleQrFallback(): void {
    if (this.qrFallbackStarted) {
      return;
    }

    this.qrFallbackStarted = true;
    this.pairingCodeEnabled = false;

    if (this.pairingRetryTimeout) {
      clearTimeout(this.pairingRetryTimeout);
      this.pairingRetryTimeout = null;
    }

    console.warn(
      "[WhatsApp] Pareamento por codigo falhou repetidamente. Reiniciando em modo QR."
    );

    setTimeout(() => {
      void this.restartClientForQr();
    }, 1000);
  }

  private async restartClientForQr(): Promise<void> {
    try {
      await this.client.destroy();
    } catch (error) {
      this.logError("Falha ao encerrar cliente antes do fallback para QR", error);
    }

    this.diagnosticsRegistered = false;
    this.lastQrRenderedAt = 0;
    this.client = this.createClient();
    this.registerEvents();
    this.wrapPairingCodeRequest();

    try {
      await this.client.initialize();
    } catch (error) {
      this.logError("Falha ao inicializar cliente em modo QR", error);
    }
  }

  private async logPairingStateSnapshot(context?: {
    phoneNumber?: string;
    showNotification?: boolean;
    intervalMs?: number;
    source?: string;
  }): Promise<void> {
    const page = (this.client as Client & {
      pupPage?: {
        evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
      };
    }).pupPage;

    if (!page) {
      console.warn("[WhatsApp] Snapshot do pareamento indisponivel: pagina nao criada.");
      return;
    }

    try {
      if (context) {
        console.log("[WhatsApp] Contexto do pareamento:", {
          source: context.source ?? "desconhecido",
          phoneNumber: context.phoneNumber
            ? this.maskPhoneNumber(context.phoneNumber)
            : undefined,
          showNotification: context.showNotification,
          intervalMs: context.intervalMs
        });
      }

      const snapshot = await page.evaluate(() => {
        const authStore = (window as Window & {
          AuthStore?: {
            AppState?: { state?: string };
            PairingCodeLinkUtils?: unknown;
          };
        }).AuthStore;

        return {
          location: window.location.href,
          appState: authStore?.AppState?.state ?? "desconhecido",
          hasPairingCodeLinkUtils: Boolean(authStore?.PairingCodeLinkUtils),
          documentReadyState: document.readyState,
          userAgent: navigator.userAgent
        };
      });

      console.log("[WhatsApp] Snapshot do pareamento:", snapshot);
    } catch (error) {
      this.logError("Falha ao coletar snapshot do pareamento", error);
    }
  }

  private logError(context: string, error: unknown): void {
    if (error instanceof Error) {
      console.error(`[WhatsApp] ${context}: ${error.name}: ${error.message}`);

      if (error.stack) {
        console.error(error.stack);
      }

      const anyError = error as Error & { cause?: unknown };

      if (anyError.cause) {
        console.error("[WhatsApp] Causa original:", anyError.cause);
      }

      return;
    }

    console.error(`[WhatsApp] ${context}:`, error);
  }

  private maskPhoneNumber(phoneNumber: string | null): string {
    if (!phoneNumber) {
      return "numero configurado";
    }

    if (phoneNumber.length <= 4) {
      return phoneNumber;
    }

    return `${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-2)}`;
  }
}
