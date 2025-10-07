import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createParticles } from "../animations/global";
import { login } from "../services/api";
import "../styles/global.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createParticles("particle-container");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await login(email, senha);
      localStorage.setItem("token", res.token);
      localStorage.setItem("usuario", JSON.stringify(res.usuario));
      navigate("/inicio");
    } catch (err: any) {
      setError(err.message || "Erro ao logar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div id="particle-container"></div>

      <div className="login-container">
        <h1 className="login-title">Entrar</h1>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            className="login-input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="login-register-text">
          Não tem conta?{" "}
          <Link to="/register" className="login-register-link">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
