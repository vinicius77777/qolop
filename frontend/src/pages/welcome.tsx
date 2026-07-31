import React from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";

function ButtonMarquee({ label }: { label: string }) {
  return (
    <span className="button-marquee" aria-hidden="true">
      <span className="button-marquee__viewport">
        <span className="button-marquee__copy">{label}</span>
      </span>
    </span>
  );
}

const quickPoints = [
  {
    title: "Explore no mapa",
    body: "Veja lugares no mapa e entre neles de forma virtual.",
  },
  {
    title: "Adicione conteúdos",
    body: "Use tours 3D, hotspots, fotos e vídeos interativos.",
  },
  {
    title: "Acompanhe os resultados",
    body: "Veja as visualizações e os pontos que mais chamam atenção em cada ambiente.",
  },
];

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-noise" />
      <div className="welcome-ambient welcome-ambient--one" />
      <div className="welcome-ambient welcome-ambient--two" />
      <div className="welcome-ambient welcome-ambient--three" />

      <header className="welcome-header">
        <img src="welcome.png" alt="Qolop" />
      </header>

      <main className="welcome-shell">
        <section className="welcome-hero">
          <motion.div
            className="welcome-copy"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="welcome-eyebrow">
              Qolop · tours, ambientes e presença digital
            </span>

            <h1 className="welcome-title">Explore lugares como se estivesse lá.</h1>

            <p className="welcome-lead">
              Tours em 3D, hotspots interativos e navegação online para conhecer
              espaços de um jeito simples e direto.
            </p>

            <div className="welcome-actions">
              <button
                type="button"
                className="welcome-action welcome-action--primary button-fill button-fill--dark"
                aria-label="Fazer login"
                onClick={() => navigate("/login")}
              >
                <ButtonMarquee label="Fazer login" />
              </button>

              <button
                type="button"
                className="welcome-action welcome-action--secondary button-fill button-fill--light"
                aria-label="Cadastre-se"
                onClick={() => navigate("/register")}
              >
                <ButtonMarquee label="Cadastre-se" />
              </button>
            </div>

            <div className="welcome-scroll-indicator">
              Acesse sua conta ou cadastre-se.
            </div>

            <div className="welcome-marquee" aria-label="mensagem contínua da plataforma">
              <motion.div
                className="welcome-marquee-track"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 18, ease: "linear", repeat: Infinity }}
              >
                <span>Qolop cria tours em 3D</span>
                <span>Qolop conecta mapa, tour e conteúdo</span>
                <span>Qolop transforma lugares em vitrines digitais</span>
                <span>Qolop mostra dados de acesso</span>
                <span>Qolop cria tours em 3D</span>
                <span>Qolop conecta mapa, tour e conteúdo</span>
                <span>Qolop transforma lugares em vitrines digitais</span>
                <span>Qolop mostra dados de acesso</span>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="welcome-panel"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.12 }}
          >
            <div className="welcome-panel-top">
              <div className="welcome-window-controls">
                <span />
                <span />
                <span />
              </div>
              <div className="welcome-panel-label">Mapa / vitrine digital</div>
            </div>

            <div className="welcome-highlight">
              <span className="welcome-highlight-badge">O que você pode fazer</span>
              <h2>Descubra, explore e apresente lugares com tours em 3D.</h2>
              <p>
                O Qolop é um mapa interativo onde você encontra espaços, navega por tours
                e conhece cada lugar com riqueza de detalhes.
              </p>
            </div>

            <div className="welcome-points">
              {quickPoints.map((item, index) => (
                <motion.article
                  key={item.title}
                  className="welcome-point"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2 + index * 0.08 }}
                  whileHover={{ y: -4 }}
                >
                  <span className="welcome-point-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="welcome-benefit">
              <strong>Por que usar o Qolop?</strong>
              <span>
                Ele reúne tours, mapa interativo e estatísticas de acesso em um só lugar,
                ajudando cada espaço a ter mais visibilidade.
              </span>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
