import React, { useEffect, useState } from "react";
import {
  getPedidos,
  createPedido,
  updatePedido,
  deletePedido,
} from "../services/api";

interface Pedido {
  id: number;
  empresa: string;
  email: string;
  telefone?: string;
  mensagem: string;
  status: string;
  criado_em: string;
}

const getUsuario = () => {
  const raw = localStorage.getItem("usuario");
  return raw ? JSON.parse(raw) : null;
};

const Pedidos: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const usuario = getUsuario();

  const carregar = async () => {
    try {
      setLoading(true);
      const data = await getPedidos();
      setPedidos(data);
      setError("");
    } catch (err: any) {
      setError("Erro ao carregar pedidos");
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
      await createPedido(empresa, email, telefone, mensagem);
      setEmpresa("");
      setEmail("");
      setTelefone("");
      setMensagem("");
      carregar();
    } catch (err: any) {
      setError(err.message || "Erro ao criar pedido");
    }
  };

  const handleStatus = async (id: number) => {
    const novoStatus = prompt(
      "Novo status (pendente, em_andamento, concluído):"
    );
    if (!novoStatus) return;
    try {
      await updatePedido(id, novoStatus);
      carregar();
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar status");
    }
  };

  const handleExcluir = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      await deletePedido(id);
      carregar();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir pedido");
    }
  };

  if (loading) return <p className="text-center mt-6">Carregando...</p>;
  if (error) return <p className="text-red-500 text-center mt-6">{error}</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">📦 Pedidos</h1>

      {/* form de criação */}
      <form
        onSubmit={handleCriar}
        className="mb-6 p-4 bg-white rounded-lg shadow space-y-3"
      >
        <h3 className="text-lg font-semibold">Criar novo pedido</h3>
        <input
          type="text"
          placeholder="Empresa"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <textarea
          placeholder="Mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Enviar Pedido
        </button>
      </form>

      <ul className="space-y-6">
        {pedidos.map((p) => (
          <li
            key={p.id}
            className="p-4 border rounded-lg shadow bg-white space-y-2"
          >
            <h3 className="text-xl font-semibold">{p.empresa}</h3>
            <p>
              <strong>Email:</strong> {p.email}
            </p>
            {p.telefone && (
              <p>
                <strong>Telefone:</strong> {p.telefone}
              </p>
            )}
            <p>
              <strong>Mensagem:</strong> {p.mensagem}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded text-white ${
                  p.status === "concluído"
                    ? "bg-green-600"
                    : p.status === "em_andamento"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }`}
              >
                {p.status}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Enviado em: {new Date(p.criado_em).toLocaleString()}
            </p>

            {usuario?.role === "admin" && (
              <div className="mt-3 space-x-2">
                <button
                  onClick={() => handleStatus(p.id)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Alterar Status
                </button>
                <button
                  onClick={() => handleExcluir(p.id)}
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

export default Pedidos;
