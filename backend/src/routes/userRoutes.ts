import { Router } from "express";
import { listUsuarios, updateUsuario } from "../controllers/userController";
import { auth, requireAdmin } from "../middleware/auth";
import { createImageUpload } from "../utils/upload";

const upload = createImageUpload();

const router = Router();

router.get("/usuarios", auth, requireAdmin, listUsuarios);
router.put("/usuarios/:id", auth, requireAdmin, upload.single("foto"), updateUsuario);

export default router;
