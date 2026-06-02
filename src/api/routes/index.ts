import { Router } from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import chatbotRoutes from "./chatbot.routes.js";
import configRoutes from "./config.routes.js";

const router = Router();

router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/agendamentos/admin", adminRoutes);
router.use("/api/v1/agendamentos", configRoutes);
router.use("/api/v1/agendamentos", chatbotRoutes);

export default router;
