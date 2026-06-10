import { HORAS_MINIMAS_ANTECEDENCIA } from "../constants/agendamento.constants.js";
import { AppError } from "../types/common.types.js";

export function validarAntecedenciaHorario(inicio_em: Date): void {
  const limiteMs = HORAS_MINIMAS_ANTECEDENCIA * 60 * 60 * 1000;
  if (inicio_em.getTime() - Date.now() < limiteMs) {
    throw new AppError("HORARIO_INDISPONIVEL", 409);
  }
}
