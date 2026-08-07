import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getAmbientesExplorer, registrarVisualizacaoAmbiente } from "../services/api";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "../styles/explorer.css";

interface Tour {
  id: number;
  titulo: string;
  descricao?: string | null;
  categoria?: string | null;
  latitude: number;
  longitude: number;
  imagemPreview: string | null;
  cidade?: string | null;
  pais?: string | null;
  endereco?: string | null;
  cep?: string | null;
  createdAt?: string;
  pagamentoDestacado?: boolean;
  explorerBadge?: string | null;
}

interface TourComDistancia extends Tour {
  distanciaKm: number | null;
  searchScore: number;
  destaqueScore: number;
}

interface SearchedLocation {
  latitude: number;
  longitude: number;
  label: string;
  source?: "filter" | "manual";
  isApproximate?: boolean;
}

type LocationMode = "search" | null;

const DEFAULT_CENTER: [number, number] = [-15.7801, -47.9292];
const ADDRESS_SEARCH_TIMEOUT_MS = 4500;
const SEARCH_INPUT_DEBOUNCE_MS = 450;
const SEARCH_RESULT_RADIUS_KM = 18;
const APPROXIMATE_SEARCH_RADIUS_KM = 45;
const addressSearchCache = new Map<string, SearchedLocation | null>();

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [22, 38],
  iconAnchor: [12, 38],
  popupAnchor: [1, -34],
  shadowSize: [38, 38],
});

const highlightedMarkerIcon = new L.DivIcon({
  className: "explorer-premium-marker",
  html:
    '<div class="explorer-premium-marker__halo"></div><div class="explorer-premium-marker__body"><span class="explorer-premium-marker__star">★</span></div>',
  iconSize: [40, 40],
  iconAnchor: [20, 36],
  popupAnchor: [1, -34],
});

