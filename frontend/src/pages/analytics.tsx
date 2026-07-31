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
  FiMonitor,
  FiSmartphone,
  FiTablet,
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

interface TempoPermanencia {
  mediana: number | null;
  amostrasValidas: number;
  interpretacao: string;
  recomendacao: string | null;
}

interface AnalyticsResponse {
  parceiro: boolean;
  empresa: AnalyticsEmpresa | null;
  resumo: AnalyticsResumo;
  ambientes: AnalyticsAmbiente[];
  acessosRecentes: AnalyticsAcessoRecente[];
  tempoPermanencia: Record<number, TempoPermanencia>;
}

type TipoDispositivo = "computador" | "celular" | "tablet" | "desconhecido";

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

function detectarDispositivo(userAgent?: string): TipoDispositivo {
  if (!userAgent) return "desconhecido";

  const ua = userAgent.toLowerCase();

  // Tablet: iPad or Android tablet (Android without "mobile" in UA)
  if (/ipad/.test(ua)) return "tablet";
  if (/android/.test(ua) && !/mobile/.test(ua)) return "tablet";

  // Celular: common mobile indicators
  if (/iphone|ipod|android|mobile|blackberry|webos/.test(ua)) return "celular";

  // Computador: everything else with a known OS/browser
  if (/windows|mac os|linux|cros/.test(ua)) return "computador";

  return "desconhecido";
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
        dispositivos: [] as Array<{ tipo: TipoDispositivo; count: number; percentage: number; icon: React.ReactNode }>,
        dispositivoInsight: "",
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

    // Device distribution
    const dispositivoMap = new Map<TipoDispositivo, number>();
    const DISPOSITIVO_ORDER: TipoDispositivo[] = ["celular", "computador", "tablet", "desconhecido"];

    filteredAcessos.forEach((acesso) => {
      const tipo = detectarDispositivo(acesso.userAgent);
      dispositivoMap.set(tipo, (dispositivoMap.get(tipo) || 0) + 1);
    });

    const dispositivos = DISPOSITIVO_ORDER
      .filter((tipo) => dispositivoMap.has(tipo))
      .map((tipo) => ({
        tipo,
        count: dispositivoMap.get(tipo)!,
        percentage: filteredAcessos.length > 0
          ? (dispositivoMap.get(tipo)! / filteredAcessos.length) * 100
          : 0,
        icon:
          tipo === "celular" ? <FiSmartphone /> :
          tipo === "computador" ? <FiMonitor /> :
          tipo === "tablet" ? <FiTablet /> :
          <FiMonitor />,
      }));

    // Device insight
    let dispositivoInsight = "Ainda não há dados de dispositivo para gerar uma análise.";
    if (dispositivos.length > 0) {
      const topDevice = dispositivos[0];
      const mobileCount = (dispositivoMap.get("celular") || 0) + (dispositivoMap.get("tablet") || 0);
      const mobilePercent = filteredAcessos.length > 0 ? (mobileCount / filteredAcessos.length) * 100 : 0;
      const desktopPercent = filteredAcessos.length > 0
        ? ((dispositivoMap.get("computador") || 0) / filteredAcessos.length) * 100
        : 0;

      if (mobilePercent >= 60) {
        dispositivoInsight = `A maioria dos acessos (${Math.round(mobilePercent)}%) vem de dispositivos móveis. Certifique-se de que seus tours e ambientes estejam otimizados para telas menores e navegação touch.`;
      } else if (desktopPercent >= 60) {
        dispositivoInsight = `O acesso é predominantemente via computador (${Math.round(desktopPercent)}%). A experiência em telas grandes está bem aproveitada — considere destacar elementos visuais e tours com mais detalhes.`;
      } else if (topDevice.tipo === "celular") {
        dispositivoInsight = `Celular lidera com ${Math.round(topDevice.percentage)}% dos acessos. A navegação mobile é o principal ponto de contato com seus visitantes — priorize carregamento rápido e botões acessíveis.`;
      } else if (topDevice.tipo === "computador") {
        dispositivoInsight = `Computador lidera com ${Math.round(topDevice.percentage)}% dos acessos. Seus visitantes exploram os ambientes com mais calma em telas grandes — tours detalhados tendem a performar bem.`;
      } else if (topDevice.tipo === "tablet") {
        dispositivoInsight = `Tablet representa ${Math.round(topDevice.percentage)}% dos acessos — um meio-termo entre mobilidade e imersão. Garanta que a interface se adapte bem a resoluções intermediárias.`;
      } else {
        dispositivoInsight = `Há uma distribuição equilibrada entre dispositivos. Mantenha a experiência consistente em celular, computador e tablet.`;
      }
    }

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

    let insightText = "Ainda não há dados suficientes para gerar uma análise.";
    if (topAmbiente && topAmbiente.visualizacoes > 0) {
      insightText = `"${topAmbiente.titulo}" concentra ${Math.round(
        topAmbiente.share
      )}% das visualizações totais e lidera a atenção entre os ambientes.`;
    } else if (locationRanking[0]) {
      insightText = `${locationRanking[0].label} é a origem com mais acessos neste período, com ${Math.round(
        locationRanking[0].percentage
      )}% das visitas recentes.`;
    }

    let alertText = "Números estáveis no período, sem mudanças bruscas.";
    if (crescimentoVisualizacoes >= 25) {
      alertText = `As visualizações cresceram ${formatPercent(
        crescimentoVisualizacoes
      )} no período. Pode ser um bom momento para destacar o ambiente líder.`;
    } else if (crescimentoVisualizacoes <= -20) {
      alertText = `As visualizações caíram ${formatPercent(
        crescimentoVisualizacoes
      )} no período. Vale revisar a divulgação ou destacar ambientes públicos.`;
    } else if (recentPublicViews > 0 && visualizacoesPeriodo > 0) {
      alertText = `${Math.round(
        (recentPublicViews / visualizacoesPeriodo) * 100
      )}% dos acessos recentes vieram de tours públicos.`;
    }

    return {
      filteredAcessos,
      topAmbientes,
      locationRanking,
      dispositivos,
      dispositivoInsight,
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
            Carregando estatísticas...
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
            <span className="an-eyebrow">Estatísticas · visão geral</span>
            <h1 className="an-title">Acompanhe o desempenho dos seus ambientes.</h1>
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
              <span className="an-panel-kicker">Resumo</span>
              <span className="an-panel-period">
                {PERIOD_OPTIONS.find((option) => option.value === period)?.label}
              </span>
            </div>

            <div className="an-highlight">
              <div>
                <span className="an-mini-label">Destaque</span>
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
                <span className="an-mini-label">Fique de olho</span>
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
              <article className="an-section-card">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Dispositivos utilizados</span>
                    <h2>Distribuição entre celular, computador e tablet</h2>
                  </div>
                  <span className="an-section-note">
                    {analyticsView.dispositivos.length > 0
                      ? `${analyticsView.filteredAcessos.length} acessos analisados`
                      : "Sem dados de dispositivo no período"}
                  </span>
                </div>

                {analyticsView.dispositivos.length === 0 ? (
                  <p className="an-empty-text">Ainda não há acessos registrados para calcular a distribuição de dispositivos.</p>
                ) : (
                  <div className="an-device-list">
                    {analyticsView.dispositivos.map((dispositivo) => (
                      <div key={dispositivo.tipo} className="an-device-item">
                        <div className="an-device-top">
                          <span className="an-device-label">
                            <span className="an-device-icon">{dispositivo.icon}</span>
                            {dispositivo.tipo === "celular"
                              ? "Celular"
                              : dispositivo.tipo === "computador"
                              ? "Computador"
                              : dispositivo.tipo === "tablet"
                              ? "Tablet"
                              : "Não identificado"}
                          </span>
                          <strong>{dispositivo.count}</strong>
                        </div>
                        <div className="an-device-bar">
                          <span style={{ width: `${Math.max(dispositivo.percentage, 6)}%` }} />
                        </div>
                        <small>{Math.round(dispositivo.percentage)}% dos acessos</small>
                      </div>
                    ))}
                  </div>
                )}

                {analyticsView.dispositivoInsight && (
                  <div className="an-device-insight">
                    <FiArrowUpRight />
                    <p>{analyticsView.dispositivoInsight}</p>
                  </div>
                )}
              </article>

              <article className="an-insight-panel">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">De onde acessam</span>
                    <h2>Locais com mais visitas recentes</h2>
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

            <section className="an-insights-grid">
              <article className="an-insight-panel">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Mais acessados</span>
                    <h2>Ambientes que mais chamam atenção</h2>
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

              <article className="an-section-card">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Tempo de permanência</span>
                    <h2>Tempo médio dos visitantes em cada ambiente</h2>
                  </div>
                  <span className="an-section-note">
                    Baseado na mediana (descarta cliques com menos de 5s)
                  </span>
                </div>

                {analytics.ambientes.length === 0 ? (
                  <p className="an-empty-text">Nenhum ambiente encontrado para esta empresa.</p>
                ) : (
                  <div className="an-top-list">
                    {analytics.ambientes.map((ambiente) => {
                      const permanencia = analytics.tempoPermanencia[ambiente.id];
                      const hasData = permanencia && permanencia.mediana !== null;

                      const interpretacaoClass =
                        permanencia?.interpretacao === "Baixa permanência"
                          ? "an-dwell-low"
                          : permanencia?.interpretacao === "Permanência moderada"
                          ? "an-dwell-moderate"
                          : permanencia?.interpretacao === "Boa permanência"
                          ? "an-dwell-good"
                          : permanencia?.interpretacao === "Excelente permanência"
                          ? "an-dwell-excellent"
                          : "an-dwell-none";

                      return (
                        <div key={ambiente.id} className="an-top-item">
                          <div className="an-top-rank">
                            <FiClock />
                          </div>
                          <div className="an-top-content">
                            <div className="an-top-title-row">
                              <strong>{ambiente.titulo}</strong>
                              <span className={`an-chip ${interpretacaoClass}`}>
                                {hasData ? permanencia.interpretacao : "Aguardando dados"}
                              </span>
                            </div>

                            <div className="an-top-metrics">
                              {hasData ? (
                                <>
                                  <span>
                                    {permanencia.mediana}s (mediana)
                                  </span>
                                  <span>
                                    {permanencia.amostrasValidas} visita{permanencia.amostrasValidas !== 1 ? "s" : ""} válida{permanencia.amostrasValidas !== 1 ? "s" : ""}
                                  </span>
                                </>
                              ) : (
                                <span>
                                  {permanencia?.interpretacao || "Sem dados suficientes"}
                                </span>
                              )}
                            </div>

                            {hasData && permanencia.recomendacao && (
                              <div className="an-dwell-recommendation">
                                <FiArrowUpRight />
                                <span>{permanencia.recomendacao}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>

            <section className="an-data-grid">
              <article className="an-section-card">
                <div className="an-section-head">
                  <div>
                    <span className="an-section-kicker">Visão completa</span>
                    <h2>Todos os ambientes</h2>
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
