// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/protectedroute";

// páginas
import Inicio from "./pages/inicio";
import Dashboard from "./pages/dashboard";
import Perfil from "./pages/perfil";
import Ambientes from "./pages/ambientes";
import Pedidos from "./pages/pedidos";
import Login from "./pages/login";
import Register from "./pages/register";
import Welcome from "./pages/welcome";

function App() {
  return (
    <Router>
      <Routes>
        {/* públicas */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* privadas */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <Layout>
                <Inicio />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Layout>
                <Perfil />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ambientes"
          element={
            <ProtectedRoute>
              <Layout>
                <Ambientes />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedidos"
          element={
            <ProtectedRoute>
              <Layout>
                <Pedidos />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
