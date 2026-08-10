import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getMe, Usuario } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  clearNewUserOnboarding,
  getNewUserOnboardingId,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "../utils/onboarding";
import "../styles/inicio.css";

type OnboardingChoice = {
  id: "explorar" | "divulgar";
  title: string;
  description: string;
  action: string;
};

const highlights = [
  {
    title: "Tours em 360°",
    description: "Imagens, vídeos e hotspots em uma navegação simples e direta.",
  },
  {
    title: "Destaque para seus espaços",
    description: "Informações organizadas para quem visita e para quem cria.",
  },
  {
    title: "Dados de acesso",
    description: "Estatísticas simples para entender o interesse do público.",
  },
];

const quickActions = [
  "Navegue por tours, imagens, vídeos e hotspots",
  "Publique seus espaços de forma organizada",
  "Acompanhe as estatísticas de acesso",
  "Reúna todos os seus ambientes em um só lugar",
];

const onboardingChoices: OnboardingChoice[] = [
  {
    id: "explorar",
    title: "Explorar ambientes",
    description: "Quero conhecer lugares, navegar por tours e descobrir conteúdos.",
    action: "Seguir para o explorador",
  },
  {
    id: "divulgar",
    title: "Divulgar um espaço",
    description: "Quero publicar um ambiente, apresentar um local ou criar uma vitrine.",
    action: "Abrir formulário",
  },
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
  const isInView = useInView(ref, { once: true, margin: "-12% 0px -12% 0px" });

  return (
    <motion.section
      id={id}
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 26 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function OnboardingModal({
  open,
  userName,
  onChoose,
  isChoosing,
  choiceError,
}: {
  open: boolean;
  userName: string;
  onChoose: (choice: OnboardingChoice) => void;
  onSkip: () => void;
  isChoosing: boolean;
  choiceError: string;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className="inicio-onboarding-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="inicio-onboarding-panel"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="inicio-onboarding-header">
          <span className="inicio-kicker">Primeiro acesso</span>
          <h2>O que você quer fazer, {userName}?</h2>
          <p>
            Seu cadastro está pronto. Escolha uma opção para começar.
          </p>
        </div>

        <div className="inicio-onboarding-grid">
          {onboardingChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="inicio-onboarding-choice"
              onClick={() => onChoose(choice)}
              disabled={isChoosing}
            >
              <span className="inicio-onboarding-choice-title">{choice.title}</span>
              <span className="inicio-onboarding-choice-description">{choice.description}</span>
              <span className="inicio-onboarding-choice-action">{choice.action}</span>
            </button>
          ))}
        </div>

        {choiceError ? <p className="inicio-error-text">{choiceError}</p> : null}

      </motion.div>
    </motion.div>,
    document.body
  );
}

