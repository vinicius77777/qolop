// src/pages/usuarios.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiAlertCircle,
  FiChevronRight,
  FiEdit3,
  FiEye,
  FiRefreshCw,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";
import { getMe, getUsuarios, type Usuario } from "../services/api";
import "../styles/usuarios.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

type RoleFilter = "todos" | NonNullable<Usuario["role"]>;
type UsuarioStatus = "ativo" | "pendente";

function getUsuarioStatus(usuario: Usuario): UsuarioStatus {
  if (usuario.role === "admin") return "ativo";
  if (!usuario.criado_em) return "pendente";
  return "ativo";
}

function getRoleLabel(role?: Usuario["role"]) {
  if (role === "admin") return "Administrador";
  if (role === "empresa") return "Empresa";
  return "Usuário";
}

function formatarData(data?: string) {
  if (!data) return "Sem registro";
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return "Sem registro";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatarEmpresa(usuario: Usuario) {
  return usuario.empresa?.nome || "Sem empresa vinculada";
}

function filtrarUsuarios(usuarios: Usuario[], busca: string, role: RoleFilter) {
  const termo = busca.trim().toLowerCase();

  return usuarios.filter((usuario) => {
    const matchesRole = role === "todos" || usuario.role === role;
    const matchesBusca =
      !termo ||
      [usuario.nome, usuario.email, usuario.empresa?.nome, String(usuario.id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo);

    return matchesRole && matchesBusca;
  });
}

export default function Usuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [roleFiltro, setRoleFiltro] = useState<RoleFilter>("todos");
  const [refreshId, setRefreshId] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getMe();

      if (user.role !== "admin") {
        setError("Acesso negado.");
        setUsuarios([]);
        return;
      }

      const data = await getUsuarios();
      setUsuarios(data);
      setError("");
    } catch {
      setError("Erro ao carregar usuários.");
      setTimeout(() => navigate("/login"), 1200);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    carregar();
  }, [carregar, refreshId]);

  const usuariosFiltrados = useMemo(
    () => filtrarUsuarios(usuarios, busca, roleFiltro),
    [usuarios, busca, roleFiltro]
  );

  const resumo = useMemo(() => {
    return {
      total: usuarios.length,
      admins: usuarios.filter((usuario) => usuario.role === "admin").length,
      empresas: usuarios.filter((usuario) => usuario.role === "empresa").length,
      users: usuarios.filter((usuario) => usuario.role !== "admin" && usuario.role !== "empresa").length,
    };
  }, [usuarios]);

  function handleAtualizar() {
    setAtualizando(true);
    setRefreshId((id) => id + 1);
    window.setTimeout(() => setAtualizando(false), 700);
  }

  if (loading) {
    return (
      <div className="tj-usr-page tj-usr-loading">
        <motion.div
          className="tj-usr-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          USUÁRIOS
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tj-usr-page">
        <main className="tj-usr-content">
          <div className="tj-usr-empty">
            <span className="tj-usr-eyebrow">Indisponível</span>
            <h2>Usuários indisponíveis</h2>
            <p>{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="tj-usr-page">
      <div className="tj-usr-bg" aria-hidden="true">
        <span className="tj-usr-orb tj-usr-orb--one" />
        <span className="tj-usr-orb tj-usr-orb--two" />
        <span className="tj-usr-orb tj-usr-orb--three" />
      </div>

      <main className="tj-usr-content">
        {/* ============ HERO MINIMALISTA ============ */}
        <header className="tj-usr-hero">
          <motion.div
            className="tj-usr-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Gestão</span>
            <span className="tj-usr-dot" />
            <span>acesso administrativo</span>
          </motion.div>

          <motion.h1
            className="tj-usr-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Contas em uma
            <br />
            linha limpa.
          </motion.h1>

          <motion.p
            className="tj-usr-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Zero tabela pesada: cada usuário é uma linha tipográfica com um ponto
            luminoso indicando o estado. As ações surgem suavemente no hover.
          </motion.p>

          <motion.div
            className="tj-usr-hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            <span className="tj-usr-count">
              {usuarios.length === 1 ? "1 conta" : `${usuarios.length} contas`}
            </span>
            <button
              type="button"
              className="tj-usr-action"
              onClick={handleAtualizar}
              disabled={atualizando || loading}
            >
              <FiRefreshCw className={atualizando ? "tj-usr-spin" : ""} />
              {atualizando ? "Atualizando..." : "Atualizar"}
            </button>
          </motion.div>
        </header>

        {/* ============ NÚMEROS GIGANTES ============ */}
        <section className="tj-usr-stats" aria-label="Resumo de usuários">
          <div className="tj-usr-stat">
            <strong>{String(resumo.total).padStart(2, "0")}</strong>
            <span>Contas ativas</span>
          </div>
          <div className="tj-usr-stat">
            <strong>{String(resumo.admins).padStart(2, "0")}</strong>
            <span>Administradores</span>
          </div>
          <div className="tj-usr-stat">
            <strong>{String(resumo.empresas).padStart(2, "0")}</strong>
            <span>Empresas</span>
          </div>
          <div className="tj-usr-stat">
            <strong>{String(resumo.users).padStart(2, "0")}</strong>
            <span>Usuários comuns</span>
          </div>
        </section>

        {/* ============ LISTA TIPOGRÁFICA ============ */}
        <section className="tj-usr-browser">
          <div className="tj-usr-browser-head">
            <div className="tj-usr-browser-copy">
              <span className="tj-usr-eyebrow">Diretório</span>
              <h2>Pessoas na plataforma.</h2>
              <p>
                Verde indica conta ativa. Vermelho pisca para status pendente.
                Passe o mouse sobre a linha para revelar as ações em camadas.
              </p>
            </div>
          </div>

          <div className="tj-usr-toolbar">
            <label className="tj-usr-search">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, email, empresa ou id..."
                aria-label="Buscar usuários"
              />
            </label>

            <div className="tj-usr-filters">
              <label className="tj-usr-filter-field">
                <span>Perfil</span>
                <select
                  value={roleFiltro}
                  onChange={(e) => setRoleFiltro(e.target.value as RoleFilter)}
                  aria-label="Filtrar por perfil"
                >
                  <option value="todos">Todos os perfis</option>
                  <option value="admin">Administradores</option>
                  <option value="empresa">Empresas</option>
                  <option value="user">Usuários comuns</option>
                </select>
              </label>
            </div>
          </div>

          <p className="tj-usr-count" role="status" aria-live="polite">
            {usuariosFiltrados.length} usuário{usuariosFiltrados.length === 1 ? "" : "s"}
            {busca || roleFiltro !== "todos" ? " após filtros" : " na plataforma"}
          </p>

          {usuariosFiltrados.length === 0 ? (
            <div className="tj-usr-empty">
              <span className="tj-usr-eyebrow">Nenhum resultado</span>
              <p>Nenhum usuário corresponde aos filtros atuais.</p>
            </div>
          ) : (
            <div className="tj-usr-list">
              {usuariosFiltrados.map((usuario, index) => {
                const status = getUsuarioStatus(usuario);

                return (
                  <motion.div
                    key={usuario.id}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: TJ_EASE, delay: (index % 8) * 0.04 }}
                    className="tj-usr-row-wrap"
                  >
                    <button
                      type="button"
                      className="tj-usr-row"
                      onClick={() => navigate(`/historico/${usuario.id}`)}
                      aria-label={`Abrir histórico de ${usuario.nome}`}
                    >
                      <span className={`tj-usr-status-dot tj-usr-status-dot--${status}`} />
                      <span className="tj-usr-row-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="tj-usr-row-main">
                        <strong>{usuario.nome}</strong>
                        <span>{usuario.email}</span>
                        <span className="tj-usr-row-empresa">
                          {usuario.empresa ? <FiUserCheck /> : <FiUser />} {formatarEmpresa(usuario)}
                        </span>
                      </span>
                      <span className="tj-usr-row-date">{formatarData(usuario.criado_em)}</span>
                      <span className={`tj-usr-chip tj-usr-chip--${usuario.role || "user"}`}>
                        {getRoleLabel(usuario.role)}
                      </span>
                      <span className={`tj-usr-status-label tj-usr-status-label--${status}`}>
                        {status === "ativo" ? "Ativo" : "Pendente"}
                      </span>
                    </button>

                    {/* Ações no hover */}
                    <div className="tj-usr-hover-actions">
                      <button
                        type="button"
                        className="tj-usr-action tj-usr-action--icon"
                        title="Ver histórico"
                        aria-label={`Ver histórico de ${usuario.nome}`}
                        onClick={() => navigate(`/historico/${usuario.id}`)}
                      >
                        <FiEye />
                      </button>
                      <button
                        type="button"
                        className="tj-usr-action tj-usr-action--icon"
                        title="Editar dados"
                        aria-label={`Editar dados de ${usuario.nome}`}
                        onClick={() => navigate(`/historico/${usuario.id}`)}
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        type="button"
                        className="tj-usr-action tj-usr-action--icon"
                        title="Abrir detalhes"
                        aria-label={`Abrir detalhes de ${usuario.nome}`}
                        onClick={() => navigate(`/historico/${usuario.id}`)}
                      >
                        <FiChevronRight />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Alerta de erro de ação */}
        {error && (
          <div className="tj-usr-error" role="alert" aria-live="assertive">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}
      </main>
    </div>
  );
}
