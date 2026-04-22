import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { IncomingMessage, MessagingProvider } from "../types/messaging";

export class WhatsAppProvider implements MessagingProvider {
  private static readonly QR_RENDER_COOLDOWN_MS = 180000; // 3 minutos;;

  private client: Client;
  private onMessageHandler: ((message: IncomingMessage) => Promise<void>) | null = null;
  private readonly pairingPhoneNumber: string | null;
  private readonly authPath: string;
  private readonly browserLogEnabled: boolean;
  private readonly pairingRetryDelayMs: number;
  private diagnosticsRegistered = false;
  private pairingRetryTimeout: NodeJS.Timeout | null = null;
  private lastQrRenderedAt = 0;

  constructor() {
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    this.authPath = process.env.WHATSAPP_AUTH_PATH?.trim() || ".wwebjs_auth";
    this.browserLogEnabled = this.isTruthy(process.env.WHATSAPP_BROWSER_LOGS);
    this.pairingRetryDelayMs = this.parseRetryDelay(
      process.env.WHATSAPP_PAIRING_RETRY_DELAY_MS
    );
    this.pairingPhoneNumber = this.normalizePhoneNumber(
      process.env.WHATSAPP_PHONE_NUMBER
    );

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "proconbot-jacarei",
        dataPath: this.authPath
      }),
      ...(this.pairingPhoneNumber
        ? {
            pairWithPhoneNumber: {
              phoneNumber: this.pairingPhoneNumber,
              showNotification: true,
              intervalMs: 180000
            }
          }
        : {}),
      puppeteer: {
        headless: true,
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
        ...(chromePath ? { executablePath: chromePath } : {})
      }
    });

    this.registerEvents();
    this.wrapPairingCodeRequest();
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
      if (this.pairingPhoneNumber) {
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

  private shouldRenderQrNow(): boolean {
    return Date.now() - this.lastQrRenderedAt >= WhatsAppProvider.QR_RENDER_COOLDOWN_MS;
  }

  private normalizePhoneNumber(phoneNumber?: string): string | null {
    const sanitized = phoneNumber?.replace(/\D/g, "") ?? "";
    return sanitized.length > 0 ? sanitized : null;
  }

  private parseRetryDelay(value?: string): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1000) {
      return 15000;
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
    }
  }

  private startDiagnosticsWatcher(): NodeJS.Timeout {
    return setInterval(() => {
      this.attachBrowserDiagnostics();
    }, 1000);
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
      showNotification = true,
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
        this.logError("Falha ao solicitar codigo de pareamento", error);
        await this.logPairingStateSnapshot();
        this.schedulePairingRetry(phoneNumber, showNotification, intervalMs);
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
    if (this.pairingRetryTimeout) {
      return;
    }

    console.warn(
      `[WhatsApp] Novo pareamento por codigo sera tentado em ${this.pairingRetryDelayMs} ms.`
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

  private async logPairingStateSnapshot(): Promise<void> {
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
