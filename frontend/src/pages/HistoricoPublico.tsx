import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import {
  Pedido,
  getHistoricoPedidosPublico,
  getAmbientesPublicos,
  Ambiente,
  PagamentoStatus,
} from "../services/api";
import "../styles/historico.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function normalizePagamentoStatus(
  pagamentoStatus?: PagamentoStatus,
  pago?: boolean
): PagamentoStatus {
  if (pagamentoStatus === "pago" || pagamentoStatus === "pago_a_mais") {
    return pagamentoStatus;
  }
  if (pagamentoStatus === "nao_pago") {
    return "nao_pago";
  }
  return pago ? "pago" : "nao_pago";
}

function getPagamentoLabel(
  pagamentoStatus?: PagamentoStatus,
  pago?: boolean
) {
  const normalized = normalizePagamentoStatus(pagamentoStatus, pago);

  if (normalized === "pago_a_mais") return "Pago a mais";
  if (normalized === "pago") return "Pago";
  return "Não pago";
}

function getPagamentoBadgeClass(
  pagamentoStatus?: PagamentoStatus,
  pago?: boolean
) {
  const normalized = normalizePagamentoStatus(pagamentoStatus, pago);

  if (normalized === "pago_a_mais") return "payment-badge payment-badge--overpaid";
  if (normalized === "pago") return "payment-badge payment-badge--paid";
  return "payment-badge payment-badge--unpaid";
}

