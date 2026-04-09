import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";

const quickPoints = [
  {
    title: "Explorar no mapa",
    body: "Veja lugares no mapa e entre neles de forma virtual.",
  },
  {
    title: "Adicionar conteúdos",
    body: "Use tours 3D, hotspots, fotos, vídeos e outros materiais interativos.",
  },
  {
    title: "Analisar resultados",
    body: "Acompanhe visualizações, comportamento e pontos que mais chamam atenção no ambiente.",
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
              Qolop · plataforma que digitaliza e transorma ambientes 
            </span>

            <h1 className="welcome-title">Entre e comece a explorar lugares.</h1>

            <p className="welcome-lead">
              O Qolop transforma lugares reais em experiências digitais imersivas, com tours virtuais em 3D, hotspots interativos e navegação online para que a pessoa explore um espaço como se estivesse lá dentro.
            </p>

            <div className="welcome-actions">
              <button
                type="button"
                className="welcome-action welcome-action--primary"
                onClick={() => navigate("/login")}
              >
                Fazer login
              </button>

              <button
                type="button"
                className="welcome-action welcome-action--secondary"
                onClick={() => navigate("/register")}
              >
                Criar cadastro
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
                <span>Qolop cria experiências imersivas</span>
                <span>Qolop conecta mapa, tour e conteúdo</span>
                <span>Qolop transforma lugares em vitrines digitais</span>
                <span>Qolop revela insights com analytics</span>
                <span>Qolop cria experiências imersivas</span>
                <span>Qolop conecta mapa, tour e conteúdo</span>
                <span>Qolop transforma lugares em vitrines digitais</span>
                <span>Qolop revela insights com analytics</span>
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
              <h2>Descubra, explore e apresente lugares de um jeito muito mais imersivo.</h2>
              <p>
                Além de criar uma vitrine digital no mapa, o Qolop funciona como um ambiente de descoberta onde pessoas encontram espaços, navegam por tours 3D e conhecem melhor cada local.
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
              <strong>Por que isso é útil?</strong>
              <span>
                Porque ele une apresentação imersiva, descoberta de espaços e analytics para ajudar cada lugar a chamar mais atenção e gerar melhores resultados.
              </span>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
