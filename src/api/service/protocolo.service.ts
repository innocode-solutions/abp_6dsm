import AgendamentoModel from "../models/Agendamento.model.js";

const PROTOCOLO_PREFIX = "AGD";
const SEQUENCIAL_LENGTH = 6;
const MAX_TENTATIVAS = 5;

function buildCodigo(ano: number, sequencial: number): string {
  return `${PROTOCOLO_PREFIX}-${ano}-${String(sequencial).padStart(SEQUENCIAL_LENGTH, "0")}`;
}

function extrairSequencial(codigo: string, ano: number): number | null {
  const match = codigo.match(new RegExp(`^${PROTOCOLO_PREFIX}-${ano}-(\\d+)$`));
  if (!match) {
    return null;
  }
  const seq = Number.parseInt(match[1], 10);
  return Number.isFinite(seq) ? seq : null;
}

async function obterUltimoSequencial(ano: number): Promise<number> {
  const prefixo = `${PROTOCOLO_PREFIX}-${ano}-`;
  const ultimo = await AgendamentoModel.findOne({
    codigo_agendamento: { $regex: `^${prefixo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` },
  })
    .sort({ codigo_agendamento: -1 })
    .select("codigo_agendamento")
    .lean();

  if (!ultimo?.codigo_agendamento) {
    return 0;
  }

  return extrairSequencial(ultimo.codigo_agendamento, ano) ?? 0;
}

export async function generateProtocolo(): Promise<string> {
  const ano = new Date().getFullYear();
  let sequencial = await obterUltimoSequencial(ano);

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa += 1) {
    sequencial += 1;
    const codigo = buildCodigo(ano, sequencial);
    const existente = await AgendamentoModel.exists({ codigo_agendamento: codigo });
    if (!existente) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar código de agendamento único.");
}
