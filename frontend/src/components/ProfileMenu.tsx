import { useState } from "react";

const ProfileMenu = () => {
  const [show, setShow] = useState(false);

  return (
    <div className="profile-container">
      <div
        className="profile-icon"
        onClick={() => setShow(!show)}
      >
        <img src="/img/profile.png" alt="Perfil" />
      </div>
      <div className={`profile-options ${show ? "show" : ""}`}>
        <a href="#perfil">Meu Perfil</a>
        <a href="#sair">Sair</a>
      </div>
    </div>
  );
};

export default ProfileMenu;
