import React, { useState } from "react";
import { motion } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";
import "../styles/login.css";

const loginPoints = [
  "Acesse seus ambientes e tours",
  "Continue de onde parou",
  "Entre com rapidez e clareza",
];

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await login(email, senha);

      if (res.token) {
        localStorage.setItem("token", res.token);
      }

      if (res.usuario) {
        localStorage.setItem("usuario", JSON.stringify(res.usuario));
      }

      navigate("/inicio");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao logar");
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

      <button className="auth-back-button" onClick={() => navigate("/")}>
        ← Voltar
      </button>

      <main className="login-shell">
        <section className="login-hero">
          <motion.div
            className="login-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="login-eyebrow">Qolop · acesso à sua experiência</span>
            <h1 className="login-display-title">Entre e continue seu espaço digital.</h1>
            <p className="login-display-lead">
              Faça login para explorar ambientes, acessar seus conteúdos e seguir de onde parou.
            </p>

            <div className="login-point-list">
              {loginPoints.map((item, index) => (
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
              <span className="login-badge">Fazer login</span>
              <h2 className="login-title">Acesse sua conta</h2>
              <p className="login-subtitle">
                Entre com seu email e sua senha para continuar.
              </p>
            </div>

            {error && <p className="login-error">{error}</p>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label className="login-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="login-label" htmlFor="login-senha">
                  Senha
                </label>
                <div className="login-password-field">
                  <input
                    id="login-senha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="login-input login-input--password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
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

              <button type="submit" disabled={loading} className="login-button">
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="login-footer">
              <p className="login-register-text">
                Ainda não tem conta?{" "}
                <Link to="/register" className="login-register-link">
                  Criar cadastro
                </Link>
              </p>

              <div className="login-footer-actions">
                <button
                  type="button"
                  className="login-secondary-button"
                  onClick={() => navigate("/register")}
                >
                  Criar cadastro
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
