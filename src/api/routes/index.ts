import { Router } from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import chatbotRoutes from "./chatbot.routes.js";
import configRoutes from "./config.routes.js";
import knowRoutes from './know.routes.js'
import { createKpiRouter } from "./kpi.routes.js";
import { MongoHistoryRepository } from "../../database/repositories/mongo-history-repository.js";

const router = Router();

router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/agendamentos/admin", adminRoutes);
router.use("/api/v1/agendamentos", configRoutes);
router.use("/api/v1/agendamentos", chatbotRoutes);
router.use("/api/v1/conhecimento", knowRoutes);
router.use("/api/kpi", createKpiRouter(new MongoHistoryRepository()));

export default router;
