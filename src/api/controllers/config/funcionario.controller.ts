import type { NextFunction, Request, Response } from "express";

import Funcionario, {
  FUNCIONARIO_PERFIS,
  type FuncionarioPerfil,
} from "../../models/Funcionario.model.js";
import { AppError } from "../../types/common.types.js";
import { hashSenha } from "../../utils/passwordHelper.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  filtroAtivo,
  paramId,
} from "./config.helpers.js";

function funcionarioSemSenha(funcionario: unknown): Record<string, unknown> {
  if (!funcionario || typeof funcionario !== "object") {
    return {};
  }

  const maybeDocument = funcionario as {
    toObject?: () => Record<string, unknown>;
  };
  const dados =
    typeof maybeDocument.toObject === "function"
      ? maybeDocument.toObject()
      : { ...(funcionario as Record<string, unknown>) };

  delete dados.senha_hash;
  return dados;
}

function funcionariosSemSenha(funcionarios: unknown[]): Record<string, unknown>[] {
  return funcionarios.map((funcionario) => funcionarioSemSenha(funcionario));
}

function isFuncionarioPerfil(value: unknown): value is FuncionarioPerfil {
  return typeof value === "string" && FUNCIONARIO_PERFIS.includes(value as FuncionarioPerfil);
}

export async function listar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const funcionarios = await Funcionario.find(filtroAtivo(req.query));
    res.status(200).json(success(funcionariosSemSenha(funcionarios)));
  } catch (error) {
    next(error);
  }
}

export async function criar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    assertCamposObrigatorios(req.body, ["nome", "email", "perfil", "senha"]);

    if (!isFuncionarioPerfil(req.body.perfil)) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }

    const senhaHash = await hashSenha(String(req.body.senha));
    const funcionario = await Funcionario.create({
      nome: req.body.nome,
      email: req.body.email,
      senha_hash: senhaHash,
      perfil: req.body.perfil,
    });
    res.status(201).json(success(funcionarioSemSenha(funcionario)));
  } catch (error) {
    next(error);
  }
}

export async function buscarPorId(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const funcionario = await Funcionario.findById(paramId(req.params.id));
    if (!funcionario) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(funcionarioSemSenha(funcionario)));
  } catch (error) {
    next(error);
  }
}

export async function atualizar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dadosAtualizacao = { ...(req.body as Record<string, unknown>) };
    delete dadosAtualizacao.senha_hash;

    if (dadosAtualizacao.perfil && !isFuncionarioPerfil(dadosAtualizacao.perfil)) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }

    if (dadosAtualizacao.senha !== undefined) {
      if (typeof dadosAtualizacao.senha !== "string" || dadosAtualizacao.senha.trim() === "") {
        throw new AppError("ERRO_VALIDACAO", 400);
      }
      dadosAtualizacao.senha_hash = await hashSenha(dadosAtualizacao.senha);
      delete dadosAtualizacao.senha;
    }

    const funcionario = await Funcionario.findByIdAndUpdate(
      paramId(req.params.id),
      { $set: dadosAtualizacao },
      { new: true, runValidators: true },
    );
    if (!funcionario) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(funcionarioSemSenha(funcionario)));
  } catch (error) {
    next(error);
  }
}

export async function remover(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const funcionario = await Funcionario.findByIdAndUpdate(
      paramId(req.params.id),
      { $set: { ativo: false } },
      { new: true },
    );
    if (!funcionario) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(funcionarioSemSenha(funcionario)));
  } catch (error) {
    next(error);
  }
}
