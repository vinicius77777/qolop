import React from "react";
import { useNavigate } from "react-router-dom";

const Menu: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  return (
    <nav>
      <button onClick={() => navigate("/")}>Dashboard</button>
      <button onClick={() => navigate("/perfil")}>Perfil</button>
      <button onClick={() => navigate("/ambientes")}>Ambientes</button>
      <button onClick={() => navigate("/pedidos")}>Pedidos</button>
      <button onClick={handleLogout}>Sair</button>
    </nav>
  );
};

export default Menu;
