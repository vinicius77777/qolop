import React, { useEffect, useState } from "react";
import {
  getAmbientes,
  createAmbiente,
  updateAmbiente,
  deleteAmbiente,
} from "../services/api";

interface Ambiente {
  id: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  imagemPreview?: string;
}

const getUsuario = () => {
  const raw = localStorage.getItem("usuario");
  return raw ? JSON.parse(raw) : null;
};

const Ambientes: React.FC = () => {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [linkVR, setLinkVR] = useState("");
  const [imagemPreview, setImagemPreview] = useState("");
  const usuario = getUsuario();

  const carregar = async () => {
    try {
      setLoading(true);
      const data = await getAmbientes();
      setAmbientes(data);
      setError("");
    } catch (err: any) {
      setError("Erro ao carregar ambientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAmbiente(titulo, descricao, linkVR, imagemPreview);
      setTitulo("");
      setDescricao("");
      setLinkVR("");
      setImagemPreview("");
      carregar();
    } catch (err: any) {
      setError(err.message || "Erro ao criar ambiente");
    }
  };

  const handleEditar = async (amb: Ambiente) => {
    const novoTitulo = prompt("Novo título:", amb.titulo) || amb.titulo;
    const novaDescricao = prompt("Nova descrição:", amb.descricao) || amb.descricao;
    const novoLink = prompt("Novo link VR:", amb.linkVR) || amb.linkVR;
    const novaImg = prompt("Nova imagem preview (URL):", amb.imagemPreview || "") || amb.imagemPreview;

    try {
      await updateAmbiente(
        amb.id,
        novoTitulo,
        novaDescricao,
        novoLink,
        novaImg || undefined
      );
      carregar();
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar ambiente");
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

  if (loading) return <p className="text-center mt-6">Carregando...</p>;
  if (error) return <p className="text-red-500 text-center mt-6">{error}</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">🌍 Ambientes</h1>

      {/* form só aparece se for admin */}
      {usuario?.role === "admin" && (
        <form
          onSubmit={handleCriar}
          className="mb-6 p-4 bg-white rounded-lg shadow space-y-3"
        >
          <h3 className="text-lg font-semibold">Criar novo ambiente</h3>
          <input
            type="text"
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Link VR"
            value={linkVR}
            onChange={(e) => setLinkVR(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Imagem Preview (URL)"
            value={imagemPreview}
            onChange={(e) => setImagemPreview(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Criar
          </button>
        </form>
      )}

      <ul className="space-y-6">
        {ambientes.map((amb) => (
          <li key={amb.id} className="p-4 border rounded-lg shadow bg-white">
            <h3 className="text-xl font-semibold">{amb.titulo}</h3>
            <p className="text-gray-600">{amb.descricao}</p>
            <a
              href={amb.linkVR}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 underline"
            >
              Acessar VR
            </a>
            {amb.imagemPreview ? (
              <div className="mt-2">
                <img
                  src={amb.imagemPreview}
                  alt={amb.titulo}
                  width={200}
                  className="rounded-lg shadow"
                />
              </div>
            ) : (
              <p className="text-gray-400 mt-2">Sem preview disponível</p>
            )}

            {usuario?.role === "admin" && (
              <div className="mt-3 space-x-2">
                <button
                  onClick={() => handleEditar(amb)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleExcluir(amb.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Ambientes;
