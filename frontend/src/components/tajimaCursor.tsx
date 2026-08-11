// src/components/tajimaCursor.tsx
// Cursor customizado em círculo — expande suavemente sobre elementos
// clicáveis. Padrão Tao Tajima compartilhado entre páginas.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

export default function TajimaCursor() {
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
        target?.closest("a, button, [role='button'], [data-tj-hover], input, select, textarea")
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
    <div className="tj-amb-cursor" aria-hidden="true">
      <motion.div
        className={`tj-amb-cursor-ring${isHovering ? " is-hovering" : ""}`}
        style={{ left: ringX, top: ringY }}
      />
      <motion.div className="tj-amb-cursor-dot" style={{ left: dotX, top: dotY }} />
    </div>,
    document.body
  );
}
