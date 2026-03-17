import { FlowEngine } from "../engine/flow-engine";
import rawFlow from "../flows/direito-arrependimento.json";
import { asFlow } from "../utils/as-flow";

const flow = asFlow(rawFlow);
const engine = new FlowEngine();

const session = engine.start(flow);

const firstStep = engine.getCurrentStep(flow, session);
console.log(firstStep?.question);

let result = engine.answerCurrentStep(flow, session, "online");

if (result.type === "step") {
  console.log(result.step.question);
}

result = engine.answerCurrentStep(flow, session, "ate7");

if (result.type === "completed") {
  console.log(result.response.summary);
  console.log(result.response.message);
}