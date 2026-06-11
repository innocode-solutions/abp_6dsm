import "dotenv/config";
import { randomBytes } from "node:crypto";

import mongoose, { type Types } from "mongoose";

import { getMongoConnectOptions, resolveMongoDatabaseLabel } from "../config/mongoConnection.js";
import FuncionarioModel, { type IFuncionario } from "../models/Funcionario.model.js";
import HorarioModel from "../models/Horario.model.js";
import RegraDisponibilidadeModel from "../models/RegraDisponibilidade.model.js";
import ServicoModel, { type IServico } from "../models/Servico.model.js";
import { gerarHorarios } from "../service/horario.service.js";
import { hashSenha } from "../utils/passwordHelper.js";

const DIAS_PADRAO = 30;
const TIMEZONE_BR = "America/Sao_Paulo";

function readFirstEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hojeEmBrasilia(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_BR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return new Date(`${year}-${month}-${day}T00:00:00-03:00`);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function parseDateEnv(name: string, fallback: Date): Date {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = new Date(`${raw}T00:00:00-03:00`);
  if (Number.isNaN(parsed.getTime())) {
    console.warn(`${name} invalido (${raw}); usando ${fallback.toISOString().slice(0, 10)}.`);
    return fallback;
  }

  return parsed;
}

async function obterServicoSeed(): Promise<IServico> {
  const nome = readFirstEnv("SEED_SERVICO_NOME") || "Atendimento presencial Procon";
  const existente = await ServicoModel.findOne({ nome });

  if (existente) {
    existente.descricao =
      existente.descricao || "Atendimento presencial para orientacao inicial ao consumidor.";
    existente.duracao_minutos = readIntEnv("SEED_DURACAO_MINUTOS", existente.duracao_minutos || 30);
    existente.documentos_necessarios = existente.documentos_necessarios?.length
      ? existente.documentos_necessarios
      : ["Documento com foto", "CPF", "Comprovantes relacionados ao atendimento"];
    existente.ativo = true;
    await existente.save();
    return existente;
  }

  return ServicoModel.create({
    nome,
    descricao: "Atendimento presencial para orientacao inicial ao consumidor.",
    duracao_minutos: readIntEnv("SEED_DURACAO_MINUTOS", 30),
    documentos_necessarios: [
      "Documento com foto",
      "CPF",
      "Comprovantes relacionados ao atendimento",
    ],
    ativo: true,
  });
}

async function obterFuncionarioSeed(): Promise<IFuncionario> {
  const email = readFirstEnv("SEED_FUNCIONARIO_EMAIL").toLowerCase();
  if (email) {
    const porEmail = await FuncionarioModel.findOne({ email });
    if (porEmail) {
      porEmail.ativo = true;
      await porEmail.save();
      return porEmail;
    }
  }

  const existente = await FuncionarioModel.findOne({ ativo: true }).sort({ criado_em: 1 });
  if (existente) {
    return existente;
  }

  const senhaTemporaria =
    readFirstEnv("SEED_FUNCIONARIO_SENHA") || randomBytes(24).toString("hex");

  return FuncionarioModel.create({
    nome: readFirstEnv("SEED_FUNCIONARIO_NOME") || "Atendente Seed",
    email: email || "atendente.seed@procon.local",
    senha_hash: await hashSenha(senhaTemporaria),
    perfil: "atendente",
    ativo: true,
  });
}

async function garantirRegra(
  funcionarioId: Types.ObjectId,
  servicoId: Types.ObjectId,
  diaSemana: number,
  horaInicio: string,
  horaFim: string,
  duracao: number,
): Promise<void> {
  await RegraDisponibilidadeModel.findOneAndUpdate(
    {
      funcionario_id: funcionarioId,
      servico_id: servicoId,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    },
    {
      $set: {
        duracao_horario_minutos: duracao,
        ativo: true,
      },
    },
    { new: true, upsert: true, runValidators: true },
  );
}

async function garantirRegras(
  funcionarioId: Types.ObjectId,
  servicoId: Types.ObjectId,
): Promise<number> {
  const horaInicioManha = readFirstEnv("SEED_HORA_INICIO_MANHA") || "09:00";
  const horaFimManha = readFirstEnv("SEED_HORA_FIM_MANHA") || "11:00";
  const horaInicioTarde = readFirstEnv("SEED_HORA_INICIO_TARDE") || "13:00";
  const horaFimTarde = readFirstEnv("SEED_HORA_FIM_TARDE") || "16:00";
  const duracao = readIntEnv("SEED_DURACAO_MINUTOS", 30);
  const diasSemana = (readFirstEnv("SEED_DIAS_SEMANA") || "1,2,3,4,5")
    .split(",")
    .map((dia) => Number.parseInt(dia.trim(), 10))
    .filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6);

  for (const diaSemana of diasSemana) {
    await garantirRegra(
      funcionarioId,
      servicoId,
      diaSemana,
      horaInicioManha,
      horaFimManha,
      duracao,
    );
    await garantirRegra(
      funcionarioId,
      servicoId,
      diaSemana,
      horaInicioTarde,
      horaFimTarde,
      duracao,
    );
  }

  return diasSemana.length * 2;
}

async function main(): Promise<void> {
  const mongoUri = readFirstEnv("MONGODB_URI", "MONGO_URI", "MONGO_URL");
  const databaseLabel = resolveMongoDatabaseLabel();

  if (!mongoUri) {
    console.error("Defina MONGODB_URI (ou MONGO_URI/MONGO_URL) para popular horarios.");
    process.exitCode = 1;
    return;
  }

  const hoje = hojeEmBrasilia();
  const dias = readIntEnv("SEED_HORARIOS_DIAS", DIAS_PADRAO);
  const de = parseDateEnv("SEED_HORARIOS_DE", hoje);
  const ate = parseDateEnv("SEED_HORARIOS_ATE", addDays(de, dias - 1));

  console.log(`Conectando ao MongoDB (banco alvo: ${databaseLabel})...`);
  await mongoose.connect(mongoUri, getMongoConnectOptions(10_000));

  const databaseName = mongoose.connection.db?.databaseName ?? databaseLabel;
  console.log(`Conectado. Banco em uso: ${databaseName}`);

  try {
    const servico = await obterServicoSeed();
    const funcionario = await obterFuncionarioSeed();
    const regrasGarantidas = await garantirRegras(funcionario._id, servico._id);
    const resultado = await gerarHorarios(de, ate, funcionario._id);
    const disponiveis = await HorarioModel.countDocuments({
      servico_id: servico._id,
      funcionario_id: funcionario._id,
      status: "disponivel",
      inicio_em: { $gte: resultado.de, $lte: addDays(resultado.ate, 1) },
    });

    console.log(`Servico: ${servico.nome} (${servico._id.toString()})`);
    console.log(`Funcionario: ${funcionario.nome} (${funcionario._id.toString()})`);
    console.log(`Regras ativas garantidas: ${regrasGarantidas}`);
    console.log(
      `Periodo: ${resultado.de.toISOString().slice(0, 10)} ate ${resultado.ate
        .toISOString()
        .slice(0, 10)}`,
    );
    console.log(`Novos horarios criados: ${resultado.horarios_criados}`);
    console.log(`Horarios disponiveis no periodo para este seed: ${disponiveis}`);
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error) => {
  console.error("Falha ao popular horarios disponiveis:", error);
  process.exitCode = 1;
});
