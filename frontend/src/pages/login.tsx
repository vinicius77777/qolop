// src/pages/login.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await login(email, senha);

      console.log("✅ Login bem-sucedido:", res);

      // salva token + usuario no localStorage
      localStorage.setItem("token", res.token);
      localStorage.setItem("usuario", JSON.stringify(res.usuario));

      navigate("/inicio"); // vai para o dashboard
    } catch (err: any) {
      console.error("❌ Erro ao logar:", err);
      setError(err.message || "Erro ao logar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>

        {error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full border rounded-lg px-3 py-2"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          Não tem conta?{" "}
          <Link to="/register" className="text-green-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
