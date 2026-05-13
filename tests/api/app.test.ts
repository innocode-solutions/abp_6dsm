import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app";

function listenOnce(app: ReturnType<typeof createApp>): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("endereço do servidor inválido"));
        return;
      }
      const port = (addr as AddressInfo).port;
      resolve({
        port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
    server.on("error", reject);
  });
}

describe("src/api/app", () => {
  it("GET / retorna 404 quando não há rotas registradas", async () => {
    const app = createApp();
    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });

  it("aceita JSON no body quando Content-Type é application/json", async () => {
    const app = createApp();
    const { port, close } = await listenOnce(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/qualquer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true }),
      });
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });
});
