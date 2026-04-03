import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { initializeEmailTransport } from "./email";
import { isOriginAllowed } from "./config/env";
import ambienteRoutes from "./routes/ambienteRoutes";
import authRoutes from "./routes/authRoutes";
import empresaRoutes from "./routes/empresaRoutes";
import pedidoRoutes from "./routes/pedidoRoutes";
import userRoutes from "./routes/userRoutes";
import leadRoutes from "./routes/leadRoutes";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

process.on("uncaughtException", (err) => {
  console.error("[SERVER] uncaught_exception", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[SERVER] unhandled_rejection", err);
});

export const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: (req) =>
    req.method === "OPTIONS" ||
    req.path === "/auth/login" ||
    req.path === "/auth/register" ||
    req.path === "/me",
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origem não permitida pelo CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(limiter);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((req, _res, next) => {
  if (
    req.path === "/pedidos" ||
    /^\/pedidos\/\d+$/.test(req.path) ||
    /^\/usuarios\/\d+\/pedidos(?:\/publico)?$/.test(req.path)
  ) {
    console.log("[HTTP] pedido_request", {
      method: req.method,
      path: req.path,
      hasAuth: Boolean(req.headers.authorization),
      contentType: req.headers["content-type"] || null,
    });
  }

  next();
});

app.use("/auth", authRoutes);
app.use("/", pedidoRoutes);
app.use("/", empresaRoutes);
app.use("/", ambienteRoutes);
app.use("/", userRoutes);
app.use("/", leadRoutes);

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[SERVER] request_error", {
      method: req.method,
      path: req.path,
      errorName: err?.name || "Error",
      errorMessage: err?.message || "Erro interno do servidor",
    });

    if (err?.name === "MulterError") {
      return res.status(400).json({
        error: "Upload inválido",
        details: ["Verifique o tipo e o tamanho do arquivo enviado"],
      });
    }

    res.status(500).json({ error: "Erro interno do servidor" });
  }
);

let emailTransportInitialized = false;

export async function initializeServerServices() {
  if (emailTransportInitialized) {
    return;
  }

  emailTransportInitialized = true;

  try {
    await initializeEmailTransport();
    console.log("[SERVER] email_ready");
  } catch (err) {
    console.error("[SERVER] email_init_failed", err);
  }
}

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT || 3000);

  app.listen(port, async () => {
    console.log("[SERVER] listening", { port });
    await initializeServerServices();
  });
}
