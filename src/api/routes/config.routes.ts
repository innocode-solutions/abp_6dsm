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
adminConfig.use(requirePerfil("admin"));

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

adminConfig.use("/servicos", crudRouter(servicoController));
adminConfig.use("/funcionarios", crudRouter(funcionarioController));
adminConfig.use(
  "/regras-disponibilidade",
  crudRouter(regraDisponibilidadeController),
);
adminConfig.use("/feriados", crudRouter(feriadoController));

router.use("/admin", adminConfig);

export default router;
