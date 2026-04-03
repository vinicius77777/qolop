import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getMe, Usuario } from "../services/api";
import "../styles/inicio.css";

type StoryCard = {
  title: string;
  body: string;
  tone: "glass" | "accent";
};

const metrics = [
  { value: "360° ", label: "visão imersiva dos seus espaços" },
  { value: "Tempo real ", label: "conteúdo e navegação atualizados com clareza" },
  { value: "1 fluxo ", label: "exploração, apresentação e análise conectadas" },
];

const storyCards: StoryCard[] = [
  {
    title: "Visão imersiva",
    body: "Qolop transforma lugares reais em experiências digitais interativas para que qualquer pessoa explore, entenda e apresente um espaço com mais profundidade.",
    tone: "glass",
  },
  {
    title: "Descoberta com contexto",
    body: "Mapa, tours virtuais, imagens, vídeos e hotspots se conectam em uma navegação mais intuitiva, sem depender de informações soltas.",
    tone: "glass",
  },
  {
    title: "Analytics que orientam",
    body: "A plataforma também mostra visualizações, comportamento e pontos de interesse para ajudar você a entender o que mais chama atenção em cada ambiente.",
    tone: "accent",
  },
];

const featureList = [
  "Apresente empresas, cidades, instituições e eventos de forma mais moderna e envolvente.",
  "Permita que as pessoas explorem espaços online como se estivessem dentro deles.",
  "Centralize tours 3D, imagens, vídeos e informações importantes em um só lugar.",
  "Use analytics para entender o interesse do público e melhorar cada apresentação.",
];

const proofMetrics = [
  { value: "Mais impacto ", label: "apresentações mais atrativas e memoráveis" },
  { value: "Mais clareza ", label: "melhor entendimento do espaço e do conteúdo" },
  { value: "Mais resultado ", label: "decisões guiadas por comportamento e interesse" },
];



function RevealSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });

  return (
    <motion.section
      id={id}
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 48 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

export default function Inicio() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  const { scrollY, scrollYProgress } = useScroll({
    target: pageRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 20,
    mass: 0.25,
  });

  const heroInView = useInView(heroRef, { amount: 0.25 });

  const heroY = useTransform(scrollY, [0, 700], [0, -110]);
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0.42]);
  const ambientOneY = useTransform(scrollY, [0, 1200], [0, -150]);
  const ambientTwoY = useTransform(scrollY, [0, 1200], [0, 130]);
  const ambientThreeY = useTransform(scrollY, [0, 1200], [0, -80]);
  const contentY = useTransform(scrollY, [0, 600], [0, -32]);
  const heroOrbScale = useTransform(scrollY, [0, 500], [1, 1.12]);
  const heroOrbRotate = useTransform(scrollY, [0, 700], [0, 10]);
  const sceneGlowX = useTransform(scrollYProgress, [0, 1], ["-8%", "14%"]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setUsuario(data);
      } catch {
        setError("Você precisa estar logado.");
        setTimeout(() => navigate("/login"), 1400);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const isAdmin = usuario?.role === "admin";
  const isEmpresa = usuario?.role === "empresa";
  const canAccessPedidos = isAdmin || isEmpresa;
  const canAccessHistorico = canAccessPedidos && !!usuario?.id;
  const analyticsRoute = usuario ? "/analytics" : "/login";

  const greeting = useMemo(() => {
    if (!usuario?.nome) return "Bem-vindo";
    return `Olá, ${usuario.nome.trim().split(" ")[0]}`;
  }, [usuario]);

  const historyRoute = useMemo(() => {
    if (canAccessHistorico && usuario?.id) return `/historico/${usuario.id}`;
    return "/perfil";
  }, [canAccessHistorico, usuario]);

  if (loading) {
    return (
      <div className="inicio-loading">
        <motion.div
          className="inicio-status"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Preparando sua experiência...
        </motion.div>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div ref={pageRef} className="inicio-page">
      <motion.div
        className="inicio-progress"
        style={{ scaleX: smoothProgress, transformOrigin: "0%" }}
      />
      <div className="inicio-noise" />
      <motion.div
        className="inicio-ambient inicio-ambient--one"
        style={{ y: ambientOneY }}
      />
      <motion.div
        className="inicio-ambient inicio-ambient--two"
        style={{ y: ambientTwoY }}
      />
      <motion.div
        className="inicio-ambient inicio-ambient--three"
        style={{ y: ambientThreeY }}
      />
      <motion.div className="inicio-scene-glow" style={{ x: sceneGlowX }} />

      <motion.main className="inicio-content" style={{ y: contentY }}>
        <motion.section
          ref={heroRef}
          className="inicio-hero"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="inicio-hero-inner">
            <motion.div
              className="inicio-hero-copy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <motion.span
                className="inicio-eyebrow"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05 }}
              >
                {greeting} · explore, apresente e acompanhe seus espaços
              </motion.span>

              <motion.h1
                className="inicio-title"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                Transforme lugares reais em experiências digitais que podem ser exploradas de verdade.
              </motion.h1>

              <motion.p
                className="inicio-lead"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.18 }}
              >
                Com tours virtuais em 3D, hotspots interativos, mapa e analytics, o
                Qolop ajuda você a apresentar ambientes de forma mais envolvente e a
                entender melhor como as pessoas interagem com cada espaço.
              </motion.p>

              {canAccessPedidos && (
                <motion.div
                  className="inicio-hero-actions"
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, delay: 0.28 }}
                >
                  <motion.button
                    type="button"
                    className="inicio-action inicio-action--primary"
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(analyticsRoute)}
                  >
                    Abrir analytics
                  </motion.button>

                  <motion.button
                    type="button"
                    className="inicio-action inicio-action--secondary"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(historyRoute)}
                  >
                    Ver histórico
                  </motion.button>
                </motion.div>
              )}

              <motion.div
                className="inicio-hero-caption"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.36 }}
              >
                Sessão ativa{usuario?.email ? ` · ${usuario.email}` : ""}.
              </motion.div>
            </motion.div>

            <motion.div
              className="inicio-scroll-indicator"
              animate={heroInView ? { y: [0, 8, 0], opacity: [0.65, 1, 0.65] } : {}}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            >
              Role para explorar a experiência
            </motion.div>

            <div className="inicio-metrics">
              {metrics.map((item, index) => (
                <motion.div
                  key={item.label}
                  className="inicio-metric"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.25 + index * 0.08 }}
                  whileHover={{ y: -4 }}
                >
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <RevealSection className="inicio-scene" id="visao">
          <div className="inicio-scene-header">
            <span className="inicio-scene-kicker">Experiência imersiva</span>
            <h2>Uma forma mais completa de mostrar e descobrir lugares no ambiente digital.</h2>
            <p>
              Cada camada da experiência foi pensada para facilitar a exploração,
              valorizar o espaço apresentado e tornar a navegação mais clara para quem visita.
            </p>
          </div>

          <div className="inicio-grid">
            {storyCards.map((card, index) => (
              <motion.article
                key={card.title}
                className={
                  card.tone === "accent"
                    ? "inicio-card inicio-card--accent"
                    : "inicio-card inicio-card--glass"
                }
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                transition={{ duration: 0.65, delay: index * 0.08 }}
                whileHover={{
                  y: -6,
                  rotateX: 1.5,
                  rotateY: index % 2 === 0 ? -1.5 : 1.5,
                }}
              >
                <span className="inicio-feature-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </motion.article>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="inicio-scene" id="porque-importa">
          <div className="inicio-scene-header">
            <span className="inicio-scene-kicker">Por que isso importa</span>
            <h2>Menos limitação na apresentação. Mais valor percebido em cada espaço.</h2>
            <p>
              O Qolop transforma a forma como lugares são vistos, explorados e divulgados, unindo descoberta, imersão e análise em uma única plataforma.
            </p>
          </div>

          <div className="inicio-grid">
            <motion.div
              className="inicio-card inicio-card--glass"
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <ul className="inicio-feature-list">
                {featureList.map((item, index) => (
                  <li key={item} className="inicio-feature-item">
                    <span className="inicio-feature-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              className="inicio-card inicio-card--accent"
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <h3>Uma camada de inteligência</h3>
              <p>
                Além de apresentar o ambiente, a plataforma mostra dados de visualização
                e comportamento para revelar o que mais desperta interesse e onde vale evoluir.
              </p>
            </motion.div>
          </div>
        </RevealSection>

        <section className="inicio-marquee" aria-label="mensagem contínua da plataforma">
          <motion.div
            className="inicio-marquee-track"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity }}
          >
            <span>Qolop cria experiências imersivas</span>
            <span>Qolop transforma lugares em vitrines digitais</span>
            <span>Qolop conecta mapa, tour e conteúdo</span>
            <span>Qolop revela insights com analytics</span>
            <span>Qolop cria experiências imersivas</span>
            <span>Qolop transforma lugares em vitrines digitais</span>
            <span>Qolop conecta mapa, tour e conteúdo</span>
            <span>Qolop revela insights com analytics</span>
          </motion.div>
        </section>

        <RevealSection className="inicio-proof" id="resultado">
          <motion.div
            className="inicio-proof-panel"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <span className="inicio-scene-kicker">Resultado percebido</span>
            <blockquote className="inicio-proof-quote">
              “Quando um lugar pode ser explorado de forma imersiva, ele deixa de ser
              só um ponto no mapa e passa a gerar conexão, entendimento e interesse real.”
            </blockquote>

            <div className="inicio-proof-metrics">
              {proofMetrics.map((item) => (
                <div key={item.label} className="inicio-proof-metric">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </RevealSection>

        <RevealSection className="inicio-cta" id="proximo-passo">
          <div className="inicio-cta-panel">
            <span className="inicio-scene-kicker">Seu próximo passo</span>
            <h2>Continue criando, explorando e entendendo melhor cada ambiente.</h2>
            <p>
              Acesse seus analytics, revise o histórico e evolua seus tours e conteúdos
              dentro do mesmo fluxo para apresentar cada espaço com ainda mais impacto.
            </p>

            {canAccessPedidos && (
              <div className="inicio-cta-actions">
                <motion.button
                  type="button"
                  className="inicio-action inicio-action--primary"
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate(analyticsRoute)}
                >
                  Abrir analytics
                </motion.button>

                <motion.button
                  type="button"
                  className="inicio-action inicio-action--secondary"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate(historyRoute)}
                >
                  Ver histórico
                </motion.button>
              </div>
            )}

         
          </div>
        </RevealSection>
      </motion.main>
    </div>
  );
}
