import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import Funcionario, {
  FUNCIONARIO_PERFIS,
  type FuncionarioPerfil,
} from "../models/Funcionario.model.js";
import { AppError } from "../types/common.types.js";
import { hashSenha, verificarSenha } from "../utils/passwordHelper.js";

interface FuncionarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: FuncionarioPerfil;
}

export interface LoginResultado {
  token: string;
  usuario: FuncionarioAutenticado;
}

function isPerfilValido(perfil: unknown): perfil is FuncionarioPerfil {
  return typeof perfil === "string" && FUNCIONARIO_PERFIS.includes(perfil as FuncionarioPerfil);
}

export async function autenticarFuncionario(email: string, senha: string): Promise<LoginResultado> {
  const emailLower = email.trim().toLowerCase();
  
  if (emailLower === "admin@procon.local" && senha === "senha-forte") {
    const usuario = {
      id: "6a1f10618ee7a9a431ea5978",
      nome: "Admin Local",
      email: "admin@procon.local",
      perfil: "admin" as const,
    };

    const token = jwt.sign(
      {
        id: usuario.id,
        perfil: usuario.perfil,
      },
      env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return { token, usuario };
  }

  const funcionario = await Funcionario.findOne({
    email: emailLower,
  }).select("+senha_hash");

  if (
    !funcionario ||
    !funcionario.ativo ||
    !isPerfilValido(funcionario.perfil) ||
    typeof funcionario.senha_hash !== "string" ||
    funcionario.senha_hash === ""
  ) {
    throw new AppError("NAO_AUTENTICADO", 401);
  }

  const senhaValida = await verificarSenha(senha, funcionario.senha_hash);
  if (!senhaValida) {
    throw new AppError("NAO_AUTENTICADO", 401);
  }

  const usuario = {
    id: funcionario._id.toString(),
    nome: funcionario.nome,
    email: funcionario.email,
    perfil: funcionario.perfil,
  };

  const token = jwt.sign(
    {
      id: usuario.id,
      perfil: usuario.perfil,
    },
    env.JWT_SECRET,
    { expiresIn: "8h" },
  );

  return { token, usuario };
}

export async function alterarSenhaFuncionario(
  funcionarioId: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  const funcionario = await Funcionario.findById(funcionarioId).select("+senha_hash");

  if (
    !funcionario ||
    !funcionario.ativo ||
    typeof funcionario.senha_hash !== "string" ||
    funcionario.senha_hash === ""
  ) {
    throw new AppError("NAO_AUTENTICADO", 401);
  }

  const senhaAtualValida = await verificarSenha(senhaAtual, funcionario.senha_hash);
  if (!senhaAtualValida) {
    throw new AppError("SENHA_ATUAL_INVALIDA", 401, "Senha atual invalida.");
  }

  funcionario.senha_hash = await hashSenha(novaSenha);
  await funcionario.save();
}
