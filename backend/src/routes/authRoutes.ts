import { Router } from "express";
import {
  confirmPasswordReset,
  login,
  me,
  register,
  requestPasswordReset,
} from "../controllers/authController";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/password-reset/request", requestPasswordReset);
router.post("/password-reset/confirm", confirmPasswordReset);
router.get("/me", auth, me);

export default router;
