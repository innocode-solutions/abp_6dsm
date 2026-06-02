import type { PerfilUsuario } from "./common.types.js";

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        perfil: PerfilUsuario;
        tipo: "admin" | "chatbot";
      };
    }
  }
}

export {};
