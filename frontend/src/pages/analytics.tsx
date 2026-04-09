import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiArrowUpRight,
  FiClock,
  FiEye,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiTrendingUp,
} from "react-icons/fi";
import "../styles/analytics.css";

interface AnalyticsEmpresa {
  id: number;
  nome: string;
}

interface AnalyticsResumo {
  totalAmbientes: number;
  totalVisualizacoes: number;
  totalToursPublicos: number;
  totalVisitasEmpresa: number;
}

interface AnalyticsAmbiente {
  id: number;
  titulo: string;
  publico: boolean;
  visualizacoes: number;
  createdAt: string;
}

interface AnalyticsAcessoRecente {
  id: number;
  ambienteId: number;
  ambienteTitulo: string;
  ip?: string;
  cidade?: string;
  pais?: string;
  userAgent?: string;
  createdAt: string;
}

interface AnalyticsResponse {
  parceiro: boolean;
  empresa: AnalyticsEmpresa | null;
  resumo: AnalyticsResumo;
  ambientes: AnalyticsAmbiente[];
  acessosRecentes: AnalyticsAcessoRecente[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

async function getEmpresaAnalytics(): Promise<AnalyticsResponse> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/empresa/analytics`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error(data?.error || "Erro ao carregar analytics.");
  }

  return data;
}

function formatarData(data?: string) {
  if (!data) return "-";

  const date = new Date(data);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatarDataRelativa(data?: string) {
  if (!data) return "sem registro";
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return "sem registro";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMin < 60) return `${diffMin} min atrás`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d atrás`;

  return formatarData(data);
}

function formatarLocalizacao(cidade?: string, pais?: string) {
  const partes = [cidade, pais].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : "Localização não informada";
}

function formatarUserAgent(userAgent?: string) {
  if (!userAgent) return "Dispositivo não identificado";

  const ua = userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|mobile/.test(ua);
  const platform = ua.includes("windows")
    ? "Windows"
    : ua.includes("mac os")
    ? "macOS"
    : ua.includes("android")
    ? "Android"
    : ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")
    ? "iOS"
    : "Outro sistema";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome/")
    ? "Chrome"
    : ua.includes("firefox/")
    ? "Firefox"
    : ua.includes("safari/") && !ua.includes("chrome/")
    ? "Safari"
    : "Navegador não identificado";

  return `${browser} • ${platform} • ${isMobile ? "Mobile" : "Desktop"}`;
}

function formatarIp(ip?: string) {
  if (!ip) return "Não informado";
  if (ip === "127.0.0.1" || ip === "::1") return "Acesso local";
  return ip;
}

function getStartDate(period: PeriodValue) {
  const days = Number(period);
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return date;
}

function formatPercent(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<PeriodValue>("30");

  useEffect(() => {
    const carregarAnalytics = async () => {
      setLoading(true);
      try {
        const data = await getEmpresaAnalytics();
        setAnalytics(data);
        setError("");
      } catch (err) {
        console.error("Erro ao carregar analytics:", err);
        setError("Não foi possível carregar os analytics da empresa.");
      } finally {
        setLoading(false);
      }
    };

    carregarAnalytics();
  }, []);

  const empresaNome = useMemo(() => {
    if (!analytics?.empresa?.nome) return "sua empresa";
    return analytics.empresa.nome;
  }, [analytics]);

  const filteredAcessos = useMemo(() => {
    if (!analytics) return [];
    const startDate = getStartDate(period);

    return analytics.acessosRecentes.filter((acesso) => {
      const createdAt = new Date(acesso.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= startDate;
    });
  }, [analytics, period]);

  const previousFilteredAcessos = useMemo(() => {
    if (!analytics) return [];
    const days = Number(period);
    const currentStart = getStartDate(period);
    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    return analytics.acessosRecentes.filter((acesso) => {
      const createdAt = new Date(acesso.createdAt);
      return (
        !Number.isNaN(createdAt.getTime()) &&
        createdAt >= previousStart &&
        createdAt <= previousEnd
      );
    });
  }, [analytics, period]);

  const analyticsView = useMemo(() => {
    if (!analytics) {
      return {
        filteredAcessos: [] as AnalyticsAcessoRecente[],
        topAmbientes: [] as Array<AnalyticsAmbiente & { recentViews: number; share: number; lastAccess?: string }>,
        locationRanking: [] as Array<{ label: string; count: number; percentage: number }>,
        visualizacoesPeriodo: 0,
        visitasEmpresaPeriodo: 0,
        crescimentoVisualizacoes: 0,
        recentPublicViews: 0,
        latestAccessLabel: "sem registro",
        topAmbiente: null as (AnalyticsAmbiente & {
          recentViews: number;
          share: number;
          lastAccess?: string;
        }) | null,
        activeCountries: 0,
        insightText: "",
        alertText: "",
      };
    }

    const ambienteAccessMap = new Map<number, number>();
    const ambienteLastAccessMap = new Map<number, string>();

    filteredAcessos.forEach((acesso) => {
      ambienteAccessMap.set(
        acesso.ambienteId,
        (ambienteAccessMap.get(acesso.ambienteId) || 0) + 1
      );

      const currentLast = ambienteLastAccessMap.get(acesso.ambienteId);
      if (!currentLast || new Date(acesso.createdAt) > new Date(currentLast)) {
        ambienteLastAccessMap.set(acesso.ambienteId, acesso.createdAt);
      }
    });

    const topAmbientes = analytics.ambientes
      .map((ambiente) => {
        const recentViews = ambienteAccessMap.get(ambiente.id) || 0;
        return {
          ...ambiente,
          recentViews,
          share:
            analytics.resumo.totalVisualizacoes > 0
              ? (ambiente.visualizacoes / analytics.resumo.totalVisualizacoes) * 100
              : 0,
          lastAccess: ambienteLastAccessMap.get(ambiente.id),
        };
      })
      .sort((a, b) => {
        if (b.recentViews !== a.recentViews) return b.recentViews - a.recentViews;
        return b.visualizacoes - a.visualizacoes;
      });

    const locationMap = new Map<string, number>();
    filteredAcessos.forEach((acesso) => {
      const label =
        acesso.cidade && acesso.pais
          ? `${acesso.cidade}, ${acesso.pais}`
          : acesso.cidade || acesso.pais || "Origem não identificada";

      locationMap.set(label, (locationMap.get(label) || 0) + 1);
    });

    const locationRanking = Array.from(locationMap.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: filteredAcessos.length > 0 ? (count / filteredAcessos.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const visualizacoesPeriodo =
      filteredAcessos.length > 0
        ? filteredAcessos.length
        : analytics.resumo.totalVisualizacoes;

    const visitasEmpresaPeriodo =
      analytics.resumo.totalVisitasEmpresa > 0
        ? analytics.resumo.totalVisitasEmpresa
        : filteredAcessos.length;
    const previousViews = previousFilteredAcessos.length;
    const crescimentoVisualizacoes =
      previousViews > 0
        ? ((visualizacoesPeriodo - previousViews) / previousViews) * 100
        : visualizacoesPeriodo > 0
        ? 100
        : 0;

    const recentPublicViews = filteredAcessos.filter((acesso) =>
      analytics.ambientes.find((ambiente) => ambiente.id === acesso.ambienteId)?.publico
    ).length;

    const topAmbiente = topAmbientes[0] || null;
    const latestAccessLabel = analytics.acessosRecentes[0]
      ? formatarDataRelativa(analytics.acessosRecentes[0].createdAt)
      : "sem registro";

    let insightText = "Ainda não há volume suficiente para gerar um insight mais avançado.";
    if (topAmbiente && topAmbiente.visualizacoes > 0) {
      insightText = `"${topAmbiente.titulo}" concentra ${Math.round(
        topAmbiente.share
      )}% das visualizações totais e lidera a atenção sobre os demais ambientes.`;
    } else if (locationRanking[0]) {
      insightText = `${locationRanking[0].label} é a origem com mais acessos neste período, representando ${Math.round(
        locationRanking[0].percentage
      )}% da audiência recente.`;
    }

    let alertText = "Fluxo estável no período atual, sem variações bruscas perceptíveis.";
    if (crescimentoVisualizacoes >= 25) {
      alertText = `As visualizações cresceram ${formatPercent(
        crescimentoVisualizacoes
      )} no período selecionado. Pode ser um bom momento para destacar o ambiente líder.`;
    } else if (crescimentoVisualizacoes <= -20) {
      alertText = `As visualizações caíram ${formatPercent(
        crescimentoVisualizacoes
      )} no período selecionado. Vale revisar divulgação ou destacar ambientes públicos.`;
    } else if (recentPublicViews > 0 && visualizacoesPeriodo > 0) {
      alertText = `${Math.round(
        (recentPublicViews / visualizacoesPeriodo) * 100
      )}% dos acessos recentes vieram de tours públicos.`;
    }

    return {
      filteredAcessos,
      topAmbientes,
      locationRanking,
      visualizacoesPeriodo,
      visitasEmpresaPeriodo,
      crescimentoVisualizacoes,
      recentPublicViews,
      latestAccessLabel,
      topAmbiente,
      activeCountries: locationRanking.length,
      insightText,
      alertText,
    };
  }, [analytics, filteredAcessos, previousFilteredAcessos]);

  if (loading) {
    return (
      <div className="an-page">
        <div className="an-loading-shell">
          <motion.div
            className="an-loading-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Carregando intelligence analytics...
          </motion.div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="an-page">
        <div className="an-shell">
          <section className="an-empty-state-box">
            <h2>Analytics indisponível</h2>
            <p>{error || "Nenhum dado disponível."}</p>
          </section>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Visualizações no período",
      value: analyticsView.visualizacoesPeriodo,
      meta: `${formatPercent(analyticsView.crescimentoVisualizacoes)} vs período anterior`,
      icon: <FiEye />,
    },
    {
      label: "Ambientes ativos",
      value: analytics.resumo.totalAmbientes,
      meta: `${analytics.resumo.totalToursPublicos} públicos disponíveis`,
      icon: <FiLayers />,
    },
    {
      label: "Visitas da empresa",
      value: analyticsView.visitasEmpresaPeriodo,
      meta: `Última atividade ${analyticsView.latestAccessLabel}`,
      icon: <FiActivity />,
    },
    {
      label: "Alcance geográfico",
      value: analyticsView.activeCountries,
      meta: "origens com maior presença recente",
      icon: <FiGlobe />,
    },
  ];

  return (
    <div className="an-page">
      <div className="an-noise" />
      <div className="an-ambient an-ambient--one" />
      <div className="an-ambient an-ambient--two" />
      <div className="an-ambient an-ambient--three" />

      <main className="an-shell">
        <section className="an-hero">
          <motion.div
            className="an-hero-copy"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="an-eyebrow">Analytics · visão estratégica</span>
            <h1 className="an-title">Transforme números em leitura rápida, contexto e decisão.</h1>
            <div className="an-toolbar">
              <label className="an-filter">
                <span>Recorte</span>
                <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodValue)}>
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <span className={`an-badge ${analytics.parceiro ? "is-partner" : "is-not-partner"}`}>
                {analytics.parceiro ? "Parceiro ativo" : "Aguardando primeiro ambiente"}
              </span>
            </div>
          </motion.div>

          <motion.div
            className="an-hero-panel"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.12 }}
          >
            <div className="an-panel-top">
              <span className="an-panel-kicker">Resumo estratégico</span>
              <span className="an-panel-period">
                {PERIOD_OPTIONS.find((option) => option.value === period)?.label}
              </span>
            </div>

            <div className="an-highlight">
              <div>
                <span className="an-mini-label">Insight automático</span>
                <h3>{analyticsView.topAmbiente?.titulo || "Sem ambiente líder definido"}</h3>
                <p>{analyticsView.insightText}</p>
              </div>

              <div className="an-trend-badge">
                <FiTrendingUp />
                <span>{formatPercent(analyticsView.crescimentoVisualizacoes)}</span>
              </div>
            </div>

            <div className="an-alert-card">
              <FiArrowUpRight />
              <div>
                <span className="an-mini-label">O que observar</span>
                <p>{analyticsView.alertText}</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="an-summary-grid">
          {summaryCards.map((card, index) => (
            <motion.article
              key={card.label}
              className="an-summary-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              whileHover={{ y: -5 }}
            >
              <div className="an-summary-top">
                <span className="an-summary-icon">{card.icon}</span>
                <span className="an-summary-label">{card.label}</span>
              </div>
              <strong className="an-summary-value">{card.value}</strong>
              <p className="an-summary-meta">{card.meta}</p>
            </motion.article>
          ))}
        </section>

        {!analytics.parceiro ? (
          <section className="an-empty-state-box">
            <h2>Sua empresa ainda não é parceira</h2>
            <p>
              A empresa se torna parceira quando possui pelo menos um ambiente cadastrado e efetuou o pagamento.
              Assim que o primeiro ambiente for criado, os indicadores e acessos aparecerão aqui.
            </p>
          </section>
        ) : (
          <>
            <section className="an-insights-grid">
              <article className="an-insight-panel">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Top desempenho</span>
                    <h2>Ambientes com mais tração</h2>
                  </div>
                </div>

                {analyticsView.topAmbientes.length === 0 ? (
                  <p className="an-empty-text">Nenhum ambiente encontrado para esta empresa.</p>
                ) : (
                  <div className="an-top-list">
                    {analyticsView.topAmbientes.slice(0, 4).map((ambiente, index) => (
                      <div key={ambiente.id} className="an-top-item">
                        <div className="an-top-rank">{String(index + 1).padStart(2, "0")}</div>
                        <div className="an-top-content">
                          <div className="an-top-title-row">
                            <strong>{ambiente.titulo}</strong>
                            <span className={`an-chip ${ambiente.publico ? "is-public" : "is-private"}`}>
                              {ambiente.publico ? "Público" : "Privado"}
                            </span>
                          </div>

                          <div className="an-top-metrics">
                            <span>{ambiente.visualizacoes} views totais</span>
                            <span>{ambiente.recentViews} no período</span>
                            <span>Último acesso {formatarDataRelativa(ambiente.lastAccess)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="an-insight-panel">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Origem dos acessos</span>
                    <h2>Ranking geográfico recente</h2>
                  </div>
                </div>

                {analyticsView.locationRanking.length === 0 ? (
                  <p className="an-empty-text">Ainda não há acessos suficientes para montar o ranking.</p>
                ) : (
                  <div className="an-location-list">
                    {analyticsView.locationRanking.map((item) => (
                      <div key={item.label} className="an-location-item">
                        <div className="an-location-top">
                          <span>
                            <FiMapPin /> {item.label}
                          </span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="an-location-bar">
                          <span style={{ width: `${Math.max(item.percentage, 8)}%` }} />
                        </div>
                        <small>{Math.round(item.percentage)}% do volume recente</small>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <section className="an-data-grid">
              <article className="an-section-card">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Desempenho detalhado</span>
                    <h2>Ambientes com mais acessos</h2>
                  </div>
                  <span className="an-section-note">Ordenados por visualizações totais</span>
                </div>

                {analytics.ambientes.length === 0 ? (
                  <p className="an-empty-text">Nenhum ambiente encontrado para esta empresa.</p>
                ) : (
                  <div className="an-table">
                    <div className="an-table-head an-table-row">
                      <span>#</span>
                      <span>Ambiente</span>
                      <span>Status</span>
                      <span>Views</span>
                      <span>No período</span>
                      <span>Criado em</span>
                    </div>

                    {analyticsView.topAmbientes.map((ambiente, index) => (
                      <div key={ambiente.id} className="an-table-row">
                        <span>{index + 1}</span>
                        <span>{ambiente.titulo}</span>
                        <span>{ambiente.publico ? "Público" : "Privado"}</span>
                        <span>{ambiente.visualizacoes}</span>
                        <span>{ambiente.recentViews}</span>
                        <span>{formatarData(ambiente.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="an-section-card">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Atividade recente</span>
                    <h2>Acessos mais recentes</h2>
                  </div>
                  <span className="an-section-note">
                    {filteredAcessos.length} registros no período selecionado
                  </span>
                </div>

                {analytics.acessosRecentes.length === 0 ? (
                  <p className="an-empty-text">Ainda não há acessos registrados para os ambientes.</p>
                ) : (
                  <div className="an-access-list">
                    {analytics.acessosRecentes.slice(0, 20).map((acesso) => (
                      <div key={acesso.id} className="an-access-item">
                        <div className="an-access-top">
                          <strong>{acesso.ambienteTitulo}</strong>
                          <span>{formatarData(acesso.createdAt)}</span>
                        </div>

                        <div className="an-access-meta">
                          <span>IP: {formatarIp(acesso.ip)}</span>
                          <span>{formatarLocalizacao(acesso.cidade, acesso.pais)}</span>
                        </div>

                        <p className="an-access-user-agent">{formatarUserAgent(acesso.userAgent)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
