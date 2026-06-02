import { AgendamentoApiError } from "./agendamento-api-client";
import {
  InMemoryAgendamentoSessionStore,
  type IAgendamentoSessionStore
} from "./agendamento-session-store";
import type {
  AgendamentoApi,
  AgendamentoConversationHandler,
  AgendamentoConversationOptions,
  AgendamentoConversationSession,
  AgendamentoHorario,
  AgendamentoServico
} from "./agendamento.types";

const TRIGGERS_AGENDAMENTO = [
  "agendar",
  "agendamento",
  "marcar atendimento",
  "marcar horario",
  "marcar um horario",
  "quero atendimento presencial",
  "preciso agendar"
];

const MINUTOS_PRE_RESERVA = 15;
const LIMITE_HORARIOS = 5;

export class AgendamentoConversationService implements AgendamentoConversationHandler {
  constructor(
    private readonly api: AgendamentoApi,
    private readonly sessionStore: IAgendamentoSessionStore = new InMemoryAgendamentoSessionStore()
  ) {}

  async handle(
    userId: string,
    body: string,
    options: AgendamentoConversationOptions = {}
  ): Promise<string | null> {
    const normalized = this.normalize(body);
    const session = await this.sessionStore.get(userId);

    if (session && this.isMenuCommand(normalized)) {
      await this.sessionStore.clear(userId);
      return null;
    }

    if (session) {
      return this.continueSession(session, body);
    }

    if (options.allowStart === false || !this.isAgendamentoTrigger(normalized)) {
      return null;
    }

    return this.startSession(userId);
  }

  private async startSession(userId: string): Promise<string> {
    try {
      const servicos = await this.api.listarServicos();

      if (servicos.length === 0) {
        return "No momento nao encontrei servicos disponiveis para agendamento.";
      }

      await this.sessionStore.save({
        userId,
        etapa: "escolher_servico",
        servicos
      });

      return this.formatServicos(servicos);
    } catch {
      await this.sessionStore.clear(userId);
      return "Nao consegui acessar a agenda agora. Tente novamente em alguns instantes.";
    }
  }

  private async continueSession(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    switch (session.etapa) {
      case "escolher_servico":
        return this.escolherServico(session, body);
      case "escolher_horario":
        return this.escolherHorario(session, body);
      case "informar_nome":
        return this.informarNome(session, body);
      case "informar_cpf":
        return this.informarCpf(session, body);
      case "informar_assunto":
        return this.informarAssunto(session, body);
      case "informar_descricao":
        return this.informarDescricao(session, body);
      default:
        await this.sessionStore.clear(session.userId);
        return "Nao consegui continuar o agendamento. Vamos comecar novamente.";
    }
  }

  private async escolherServico(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    const servico = this.pickOption(session.servicos ?? [], body);

    if (!servico) {
      return `Opcao invalida. Escolha um dos servicos abaixo:\n\n${this.formatOptions(
        session.servicos ?? [],
        (item) => item.nome
      )}`;
    }

    try {
      const horarios = await this.api.listarHorariosDisponiveis({
        servico_id: servico._id,
        limite: LIMITE_HORARIOS
      });

      if (horarios.length === 0) {
        await this.sessionStore.clear(session.userId);
        return "Nao encontrei horarios disponiveis para esse servico no momento.";
      }

      await this.sessionStore.save({
        ...session,
        etapa: "escolher_horario",
        servico_id: servico._id,
        horarios
      });

      return this.formatHorarios(horarios);
    } catch {
      await this.sessionStore.clear(session.userId);
      return "Nao consegui consultar os horarios agora. Tente novamente em alguns instantes.";
    }
  }

  private async escolherHorario(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    const horario = this.pickOption(session.horarios ?? [], body);

    if (!horario) {
      return `Opcao invalida. Escolha um dos horarios abaixo:\n\n${this.formatOptions(
        session.horarios ?? [],
        (item) => this.formatHorarioLabel(item)
      )}`;
    }

    try {
      const preReserva = await this.api.criarPreReserva({
        horario_id: horario._id,
        conversa_id: session.userId,
        origem: "whatsapp",
        minutos_pre_reserva: MINUTOS_PRE_RESERVA
      });

      await this.sessionStore.save({
        ...session,
        etapa: "informar_nome",
        horario_id: horario._id,
        pre_reserva_id: preReserva.pre_reserva_id
      });

      return "Horario pre-reservado por 15 minutos. Informe seu nome completo.";
    } catch (error) {
      await this.sessionStore.clear(session.userId);
      return this.formatApiError(error);
    }
  }

