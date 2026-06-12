import { Router, type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { GetDashboardUseCase } from "../../application/use-cases/GetDashboardUseCase";
import { GetTopicKpiUseCase } from "../../application/use-cases/GetTopicKpiUseCase";
import { IHistoryRepository } from "../../messages/history";
import { parseUserIds } from "../validation/dashboard.schema";

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não informado." });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({ error: "Token não informado." });
    return;
  }

  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET não configurado." });
    return;
  }

  try {
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido." });
  }
}

/**
 * Registra as rotas de KPI/dashboard.
 * Recebe o repositório por injeção para manter a rota testável e desacoplada.
 */
export function createKpiRouter(historyRepository: IHistoryRepository): Router {
  const router = Router();

  /**
   * GET /api/kpi/dashboard?users=id1,id2
   * Retorna métricas agregadas de atendimento para os usuários informados.
   * Requer Authorization: Bearer <token>
   */
  router.get(
    "/dashboard",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userIds = parseUserIds(req.query.users);

        const useCase = new GetDashboardUseCase(historyRepository);
        const result = await useCase.execute(userIds);

        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({
            error: "Parâmetros inválidos.",
            details: err.issues.map((e) => e.message)
          });
          return;
        }

        if (err instanceof Error && err.message.includes("UserIds inválidos")) {
          res.status(400).json({ error: err.message });
          return;
        }

        if (err instanceof Error && err.message.includes("Limite")) {
          res.status(400).json({ error: err.message });
          return;
        }

        next(err);
      }
    }
  );

  /**
   * GET /api/kpi/assuntos
   * Retorna os principais temas classificados pelo chatbot.
   * Requer Authorization: Bearer <token>
   */
  router.get(
    "/assuntos",
    authMiddleware,
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const useCase = new GetTopicKpiUseCase();
        const result = await useCase.execute();

        res.json({ dados: result });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