const HistoricoPublico: React.FC = () => {
  const { usuarioId } = useParams<{ usuarioId: string }>();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pedidos" | "ambientes">("pedidos");
  const [selectedAmbiente, setSelectedAmbiente] = useState<Ambiente | null>(null);
  const [vrLoading, setVrLoading] = useState(true);

  useEffect(() => {
    const carregarHistorico = async () => {
      setLoading(true);

      try {
        const pedidosFiltrados = await getHistoricoPedidosPublico(usuarioId || "");
        const allAmbientes = await getAmbientesPublicos();

        const ambientesFiltrados = allAmbientes.filter(
          (a) => a.usuario?.id?.toString() === usuarioId
        );

        setPedidos(pedidosFiltrados);
        setAmbientes(ambientesFiltrados);
      } catch (err) {
        console.error("Erro ao carregar histórico público:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarHistorico();
  }, [usuarioId]);

  const pedidosOrdenados = useMemo(() => {
    return [...pedidos].sort((a, b) => {
      const aOverpaid =
        normalizePagamentoStatus(a.pagamentoStatus, a.pago) === "pago_a_mais" ? 1 : 0;
      const bOverpaid =
        normalizePagamentoStatus(b.pagamentoStatus, b.pago) === "pago_a_mais" ? 1 : 0;

      if (aOverpaid !== bOverpaid) {
        return bOverpaid - aOverpaid;
      }

      return (
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    });
  }, [pedidos]);

  const ambientesOrdenados = useMemo(() => {
    return [...ambientes].sort((a, b) => {
      const aOverpaid = a.pedido?.pagamentoStatus === "pago_a_mais" ? 1 : 0;
      const bOverpaid = b.pedido?.pagamentoStatus === "pago_a_mais" ? 1 : 0;

      if (aOverpaid !== bOverpaid) {
        return bOverpaid - aOverpaid;
      }

      return b.id - a.id;
    });
  }, [ambientes]);

  if (loading) {
    return <p className="historico-loading">Carregando histórico público...</p>;
  }

  return (
    <div className="amb-page">
      <div className="amb-wrapper">
        <h1 className="historico-title">Histórico Público</h1>

        <div className="historico-tabs">
          <button
            className={`historico-tab ${activeTab === "pedidos" ? "active" : ""}`}
            onClick={() => setActiveTab("pedidos")}
          >
            Pedidos
          </button>

          <button
            className={`historico-tab ${activeTab === "ambientes" ? "active" : ""}`}
            onClick={() => setActiveTab("ambientes")}
          >
            Ambientes
          </button>
        </div>

        {activeTab === "pedidos" && (
          <div className="amb-grid">
            {pedidosOrdenados.length === 0 && (
              <p className="historico-empty">Não há pedidos.</p>
            )}

            {pedidosOrdenados.map((p) => {
              const pagamentoAtual = normalizePagamentoStatus(
                p.pagamentoStatus,
                p.pago
              );

              return (
                <div
                  key={p.id}
                  className={`amb-card ${
                    pagamentoAtual === "pago_a_mais" ? "historico-card--overpaid" : ""
                  }`}
                >
                  <div className="historico-card-header">
                    <h3>{p.empresa?.nome || "Pedido"}</h3>
                    <span className={getPagamentoBadgeClass(p.pagamentoStatus, p.pago)}>
                      {getPagamentoLabel(p.pagamentoStatus, p.pago)}
                    </span>
                  </div>

                  <p>
                    <strong>Email:</strong> {p.email}
                  </p>

                  {p.telefone && (
                    <p>
                      <strong>Telefone:</strong> {p.telefone}
                    </p>
                  )}

                  <p>
                    <strong>Status:</strong> {p.status}
                  </p>

                  {p.local && (
                    <p>
                      <strong>Local:</strong> {p.local}
                    </p>
                  )}

                  {!p.local && p.cep && (
                    <p>
                      <strong>Local:</strong> CEP {p.cep}
                    </p>
                  )}

                  {p.local && p.cep && (
                    <p>
                      <strong>CEP:</strong> {p.cep}
                    </p>
                  )}

                  <p>
                    <strong>Mensagem:</strong> {p.mensagem}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "ambientes" && (
          <div className="amb-grid">
            {ambientesOrdenados.length === 0 && (
              <p className="historico-empty">Não há ambientes.</p>
            )}

            {ambientesOrdenados.map((a) => {
              const pagamentoAtual = a.pedido?.pagamentoStatus;

              return (
                <div
                  key={a.id}
                  className={`amb-card ${
                    pagamentoAtual === "pago_a_mais" ? "historico-card--overpaid" : ""
                  }`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedAmbiente(a);
                    setVrLoading(true);
                  }}
                >
                  {a.imagemPreview && (
                    <img
                      className="amb-card-img"
                      src={
                        a.imagemPreview.startsWith("http")
                          ? a.imagemPreview
                          : `${API_URL}${a.imagemPreview}`
                      }
                      alt={a.titulo}
                    />
                  )}

                  <div className="historico-card-header">
                    <h3>{a.titulo}</h3>
                    {pagamentoAtual && (
                      <span className={getPagamentoBadgeClass(pagamentoAtual)}>
                        {getPagamentoLabel(pagamentoAtual)}
                      </span>
                    )}
                  </div>

                  {a.pedido?.pagamentoStatus === "pago_a_mais" && (
                    <p className="historico-highlight-text">
                      Este ambiente foi marcado como pago a mais.
                    </p>
                  )}

                  <p>{a.descricao}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedAmbiente &&
        createPortal(
          <div
            className="amb-modal-overlay"
            onClick={() => setSelectedAmbiente(null)}
          >
            <div
              className="amb-vr-container"
              onClick={(e) => e.stopPropagation()}
            >
              {vrLoading && (
                <div className="amb-vr-loading">
                  <div className="amb-vr-arrow"></div>
                </div>
              )}

              {selectedAmbiente.linkVR && (
                <iframe
                  className="amb-vr-frame"
                  src={`${selectedAmbiente.linkVR}${
                    selectedAmbiente.linkVR.includes("?") ? "&" : "?"
                  }play=1`}
                  allow="autoplay; fullscreen; xr-spatial-tracking; camera *; microphone *"
                  allowFullScreen
                  title={selectedAmbiente.titulo}
                  onLoad={() => setVrLoading(false)}
                />
              )}

              <button
                className="amb-close-vr"
                onClick={() => setSelectedAmbiente(null)}
              >
                Fechar
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HistoricoPublico;
