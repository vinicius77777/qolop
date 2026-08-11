// src/components/mobileAmbienteCarousel.tsx
// Carrossel horizontal panorâmico (mobile):
// swipe com CSS scroll-snap + auto-play 3.5s + indicador glow no slide ativo.

import { useCallback, useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiStar } from "react-icons/fi";
import { useReducedMotion } from "framer-motion";
import type { Ambiente } from "../services/api";
import { resolveMediaUrl } from "../utils/mediaUrl";

const AUTOPLAY_INTERVAL_MS = 3500;
const INTERACTION_PAUSE_MS = 6000;

interface MobileAmbienteCarouselProps {
  ambientes: Ambiente[];
  onOpenTour: (id: number) => void;
  onActiveChange: (index: number) => void;
  enabled?: boolean;
  destaqueIds?: ReadonlySet<number>;
}

function ambientePreviewUrl(amb: Ambiente): string | null {
  return amb.imagemPreview ? resolveMediaUrl(amb.imagemPreview) : null;
}

function nearestSlideIndex(track: HTMLElement): number {
  const scrollCenter = track.scrollLeft + track.clientWidth / 2;
  const children = Array.from(track.children) as HTMLElement[];
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  children.forEach((child, index) => {
    const childCenter = child.offsetLeft + child.offsetWidth / 2;
    const distance = Math.abs(childCenter - scrollCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });

  return best;
}

export default function MobileAmbienteCarousel({
  ambientes,
  onOpenTour,
  onActiveChange,
  enabled = true,
  destaqueIds,
}: MobileAmbienteCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeIndexRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  const fallbackTimeoutRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const goTo = useCallback(
    (index: number, smooth = true) => {
      const track = trackRef.current;
      if (!track) return;

      const clamped = Math.min(Math.max(index, 0), ambientes.length - 1);
      const slide = track.children[clamped] as HTMLElement | undefined;
      if (!slide) return;

      isProgrammaticScrollRef.current = true;
      const behavior: ScrollBehavior =
        !smooth || shouldReduceMotion ? "instant" : "smooth";
      track.scrollTo({
        left: Math.max(
          slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2,
          0
        ),
        behavior,
      });

      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
      onActiveChange(clamped);

      if (fallbackTimeoutRef.current !== null) {
        window.clearTimeout(fallbackTimeoutRef.current);
      }
      fallbackTimeoutRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 800);
    },
    [ambientes.length, onActiveChange, shouldReduceMotion]
  );

  /* reset quando a lista carrega/recarrega */
  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
    onActiveChange(0);
    if (trackRef.current) {
      trackRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [ambientes, onActiveChange]);

  /* auto-play: troca suave a cada 3.5s (pausado após interação) */
  useEffect(() => {
    if (!enabled || shouldReduceMotion || ambientes.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) {
        return;
      }
      const next = (activeIndexRef.current + 1) % ambientes.length;
      goTo(next, true);
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [ambientes.length, enabled, goTo, shouldReduceMotion]);

  /* snap concluído — corrige o índice real */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleScrollEnd = () => {
      isProgrammaticScrollRef.current = false;
      const index = nearestSlideIndex(track);
      activeIndexRef.current = index;
      setActiveIndex(index);
      onActiveChange(index);
    };

    track.addEventListener("scrollend", handleScrollEnd);
    return () => track.removeEventListener("scrollend", handleScrollEnd);
  }, [ambientes.length, onActiveChange]);

  /* gesto manual do usuário */
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    if (!isProgrammaticScrollRef.current) {
      pauseUntilRef.current = Date.now() + INTERACTION_PAUSE_MS;
    }

    const index = nearestSlideIndex(track);
    if (index === activeIndexRef.current) {
      return;
    }

    activeIndexRef.current = index;
    setActiveIndex(index);
    if (!isProgrammaticScrollRef.current) {
      onActiveChange(index);
    }
  }, [onActiveChange]);

  const pauseAutoplay = useCallback(() => {
    pauseUntilRef.current = Date.now() + INTERACTION_PAUSE_MS;
  }, []);

  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current !== null) {
        window.clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="tj-carousel-mobile">
      <div
        ref={trackRef}
        className="tj-carousel-track"
        onScroll={handleScroll}
        onTouchStart={pauseAutoplay}
        onTouchMove={pauseAutoplay}
      >
        {ambientes.map((amb, index) => {
          const image = ambientePreviewUrl(amb);
          return (
            <button
              key={amb.id}
              type="button"
              className={`tj-slide${index === activeIndex ? " is-active" : ""}`}
              onClick={() => onOpenTour(amb.id)}
              aria-label={`Abrir tour de ${amb.titulo}`}
            >
              {image ? (
                <img src={image} alt="" className="tj-slide-bg" loading="lazy" />
              ) : null}
              <span className="tj-slide-shade" aria-hidden="true" />
              <span className="tj-slide-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="tj-slide-body">
                <span className="tj-slide-glowing" aria-hidden="true" />
                <span className="tj-slide-title">{amb.titulo}</span>
                <span className="tj-slide-meta">
                  {destaqueIds?.has(amb.id) && (
                    <span className="tj-slide-badge">
                      <FiStar />
                      Destaque
                    </span>
                  )}
                  {amb.categoria || "Ambiente"}
                  {amb.cidade ? ` · ${amb.cidade}` : ""}
                </span>
              </span>
              <span className="tj-slide-arrow" aria-hidden="true">
                <FiArrowUpRight />
              </span>
            </button>
          );
        })}
      </div>

      {ambientes.length > 1 ? (
        <div
          className="tj-carousel-dots"
          role="tablist"
          aria-label="Ambientes em destaque"
        >
          {ambientes.map((amb, index) => (
            <button
              key={amb.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={amb.titulo}
              className={`tj-carousel-dot${index === activeIndex ? " is-active" : ""}`}
              onClick={() => goTo(index, true)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
