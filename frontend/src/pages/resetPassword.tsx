import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "../services/authService";
import "../styles/login.css";

const resetPoints = [
  "Use a nova senha para voltar ao sistema",
  "O link expira por motivos de segurança",
  "Você pode salvar a nova senha no gerenciador que preferir",
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailFromQuery = searchParams.get("email") ?? "";
  const tokenFromQuery = searchParams.get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const email = useMemo(() => emailFromQuery.trim().toLowerCase(), [emailFromQuery]);
  const token = useMemo(() => tokenFromQuery.trim(), [tokenFromQuery]);

  const formIsReady = email.length > 0 && token.length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formIsReady) {
      setError("Link de redefinição inválido. Solicite um novo email.");
      return;
    }

    if (senha.trim().length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (senha !== confirmacao) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const response = await confirmPasswordReset({
        email,
        token,
        senha: senha.trim(),
      });

      setSuccess(response.message);
      setSenha("");
      setConfirmacao("");

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao redefinir a senha");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-noise" />
      <div className="login-ambient login-ambient--one" />
      <div className="login-ambient login-ambient--two" />
      <div className="login-ambient login-ambient--three" />

      <button type="button" className="auth-back-button" onClick={() => navigate("/login")}>
        Voltar
      </button>

      <main className="login-shell">
        <section className="login-hero">
          <motion.div
            className="login-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="login-eyebrow">Qolop · redefinição segura</span>
            <h1 className="login-display-title">Crie uma nova senha e volte a entrar.</h1>
            <p className="login-display-lead">
              Este acesso vale só por tempo limitado. Depois de definir a nova senha, você já
              pode usar sua conta novamente.
            </p>

            <div className="login-point-list">
              {resetPoints.map((item, index) => (
                <div key={item} className="login-point">
                  <span className="login-point-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="login-container animate-fadeIn"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.08 }}
          >
            <div className="login-header">
              <span className="login-badge">Redefinir senha</span>
              <h2 className="login-title">Nova senha</h2>
              <p className="login-subtitle">
                {email ? `Conta: ${email}` : "Use o link enviado ao seu email para continuar."}
              </p>
            </div>

            {error && <p className="login-error">{error}</p>}
            {success && <p className="login-success">{success}</p>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label className="login-label" htmlFor="reset-senha">
                  Nova senha
                </label>
                <div className="login-password-field">
                  <input
                    id="reset-senha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Digite a nova senha"
                    className="login-input login-input--password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={mostrarSenha}
                  >
                    {mostrarSenha ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="login-label" htmlFor="reset-confirmacao">
                  Confirmar senha
                </label>
                <input
                  id="reset-confirmacao"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  className="login-input"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <button type="submit" disabled={loading || !formIsReady} className="login-button">
                {loading ? "Redefinindo..." : "Salvar nova senha"}
              </button>
            </form>

            <div className="login-footer">
              <p className="login-register-text">
                Já definiu sua senha?{" "}
                <Link to="/login" className="login-register-link">
                  Voltar para login
                </Link>
              </p>

              <div className="login-footer-actions">
                <button
                  type="button"
                  className="login-secondary-button"
                  onClick={() => navigate("/login")}
                >
                  Ir para login
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
