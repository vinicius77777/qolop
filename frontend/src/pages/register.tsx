// src/pages/register.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";


export default function Register() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [foto, setFoto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await register(nome, email, senha, foto);

      console.log("✅ Cadastro bem-sucedido:", res);

      // salva token + usuario no localStorage
      localStorage.setItem("token", res.token);
      localStorage.setItem("usuario", JSON.stringify(res.usuario));

      navigate("/inicio"); // vai pra home/dashboard
    } catch (err: any) {
      console.error("❌ Erro no cadastro:", err);
      setError(err.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Cadastro</h1>

        {error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nome"
            className="w-full border rounded-lg px-3 py-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
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
          <input
            type="text"
            placeholder="Foto (URL opcional)"
            className="w-full border rounded-lg px-3 py-2"
            value={foto}
            onChange={(e) => setFoto(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          Já tem conta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
