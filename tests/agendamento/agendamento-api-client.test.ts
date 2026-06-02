import { describe, expect, it, vi } from "vitest";
import {
  AgendamentoApiClient,
  AgendamentoApiError
} from "../../src/agendamento/agendamento-api-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("AgendamentoApiClient", () => {
  it("lista servicos usando x-api-key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        dados: [{ _id: "servico-1", nome: "Atendimento presencial" }]
      })
    );

    const client = new AgendamentoApiClient({
      baseUrl: "http://api.test",
      apiKey: "chatbot-key",
      fetchFn: fetchMock
    });

    const servicos = await client.listarServicos();

    expect(servicos).toEqual([{ _id: "servico-1", nome: "Atendimento presencial" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/agendamentos/servicos",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-api-key": "chatbot-key"
        })
      })
    );
  });

  it("lista horarios disponiveis com servico_id e limite", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        dados: [{ _id: "horario-1", servico_id: "servico-1" }]
      })
    );

    const client = new AgendamentoApiClient({
      baseUrl: "http://api.test/",
      apiKey: "chatbot-key",
      fetchFn: fetchMock
    });

    await client.listarHorariosDisponiveis({
      servico_id: "servico-1",
      limite: 3
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/agendamentos/horarios-disponiveis?servico_id=servico-1&limite=3",
      expect.any(Object)
    );
  });

  it("cria pre-reserva enviando JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        dados: {
          pre_reserva_id: "pre-1",
          horario_id: "horario-1"
        }
      })
    );

    const client = new AgendamentoApiClient({
      baseUrl: "http://api.test",
      apiKey: "chatbot-key",
      fetchFn: fetchMock
    });

    await client.criarPreReserva({
      horario_id: "horario-1",
      conversa_id: "conv-1",
      origem: "whatsapp",
      minutos_pre_reserva: 15
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/agendamentos/pre-reservas",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          horario_id: "horario-1",
          conversa_id: "conv-1",
          origem: "whatsapp",
          minutos_pre_reserva: 15
        }),
        headers: expect.objectContaining({
          "x-api-key": "chatbot-key",
          "Content-Type": "application/json"
        })
      })
    );
  });

  it("propaga erro padronizado da API", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          {
            erro: {
              codigo: "HORARIO_INDISPONIVEL",
              mensagem: "Horario indisponivel"
            }
          },
          409
        )
      )
    );

    const client = new AgendamentoApiClient({
      baseUrl: "http://api.test",
      apiKey: "chatbot-key",
      fetchFn: fetchMock
    });

    await expect(
      client.criarPreReserva({
        horario_id: "horario-1",
        conversa_id: "conv-1",
        origem: "whatsapp",
        minutos_pre_reserva: 15
      })
    ).rejects.toMatchObject({
      status: 409,
      codigo: "HORARIO_INDISPONIVEL"
    });

    await expect(
      client.criarPreReserva({
        horario_id: "horario-1",
        conversa_id: "conv-1",
        origem: "whatsapp",
        minutos_pre_reserva: 15
      })
    ).rejects.toBeInstanceOf(AgendamentoApiError);
  });
});