  private async informarNome(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    const nome = body.trim();

    if (nome.length < 3) {
      return "Informe seu nome completo para continuar.";
    }

    await this.sessionStore.save({
      ...session,
      etapa: "informar_cpf",
      nome
    });

    return "Agora informe seu CPF com 11 digitos.";
  }

  private async informarCpf(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    const cpf = body.replace(/\D/g, "");

    if (cpf.length !== 11) {
      return "CPF invalido. Envie apenas um CPF com 11 digitos.";
    }

    await this.sessionStore.save({
      ...session,
      etapa: "informar_assunto",
      cpf
    });

    return "Qual e o assunto principal do atendimento?";
  }

  private async informarAssunto(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    const assunto = body.trim();

    if (assunto.length < 3) {
      return "Informe um assunto breve para o atendimento.";
    }

    await this.sessionStore.save({
      ...session,
      etapa: "informar_descricao",
      assunto
    });

    return "Descreva em poucas palavras o que aconteceu.";
  }

  private async informarDescricao(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    const descricao = body.trim();

    if (descricao.length < 5) {
      return "Envie uma descricao um pouco mais completa para o atendimento.";
    }

    try {
      const resultado = await this.api.confirmarAgendamento({
        horario_id: session.horario_id!,
        pre_reserva_id: session.pre_reserva_id!,
        conversa_id: session.userId,
        cidadao: {
          nome: session.nome!,
          cpf: session.cpf!
        },
        assunto: session.assunto!,
        descricao
      });

      await this.sessionStore.clear(session.userId);

      return [
        "Agendamento confirmado.",
        `Codigo: ${resultado.codigo_agendamento}`,
        "",
        "Guarde esse codigo para consultar, cancelar ou remarcar seu atendimento."
      ].join("\n");
    } catch (error) {
      await this.sessionStore.clear(session.userId);
      return this.formatApiError(error);
    }
  }

  private isAgendamentoTrigger(normalized: string): boolean {
    return TRIGGERS_AGENDAMENTO.some((trigger) => normalized.includes(trigger));
  }

  private isMenuCommand(normalized: string): boolean {
    return normalized === "menu" || normalized === "0";
  }

  private normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private pickOption<T>(items: T[], body: string): T | null {
    const index = Number.parseInt(body.trim(), 10);

    if (!Number.isInteger(index) || index < 1 || index > items.length) {
      return null;
    }

    return items[index - 1];
  }

  private formatServicos(servicos: AgendamentoServico[]): string {
    return [
      "Encontrei estes servicos para agendamento:",
      "",
      this.formatOptions(servicos, (servico) => servico.nome),
      "",
      "Digite o numero do servico desejado."
    ].join("\n");
  }

  private formatHorarios(horarios: AgendamentoHorario[]): string {
    return [
      "Horarios disponiveis:",
      "",
      this.formatOptions(horarios, (horario) => this.formatHorarioLabel(horario)),
      "",
      "Digite o numero do horario desejado."
    ].join("\n");
  }

  private formatOptions<T>(items: T[], label: (item: T) => string): string {
    return items.map((item, index) => `${index + 1}. ${label(item)}`).join("\n");
  }

  private formatHorarioLabel(horario: AgendamentoHorario): string {
    if (horario.exibicao) {
      return `${horario.exibicao.data} as ${horario.exibicao.hora}`;
    }

    if (horario.inicio_em) {
      return new Date(horario.inicio_em).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short"
      });
    }

    return horario._id;
  }

  private formatApiError(error: unknown): string {
    if (error instanceof AgendamentoApiError) {
      if (error.codigo === "AGENDAMENTO_DUPLICADO") {
        return "Ja existe um agendamento ativo para esse CPF.";
      }

      if (
        error.codigo === "HORARIO_INDISPONIVEL" ||
        error.codigo === "PRE_RESERVA_EXPIRADA"
      ) {
        return "Esse horario nao esta mais disponivel. Inicie o agendamento novamente.";
      }
    }

    return "Nao consegui concluir o agendamento agora. Tente novamente em alguns instantes.";
  }
}
