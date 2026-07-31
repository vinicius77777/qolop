import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  Ambiente,
  Pedido,
  Usuario,
  getAmbientes,
  getAmbientesPublicos,
  getHistoricoPedidos,
  getHistoricoPedidosPublico,
  getMe,
} from "../services/api";

export type HistoricoTab = "pedidos" | "ambientes";

export type UseHistoricoOptions = {
  publico?: boolean;
};

export type UseHistoricoResult = {
  pedidos: Pedido[];
  ambientes: Ambiente[];
  loading: boolean;
  error: string;
  activeTab: HistoricoTab;
  selectedAmbiente: Ambiente | null;
  vrLoading: boolean;
  usuarioLogado: Usuario | null;
  setActiveTab: Dispatch<SetStateAction<HistoricoTab>>;
  setSelectedAmbiente: Dispatch<SetStateAction<Ambiente | null>>;
  setVrLoading: Dispatch<SetStateAction<boolean>>;
  refreshHistorico: () => Promise<void>;
};

function isUsuarioPermitido(usuarioLogado: Usuario, usuarioId?: string) {
  if (!usuarioId) {
    return true;
  }

  const usuarioIdString = usuarioLogado.id.toString();
  const emailUsuario = usuarioLogado.email.toLowerCase();
  const usuarioIdNormalizado = usuarioId.trim().toLowerCase();

  return (
    usuarioIdString === usuarioIdNormalizado || emailUsuario === usuarioIdNormalizado
  );
}

export function useHistorico(
  usuarioId?: string,
  options: UseHistoricoOptions = {}
): UseHistoricoResult {
  const { publico = false } = options;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<HistoricoTab>("pedidos");
  const [selectedAmbiente, setSelectedAmbiente] = useState<Ambiente | null>(null);
  const [vrLoading, setVrLoading] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);

  const carregarHistorico = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (publico) {
        const [pedidosPublicos, ambientesPublicos] = await Promise.all([
          getHistoricoPedidosPublico(usuarioId || ""),
          getAmbientesPublicos(),
        ]);

        const pedidosFiltrados = pedidosPublicos.filter((pedido) => {
          const emailPedido = pedido.email?.toLowerCase();
          const usuarioChave = usuarioId?.trim().toLowerCase() || "";
          return emailPedido === usuarioChave;
        });

        const ambientesFiltrados = ambientesPublicos.filter((ambiente) => {
          const usuarioAmbienteId = ambiente.usuario?.id?.toString();
          const usuarioAmbienteEmail = ambiente.usuario?.email?.toLowerCase();
          const usuarioChave = usuarioId?.trim().toLowerCase() || "";

          return usuarioAmbienteId === usuarioChave || usuarioAmbienteEmail === usuarioChave;
        });

        setPedidos(pedidosFiltrados);
        setAmbientes(ambientesFiltrados);
        setUsuarioLogado(null);
        return;
      }

      const userLogado = await getMe();

      if (userLogado.role === "empresa") {
        setPedidos([]);
        setAmbientes([]);
        setUsuarioLogado(userLogado);
        setError("Acesso negado para empresas.");
        return;
      }

      if (!isUsuarioPermitido(userLogado, usuarioId)) {
        setPedidos([]);
        setAmbientes([]);
        setUsuarioLogado(userLogado);
        setError("Acesso negado.");
        return;
      }

      const [pedidosDoHistorico, ambientesDoHistorico] = await Promise.all([
        getHistoricoPedidos(usuarioId || userLogado.id.toString()),
        getAmbientes(userLogado),
      ]);

      const ambientesFiltrados = ambientesDoHistorico.filter((ambiente) => {
        const ambienteUsuarioId = ambiente.usuario?.id?.toString();
        const ambienteUsuarioEmail = ambiente.usuario?.email?.toLowerCase();
        const usuarioChave = usuarioId?.trim().toLowerCase() || userLogado.id.toString();

        return (
          ambienteUsuarioId === usuarioChave || ambienteUsuarioEmail === usuarioChave
        );
      });

      setPedidos(pedidosDoHistorico);
      setAmbientes(ambientesFiltrados);
      setUsuarioLogado(userLogado);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      setPedidos([]);
      setAmbientes([]);
      setError("Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [publico, usuarioId]);

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  return {
    pedidos,
    ambientes,
    loading,
    error,
    activeTab,
    selectedAmbiente,
    vrLoading,
    usuarioLogado,
    setActiveTab,
    setSelectedAmbiente,
    setVrLoading,
    refreshHistorico: carregarHistorico,
  };
}

export default useHistorico;
