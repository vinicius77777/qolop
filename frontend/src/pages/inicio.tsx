// src/pages/inicio.tsx
// Página inicial redesenha na estética Tao Tajima:
// minimalismo extremo, tipografia gigante e interações fluidas,
// sem sacrificar a usabilidade do produto.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCompass,
  FiEye,
  FiPlus,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";
import {
  getAmbientes,
  getAmbientesDestaques,
  getAmbientesPublicos,
  getMe,
  type Ambiente,
  type Usuario,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  clearNewUserOnboarding,
  getNewUserOnboardingId,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "../utils/onboarding";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { canAccessEmpresaFeatures, isAdminUser } from "../utils/permissions";
import MobileAmbienteCarousel from "../components/mobileAmbienteCarousel";
import "../styles/inicio.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

type OnboardingChoice = {
  id: "explorar" | "divulgar";
  title: string;
  description: string;
  action: string;
};

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

/* ============================================
   Cursor customizado (círculo geométrico)
   ============================================ */
function TajimaCursor() {
  const shouldReduceMotion = useReducedMotion();
  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const ringX = useSpring(dotX, { stiffness: 240, damping: 26, mass: 0.55 });
  const ringY = useSpring(dotY, { stiffness: 240, damping: 26, mass: 0.55 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const onMove = (event: MouseEvent) => {
      dotX.set(event.clientX);
      dotY.set(event.clientY);
    };

    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = Boolean(
        target?.closest("a, button, [role='button'], [data-tj-hover]")
      );
      setIsHovering(interactive);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, [dotX, dotY, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return null;
  }

  return createPortal(
    <div className="tj-cursor" aria-hidden="true">
      <motion.div
        className={`tj-cursor-ring${isHovering ? " is-hovering" : ""}`}
        style={{ left: ringX, top: ringY }}
      />
      <motion.div className="tj-cursor-dot" style={{ left: dotX, top: dotY }} />
    </div>,
    document.body
  );
}

/* ============================================
   Reveal ao rolar
   ============================================ */
function TjReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.85, ease: TJ_EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================
   Modal de onboarding
   ============================================ */
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
      className="tj-onboarding-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="tj-onboarding-panel"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: TJ_EASE }}
      >
        <div className="tj-onboarding-head">
          <span className="tj-eyebrow">Primeiro acesso</span>
          <h2>O que você quer fazer, {userName}?</h2>
          <p>Seu cadastro está pronto. Escolha uma opção para começar.</p>
        </div>

        <div className="tj-onboarding-grid">
          {onboardingChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="tj-onboarding-choice"
              onClick={() => onChoose(choice)}
              disabled={isChoosing}
            >
              <span className="tj-onboarding-choice-title">{choice.title}</span>
              <span className="tj-onboarding-choice-description">
                {choice.description}
              </span>
              <span className="tj-onboarding-choice-action">{choice.action}</span>
            </button>
          ))}
        </div>

        {choiceError ? <p className="tj-error-text">{choiceError}</p> : null}

        <div className="tj-onboarding-footer">
          <button
            type="button"
            className="tj-onboarding-skip"
            onClick={onSkip}
            disabled={isChoosing}
          >
            Agora não
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ============================================
   Página
   ============================================ */
export default function Inicio() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [destaques, setDestaques] = useState<Ambiente[]>([]);
  const [activeAmbiente, setActiveAmbiente] = useState<Ambiente | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [choiceError, setChoiceError] = useState("");

  const isFinePointer = useMediaQuery("(pointer: fine)");
  const isMobileLayout = useMediaQuery("(max-width: 820px)");
  /* o cross-fade mobile acompanha a media query CSS que exibe o carrossel */
  const isTouch = isMobileLayout;

  const isAdmin = isAdminUser(usuario);
  const isEmpresa = canAccessEmpresaFeatures(usuario);
  const analyticsRoute = isEmpresa
    ? "/analytics"
    : isAuthenticated
      ? "/perfil"
      : "/login";

  const greeting = useMemo(() => {
    if (!usuario?.nome) return "Bem-vindo";
    return `Olá, ${usuario.nome.trim().split(" ")[0]}.`;
  }, [usuario]);

  const titleLineOne = isAuthenticated ? greeting : "Explore o mundo";
  const titleLineTwo = isAuthenticated ? "Gerencie seus espaços." : "em 360 graus.";

  /* ---- sessão + onboarding ---- */
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        if (!isAuthenticated) {
          if (isMounted) {
            setUsuario(null);
            setShowOnboarding(false);
          }
          return;
        }

        const data = await getMe();

        if (!isMounted) return;

        setUsuario(data);

        const pendingOnboardingId = getNewUserOnboardingId();
        const shouldOpenOnboarding =
          pendingOnboardingId === data.id && !hasCompletedOnboarding(data.id);

        if (pendingOnboardingId && pendingOnboardingId !== data.id) {
          clearNewUserOnboarding();
        }

        setShowOnboarding(shouldOpenOnboarding);
      } catch {
        if (isMounted) {
          setUsuario(null);
          setShowOnboarding(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, navigate]);

  /* ---- destaques ---- */
  useEffect(() => {
    let isMounted = true;

    getAmbientesDestaques()
      .then((data) => {
        if (isMounted) {
          setDestaques(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDestaques([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* ---- ambientes recentes ---- */
  useEffect(() => {
    let isMounted = true;

    async function carregar() {
      try {
        const data = usuario
          ? await getAmbientes(usuario)
          : await getAmbientesPublicos();

        if (isMounted) {
          setAmbientes(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setAmbientes([]);
        }
      }
    }

    carregar();

    return () => {
      isMounted = false;
    };
  }, [usuario]);

  /* destaques sempre no topo, seguidos dos recentes (sem duplicar) */
  const ambientesEmDestaqueIds = useMemo(
    () => new Set(destaques.map((amb) => amb.id)),
    [destaques]
  );

  const ambientesVisiveis = useMemo(() => {
    const naoDestacados = ambientes.filter(
      (amb) => !ambientesEmDestaqueIds.has(amb.id)
    );
    const ordenados = [...destaques, ...naoDestacados];
    return ordenados.slice(0, 6);
  }, [ambientes, ambientesEmDestaqueIds, destaques]);
  const totalAmbientes = ambientes.length;
  const totalPublicos = ambientes.filter((amb) => amb.publico).length;

  const activeImage = activeAmbiente?.imagemPreview
    ? resolveMediaUrl(activeAmbiente.imagemPreview)
    : null;
  const carouselImage = ambientesVisiveis[carouselIndex]?.imagemPreview
    ? resolveMediaUrl(ambientesVisiveis[carouselIndex].imagemPreview)
    : null;

  /* clampa o índice do carrossel quando a lista recarrega */
  useEffect(() => {
    setCarouselIndex((current) =>
      current >= ambientesVisiveis.length && ambientesVisiveis.length > 0 ? 0 : current
    );
  }, [ambientesVisiveis.length]);

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
      setChoiceError(
        err instanceof Error ? err.message : "Não foi possível concluir sua escolha."
      );
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

  /* ---- loading ---- */
  if (loading) {
    return (
      <div className="tj-page tj-loading">
        <motion.div
          className="tj-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          QOLOP
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`tj-page${isFinePointer ? " tj-page--cursor" : ""}`}>
      {/* fundo reativo — desktop: hover da lista; mobile: cross-fade do carrossel */}
      <div
        className={`tj-stage${
          isTouch
            ? carouselImage
              ? " is-active"
              : ""
            : activeAmbiente && activeImage
              ? " is-active"
              : ""
        }`}
        aria-hidden="true"
      >
        {!isTouch && activeImage ? (
          <img src={activeImage} alt="" className="tj-stage-img" />
        ) : null}

        {isTouch ? (
          <div className="tj-stage-fade">
            {ambientesVisiveis.map((amb, index) =>
              amb.imagemPreview ? (
                <img
                  key={amb.id}
                  src={resolveMediaUrl(amb.imagemPreview) ?? undefined}
                  alt=""
                  className={`tj-stage-fade-img${
                    index === carouselIndex ? " is-active" : ""
                  }`}
                />
              ) : null
            )}
          </div>
        ) : null}

        <div className="tj-stage-veil" />
        <div className="tj-stage-glow" />
      </div>

      <TajimaCursor />

      <OnboardingModal
        open={showOnboarding}
        userName={usuario?.nome?.trim().split(" ")[0] || "pessoa"}
        onChoose={handleOnboardingChoice}
        onSkip={handleSkipOnboarding}
        isChoosing={isChoosing}
        choiceError={choiceError}
      />

      <main className="tj-content">
        {/* ============ HERO ============ */}
        <header className="tj-hero">
          <motion.div
            className="tj-hero-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>{greeting}</span>
            <span className="tj-dot" />
            <span>QOLOP</span>
          </motion.div>

          <motion.h1
            className="tj-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            {titleLineOne}
            <br />
            {titleLineTwo}
          </motion.h1>

          <motion.p
            className="tj-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Tours imersivos, publicação de ambientes e análise de público — tudo em uma
            interface limpa e direta.
          </motion.p>

          <motion.div
            className="tj-quick-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            <motion.button
              type="button"
              className="tj-action tj-action--solid"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/explorer")}
            >
              <FiCompass />
              Explorar ambientes
            </motion.button>

            <motion.button
              type="button"
              className="tj-action"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/ambientes")}
            >
              <FiEye />
              Ver tours
            </motion.button>

            {isEmpresa && (
              <motion.button
                type="button"
                className="tj-action"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(analyticsRoute)}
              >
                <FiTrendingUp />
                Analytics
              </motion.button>
            )}

            {!isAuthenticated && (
              <motion.button
                type="button"
                className="tj-action"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/login")}
              >
                Entrar
              </motion.button>
            )}
          </motion.div>
        </header>

        {/* ============ NÚMEROS ============ */}
        <section className="tj-stats" aria-label="Números da plataforma">
          <TjReveal delay={0.05}>
            <div className="tj-stat">
              <strong>{String(totalAmbientes).padStart(2, "0")}</strong>
              <span>Ambientes disponíveis</span>
            </div>
          </TjReveal>
          <TjReveal delay={0.1}>
            <div className="tj-stat">
              <strong>{String(totalPublicos).padStart(2, "0")}</strong>
              <span>Tours públicos</span>
            </div>
          </TjReveal>
          <TjReveal delay={0.15}>
            <div className="tj-stat">
              <strong>360°</strong>
              <span>Imersão total</span>
            </div>
          </TjReveal>
        </section>

        {/* ============ AMBIENTES RECENTES ============ */}
        <section className="tj-environments" id="ambientes">
          <TjReveal>
            <div className="tj-section-head">
              <span className="tj-eyebrow">Ambientes recentes</span>
              <button
                type="button"
                className="tj-text-link"
                onClick={() => navigate("/ambientes")}
              >
                Ver todos
                <FiArrowRight />
              </button>
            </div>
          </TjReveal>

          <div className="tj-list">
            {ambientesVisiveis.map((amb, index) => (
              <motion.button
                key={amb.id}
                type="button"
                className="tj-row"
                data-tj-hover
                onMouseEnter={() => setActiveAmbiente(amb)}
                onMouseLeave={() => setActiveAmbiente(null)}
                onFocus={() => setActiveAmbiente(amb)}
                onBlur={() => setActiveAmbiente(null)}
                onClick={() => navigate(`/tour/${amb.id}`)}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
                transition={{ duration: 0.65, ease: TJ_EASE, delay: index * 0.05 }}
              >
                <span className="tj-row-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={`tj-row-title${ambientesEmDestaqueIds.has(amb.id) ? " is-destaque" : ""}`}>
                  {amb.titulo}
                </span>
                <span className="tj-row-meta">
                  {ambientesEmDestaqueIds.has(amb.id) && (
                    <span className="tj-row-badge">
                      <FiStar />
                      Destaque
                    </span>
                  )}
                  {amb.categoria || "Ambiente"}
                  {amb.cidade ? ` · ${amb.cidade}` : ""}
                </span>
                <span className="tj-row-arrow">
                  <FiArrowUpRight />
                </span>
              </motion.button>
            ))}
          </div>

          {/* carrossel panorâmico — apenas mobile */}
          <MobileAmbienteCarousel
            ambientes={ambientesVisiveis}
            onActiveChange={setCarouselIndex}
            onOpenTour={(id) => navigate(`/tour/${id}`)}
            enabled={isMobileLayout}
            destaqueIds={ambientesEmDestaqueIds}
          />

          {ambientesVisiveis.length === 0 && (
            <TjReveal>
              <div className="tj-empty">
                <p>
                  Nenhum ambiente publicado ainda. Seja o primeiro a divulgar um
                  espaço em 360°.
                </p>
              </div>
            </TjReveal>
          )}
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className="tj-footer-cta">
          <TjReveal>
            <div className="tj-cta-inner">
              <span className="tj-eyebrow">Próximo passo</span>
              <h2>
                Seu espaço merece
                <br />
                ser visto.
              </h2>
              <p>
                Publique tours 360°, reúna seus ambientes e acompanhe o interesse
                do público.
              </p>
              <div className="tj-cta-actions">
                <motion.button
                  type="button"
                  className="tj-action"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/ambientes")}
                >
                  Ver tours disponíveis
                </motion.button>
              </div>
            </div>
          </TjReveal>
        </section>
      </main>

      {/* FAB contextual — admin cria tour; empresa publica espaço */}
      {isAdmin && (
        <motion.button
          type="button"
          className="tj-fab"
          data-tj-hover
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: TJ_EASE }}
          whileHover={{ y: -4, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/criarTour")}
          aria-label="Criar novo tour"
        >
          <FiPlus />
          <span>Novo tour</span>
        </motion.button>
      )}
    </div>
  );
}
