import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const TIMEZONE_BR = "America/Sao_Paulo";

export function toBrasiliaDisplay(date: Date): { data: string; hora: string; dia_semana: string } {
  const data = formatInTimeZone(date, TIMEZONE_BR, "dd/MM/yyyy", { locale: ptBR });
  const hora = formatInTimeZone(date, TIMEZONE_BR, "HH:mm", { locale: ptBR });
  const dia_semana = formatInTimeZone(date, TIMEZONE_BR, "EEEE", { locale: ptBR }).toLowerCase();
  return { data, hora, dia_semana };
}
