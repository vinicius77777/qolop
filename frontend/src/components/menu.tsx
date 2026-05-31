// src/components/menu.tsx

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiArrowLeft, FiArrowRight, FiMail, FiX } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { canAccessEmpresaFeatures, isAdminUser } from "../utils/permissions";
import "../styles/menu.css";

const itemMotion = {
  whileHover: { y: -2, scale: 1.01 },
  whileTap: { scale: 0.98, y: 0 },
  transition: {
    type: "spring" as const,
    stiffness: 380,
    damping: 26,
    mass: 0.7,
  },
};

const CONTACT_EMAIL = "qolop.ie@gmail.com";
const CONTACT_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
  CONTACT_EMAIL
)}`;

export default function Menu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    setMenuAberto(false);
  }, [user]);

  const sair = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = isAdminUser(user);
  const canAccessEmpresa = canAccessEmpresaFeatures(user);
  const canAccessPedidos = canAccessEmpresa;
  const canAccessAnalytics = canAccessEmpresa;
  const fecharMenu = () => setMenuAberto(false);
  const alternarMenu = () => setMenuAberto((valorAtual) => !valorAtual);

  return (
    <motion.header
      className={`menu ${menuAberto ? "menu-open" : ""}`}
      initial={{ opacity: 0, y: -16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="menu-shell">
        <div className="menu-side menu-side-left">
          <NavLink to="/inicio" className="menu-logo" aria-label="QOLOP" onClick={fecharMenu}>
            <img src="/menu.png" alt="QOLOP" className="menu-logo-image" />
          </NavLink>
        </div>

        <div className="menu-center-wrap">
          <button
            type="button"
            className="menu-toggle menu-arrow-button"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
            onClick={alternarMenu}
          >
            {menuAberto ? <FiArrowLeft /> : <FiArrowRight />}
            <span>{menuAberto ? "Fechar" : "Menu"}</span>
          </button>

          <nav
            id="menu-principal"
            className={`menu-center ${menuAberto ? "open" : ""}`}
            aria-label="Navegação principal"
          >
            <motion.div {...itemMotion}>
              <NavLink to="/inicio" className="menu-link" onClick={fecharMenu}>
                Início
              </NavLink>
            </motion.div>

            <motion.div {...itemMotion}>
              <NavLink to="/ambientes" className="menu-link" onClick={fecharMenu}>
                Ambientes
              </NavLink>
            </motion.div>

            {user && (
              <motion.div {...itemMotion}>
                <NavLink to="/explorer" className="menu-link" onClick={fecharMenu}>
                  Explorar
                </NavLink>
              </motion.div>
            )}

            {canAccessPedidos && (
              <motion.div {...itemMotion}>
                <NavLink to="/pedidos" className="menu-link" onClick={fecharMenu}>
                  Pedidos
                </NavLink>
              </motion.div>
            )}

            {isAdmin && (
              <motion.div {...itemMotion}>
                <NavLink to="/criar-tour" className="menu-link" onClick={fecharMenu}>
                  Gerar Ambiente
                </NavLink>
              </motion.div>
            )}

            {canAccessPedidos && user && (
              <motion.div {...itemMotion}>
                <NavLink to={`/historico/${user.id}`} className="menu-link" onClick={fecharMenu}>
                  Histórico
                </NavLink>
              </motion.div>
            )}

            {canAccessAnalytics && (
              <motion.div {...itemMotion}>
                <NavLink to="/analytics" className="menu-link" onClick={fecharMenu}>
                  Analytics
                </NavLink>
              </motion.div>
            )}

            {user && (
              <motion.div {...itemMotion}>
                <NavLink to="/perfil" className="menu-link" onClick={fecharMenu}>
                  Perfil
                </NavLink>
              </motion.div>
            )}

            {isAdmin && (
              <motion.div {...itemMotion}>
                <NavLink to="/usuarios" className="menu-link" onClick={fecharMenu}>
                  Usuários
                </NavLink>
              </motion.div>
            )}
          </nav>
        </div>

        <div className="menu-side menu-side-right">
          <div className="menu-right">
            {user && (
              <>
                <motion.a
                  href={CONTACT_URL}
                  className="menu-contact-link menu-arrow-button"
                  aria-label={`Entrar em contato por email: ${CONTACT_EMAIL}`}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 24,
                    mass: 0.7,
                  }}
                >
                  <FiMail />
                  <span>Contato</span>
                </motion.a>

                <motion.button
                  className="menu-btn menu-arrow-button"
                  onClick={sair}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 24,
                    mass: 0.7,
                  }}
                >
                  Sair
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>

      <aside className={`menu-mobile-drawer ${menuAberto ? "open" : ""}`} aria-hidden={!menuAberto}>
        <div className="menu-mobile-drawer-panel">
          <div className="menu-mobile-drawer-header">
            <span className="menu-mobile-drawer-title">Menu</span>
            <button
              type="button"
              className="menu-mobile-close"
              onClick={fecharMenu}
              aria-label="Fechar menu"
            >
              <FiX />
            </button>
          </div>

          <nav className="menu-mobile-nav" aria-label="Navegação mobile">
            <NavLink to="/inicio" className="menu-mobile-link" onClick={fecharMenu}>
              Início
            </NavLink>
            <NavLink to="/ambientes" className="menu-mobile-link" onClick={fecharMenu}>
              Ambientes
            </NavLink>
            {user && (
              <NavLink to="/explorer" className="menu-mobile-link" onClick={fecharMenu}>
                Explorar
              </NavLink>
            )}
            {canAccessPedidos && (
              <NavLink to="/pedidos" className="menu-mobile-link" onClick={fecharMenu}>
                Pedidos
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/criar-tour" className="menu-mobile-link" onClick={fecharMenu}>
                Gerar Ambiente
              </NavLink>
            )}
            {canAccessPedidos && user && (
              <NavLink
                to={`/historico/${user.id}`}
                className="menu-mobile-link"
                onClick={fecharMenu}
              >
                Histórico
              </NavLink>
            )}
            {canAccessAnalytics && (
              <NavLink to="/analytics" className="menu-mobile-link" onClick={fecharMenu}>
                Analytics
              </NavLink>
            )}
            {user && (
              <NavLink to="/perfil" className="menu-mobile-link" onClick={fecharMenu}>
                Perfil
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/usuarios" className="menu-mobile-link" onClick={fecharMenu}>
                Usuários
              </NavLink>
            )}
          </nav>

          <div className="menu-mobile-actions">
            <motion.a
              href={CONTACT_URL}
              className="menu-mobile-action menu-mobile-action-contact menu-arrow-button"
              aria-label={`Entrar em contato por email: ${CONTACT_EMAIL}`}
              target="_blank"
              rel="noreferrer"
              whileTap={{ scale: 0.97 }}
            >
              <FiMail />
              <span>Contato</span>
            </motion.a>

            {user && (
              <motion.button
                className="menu-mobile-action menu-mobile-action-logout menu-arrow-button"
                onClick={sair}
                whileTap={{ scale: 0.97 }}
              >
                Sair
              </motion.button>
            )}
          </div>
        </div>
      </aside>
    </motion.header>
  );
}
