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

router.use(auth);

router.get("/pedidos", getPedidos);
router.get("/historico/:usuarioId/pedidos", getHistoricoPedidos);
router.post("/pedidos", createPedido);
router.put("/pedidos/:id", updatePedido);
router.delete("/pedidos/:id", deletePedido);

export default router;
