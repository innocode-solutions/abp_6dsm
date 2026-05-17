import LogAuditoriaModel, {
  type ILogAuditoriaExecutadoPor,
} from "../models/LogAuditoria.model.js";

export interface RegistrarAuditoriaInput {
  entidade: string;
  entidade_id: string;
  acao: string;
  executado_por: ILogAuditoriaExecutadoPor;
  dados_anteriores?: unknown;
  dados_novos?: unknown;
}

export async function registrarAuditoria(input: RegistrarAuditoriaInput): Promise<void> {
  try {
    await LogAuditoriaModel.create({
      entidade: input.entidade,
      entidade_id: input.entidade_id,
      acao: input.acao,
      executado_por: input.executado_por,
      dados_anteriores: input.dados_anteriores,
      dados_novos: input.dados_novos,
      criado_em: new Date(),
    });
  } catch (err) {
    console.error("Falha ao registrar auditoria:", err);
  }
}
