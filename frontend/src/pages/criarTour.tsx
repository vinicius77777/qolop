// src/pages/criarTour.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiUploadCloud,
} from "react-icons/fi";
import { createAmbiente } from "../services/api";
import { API_URL } from "../utils/apiConfig";
import "leaflet/dist/leaflet.css";
import "../styles/criarTour.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

type LocationStatusTone = "idle" | "loading" | "success" | "warning";
type StepperStep = "dados" | "local" | "revisao";

interface CriarTourNavigationState {
  clienteNome?: string;
  clienteEmail?: string;
  pedidoId?: string | number;
  pedidoLocal?: string;
  pedidoCep?: string;
  pedidoMensagem?: string;
  pedidoTelefone?: string;
  pedidoEmpresaNome?: string;
}

interface NominatimResult {
  place_id?: number;
  lat: string;
  lon: string;
  display_name?: string;
  address?: Record<string, string>;
}

interface LocationSuggestion {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  label: string;
  isApproximate: boolean;
  radius: number;
}

interface SelectedLocation {
  id: string;
  latitude: number;
  longitude: number;
  source: "search" | "manual";
  label: string;
  isApproximate: boolean;
  radius: number;
}

type ToastState = { tone: "success" | "error"; message: string } | null;

const DEFAULT_COUNTRY = "Brasil";
const DEFAULT_MAP_CENTER: [number, number] = [-22.2521, -45.7036];
const DEFAULT_MAP_ZOOM = 15;
const SELECTED_ZOOM_EXACT = 18;
const SELECTED_ZOOM_APPROX = 16;
const SELECTED_ZOOM_MANUAL = 19;

const STEPPER_ORDER: StepperStep[] = ["dados", "local", "revisao"];

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

async function requestGeocode(params: URLSearchParams) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/geocode/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return response;
}

function normalizeText(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeCategoria(value: string) {
  return normalizeText(value);
}

function extractCidadeFromEndereco(value?: string) {
  if (!value) return "";
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }

  return parts[0] || "";
}

function buildSearchQuery({
  endereco,
  cep,
  cidade,
  pais,
}: {
  endereco: string;
  cep: string;
  cidade: string;
  pais: string;
}) {
  return [endereco, cep, cidade, pais].filter((value) => value.trim()).join(", ");
}

