import type { NextFunction, Request, Response } from "express";

import { AppError } from "../types/common.types.js";
import type { PerfilUsuario } from "../types/common.types.js";

export function requirePerfil(...perfis: PerfilUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      next(new AppError("SEM_PERMISSAO", 403));
      return;
    }
    next();
  };
}
