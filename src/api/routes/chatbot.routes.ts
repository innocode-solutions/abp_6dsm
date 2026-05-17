import { Router } from "express";

import {
  cancelarAgendamento,
  consultarAgendamento,
  criarAgendamento,
  remarcarAgendamento,
} from "../controllers/chatbot/agendamento.controller.js";
import { listarHorariosDisponiveis } from "../controllers/chatbot/horario.controller.js";
import { criarPreReserva } from "../controllers/chatbot/preReserva.controller.js";
import { listarServicos } from "../controllers/chatbot/servico.controller.js";
import { authenticateChatbot } from "../middleware/auth.middleware.js";
import { chatbotLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

router.use(chatbotLimiter);
router.use(authenticateChatbot);

router.get("/servicos", listarServicos);
router.get("/horarios-disponiveis", listarHorariosDisponiveis);
router.post("/pre-reservas", criarPreReserva);
router.post("/agendamentos", criarAgendamento);
router.get("/:codigo", consultarAgendamento);
router.post("/:codigo/cancelar", cancelarAgendamento);
router.post("/:codigo/remarcar", remarcarAgendamento);

export default router;
