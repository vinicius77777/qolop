import { Router } from "express";
import {
  getEmpresaAnalytics,
  getEmpresaBySlug,
  listEmpresaAmbientes,
  updateEmpresa,
} from "../controllers/empresaController";
import { auth, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/empresa/ambientes", auth, requireAuth, listEmpresaAmbientes);
router.get("/empresa/analytics", auth, requireAuth, getEmpresaAnalytics);
router.get("/empresa/:slug", getEmpresaBySlug);
router.put("/empresa", auth, requireAuth, updateEmpresa);

export default router;