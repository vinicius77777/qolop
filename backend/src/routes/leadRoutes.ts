import { Router } from "express";
import { createLead, leadLimiter } from "../controllers/leadController";

const router = Router();

router.post("/leads", leadLimiter, createLead);

export default router;