function splitAddressParts(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getAddressFallbackQueries({
  endereco,
  cep,
  cidade,
  pais,
}: {
  endereco: string;
  cep: string;
  cidade: string;
  pais: string;
}) {
  const trimmedEndereco = endereco.trim();
  const trimmedCep = cep.trim();
  const trimmedCidade = cidade.trim();
  const trimmedPais = pais.trim();
  const enderecoPartes = splitAddressParts(trimmedEndereco);
  const ruaPrincipal = enderecoPartes[0] || trimmedEndereco;
  const bairroOuComplemento =
    enderecoPartes.length > 2
      ? enderecoPartes[enderecoPartes.length - 2]
      : enderecoPartes.length > 1
      ? enderecoPartes[1]
      : "";
  const cidadeInferida =
    trimmedCidade || (enderecoPartes.length > 1 ? enderecoPartes[enderecoPartes.length - 1] : "");
  const queries = [
    {
      query: [trimmedEndereco, cidadeInferida, trimmedPais].filter(Boolean).join(", "),
      approximate: false,
      radius: 0,
    },
    {
      query: [trimmedEndereco, trimmedCep, cidadeInferida, trimmedPais].filter(Boolean).join(", "),
      approximate: false,
      radius: 0,
    },
    {
      query: [ruaPrincipal, cidadeInferida, trimmedPais].filter(Boolean).join(", "),
      approximate: true,
      radius: 180,
    },
    {
      query: [bairroOuComplemento, cidadeInferida, trimmedPais].filter(Boolean).join(", "),
      approximate: true,
      radius: 500,
    },
    {
      query: [trimmedCep, cidadeInferida, trimmedPais].filter(Boolean).join(", "),
      approximate: true,
      radius: 1200,
    },
    {
      query: [cidadeInferida, trimmedPais].filter(Boolean).join(", "),
      approximate: true,
      radius: 3500,
    },
    {
      query: [trimmedEndereco, trimmedPais].filter(Boolean).join(", "),
      approximate: true,
      radius: 900,
    },
    {
      query: buildSearchQuery({
        endereco: trimmedEndereco,
        cep: trimmedCep,
        cidade: cidadeInferida,
        pais: trimmedPais,
      }),
      approximate: true,
      radius: 2000,
    },
  ];

  const seen = new Set<string>();

  return queries.filter((item) => {
    const normalized = normalizeText(item.query);
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function getResultTitle(result: NominatimResult) {
  const address = result.address || {};
  const cidade =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county;

  return (
    [address.road, address.house_number, address.suburb || address.neighbourhood, cidade]
      .filter(Boolean)
      .join(", ") ||
    result.display_name ||
    "Endereço encontrado"
  );
}

function getResultSubtitle(result: NominatimResult, approximate: boolean) {
  const address = result.address || {};
  const cidade =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county;

  return [
    approximate ? "Área aproximada" : "Localização encontrada",
    address.postcode,
    cidade,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildSuggestion(
  result: NominatimResult,
  approximate: boolean,
  radiusOverride?: number
): LocationSuggestion | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: String(result.place_id || `${latitude}:${longitude}:${approximate ? "approx" : "exact"}`),
    latitude,
    longitude,
    title: getResultTitle(result),
    subtitle: getResultSubtitle(result, approximate),
    label: result.display_name || getResultTitle(result),
    isApproximate: approximate,
    radius: approximate ? radiusOverride || 250 : 0,
  };
}

async function searchAddressSuggestions({
  endereco,
  cep,
  cidade,
  pais,
}: {
  endereco: string;
  cep: string;
  cidade: string;
  pais: string;
}) {
  const queries = getAddressFallbackQueries({ endereco, cep, cidade, pais });

  if (!queries.length) {
    return [];
  }

  const uniqueSuggestions = new Map<string, LocationSuggestion>();

  for (const { query, approximate, radius } of queries) {
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      limit: "6",
      dedupe: "1",
      q: query,
    });

    const response = await requestGeocode(params);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Muitas buscas em sequência. Aguarde alguns segundos e tente novamente.");
      }

      continue;
    }

    const results = (await response.json()) as NominatimResult[];

    if (!Array.isArray(results) || results.length === 0) {
      continue;
    }

    results.forEach((result, index) => {
      const suggestion = buildSuggestion(result, approximate || index > 0, radius);
      if (!suggestion) return;

      const key = `${suggestion.latitude.toFixed(5)}:${suggestion.longitude.toFixed(5)}`;
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, suggestion);
      }
    });
  }

  return Array.from(uniqueSuggestions.values());
}

