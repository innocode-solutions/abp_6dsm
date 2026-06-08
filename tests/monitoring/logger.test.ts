import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/monitoring/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = "test";
  });

  it("deve registrar info no console com timestamp e nível", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("mensagem de teste", { requestId: "abc" });

    expect(logSpy).toHaveBeenCalledOnce();
    const line = String(logSpy.mock.calls[0][0]);
    expect(line).toMatch(/\[INFO\] mensagem de teste/);
    expect(line).toContain("requestId");
  });

  it("deve registrar error no console.error com detalhes do Error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NODE_ENV = "development";

    logger.error("falha simulada", new Error("boom"), { route: "/x" });

    expect(errorSpy).toHaveBeenCalledOnce();
    const line = String(errorSpy.mock.calls[0][0]);
    expect(line).toMatch(/\[ERROR\] falha simulada/);
    expect(line).toContain("boom");
    expect(line).toContain("stack");
  });

  it("deve respeitar LOG_LEVEL=error e suprimir info", () => {
    process.env.LOG_LEVEL = "error";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.info("não deve aparecer");
    logger.error("deve aparecer");

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});