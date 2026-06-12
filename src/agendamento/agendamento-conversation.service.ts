import { AgendamentoApiError } from "./agendamento-api-client";
import { flowRegistry, getFlowsAsMenu } from "../flows/flow-registry";
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
const LIMITE_HORARIOS = 10;
const PERGUNTA_AGENDAMENTO_PRESENCIAL = [
  "Deseja marcar atendimento presencial para o PROCON?",
  "",
  "1. Sim",
  "2. Nao, voltar ao menu"
].join("\n");
const OPCAO_AGENDAMENTO_PRESENCIAL = `\n\n${PERGUNTA_AGENDAMENTO_PRESENCIAL}`;

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

  async offerScheduling(userId: string): Promise<string | null> {
    const session = await this.sessionStore.get(userId);

    if (session) {
      return null;
    }

    await this.sessionStore.save({
      userId,
      etapa: "oferta_agendamento"
    });

    return OPCAO_AGENDAMENTO_PRESENCIAL;
  }

  private async startSession(userId: string): Promise<string> {
    try {
      const servicos = this.filterServicosPresenciais(await this.api.listarServicos());

      if (servicos.length === 0) {
        return "No momento nao encontrei atendimento presencial disponivel para agendamento.";
      }

      await this.sessionStore.save({
        userId,
        etapa: "confirmar_agendamento_presencial",
        servicos
      });

      return [
        "Encontrei estes servicos para agendamento.",
        "",
        PERGUNTA_AGENDAMENTO_PRESENCIAL
      ].join("\n");
    } catch {
      await this.sessionStore.clear(userId);
      return "Nao consegui acessar a agenda agora. Tente novamente em alguns instantes.";
    }
  }

  private async continueSession(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string | null> {
    switch (session.etapa) {
      case "oferta_agendamento":
        return this.responderOfertaAgendamento(session, body);
      case "confirmar_agendamento_presencial":
        return this.confirmarAgendamentoPresencial(session, body);
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
      const horarios = this.uniqueHorariosBySlot(await this.api.listarHorariosDisponiveis({
        servico_id: servico._id,
        limite: LIMITE_HORARIOS
      }));

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

  private async responderOfertaAgendamento(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string | null> {
    const text = body.trim();
    const decision = this.parseAgendamentoDecision(body);

    if (decision === "sim") {
      return this.startConfirmedSession(session.userId);
    }

    if (decision === "nao") {
      await this.sessionStore.clear(session.userId);
      return getFlowsAsMenu(flowRegistry).menu;
    }

    if (!/^\d+$/.test(text)) {
      await this.sessionStore.clear(session.userId);
      return null;
    }

    return `Opcao invalida.\n\n${PERGUNTA_AGENDAMENTO_PRESENCIAL}`;
  }

  private async confirmarAgendamentoPresencial(
    session: AgendamentoConversationSession,
    body: string
  ): Promise<string> {
    const decision = this.parseAgendamentoDecision(body);

    if (decision === "sim") {
      return this.escolherServico(session, "1");
    }

    if (decision === "nao") {
      await this.sessionStore.clear(session.userId);
      return getFlowsAsMenu(flowRegistry).menu;
    }

    return `Opcao invalida.\n\n${PERGUNTA_AGENDAMENTO_PRESENCIAL}`;
  }

  private async startConfirmedSession(userId: string): Promise<string> {
    try {
      const servicos = this.filterServicosPresenciais(await this.api.listarServicos());

      if (servicos.length === 0) {
        await this.sessionStore.clear(userId);
        return "No momento nao encontrei atendimento presencial disponivel para agendamento.";
      }

      return this.escolherServico(
        {
          userId,
          etapa: "confirmar_agendamento_presencial",
          servicos
        },
        "1"
      );
    } catch {
      await this.sessionStore.clear(userId);
      return "Nao consegui acessar a agenda agora. Tente novamente em alguns instantes.";
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
        "Guarde esse codigo para consultar, cancelar ou remarcar seu atendimento.",
        "",
        "Obrigado por usar o ProconBot Jacarei. Seu atendimento foi encerrado por aqui, mas sigo a disposicao. Se precisar de nova orientacao, envie menu."
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

  private parseAgendamentoDecision(body: string): "sim" | "nao" | null {
    const normalized = this.normalize(body);

    if (["1", "sim", "s", "quero", "quero sim"].includes(normalized)) {
      return "sim";
    }

    if (
      [
        "2",
        "nao",
        "n",
        "nao quero",
        "nao obrigado",
        "nao, obrigado",
        "voltar ao menu"
      ].includes(normalized)
    ) {
      return "nao";
    }

    return null;
  }

  private normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private filterServicosPresenciais(
    servicos: AgendamentoServico[]
  ): AgendamentoServico[] {
    const presenciais = servicos.filter((servico) =>
      this.normalize(`${servico.nome} ${servico.descricao ?? ""}`).includes(
        "presencial"
      )
    );

    return presenciais.length > 0 ? presenciais : servicos.slice(0, 1);
  }

  private uniqueHorariosBySlot(horarios: AgendamentoHorario[]): AgendamentoHorario[] {
    const seen = new Set<string>();
    const unique: AgendamentoHorario[] = [];

    for (const horario of horarios) {
      const key = this.getHorarioSlotKey(horario);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(horario);
    }

    return unique;
  }

  private getHorarioSlotKey(horario: AgendamentoHorario): string {
    if (horario.exibicao) {
      return `${horario.exibicao.data}-${horario.exibicao.hora}`;
    }

    if (horario.inicio_em) {
      return new Date(horario.inicio_em).toISOString();
    }

    return horario._id;
  }

  private pickOption<T>(items: T[], body: string): T | null {
    const index = Number.parseInt(body.trim(), 10);

    if (!Number.isInteger(index) || index < 1 || index > items.length) {
      return null;
    }

    return items[index - 1];
  }

  private formatHorarios(horarios: AgendamentoHorario[]): string {
    return [
      "Proximos horarios disponiveis:",
      "",
      this.formatOptions(horarios, (horario) => this.formatHorarioLabel(horario)),
      "",
      "Digite o numero do horario desejado ou envie menu para voltar."
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
