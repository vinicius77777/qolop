// src/pages/pedidos.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPedidos,
  createPedido,
  updatePedido,
  deletePedido,
  getMe,
  Usuario,
} from "../services/api";
import { createParticles } from "../animations/global";
import "../styles/global.css";

interface Pedido {
  id: number;
  empresa: string;
  email: string;
  telefone?: string;
  mensagem: string;
  status: string;
  criado_em: string;
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTelefone, setEditTelefone] = useState("");
  const [editMensagem, setEditMensagem] = useState("");
  const [avisoTelefone, setAvisoTelefone] = useState("");
  const [avisoTelefoneEditar, setAvisoTelefoneEditar] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    createParticles("particle-container");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const dataUser = await getMe();
        setUsuario(dataUser);
        const dataPedidos = await getPedidos();
        const meusPedidos =
          dataUser.role === "admin"
            ? dataPedidos
            : dataPedidos.filter((p: any) => p.email === dataUser.email);
        setPedidos(meusPedidos);
      } catch {
        setError("Erro ao carregar informações ou você não está logado.");
        setTimeout(() => navigate("/login"), 1500);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const validarTelefone = (tel: string) => {
    if (!tel) return true;
    const numeros = tel.replace(/\D/g, "");
    return /^\d{10,11}$/.test(numeros);
  };

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAvisoTelefone("");

    if (!validarTelefone(telefone)) {
      setAvisoTelefone("Telefone inválido!");
      setTimeout(() => setAvisoTelefone(""), 3000);
      return;
    }

    if (!usuario) return;
    try {
      setEnviando(true);
      await createPedido(usuario.nome || "Desconhecido", usuario.email, telefone, mensagem);
      setTelefone("");
      setMensagem("");
      const data = await getPedidos();
      const meusPedidos =
        usuario.role === "admin"
          ? data
          : data.filter((p: any) => p.email === usuario.email);
      setPedidos(meusPedidos);
      setTimeout(() => setEnviando(false), 800);
    } catch (err: any) {
      setError(err.message || "Erro ao criar pedido");
      setEnviando(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      await deletePedido(id);
      const data = await getPedidos();
      const meusPedidos =
        usuario?.role === "admin"
          ? data
          : data.filter((p: any) => p.email === usuario?.email);
      setPedidos(meusPedidos);
    } catch (err: any) {
      setError(err.message || "Erro ao excluir pedido");
    }
  };

  const startEditing = (pedido: Pedido) => {
    setEditingId(pedido.id);
    setEditTelefone(pedido.telefone || "");
    setEditMensagem(pedido.mensagem);
    setAvisoTelefoneEditar("");
  };

  const saveEdit = async (id: number) => {
    setAvisoTelefoneEditar("");
    if (!validarTelefone(editTelefone)) {
      setAvisoTelefoneEditar("Telefone inválido! Apenas números (10-11 dígitos).");
      setTimeout(() => setAvisoTelefoneEditar(""), 3000);
      return;
    }
    try {
      await updatePedido(id, pedidos.find((p) => p.id === id)?.status || "pendente");
      const data = await getPedidos();
      const meusPedidos =
        usuario?.role === "admin"
          ? data
          : data.filter((p: any) => p.email === usuario?.email);
      setPedidos(meusPedidos);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || "Erro ao editar pedido");
    }
  };

  const handleStatusChange = async (id: number, novoStatus: string) => {
    try {
      await updatePedido(id, novoStatus);
      const atualizados = pedidos.map((p) => (p.id === id ? { ...p, status: novoStatus } : p));
      setPedidos(atualizados);
    } catch (err: any) {
      setError(err.message || "Erro ao alterar status");
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="inicio-page">
      <div id="particle-container"></div>

     {/* Menu lateral */}
      <div className={`menu ${menuOpen ? "open" : ""}`}>
        <div className="menu-inner">
          <div className="menu-cards">
            <div
              className="menu-card inicio"
              onClick={() => { setMenuOpen(false); navigate("/inicio"); }}
            >
              <img src="/images/inicio.png" alt="Início" className="card-img" />
              <span className="card-label">Início</span>
            </div>

            <div
              className="menu-card perfil"
              onClick={() => { setMenuOpen(false); navigate("/perfil"); }}
            >
              <img src="/images/perfil.png" alt="Perfil" className="card-img" />
              <span className="card-label">Perfil</span>
            </div>

            <div
              className="menu-card ambientes"
              onClick={() => { setMenuOpen(false); navigate("/ambientes"); }}
            >
              <img src="/images/ambientes.png" alt="Ambientes" className="card-img" />
              <span className="card-label">Ambientes</span>
            </div>

            <div
              className="menu-card pedidos"
              onClick={() => { setMenuOpen(false); navigate("/pedidos"); }}
            >
              <img src="/images/pedidos.png" alt="Pedidos" className="card-img" />
              <span className="card-label">Pedidos</span>
            </div>

            {usuario?.role === "admin" && (
              <div
                className="menu-card usuarios"
                onClick={() => { setMenuOpen(false); navigate("/usuarios"); }}
              >
                <img src="/images/usuarios.png" alt="Usuários" className="card-img" />
                <span className="card-label">Usuários</span>
              </div>
            )}
          </div>

          <button className="logout-btn" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); navigate("/login"); }}>
            Logout
          </button>
        </div>
      </div>

      <div className={`menu-icon ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen((s) => !s)}>
        <div></div>
        <div></div>
        <div></div>
      </div>

      {/* === CONTEÚDO PRINCIPAL DE PEDIDOS === */}
      <div className="inicio-content pedidos-content">
        <div className="pedidos-form-container">
          <h1 className="pedidos-title">Meus Pedidos</h1>

          <form onSubmit={handleCriar} className="pedidos-form">
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="input-field"
              />
              {avisoTelefone && <span className="aviso-telefone">{avisoTelefone}</span>}
            </div>
            <textarea
              placeholder="Mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              required
              className="input-field mensagem-grande"
            />
            <button type="submit" disabled={enviando} className={`submit-btn ${enviando ? "sending" : ""}`}>
              {enviando ? "Enviando..." : "Enviar Pedido"}
            </button>
          </form>

          <div className="pedidos-list">
            {pedidos.map((p) => (
              <div key={p.id} className="pedido-card fade-in">
                {(usuario?.role === "admin" || p.email === usuario?.email) && (
                  <>
                    <button onClick={() => handleExcluir(p.id)} className="delete-top-btn">×</button>
                    {editingId !== p.id ? (
                      <button onClick={() => startEditing(p)} className="btn white-btn editar-btn">Editar</button>
                    ) : (
                      <button onClick={() => saveEdit(p.id)} className="btn white-btn editar-btn">Pronto</button>
                    )}
                  </>
                )}

                <h3>{p.empresa}</h3>
                <p><strong>Email:</strong> {p.email}</p>

                {editingId === p.id ? (
                  <div style={{ position: "relative" }}>
                    <input type="text" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} className="input-field" placeholder="Telefone" />
                    {avisoTelefoneEditar && <span className="aviso-telefone">{avisoTelefoneEditar}</span>}
                    <textarea value={editMensagem} onChange={(e) => setEditMensagem(e.target.value)} className="input-field mensagem-grande" placeholder="Mensagem" />
                  </div>
                ) : (
                  <>
                    {p.telefone && <p><strong>Telefone:</strong> {p.telefone}</p>}
                    <p><strong>Mensagem:</strong> {p.mensagem}</p>
                  </>
                )}

                <div className="status-container">
                  <strong>Status:</strong>{" "}
                  {usuario?.role === "admin" ? (
                    <div className="custom-select">
                      <select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value)}>
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="concluído">Concluído</option>
                      </select>
                    </div>
                  ) : (
                    <span className={`status-badge ${p.status}`}>{p.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
