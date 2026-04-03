import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  Ambiente,
  PagamentoStatus,
  Pedido,
  Usuario,
  getAmbientes,
  getHistoricoPedidos,
  getMe,
} from "../services/api";
import "../styles/historico.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type HistoricoTab = "pedidos" | "ambientes";
type StatusFilter = "todos" | "pago" | "nao_pago" | "pago_a_mais";

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

function getPagamentoAtualFromPedido(pedido?: Pedido | null): PagamentoStatus {
  const ultimoHistorico = pedido?.pagamentoHistorico?.[pedido.pagamentoHistorico.length - 1];
  return normalizePagamentoStatus(
    ultimoHistorico?.status || pedido?.pagamentoStatus,
    pedido?.pago
  );
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

  if (normalized === "pago_a_mais") {
    return "payment-badge payment-badge--overpaid";
  }

  if (normalized === "pago") {
    return "payment-badge payment-badge--paid";
  }

  return "payment-badge payment-badge--unpaid";
}

function getStatusToneClass(
  pagamentoStatus?: PagamentoStatus,
  pago?: boolean
) {
  const normalized = normalizePagamentoStatus(pagamentoStatus, pago);

  if (normalized === "pago_a_mais") return "is-overpaid";
  if (normalized === "pago") return "is-paid";
  return "is-unpaid";
}

function formatarData(data?: string) {
  if (!data) return "Agora";

  const parsedDate = new Date(data);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Data indisponível";
  }

  return parsedDate.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatarDataCurta(data?: string) {
  if (!data) return "Sem data";
  const parsedDate = new Date(data);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sem data";
  }

  return parsedDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getHistoricoTimeline(
  pedidos: Pedido[],
  ambientes: Ambiente[]
): Array<{
  id: string;
  dateValue: number;
  dateLabel: string;
  title: string;
  description: string;
  tone: "success" | "warning" | "info";
}> {
  const pedidoItems = pedidos.map((pedido) => {
    const pagamentoAtual = getPagamentoAtualFromPedido(pedido);

    return {
      id: `pedido-${pedido.id}`,
      dateValue: new Date(pedido.createdAt || 0).getTime(),
      dateLabel: formatarData(pedido.createdAt),
      title: `Pedido #${pedido.id} registrado`,
      description:
        pagamentoAtual === "pago_a_mais"
          ? "Pagamento acima do valor registrado."
          : pagamentoAtual === "pago"
          ? "Pedido com pagamento confirmado."
          : "Pedido aguardando pagamento.",
      tone:
        pagamentoAtual === "pago"
          ? ("success" as const)
          : pagamentoAtual === "pago_a_mais"
          ? ("warning" as const)
          : ("info" as const),
    };
  });

  const ambienteItems = ambientes.map((ambiente) => ({
    id: `ambiente-${ambiente.id}`,
    dateValue: ambiente.id,
    dateLabel: `Ambiente #${ambiente.id}`,
    title: `${ambiente.titulo} disponível no histórico`,
    description: ambiente.publico
      ? "Ambiente público pronto para compartilhamento."
      : "Ambiente privado disponível para revisão.",
    tone: ambiente.publico ? ("success" as const) : ("info" as const),
  }));

  return [...pedidoItems, ...ambienteItems]
    .sort((a, b) => b.dateValue - a.dateValue)
    .slice(0, 6);
}

