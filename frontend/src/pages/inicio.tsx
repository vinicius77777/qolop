// src/pages/inicio.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaClipboardList, FaCubes } from "react-icons/fa";
import { Usuario } from "../services/api";

interface CardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({ title, description, icon, color, onClick }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer p-6 rounded-3xl shadow-2xl transform transition-transform hover:scale-105 hover:shadow-indigo-400 bg-gradient-to-br from-white to-gray-100`}
  >
    <div className={`text-5xl mb-4 ${color}`}>{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
    <button className="mt-4 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:from-blue-500 hover:to-green-500 transition-all">
      Acessar
    </button>
  </div>
);

export default function Inicio() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuario");
    if (usuarioSalvo) setUsuario(JSON.parse(usuarioSalvo));
    else navigate("/login");
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 via-pink-300 to-yellow-200">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-700">Taotajima</h1>
        <div className="flex items-center space-x-4">
          {usuario && (
            <>
              <span className="text-gray-700 font-medium flex items-center space-x-2">
                {usuario.foto && (
                  <img
                    src={usuario.foto}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-500"
                  />
                )}
                <span>Olá, {usuario.nome}</span>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 px-5 py-2 rounded-xl text-white font-semibold hover:bg-red-600 transition-colors shadow-lg"
              >
                Sair
              </button>
            </>
          )}
        </div>
      </header>

      <main className="p-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-gray-800 drop-shadow-lg">
          Escolha uma opção
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card
            title="Ambientes"
            description="Explore os ambientes disponíveis e veja previews em 3D/VR."
            icon={<FaCubes />}
            color="text-green-500"
            onClick={() => navigate("/ambientes")}
          />
          <Card
            title="Pedidos"
            description="Acompanhe, crie ou atualize pedidos de forma rápida e prática."
            icon={<FaClipboardList />}
            color="text-blue-500"
            onClick={() => navigate("/pedidos")}
          />
          {usuario?.role === "admin" && (
            <Card
              title="Usuários"
              description="Gerencie usuários e permissões do sistema."
              icon={<FaUsers />}
              color="text-yellow-500"
              onClick={() => navigate("/usuarios")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
