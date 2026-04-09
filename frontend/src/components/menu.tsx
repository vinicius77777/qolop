// src/components/menu.tsx

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiMail } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
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

  const isAdmin = user?.role === "admin";
  const isEmpresa = user?.role === "empresa";
  const canAccessPedidos = isAdmin || isEmpresa;
  const canAccessAnalytics = isAdmin || isEmpresa;
  const fecharMenu = () => setMenuAberto(false);

  return (
    <motion.header
      className="menu"
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
          <nav className={`menu-center ${menuAberto ? "open" : ""}`} aria-label="Navegação principal">
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
                  className="menu-contact-link"
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
                  className="menu-btn"
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
    </motion.header>
  );
}