function SelecionadorMapa({
  position,
  onSelect,
}: {
  position: [number, number] | null;
  onSelect: (coords: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return position ? <Marker position={position} icon={markerIcon} /> : null;
}

function MapViewportController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  return null;
}

export default function CriarTour() {
  const location = useLocation();
  const navState = useMemo(
    () => (location.state || {}) as CriarTourNavigationState,
    [location.state]
  );
  const prefillAppliedRef = useRef(false);

  const clienteEmail = navState.clienteEmail;

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [linkVR, setLinkVR] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [categoria, setCategoria] = useState("");
  const [cidade, setCidade] = useState("");
  const [pais, setPais] = useState(DEFAULT_COUNTRY);
  const [endereco, setEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [publico, setPublico] = useState(true);
  const [imagem, setImagem] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [sugestoesEndereco, setSugestoesEndereco] = useState<LocationSuggestion[]>([]);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<SelectedLocation | null>(null);
  const [latitudeManual, setLatitudeManual] = useState("");
  const [longitudeManual, setLongitudeManual] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [localizacaoConfirmada, setLocalizacaoConfirmada] = useState("");
  const [locationStatus, setLocationStatus] = useState<{
    tone: LocationStatusTone;
    text: string;
  }>({
    tone: "idle",
    text: "Preencha os dados, busque o endereço e selecione uma sugestão ou clique no mapa para definir o ponto.",
  });

  const [toast, setToast] = useState<ToastState>(null);
  const [activeStep, setActiveStep] = useState<StepperStep>("dados");

  const prefillInfo = useMemo(() => {
    const partes = [navState.pedidoEmpresaNome, navState.clienteNome].filter(Boolean);
    const tituloInicial = partes.length
      ? `Tour ${partes.join(" • ")}`
      : navState.pedidoId
      ? `Tour pedido #${navState.pedidoId}`
      : "";

    const descricaoPartes = [navState.pedidoMensagem?.trim()].filter(Boolean);

    return {
      tituloInicial,
      descricaoInicial: descricaoPartes.join("\n"),
      enderecoInicial: navState.pedidoLocal?.trim() || "",
      cepInicial: navState.pedidoCep?.trim() || "",
      cidadeInicial: extractCidadeFromEndereco(navState.pedidoLocal),
      possuiPrefill:
        Boolean(navState.pedidoLocal) ||
        Boolean(navState.pedidoCep) ||
        Boolean(navState.pedidoMensagem) ||
        Boolean(navState.clienteNome) ||
        Boolean(navState.pedidoEmpresaNome),
    };
  }, [navState]);

  useEffect(() => {
    if (prefillAppliedRef.current) {
      return;
    }

    if (prefillInfo.tituloInicial) {
      setTitulo((prev) => prev || prefillInfo.tituloInicial);
    }

    if (prefillInfo.descricaoInicial) {
      setDescricao((prev) => prev || prefillInfo.descricaoInicial);
    }

    if (prefillInfo.enderecoInicial) {
      setEndereco((prev) => prev || prefillInfo.enderecoInicial);
    }

    if (prefillInfo.cepInicial) {
      setCep((prev) => prev || prefillInfo.cepInicial);
    }

    if (prefillInfo.cidadeInicial) {
      setCidade((prev) => prev || prefillInfo.cidadeInicial);
    }

    if (prefillInfo.possuiPrefill) {
      setLocationStatus({
        tone: "idle",
        text: "Dados do pedido foram carregados. Revise o endereço, busque no mapa e confirme o ponto antes de salvar.",
      });
    }

    prefillAppliedRef.current = true;
  }, [prefillInfo]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stepIndex = STEPPER_ORDER.indexOf(activeStep);

  function getStepState(step: StepperStep): "done" | "active" | "pending" {
    const index = STEPPER_ORDER.indexOf(step);
    if (index < stepIndex) return "done";
    if (index === stepIndex) return "active";
    return "pending";
  }

  function resetSelectedLocation() {
    setEnderecoSelecionado(null);
    setLocalizacaoConfirmada("");
  }

  function handleSelecionarSugestao(sugestao: LocationSuggestion) {
    const selecionado: SelectedLocation = {
      id: sugestao.id,
      latitude: sugestao.latitude,
      longitude: sugestao.longitude,
      source: "search",
      label: sugestao.label,
      isApproximate: sugestao.isApproximate,
      radius: sugestao.radius,
    };

    setEnderecoSelecionado(selecionado);
    setLatitudeManual(sugestao.latitude.toFixed(6));
    setLongitudeManual(sugestao.longitude.toFixed(6));
    setMapCenter([sugestao.latitude, sugestao.longitude]);
    setMapZoom(sugestao.isApproximate ? SELECTED_ZOOM_APPROX : SELECTED_ZOOM_EXACT);
    setLocalizacaoConfirmada(
      sugestao.isApproximate
        ? `Área aproximada selecionada: ${sugestao.label}.`
        : `Localização selecionada: ${sugestao.label}.`
    );
    setLocationStatus({
      tone: sugestao.isApproximate ? "warning" : "success",
      text: sugestao.isApproximate
        ? "Sugestão aproximada selecionada. Se quiser mais precisão, clique no ponto exato no mapa."
        : "Sugestão selecionada com sucesso. Você já pode salvar ou ajustar manualmente no mapa.",
    });
    setActiveStep("local");
  }

  async function handleBuscarEndereco() {
    const hasSearchData = [endereco, cep, cidade, pais].some((value) => value.trim());

    if (!hasSearchData) {
      setToast({ tone: "error", message: "Preencha endereço, CEP, cidade ou país para buscar." });
      return;
    }

    setBuscandoSugestoes(true);
    setSugestoesEndereco([]);
    resetSelectedLocation();
    setLocationStatus({
      tone: "loading",
      text: "Buscando sugestões de localização...",
    });

    try {
      const suggestions = await searchAddressSuggestions({
        endereco,
        cep,
        cidade,
        pais,
      });

      setSugestoesEndereco(suggestions);

      if (suggestions.length === 0) {
        setLocationStatus({
          tone: "warning",
          text: "Nenhuma correspondência clara foi encontrada. Você ainda pode clicar no mapa ou informar latitude e longitude manualmente.",
        });
        return;
      }

      const firstSuggestion = suggestions[0];
      setMapCenter([firstSuggestion.latitude, firstSuggestion.longitude]);
      setMapZoom(firstSuggestion.isApproximate ? SELECTED_ZOOM_APPROX : SELECTED_ZOOM_EXACT);
      handleSelecionarSugestao(firstSuggestion);
      setLocationStatus({
        tone: firstSuggestion.isApproximate ? "warning" : "success",
        text: firstSuggestion.isApproximate
          ? "Não temos certeza total do endereço, mas já mostramos no mapa o ponto mais provável para você ajustar."
          : "Encontramos uma localização provável e já mostramos no mapa para confirmação.",
      });
    } catch (error: any) {
      console.error(error);
      setLocationStatus({
        tone: "warning",
        text: "Erro ao buscar o endereço. Tente novamente ou marque o ponto manualmente no mapa.",
      });
      setToast({ tone: "error", message: error?.message || "Erro ao buscar o endereço." });
    } finally {
      setBuscandoSugestoes(false);
    }
  }

  function aplicarCoordenadasManuais(latitude: number, longitude: number, sourceLabel: string) {
    const selecionado: SelectedLocation = {
      id: `${sourceLabel}-${latitude}-${longitude}`,
      latitude,
      longitude,
      source: "manual",
      label: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      isApproximate: false,
      radius: 0,
    };

    setEnderecoSelecionado(selecionado);
    setLatitudeManual(latitude.toFixed(6));
    setLongitudeManual(longitude.toFixed(6));
    setMapCenter([latitude, longitude]);
    setMapZoom(SELECTED_ZOOM_MANUAL);
    setLocalizacaoConfirmada(`Ponto manual definido em ${latitude.toFixed(6)}, ${longitude.toFixed(6)}.`);
    setLocationStatus({
      tone: "success",
      text: "Ponto manual confirmado. Esse local será enviado ao salvar o tour.",
    });
    setActiveStep("local");
  }

  function dadosPreenchidos() {
    return Boolean(
      titulo.trim() &&
        descricao.trim() &&
        linkVR.trim() &&
        categoria.trim()
    );
  }

  function localConfirmado() {
    return Boolean(enderecoSelecionado);
  }

  function irParaLocal() {
    if (!dadosPreenchidos()) {
      setToast({ tone: "error", message: "Preencha título, descrição, link VR e categoria para continuar." });
      return;
    }
    setActiveStep("local");
  }

  function irParaRevisao() {
    if (!localConfirmado()) {
      setToast({ tone: "error", message: "Confirme a localização no mapa antes de revisar." });
      return;
    }
    setActiveStep("revisao");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!enderecoSelecionado) {
      setToast({ tone: "error", message: "Busque um endereço e selecione uma sugestão, ou marque o ponto manualmente no mapa antes de salvar." });
      return;
    }

    setLoading(true);
    setLocalizacaoConfirmada("");

    try {
      await createAmbiente({
        titulo,
        descricao,
        linkVR,
        siteUrl,
        categoria: normalizeCategoria(categoria),
        cidade,
        pais,
        endereco,
        cep,
        latitude: enderecoSelecionado.latitude,
        longitude: enderecoSelecionado.longitude,
        publico,
        imagem,
        clienteEmail,
        pedidoId:
          navState.pedidoId !== undefined && navState.pedidoId !== null && String(navState.pedidoId).trim()
            ? Number(navState.pedidoId)
            : undefined,
      });

      const localizacaoMsg = `Localização confirmada: ${enderecoSelecionado.label}.`;

      setLocalizacaoConfirmada(localizacaoMsg);
      setLocationStatus({
        tone: enderecoSelecionado.isApproximate ? "warning" : "success",
        text: enderecoSelecionado.isApproximate
          ? "Tour criado com localização aproximada selecionada."
          : "Tour criado com localização confirmada.",
      });
      setToast({ tone: "success", message: "Tour criado com sucesso." });

      setTitulo("");
      setDescricao("");
      setLinkVR("");
      setCategoria("");
      setSiteUrl("");
      setCidade("");
      setPais(DEFAULT_COUNTRY);
      setEndereco("");
      setCep("");
      setPublico(true);
      setImagem(null);
      setSugestoesEndereco([]);
      setEnderecoSelecionado(null);
      setLatitudeManual("");
      setLongitudeManual("");
      setMapCenter(DEFAULT_MAP_CENTER);
      setMapZoom(DEFAULT_MAP_ZOOM);
      setActiveStep("dados");
      setLocationStatus({
        tone: "idle",
        text: "Preencha os dados, busque o endereço e selecione uma sugestão ou clique no mapa para definir o ponto.",
      });
    } catch (err: any) {
      console.error(err);
      setToast({ tone: "error", message: `Erro ao criar tour: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tj-crt-page">
      <div className="tj-crt-bg" aria-hidden="true">
        <span className="tj-crt-orb tj-crt-orb--one" />
        <span className="tj-crt-orb tj-crt-orb--two" />
        <span className="tj-crt-orb tj-crt-orb--three" />
      </div>

      <main className="tj-crt-content">
        {/* ============ HERO + STEPPER ============ */}
        <header className="tj-crt-hero">
          <motion.div
            className="tj-crt-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Publicação imersiva</span>
            <span className="tj-crt-dot" />
            <span>tour 360°</span>
          </motion.div>

          <motion.h1
            className="tj-crt-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Crie um tour
            <br />
            em três passos.
          </motion.h1>

          <motion.p
            className="tj-crt-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Preencha os dados, confirme o ponto no mapa e revise antes de publicar.
            Campos limpos, apenas linhas finas.
          </motion.p>

          <motion.nav
            className="tj-crt-stepper"
            aria-label="Progresso da criação do tour"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            {STEPPER_ORDER.map((step, index) => {
              const state = getStepState(step);
              const label =
                step === "dados" ? "Dados" : step === "local" ? "Localização" : "Revisão";

              return (
                <React.Fragment key={step}>
                  {index > 0 ? (
                    <span className={`tj-crt-stepper-line${getStepState(STEPPER_ORDER[index - 1]) === "done" ? " is-done" : ""}`} aria-hidden="true" />
                  ) : null}
                  <span className={`tj-crt-stepper-item${state === "active" ? " is-active" : ""}${state === "done" ? " is-done" : ""}`}>
                    <span className="tj-crt-stepper-num">{state === "done" ? "✓" : index + 1}</span>
                    {label}
                  </span>
                </React.Fragment>
              );
            })}
          </motion.nav>
        </header>

        <form onSubmit={handleSubmit} className="tj-crt-form" noValidate>
          {/* ============ ETAPA 1: DADOS ============ */}
          {activeStep === "dados" && (
            <motion.section
              className="tj-crt-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: TJ_EASE }}
            >
              <div className="tj-crt-section-head">
                <span className="tj-crt-kicker">Passo 1</span>
                <h2>Informações do ambiente.</h2>
                <p>Dados essenciais para identificar o tour no catálogo e no explorer.</p>
              </div>

              {prefillInfo.possuiPrefill ? (
                <div className="tj-crt-prefill-note">
                  Dados do pedido foram pré-preenchidos automaticamente para acelerar a criação do tour.
                </div>
              ) : null}

              <div className="tj-crt-field">
                <label htmlFor="titulo">Título</label>
                <input
                  id="titulo"
                  placeholder="Ex.: Showroom Qolop Experience"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="tj-crt-field">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  placeholder="Descreva o contexto, os diferenciais e a proposta da experiência."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                />
              </div>

              <div className="tj-crt-grid">
                <div className="tj-crt-field">
                  <label htmlFor="linkVR">Link VR</label>
                  <input
                    id="linkVR"
                    placeholder="Cole a URL do tour virtual"
                    value={linkVR}
                    onChange={(e) => setLinkVR(e.target.value)}
                    required
                  />
                </div>

                <div className="tj-crt-field">
                  <label htmlFor="siteUrl">Site</label>
                  <input
                    id="siteUrl"
                    type="url"
                    placeholder="https://www.seusite.com.br"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="tj-crt-field">
                <label htmlFor="categoria">Tipo / categoria</label>
                <input
                  id="categoria"
                  placeholder="Ex.: museu, imóvel, escola"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  required
                />
              </div>

              <div className="tj-crt-actions">
                <button
                  type="button"
                  className="tj-crt-action tj-crt-action--solid"
                  onClick={irParaLocal}
                >
                  Continuar para localização
                  <FiChevronRight />
                </button>
                <p className="tj-crt-caption">Título, descrição, link VR e categoria são obrigatórios.</p>
              </div>
            </motion.section>
          )}

          {/* ============ ETAPA 2: LOCALIZAÇÃO ============ */}
          {activeStep === "local" && (
            <motion.section
              className="tj-crt-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: TJ_EASE }}
            >
              <div className="tj-crt-section-head">
                <span className="tj-crt-kicker">Passo 2</span>
                <h2>Confirme o ponto no mapa.</h2>
                <p>Busque o endereço e escolha uma sugestão, ou clique diretamente no mapa.</p>
              </div>

              <div className="tj-crt-grid-address">
                <div className="tj-crt-field">
                  <label htmlFor="endereco">Endereço</label>
                  <input
                    id="endereco"
                    placeholder="Rua, número, bairro"
                    value={endereco}
                    onChange={(e) => {
                      setEndereco(e.target.value);
                      resetSelectedLocation();
                    }}
                  />
                </div>

                <div className="tj-crt-field">
                  <label htmlFor="cep">CEP</label>
                  <input
                    id="cep"
                    placeholder="CEP"
                    value={cep}
                    onChange={(e) => {
                      setCep(e.target.value);
                      resetSelectedLocation();
                    }}
                  />
                </div>
              </div>

              <div className="tj-crt-grid">
                <div className="tj-crt-field">
                  <label htmlFor="cidade">Cidade</label>
                  <input
                    id="cidade"
                    placeholder="Cidade"
                    value={cidade}
                    onChange={(e) => {
                      setCidade(e.target.value);
                      resetSelectedLocation();
                    }}
                  />
                </div>

                <div className="tj-crt-field">
                  <label htmlFor="pais">País</label>
                  <input
                    id="pais"
                    placeholder="País"
                    value={pais}
                    onChange={(e) => {
                      setPais(e.target.value);
                      resetSelectedLocation();
                    }}
                  />
                </div>
              </div>

              <div className="tj-crt-actions">
                <button
                  type="button"
                  className="tj-crt-action tj-crt-action--solid"
                  onClick={() => void handleBuscarEndereco()}
                  disabled={buscandoSugestoes}
                >
                  <FiMapPin />
                  {buscandoSugestoes ? "Buscando local..." : "Buscar endereço"}
                </button>
                <p className="tj-crt-caption">
                  Fluxo recomendado: preencher os campos, buscar o endereço, escolher uma sugestão e, se necessário, ajustar no mapa.
                </p>
              </div>

              <div className={`tj-crt-status is-${locationStatus.tone}`}>
                <strong>Status da localização</strong>
                <p>{locationStatus.text}</p>

                {enderecoSelecionado ? (
                  <div className="tj-crt-status-meta">
                    <span className="tj-crt-badge">
                      {enderecoSelecionado.source === "manual" ? "Manual" : "Busca"}
                    </span>
                    <span className="tj-crt-badge">
                      {enderecoSelecionado.isApproximate ? "Aproximada" : "Exata"}
                    </span>
                  </div>
                ) : null}
              </div>

              {localizacaoConfirmada ? <p className="tj-crt-caption">{localizacaoConfirmada}</p> : null}

              {sugestoesEndereco.length > 0 ? (
                <div className="tj-crt-suggestions">
                  {sugestoesEndereco.map((sugestao) => (
                    <button
                      key={sugestao.id}
                      type="button"
                      className={`tj-crt-suggestion${enderecoSelecionado?.id === sugestao.id ? " is-active" : ""}`}
                      onClick={() => handleSelecionarSugestao(sugestao)}
                    >
                      <div>
                        <strong>{sugestao.title}</strong>
                        <span>{sugestao.subtitle}</span>
                      </div>
                      <span className="tj-crt-badge">
                        {sugestao.isApproximate ? "Aproximada" : "Exata"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="tj-crt-field tj-crt-manual">
                <div className="tj-crt-manual-head">
                  <strong>Ajuste manual</strong>
                  <span>Clique no mapa para marcar o ponto exato ou informe latitude e longitude.</span>
                </div>

                <div className="tj-crt-manual-grid">
                  <div className="tj-crt-field">
                    <label htmlFor="latitudeManual">Latitude</label>
                    <input
                      id="latitudeManual"
                      placeholder="Ex.: -22.252100"
                      inputMode="decimal"
                      value={latitudeManual}
                      onChange={(e) => setLatitudeManual(e.target.value)}
                    />
                  </div>

                  <div className="tj-crt-field">
                    <label htmlFor="longitudeManual">Longitude</label>
                    <input
                      id="longitudeManual"
                      placeholder="Ex.: -45.703600"
                      inputMode="decimal"
                      value={longitudeManual}
                      onChange={(e) => setLongitudeManual(e.target.value)}
                    />
                  </div>
                </div>

                <div className="tj-crt-actions">
                  <button
                    type="button"
                    className="tj-crt-action tj-crt-action--secondary"
                    onClick={() => {
                      const latitude = Number(latitudeManual.replace(",", "."));
                      const longitude = Number(longitudeManual.replace(",", "."));

                      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                        setToast({ tone: "error", message: "Informe latitude e longitude válidas." });
                        return;
                      }

                      aplicarCoordenadasManuais(latitude, longitude, "manual");
                    }}
                  >
                    Aplicar latitude / longitude
                  </button>
                  <p className="tj-crt-caption">Clique diretamente no mapa para definir o ponto exato.</p>
                </div>
              </div>

              <div className="tj-crt-map-frame">
                <MapContainer center={mapCenter} zoom={mapZoom} style={{ width: "100%", height: "320px" }} scrollWheelZoom>
                  <MapViewportController center={mapCenter} zoom={mapZoom} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  {enderecoSelecionado?.isApproximate && enderecoSelecionado.radius > 0 ? (
                    <Circle
                      center={[enderecoSelecionado.latitude, enderecoSelecionado.longitude]}
                      radius={enderecoSelecionado.radius}
                      pathOptions={{
                        color: "#ffd58a",
                        fillColor: "#ffd58a",
                        fillOpacity: 0.12,
                        weight: 2,
                      }}
                    />
                  ) : null}
                  <SelecionadorMapa
                    position={
                      enderecoSelecionado ? [enderecoSelecionado.latitude, enderecoSelecionado.longitude] : null
                    }
                    onSelect={({ latitude, longitude }) => {
                      aplicarCoordenadasManuais(latitude, longitude, "map");
                    }}
                  />
                </MapContainer>
              </div>

              <div className="tj-crt-actions">
                <button
                  type="button"
                  className="tj-crt-action"
                  onClick={() => setActiveStep("dados")}
                >
                  <FiChevronLeft />
                  Voltar
                </button>
                <button
                  type="button"
                  className="tj-crt-action tj-crt-action--solid"
                  onClick={irParaRevisao}
                >
                  Revisar e publicar
                  <FiChevronRight />
                </button>
              </div>
            </motion.section>
          )}

          {/* ============ ETAPA 3: REVISÃO ============ */}
          {activeStep === "revisao" && (
            <motion.section
              className="tj-crt-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: TJ_EASE }}
            >
              <div className="tj-crt-section-head">
                <span className="tj-crt-kicker">Passo 3</span>
                <h2>Revise antes de publicar.</h2>
                <p>Visibilidade, imagem de preview e resumo do tour.</p>
              </div>

              <div className="tj-crt-status is-success">
                <strong>Resumo</strong>
                <p>
                  {titulo || "Sem título"} · {categoria || "Sem categoria"}
                  {enderecoSelecionado ? ` · ${enderecoSelecionado.label}` : ""}
                </p>
              </div>

              <div className="tj-crt-switch-row">
                <label className="tj-crt-switch">
                  <span className="tj-crt-switch-copy">
                    <strong>Tornar público</strong>
                    <span>Permita que este tour apareça no catálogo e no explorer.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={publico}
                    onChange={(e) => setPublico(e.target.checked)}
                  />
                </label>
              </div>

              <div className="tj-crt-field">
                <label>Imagem de preview</label>
                <label className={`tj-crt-drop${isDragging ? " is-dragging" : ""}`}>
                  <span className="tj-crt-drop-icon">
                    <FiUploadCloud />
                  </span>
                  <span>
                    <strong>{imagem ? imagem.name : "Arraste uma imagem ou clique para escolher"}</strong>
                    {!imagem ? <span>PNG, JPG ou WebP · opcional</span> : null}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImagem(file);
                      setIsDragging(false);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0] ?? null;
                      setImagem(file);
                    }}
                  />
                </label>
                {imagem ? <span className="tj-crt-file-chip">Pronto para envio</span> : null}
              </div>

              <div className="tj-crt-actions">
                <button
                  type="button"
                  className="tj-crt-action"
                  onClick={() => setActiveStep("local")}
                >
                  <FiChevronLeft />
                  Voltar
                </button>
                <button type="submit" disabled={loading} className="tj-crt-action tj-crt-action--solid">
                  {loading ? "Criando..." : "Criar tour"}
                </button>
                <p className="tj-crt-caption">
                  O envio permanece compatível com o backend atual, incluindo imagem, visibilidade e coordenadas obrigatórias.
                </p>
              </div>
            </motion.section>
          )}
        </form>
      </main>

      {/* ============ TOAST INLINE ============ */}
      <AnimatePresence>
        {toast ? (
          <motion.div
            className="tj-crt-toast"
            role={toast.tone === "error" ? "alert" : "status"}
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ duration: 0.4, ease: TJ_EASE }}
            style={{
              position: "fixed",
              bottom: "1.5rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              borderColor:
                toast.tone === "error" ? "rgba(253, 164, 175, 0.4)" : "rgba(110, 231, 183, 0.4)",
              background:
                toast.tone === "error"
                  ? "rgba(80, 24, 34, 0.92)"
                  : "rgba(8, 32, 24, 0.92)",
              color: toast.tone === "error" ? "#ffb4bc" : "#a7f3d0",
            }}
          >
            {toast.tone === "success" ? <FiCheckCircle /> : null}
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
