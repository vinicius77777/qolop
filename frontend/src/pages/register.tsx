import React, { useState } from "react";
import { motion } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { markNewUserOnboarding } from "../utils/onboarding";
import "../styles/register.css";

const registerPoints = [
  "Comece com nome, e-mail e senha",
  "Depois escolha como quer usar a plataforma",
  "Ative opções profissionais só quando fizer sentido",
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const nomeNormalizado = nome.trim();
    const emailNormalizado = email.trim().toLowerCase();
    const senhaNormalizada = senha.trim();

    if (nomeNormalizado.length < 2) {
      setError("Informe seu nome");
      setLoading(false);
      return;
    }

    if (!emailNormalizado) {
      setError("Informe seu e-mail");
      setLoading(false);
      return;
    }

    if (senhaNormalizada.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const usuario = await register(nomeNormalizado, emailNormalizado, senhaNormalizada);
      markNewUserOnboarding(usuario.id);
      navigate("/inicio");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao cadastrar");
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

      <button
        type="button"
        className="auth-back-button"
        onClick={() => navigate("/")}
      >
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
            <span className="login-eyebrow">Qolop · crie sua conta</span>
            <h1 className="login-display-title">Cadastro simples para começar rápido.</h1>
            <p className="login-display-lead">
              Crie sua conta com apenas nome, e-mail e senha. 
            </p>

            <div className="login-point-list">
              {registerPoints.map((item, index) => (
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
              <span className="login-badge">Cadastre-se</span>
              <h2 className="login-title">Abra sua conta</h2>
              <p className="login-subtitle">
                Informe seus dados básicos para entrar no QOLOP.
              </p>
            </div>

            {error && <p className="login-error">{error}</p>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label className="login-label" htmlFor="register-nome">
                  Nome
                </label>
                <input
                  id="register-nome"
                  type="text"
                  placeholder="Seu nome"
                  className="login-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="input-group">
                <label className="login-label" htmlFor="register-email">
                  E-mail
                </label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="input-group">
                <label className="login-label" htmlFor="register-senha">
                  Senha
                </label>
                <div className="login-password-field">
                  <input
                    id="register-senha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Crie uma senha"
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

              <button type="submit" disabled={loading} className="login-button">
                {loading ? "Cadastrando..." : "Criar conta"}
              </button>
            </form>

            <div className="login-footer">
              <p className="login-register-text">
                Já possui conta?{" "}
                <Link to="/login" className="login-register-link">
                  Fazer login
                </Link>
              </p>

              <div className="login-footer-actions">
                <button
                  type="button"
                  className="login-secondary-button"
                  onClick={() => navigate("/login")}
                >
                  Fazer login
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
