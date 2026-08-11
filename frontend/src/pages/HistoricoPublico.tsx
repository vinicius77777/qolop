import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Pedido,
  getHistoricoPedidosPublico,
  getAmbientesPublicos,
  Ambiente,
  PagamentoStatus,
} from "../services/api";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "../styles/historico.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

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

function getStatusDotTone(pagamentoStatus: PagamentoStatus) {
  if (pagamentoStatus === "pago") return "success";
  if (pagamentoStatus === "pago_a_mais") return "gold";
  return "pending";
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
            <span>compartilhado</span>
          </motion.div>

          <motion.h1
            className="tj-his-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Histórico
            <br />
            público.
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

          <motion.nav
            className="tj-his-tabs"
            aria-label="Alternar entre pedidos e ambientes"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
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
          </motion.nav>
        </header>

        {/* ============ PEDIDOS ============ */}
        {activeTab === "pedidos" && (
          <section className="tj-his-block">
            <div className="tj-his-block-head">
              <div>
                <span className="tj-his-eyebrow">Pedidos</span>
                <h2>Todos os pedidos do usuário.</h2>
              </div>
              <span className="tj-his-empty-text" style={{ textAlign: "right" }}>
                {pedidosOrdenados.length === 1
                  ? "1 pedido"
                  : `${pedidosOrdenados.length} pedidos`}
              </span>
            </div>

            {pedidosOrdenados.length === 0 ? (
              <p className="tj-his-empty-text">Não há pedidos para exibir.</p>
            ) : (
              <div className="tj-his-list">
                {pedidosOrdenados.map((p, index) => {
                  const pagamentoAtual = normalizePagamentoStatus(
                    p.pagamentoStatus,
                    p.pago
                  );

                  return (
                    <motion.div
                      key={p.id}
                      className="tj-his-row"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: TJ_EASE, delay: (index % 8) * 0.04 }}
                    >
                      <span className="tj-his-row-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className={`tj-his-dot tj-his-dot--${getStatusDotTone(pagamentoAtual)}`} />
                      <span className="tj-his-row-main">
                        <strong>{p.empresa?.nome || "Pedido sem empresa"}</strong>
                        <span>
                          Pedido #{p.id} · {p.email || "sem email"}
                          {p.mensagem
                            ? ` · ${p.mensagem.slice(0, 60)}${p.mensagem.length > 60 ? "…" : ""}`
                            : ""}
                        </span>
                      </span>
                      <span className="tj-his-row-side">
                        <span className={`tj-his-chip tj-his-chip--${pagamentoAtual}`}>
                          {getPagamentoLabel(pagamentoAtual)}
                        </span>
                        <span className="tj-his-row-date">{formatarData(p.createdAt)}</span>
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ============ AMBIENTES ============ */}
        {activeTab === "ambientes" && (
          <section className="tj-his-block">
            <div className="tj-his-block-head">
              <div>
                <span className="tj-his-eyebrow">Ambientes</span>
                <h2>Todos os ambientes do usuário.</h2>
              </div>
              <span className="tj-his-empty-text" style={{ textAlign: "right" }}>
                {ambientesOrdenados.length === 1
                  ? "1 ambiente"
                  : `${ambientesOrdenados.length} ambientes`}
              </span>
            </div>

            {ambientesOrdenados.length === 0 ? (
              <p className="tj-his-empty-text">Não há ambientes para exibir.</p>
            ) : (
              <div className="tj-his-list">
                {ambientesOrdenados.map((a, index) => {
                  const pagamentoAtual = normalizePagamentoStatus(
                    a.pedido?.pagamentoStatus,
                    a.pedido?.pago
                  );

                  return (
                    <motion.button
                      key={a.id}
                      type="button"
                      className="tj-his-row"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: TJ_EASE, delay: (index % 8) * 0.04 }}
                      onClick={() => {
                        setSelectedAmbiente(a);
                        setVrLoading(true);
                      }}
                    >
                      <span className="tj-his-row-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className={`tj-his-dot tj-his-dot--${getStatusDotTone(pagamentoAtual)}`} />
                      <span className="tj-his-row-main">
                        <strong>{a.titulo}</strong>
                        <span>
                          Ambiente #{a.id} · {a.publico ? "Público" : "Privado"}
                          {a.empresa?.nome || a.empresaPedido?.nome
                            ? ` · ${a.empresa?.nome || a.empresaPedido?.nome}`
                            : ""}
                          {a.descricao
                            ? ` · ${a.descricao.slice(0, 80)}${a.descricao.length > 80 ? "…" : ""}`
                            : ""}
                        </span>
                      </span>
                      <span className="tj-his-row-side">
                        <span className={`tj-his-chip tj-his-chip--${pagamentoAtual}`}>
                          {getPagamentoLabel(pagamentoAtual)}
                        </span>
                        {a.imagemPreview ? (
                          <img
                            src={resolveMediaUrl(a.imagemPreview) ?? undefined}
                            alt=""
                            aria-hidden="true"
                            style={{
                              width: 48,
                              height: 36,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid var(--tj-his-line)",
                            }}
                          />
                        ) : null}
                        <span className="tj-his-action">Abrir VR</span>
                      </span>
                    </motion.button>
                  );
                })}
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

export default HistoricoPublico;
