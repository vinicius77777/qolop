// src/App.tsx

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Variants, useReducedMotion } from "framer-motion";
import "./animations.css";
import ProtectedRoute from "./components/protectedroute";
import Menu from "./components/menu";
import "leaflet/dist/leaflet.css";
// páginas
import Login from "./pages/login";
import Register from "./pages/register";
import Welcome from "./pages/welcome";
import Tour from "./pages/tour";
import Empresa from "./pages/empresa";

const Inicio = lazy(() => import("./pages/inicio"));
const Perfil = lazy(() => import("./pages/perfil"));
const Ambientes = lazy(() => import("./pages/ambientes"));
const Pedidos = lazy(() => import("./pages/pedidos"));
const Usuarios = lazy(() => import("./pages/usuarios"));
const Historico = lazy(() => import("./pages/historico"));
const HistoricoPublico = lazy(() => import("./pages/HistoricoPublico"));
const Explorer = lazy(() => import("./pages/explorer"));
const CriarTour = lazy(() => import("./pages/criarTour"));
const Analytics = lazy(() => import("./pages/analytics"));

function AppContent() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const routeTransition: Variants = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            duration: 0.18,
            ease: "easeOut",
          },
        },
        exit: {
          opacity: 0,
          transition: {
            duration: 0.12,
            ease: "easeIn",
          },
        },
      }
    : {
        initial: {
          opacity: 0,
          y: 22,
          scale: 0.992,
          filter: "blur(10px) saturate(1.04)",
          transformOrigin: "50% 18%",
        },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px) saturate(1)",
          transition: {
            duration: 0.62,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        },
        exit: {
          opacity: 0,
          y: -18,
          scale: 1.008,
          filter: "blur(8px) saturate(1.05)",
          transition: {
            duration: 0.3,
            ease: [0.4, 0, 1, 1] as const,
          },
        },
      };

  // rotas onde NÃO deve aparecer o menu
  const rotasSemMenu = ["/", "/login", "/register"];

  // mostrar menu em todas as rotas, exceto tours públicos
  const mostrarMenu =
    !rotasSemMenu.includes(location.pathname) &&
    !location.pathname.startsWith("/tour");

  return (
    <div className={`app-shell ${mostrarMenu ? "with-menu" : ""}`}>
      <div className="app-shell-background" aria-hidden="true">
        <span className="app-shell-orb app-shell-orb--one" />
        <span className="app-shell-orb app-shell-orb--two" />
        <span className="app-shell-orb app-shell-orb--three" />
        <span className="app-shell-grid" />
        <span className="app-shell-noise" />
      </div>

      {mostrarMenu && <Menu />}

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          className="route-transition-layer route-transition-shell water-route-transition"
          variants={routeTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Suspense fallback={<div className="pedidos-loading">Carregando página...</div>}>
            <Routes location={location}>
              {/* =====================
                  ROTAS PÚBLICAS
              ===================== */}
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* tour público */}
              <Route path="/tour/:id" element={<Tour />} />

              {/* histórico público */}
              <Route path="/historico-publico/:usuarioId" element={<HistoricoPublico />} />

              <Route path="/empresa/:slug" element={<Empresa />} />

              {/* =====================
                  ROTAS PRIVADAS
              ===================== */}
              <Route
                path="/inicio"
                element={
                  <ProtectedRoute>
                    <Inicio />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                }
              />

              <Route path="/explorer" element={<Explorer />} />

              <Route
                path="/ambientes"
                element={
                  <ProtectedRoute>
                    <Ambientes />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pedidos"
                element={
                  <ProtectedRoute onlyEmpresa>
                    <Pedidos />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/criar-tour"
                element={
                  <ProtectedRoute onlyAdmin>
                    <CriarTour />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/criarTour"
                element={
                  <ProtectedRoute onlyAdmin>
                    <CriarTour />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute onlyEmpresa>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/historico/:usuarioId"
                element={
                  <ProtectedRoute>
                    <Historico />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute onlyAdmin>
                    <Usuarios />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
