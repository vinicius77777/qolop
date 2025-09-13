import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173", // porta do frontend (Vite)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

/** Middleware de autenticação */
async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token não enviado" });

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Formato do token inválido" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
    };

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
    });

    if (!usuario) return res.status(401).json({ error: "Usuário não existe" });

    req.user = { id: usuario.id, email: usuario.email, role: usuario.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

/** Middleware de admin */
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado: somente admin" });
  }
  next();
}

/**
 * =========================================
 * ROTAS DE USUÁRIOS
 * =========================================
 */
app.post("/usuarios", async (req: Request, res: Response) => {
  const { nome, email, senha, foto, role } = req.body;
  if (!nome || !email || !senha) {
    return res
      .status(400)
      .json({ error: "Campos obrigatórios: nome, email, senha" });
  }

  try {
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    const novo = await prisma.usuario.create({
      data: { nome, email, senha: hashedPassword, foto, role: role || "user" },
    });

    const token = jwt.sign(
      { id: novo.id, email: novo.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    const { senha: _, ...usuarioSemSenha } = novo;
    return res.status(201).json({ token, usuario: usuarioSemSenha });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao criar usuário", details: String(error) });
  }
});

app.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: "Campos obrigatórios: email, senha" });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, {
      expiresIn: "2h",
    });

    const { senha: _, ...usuarioSemSenha } = usuario;
    return res.json({ message: "Login bem-sucedido", token, usuario: usuarioSemSenha });
  } catch (error) {
    return res.status(500).json({ error: "Erro no login", details: String(error) });
  }
});

app.get("/me", auth, async (req: AuthRequest, res: Response) => {
  try {
    const me = await prisma.usuario.findUnique({
      where: { id: req.user!.id },
      select: { id: true, nome: true, email: true, foto: true, role: true },
    });
    return res.json(me);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar perfil", details: String(error) });
  }
});

app.get("/usuarios", auth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, role: true },
    });
    return res.json(usuarios);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar usuários", details: String(error) });
  }
});

app.delete("/usuarios/:id", auth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.usuario.delete({ where: { id } });
    return res.json({ message: "Usuário removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar usuário", details: String(error) });
  }
});

/**
 * =========================================
 * ROTAS DE AMBIENTES
 * =========================================
 */
app.get("/ambientes", async (_req: Request, res: Response) => {
  try {
    const ambientes = await prisma.ambiente.findMany();
    return res.json(ambientes);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar ambientes", details: String(error) });
  }
});

app.post("/ambientes", auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { titulo, descricao, linkVR, imagemPreview } = req.body;
    const novo = await prisma.ambiente.create({
      data: { titulo, descricao, linkVR, imagemPreview },
    });
    return res.status(201).json(novo);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar ambiente", details: String(error) });
  }
});

app.put("/ambientes/:id", auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, linkVR, imagemPreview } = req.body;
    const atualizado = await prisma.ambiente.update({
      where: { id },
      data: { titulo, descricao, linkVR, imagemPreview },
    });
    return res.json(atualizado);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar ambiente", details: String(error) });
  }
});

app.delete("/ambientes/:id", auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.ambiente.delete({ where: { id } });
    return res.json({ message: "Ambiente removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar ambiente", details: String(error) });
  }
});

/**
 * =========================================
 * ROTAS DE PEDIDOS
 * =========================================
 */
app.post("/pedidos", async (req: Request, res: Response) => {
  try {
    const { empresa, email, telefone, mensagem } = req.body;
    const novo = await prisma.pedido.create({
      data: { empresa, email, telefone, mensagem },
    });
    return res.status(201).json(novo);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar pedido", details: String(error) });
  }
});

app.get("/pedidos", auth, async (_req: AuthRequest, res: Response) => {
  try {
    const pedidos = await prisma.pedido.findMany();
    return res.json(pedidos);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar pedidos", details: String(error) });
  }
});

app.put("/pedidos/:id", auth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const atualizado = await prisma.pedido.update({
      where: { id },
      data: { status },
    });
    return res.json(atualizado);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar pedido", details: String(error) });
  }
});

app.delete("/pedidos/:id", auth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.pedido.delete({ where: { id } });
    return res.json({ message: "Pedido removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar pedido", details: String(error) });
  }
});

/** Boot */
app.listen(3000, () => {
  console.log("🚀 Servidor rodando em http://localhost:3000");
});
