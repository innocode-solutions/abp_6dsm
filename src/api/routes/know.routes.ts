import { Router } from "express";
import multer from "multer";
import path from "path";
import { getBaseConhecimento, uploadBaseConhecimento, deleteBaseConhecimento, downloadBaseConhecimento } from "../controllers/admin/conhecimento.controller"; 
import { authenticateAdmin } from "../middleware/auth.middleware";
import { requirePerfil } from "../middleware/perfil.middleware";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetPath = path.resolve(process.cwd(), 'docs/knowledge');
    cb(null, targetPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

router.use(authenticateAdmin);

router.get("/", requirePerfil("admin", "atendente"), getBaseConhecimento);
router.post("/upload", requirePerfil("admin"), upload.single("file"), uploadBaseConhecimento);
router.get("/download/:filename", requirePerfil("admin", "atendente"), downloadBaseConhecimento);
router.delete("/:filename", requirePerfil("admin"), deleteBaseConhecimento);

export default router;
