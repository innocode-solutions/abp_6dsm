import { describe, expect, it } from "vitest";
import { parseUserIds } from "../../src/api/validation/dashboard.schema.js";

describe("dashboard.schema", () => {
  it("aceita ids reais do WhatsApp com sufixo @c.us", () => {
    expect(parseUserIds("5511999990001@c.us,5511999990002@c.us")).toEqual([
      "5511999990001@c.us",
      "5511999990002@c.us",
    ]);
  });

  it("continua bloqueando caracteres de injecao", () => {
    expect(() => parseUserIds("id$where")).toThrow();
  });
});
