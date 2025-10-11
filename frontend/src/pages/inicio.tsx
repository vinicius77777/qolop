
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, Usuario } from "../services/api";
import { createParticles } from "../animations/global";
import "../styles/global.css";

export default function Inicio() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Garante que recria as partículas ao entrar nessa rota
    if (location.pathname === "/inicio") {
      createParticles("particle-container");
    }
  }, [location.pathname]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setUsuario(data);
      } catch (err: any) {
        setError("Você precisa estar logado.");
        setTimeout(() => navigate("/login"), 1400);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="inicio-page">
      <div id="particle-container"></div>

      
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

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("usuario");
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Botão menu (hamburger) */}
      <div
        className={`menu-icon ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen((s) => !s)}
      >
        <div></div>
        <div></div>
        <div></div>
      </div>

      {/* Conteúdo principal */}
      <div className="inicio-content">
        <h1 className="inicio-title">Bem-vindo(a), {usuario?.nome}</h1>
        <p className="inicio-desc">
          Gerencie seus ambientes, pedidos e usuários de forma rápida e prática.
        </p>
      </div>
    </div>
  );
}
