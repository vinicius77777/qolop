// src/pages/usuarios.tsx
import React, { useEffect, useState } from "react";
import { getMe, getUsuarios, Usuario } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/usuarios.css";

const REFRESH_INTERVAL = 10000;

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const navigate = useNavigate();

  const carregar = async () => {
    try {
      setLoading(true);

      // pega o usuário logado
      const user = await getMe();
      setUsuario(user);

      // bloqueia qualquer usuário que não seja admin
      if (user.role !== "admin") {
        setError("Acesso negado.");
        setUsuarios([]);
        return;
      }

      // carrega todos os usuários
      const data = await getUsuarios();
      setUsuarios(data);
      setError("");
    } catch {
      setError("Erro ao carregar usuários.");
      setTimeout(() => navigate("/login"), 1200);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="usuarios-loading">Carregando usuários...</p>;
  if (error) return <p className="usuarios-error">{error}</p>;

  return (
    <div className="usuarios-page">
      <div className="usuarios-wrapper">
        <h1 className="usuarios-title">Monitoramento de Usuários</h1>

        <div className="usuarios-list">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="usuario-card"
              onClick={() => navigate(`/historico/${u.id}`)}
              style={{ cursor: "pointer" }}
            >
              <span className={`usuario-role ${u.role}`}>{u.role}</span>
              <h3 className="usuario-nome">{u.nome}</h3>
              <p className="usuario-info">
                <strong>Email:</strong> {u.email}
              </p>
              <p className="usuario-info">
                <strong>ID:</strong> {u.id}
              </p>
              {u.criado_em && (
                <p className="usuario-info">
                  <strong>Criado em:</strong> {new Date(u.criado_em).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Usuarios;