const searchLocationIcon = new L.DivIcon({
  className: "explorer-search-marker",
  html:
    '<div class="explorer-search-marker__ring"><div class="explorer-search-marker__pulse"></div><div class="explorer-search-marker__star">★</div><div class="explorer-search-marker__dot"></div></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function getTourMarkerIcon(tour: Tour) {
  return tour.pagamentoDestacado ? highlightedMarkerIcon : markerIcon;
}

function getExplorerBadgeLabel(tour: Tour) {
  if (tour.pagamentoDestacado) {
    return "★";
  }

  return tour.explorerBadge ?? null;
}

function normalizeText(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s,.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenizeSearchText(value?: string | null) {
  return normalizeText(value)
    .split(/[\s,./-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function buildTourSearchIndex(tour: Tour) {
  return normalizeText(
    [
      tour.titulo,
      tour.descricao,
      tour.categoria,
      tour.cidade,
      tour.pais,
      tour.endereco,
      tour.cep,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildTourSearchTokens(tour: Tour) {
  const baseTokens = tokenizeSearchText(
    [
      tour.titulo,
      tour.descricao,
      tour.categoria,
      tour.cidade,
      tour.pais,
      tour.endereco,
      tour.cep,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return Array.from(new Set(baseTokens));
}

function getSearchMatchScore(tour: Tour, normalizedQuery: string, queryTokens: string[]) {
  const searchableContent = buildTourSearchIndex(tour);
  const searchableTokens = buildTourSearchTokens(tour);

  if (!normalizedQuery && queryTokens.length === 0) {
    return 1;
  }

  let score = 0;

  if (normalizedQuery && searchableContent.includes(normalizedQuery)) {
    score += 10;
  }

  const matchedTokens = queryTokens.filter((token) =>
    searchableTokens.some(
      (searchableToken) =>
        searchableToken.includes(token) ||
        token.includes(searchableToken) ||
        searchableContent.includes(token)
    )
  );

  score += matchedTokens.length * 2;

  const minimumMatches =
    queryTokens.length >= 6
      ? Math.max(3, Math.ceil(queryTokens.length * 0.45))
      : queryTokens.length >= 4
      ? Math.max(2, Math.ceil(queryTokens.length * 0.5))
      : queryTokens.length;

  if (queryTokens.length > 0 && matchedTokens.length < minimumMatches) {
    return 0;
  }

  if (tour.endereco) {
    const normalizedAddress = normalizeText(tour.endereco);
    const addressTokens = tokenizeSearchText(tour.endereco);
    const addressMatches = queryTokens.filter((token) =>
      addressTokens.some((addressToken) => addressToken.includes(token) || token.includes(addressToken))
    );

    if (normalizedQuery && normalizedAddress.includes(normalizedQuery)) {
      score += 8;
    }

    score += addressMatches.length * 3;
  }

  return score;
}

function formatarLocalizacao(tour: Tour) {
  const linhaPrincipal =
    tour.endereco ||
    [tour.cidade, tour.pais].filter(Boolean).join(", ") ||
    "Localização não informada";

  const linhaSecundaria = [tour.cep, tour.cidade, tour.pais].filter(Boolean).join(" • ");

  return {
    linhaPrincipal,
    linhaSecundaria: linhaSecundaria || "Sem detalhes adicionais",
  };
}

function calcularDistanciaKm(
  origemLat: number,
  origemLng: number,
  destinoLat: number,
  destinoLng: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const raioTerraKm = 6371;

  const deltaLat = toRad(destinoLat - origemLat);
  const deltaLng = toRad(destinoLng - origemLng);
  const origemLatRad = toRad(origemLat);
  const destinoLatRad = toRad(destinoLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(origemLatRad) *
      Math.cos(destinoLatRad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return raioTerraKm * c;
}

function formatarDistancia(distanciaKm?: number | null) {
  if (distanciaKm === undefined || distanciaKm === null) {
    return "Distância indisponível";
  }

  if (distanciaKm < 1) {
    return `${Math.round(distanciaKm * 1000)} m do ponto de referência`;
  }

  return `${distanciaKm.toFixed(1)} km do ponto de referência`;
}

function getBoundsFromCenterRadius(lat: number, lng: number, radiusKm: number) {
  const latDelta = (radiusKm / 6371) * (180 / Math.PI);
  const lngDelta = ((radiusKm / 6371) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);
  return L.latLngBounds([lat - latDelta, lng - lngDelta], [lat + latDelta, lng + lngDelta]);
}

function formatarRaioBusca(radiusKm: number) {
  if (radiusKm < 1) {
    return `${Math.round(radiusKm * 1000)} m`;
  }

  return radiusKm >= 100 ? `${Math.round(radiusKm)} km` : `${radiusKm.toFixed(0)} km`;
}

function getTourHighlightScore(tour: Tour) {
  return tour.pagamentoDestacado ? 1 : 0;
}

function getTourBadgeClassName(tour: Tour) {
  return tour.pagamentoDestacado
    ? "explorer-tour-badge explorer-tour-badge--highlighted"
    : "explorer-tour-badge";
}

function parseLooseBrazilianAddress(query: string) {
  const normalized = normalizeText(query);
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const rawTokens = tokenizeSearchText(query);
  const tokens = rawTokens.filter((token) => !["brasil", "brazil"].includes(token));

  const cityHints = [
    "barra do pirai",
    "barra mansa",
    "volta redonda",
    "rio de janeiro",
    "sao paulo",
    "belo horizonte",
    "porto alegre",
    "curitiba",
    "salvador",
    "brasilia",
  ];

  const matchedCity =
    cityHints.find((hint) => normalized.includes(hint)) ||
    parts[parts.length - 1] ||
    "";

  const streetIndex = tokens.findIndex((token) =>
    ["rua", "r", "avenida", "av", "estrada", "rodovia", "travessa", "tv", "alameda"].includes(token)
  );

  const houseNumber = tokens.find((token) => /^\d+[a-z]?$/.test(token)) || "";
  const streetTokens =
    streetIndex >= 0
      ? tokens.slice(streetIndex, houseNumber ? tokens.indexOf(houseNumber, streetIndex) + 1 : streetIndex + 4)
      : [];

  const street = streetTokens.join(" ").trim();
  const suburbCandidates = parts.length > 1 ? parts.slice(0, -1) : [];
  const suburb =
    suburbCandidates.find((part) => !street || !part.includes(street)) ||
    tokens
      .filter((token) => token !== houseNumber && !streetTokens.includes(token))
      .slice(0, 4)
      .join(" ")
      .trim();

  return {
    street,
    houseNumber,
    suburb,
    city: matchedCity,
    country: "brasil",
  };
}

function buildAddressQueryVariants(query: string) {
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeText(trimmedQuery);
  const compactQuery = normalizedQuery.replace(/\s+/g, " ").trim();
  const commaFriendlyQuery = compactQuery
    .replace(/\bnumero\b/g, ",")
    .replace(/\bnum\b/g, ",")
    .replace(/\bn\b/g, ",")
    .replace(/\bno\b/g, ",")
    .replace(/\bapto\b/g, "apartamento")
    .replace(/\bapt\b/g, "apartamento")
    .replace(/\bbl\b/g, "bloco")
    .replace(/\bqd\b/g, "quadra")
    .replace(/\blt\b/g, "lote")
    .replace(/\bctr\b/g, "centro")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = tokenizeSearchText(trimmedQuery);
  const reorderedQuery = [
    tokens.filter((token) => /\d/.test(token)).join(" "),
    tokens.filter((token) => !/\d/.test(token)).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return Array.from(
    new Set(
      [
        trimmedQuery,
        normalizedQuery,
        compactQuery,
        commaFriendlyQuery,
        reorderedQuery,
        commaFriendlyQuery.replace(/\s+/g, ", "),
      ].filter((value) => value && value.length >= 3)
    )
  );
}

async function fetchJsonWithTimeout(url: string, timeoutMs = ADDRESS_SEARCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function buscarEnderecoLivre(query: string): Promise<SearchedLocation | null> {
  const normalizedCacheKey = normalizeText(query);

  if (!normalizedCacheKey) {
    return null;
  }

  if (addressSearchCache.has(normalizedCacheKey)) {
    return addressSearchCache.get(normalizedCacheKey) ?? null;
  }

  const variants = buildAddressQueryVariants(query);
  const parsed = parseLooseBrazilianAddress(query);

  const urls = [
    ...variants.map(
      (variant) =>
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=br&accept-language=pt-BR&q=${encodeURIComponent(
          variant
        )}`
    ),
    parsed.street || parsed.city
      ? `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=br&accept-language=pt-BR&street=${encodeURIComponent(
          parsed.street
        )}&city=${encodeURIComponent(parsed.city)}&country=${encodeURIComponent(parsed.country)}`
      : "",
    parsed.street || parsed.city || parsed.suburb
      ? `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=br&accept-language=pt-BR&street=${encodeURIComponent(
          parsed.street
        )}&city=${encodeURIComponent(parsed.city)}&county=${encodeURIComponent(
          parsed.suburb
        )}&country=${encodeURIComponent(parsed.country)}`
      : "",
    parsed.city
      ? `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=br&accept-language=pt-BR&city=${encodeURIComponent(
          parsed.city
        )}&country=${encodeURIComponent(parsed.country)}`
      : "",
  ].filter(Boolean);

  for (const url of urls) {
    const data = await fetchJsonWithTimeout(url);

    if (!Array.isArray(data) || !data.length) {
      continue;
    }

    const place = data[0];
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const result = {
      latitude,
      longitude,
      label: place.display_name || query,
      source: "filter" as const,
      isApproximate: false,
    };

    addressSearchCache.set(normalizedCacheKey, result);
    return result;
  }

  const fallbackLocation =
    parsed.city && parsed.city !== normalizedCacheKey
      ? await buscarEnderecoLivre(parsed.city)
      : null;

  const normalizedFallback = fallbackLocation
    ? {
        ...fallbackLocation,
        isApproximate: true,
      }
    : null;

  addressSearchCache.set(normalizedCacheKey, normalizedFallback);
  return normalizedFallback;
}

function getProximityRadiusKm(searchedLocation: SearchedLocation | null) {
  if (!searchedLocation) {
    return null;
  }

  return searchedLocation.isApproximate ? APPROXIMATE_SEARCH_RADIUS_KM : SEARCH_RESULT_RADIUS_KM;
}

function AjustarMapa({
  tours,
  referenceLocation,
  proximityRadiusKm,
  selectedTour,
}: {
  tours: Tour[];
  referenceLocation: SearchedLocation | null;
  proximityRadiusKm: number | null;
  selectedTour: Tour | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (referenceLocation && proximityRadiusKm !== null) {
      const bounds = getBoundsFromCenterRadius(
        referenceLocation.latitude,
        referenceLocation.longitude,
        proximityRadiusKm
      );

      map.fitBounds(bounds, {
        paddingTopLeft: window.innerWidth >= 768 ? [160, 160] : [24, 160],
        paddingBottomRight: window.innerWidth >= 768 ? [160, 120] : [24, 120],
        maxZoom: 13,
        animate: true,
      });

      return;
    }

    if (selectedTour) {
      map.setView([selectedTour.latitude, selectedTour.longitude], Math.max(map.getZoom(), 14), {
        animate: true,
      });
    }
  }, [map, proximityRadiusKm, referenceLocation, selectedTour]);

  useEffect(() => {
    if (referenceLocation) {
      return;
    }

    if (!tours.length) {
      return;
    }

    const points: Array<[number, number]> = tours.map((tour) => [tour.latitude, tour.longitude]);

    if (points.length === 1) {
      map.setView(points[0], 12, { animate: true });
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: window.innerWidth >= 768 ? [360, 240] : [24, 180],
      paddingBottomRight: window.innerWidth >= 768 ? [40, 40] : [24, 40],
      maxZoom: 14,
      animate: true,
    });
  }, [map, tours, referenceLocation]);

  return null;
}

export default function Explorer() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const autoGeoAttempted = useRef(false);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addressSearchState, setAddressSearchState] = useState<
    "idle" | "searching" | "not-found" | "found-exact" | "found-approximate" | "no-nearby"
  >("idle");
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>(null);
  const [locationStatus, setLocationStatus] = useState(
    "Mostrando todos os ambientes. Busque um lugar para navegar por raio."
  );

  useEffect(() => {
    getAmbientesExplorer()
      .then((data) => {
        const parsedTours = Array.isArray(data) ? data : [];
        const validTours = parsedTours.filter(
          (tour) => Number.isFinite(tour.latitude) && Number.isFinite(tour.longitude)
        ) as Tour[];

        setTours(validTours);
        setSelectedTourId(validTours[0]?.id ?? null);
      })
      .catch((error) => {
        console.error(error);
        setTours([]);
        setSelectedTourId(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || autoGeoAttempted.current || searchedLocation) {
      return;
    }

    if (!navigator.geolocation) {
      autoGeoAttempted.current = true;
      return;
    }

    autoGeoAttempted.current = true;

    setGeoLoading(true);
    setAddressSearchState("searching");
    setLocationStatus("Obtendo sua localização atual...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const location: SearchedLocation = {
          latitude,
          longitude,
          label: `Sua localização (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
          source: "manual",
          isApproximate: false,
        };

        setSearchedLocation(location);
        setLocationMode("search");
        setAddressSearchState("found-exact");
        setGeoLoading(false);

        const radiusKm = SEARCH_RESULT_RADIUS_KM;
        const radiusLabel = formatarRaioBusca(radiusKm);
        setLocationStatus(
          `Localização obtida com sucesso. Mostrando ambientes em até ${radiusLabel} da sua posição.`
        );
      },
      () => {
        setGeoLoading(false);
        setLocationStatus("Mostrando todos os ambientes. Busque um lugar para navegar por raio.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
    );
  }, [loading, searchedLocation]);

  const categoriasDisponiveis = useMemo(() => {
    return Array.from(new Set(tours.map((tour) => normalizeText(tour.categoria)).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [tours]);

  const normalizedSearch = useMemo(() => normalizeText(search), [search]);

  const searchTokens = useMemo(() => tokenizeSearchText(search), [search]);

  const referenceLocation = searchedLocation;

  const proximityRadiusKm = useMemo(() => getProximityRadiusKm(searchedLocation), [searchedLocation]);

  const toursComDistancia = useMemo<TourComDistancia[]>(() => {
    return tours.map((tour) => ({
      ...tour,
      distanciaKm: referenceLocation
        ? calcularDistanciaKm(
            referenceLocation.latitude,
            referenceLocation.longitude,
            tour.latitude,
            tour.longitude
          )
        : null,
      searchScore: getSearchMatchScore(tour, normalizedSearch, searchTokens),
      destaqueScore: getTourHighlightScore(tour),
    }));
  }, [normalizedSearch, referenceLocation, searchTokens, tours]);

  const toursFiltrados = useMemo<TourComDistancia[]>(() => {
    const usingSearchLocationFallback = searchedLocation?.source === "filter";

    return toursComDistancia
      .filter((tour) => {
        const matchesSearch =
          searchTokens.length === 0 ? true : usingSearchLocationFallback ? true : tour.searchScore > 0;

        const categoriaNormalizada = normalizeText(tour.categoria);
        const matchesCategory = categoryFilter === "todos" || categoriaNormalizada === categoryFilter;
        const matchesProximity =
          !referenceLocation ||
          proximityRadiusKm === null ||
          (tour.distanciaKm !== null && tour.distanciaKm <= proximityRadiusKm);

        return matchesSearch && matchesCategory && matchesProximity;
      })
      .sort((a, b) => {
        if (b.destaqueScore !== a.destaqueScore) {
          return b.destaqueScore - a.destaqueScore;
        }

        if (!usingSearchLocationFallback && b.searchScore !== a.searchScore) {
          return b.searchScore - a.searchScore;
        }

        if (referenceLocation && a.distanciaKm !== null && b.distanciaKm !== null && a.distanciaKm !== b.distanciaKm) {
          return a.distanciaKm - b.distanciaKm;
        }

        const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        if (aCreatedAt !== bCreatedAt) {
          return bCreatedAt - aCreatedAt;
        }

        return a.titulo.localeCompare(b.titulo);
      });
  }, [categoryFilter, proximityRadiusKm, referenceLocation, searchedLocation?.source, searchTokens.length, toursComDistancia]);

  useEffect(() => {
    if (!toursFiltrados.length) {
      setSelectedTourId(null);
      return;
    }

    if (!toursFiltrados.some((tour) => tour.id === selectedTourId)) {
      setSelectedTourId(toursFiltrados[0].id);
    }
  }, [selectedTourId, toursFiltrados]);

  const selectedTour = useMemo(() => {
    return toursFiltrados.find((tour) => tour.id === selectedTourId) ?? toursFiltrados[0] ?? null;
  }, [selectedTourId, toursFiltrados]);

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setAddressSearchState("idle");

      if (searchedLocation?.source === "filter") {
        setSearchedLocation(null);
        setLocationMode(null);

        setLocationStatus("Mostrando todos os ambientes. Busque um lugar para navegar por raio.");
      }

      return;
    }

    if (tours.some((tour) => getSearchMatchScore(tour, normalizedSearch, searchTokens) > 0)) {
      setAddressSearchState("idle");

      if (searchedLocation?.source === "filter") {
        setSearchedLocation(null);
        setLocationMode(null);
      }

      return;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      setAddressSearchState("searching");

      const result = await buscarEnderecoLivre(query);

      if (cancelled) {
        return;
      }

      if (result) {
        const radiusLabel = formatarRaioBusca(getProximityRadiusKm(result) ?? SEARCH_RESULT_RADIUS_KM);

        setSearchedLocation(result);
        setLocationMode("search");
        setAddressSearchState(result.isApproximate ? "found-approximate" : "found-exact");
        setLocationStatus(
          result.isApproximate
            ? `Encontramos uma região aproximada. Mostrando ambientes em até ${radiusLabel} desse ponto.`
            : `Endereço encontrado. Mostrando ambientes em até ${radiusLabel} desse ponto.`
        );
      } else {
        if (searchedLocation?.source === "filter") {
          setSearchedLocation(null);
          setLocationMode(null);
        }

        setAddressSearchState("not-found");
        setLocationStatus(
          "Não encontramos esse endereço. Tente uma versão mais curta, como cidade, bairro ou rua."
        );
      }

      setSearchLoading(false);
    }, SEARCH_INPUT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedSearch, search, searchTokens, searchedLocation?.source, tours]);

  useEffect(() => {
    if (loading || searchLoading || placeSearchLoading) {
      return;
    }

    if (!referenceLocation || proximityRadiusKm === null || toursFiltrados.length > 0) {
      return;
    }

    const radiusLabel = formatarRaioBusca(proximityRadiusKm);

    if (locationMode === "search" && searchedLocation) {
      setAddressSearchState("no-nearby");
      setLocationStatus(
        searchedLocation.isApproximate
          ? `Encontramos uma região aproximada, mas ainda não há ambiente cadastrado em até ${radiusLabel} desse ponto.`
          : `Endereço encontrado, mas ainda não há ambiente cadastrado em até ${radiusLabel} desse ponto.`
      );
    }
  }, [
    loading,
    locationMode,
    placeSearchLoading,
    proximityRadiusKm,
    referenceLocation,
    searchedLocation,
    searchLoading,
    toursFiltrados.length,
  ]);

  const center = useMemo<[number, number]>(() => {
    if (searchedLocation) {
      return [searchedLocation.latitude, searchedLocation.longitude];
    }

    if (selectedTour) {
      return [selectedTour.latitude, selectedTour.longitude];
    }

    return DEFAULT_CENTER;
  }, [searchedLocation, selectedTour]);

  const buscarLugarEspecifico = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const query = placeSearch.trim();

      if (!query) {
        setAddressSearchState("idle");
        setLocationStatus("Digite um lugar para buscar.");
        return;
      }

      try {
        setPlaceSearchLoading(true);
        setAddressSearchState("searching");
        setLocationStatus("Buscando o lugar informado...");

        const result = await buscarEnderecoLivre(query);

        if (!result) {
          setAddressSearchState("not-found");
          setLocationStatus(
            "Não encontramos esse lugar com precisão. Tente uma versão mais curta, como cidade, bairro ou rua."
          );
          return;
        }

        const radiusLabel = formatarRaioBusca(getProximityRadiusKm(result) ?? SEARCH_RESULT_RADIUS_KM);

        setSearchedLocation({
          ...result,
          source: "manual",
        });
        setLocationMode("search");
        setAddressSearchState(result.isApproximate ? "found-approximate" : "found-exact");
        setLocationStatus(
          result.isApproximate
            ? `Lugar encontrado de forma aproximada. Mostrando ambientes em até ${radiusLabel} desse ponto.`
            : `Lugar encontrado com boa precisão. Mostrando ambientes em até ${radiusLabel} desse ponto.`
        );
      } catch (error) {
        console.error(error);
        setLocationStatus("Erro ao buscar o lugar informado.");
      } finally {
        setPlaceSearchLoading(false);
      }
    },
    [placeSearch]
  );

  const usarMinhaLocalizacao = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Seu navegador não suporta geolocalização.");
      return;
    }

    setGeoLoading(true);
    setAddressSearchState("searching");
    setLocationStatus("Obtendo sua localização atual...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const location: SearchedLocation = {
          latitude,
          longitude,
          label: `Sua localização (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
          source: "manual",
          isApproximate: false,
        };

        setSearchedLocation(location);
        setLocationMode("search");
        setAddressSearchState("found-exact");
        setGeoLoading(false);

        const radiusKm = SEARCH_RESULT_RADIUS_KM;
        const radiusLabel = formatarRaioBusca(radiusKm);
        setLocationStatus(
          `Localização obtida com sucesso. Mostrando ambientes em até ${radiusLabel} da sua posição.`
        );
      },
      (error) => {
        console.error("Erro ao obter geolocalização:", error);
        setGeoLoading(false);

        let message = "Não foi possível obter sua localização.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Permissão de localização negada. Autorize o acesso nas configurações do seu navegador ou dispositivo.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Localização indisponível no momento. Tente novamente ou use a busca por lugar.";
        } else if (error.code === error.TIMEOUT) {
          message = "A busca pela localização demorou demais. Tente novamente ou use a busca por lugar.";
        }

        setAddressSearchState("not-found");
        setLocationStatus(message);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
    );
  }, []);

  const limparLocalizacao = useCallback(() => {
    setSearchedLocation(null);
    setLocationMode(null);
    setAddressSearchState("idle");
    setLocationStatus("Ordenação por raio desativada.");
  }, []);

  const createMarkerHandlers = useCallback(
    (tourId: number) => ({
      click: () => setSelectedTourId(tourId),
      mouseover: () => setSelectedTourId(tourId),
    }),
    []
  );

  const [panelExpanded, setPanelExpanded] = useState(false);
  const togglePanel = useCallback(() => setPanelExpanded((prev) => !prev), []);

  return (
    <div className="explorer-page">
      <div className={`explorer-topbar ${panelExpanded ? "explorer-topbar--expanded" : ""}`}>
        <button
          type="button"
          className="explorer-panel-toggle"
          onClick={togglePanel}
          aria-label={panelExpanded ? "Recolher painéis" : "Expandir painéis"}
          title={panelExpanded ? "Recolher" : "Expandir"}
        >
          <span>{panelExpanded ? "▲" : "▼"}</span>
        </button>

        <div className="explorer-panel explorer-panel--filters">
          <p className="explorer-hud-label">Filtros</p>
          <div className="explorer-filters">
            <input
              type="text"
              className="explorer-search"
              placeholder="Buscar por título, categoria ou digitar um endereço completo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="explorer-category-select"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="todos">Todas as categorias</option>
              {categoriasDisponiveis.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="explorer-panel explorer-panel--location">
          <p className="explorer-hud-label">Localização por raio</p>
          <form className="explorer-place-search" onSubmit={buscarLugarEspecifico}>
            <input
              type="text"
              className="explorer-place-search__input"
              placeholder="Buscar um lugar específico"
              value={placeSearch}
              onChange={(event) => setPlaceSearch(event.target.value)}
            />
            <button type="submit" className="explorer-location-btn explorer-location-btn--secondary">
              {placeSearchLoading ? "Buscando..." : "Buscar lugar"}
            </button>
          </form>

          <div className="explorer-location-actions">
            <button
              type="button"
              className="explorer-location-btn explorer-location-btn--secondary"
              onClick={usarMinhaLocalizacao}
              disabled={geoLoading}
            >
              {geoLoading ? "Obtendo localização..." : "Usar minha localização"}
            </button>
            {searchedLocation ? (
              <button
                type="button"
                className="explorer-location-btn explorer-location-btn--ghost"
                onClick={limparLocalizacao}
              >
                Limpar referência
              </button>
            ) : null}
          </div>

          <p className="explorer-location-status">{locationStatus}</p>
          {searchedLocation ? (
            <p className="explorer-location-status">
              Referência atual: <strong>{searchedLocation.label}</strong>
              {searchedLocation.isApproximate ? " (aproximada)" : ""}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="explorer-hud-empty">
          <strong>Carregando pontos do mapa...</strong>
          <p className="explorer-hud-subtitle">
            Preparando os ambientes públicos disponíveis para navegação.
          </p>
        </div>
      ) : geoLoading ? (
        <div className="explorer-hud-empty--loading">
          <div className="explorer-geo-spinner" />
          <strong>Obtendo sua localização...</strong>
          <p className="explorer-hud-subtitle">
            Aguardando a resposta do GPS do seu dispositivo. Certifique-se de que a localização está ativada.
          </p>
        </div>
      ) : !selectedTour ? (
        <div className="explorer-hud-empty">
          <strong>
            {searchLoading || placeSearchLoading
              ? "Buscando endereço ou lugar..."
              : addressSearchState === "not-found"
              ? "Endereço não encontrado"
              : addressSearchState === "no-nearby"
              ? searchedLocation?.isApproximate
                ? "Região encontrada, mas sem ambientes próximos"
                : "Endereço encontrado, mas sem ambientes próximos"
              : search.trim()
              ? "Nenhum ambiente encontrado para esse filtro"
              : "Nenhum ambiente encontrado"}
          </strong>
          <p className="explorer-hud-subtitle">
            {searchLoading || placeSearchLoading
              ? "Tentando localizar o ponto informado para ordenar os ambientes por proximidade."
              : addressSearchState === "not-found"
              ? "Não conseguimos localizar esse endereço. Tente uma versão mais curta, como cidade, bairro ou rua. Se preferir, use a busca por lugar."
              : addressSearchState === "no-nearby"
              ? searchedLocation?.isApproximate
                ? "Encontramos apenas uma região aproximada e, dentro do raio exibido, ainda não há ambientes cadastrados. Você pode limpar a referência para voltar a ver todos os ambientes."
                : "O endereço foi localizado com sucesso, mas ainda não existe ambiente cadastrado dentro do raio exibido. Você pode limpar a referência para voltar a ver todos os ambientes."
              : search.trim()
              ? "Revise os filtros ou limpe a referência atual para ampliar os resultados."
              : "Cadastre ambientes públicos com coordenadas para que eles apareçam no explorar."}
          </p>
        </div>
      ) : null}

      <div className="explorer-map-note">
        <span>Clique em um ponto do mapa para ver os detalhes e abrir o tour</span>
      </div>

      <MapContainer center={center} zoom={4} className="explorer-map" zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <AjustarMapa
          tours={toursFiltrados}
          referenceLocation={searchedLocation}
          proximityRadiusKm={proximityRadiusKm}
          selectedTour={selectedTour}
        />

        {searchedLocation && proximityRadiusKm !== null ? (
          <>
            <Circle
              center={[searchedLocation.latitude, searchedLocation.longitude]}
              radius={proximityRadiusKm * 1000}
              pathOptions={{
                color: "#9fe7ff",
                weight: 1.5,
                fillColor: "#bff3ff",
                fillOpacity: 0.14,
              }}
            />
            <Circle
              center={[searchedLocation.latitude, searchedLocation.longitude]}
              radius={Math.max(proximityRadiusKm * 1000 * 0.28, 1200)}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: "#9fe7ff",
                fillOpacity: 0.2,
              }}
            />
          </>
        ) : null}

        {searchedLocation ? (
          <Marker position={[searchedLocation.latitude, searchedLocation.longitude]} icon={searchLocationIcon}>
            <Popup>
              <div className="explorer-popup">
                <h3>Área pesquisada</h3>
                <p>{searchedLocation.label}</p>
                <p>
                  Raio de navegação:{" "}
                  {proximityRadiusKm !== null ? formatarRaioBusca(proximityRadiusKm) : "indisponível"}.
                </p>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {toursFiltrados.map((tour) => {
          const imageUrl = resolveMediaUrl(tour.imagemPreview);
          const localizacao = formatarLocalizacao(tour);

          return (
            <Marker
              key={tour.id}
              position={[tour.latitude, tour.longitude]}
              icon={getTourMarkerIcon(tour)}
              eventHandlers={createMarkerHandlers(tour.id)}
            >
              <Tooltip direction="top" offset={[0, -28]} opacity={1}>
                <div className="explorer-marker-tooltip">
                  <strong>{tour.titulo}</strong>
                  {getExplorerBadgeLabel(tour) ? (
                    <span className="explorer-marker-tooltip__badge">{getExplorerBadgeLabel(tour)}</span>
                  ) : null}
                  {referenceLocation ? <span>{formatarDistancia(tour.distanciaKm)}</span> : null}
                </div>
              </Tooltip>
              <Popup>
                <div className="explorer-popup">
                  <div className="explorer-popup__header">
                    <h3>{tour.titulo}</h3>
                    {getExplorerBadgeLabel(tour) ? (
                      <span className={getTourBadgeClassName(tour)}>{getExplorerBadgeLabel(tour)}</span>
                    ) : null}
                  </div>
                  {imageUrl ? <img src={imageUrl} alt={tour.titulo} /> : null}
                  {tour.categoria ? (
                    <p>
                      <strong>Categoria:</strong> {tour.categoria}
                    </p>
                  ) : null}
                  <p>{localizacao.linhaPrincipal}</p>
                  {localizacao.linhaSecundaria !== "Sem detalhes adicionais" ? (
                    <p>{localizacao.linhaSecundaria}</p>
                  ) : null}
                  {referenceLocation ? <p>{formatarDistancia(tour.distanciaKm)}</p> : null}
                  {tour.pagamentoDestacado ? (
                    <p className="explorer-popup__highlight">Ambiente em destaque.</p>
                  ) : null}
                  <a
                    href={`/tour/${tour.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="explorer-popup__cta"
                    onClick={() => {
                      void registrarVisualizacaoAmbiente(tour.id).catch((error) => {
                        console.error("Erro ao registrar visualização do ambiente:", error);
                      });
                    }}
                  >
                    Ver tour VR
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
