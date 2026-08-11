// src/pages/perfil.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLogOut,
  FiRefreshCw,
} from "react-icons/fi";
import { getMe, logout, updateUsuario, type Usuario } from "../services/api";
import { markNewUserOnboarding, resetOnboardingState } from "../utils/onboarding";
import "../styles/perfil.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

type FeedbackTone = "success" | "error" | "info";

const Perfil: React.FC = () => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setUsuario(data);
        setNome(data.nome);
        setEmail(data.email);
      } catch {
        setFeedback({ tone: "error", message: "Erro ao carregar perfil." });
      }
    })();
  }, []);

  useEffect(() => {
    if (!savedVisible) return;
    const timeout = window.setTimeout(() => setSavedVisible(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedVisible]);

  const iniciais = useMemo(() => {
    if (!usuario?.nome) return "US";
    return usuario.nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("");
  }, [usuario]);

  const perfilMudou = useMemo(() => {
    if (!usuario) return false;

    const nomeMudou = nome.trim() !== usuario.nome;
    const emailMudou = email.trim() !== usuario.email;
    const senhaMudou = Boolean(novaSenha.trim());

    return nomeMudou || emailMudou || senhaMudou;
  }, [usuario, nome, email, novaSenha]);

  const forcaSenha = useMemo(() => {
    const senha = novaSenha.trim();
    if (!senha) return { label: "Não definida", nivel: 0 };

    let pontos = 0;
    if (senha.length >= 8) pontos += 1;
    if (/[A-Z]/.test(senha)) pontos += 1;
    if (/[0-9]/.test(senha)) pontos += 1;
    if (/[^A-Za-z0-9]/.test(senha)) pontos += 1;

    if (pontos <= 1) return { label: "Fraca", nivel: 1 };
    if (pontos <= 3) return { label: "Média", nivel: 2 };
    return { label: "Forte", nivel: 3 };
  }, [novaSenha]);

  const senhaValida = !novaSenha || novaSenha.trim().length >= 8;
  const confirmacaoValida = !novaSenha || novaSenha === confirmarSenha;
  const podeSalvar =
    Boolean(nome.trim()) &&
    Boolean(email.trim()) &&
    perfilMudou &&
    senhaValida &&
    confirmacaoValida &&
    !salvando;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!usuario) return;

    if (!nome.trim() || !email.trim()) {
      setFeedback({ tone: "error", message: "Preencha nome e e-mail corretamente." });
      return;
    }

    if (novaSenha && novaSenha.trim().length < 8) {
      setFeedback({ tone: "error", message: "A nova senha deve ter pelo menos 8 caracteres." });
      return;
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
      setFeedback({ tone: "error", message: "A confirmação da nova senha não confere." });
      return;
    }

    setSalvando(true);

    try {
      await updateUsuario(usuario.id, {
        nome: nome.trim(),
        email: email.trim(),
        senha: novaSenha || undefined,
      });

      const atualizado = await getMe();
      setUsuario(atualizado);
      setNome(atualizado.nome);
      setEmail(atualizado.email);

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setFeedback({ tone: "success", message: "Perfil atualizado com sucesso." });
      setSavedVisible(true);
    } catch (err: any) {
      setFeedback({ tone: "error", message: err?.message || "Erro ao atualizar perfil." });
    } finally {
      setSalvando(false);
    }
  };

  const handleDescartar = () => {
    if (!usuario) return;

    setNome(usuario.nome);
    setEmail(usuario.email);
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setFeedback({ tone: "info", message: "Alterações descartadas." });
  };

  const podeTrocarTipoConta = usuario?.role !== "admin";

  const handleTrocarTipoConta = () => {
    if (!usuario?.id) return;

    resetOnboardingState(usuario.id);
    markNewUserOnboarding(usuario.id);
    setFeedback({ tone: "info", message: "Escolha seu tipo de conta novamente." });
    navigate("/inicio");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!usuario) {
    return (
      <div className="tj-per-page tj-per-loading">
        <motion.div
          className="tj-per-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          PERFIL
        </motion.div>
      </div>
    );
  }

  return (
    <div className="tj-per-page">
      <div className="tj-per-bg" aria-hidden="true">
        <span className="tj-per-orb tj-per-orb--one" />
        <span className="tj-per-orb tj-per-orb--two" />
        <span className="tj-per-orb tj-per-orb--three" />
      </div>

      <main className="tj-per-content">
        {/* ============ HERO MINIMALISTA ============ */}
        <header className="tj-per-hero">
          <motion.div
            className="tj-per-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Perfil</span>
            <span className="tj-per-dot" />
            <span>conta ativa</span>
          </motion.div>

          <motion.h1
            className="tj-per-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Gerencie seus dados
            <br />
            sem fricção.
          </motion.h1>

          <motion.p
            className="tj-per-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Atualize suas credenciais e mantenha sua conta segura. Campos limpos,
            apenas linhas finas e confirmação fluida ao salvar.
          </motion.p>

          <motion.div
            className="tj-per-hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            <button
              type="button"
              className="tj-per-action tj-per-action--danger"
              onClick={handleLogout}
            >
              <FiLogOut />
              Sair da conta
            </button>
          </motion.div>
        </header>

        {/* ============ FEEDBACK ============ */}
        {feedback && (
          <motion.div
            className={`tj-per-feedback tj-per-feedback--${feedback.tone}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role={feedback.tone === "error" ? "alert" : "status"}
            aria-live={feedback.tone === "error" ? "assertive" : "polite"}
          >
            {feedback.tone === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
            <span>{feedback.message}</span>
          </motion.div>
        )}

        {/* ============ GRID TIPOGRÁFICO ============ */}
        <section className="tj-per-grid">
          {/* ---------- Resumo ---------- */}
          <aside className="tj-per-block">
            <div>
              <span className="tj-per-eyebrow">Resumo da conta</span>
              <h2 style={{ marginTop: "0.8rem" }}>Suas informações.</h2>
            </div>

            <div className="tj-per-avatar-wrap">
              <span className="tj-per-avatar">{iniciais}</span>
              <div className="tj-per-hero-meta">
                <strong>{usuario.nome}</strong>
                <span>{usuario.email}</span>
              </div>
            </div>

            <div className="tj-per-summary-list">
              <div className="tj-per-summary-item">
                <span>Nome</span>
                <strong>{usuario.nome}</strong>
              </div>
              <div className="tj-per-summary-item">
                <span>E-mail</span>
                <strong>{usuario.email}</strong>
              </div>
              <div className="tj-per-summary-item">
                <span>Perfil</span>
                <strong>{usuario.role || "user"}</strong>
              </div>
              <div className="tj-per-summary-item">
                <span>Empresa</span>
                <strong>{usuario.empresa?.nome || "Não vinculada"}</strong>
              </div>
            </div>

            <div className="tj-per-tip">
              <h3>Dica de segurança</h3>
              <p>
                Use uma senha com letras maiúsculas, números e símbolos para deixar
                sua conta mais protegida.
              </p>
            </div>

            {podeTrocarTipoConta && (
              <div className="tj-per-tip">
                <h3>Trocar tipo de conta</h3>
                <p>
                  Refaça a escolha do tipo de conta para abrir novamente a tela de
                  onboarding. Essa opção não aparece para administradores.
                </p>
                <button
                  type="button"
                  className="tj-per-action"
                  onClick={handleTrocarTipoConta}
                >
                  Trocar tipo de conta
                </button>
              </div>
            )}
          </aside>

          {/* ---------- Editar informações ---------- */}
          <section className="tj-per-block">
            <div className="tj-per-block-head">
              <div>
                <span className="tj-per-eyebrow">Editar informações</span>
                <h2>Atualize seus dados.</h2>
                <p>As alterações são salvas imediatamente após a confirmação.</p>
              </div>
              {perfilMudou && <span className="tj-per-chip">Alterações pendentes</span>}
              {savedVisible && (
                <motion.span
                  className="tj-per-saved-pill"
                  initial={{ opacity: 0, y: 8, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: TJ_EASE }}
                >
                  <FiCheckCircle />
                  Salvo
                </motion.span>
              )}
            </div>

            <form className="tj-per-form" onSubmit={handleSalvar} noValidate>
              <div className="tj-per-field">
                <label htmlFor="nome">Nome</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (feedback?.tone === "error") setFeedback(null);
                  }}
                  required
                />
              </div>

              <div className="tj-per-field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (feedback?.tone === "error") setFeedback(null);
                  }}
                  required
                />
              </div>

              <div className="tj-per-block-head">
                <div>
                  <span className="tj-per-eyebrow">Segurança</span>
                  <h2>Senha.</h2>
                  <p>Atualize sua senha quando necessário.</p>
                </div>
              </div>

              <div className="tj-per-field">
                <label htmlFor="senhaAtual">Senha atual</label>
                <div className="tj-per-password-group">
                  <input
                    id="senhaAtual"
                    type={mostrarSenhaAtual ? "text" : "password"}
                    placeholder="Digite sua senha atual"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tj-per-toggle-password"
                    onClick={() => setMostrarSenhaAtual((prev) => !prev)}
                  >
                    {mostrarSenhaAtual ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="tj-per-field">
                <label htmlFor="novaSenha">Nova senha</label>
                <div className="tj-per-password-group">
                  <input
                    id="novaSenha"
                    type={mostrarNovaSenha ? "text" : "password"}
                    placeholder="Mínimo de 8 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tj-per-toggle-password"
                    onClick={() => setMostrarNovaSenha((prev) => !prev)}
                  >
                    {mostrarNovaSenha ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <div className="tj-per-password-meta">
                  <span className={`tj-per-strength tj-per-strength--${forcaSenha.nivel}`}>
                    Força da senha: {forcaSenha.label}
                  </span>
                  {novaSenha && !senhaValida && (
                    <small className="tj-per-field-error">
                      A senha precisa ter pelo menos 8 caracteres.
                    </small>
                  )}
                </div>
              </div>

              <div className="tj-per-field">
                <label htmlFor="confirmarSenha">Confirmar nova senha</label>
                <div className="tj-per-password-group">
                  <input
                    id="confirmarSenha"
                    type={mostrarConfirmacao ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tj-per-toggle-password"
                    onClick={() => setMostrarConfirmacao((prev) => !prev)}
                  >
                    {mostrarConfirmacao ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {novaSenha && !confirmacaoValida && (
                  <small className="tj-per-field-error">As senhas não coincidem.</small>
                )}
              </div>

              <div className="tj-per-form-actions">
                <button
                  type="button"
                  className="tj-per-action"
                  onClick={handleDescartar}
                  disabled={!perfilMudou || salvando}
                >
                  Descartar
                </button>

                <button
                  type="submit"
                  className="tj-per-action tj-per-action--solid"
                  disabled={!podeSalvar}
                >
                  {salvando ? (
                    <>
                      <FiRefreshCw className="tj-per-spin" style={{ animation: "tjPerSpin 0.9s linear infinite" }} />
                      Salvando...
                    </>
                  ) : (
                    "Salvar alterações"
                  )}
                </button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
};

export default Perfil;
