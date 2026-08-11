// src/App.tsx

import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Variants, useReducedMotion } from "framer-motion";
import "./animations.css";
import ProtectedRoute from "./components/protectedroute";
import Menu from "./components/menu";
import "leaflet/dist/leaflet.css";
// páginas
import Login from "./pages/login";
import Register from "./pages/register";
import ResetPassword from "./pages/resetPassword";
import Tour from "./pages/tour";
import Empresa from "./pages/empresa";
import ListaEmpresas from "./pages/listaEmpresas";

const Inicio = lazy(() => import("./pages/inicio"));
const Perfil = lazy(() => import("./pages/perfil"));
const Ambientes = lazy(() => import("./pages/ambientes"));
const Pedidos = lazy(() => import("./pages/pedidos"));
const Usuarios = lazy(() => import("./pages/usuarios"));
const Historico = lazy(() => import("./pages/historico"));
const HistoricoPublico = lazy(() => import("./pages/HistoricoPublico"));
const Explorer = lazy(() => import("./pages/explorer"));
const DivulgarEspaco = lazy(() => import("./pages/divulgarEspaco"));
const CriarTour = lazy(() => import("./pages/criarTour"));
const Analytics = lazy(() => import("./pages/analytics"));

function RouteLoadingScreen() {
  return (
    <motion.div
      className="route-loading-overlay"
      aria-hidden="true"
      initial={{ opacity: 0, clipPath: "inset(0 0 0 100%)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0 0%)" }}
      exit={{ opacity: 0, clipPath: "inset(0 100% 0 0%)" }}
      transition={{
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
    >
      <div className="route-loading-sweep" />
      <div className="route-loading-orbit route-loading-orbit--one" />
      <div className="route-loading-orbit route-loading-orbit--two" />
      <div className="route-loading-card">
        <span className="route-loading-badge">Qolop</span>
        <div className="route-loading-wave">
          <span />
          <span />
          <span />
        </div>
      </div>
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [transitionKey, setTransitionKey] = useState(location.pathname);

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

  useEffect(() => {
    if (location.pathname === transitionKey) {
      setIsRouteTransitioning(false);
      return;
    }

    setIsRouteTransitioning(true);
    setTransitionKey(location.pathname);

    const timer = window.setTimeout(() => {
      setIsRouteTransitioning(false);
    }, shouldReduceMotion ? 260 : 1120);

    return () => window.clearTimeout(timer);
  }, [location.pathname, shouldReduceMotion, transitionKey]);

  // rotas onde NÃO deve aparecer o menu
  const rotasSemMenu = ["/login", "/register", "/reset-password"];

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

      <AnimatePresence mode="sync" initial={false}>
        <motion.main
          key={location.pathname}
          className="route-transition-layer route-transition-shell water-route-transition"
          variants={routeTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {isRouteTransitioning && <RouteLoadingScreen />}
          <Suspense fallback={<RouteLoadingScreen />}>
            <Routes location={location}>
              {/* =====================
                  ROTAS PÚBLICAS
              ===================== */}
              <Route path="/" element={<Navigate to="/inicio" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* tour público */}
              <Route path="/tour/:id" element={<Tour />} />

              {/* histórico público */}
              <Route path="/historico-publico/:usuarioId" element={<HistoricoPublico />} />

              <Route path="/empresa/:slug" element={<Empresa />} />

              {/* lista pública de empresas que possuem ambientes */}
              <Route path="/empresas" element={<ListaEmpresas />} />

              {/* =====================
                  ROTAS PRIVADAS
              ===================== */}
              <Route path="/inicio" element={<Inicio />} />

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
                path="/divulgar-espaco"
                element={
                  <ProtectedRoute requiresEmpresa>
                    <DivulgarEspaco />
                  </ProtectedRoute>
                }
              />

              <Route path="/ambientes" element={<Ambientes />} />

              <Route
                path="/criarTour"
                element={
                  <ProtectedRoute onlyAdmin>
                    <CriarTour />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pedidos"
                element={
                  <ProtectedRoute>
                    <Pedidos />
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
