import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createParticles } from "../animations/global";
import "../styles/global.css";

export default function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    createParticles("particle-container");
  }, []);

  return (
    <div className="welcome-page">
      <div id="particle-container"></div>

      <div className="page-container">
        <h1>Bem-vindo</h1>
        <p>
          Explore ambientes em 3D, gerencie seus pedidos e acompanhe tudo em
          tempo real.
        </p>

        <div className="button-area">
          {/* Botão Entrar */}
          <button
            className="custom-button left"
            onClick={() => navigate("/login")}
          >
            <span className="button-text">Entrar</span>
            <span className="arrow-wrapper left"></span>
          </button>

          {/* Botão Cadastre-se */}
          <button
            className="custom-button right"
            onClick={() => navigate("/register")}
          >
            <span className="button-text">Cadastre-se</span>
            <span className="arrow-wrapper"></span>
          </button>
        </div>
      </div>
    </div>
  );
}
