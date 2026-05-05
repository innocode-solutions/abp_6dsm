import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserFlowSession } from "../../src/sessions/user-flow-session";

const modelMocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn()
}));

vi.mock("../../src/database/models/chat-session.model", () => ({
  ChatSessionModel: {
    findOne: modelMocks.findOne,
    findOneAndUpdate: modelMocks.findOneAndUpdate,
    deleteOne: modelMocks.deleteOne
  }
}));

import { MongoSessionStore } from "../../src/sessions/mongo-session-store";

describe("MongoSessionStore", () => {
  let store: MongoSessionStore;
  const session: UserFlowSession = {
    userId: "user-1",
    flowId: "cobranca_indevida",
    flowSession: {
      flowId: "cobranca_indevida",
      currentStepIndex: 1,
      answers: {
        reconhece_cobranca: "sim"
      },
      finished: false
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = new MongoSessionStore();
  });

  it("deve recuperar sessÃ£o existente do banco", async () => {
    modelMocks.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(session)
    });

    await expect(store.get("user-1")).resolves.toEqual(session);
    expect(modelMocks.findOne).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("deve retornar null quando a sessÃ£o nÃ£o existe", async () => {
    modelMocks.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    });

    await expect(store.get("missing-user")).resolves.toBeNull();
  });

  it("deve salvar nova sessÃ£o com upsert", async () => {
    modelMocks.findOneAndUpdate.mockResolvedValue(undefined);

    await store.save(session);

    expect(modelMocks.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "user-1" },
      {
        userId: "user-1",
        flowId: "cobranca_indevida",
        flowSession: session.flowSession
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  });

  it("deve sobrescrever a sessÃ£o existente do mesmo usuÃ¡rio", async () => {
    modelMocks.findOneAndUpdate.mockResolvedValue(undefined);

    await store.save({
      ...session,
      flowSession: {
        ...session.flowSession,
        currentStepIndex: 2,
        answers: {
          ...session.flowSession.answers,
          prazo: "ate7"
        }
      }
    });

    expect(modelMocks.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(modelMocks.findOneAndUpdate.mock.calls[0][0]).toEqual({ userId: "user-1" });
    expect(modelMocks.findOneAndUpdate.mock.calls[0][1]).toMatchObject({
      flowSession: {
        currentStepIndex: 2,
        answers: {
          reconhece_cobranca: "sim",
          prazo: "ate7"
        }
      }
    });
  });

  it("deve remover a sessÃ£o ao limpar o atendimento", async () => {
    modelMocks.deleteOne.mockResolvedValue(undefined);

    await store.clear("user-1");

    expect(modelMocks.deleteOne).toHaveBeenCalledWith({ userId: "user-1" });
  });
});
