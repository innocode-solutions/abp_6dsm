import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { AppError } from "../types/common.types.js";
import type { PerfilUsuario } from "../types/common.types.js";

interface AdminTokenPayload {
  id: string;
  perfil: PerfilUsuario;
}

function isAdminTokenPayload(value: unknown): value is AdminTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return typeof payload.id === "string" && typeof payload.perfil === "string";
}

export function authenticateChatbot(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey !== env.CHATBOT_API_KEY) {
    next(new AppError("NAO_AUTENTICADO", 401));
    return;
  }
  next();
}

export function authenticateAdmin(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError("NAO_AUTENTICADO", 401));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    next(new AppError("NAO_AUTENTICADO", 401));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!isAdminTokenPayload(decoded)) {
      next(new AppError("NAO_AUTENTICADO", 401));
      return;
    }

    req.usuario = {
      id: decoded.id,
      perfil: decoded.perfil,
      tipo: "admin",
    };
    next();
  } catch {
    next(new AppError("NAO_AUTENTICADO", 401));
  }
}
