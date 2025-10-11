"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "http://localhost:5173", // porta do frontend (Vite)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
/** Middleware de autenticação */
async function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: "Token não enviado" });
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Formato do token inválido" });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
        if (!usuario)
            return res.status(401).json({ error: "Usuário não existe" });
        req.user = { id: usuario.id, email: usuario.email, role: usuario.role };
        next();
    }
    catch {
        return res.status(401).json({ error: "Token inválido ou expirado" });
    }
}
/** Middleware de admin */
function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado: somente admin" });
    }
    next();
}
/** =========================================
 * ROTAS DE USUÁRIOS
 * =========================================
 */
app.post("/usuarios", async (req, res) => {
    const { nome, email, senha, foto, role } = req.body;
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Campos obrigatórios: nome, email, senha" });
    }
    try {
        const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({ error: "E-mail já cadastrado" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(senha, 10);
        const novo = await prisma.usuario.create({
            data: { nome, email, senha: hashedPassword, foto, role: role || "user" },
        });
        const token = jsonwebtoken_1.default.sign({ id: novo.id, email: novo.email }, JWT_SECRET, { expiresIn: "2h" });
        const { senha: _, ...usuarioSemSenha } = novo;
        return res.status(201).json({ token, usuario: usuarioSemSenha });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao criar usuário", details: String(error) });
    }
});
app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ error: "Campos obrigatórios: email, senha" });
    }
    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario)
            return res.status(401).json({ error: "Usuário não encontrado" });
        const senhaValida = await bcryptjs_1.default.compare(senha, usuario.senha);
        if (!senhaValida)
            return res.status(401).json({ error: "Senha incorreta" });
        const token = jsonwebtoken_1.default.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: "2h" });
        const { senha: _, ...usuarioSemSenha } = usuario;
        return res.json({ message: "Login bem-sucedido", token, usuario: usuarioSemSenha });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro no login", details: String(error) });
    }
});
app.get("/me", auth, async (req, res) => {
    try {
        const me = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: { id: true, nome: true, email: true, foto: true, role: true },
        });
        return res.json(me);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao buscar perfil", details: String(error) });
    }
});
app.get("/usuarios", auth, requireAdmin, async (_req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: { id: true, nome: true, email: true, role: true },
        });
        return res.json(usuarios);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao listar usuários", details: String(error) });
    }
});
app.put("/usuarios/:id", auth, async (req, res) => {
    const id = parseInt(req.params.id);
    const { nome, email, senha, senhaAntiga } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { id } });
        if (!usuario)
            return res.status(404).json({ error: "Usuário não encontrado" });
        if (senha) {
            if (!senhaAntiga)
                return res.status(400).json({ error: "Informe a senha atual para trocar a senha" });
            const valida = await bcryptjs_1.default.compare(senhaAntiga, usuario.senha);
            if (!valida)
                return res.status(401).json({ error: "Senha atual incorreta" });
        }
        const atualizado = await prisma.usuario.update({
            where: { id },
            data: {
                nome,
                email,
                senha: senha ? await bcryptjs_1.default.hash(senha, 10) : usuario.senha,
            },
        });
        const { senha: _, ...usuarioSemSenha } = atualizado;
        return res.json(usuarioSemSenha);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar usuário", details: String(error) });
    }
});
app.delete("/usuarios/:id", auth, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.usuario.delete({ where: { id } });
        return res.json({ message: "Usuário removido com sucesso" });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao deletar usuário", details: String(error) });
    }
});
/** =========================================
 * ROTAS DE AMBIENTES
 * =========================================
 */
app.get("/ambientes", async (_req, res) => {
    try {
        const ambientes = await prisma.ambiente.findMany();
        return res.json(ambientes);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao listar ambientes", details: String(error) });
    }
});
app.post("/ambientes", auth, requireAdmin, async (req, res) => {
    try {
        const { titulo, descricao, linkVR, imagemPreview } = req.body;
        const novo = await prisma.ambiente.create({ data: { titulo, descricao, linkVR, imagemPreview } });
        return res.status(201).json(novo);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao criar ambiente", details: String(error) });
    }
});
app.put("/ambientes/:id", auth, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { titulo, descricao, linkVR, imagemPreview } = req.body;
        const atualizado = await prisma.ambiente.update({ where: { id }, data: { titulo, descricao, linkVR, imagemPreview } });
        return res.json(atualizado);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar ambiente", details: String(error) });
    }
});
app.delete("/ambientes/:id", auth, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.ambiente.delete({ where: { id } });
        return res.json({ message: "Ambiente removido com sucesso" });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao deletar ambiente", details: String(error) });
    }
});
/** =========================================
 * ROTAS DE PEDIDOS
 * =========================================
 */
app.post("/pedidos", async (req, res) => {
    try {
        const { empresa, email, telefone, mensagem } = req.body;
        const novo = await prisma.pedido.create({ data: { empresa, email, telefone, mensagem } });
        return res.status(201).json(novo);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao criar pedido", details: String(error) });
    }
});
app.get("/pedidos", auth, async (_req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany();
        return res.json(pedidos);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao listar pedidos", details: String(error) });
    }
});
app.put("/pedidos/:id", auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const atualizado = await prisma.pedido.update({ where: { id }, data: { status } });
        return res.json(atualizado);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar pedido", details: String(error) });
    }
});
app.delete("/pedidos/:id", auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.pedido.delete({ where: { id } });
        return res.json({ message: "Pedido removido com sucesso" });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao deletar pedido", details: String(error) });
    }
});
/** Boot */
app.listen(3000, () => {
    console.log("🚀 Servidor rodando em http://localhost:3000");
});
