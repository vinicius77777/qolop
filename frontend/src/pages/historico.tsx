import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
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

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

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

function getPedidoDoAmbiente(
  ambiente: Ambiente,
  pedidos: Pedido[]
) {
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
}

function getStatusDotTone(pagamentoStatus: PagamentoStatus) {
  if (pagamentoStatus === "pago") return "success";
  if (pagamentoStatus === "pago_a_mais") return "gold";
  return "pending";
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
      const pedidoRelacionado = getPedidoDoAmbiente(ambiente, pedidos);
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
      <div className="tj-his-page tj-his-loading">
        <motion.div
          className="tj-his-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          HISTÓRICO
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tj-his-page">
        <div className="tj-his-content">
          <div className="tj-his-empty">
            <span className="tj-his-eyebrow">Indisponível</span>
            <h2>Histórico indisponível</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tj-his-page">
      <div className="tj-his-bg" aria-hidden="true">
        <span className="tj-his-orb tj-his-orb--one" />
        <span className="tj-his-orb tj-his-orb--two" />
        <span className="tj-his-orb tj-his-orb--three" />
      </div>

      <main className="tj-his-content">
        {/* ============ HERO MINIMALISTA ============ */}
        <header className="tj-his-hero">
          <motion.div
            className="tj-his-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Histórico</span>
            <span className="tj-his-dot" />
            <span>cliente · centro de controle</span>
          </motion.div>

          <motion.h1
            className="tj-his-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            O histórico em uma
            <br />
            linha do tempo limpa.
          </motion.h1>

          <motion.p
            className="tj-his-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Pedidos e ambientes organizados em lista tipográfica. O ponto luminoso
            indica o estado — verde para pago, âmbar para destaque, cinza pendente.
          </motion.p>
        </header>

        {/* ============ NÚMEROS GIGANTES ============ */}
        <section className="tj-his-stats" aria-label="Resumo do histórico">
          <div className="tj-his-stat">
            <strong>{String(resumo.totalPedidos).padStart(2, "0")}</strong>
            <span>Pedidos</span>
          </div>
          <div className="tj-his-stat">
            <strong>{String(resumo.pedidosPagos).padStart(2, "0")}</strong>
            <span>Pagos confirmados</span>
          </div>
          <div className="tj-his-stat">
            <strong>{String(resumo.pedidosNaoPagos).padStart(2, "0")}</strong>
            <span>Aguardando pagamento</span>
          </div>
          <div className="tj-his-stat">
            <strong>{String(resumo.totalAmbientes).padStart(2, "0")}</strong>
            <span>Ambientes</span>
          </div>
        </section>

        {/* ============ FERRAMENTAS ============ */}
        <section className="tj-his-toolbar">
          <label className="tj-his-search">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, ambiente, empresa ou pedido..."
              aria-label="Buscar no histórico"
            />
          </label>

          <label className="tj-his-filter">
            <span>Status de pagamento</span>
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

        {/* ============ TABS TIPOGRÁFICOS ============ */}
        <nav className="tj-his-tabs" aria-label="Alternar entre pedidos e ambientes">
          <button
            type="button"
            className={`tj-his-tab${activeTab === "pedidos" ? " is-active" : ""}`}
            onClick={() => setActiveTab("pedidos")}
          >
            Pedidos
          </button>
          <button
            type="button"
            className={`tj-his-tab${activeTab === "ambientes" ? " is-active" : ""}`}
            onClick={() => setActiveTab("ambientes")}
          >
            Ambientes
          </button>
        </nav>

        {/* ============ LINHA DO TEMPO RECENTE ============ */}
        <section className="tj-his-block">
          <div className="tj-his-block-head">
            <div>
              <span className="tj-his-eyebrow">Movimentações recentes</span>
              <h2>O que aconteceu por último.</h2>
            </div>
          </div>

          <div className="tj-his-timeline">
            {timelineItems.length === 0 ? (
              <p className="tj-his-empty-text">Sem eventos recentes para exibir.</p>
            ) : (
              timelineItems.map((item) => (
                <div
                  key={item.id}
                  className={`tj-his-timeline-row tj-his-timeline-row--${item.tone}`}
                >
                  <span className={`tj-his-timeline-dot tj-his-timeline-dot--${item.tone}`} />
                  <div className="tj-his-timeline-main">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                  <span className="tj-his-timeline-date">{item.dateLabel}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ============ LISTA TIPOGRÁFICA ============ */}
        {activeTab === "pedidos" && (
          <section className="tj-his-block">
            <div className="tj-his-block-head">
              <div>
                <span className="tj-his-eyebrow">Pedidos</span>
                <h2>Todos os pedidos do usuário.</h2>
              </div>
            </div>

            {filteredPedidos.length === 0 ? (
              <p className="tj-his-empty-text">Nenhum pedido encontrado com os filtros atuais.</p>
            ) : (
              <div className="tj-his-list">
                {filteredPedidos.map((p, index) => {
                  const pagamentoAtual = getPagamentoAtualFromPedido(p);

                  return (
                    <Link
                      key={p.id}
                      to={`/pedidos`}
                      className="tj-his-row"
                    >
                      <span className="tj-his-row-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className={`tj-his-dot tj-his-dot--${getStatusDotTone(pagamentoAtual)}`} />
                      <span className="tj-his-row-main">
                        <strong>{p.empresa?.nome || "Pedido sem empresa"}</strong>
                        <span>
                          Pedido #{p.id} · {p.email || "sem email"}
                          {p.mensagem ? ` · ${p.mensagem.slice(0, 60)}${p.mensagem.length > 60 ? "…" : ""}` : ""}
                        </span>
                      </span>
                      <span className="tj-his-row-side">
                        <span className={`tj-his-chip tj-his-chip--${pagamentoAtual}`}>
                          {getPagamentoLabel(pagamentoAtual)}
                        </span>
                        <span className="tj-his-row-date">{formatarData(p.createdAt)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "ambientes" && (
          <section className="tj-his-block">
            <div className="tj-his-block-head">
              <div>
                <span className="tj-his-eyebrow">Ambientes</span>
                <h2>Todos os ambientes do usuário.</h2>
              </div>
            </div>

            {filteredAmbientes.length === 0 ? (
              <p className="tj-his-empty-text">Nenhum ambiente encontrado com os filtros atuais.</p>
            ) : (
              <div className="tj-his-list">
                {filteredAmbientes.map((a, index) => {
                  const pedidoRelacionado = getPedidoDoAmbiente(a, pedidos);
                  const pagamentoAtual = getPagamentoAtualFromPedido(pedidoRelacionado);

                  return (
                    <div key={a.id} className={`tj-his-row ${pagamentoAtual === "nao_pago" ? "is-urgent" : ""}`}>
                      <span className="tj-his-row-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className={`tj-his-dot tj-his-dot--${getStatusDotTone(pagamentoAtual)}`} />
                      <span className="tj-his-row-main">
                        <strong>{a.titulo}</strong>
                        <span>
                          Ambiente #{a.id} · {a.publico ? "Público" : "Privado"}
                          {a.empresa?.nome || a.empresaPedido?.nome
                            ? ` · ${a.empresa?.nome || a.empresaPedido?.nome}`
                            : ""}
                        </span>
                      </span>
                      <span className="tj-his-row-side">
                        <span className={`tj-his-chip tj-his-chip--${pagamentoAtual}`}>
                          {getPagamentoLabel(pagamentoAtual)}
                        </span>
                        <button
                          type="button"
                          className="tj-his-action"
                          onClick={() => {
                            setSelectedAmbiente(a);
                            setVrLoading(true);
                          }}
                        >
                          Abrir VR
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredAmbientes.length > 0 && (
              <div className="tj-his-inline-actions">
                <Link className="tj-his-link" to="/ambientes">
                  Gerenciar ambientes →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ============ DETALHES DO AMBIENTE (INLINE) ============ */}
        {selectedAmbiente && (
          <section className="tj-his-detail">
            <div className="tj-his-detail-head">
              <div>
                <span className="tj-his-eyebrow">Visualização imersiva</span>
                <h2>{selectedAmbiente.titulo}</h2>
              </div>
              <div className="tj-his-detail-actions">
                {selectedAmbiente.linkVR && (
                  <a
                    className="tj-his-link"
                    href={`${selectedAmbiente.linkVR}${
                      selectedAmbiente.linkVR.includes("?") ? "&" : "?"
                    }play=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir em nova aba →
                  </a>
                )}
                <button
                  type="button"
                  className="tj-his-action tj-his-action--danger"
                  onClick={() => setSelectedAmbiente(null)}
                >
                  Fechar
                </button>
              </div>
            </div>

            {vrLoading && (
              <div className="tj-his-vr-loading">
                <div className="tj-his-spinner" />
                <p>Preparando experiência VR...</p>
              </div>
            )}

            {selectedAmbiente.linkVR && (
              <iframe
                className="tj-his-vr-frame"
                src={`${selectedAmbiente.linkVR}${
                  selectedAmbiente.linkVR.includes("?") ? "&" : "?"
                }play=1`}
                allow="autoplay; fullscreen; xr-spatial-tracking; camera *; microphone *"
                allowFullScreen
                title={selectedAmbiente.titulo}
                onLoad={() => setVrLoading(false)}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Historico;
