import { Router } from "express";

import { alterarSenha, login } from "../controllers/auth/auth.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.post("/alterar-senha", authenticateAdmin, alterarSenha);

export default router;
