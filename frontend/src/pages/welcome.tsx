import React from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 text-white px-4">
      {/* Logo / Título */}
      <h1 className="text-5xl font-extrabold mb-6 drop-shadow-lg text-center">
        Bem-vindo ao Taotajima
      </h1>
      <p className="text-lg mb-10 text-center max-w-md drop-shadow-md">
        Explore ambientes em 3D, gerencie seus pedidos e acompanhe tudo em tempo real.
      </p>

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate("/login")}
          className="bg-white text-green-600 font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition transform"
        >
          Entrar
        </button>

        <button
          onClick={() => navigate("/register")}
          className="bg-green-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition transform"
        >
          Cadastre-se
        </button>
      </div>

      {/* Rodapé */}
      <footer className="mt-20 text-sm text-white/70">
        © {new Date().getFullYear()} Taotajima. Todos os direitos reservados.
      </footer>
    </div>
  );
}
