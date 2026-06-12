import { Router } from "express";

import * as feriadoController from "../controllers/config/feriado.controller.js";
import * as funcionarioController from "../controllers/config/funcionario.controller.js";
import * as regraDisponibilidadeController from "../controllers/config/regraDisponibilidade.controller.js";
import * as servicoController from "../controllers/config/servico.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";
import { requirePerfil } from "../middleware/perfil.middleware.js";
import { adminLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();
const adminConfig = Router();

adminConfig.use(adminLimiter);
adminConfig.use(authenticateAdmin);

function crudRouter(handlers: {
  listar: typeof servicoController.listar;
  criar: typeof servicoController.criar;
  buscarPorId: typeof servicoController.buscarPorId;
  atualizar: typeof servicoController.atualizar;
  remover: typeof servicoController.remover;
}): Router {
  const resource = Router();
  resource.get("/", handlers.listar);
  resource.post("/", handlers.criar);
  resource.get("/:id", handlers.buscarPorId);
  resource.patch("/:id", handlers.atualizar);
  resource.delete("/:id", handlers.remover);
  return resource;
}

function feriadoRouter(): Router {
  const resource = Router();
  resource.get("/", requirePerfil("admin", "atendente"), feriadoController.listar);
  resource.post("/", requirePerfil("admin"), feriadoController.criar);
  resource.get("/:id", requirePerfil("admin"), feriadoController.buscarPorId);
  resource.patch("/:id", requirePerfil("admin"), feriadoController.atualizar);
  resource.delete("/:id", requirePerfil("admin"), feriadoController.remover);
  return resource;
}

adminConfig.use("/servicos", requirePerfil("admin"), crudRouter(servicoController));
adminConfig.use("/funcionarios", requirePerfil("admin"), crudRouter(funcionarioController));
adminConfig.use(
  "/regras-disponibilidade",
  requirePerfil("admin"),
  crudRouter(regraDisponibilidadeController),
);
adminConfig.use("/feriados", feriadoRouter());

router.use("/admin", adminConfig);

export default router;
