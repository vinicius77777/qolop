import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createParticles } from "../animations/global";
import { register } from "../services/api";
import "../styles/global.css";

export default function Register() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
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
      const res = await register(nome, email, senha);
      localStorage.setItem("token", res.token);
      localStorage.setItem("usuario", JSON.stringify(res.usuario));
      navigate("/inicio");
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div id="particle-container"></div>

      <div className="register-container animate-fadeIn">
        <h1 className="register-title">Cadastro</h1>

        {error && <p className="register-error">{error}</p>}

        <form onSubmit={handleSubmit} className="register-form">
          <input
            type="text"
            placeholder="Nome"
            className="register-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="register-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="register-input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className="register-button">
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="register-login-text">
          Já tem conta?{" "}
          <Link to="/login" className="register-login-link">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
