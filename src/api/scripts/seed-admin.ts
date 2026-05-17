import "dotenv/config";
import mongoose from "mongoose";

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
  const mongoUri = readFirstEnv("MONGO_URI", "MONGODB_URI", "MONGO_URL");
  const nome = readFirstEnv("ADMIN_NOME") || "Administrador";
  const email = readFirstEnv("ADMIN_EMAIL").toLowerCase();
  const senha = readFirstEnv("ADMIN_SENHA");
  const shouldUpdateExisting = isTruthy(process.env.ADMIN_SEED_UPDATE);

  if (!mongoUri) {
    console.error("Defina MONGO_URI ou MONGODB_URI para criar o primeiro admin.");
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

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10_000 });

  try {
    const existente = await FuncionarioModel.findOne({ email }).select("+senha_hash");
    if (existente && !shouldUpdateExisting) {
      console.log(
        `Funcionario ${email} ja existe. Nenhuma alteracao feita. Defina ADMIN_SEED_UPDATE=true para atualizar senha/perfil/ativo.`,
      );
      return;
    }

    const senha_hash = await hashSenha(senha);

    if (existente) {
      existente.nome = nome;
      existente.perfil = "admin";
      existente.ativo = true;
      existente.senha_hash = senha_hash;
      await existente.save();
      console.log(`Admin ${email} atualizado com sucesso.`);
      return;
    }

    await FuncionarioModel.create({
      nome,
      email,
      senha_hash,
      perfil: "admin",
      ativo: true,
    });

    console.log(`Primeiro admin criado com sucesso: ${email}`);
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error) => {
  console.error("Falha ao criar primeiro admin:", error);
  process.exitCode = 1;
});