export default function Inicio() {
  const { isAuthenticated } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [choiceError, setChoiceError] = useState("");
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
    mass: 0.3,
  });

  const heroInView = useInView(heroRef, { amount: 0.3 });
  const heroY = useTransform(scrollY, [0, 650], [0, -48]);
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0.8]);
  const ambientOneY = useTransform(scrollY, [0, 900], [0, -80]);
  const ambientTwoY = useTransform(scrollY, [0, 900], [0, 70]);

  useEffect(() => {
    (async () => {
      try {
        if (!isAuthenticated) {
          setUsuario(null);
          setShowOnboarding(false);
          return;
        }

        const data = await getMe();
        setUsuario(data);

        const pendingOnboardingId = getNewUserOnboardingId();
        const shouldOpenOnboarding =
          pendingOnboardingId === data.id && !hasCompletedOnboarding(data.id);

        if (pendingOnboardingId && pendingOnboardingId !== data.id) {
          clearNewUserOnboarding();
        }

        setShowOnboarding(shouldOpenOnboarding);
      } catch {
        setUsuario(null);
        setError("");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, navigate]);

  const isAdmin = usuario?.role === "admin";
  const isEmpresa = usuario?.role === "empresa";
  const canAccessAdminAreas = isAdmin || isEmpresa;
  const analyticsRoute = canAccessAdminAreas
    ? "/analytics"
    : isAuthenticated
    ? "/perfil"
    : "/login";

  const greeting = useMemo(() => {
    if (!usuario?.nome) return "Bem-vindo";
    return `Olá, ${usuario.nome.trim().split(" ")[0]}`;
  }, [usuario]);

  const historyRoute = useMemo(() => {
    if (!usuario?.id) return "/login";
    if (canAccessAdminAreas) return `/historico/${usuario.id}`;
    return "/perfil";
  }, [canAccessAdminAreas, usuario]);

  async function handleOnboardingChoice(choice: OnboardingChoice) {
    if (!usuario?.id) return;

    setIsChoosing(true);
    setChoiceError("");

    try {
      if (choice.id === "divulgar") {
        navigate("/divulgar-espaco", {
          state: {
            nome: usuario.nome,
            email: usuario.email,
          },
        });
      } else {
        navigate("/explorer");
      }

      markOnboardingCompleted(usuario.id);
      setShowOnboarding(false);
    } catch (err) {
      setChoiceError(err instanceof Error ? err.message : "Não foi possível concluir sua escolha.");
    } finally {
      setIsChoosing(false);
    }
  }

  function handleSkipOnboarding() {
    if (usuario?.id) {
      markOnboardingCompleted(usuario.id);
    }

    setShowOnboarding(false);
  }

  if (loading) {
    return (
      <div className="inicio-loading">
        <motion.div
          className="inicio-loading-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Preparando sua experiência...
        </motion.div>
      </div>
    );
  }

  if (error) {
    return <div className="inicio-error-page">{error}</div>;
  }

  return (
    <div ref={pageRef} className="inicio-page">
      <motion.div className="inicio-progress" style={{ scaleX: smoothProgress, transformOrigin: "0%" }} />
      <div className="inicio-noise" />
      <motion.div className="inicio-ambient inicio-ambient--one" style={{ y: ambientOneY }} />
      <motion.div className="inicio-ambient inicio-ambient--two" style={{ y: ambientTwoY }} />

      <OnboardingModal
        open={showOnboarding}
        userName={usuario?.nome?.trim().split(" ")[0] || "pessoa"}
        onChoose={handleOnboardingChoice}
        onSkip={handleSkipOnboarding}
        isChoosing={isChoosing}
        choiceError={choiceError}
      />

      <motion.main className="inicio-content">
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
              transition={{ duration: 0.55 }}
            >
              <motion.span
                className="inicio-kicker"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
              >
                {greeting} · QOLOP
              </motion.span>

              <motion.h1
                className="inicio-title"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08 }}
              >
                Interface mais simples. Destaque para seus espaços.
              </motion.h1>

              <motion.p
                className="inicio-lead"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.14 }}
              >
                Explore ambientes, apresente espaços e acompanhe os resultados
                em uma interface mais simples e organizada.
              </motion.p>

              <motion.div
                className="inicio-hero-actions"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 }}
              >
                <motion.button
                  type="button"
                  className="inicio-button inicio-button--primary"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate("/explorer")}
                >
                  Explorar agora
                </motion.button>

                {canAccessAdminAreas ? (
                  <>
                    <motion.button
                      type="button"
                      className="inicio-button inicio-button--secondary"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => navigate(analyticsRoute)}
                    >
                      Abrir analytics
                    </motion.button>

                    <motion.button
                      type="button"
                      className="inicio-button inicio-button--secondary"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => navigate(historyRoute)}
                    >
                      Ver histórico
                    </motion.button>
                  </>
                ) : isAuthenticated ? (
                  <motion.button
                    type="button"
                    className="inicio-button inicio-button--secondary"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate("/perfil")}
                  >
                    Ver perfil
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      type="button"
                      className="inicio-button inicio-button--secondary"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => navigate("/login")}
                    >
                      Entrar
                    </motion.button>

                    <motion.button
                      type="button"
                      className="inicio-button inicio-button--secondary"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => navigate("/register")}
                    >
                      Criar conta
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>

            <motion.aside
              className="inicio-hero-panel"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
            >
              <span className="inicio-panel-label">Visão geral</span>
              <div className="inicio-panel-stack">
                {highlights.map((item, index) => (
                  <div key={item.title} className="inicio-panel-item">
                    <span className="inicio-panel-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="inicio-panel-footnote">
                {usuario?.email
                  ? `Sessão ativa · ${usuario.email}.`
                  : "Navegação pública · faça login para personalizar."}
              </div>
            </motion.aside>
          </div>

          <motion.div
            className="inicio-scroll-indicator"
            animate={heroInView ? { opacity: [0.6, 1, 0.6], y: [0, 4, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            Role para ver mais
          </motion.div>
        </motion.section>

        <RevealSection className="inicio-section">
          <div className="inicio-section-header">
            <span className="inicio-kicker">O essencial</span>
            <h2>Tudo o que você precisa está reunido em uma única interface.</h2>
            <p>
              Explorar ambientes, publicar espaços, consultar estatísticas e gerenciar
              seu conteúdo — tudo no mesmo lugar.
            </p>
          </div>

          <div className="inicio-grid">
            {quickActions.map((item, index) => (
              <motion.article
                key={item}
                className="inicio-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <span className="inicio-card-index">{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </motion.article>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="inicio-section inicio-section--compact">
          <div className="inicio-cta-card">
            <span className="inicio-kicker">Próximo passo</span>
            <h2>Escolha uma opção abaixo para começar.</h2>
            <p>
              Explore ambientes, publique um espaço ou acesse as estatísticas
              em uma interface simples e direta.
            </p>

            <div className="inicio-cta-actions">
              <motion.button
                type="button"
                className="inicio-button inicio-button--primary"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate("/explorer")}
              >
                Explorar ambientes
              </motion.button>

              <motion.button
                type="button"
                className="inicio-button inicio-button--secondary"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() =>
                  isAuthenticated
                    ? navigate("/divulgar-espaco", {
                        state: {
                          nome: usuario?.nome,
                          email: usuario?.email,
                        },
                      })
                    : navigate("/login")
                }
              >
                Publicar espaço
              </motion.button>

              <motion.button
                type="button"
                className="inicio-button inicio-button--secondary"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(analyticsRoute)}
              >
                Acessar estatísticas
              </motion.button>
            </div>
          </div>
        </RevealSection>
      </motion.main>
    </div>
  );
}
