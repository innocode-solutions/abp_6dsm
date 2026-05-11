import { Router, Request, Response } from "express";
import { ZodError } from "zod";
import { authMiddleware } from "../middleware/auth.middleware";
import { GetDashboardUseCase } from "../../application/use-cases/GetDashboardUseCase";
import { IHistoryRepository } from "../../messages/history";
import { parseUserIds } from "../validation/dashboard.schema";

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
  router.get("/dashboard", authMiddleware, async (req: Request, res: Response) => {
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

      console.error("[KPI] Erro ao processar dashboard:", err);
      res.status(500).json({ error: "Erro interno ao calcular métricas." });
    }
  });

  return router;
}
