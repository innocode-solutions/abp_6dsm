import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import express from "express";
import { errorHandler as errorHandlerMiddleware } from "../../src/api/middleware/errorHandler.middleware";

describe("errorHandlerMiddleware", () => {
  let server: Server | undefined;
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(async () => {
    process.env.NODE_ENV = previousNodeEnv;

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
  });

  it("deve retornar 500 com mensagem genérica em produção", async () => {
    process.env.NODE_ENV = "production";

    const app = express();

    app.get("/fail", (_req, _res, next) => {
      next(new Error("detalhe interno"));
    });

    app.use(errorHandlerMiddleware);

    const port = await new Promise<number>((resolve, reject) => {
      const instance = app.listen(0, "127.0.0.1", () => {
        const address = instance.address();

        if (!address || typeof address === "string") {
          reject(new Error("Endereço inválido."));
          return;
        }

        server = instance;
        resolve(address.port);
      });
    });

    const response = await fetch(`http://127.0.0.1:${port}/fail`);
    const body = await response.json();

    expect(response.status).toBe(500);

    expect(body.erro).toEqual({
      codigo: "ERRO_INTERNO",
      mensagem: "Erro interno do servidor."
    });

    expect(body.meta).toBeDefined();
    expect(body.meta.requisicao_id).toBeTypeOf("string");
    expect(body.meta.timestamp).toBeTypeOf("string");
    expect(body.stack).toBeUndefined();
  });

  it("deve incluir stack em desenvolvimento", async () => {
    process.env.NODE_ENV = "development";

    const app = express();

    app.get("/fail", (_req, _res, next) => {
      next(new Error("detalhe interno"));
    });

    app.use(errorHandlerMiddleware);

    const port = await new Promise<number>((resolve, reject) => {
      const instance = app.listen(0, "127.0.0.1", () => {
        const address = instance.address();

        if (!address || typeof address === "string") {
          reject(new Error("Endereço inválido."));
          return;
        }

        server = instance;
        resolve(address.port);
      });
    });

    const response = await fetch(`http://127.0.0.1:${port}/fail`);
    const body = await response.json();

    expect(response.status).toBe(500);

    expect(body.erro).toEqual({
      codigo: "ERRO_INTERNO",
      mensagem: "Erro interno do servidor."
    });

    expect(body.meta).toBeDefined();
    expect(body.meta.requisicao_id).toBeTypeOf("string");
    expect(body.meta.timestamp).toBeTypeOf("string");
    expect(body.stack).toBeTypeOf("string");
  });
});