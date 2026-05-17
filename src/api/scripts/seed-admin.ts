import "dotenv/config";
import mongoose from "mongoose";

import { getMongoConnectOptions, resolveMongoDatabaseLabel } from "../config/mongoConnection.js";
import FuncionarioModel from "../models/Funcionario.model.js";
import { hashSenha } from "../utils/passwordHelper.js";

function readFirstEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function isTruthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on", "sim"].includes(value?.trim().toLowerCase() ?? "");
}

async function main(): Promise<void> {
  const mongoUri = readFirstEnv("MONGODB_URI", "MONGO_URI", "MONGO_URL");
  const nome = readFirstEnv("ADMIN_NOME") || "Administrador";
  const email = readFirstEnv("ADMIN_EMAIL").toLowerCase();
  const senha = readFirstEnv("ADMIN_SENHA");
  const shouldUpdateExisting = isTruthy(process.env.ADMIN_SEED_UPDATE);
  const databaseLabel = resolveMongoDatabaseLabel();

  if (!mongoUri) {
    console.error("Defina MONGODB_URI (ou MONGO_URI) no .env para criar o primeiro admin.");
    process.exitCode = 1;
    return;
  }

  if (!email || !senha) {
    console.error(
      "Defina ADMIN_EMAIL e ADMIN_SENHA. Ex.: ADMIN_EMAIL=admin@procon.test ADMIN_SENHA=senha-forte npm.cmd run api:seed-admin",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Conectando ao MongoDB (banco alvo: ${databaseLabel})...`);

  await mongoose.connect(mongoUri, getMongoConnectOptions(10_000));

  const databaseName = mongoose.connection.db?.databaseName ?? databaseLabel;
  console.log(`Conectado. Banco em uso: ${databaseName}`);

  try {
    const existente = await FuncionarioModel.findOne({ email }).select("+senha_hash");
    if (existente && !shouldUpdateExisting) {
      const total = await FuncionarioModel.countDocuments();
      console.log(
        `Funcionario ${email} ja existe em "${databaseName}". Colecao "funcionarios" (${total} documento(s)).`,
      );
      console.log("Nenhuma alteracao feita. Defina ADMIN_SEED_UPDATE=true para atualizar senha/perfil/ativo.");
      return;
    }

    const senha_hash = await hashSenha(senha);

    if (existente) {
      existente.nome = nome;
      existente.perfil = "admin";
      existente.ativo = true;
      existente.senha_hash = senha_hash;
      await existente.save();
      console.log(`Admin ${email} atualizado em "${databaseName}" (colecao funcionarios).`);
      return;
    }

    await FuncionarioModel.create({
      nome,
      email,
      senha_hash,
      perfil: "admin",
      ativo: true,
    });

    const total = await FuncionarioModel.countDocuments();
    console.log(`Primeiro admin criado: ${email}`);
    console.log(`Banco: ${databaseName} | Colecao: funcionarios | Documentos: ${total}`);
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error) => {
  console.error("Falha ao criar primeiro admin:", error);
  process.exitCode = 1;
});
