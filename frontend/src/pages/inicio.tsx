import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getMe, Usuario } from "../services/api";
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
    title: "Experiência imersiva",
    description: "Tours, imagens, vídeo e hotspots em uma navegação simples e direta.",
  },
  {
    title: "Apresentação mais clara",
    description: "Menos informação solta, mais contexto para quem visita e para quem cria.",
  },
  {
    title: "Insights úteis",
    description: "Analytics para entender o interesse do público sem poluir a interface.",
  },
];

const quickActions = [
  "Explorar ambientes com mais fluidez",
  "Divulgar um espaço de forma visualmente forte",
  "Acompanhar histórico e analytics no mesmo fluxo",
  "Centralizar conteúdo sem deixar a tela pesada",
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
  onSkip,
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
          <h2>Como você quer usar o QOLOP, {userName}?</h2>
          <p>
            Seu cadastro está pronto. Escolha o caminho que faz mais sentido para o seu objetivo.
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

        <div className="inicio-onboarding-footer">
          <button type="button" className="inicio-onboarding-skip" onClick={onSkip}>
            Agora não
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export default function Inicio() {
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
        setError("Você precisa estar logado.");
        setTimeout(() => navigate("/login"), 1400);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const isAdmin = usuario?.role === "admin";
  const isEmpresa = usuario?.role === "empresa";
  const canAccessAdminAreas = isAdmin || isEmpresa;
  const analyticsRoute = usuario ? "/analytics" : "/login";

  const greeting = useMemo(() => {
    if (!usuario?.nome) return "Bem-vindo";
    return `Olá, ${usuario.nome.trim().split(" ")[0]}`;
  }, [usuario]);

  const historyRoute = useMemo(() => {
    if (usuario?.id && canAccessAdminAreas) return `/historico/${usuario.id}`;
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
                Menos ruído. Mais presença para cada espaço.
              </motion.h1>

              <motion.p
                className="inicio-lead"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.14 }}
              >
                Uma tela inicial mais limpa, com foco no essencial: explorar ambientes,
                apresentar espaços e acompanhar resultados sem excesso de informação.
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
                ) : null}
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
                Sessão ativa{usuario?.email ? ` · ${usuario.email}` : ""}.
              </div>
            </motion.aside>
          </div>

          <motion.div
            className="inicio-scroll-indicator"
            animate={heroInView ? { opacity: [0.6, 1, 0.6], y: [0, 4, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            Role para ver o que dá para fazer
          </motion.div>
        </motion.section>

        <RevealSection className="inicio-section">
          <div className="inicio-section-header">
            <span className="inicio-kicker">O essencial</span>
            <h2>Uma apresentação mais direta, com menos distração visual.</h2>
            <p>
              A tela foi reduzida para destacar o que importa e deixar a experiência mais
              calma, elegante e fácil de entender.
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
            <h2>Use a plataforma com um fluxo mais leve e mais bonito.</h2>
            <p>
              Explore ambientes, publique um espaço ou acesse os dados em uma interface que
              respira mais — mais próxima de uma direção visual editorial.
            </p>

            {canAccessAdminAreas ? (
              <div className="inicio-cta-actions">
                <motion.button
                  type="button"
                  className="inicio-button inicio-button--primary"
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
              </div>
            ) : null}
          </div>
        </RevealSection>
      </motion.main>
    </div>
  );
}