const Historico: React.FC = () => {
  const { usuarioId } = useParams<{ usuarioId: string }>();

  const getPedidoDoAmbiente = (ambiente: Ambiente) => {
    if (ambiente.pedidoId) {
      return pedidos.find((pedido) => pedido.id === ambiente.pedidoId) || null;
    }

    if (ambiente.usuario?.email) {
      const pedidosDoMesmoUsuario = pedidos
        .filter((pedido) => pedido.email === ambiente.usuario?.email)
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

      return pedidosDoMesmoUsuario[0] || null;
    }

    return null;
  };

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HistoricoTab>("pedidos");
  const [selectedAmbiente, setSelectedAmbiente] = useState<Ambiente | null>(null);
  const [vrLoading, setVrLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  useEffect(() => {
    const carregarHistorico = async () => {
      setLoading(true);
      try {
        const userLogado: Usuario = await getMe();

        if (userLogado.role === "user" && userLogado.id.toString() !== usuarioId) {
          setError("Acesso negado.");
          return;
        }

        const pedidosFiltrados: Pedido[] = await getHistoricoPedidos(usuarioId || "");
        const allAmbientes: Ambiente[] = await getAmbientes(userLogado);
        const ambientesFiltrados = allAmbientes.filter(
          (a) => a.usuario?.id?.toString() === usuarioId
        );

        setPedidos(pedidosFiltrados);
        setAmbientes(ambientesFiltrados);
        setError("");
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        setError("Erro ao carregar histórico.");
        setPedidos([]);
        setAmbientes([]);
      } finally {
        setLoading(false);
      }
    };

    carregarHistorico();
  }, [usuarioId]);

  const pedidosOrdenados = useMemo(() => {
    return [...pedidos].sort((a, b) => {
      const aOverpaid = getPagamentoAtualFromPedido(a) === "pago_a_mais" ? 1 : 0;
      const bOverpaid = getPagamentoAtualFromPedido(b) === "pago_a_mais" ? 1 : 0;

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
      const pedidoA = a.pedidoId ? pedidos.find((pedido) => pedido.id === a.pedidoId) : null;
      const pedidoB = b.pedidoId ? pedidos.find((pedido) => pedido.id === b.pedidoId) : null;
      const aOverpaid = getPagamentoAtualFromPedido(pedidoA) === "pago_a_mais" ? 1 : 0;
      const bOverpaid = getPagamentoAtualFromPedido(pedidoB) === "pago_a_mais" ? 1 : 0;

      if (aOverpaid !== bOverpaid) {
        return bOverpaid - aOverpaid;
      }

      return b.id - a.id;
    });
  }, [ambientes, pedidos]);

  const resumo = useMemo(() => {
    const pedidosPagos = pedidos.filter(
      (pedido) => getPagamentoAtualFromPedido(pedido) === "pago"
    ).length;
    const pedidosNaoPagos = pedidos.filter(
      (pedido) => getPagamentoAtualFromPedido(pedido) === "nao_pago"
    ).length;
    const pedidosPagoAMais = pedidos.filter(
      (pedido) => getPagamentoAtualFromPedido(pedido) === "pago_a_mais"
    ).length;

    return {
      totalPedidos: pedidos.length,
      pedidosPagos,
      pedidosNaoPagos,
      pedidosPagoAMais,
      totalAmbientes: ambientes.length,
      ambientesPublicos: ambientes.filter((ambiente) => ambiente.publico).length,
    };
  }, [pedidos, ambientes]);

  const filteredPedidos = useMemo(() => {
    const term = search.trim().toLowerCase();

    return pedidosOrdenados.filter((pedido) => {
      const pagamentoAtual = getPagamentoAtualFromPedido(pedido);

      const matchesStatus =
        statusFilter === "todos" ? true : pagamentoAtual === statusFilter;

      const searchableText = [
        pedido.email,
        pedido.telefone,
        pedido.mensagem,
        pedido.local,
        pedido.cep,
        pedido.status,
        pedido.empresa?.nome,
        `pedido ${pedido.id}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = term ? searchableText.includes(term) : true;
      return matchesStatus && matchesSearch;
    });
  }, [pedidosOrdenados, search, statusFilter]);

  const filteredAmbientes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return ambientesOrdenados.filter((ambiente) => {
      const pedidoRelacionado = getPedidoDoAmbiente(ambiente);
      const pagamentoAtual = getPagamentoAtualFromPedido(pedidoRelacionado);

      const matchesStatus =
        statusFilter === "todos" ? true : pagamentoAtual === statusFilter;

      const searchableText = [
        ambiente.titulo,
        ambiente.descricao,
        ambiente.empresa?.nome,
        ambiente.empresaPedido?.nome,
        ambiente.empresaPedido?.email,
        `ambiente ${ambiente.id}`,
        ambiente.pedidoId ? `pedido ${ambiente.pedidoId}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = term ? searchableText.includes(term) : true;
      return matchesStatus && matchesSearch;
    });
  }, [ambientesOrdenados, pedidos, search, statusFilter]);

  const timelineItems = useMemo(
    () => getHistoricoTimeline(pedidosOrdenados, ambientesOrdenados),
    [pedidosOrdenados, ambientesOrdenados]
  );

  if (loading) {
    return (
      <div className="historico-page">
        <div className="historico-shell">
          <div className="historico-loading-card">
            <div className="historico-spinner" />
            <p>Carregando histórico do usuário...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historico-page">
        <div className="historico-shell">
          <div className="historico-feedback historico-feedback--error">
            <h2>Histórico indisponível</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="historico-page">
      <div className="historico-shell">
        <section className="historico-hero">
          <div className="historico-hero-copy">
            <span className="historico-kicker">Cliente · centro de controle</span>
            <h1 className="historico-title">Histórico do usuário com visão rápida, contexto e ação.</h1>
            <p className="historico-lead">
              Agora o histórico fica abaixo do menu, com resumo no topo, busca,
              filtros e cards priorizados para identificar pagamentos e ambientes
              importantes com mais rapidez.
            </p>
          </div>

          <div className="historico-summary-grid">
            <article className="historico-summary-card">
              <span className="historico-summary-label">Pedidos</span>
              <strong className="historico-summary-value">{resumo.totalPedidos}</strong>
              <small>{resumo.pedidosPagos} pagos confirmados</small>
            </article>

            <article className="historico-summary-card is-alert">
              <span className="historico-summary-label">Pendentes</span>
              <strong className="historico-summary-value">{resumo.pedidosNaoPagos}</strong>
              <small>pedidos aguardando pagamento</small>
            </article>

            <article className="historico-summary-card is-highlight">
              <span className="historico-summary-label">Pago a mais</span>
              <strong className="historico-summary-value">{resumo.pedidosPagoAMais}</strong>
              <small>casos que exigem atenção</small>
            </article>

            <article className="historico-summary-card">
              <span className="historico-summary-label">Ambientes</span>
              <strong className="historico-summary-value">{resumo.totalAmbientes}</strong>
              <small>{resumo.ambientesPublicos} públicos para compartilhar</small>
            </article>
          </div>
        </section>

        <section className="historico-toolbar">
          <div className="historico-search">
            <span>Buscar</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, ambiente, empresa ou pedido..."
            />
          </div>

          <label className="historico-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="todos">Todos</option>
              <option value="pago">Pago</option>
              <option value="nao_pago">Não pago</option>
              <option value="pago_a_mais">Pago a mais</option>
            </select>
          </label>
        </section>

        <section className="historico-overview-grid">
          <article className="historico-panel">
            <div className="historico-panel-head">
              <div>
                <span className="historico-kicker">Acompanhamento</span>
                <h2>Resumo operacional</h2>
              </div>
              <span className="historico-panel-note">
                Priorize pagamentos pendentes e itens com destaque.
              </span>
            </div>

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
          </article>

          <article className="historico-panel">
            <div className="historico-panel-head">
              <div>
                <span className="historico-kicker">Linha do tempo</span>
                <h2>Movimentações recentes</h2>
              </div>
            </div>

            <div className="historico-timeline">
              {timelineItems.length === 0 ? (
                <p className="historico-empty">Sem eventos recentes para exibir.</p>
              ) : (
                timelineItems.map((item) => (
                  <div
                    key={item.id}
                    className={`historico-timeline-item historico-timeline-item--${item.tone}`}
                  >
                    <span className="historico-timeline-date">{item.dateLabel}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        {activeTab === "pedidos" && (
          <section className="historico-list-section">
            <div className="amb-grid">
              {filteredPedidos.length === 0 && (
                <p className="historico-empty">
                  Nenhum pedido encontrado com os filtros atuais.
                </p>
              )}

              {filteredPedidos.map((p) => {
                const pagamentoAtual = getPagamentoAtualFromPedido(p);

                return (
                  <div
                    key={p.id}
                    className={`amb-card historico-card historico-card--pedido ${getStatusToneClass(
                      pagamentoAtual
                    )}`}
                  >
                    <div className="historico-card-header">
                      <div>
                        <span className="historico-card-tag">Pedido #{p.id}</span>
                        <h3>{p.empresa?.nome || "Pedido sem empresa"}</h3>
                      </div>
                      <span className={getPagamentoBadgeClass(pagamentoAtual)}>
                        {getPagamentoLabel(pagamentoAtual)}
                      </span>
                    </div>

                    <div className="historico-meta-grid">
                      <p>
                        <strong>Email:</strong> {p.email}
                      </p>
                      {p.telefone && (
                        <p>
                          <strong>Telefone:</strong> {p.telefone}
                        </p>
                      )}
                      <p>
                        <strong>Criado em:</strong> {formatarData(p.createdAt)}
                      </p>
                      <p>
                        <strong>Status:</strong> {p.status || "Sem status"}
                      </p>
                    </div>

                    {(p.local || p.cep) && (
                      <p>
                        <strong>Local:</strong> {p.local || `CEP ${p.cep}`}
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

                    <div className="historico-inline-info">
                      <span>
                        <strong>Ambientes vinculados:</strong>{" "}
                        {
                          ambientes.filter((ambiente) => ambiente.pedidoId === p.id).length
                        }
                      </span>
                      <span>
                        <strong>Prioridade:</strong>{" "}
                        {pagamentoAtual === "nao_pago"
                          ? "Alta"
                          : pagamentoAtual === "pago_a_mais"
                          ? "Revisão"
                          : "Normal"}
                      </span>
                    </div>

                    {p.pagamentoHistorico && p.pagamentoHistorico.length > 0 && (
                      <div className="payment-history">
                        <strong>Última atualização de pagamento</strong>
                        {p.pagamentoHistorico.slice(-1).map((item, index) => (
                          <div key={`${p.id}-${index}`} className="payment-history-item">
                            <span className={getPagamentoBadgeClass(item.status)}>
                              {getPagamentoLabel(item.status)}
                            </span>
                            <span>Atualizado em {formatarData(item.updatedAt)}</span>
                            {item.updatedByNome && (
                              <span>
                                por {item.updatedByNome}
                                {item.updatedByRole ? ` (${item.updatedByRole})` : ""}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "ambientes" && (
          <section className="historico-list-section">
            <div className="amb-grid">
              {filteredAmbientes.length === 0 && (
                <p className="historico-empty">
                  Nenhum ambiente encontrado com os filtros atuais.
                </p>
              )}

              {filteredAmbientes.map((a) => {
                const pedidoRelacionado = getPedidoDoAmbiente(a);
                const pagamentoAtual = getPagamentoAtualFromPedido(pedidoRelacionado);

                return (
                  <div
                    key={a.id}
                    className={`amb-card historico-card historico-card--ambiente ${getStatusToneClass(
                      pagamentoAtual
                    )}`}
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
                      <div>
                        <span className="historico-card-tag">Ambiente #{a.id}</span>
                        <h3>{a.titulo}</h3>
                      </div>
                      <span
                        className={getPagamentoBadgeClass(pagamentoAtual)}
                      >
                        {getPagamentoLabel(pagamentoAtual)}
                      </span>
                    </div>

                    <p className="historico-description">{a.descricao}</p>

                    <div className="historico-meta-grid">
                      <p>
                        <strong>Visibilidade:</strong> {a.publico ? "Público" : "Privado"}
                      </p>
                      <p>
                        <strong>ID:</strong> #{a.id}
                      </p>
                      <p>
                        <strong>Pedido:</strong> {a.pedidoId ? `#${a.pedidoId}` : "Sem vínculo"}
                      </p>
                      <p>
                        <strong>Empresa:</strong>{" "}
                        {a.empresa?.nome || a.empresaPedido?.nome || "Não informada"}
                      </p>
                    </div>

                    {pagamentoAtual === "pago_a_mais" && (
                      <p className="historico-highlight-text">
                        Este ambiente foi marcado como pago a mais.
                      </p>
                    )}

                    <div className="historico-actions">
                      <button
                        className="historico-action-button primary"
                        onClick={() => {
                          setSelectedAmbiente(a);
                          setVrLoading(true);
                        }}
                      >
                        Abrir VR
                      </button>

                      {a.linkVR && (
                        <a
                          className="historico-action-button"
                          href={`${a.linkVR}${a.linkVR.includes("?") ? "&" : "?"}play=1`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Nova aba
                        </a>
                      )}

                      {a.pedidoId && (
                        <button
                          className="historico-action-button"
                          onClick={() => setActiveTab("pedidos")}
                        >
                          Ver pedido #{a.pedidoId}
                        </button>
                      )}

                      <Link className="historico-action-button" to="/ambientes">
                        Gerenciar
                      </Link>
                    </div>

                    {pagamentoAtual === "nao_pago" && (
                      <div className="historico-inline-alert">
                        Pagamento pendente: acompanhe este ambiente com prioridade.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {selectedAmbiente &&
        createPortal(
          <div className="amb-modal-overlay" onClick={() => setSelectedAmbiente(null)}>
            <div className="amb-vr-container" onClick={(e) => e.stopPropagation()}>
              <div className="historico-modal-head">
                <div>
                  <span className="historico-kicker">Visualização imersiva</span>
                  <h3>{selectedAmbiente.titulo}</h3>
                </div>

                <div className="historico-modal-actions">
                  {selectedAmbiente.linkVR && (
                    <a
                      className="historico-action-button"
                      href={`${selectedAmbiente.linkVR}${
                        selectedAmbiente.linkVR.includes("?") ? "&" : "?"
                      }play=1`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir em nova aba
                    </a>
                  )}

                  <button
                    className="amb-close-vr"
                    onClick={() => setSelectedAmbiente(null)}
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {vrLoading && (
                <div className="amb-vr-loading">
                  <div className="historico-spinner" />
                  <p>Preparando experiência VR...</p>
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
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Historico;
