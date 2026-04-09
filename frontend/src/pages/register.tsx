import React, { useState } from "react";
import { motion } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";
import "../styles/login.css";

const registerPoints = [
  "Crie seu espaço digital com rapidez",
  "Cadastre empresa, órgão ou instituição",
  "Comece a publicar ambientes com mais controle",
];

export default function Register() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [orgaoPublico, setOrgaoPublico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const nomeNormalizado = nome.trim();
    const emailNormalizado = email.trim();
    const empresaNomeNormalizado = empresaNome.trim();

    if (nomeNormalizado.length < 3) {
      setError("Nome deve ter no mínimo 3 caracteres");
      setLoading(false);
      return;
    }

    if (senha.trim().length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await register(
        nomeNormalizado,
        emailNormalizado,
        senha,
        empresaNomeNormalizado || undefined,
        orgaoPublico
      );

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
            <span className="login-eyebrow">Qolop · crie sua conta</span>
            <h1 className="login-display-title">Cadastre-se e comece seu espaço digital.</h1>
            <p className="login-display-lead">
              Crie sua conta para publicar ambientes, organizar conteúdos e apresentar seus espaços de forma profissional.
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
              <span className="login-badge">Criar cadastro</span>
              <h2 className="login-title">Abra sua conta</h2>
              <p className="login-subtitle">
                Preencha seus dados para começar a usar a plataforma.
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
                  placeholder="Nome"
                  className="login-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="login-label" htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <label className="login-label" htmlFor="register-empresa">
                  {orgaoPublico ? "Nome do órgão público" : "Nome da empresa"}
                </label>
                <input
                  id="register-empresa"
                  type="text"
                  placeholder={
                    orgaoPublico ? "Nome do órgão público (opcional)" : "Nome da empresa (opcional)"
                  }
                  className="login-input"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                />
              </div>

              <label className="login-register-text" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={orgaoPublico}
                  onChange={(e) => setOrgaoPublico(e.target.checked)}
                />
                <span>órgão público</span>
              </label>

              <button type="submit" disabled={loading} className="login-button">
                {loading ? "Cadastrando..." : "Cadastrar"}
              </button>
            </form>

            <div className="login-footer">
              <p className="login-register-text">
                Já tem conta?{" "}
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
