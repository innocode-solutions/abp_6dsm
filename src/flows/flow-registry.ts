import rawCobrancaIndevida from "./cobranca-indevida.json";
import rawEmprestimoNaoReconhecido from "./emprestimo-nao-reconhecido.json";
import rawDireitoArrependimento from "./direito-arrependimento.json";
import rawCancelamentoPlano from "./cancelamento-plano.json";
import rawGarantiaProduto from "./garantia-produto.json";

import { asFlow } from "../utils/as-flow";

export const flowRegistry = [
  asFlow(rawCobrancaIndevida),
  asFlow(rawEmprestimoNaoReconhecido),
  asFlow(rawDireitoArrependimento),
  asFlow(rawCancelamentoPlano),
  asFlow(rawGarantiaProduto)
];