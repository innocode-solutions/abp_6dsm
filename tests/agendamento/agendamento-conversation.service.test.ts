import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgendamentoApiError } from "../../src/agendamento/agendamento-api-client";
import { AgendamentoConversationService } from "../../src/agendamento/agendamento-conversation.service";
import type { AgendamentoApi } from "../../src/agendamento/agendamento.types";

function makeApi(): AgendamentoApi {
  return {
    listarServicos: vi.fn().mockResolvedValue([
      {
        _id: "servico-1",
        nome: "Atendimento presencial"
      },
      {
        _id: "servico-2",
        nome: "Cobranca indevida"
      },
      {
        _id: "servico-3",
        nome: "Produto com defeito ou garantia"
      }
    ]),
    listarHorariosDisponiveis: vi.fn().mockResolvedValue([
      {
        _id: "horario-1",
        servico_id: "servico-1",
        exibicao: {
          data: "03/06/2026",
          hora: "09:00"
        }
      },
      {
        _id: "horario-duplicado",
        servico_id: "servico-1",
        exibicao: {
          data: "03/06/2026",
          hora: "09:00"
        }
      },
      {
        _id: "horario-2",
        servico_id: "servico-1",
        exibicao: {
          data: "03/06/2026",
          hora: "10:00"
        }
      }
    ]),
    criarPreReserva: vi.fn().mockResolvedValue({
      pre_reserva_id: "pre-1",
      horario_id: "horario-1"
    }),
    confirmarAgendamento: vi.fn().mockResolvedValue({
      codigo_agendamento: "AGD-2026-000001"
    }),
    consultarAgendamento: vi.fn(),
    cancelarAgendamento: vi.fn(),
    remarcarAgendamento: vi.fn()
  };
}

describe("AgendamentoConversationService", () => {
  let api: AgendamentoApi;
  let service: AgendamentoConversationService;

  beforeEach(() => {
    api = makeApi();
    service = new AgendamentoConversationService(api);
  });

  it("retorna null quando a mensagem nao inicia agendamento", async () => {
    await expect(service.handle("user-1", "produto com defeito")).resolves.toBeNull();
    expect(api.listarServicos).not.toHaveBeenCalled();
  });

  it("respeita allowStart=false para nao iniciar durante fluxo PROCON ativo", async () => {
    await expect(
      service.handle("user-1", "quero agendar", { allowStart: false })
    ).resolves.toBeNull();
    expect(api.listarServicos).not.toHaveBeenCalled();
  });

  it("conduz fluxo completo e confirma agendamento", async () => {
    const userId = "5511999999999@c.us";

    const inicio = await service.handle(userId, "quero agendar atendimento");
    expect(inicio).toContain("Deseja marcar atendimento presencial para o PROCON?");
    expect(inicio).toContain("1. Sim");
    expect(inicio).toContain("2. Nao");
    expect(inicio).not.toContain("Cobranca indevida");
    expect(inicio).not.toContain("Produto com defeito");

    const horarios = await service.handle(userId, "1");
    expect(horarios).toContain("03/06/2026 as 09:00");
    expect(horarios).toContain("2. 03/06/2026 as 10:00");
    expect(horarios).not.toContain("2. 03/06/2026 as 09:00");
    expect(api.listarHorariosDisponiveis).toHaveBeenCalledWith({
      servico_id: "servico-1",
      limite: 10
    });

    const nome = await service.handle(userId, "1");
    expect(nome).toContain("Informe seu nome completo");
    expect(api.criarPreReserva).toHaveBeenCalledWith({
      horario_id: "horario-1",
      conversa_id: userId,
      origem: "whatsapp",
      minutos_pre_reserva: 15
    });

    await expect(service.handle(userId, "Maria Silva")).resolves.toContain("CPF");
    await expect(service.handle(userId, "529.982.247-25")).resolves.toContain("assunto");
    await expect(service.handle(userId, "Cobranca indevida")).resolves.toContain(
      "Descreva"
    );

    const confirmado = await service.handle(
      userId,
      "Estao cobrando um valor que nao reconheco."
    );

    expect(confirmado).toContain("Agendamento confirmado");
    expect(confirmado).toContain("AGD-2026-000001");
    expect(confirmado).toContain("Obrigado por usar o ProconBot Jacarei");
    expect(api.confirmarAgendamento).toHaveBeenCalledWith({
      horario_id: "horario-1",
      pre_reserva_id: "pre-1",
      conversa_id: userId,
      cidadao: {
        nome: "Maria Silva",
        cpf: "52998224725"
      },
      assunto: "Cobranca indevida",
      descricao: "Estao cobrando um valor que nao reconheco."
    });
  });

  it("menu limpa a sessao de agendamento e deixa o processor seguir o menu normal", async () => {
    await service.handle("user-menu", "quero agendar");

    await expect(service.handle("user-menu", "menu")).resolves.toBeNull();
    await expect(service.handle("user-menu", "1")).resolves.toBeNull();
  });

  it("inicia agendamento pela opcao numerica oferecida apos resposta RAG", async () => {
    const userId = "user-rag-offer";

    await expect(service.offerScheduling(userId)).resolves.toContain(
      "Deseja marcar atendimento presencial para o PROCON?"
    );

    const horarios = await service.handle(userId, "1");

    expect(horarios).toContain("Horarios disponiveis");
    expect(horarios).toContain("03/06/2026 as 09:00");
    expect(api.listarServicos).toHaveBeenCalledOnce();
  });

  it("inicia agendamento quando usuario responde sim por texto", async () => {
    const userId = "user-rag-offer-text";

    await service.offerScheduling(userId);
    const horarios = await service.handle(userId, "sim");

    expect(horarios).toContain("Horarios disponiveis");
    expect(horarios).toContain("03/06/2026 as 09:00");
    expect(api.listarServicos).toHaveBeenCalledOnce();
  });

  it("retorna ao menu quando usuario recusa agendamento presencial", async () => {
    const userId = "user-rag-menu";

    await service.offerScheduling(userId);
    const response = await service.handle(userId, "2");

    expect(response).toContain("ProconBot");
    expect(response).toContain("1.");
  });

  it("retorna ao menu quando usuario responde nao por texto", async () => {
    const userId = "user-rag-menu-text";

    await service.offerScheduling(userId);
    const response = await service.handle(userId, "não");

    expect(response).toContain("ProconBot");
    expect(response).toContain("1.");
  });

  it("aceita sim e nao por texto na confirmacao de agendamento direto", async () => {
    const horariosUserId = "user-direct-sim";

    await service.handle(horariosUserId, "quero agendar");
    const horarios = await service.handle(horariosUserId, "Sim");

    expect(horarios).toContain("Horarios disponiveis");

    const menuUserId = "user-direct-nao";

    await service.handle(menuUserId, "quero agendar");
    const response = await service.handle(menuUserId, "nao");

    expect(response).toContain("ProconBot");
    expect(response).toContain("1.");
  });

  it("traduz erro de agendamento duplicado em mensagem amigavel", async () => {
    vi.mocked(api.confirmarAgendamento).mockRejectedValue(
      new AgendamentoApiError(409, "AGENDAMENTO_DUPLICADO")
    );

    const userId = "user-duplicado";
    await service.handle(userId, "agendamento");
    await service.handle(userId, "1");
    await service.handle(userId, "1");
    await service.handle(userId, "Maria Silva");
    await service.handle(userId, "52998224725");
    await service.handle(userId, "Cobranca");

    await expect(service.handle(userId, "Descricao do caso")).resolves.toContain(
      "Ja existe um agendamento ativo"
    );
  });
});
