import { describe, it, expect } from "vitest"
import flow from "../../src/flows/direito-arrependimento.json"

describe("Fluxo direito de arrependimento", () => {

  it("deve informar que o direito se aplica quando compra online e até 7 dias", () => {

    const answers = {
      tipo_compra: "online",
      dias_compra: "ate7"
    }

    const rule = flow.rules.find(
      (r) =>
        r.conditions.tipo_compra === answers.tipo_compra &&
        r.conditions.dias_compra === answers.dias_compra
    )

    expect(rule).toBeDefined()

    const response = flow.responses[rule!.response as keyof typeof flow.responses]

    expect(response.summary).toContain("direito de arrependimento")
  })

})