// src/pages/perfil.tsx
import React, { useEffect, useState } from "react";
import { getMe, updateUsuario } from "../services/api";
import { useNavigate } from "react-router-dom";
import { createParticles } from "../animations/global";
import "../styles/global.css";

const Perfil: React.FC = () => {
  const [usuario, setUsuario] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    createParticles("particle-container");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setUsuario(data);
        setNome(data.nome);
        setEmail(data.email);
      } catch (err: any) {
        setMsg("Erro ao carregar perfil: " + err.message);
      }
    })();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUsuario(usuario.id, {
        nome,
        email,
        senha: novaSenha || undefined,
      });
      setMsg("");
      setSenhaAtual("");
      setNovaSenha("");
      const atualizado = await getMe();
      setUsuario(atualizado);
    } catch (err: any) {
      setMsg("Erro ao atualizar perfil: " + err.message);
    }
  };

  if (!usuario) return <p>Carregando perfil...</p>;

  return (
    <div className="inicio-page">
      <div id="particle-container"></div>

      {/* Menu lateral */}
      <div className={`menu ${menuOpen ? "open" : ""}`}>
        <div className="menu-inner">
          <div className="menu-cards">
            <div
              className="menu-card inicio"
              onClick={() => {
                setMenuOpen(false);
                navigate("/inicio");
              }}
            >
              <img src="/images/inicio.png" alt="Início" className="card-img" />
              <span className="card-label">Início</span>
            </div>

            <div
              className="menu-card perfil"
              onClick={() => {
                setMenuOpen(false);
                navigate("/perfil");
              }}
            >
              <img src="/images/perfil.png" alt="Perfil" className="card-img" />
              <span className="card-label">Perfil</span>
            </div>

            <div
              className="menu-card ambientes"
              onClick={() => {
                setMenuOpen(false);
                navigate("/ambientes");
              }}
            >
              <img
                src="/images/ambientes.png"
                alt="Ambientes"
                className="card-img"
              />
              <span className="card-label">Ambientes</span>
            </div>

            <div
              className="menu-card pedidos"
              onClick={() => {
                setMenuOpen(false);
                navigate("/pedidos");
              }}
            >
              <img src="/images/pedidos.png" alt="Pedidos" className="card-img" />
              <span className="card-label">Pedidos</span>
            </div>

            {/* Só admins veem o menu de Usuários */}
            {usuario?.role === "admin" && (
              <div
                className="menu-card usuarios"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/usuarios");
                }}
              >
                <img
                  src="/images/usuarios.png"
                  alt="Usuários"
                  className="card-img"
                />
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

      {/* Ícone do menu */}
      <div
        className={`menu-icon ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen((s) => !s)}
      >
        <div></div>
        <div></div>
        <div></div>
      </div>

      {/* Conteúdo */}
      <div className="inicio-content usuarios-content">
        <div className="pedidos-form-container">
          <h1 className="pedidos-title">Meu Perfil</h1>
          {msg && <p className="text-green-400">{msg}</p>}

          <form onSubmit={handleSalvar} className="flex flex-col gap-3 mt-3">
            <input
              type="text"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="password"
              placeholder="Nova senha (opcional)"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="input-field"
            />
            <input
              type="password"
              placeholder="Senha atual (necessária para confirmar)"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="input-field"
            />

            <button
              type="submit"
              className="submit-btn bg-white/15 border border-white/30 backdrop-blur-md px-4 py-3 rounded-md mt-4"
            >
              Salvar Alterações
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
