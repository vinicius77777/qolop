import { Router } from "express";
import {
  getPedidos,
  getHistoricoPedidos,
  createPedido,
  updatePedido,
  deletePedido,
} from "../controllers/pedidoController";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/pedidos", auth, getPedidos);
router.get("/historico/:usuarioId/pedidos", auth, getHistoricoPedidos);
router.post("/pedidos", auth, createPedido);
router.put("/pedidos/:id", auth, updatePedido);
router.delete("/pedidos/:id", auth, deletePedido);

export default router;
