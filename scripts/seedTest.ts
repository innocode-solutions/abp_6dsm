/**
 * Script temporário para validar models Mongoose da API de agendamento.
 * Requer MONGO_URI no ambiente (ex.: .env na raiz).
 *
 * Uso: `npx tsx scripts/seedTest.ts`
 */
import "dotenv/config";
import mongoose from "mongoose";

import AgendamentoModel from "../src/api/models/Agendamento.model";
import FuncionarioModel from "../src/api/models/Funcionario.model";
import HorarioModel from "../src/api/models/Horario.model";
import ServicoModel from "../src/api/models/Servico.model";
import { hashSenha } from "../src/api/utils/passwordHelper";

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    console.error("Defina MONGO_URI para executar o seed de teste.");
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  const tag = `seed-test-${Date.now().toString(36)}`;

  try {
    const servico = await ServicoModel.create({
      nome: `${tag}-servico`,
      descricao: "Serviço de teste do script seedTest.",
      duracao_minutos: 30,
      documentos_necessarios: ["RG"],
      ativo: true,
    });

    const recarregado = await ServicoModel.findById(servico._id).lean();
    if (!recarregado || recarregado.nome !== servico.nome) {
      throw new Error("Serviço não persistiu como esperado.");
    }
    console.log("OK: Servico persistiu:", recarregado._id.toString());

    let invalidStatusRejected = false;
    try {
      await AgendamentoModel.create({
        codigo_agendamento: `${tag}-ag-invalid`,
        cidadao: { nome: "Teste", cpf: "00000000000" },
        servico_id: servico._id,
        funcionario_id: new mongoose.Types.ObjectId(),
        horario_id: new mongoose.Types.ObjectId(),
        status: "status_inexistente",
        inicio_em: new Date(),
        fim_em: new Date(),
        assunto: "x",
        descricao: "y",
        origem: "whatsapp",
        conversa_id: `${tag}-conv`,
      } as never);
    } catch (err: unknown) {
      if (err instanceof mongoose.Error.ValidationError) {
        invalidStatusRejected = true;
      } else {
        throw err;
      }
    }
    if (!invalidStatusRejected) {
      throw new Error("Esperava ValidationError ao salvar status inválido.");
    }
    console.log("OK: status inválido em Agendamento rejeitado pelo Mongoose.");

    const funcionario = await FuncionarioModel.create({
      nome: `${tag}-func`,
      email: `${tag}@example.com`,
      senha_hash: await hashSenha("senha-teste"),
      perfil: "atendente",
      ativo: true,
    });

    const inicio = new Date(Date.UTC(2030, 0, 2, 14, 0, 0));
    const fim = new Date(Date.UTC(2030, 0, 2, 14, 30, 0));

    const horario = await HorarioModel.create({
      funcionario_id: funcionario._id,
      servico_id: servico._id,
      inicio_em: inicio,
      fim_em: fim,
      status: "disponivel",
    });

    await AgendamentoModel.create({
      codigo_agendamento: `${tag}-ag-1`,
      cidadao: { nome: "Cidadão Um", cpf: "11111111111" },
      servico_id: servico._id,
      funcionario_id: funcionario._id,
      horario_id: horario._id,
      status: "confirmado",
      inicio_em: inicio,
      fim_em: fim,
      assunto: "Assunto",
      descricao: "Descrição",
      origem: "whatsapp",
      conversa_id: `${tag}-conv-a`,
    });

    let duplicateBlocked = false;
    try {
      await AgendamentoModel.create({
        codigo_agendamento: `${tag}-ag-2`,
        cidadao: { nome: "Cidadão Dois", cpf: "22222222222" },
        servico_id: servico._id,
        funcionario_id: funcionario._id,
        horario_id: horario._id,
        status: "confirmado",
        inicio_em: inicio,
        fim_em: fim,
        assunto: "Outro",
        descricao: "Outra descrição",
        origem: "whatsapp",
        conversa_id: `${tag}-conv-b`,
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: number }).code === 11_000
      ) {
        duplicateBlocked = true;
      } else {
        throw err;
      }
    }

    if (!duplicateBlocked) {
      throw new Error(
        "Esperava erro de índice único (11000) ao duplicar horario_id com status confirmado."
      );
    }
    console.log("OK: segundo Agendamento confirmado no mesmo horario_id bloqueado pelo índice.");

    await AgendamentoModel.deleteMany({ codigo_agendamento: new RegExp(`^${tag}`) });
    await HorarioModel.deleteMany({ _id: horario._id });
    await FuncionarioModel.deleteMany({ _id: funcionario._id });
    await ServicoModel.deleteMany({ _id: servico._id });
  } finally {
    await mongoose.disconnect();
  }
}

void main();
