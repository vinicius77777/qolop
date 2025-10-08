// src/pages/ambientes.tsx
import React, { useEffect, useState } from "react";
import {
  getAmbientes,
  createAmbiente,
  updateAmbiente,
  deleteAmbiente,
  getMe,
  Usuario,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import { createParticles } from "../animations/global";
import "../styles/global.css";

interface Ambiente {
  id: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  imagemPreview?: string;
}

const Ambientes: React.FC = () => {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [linkVR, setLinkVR] = useState("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Ambiente | null>(null);
  const [editId, setEditId] = useState<number | null>(null); // id do ambiente em edição
  const navigate = useNavigate();

  useEffect(() => {
    createParticles("particle-container");
  }, []);

  const carregar = async () => {
    try {
      setLoading(true);
      const user = await getMe();
      setUsuario(user);
      const data = await getAmbientes();
      setAmbientes(data);
      setError("");
    } catch {
      setError("Erro ao carregar ambientes ou usuário não autenticado.");
      setTimeout(() => navigate("/login"), 1500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagemFile(file);
      setImagemPreview(URL.createObjectURL(file));
    }
  };

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!titulo || !descricao || !linkVR) return;

      let imagemPreviewUrl: string | undefined = undefined;
      if (imagemFile) {
        imagemPreviewUrl = imagemPreview || undefined;
      }

      await createAmbiente(titulo, descricao, linkVR, imagemPreviewUrl);
      setTitulo("");
      setDescricao("");
      setLinkVR("");
      setImagemFile(null);
      setImagemPreview(null);
      carregar();
    } catch (err: any) {
      setError(err.message || "Erro ao criar ambiente");
    }
  };

  const handleExcluir = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      await deleteAmbiente(id);
      carregar();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir ambiente");
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="inicio-page">
      <div id="particle-container"></div>

      {/* Menu lateral */}
      <div className={`menu ${menuOpen ? "open" : ""}`}>
        <div className="menu-inner">
          <div className="menu-cards">
            <div className="menu-card inicio" onClick={() => { setMenuOpen(false); navigate("/inicio"); }}>
              <img src="/images/inicio.png" alt="Início" className="card-img" />
              <span className="card-label">Início</span>
            </div>
            <div className="menu-card perfil" onClick={() => { setMenuOpen(false); navigate("/perfil"); }}>
              <img src="/images/perfil.png" alt="Perfil" className="card-img" />
              <span className="card-label">Perfil</span>
            </div>
            <div className="menu-card ambientes" onClick={() => { setMenuOpen(false); navigate("/ambientes"); }}>
              <img src="/images/ambientes.png" alt="Ambientes" className="card-img" />
              <span className="card-label">Ambientes</span>
            </div>
            <div className="menu-card pedidos" onClick={() => { setMenuOpen(false); navigate("/pedidos"); }}>
              <img src="/images/pedidos.png" alt="Pedidos" className="card-img" />
              <span className="card-label">Pedidos</span>
            </div>
            {usuario?.role === "admin" && (
              <div className="menu-card usuarios" onClick={() => { setMenuOpen(false); navigate("/usuarios"); }}>
                <img src="/images/usuarios.png" alt="Usuários" className="card-img" />
                <span className="card-label">Usuários</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); navigate("/login"); }}>Logout</button>
        </div>
      </div>

      <div className={`menu-icon ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen((s) => !s)}>
        <div></div><div></div><div></div>
      </div>

      {/* === CONTEÚDO === */}
      {!selected ? (
        <div className="inicio-content ambientes-content">
          <div className="pedidos-form-container">
            <h1 className="pedidos-title">Ambientes Virtuais</h1>

            {usuario?.role === "admin" && (
              <form onSubmit={handleCriar} className="pedidos-form">
                <input type="text" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="input-field" />
                <input type="text" placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="input-field" />
                <input type="text" placeholder="Link VR" value={linkVR} onChange={(e) => setLinkVR(e.target.value)} required className="input-field" />
                <input type="file" accept="image/*" onChange={handleImagemChange} className="input-field" />
                {imagemPreview && <img src={imagemPreview} alt="Preview" className="rounded-md mt-2 max-h-48 object-cover" />}
                <button type="submit" className="submit-btn">Criar Ambiente</button>
              </form>
            )}

            <div className="ambientes-list">
              {ambientes.map((amb) => (
                <div
                  key={amb.id}
                  className="pedido-card fade-in"
                  style={{ maxWidth: "800px", position: "relative", paddingTop: "50px", paddingBottom: "15px" }}
                >
                  {usuario?.role === "admin" && (
                    <div className="admin-buttons">
                      <button onClick={() => handleExcluir(amb.id)} className="delete-btn" title="Excluir ambiente">×</button>
                      <button onClick={() => setEditId(amb.id)} className="edit-btn" title="Editar ambiente">Editar</button>
                    </div>
                  )}

                  {amb.imagemPreview && (
                    <img src={amb.imagemPreview} alt={amb.titulo} className="ambiente-img" />
                  )}

                  <h3>{amb.titulo}</h3>
                  <p className="text-gray-400 italic">{amb.descricao.slice(0, 100)}</p>
                  <p className="text-gray-500 text-sm mt-2">Clique para explorar o ambiente</p>

                  {/* Formulário inline para edição */}
                  {editId === amb.id && usuario?.role === "admin" && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await updateAmbiente(
                          amb.id,
                          amb.titulo,
                          amb.descricao,
                          amb.linkVR,
                          amb.imagemPreview
                        );
                        setEditId(null);
                        carregar();
                      }}
                      className="flex flex-col gap-2 mt-2"
                    >
                      <input
                        type="text"
                        value={amb.titulo}
                        onChange={(e) => amb.titulo = e.target.value}
                        className="input-field"
                        placeholder="Título"
                      />
                      <input
                        type="text"
                        value={amb.descricao}
                        onChange={(e) => amb.descricao = e.target.value}
                        className="input-field"
                        placeholder="Descrição"
                      />
                      <input
                        type="text"
                        value={amb.linkVR}
                        onChange={(e) => amb.linkVR = e.target.value}
                        className="input-field"
                        placeholder="Link VR"
                      />
                      <div className="flex gap-2 edit-buttons">
                        <button type="submit">Salvar</button>
                        <button type="button" onClick={() => setEditId(null)}>Cancelar</button>
                      </div>

                    </form>
                  )}

                  {/* Explorar VR só aparece se não estiver editando */}
                  {editId !== amb.id && <button onClick={() => setSelected(amb)} className="submit-btn mt-2">Explorar VR</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="ambiente-fullscreen"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#000",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
          }}
        >
          <div className="ambiente-view">
            <iframe
              src={selected.linkVR}
              allow="autoplay; fullscreen; xr-spatial-tracking; camera *; microphone *"
              allowFullScreen
              loading="eager"
              title={selected.titulo}
              className="ambiente-iframe"
            ></iframe>
            <button className="voltar-btn" onClick={() => setSelected(null)}>Voltar</button>
          </div>         
        </div>
      )}
    </div>
  );
};

export default Ambientes;
