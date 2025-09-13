import React, { useEffect, useState } from "react";
import { getMe, Usuario } from "../services/api"; // ⬅️ importa a interface daqui
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setUsuario(data);
      } catch (err: any) {
        setError("Você precisa estar logado.");
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="dashboard">
      <h1>Bem-vindo(a), {usuario?.nome}</h1>
      <p><strong>E-mail:</strong> {usuario?.email}</p>
      
      {usuario?.criado_em && (
        <p>
          <strong>Conta criada em:</strong>{" "}
          {new Date(usuario.criado_em).toLocaleDateString()}
        </p>
      )}

      {usuario?.foto && (
        <div>
          <img src={usuario.foto} alt="Foto de perfil" width={120} />
        </div>
      )}

      <hr />
      <div>
        <button onClick={() => navigate("/perfil")}>Editar Perfil</button>
        <button onClick={() => navigate("/ambientes")}>Ambientes</button>
        <button onClick={() => navigate("/pedidos")}>Pedidos</button>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
