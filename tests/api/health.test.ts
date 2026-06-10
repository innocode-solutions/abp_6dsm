import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createHttpServer } from "../../src/api/server-http";
import { buildHealthPayload } from "../../src/monitoring/health";
import { ChatMessage, IHistoryRepository } from "../../src/messages/history";

class InMemoryHistoryRepository implements IHistoryRepository {
  private store: ChatMessage[] = [];

  async save(message: ChatMessage): Promise<void> {
    this.store.push(message);
  }

  async findByUser(userId: string): Promise<ChatMessage[]> {
    return this.store.filter((m) => m.from === userId);
  }
}

describe("buildHealthPayload", () => {
  it("deve retornar status ok com timestamp e serviços", () => {
    const payload = buildHealthPayload();

    expect(payload.status).toBe("ok");
    expect(() => new Date(payload.timestamp)).not.toThrow();
    expect(payload.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(payload.services.http).toBe("up");
    expect(["connected", "not_configured", "disconnected"]).toContain(
      payload.services.mongodb
    );
  });
});

describe("GET /health", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
  });

  async function listen(app: ReturnType<typeof createHttpServer>): Promise<number> {
    return new Promise((resolve, reject) => {
      const instance = app.listen(0, "127.0.0.1", () => {
        const address = instance.address();
        if (!address || typeof address === "string") {
          reject(new Error("Endereço do servidor inválido."));
          return;
        }
        server = instance;
        resolve(address.port);
      });
    });
  }

  it("deve responder 200 com JSON de saúde", async () => {
    const app = createHttpServer();
    const port = await listen(app);

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTypeOf("string");
    expect(body.uptimeSeconds).toBeTypeOf("number");
    expect(body.services.http).toBe("up");
  });

  it("deve expor rotas KPI quando historyRepository estiver disponível", async () => {
    const app = createHttpServer({
      historyRepository: new InMemoryHistoryRepository()
    });
    const port = await listen(app);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/kpi/dashboard?users=5511999990001`
    );

    expect(response.status).toBe(401);
  });
});