import { Router } from "express";
import {
  createEmpresa,
  getEmpresaAnalytics,
  getEmpresaBySlug,
  listEmpresaAmbientes,
  listEmpresas,
  updateEmpresa,
} from "../controllers/empresaController";
import { auth, requireAuth } from "../middleware/auth";
import { createImageUpload } from "../utils/upload";

const router = Router();
const upload = createImageUpload();

router.get("/empresas", listEmpresas);
router.post("/empresa", auth, upload.single("logo"), createEmpresa);
router.get("/empresa/ambientes", auth, requireAuth, listEmpresaAmbientes);
router.get("/empresa/analytics", auth, requireAuth, getEmpresaAnalytics);
router.get("/empresa/:slug", getEmpresaBySlug);
router.put("/empresa", auth, requireAuth, updateEmpresa);

export default router;
