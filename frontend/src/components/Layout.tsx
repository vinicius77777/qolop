// src/components/Layout.tsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  }

  return (
    <div className="app-layout">
      <nav className="menu">
        <ul>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/perfil">Perfil</Link></li>
          <li><Link to="/ambientes">Ambientes</Link></li>
          <li><Link to="/pedidos">Pedidos</Link></li>
          {/* só admin vê esse menu */}
          {usuario?.role === "admin" && (
            <li><Link to="/usuarios">Usuários</Link></li>
          )}
          <li><button onClick={handleLogout}>Sair</button></li>
        </ul>
      </nav>
      <main className="content">{children}</main>
    </div>
  );
};

export default Layout;
