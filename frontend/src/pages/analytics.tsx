import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiActivity,
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
import { API_URL } from "../utils/apiConfig";
import "../styles/analytics.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

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

function detectarDispositivo(userAgent?: string): TipoDispositivo {
  if (!userAgent) return "desconhecido";

  const ua = userAgent.toLowerCase();

  if (/ipad/.test(ua)) return "tablet";
  if (/android/.test(ua) && !/mobile/.test(ua)) return "tablet";

  if (/iphone|ipod|android|mobile|blackberry|webos/.test(ua)) return "celular";

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

function buildDailyTrend(
  acessos: AnalyticsAcessoRecente[],
  period: PeriodValue
): number[] {
  const days = Number(period);
  const buckets = new Array<number>(days).fill(0);
  const startMs = getStartDate(period).getTime();

  acessos.forEach((acesso) => {
    const createdAt = new Date(acesso.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return;
    }

    const dayIndex = Math.floor(
      (createdAt.getTime() - startMs) / (24 * 60 * 60 * 1000)
    );

    if (dayIndex >= 0 && dayIndex < days) {
      buckets[dayIndex] += 1;
    }
  });

  return buckets;
}

/** Sparkline SVG — linha contínua neon, sem eixos visíveis. */
function Sparkline({
  values,
  width = 320,
  height = 76,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const linePath = useMemo(() => {
    if (values.length === 0) {
      return "";
    }

    const max = Math.max(...values, 1);
    const stepX = width / Math.max(values.length - 1, 1);
    const stepY = (height - 8) / Math.max(max, 1);

    return values
      .map((value, index) => {
        const x = (index * stepX).toFixed(2);
        const y = (height - 4 - value * stepY).toFixed(2);
        return `${index === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ");
  }, [values, width, height]);

  const areaPath = useMemo(() => {
    if (!linePath) return "";
    const firstX = 0;
    const lastX = width;
    const baseY = height;
    return `${linePath} L${lastX.toFixed(2)} ${baseY} L${firstX.toFixed(2)} ${baseY} Z`;
  }, [linePath, width, height]);

  if (values.length === 0) {
    return (
      <svg
        className="tj-an-spark"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        aria-hidden="true"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          className="tj-an-spark-flat"
        />
      </svg>
    );
  }

  return (
    <svg
      className="tj-an-spark"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tj-an-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#tj-an-spark-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - 4 - values[values.length - 1] * ((height - 8) / Math.max(Math.max(...values, 1), 1))}
        r="4"
        fill="currentColor"
        className="tj-an-spark-dot"
      />
    </svg>
  );
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

  const trendValues = useMemo(
    () => (analytics ? buildDailyTrend(analytics.acessosRecentes, period) : []),
    [analytics, period]
  );

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
      <div className="tj-an-page tj-an-loading">
        <motion.div
          className="tj-an-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          ANALYTICS
        </motion.div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="tj-an-page">
        <div className="tj-an-content">
          <div className="tj-an-empty">
            <p>{error || "Nenhum dado disponível."}</p>
          </div>
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
      values: trendValues,
      tone: "cyan" as const,
    },
    {
      label: "Ambientes ativos",
      value: analytics.resumo.totalAmbientes,
      meta: `${analytics.resumo.totalToursPublicos} públicos disponíveis`,
      icon: <FiLayers />,
      values: analyticsView.topAmbientes.map((ambiente) => ambiente.visualizacoes).slice(0, 30),
      tone: "violet" as const,
    },
    {
      label: "Visitas da empresa",
      value: analyticsView.visitasEmpresaPeriodo,
      meta: `Última atividade ${analyticsView.latestAccessLabel}`,
      icon: <FiActivity />,
      values: trendValues.map((value) => Math.max(value, 1)),
      tone: "mint" as const,
    },
    {
      label: "Alcance geográfico",
      value: analyticsView.activeCountries,
      meta: "origens com maior presença recente",
      icon: <FiGlobe />,
      values: analyticsView.locationRanking.map((item) => item.count).slice(0, 30),
      tone: "gold" as const,
    },
  ];

  return (
    <div className="tj-an-page">
      <div className="tj-an-bg" aria-hidden="true">
        <span className="tj-an-orb tj-an-orb--one" />
        <span className="tj-an-orb tj-an-orb--two" />
        <span className="tj-an-orb tj-an-orb--three" />
      </div>

      <main className="tj-an-content">
        {/* ============ HERO MINIMALISTA ============ */}
        <header className="tj-an-hero">
          <motion.div
            className="tj-an-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Estatísticas</span>
            <span className="tj-an-dot" />
            <span>{analytics.empresa?.nome || "visão geral"}</span>
          </motion.div>

          <motion.h1
            className="tj-an-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Onde está a atenção
            <br />
            dos seus visitantes.
          </motion.h1>

          <motion.p
            className="tj-an-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Acompanhe o desempenho dos ambientes em linhas de tendência contínuas —
            sem eixos, sem tabelas, sem ruído.
          </motion.p>

          <motion.div
            className="tj-an-toolbar"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            <label className="tj-an-filter">
              <span>Recorte</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodValue)}>
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <span className={`tj-an-badge${analytics.parceiro ? " is-partner" : " is-not-partner"}`}>
              <span className="tj-an-glow-dot" />
              {analytics.parceiro ? "Parceiro ativo" : "Aguardando primeiro ambiente"}
            </span>
          </motion.div>
        </header>

        {/* ============ NÚMEROS GIGANTES COM SPARKLINES ============ */}
        <section className="tj-an-meter-grid">
          {summaryCards.map((card, index) => (
            <motion.article
              key={card.label}
              className={`tj-an-meter tj-an-meter--${card.tone}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: TJ_EASE, delay: 0.1 + index * 0.07 }}
            >
              <div className="tj-an-meter-top">
                <span className="tj-an-meter-label">{card.label}</span>
                <span className="tj-an-meter-icon">{card.icon}</span>
              </div>

              <strong className="tj-an-meter-value">{card.value}</strong>

              <div className="tj-an-meter-spark">
                <Sparkline values={card.values} width={300} height={64} />
              </div>

              <p className="tj-an-meter-meta">{card.meta}</p>
            </motion.article>
          ))}
        </section>

        {!analytics.parceiro ? (
          <section className="tj-an-empty">
            <span className="tj-an-eyebrow">Aguardando ativação</span>
            <h2>Sua empresa ainda não é parceira</h2>
            <p>
              A empresa se torna parceira quando possui pelo menos um ambiente cadastrado e efetuou o pagamento.
              Assim que o primeiro ambiente for criado, os indicadores e acessos aparecerão aqui.
            </p>
          </section>
        ) : (
          <>
            {/* ============ DESTAQUE ============ */}
            <section className="tj-an-focus">
              <motion.div
                className="tj-an-focus-main"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.15 }}
              >
                <span className="tj-an-eyebrow">Destaque</span>
                <h2>{analyticsView.topAmbiente?.titulo || "Sem ambiente líder definido"}</h2>
                <p>{analyticsView.insightText}</p>
              </motion.div>

              <motion.div
                className="tj-an-focus-side"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.22 }}
              >
                <span className="tj-an-trend">
                  <FiTrendingUp />
                  {formatPercent(analyticsView.crescimentoVisualizacoes)}
                </span>
                <span className="tj-an-focus-note">{analyticsView.alertText}</span>
              </motion.div>
            </section>

            {/* ============ RANKINGS TIPOGRÁFICOS ============ */}
            <section className="tj-an-sections">
              <article className="tj-an-block">
                <div className="tj-an-block-head">
                  <span className="tj-an-eyebrow">Mais acessados</span>
                  <h2>Ambientes que chamam atenção</h2>
                </div>

                <div className="tj-an-rank-list">
                  {analyticsView.topAmbientes.slice(0, 5).map((ambiente, index) => (
                    <div key={ambiente.id} className="tj-an-rank">
                      <span className="tj-an-rank-index">{String(index + 1).padStart(2, "0")}</span>
                      <div className="tj-an-rank-main">
                        <strong>{ambiente.titulo}</strong>
                        <span className="tj-an-rank-meta">
                          {ambiente.recentViews} no período · {ambiente.visualizacoes} totais
                        </span>
                      </div>
                      <span className={`tj-an-glow-dot tj-an-glow-dot--${ambiente.publico ? "public" : "private"}`} />
                      <span className="tj-an-rank-value">{Math.round(ambiente.share)}%</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="tj-an-block">
                <div className="tj-an-block-head">
                  <span className="tj-an-eyebrow">De onde acessam</span>
                  <h2>Locais com mais visitas recentes</h2>
                </div>

                <div className="tj-an-rank-list">
                  {analyticsView.locationRanking.length === 0 ? (
                    <p className="tj-an-empty-text">Ainda não há acessos suficientes para montar o ranking.</p>
                  ) : (
                    analyticsView.locationRanking.map((item, index) => (
                      <div key={item.label} className="tj-an-rank">
                        <span className="tj-an-rank-index">{String(index + 1).padStart(2, "0")}</span>
                        <div className="tj-an-rank-main">
                          <strong>
                            <FiMapPin /> {item.label}
                          </strong>
                          <span className="tj-an-rank-meta">{item.count} acessos no período</span>
                        </div>
                        <span className="tj-an-progress">
                          <span style={{ width: `${Math.max(item.percentage, 4)}%` }} />
                        </span>
                        <span className="tj-an-rank-value">{Math.round(item.percentage)}%</span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            {/* ============ DISPOSITIVOS + PERMANÊNCIA ============ */}
            <section className="tj-an-sections">
              <article className="tj-an-block">
                <div className="tj-an-block-head">
                  <span className="tj-an-eyebrow">Dispositivos</span>
                  <h2>Distribuição entre celular, computador e tablet</h2>
                </div>

                {analyticsView.dispositivos.length === 0 ? (
                  <p className="tj-an-empty-text">Ainda não há acessos registrados para calcular a distribuição.</p>
                ) : (
                  <div className="tj-an-device-list">
                    {analyticsView.dispositivos.map((dispositivo) => (
                      <div key={dispositivo.tipo} className="tj-an-device">
                        <div className="tj-an-device-top">
                          <span className="tj-an-device-label">
                            <span className="tj-an-device-icon">{dispositivo.icon}</span>
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
                        <span className="tj-an-progress">
                          <span style={{ width: `${Math.max(dispositivo.percentage, 4)}%` }} />
                        </span>
                        <small>{Math.round(dispositivo.percentage)}% dos acessos</small>
                      </div>
                    ))}
                  </div>
                )}

                {analyticsView.dispositivoInsight && (
                  <p className="tj-an-insight">{analyticsView.dispositivoInsight}</p>
                )}
              </article>

              <article className="tj-an-block">
                <div className="tj-an-block-head">
                  <span className="tj-an-eyebrow">Tempo de permanência</span>
                  <h2>Tempo médio dos visitantes em cada ambiente</h2>
                </div>

                {analytics.ambientes.length === 0 ? (
                  <p className="tj-an-empty-text">Nenhum ambiente encontrado para esta empresa.</p>
                ) : (
                  <div className="tj-an-rank-list">
                    {analytics.ambientes.map((ambiente, index) => {
                      const permanencia = analytics.tempoPermanencia[ambiente.id];
                      const hasData = permanencia && permanencia.mediana !== null;

                      return (
                        <div key={ambiente.id} className="tj-an-rank">
                          <span className="tj-an-rank-index">{String(index + 1).padStart(2, "0")}</span>
                          <div className="tj-an-rank-main">
                            <strong>{ambiente.titulo}</strong>
                            <span className="tj-an-rank-meta">
                              {hasData
                                ? `${permanencia.mediana}s (mediana)`
                                : permanencia?.interpretacao || "Aguardando dados"}
                            </span>
                          </div>
                          <span
                            className={`tj-an-glow-dot tj-an-glow-dot--${
                              hasData
                                ? permanencia.interpretacao === "Baixa permanência"
                                  ? "low"
                                  : permanencia.interpretacao === "Permanência moderada"
                                  ? "mid"
                                  : permanencia.interpretacao === "Boa permanência"
                                  ? "good"
                                  : "great"
                                : "neutral"
                            }`}
                          />
                          <span className="tj-an-rank-value">
                            <FiClock /> {hasData ? `${permanencia.mediana}s` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {analytics.ambientes.some((ambiente) => {
                  const permanencia = analytics.tempoPermanencia[ambiente.id];
                  return permanencia?.recomendacao;
                }) ? (
                  <div className="tj-an-tips">
                    {analytics.ambientes.map((ambiente) => {
                      const permanencia = analytics.tempoPermanencia[ambiente.id];
                      if (!permanencia?.recomendacao) return null;
                      return (
                        <p key={ambiente.id} className="tj-an-tip">
                          <strong>{ambiente.titulo}:</strong> {permanencia.recomendacao}
                        </p>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            </section>

            {/* ============ ATIVIDADE RECENTE — LISTA TIPOGRÁFICA ============ */}
            <section className="tj-an-block">
              <div className="tj-an-block-head">
                <div>
                  <span className="tj-an-eyebrow">Atividade recente</span>
                  <h2>Acessos mais recentes</h2>
                </div>
                <span className="tj-an-note">
                  {filteredAcessos.length} registros no período selecionado
                </span>
              </div>

              {analytics.acessosRecentes.length === 0 ? (
                <p className="tj-an-empty-text">Ainda não há acessos registrados para os ambientes.</p>
              ) : (
                <div className="tj-an-timeline">
                  {analytics.acessosRecentes.slice(0, 14).map((acesso) => (
                    <div key={acesso.id} className="tj-an-timeline-row">
                      <span className="tj-an-timeline-dot" />
                      <div className="tj-an-timeline-main">
                        <strong>{acesso.ambienteTitulo}</strong>
                        <span>{formatarUserAgent(acesso.userAgent)}</span>
                      </div>
                      <div className="tj-an-timeline-meta">
                        <span>{formatarLocalizacao(acesso.cidade, acesso.pais)}</span>
                        <span>{formatarDataRelativa(acesso.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
