import { Router } from "express";

import { listarAgenda } from "../controllers/admin/agenda.controller.js";
import { criarBloqueio, removerBloqueio } from "../controllers/admin/bloqueio.controller.js";
import {
  concluirAtendimento,
  marcarNaoCompareceu,
  realizarCheckIn,
} from "../controllers/admin/checkin.controller.js";
import {
  gerarHorarios,
  listarHorariosAdmin,
} from "../controllers/admin/horarioAdmin.controller.js";
import {
  listarConversas,
  obterHistoricoConversa,
} from "../controllers/admin/conversas.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";
import { requirePerfil } from "../middleware/perfil.middleware.js";
import { adminLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

const LEITURA = ["admin", "atendente"] as const;
const OPERACAO = ["admin", "atendente"] as const;
const GESTAO = ["admin"] as const;

router.use(adminLimiter);
router.use(authenticateAdmin);

router.get("/agenda", requirePerfil(...LEITURA), listarAgenda);
router.get("/horarios", requirePerfil(...LEITURA), listarHorariosAdmin);
router.post("/horarios/gerar", requirePerfil(...GESTAO), gerarHorarios);
router.post("/bloqueios", requirePerfil(...GESTAO), criarBloqueio);
router.delete("/bloqueios/:id", requirePerfil(...GESTAO), removerBloqueio);
router.get("/conversas", requirePerfil(...LEITURA), listarConversas);
router.get("/conversas/:userId", requirePerfil(...LEITURA), obterHistoricoConversa);
router.post("/:codigo/check-in", requirePerfil(...OPERACAO), realizarCheckIn);
router.post("/:codigo/nao-compareceu", requirePerfil(...OPERACAO), marcarNaoCompareceu);
router.post("/:codigo/concluir", requirePerfil(...OPERACAO), concluirAtendimento);

export default router;
