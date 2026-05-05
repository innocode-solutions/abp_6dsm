import { describe, it, expect } from "vitest";
import { extractStructuralEntities } from "../../src/extraction/structural-regex";
import { matchFlowDeterministic } from "../../src/extraction/deterministic-flow-match";
import { flowRegistry } from "../../src/flows/flow-registry";

/**
 * A camada regex de entidades é independente do match determinístico por triggers.
 * Mesmo sem substring de trigger, CPF/valor/data seguem sendo extraídos.
 */
describe("Extração estrutural (regex) sem trigger do fluxo", () => {
  const onlyEntitiesNoTrigger =
    "529.982.247-25 — R$ 1.234,56 — 07/01/2024 — ref. a1b2c3d4";

  it("matchFlowDeterministic retorna null (nenhum menu/trigger)", () => {
    expect(matchFlowDeterministic(onlyEntitiesNoTrigger, flowRegistry)).toBeNull();
  });

  it("extractStructuralEntities ainda encontra CPF, valor BRL e data", () => {
    const entities = extractStructuralEntities(onlyEntitiesNoTrigger);
    const types = new Set(entities.map((e) => e.type));

    expect(types.has("cpf")).toBe(true);
    expect(types.has("valor_brl")).toBe(true);
    expect(types.has("data_dd_mm_yyyy")).toBe(true);

    const cpf = entities.find((e) => e.type === "cpf");
    expect(cpf?.value.replace(/\D/g, "")).toBe("52998224725");
  });
});
