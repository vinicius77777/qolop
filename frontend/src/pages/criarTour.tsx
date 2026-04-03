import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useLocation } from "react-router-dom";
import { createAmbiente } from "../services/api";
import "leaflet/dist/leaflet.css";
import "../styles/criarTour.css";

type LocationStatusTone = "idle" | "loading" | "success" | "warning";

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const DEFAULT_COUNTRY = "Brasil";
const DEFAULT_MAP_CENTER: [number, number] = [-22.2521, -45.7036];
const DEFAULT_MAP_ZOOM = 15;
const SELECTED_ZOOM_EXACT = 18;
const SELECTED_ZOOM_APPROX = 16;
const SELECTED_ZOOM_MANUAL = 19;

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
  const navState = (location.state || {}) as CriarTourNavigationState;
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
  }, [clienteEmail, navState]);

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
  }

  async function handleBuscarEndereco() {
    const hasSearchData = [endereco, cep, cidade, pais].some((value) => value.trim());

    if (!hasSearchData) {
      alert("Preencha endereço, CEP, cidade ou país para buscar.");
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
      alert(error?.message || "Erro ao buscar o endereço.");
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!enderecoSelecionado) {
      alert("Busque um endereço e selecione uma sugestão, ou marque o ponto manualmente no mapa antes de salvar.");
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

      alert(`Tour criado com sucesso!\n\n${localizacaoMsg}`);

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
      setLocationStatus({
        tone: "idle",
        text: "Preencha os dados, busque o endereço e selecione uma sugestão ou clique no mapa para definir o ponto.",
      });
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao criar tour: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="criar-tour-page">
      <div className="criar-tour-shell">
        <div className="criar-tour-hero">
          <p className="criar-tour-eyebrow">Publicação imersiva</p>
          <h1>Criar novo tour</h1>
          <p>
            Preencha os dados do ambiente, busque o endereço e confirme o ponto no mapa antes de publicar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="criar-tour-form">
          {prefillInfo.possuiPrefill ? (
            <div className="criar-tour-prefill-note">
              Dados do pedido foram pré-preenchidos automaticamente para acelerar a criação do tour.
            </div>
          ) : null}

          <div className="criar-tour-field">
            <label htmlFor="titulo">Título</label>
            <input
              id="titulo"
              placeholder="Ex.: Showroom Qolop Experience"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="criar-tour-field">
            <label htmlFor="descricao">Descrição</label>
            <textarea
              id="descricao"
              placeholder="Descreva o contexto, os diferenciais e a proposta da experiência."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>

          <div className="criar-tour-field">
            <label htmlFor="linkVR">Link VR</label>
            <input
              id="linkVR"
              placeholder="Cole a URL do tour virtual"
              value={linkVR}
              onChange={(e) => setLinkVR(e.target.value)}
              required
            />
          </div>

          <div className="criar-tour-field">
            <label htmlFor="siteUrl">Site</label>
            <input
              id="siteUrl"
              type="url"
              placeholder="https://www.seusite.com.br"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
          </div>

          <div className="criar-tour-field">
            <label htmlFor="categoria">Tipo / categoria</label>
            <input
              id="categoria"
              placeholder="Ex.: museu, imóvel, escola"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
            />
          </div>

          <div className="criar-tour-grid">
            <div className="criar-tour-field">
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

            <div className="criar-tour-field">
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

          <div className="criar-tour-grid-address">
            <div className="criar-tour-field">
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

            <div className="criar-tour-field">
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

          <div className="criar-tour-actions">
            <button
              type="button"
              disabled={buscandoSugestoes}
              className="criar-tour-submit"
              onClick={() => void handleBuscarEndereco()}
            >
              {buscandoSugestoes ? "Buscando local..." : "Buscar endereço"}
            </button>
            <p className="criar-tour-caption">
              Fluxo recomendado: preencher os campos, buscar o endereço, escolher uma sugestão e, se necessário, ajustar no mapa.
            </p>
          </div>

          <div className="criar-tour-location-panel">
            <div className={`criar-tour-location-status is-${locationStatus.tone}`}>
              <div>
                <strong>Status da localização</strong>
                <p>{locationStatus.text}</p>
              </div>

              {enderecoSelecionado ? (
                <div className="criar-tour-location-meta">
                  <span className="criar-tour-location-badge">
                    {enderecoSelecionado.source === "manual" ? "Manual" : "Busca"}
                  </span>
                  <span className="criar-tour-location-badge">
                    {enderecoSelecionado.isApproximate ? "Aproximada" : "Exata"}
                  </span>
                </div>
              ) : null}
            </div>

            {localizacaoConfirmada ? <p className="criar-tour-caption">{localizacaoConfirmada}</p> : null}

            {sugestoesEndereco.length > 0 ? (
              <div className="criar-tour-suggestion-list">
                {sugestoesEndereco.map((sugestao) => (
                  <button
                    key={sugestao.id}
                    type="button"
                    className={`criar-tour-suggestion-item${
                      enderecoSelecionado?.id === sugestao.id ? " is-active" : ""
                    }`}
                    onClick={() => handleSelecionarSugestao(sugestao)}
                  >
                    <div>
                      <strong>{sugestao.title}</strong>
                      <span>{sugestao.subtitle}</span>
                    </div>
                    <span className="criar-tour-location-badge">
                      {sugestao.isApproximate ? "Aproximada" : "Exata"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="criar-tour-manual-panel">
            <div className="criar-tour-manual-panel__header">
              <strong>Ajuste manual</strong>
              <span>
                Se preferir, clique no mapa para marcar o ponto exato ou informe latitude e longitude manualmente.
              </span>
            </div>

            <div className="criar-tour-manual-grid">
              <div className="criar-tour-field">
                <label htmlFor="latitudeManual">Latitude</label>
                <input
                  id="latitudeManual"
                  placeholder="Ex.: -22.252100"
                  inputMode="decimal"
                  value={latitudeManual}
                  onChange={(e) => setLatitudeManual(e.target.value)}
                />
              </div>

              <div className="criar-tour-field">
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

            <div className="criar-tour-actions criar-tour-actions--compact">
              <button
                type="button"
                className="criar-tour-submit criar-tour-submit--secondary"
                onClick={() => {
                  const latitude = Number(latitudeManual.replace(",", "."));
                  const longitude = Number(longitudeManual.replace(",", "."));

                  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    alert("Informe latitude e longitude válidas.");
                    return;
                  }

                  aplicarCoordenadasManuais(latitude, longitude, "manual");
                }}
              >
                Aplicar latitude / longitude
              </button>

              <p className="criar-tour-caption">Clique diretamente no mapa para definir o ponto exato.</p>
            </div>
          </div>

          <div className="criar-tour-map-frame">
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
                    color: "#fbbf24",
                    fillColor: "#fbbf24",
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

          <div className="criar-tour-switch-row">
            <label className="criar-tour-switch">
              <span className="criar-tour-switch-copy">
                <strong>Tornar público</strong>
                <span>Permita que este tour apareça no catálogo e no explorer.</span>
              </span>
              <input
                type="checkbox"
                checked={publico}
                onChange={(e) => setPublico(e.target.checked)}
              />
            </label>

            <div className="criar-tour-upload">
              <span>Imagem de preview</span>
              <input
                type="file"
                onChange={(e) => e.target.files && setImagem(e.target.files[0])}
              />
            </div>
          </div>

          <div className="criar-tour-actions">
            <button type="submit" disabled={loading} className="criar-tour-submit">
              {loading ? "Criando..." : "Criar tour"}
            </button>
            <p className="criar-tour-caption">
              O envio permanece compatível com o backend atual, incluindo imagem, visibilidade e coordenadas obrigatórias.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
