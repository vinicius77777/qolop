// src/components/menu.tsx
// Navegação global "botão animado":
// Estado fechado = botão circular flutuante (logo + anel pulsante).
// Ao clicar, o próprio botão faz um morph (layoutId) e vira a barra
// completa com TODAS as opções, no mesmo local, via spring.

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import {
  FiBriefcase,
  FiClock,
  FiCompass,
  FiGrid,
  FiHome,
  FiLayers,
  FiLogIn,
  FiLogOut,
  FiMail,
  FiMoon,
  FiPlusCircle,
  FiSun,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { canAccessEmpresaFeatures, isAdminUser } from "../utils/permissions";
import "../styles/menu.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

const CONTACT_EMAIL = "qolop.ie@gmail.com";
const CONTACT_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
  CONTACT_EMAIL
)}`;

interface MenuLinkDef {
  to: string;
  label: string;
  icon: ReactNode;
}

/** Atraso de entrada escalonado para cada item da barra aberta. */
function itemStyle(index: number): CSSProperties {
  return { animationDelay: `${120 + index * 36}ms` };
}

export default function Menu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = isAdminUser(user);
  const canAccessEmpresa = canAccessEmpresaFeatures(user);

  // fecha a barra ao trocar de rota
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // fecha com Escape ou clique fora
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const linksPrincipais = useMemo<MenuLinkDef[]>(
    () => [
      { to: "/inicio", label: "Início", icon: <FiHome /> },
      { to: "/ambientes", label: "Ambientes", icon: <FiGrid /> },
      { to: "/explorer", label: "Explorar", icon: <FiCompass /> },
      ...(canAccessEmpresa
        ? [{ to: "/analytics", label: "Analytics", icon: <FiTrendingUp /> }]
        : []),
    ],
    [canAccessEmpresa]
  );

  const linksSecundarios = useMemo<MenuLinkDef[]>(
    () => [
      ...(canAccessEmpresa
        ? [
            { to: "/divulgar-espaco", label: "Divulgar espaço", icon: <FiLayers /> },
            { to: "/pedidos", label: "Pedidos", icon: <FiBriefcase /> },
            ...(user
              ? [
                  {
                    to: `/historico/${user.id}`,
                    label: "Histórico",
                    icon: <FiClock />,
                  },
                ]
              : []),
          ]
        : []),
      ...(isAdmin
        ? [{ to: "/criarTour", label: "Gerar Ambiente", icon: <FiPlusCircle /> }]
        : []),
      { to: "/empresas", label: "Organizações", icon: <FiBriefcase /> },
      ...(isAdmin
        ? [{ to: "/usuarios", label: "Usuários", icon: <FiUsers /> }]
        : []),
    ],
    [canAccessEmpresa, isAdmin, user]
  );

  function sair() {
    setOpen(false);
    logout();
    navigate("/login");
  }

  function entrar() {
    setOpen(false);
    navigate("/login");
  }

  function abrirPerfil() {
    setOpen(false);
    navigate(user ? "/perfil" : "/login");
  }

  const dockTransition: Transition = {
    type: "spring",
    stiffness: 340,
    damping: 28,
  };

  return (
    <motion.nav
      ref={dockRef}
      className={`menu${open ? " menu--open" : ""}`}
      aria-label="Navegação principal"
      initial={{ opacity: 0, y: 22, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: TJ_EASE }}
    >
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="menu-bar"
            layoutId="menu-dock"
            className="menu-bar"
            role="menu"
            aria-label="Menu completo"
            initial={{ opacity: 0, scale: 0.55, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.55, y: 16 }}
            transition={dockTransition}
          >
            {/* Logo */}
            <NavLink
              to="/inicio"
              className="menu-bar-item menu-logo-mini"
              aria-label="QOLOP — Início"
              style={itemStyle(0)}
            >
              <img src="/menu.png" alt="QOLOP" className="menu-logo-image" />
            </NavLink>

            <span className="menu-divider" style={itemStyle(1)} aria-hidden="true" />

            {/* Links principais */}
            {linksPrincipais.map((link, i) => (
              <NavLink
                key={link.label}
                to={link.to}
                role="menuitem"
                className={({ isActive }) =>
                  `menu-bar-item${isActive ? " active" : ""}`
                }
                style={itemStyle(i + 2)}
                onClick={() => setOpen(false)}
              >
                <span className="menu-bar-icon">{link.icon}</span>
                <span className="menu-bar-label">{link.label}</span>
              </NavLink>
            ))}

            <span
              className="menu-divider"
              style={itemStyle(linksPrincipais.length + 2)}
              aria-hidden="true"
            />

            {/* Links secundários */}
            {linksSecundarios.map((link, i) => (
              <NavLink
                key={link.label}
                to={link.to}
                role="menuitem"
                className={({ isActive }) =>
                  `menu-bar-item${isActive ? " active" : ""}`
                }
                style={itemStyle(linksPrincipais.length + i + 3)}
                onClick={() => setOpen(false)}
              >
                <span className="menu-bar-icon">{link.icon}</span>
                <span className="menu-bar-label">{link.label}</span>
              </NavLink>
            ))}

            <span
              className="menu-divider"
              style={itemStyle(linksPrincipais.length + linksSecundarios.length + 3)}
              aria-hidden="true"
            />

            {/* Ações: contato, tema, conta */}
            <div
              className="menu-actions"
              style={itemStyle(linksPrincipais.length + linksSecundarios.length + 4)}
            >
              <button
                type="button"
                className="menu-action"
                aria-label="Contato por email"
                title="Contato"
                onClick={() => window.open(CONTACT_URL, "_blank", "noreferrer")}
              >
                <FiMail />
              </button>

              <button
                type="button"
                className="menu-action"
                aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                title={isDark ? "Modo claro" : "Modo escuro"}
                onClick={toggleTheme}
              >
                {isDark ? <FiSun /> : <FiMoon />}
              </button>

              <button
                type="button"
                className="menu-action"
                aria-label="Perfil"
                title="Perfil"
                onClick={abrirPerfil}
              >
                <FiUser />
              </button>

              {user ? (
                <button
                  type="button"
                  className="menu-action menu-action--logout"
                  aria-label="Sair"
                  title="Sair"
                  onClick={sair}
                >
                  <FiLogOut />
                </button>
              ) : (
                <button
                  type="button"
                  className="menu-action"
                  aria-label="Entrar"
                  title="Entrar"
                  onClick={entrar}
                >
                  <FiLogIn />
                </button>
              )}

              <button
                type="button"
                className="menu-action menu-action--close"
                aria-label="Fechar menu"
                title="Fechar"
                onClick={() => setOpen(false)}
              >
                <FiX />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="menu-fab"
            layoutId="menu-dock"
            type="button"
            className="menu-fab"
            aria-label="Abrir menu"
            aria-expanded={false}
            aria-haspopup="menu"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.55, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.55, y: 16 }}
            transition={dockTransition}
            whileHover={{ scale: 1.07, y: -2 }}
            whileTap={{ scale: 0.93 }}
          >
            <span className="menu-fab-ring" aria-hidden="true" />
            <span className="menu-fab-dot" aria-hidden="true" />
            <img src="/menu.png" alt="" className="menu-fab-logo" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
