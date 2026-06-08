import type {
  AgendamentoApi,
  AgendamentoApiErrorBody,
  AgendamentoHorario,
  AgendamentoServico,
  ApiEnvelope,
  CancelarAgendamentoInput,
  CodigoAgendamentoResponse,
  ConfirmarAgendamentoInput,
  CriarPreReservaInput,
  CriarPreReservaResponse,
  RemarcarAgendamentoInput
} from "./agendamento.types";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface AgendamentoApiClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchFn?: FetchLike;
}

export class AgendamentoApiError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem?: string
  ) {
    super(mensagem ?? codigo);
    this.name = "AgendamentoApiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgendamentoApiClient implements AgendamentoApi {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: FetchLike;

  constructor(options: AgendamentoApiClientOptions) {
    const baseUrl = options.baseUrl.trim();
    const apiKey = options.apiKey.trim();

    if (!baseUrl) {
      throw new Error("AGENDAMENTO_API_BASE_URL nao configurada.");
    }

    if (!apiKey) {
      throw new Error("CHATBOT_API_KEY nao configurada para consumir a API de agendamento.");
    }

    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    this.apiKey = apiKey;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async listarServicos(): Promise<AgendamentoServico[]> {
    return this.request("/api/v1/agendamentos/servicos");
  }

  async listarHorariosDisponiveis(input: {
    servico_id: string;
    limite?: number;
    de?: string;
    ate?: string;
  }): Promise<AgendamentoHorario[]> {
    const query = new URLSearchParams({ servico_id: input.servico_id });

    if (input.limite !== undefined) {
      query.set("limite", String(input.limite));
    }

    if (input.de) {
      query.set("de", input.de);
    }

    if (input.ate) {
      query.set("ate", input.ate);
    }

    return this.request(`/api/v1/agendamentos/horarios-disponiveis?${query}`);
  }

  async criarPreReserva(input: CriarPreReservaInput): Promise<CriarPreReservaResponse> {
    return this.request("/api/v1/agendamentos/pre-reservas", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async confirmarAgendamento(
    input: ConfirmarAgendamentoInput
  ): Promise<CodigoAgendamentoResponse> {
    return this.request("/api/v1/agendamentos/agendamentos", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async consultarAgendamento(codigo: string): Promise<unknown> {
    return this.request(`/api/v1/agendamentos/${encodeURIComponent(codigo)}`);
  }

  async cancelarAgendamento(
    codigo: string,
    input: CancelarAgendamentoInput
  ): Promise<unknown> {
    return this.request(`/api/v1/agendamentos/${encodeURIComponent(codigo)}/cancelar`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async remarcarAgendamento(
    codigo: string,
    input: RemarcarAgendamentoInput
  ): Promise<CodigoAgendamentoResponse> {
    return this.request(`/api/v1/agendamentos/${encodeURIComponent(codigo)}/remarcar`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      ...(init.body ? { "Content-Type": "application/json" } : {})
    };

    const response = await this.fetchFn(url, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers as Record<string, string> | undefined)
      }
    });

    const payload = await this.readJson(response);

    if (!response.ok) {
      const errorPayload = payload as AgendamentoApiErrorBody | null;
      const codigo = errorPayload?.erro?.codigo ?? "ERRO_API_AGENDAMENTO";
      const mensagem = errorPayload?.erro?.mensagem ?? codigo;
      throw new AgendamentoApiError(response.status, codigo, mensagem);
    }

    const envelope = payload as ApiEnvelope<T>;
    return envelope.dados;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }
}
