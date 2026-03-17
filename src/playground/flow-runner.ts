import { FlowEngine } from "../engine/flow-engine";
import rawFlow from "../flows/cancelamento-plano.json";
import { asFlow } from "../utils/as-flow";

const flow = asFlow(rawFlow);

const engine = new FlowEngine();
const session = engine.start(flow);

let current = engine.getCurrentStep(flow, session);

console.log("🤖 Bot:", current?.question);

// Simulação de respostas (você pode trocar depois por readline)
const respostas = ["telefonia", "sim", "sim", "nao"];

for (const resposta of respostas) {
  const result = engine.answerCurrentStep(flow, session, resposta);

  if (result.type === "step") {
    console.log("👤 Usuário:", resposta);
    console.log("🤖 Bot:", result.step.question);
  }

  if (result.type === "completed") {
    console.log("👤 Usuário:", resposta);
    console.log("🤖 Resultado final:");
    console.log(result.response.summary);
    console.log(result.response.message);
    break;
  }
}