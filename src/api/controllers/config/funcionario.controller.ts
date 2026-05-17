import type { NextFunction, Request, Response } from "express";

import Funcionario, {
  FUNCIONARIO_PERFIS,
} from "../../models/Funcionario.model.js";
import { AppError } from "../../types/common.types.js";
import { success } from "../../utils/responseHelper.js";
import {
  assertCamposObrigatorios,
  filtroAtivo,
  paramId,
} from "./config.helpers.js";

export async function listar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const funcionarios = await Funcionario.find(filtroAtivo(req.query));
    res.status(200).json(success(funcionarios));
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
    assertCamposObrigatorios(req.body, ["nome", "email", "perfil"]);

    if (!FUNCIONARIO_PERFIS.includes(req.body.perfil)) {
      throw new AppError("ERRO_VALIDACAO", 400);
    }

    const funcionario = await Funcionario.create({
      nome: req.body.nome,
      email: req.body.email,
      perfil: req.body.perfil,
    });
    res.status(201).json(success(funcionario));
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
    res.status(200).json(success(funcionario));
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
    const funcionario = await Funcionario.findByIdAndUpdate(
      paramId(req.params.id),
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!funcionario) {
      throw new AppError("NAO_ENCONTRADO", 404);
    }
    res.status(200).json(success(funcionario));
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
    res.status(200).json(success(funcionario));
  } catch (error) {
    next(error);
  }
}
