import { Router } from "express";
import multer from "multer";
import path from "path";
import { getBaseConhecimento, uploadBaseConhecimento, deleteBaseConhecimento, downloadBaseConhecimento } from "../controllers/admin/conhecimento.controller"; 

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

router.get("/", getBaseConhecimento);
router.post("/upload", upload.single("file"), uploadBaseConhecimento);
router.get("/download/:filename", downloadBaseConhecimento);
router.delete("/:filename", deleteBaseConhecimento);

export default router;