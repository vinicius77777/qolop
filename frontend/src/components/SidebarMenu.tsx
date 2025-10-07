import { useState } from "react";

const SidebarMenu = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={`menu ${open ? "open" : ""}`}
      >
        <a href="#inicio"><img src="/img/inicio.png" alt="Início" /></a>
        <a href="#ambientes"><img src="/img/ambientes.png" alt="Ambientes" /></a>
        <a href="#pedidos"><img src="/img/pedidos.png" alt="Pedidos" /></a>
      </div>

      <div
        className={`menu-icon ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <div></div>
        <div></div>
        <div></div>
      </div>
    </>
  );
};

export default SidebarMenu;
