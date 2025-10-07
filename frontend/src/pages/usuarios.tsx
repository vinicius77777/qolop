// src/pages/usuarios.tsx
import React, { useEffect, useState } from "react";
import { getMe, getUsuarios, Usuario } from "../services/api";
import { useNavigate } from "react-router-dom";
import { createParticles } from "../animations/global";
import "../styles/global.css";

const REFRESH_INTERVAL = 10000; // 10 segundos

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Inicializa partículas
  useEffect(() => {
    createParticles("particle-container");
  }, []);

  // Função para carregar usuários e validar admin
  const carregar = async () => {
    try {
      setLoading(true);
      const user = await getMe();
      setUsuario(user);

      if (user.role !== "admin") {
        setError("Acesso negado");
        return;
      }

      const data = await getUsuarios();
      setUsuarios(data);
      setError("");
    } catch {
      setError("Erro ao carregar usuários ou usuário não autenticado.");
      setTimeout(() => navigate("/login"), 1500);
    } finally {
      setLoading(false);
    }
  };

  // Carrega inicialmente e configura intervalo para atualização
  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="inicio-page">
      <div id="particle-container"></div>

      {/* Menu lateral */}
      <div className={`menu ${menuOpen ? "open" : ""}`}>
        <div className="menu-inner">
          <div className="menu-cards">
            <div className="menu-card inicio" onClick={() => { setMenuOpen(false); navigate("/inicio"); }}>
              <img src="/images/inicio.png" alt="Início" className="card-img" />
              <span className="card-label">Início</span>
            </div>
            <div className="menu-card perfil" onClick={() => { setMenuOpen(false); navigate("/perfil"); }}>
              <img src="/images/perfil.png" alt="Perfil" className="card-img" />
              <span className="card-label">Perfil</span>
            </div>
            <div className="menu-card ambientes" onClick={() => { setMenuOpen(false); navigate("/ambientes"); }}>
              <img src="/images/ambientes.png" alt="Ambientes" className="card-img" />
              <span className="card-label">Ambientes</span>
            </div>
            <div className="menu-card pedidos" onClick={() => { setMenuOpen(false); navigate("/pedidos"); }}>
              <img src="/images/pedidos.png" alt="Pedidos" className="card-img" />
              <span className="card-label">Pedidos</span>
            </div>
            {usuario?.role === "admin" && (
              <div className="menu-card usuarios" onClick={() => { setMenuOpen(false); navigate("/usuarios"); }}>
                <img src="/images/usuarios.png" alt="Usuários" className="card-img" />
                <span className="card-label">Usuários</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); navigate("/login"); }}>Logout</button>
        </div>
      </div>

      <div className={`menu-icon ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(s => !s)}>
        <div></div><div></div><div></div>
      </div>

      {/* Conteúdo */}
      <div className="inicio-content usuarios-content">
        <div className="pedidos-form-container">
          <h1 className="pedidos-title">Monitoramento de Usuários</h1>
          {error && <p className="text-red-500">{error}</p>}

          <div className="usuarios-list">
            {usuarios.map((u) => (
              <div
                key={u.id}
                className="pedido-card fade-in"
                style={{
                  maxWidth: "800px",
                  position: "relative",
                  padding: "15px 20px",
                  marginBottom: "15px",
                }}
              >
                <h3 style={{ textAlign: "center" }}>{u.nome}</h3>
                <p className="text-gray-400 italic" style={{ textAlign: "left" }}>Email: {u.email}</p>
                <p className="text-gray-400 italic" style={{ textAlign: "left" }}>Role: {u.role}</p>
                {u.criado_em && (
                  <p className="text-gray-400 italic" style={{ textAlign: "left" }}>
                    Criado em: {new Date(u.criado_em).toLocaleString()}
                  </p>
                )}
                {/* Você pode adicionar outras métricas de monitoramento aqui */}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
