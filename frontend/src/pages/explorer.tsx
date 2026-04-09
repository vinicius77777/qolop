import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getAmbientesExplorer, registrarVisualizacaoAmbiente } from "../services/api";
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
}

interface TourComDistancia extends Tour {
  distanciaKm: number | null;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  label: string;
  accuracy?: number | null;
}

interface SearchedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

type LocationMode = "geolocation" | "search" | null;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const DEFAULT_CENTER: [number, number] = [-15.7801, -47.9292];
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 60000,
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [22, 38],
  iconAnchor: [12, 38],
  popupAnchor: [1, -34],
  shadowSize: [38, 38],
});

const userMarkerIcon = new L.DivIcon({
  className: "explorer-user-marker",
  html: '<div class="explorer-user-marker__dot"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function normalizeText(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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
    return `${Math.round(distanciaKm * 1000)} m de você`;
  }

  return `${distanciaKm.toFixed(1)} km de você`;
}

function formatarPrecisao(accuracy?: number | null) {
  if (!accuracy || !Number.isFinite(accuracy)) {
    return null;
  }

  const roundedAccuracy = Math.round(accuracy);

  if (roundedAccuracy < 1000) {
    return `${roundedAccuracy} m`;
  }

  return `${(roundedAccuracy / 1000).toFixed(1)} km`;
}

function AjustarMapa({
  tours,
  referenceLocation,
  selectedTour,
}: {
  tours: Tour[];
  referenceLocation: { latitude: number; longitude: number } | null;
  selectedTour: Tour | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (referenceLocation) {
      map.setView([referenceLocation.latitude, referenceLocation.longitude], 14, {
        animate: true,
      });
      return;
    }

    if (selectedTour) {
      map.setView([selectedTour.latitude, selectedTour.longitude], Math.max(map.getZoom(), 14), {
        animate: true,
      });
    }
  }, [map, referenceLocation, selectedTour]);

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

async function obterRotuloLocalizacao(latitude: number, longitude: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    const address = data?.address || {};

    return (
      [
        address.road,
        address.suburb || address.neighbourhood,
        address.city || address.town || address.village,
      ]
        .filter(Boolean)
        .slice(0, 2)
        .join(", ") ||
      data?.display_name ||
      "Sua localização atual"
    );
  } catch {
    return "Sua localização atual";
  }
}

export default function Explorer() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>(null);
  const [locationStatus, setLocationStatus] = useState(
    "Ative sua localização ou busque um lugar para ordenar os tours por proximidade."
  );
  const [permissionState, setPermissionState] = useState<string | null>(null);

  const autoRequestedRef = useRef(false);

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
    if (!("permissions" in navigator) || !navigator.permissions?.query) {
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        setPermissionState(status.state);
        status.onchange = () => setPermissionState(status.state);
      })
      .catch(() => {
        setPermissionState(null);
      });
  }, []);

  const categoriasDisponiveis = useMemo(() => {
    return Array.from(new Set(tours.map((tour) => normalizeText(tour.categoria)).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [tours]);

  const searchTokens = useMemo(() => {
    return normalizeText(search)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }, [search]);

  const toursComDistancia = useMemo<TourComDistancia[]>(() => {
    const referenceLocation = searchedLocation || userLocation;

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
    }));
  }, [searchedLocation, tours, userLocation]);

  const toursFiltrados = useMemo<TourComDistancia[]>(() => {
    return toursComDistancia
      .filter((tour) => {
        const searchableContent = buildTourSearchIndex(tour);
        const matchesSearch =
          searchTokens.length === 0 || searchTokens.every((token) => searchableContent.includes(token));

        const categoriaNormalizada = normalizeText(tour.categoria);
        const matchesCategory = categoryFilter === "todos" || categoriaNormalizada === categoryFilter;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if ((searchedLocation || userLocation) && a.distanciaKm !== null && b.distanciaKm !== null && a.distanciaKm !== b.distanciaKm) {
          return a.distanciaKm - b.distanciaKm;
        }

        return a.titulo.localeCompare(b.titulo);
      });
  }, [categoryFilter, searchedLocation, searchTokens, toursComDistancia, userLocation]);

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

  const center = useMemo<[number, number]>(() => {
    if (searchedLocation) {
      return [searchedLocation.latitude, searchedLocation.longitude];
    }

    if (userLocation) {
      return [userLocation.latitude, userLocation.longitude];
    }

    if (selectedTour) {
      return [selectedTour.latitude, selectedTour.longitude];
    }

    return DEFAULT_CENTER;
  }, [searchedLocation, selectedTour, userLocation]);

  const buscarMinhaLocalizacao = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationStatus("Seu navegador não suporta geolocalização.");
      return;
    }

    setLocationStatus("Obtendo sua localização atual...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          label: await obterRotuloLocalizacao(position.coords.latitude, position.coords.longitude),
        };

        setUserLocation(nextLocation);
        setSearchedLocation(null);
        setLocationMode("geolocation");

        const precisao = formatarPrecisao(position.coords.accuracy);
        setLocationStatus(
          precisao
            ? `Localização atual identificada com precisão estimada de ${precisao}.`
            : "Localização atual identificada com sucesso."
        );
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("Permissão de localização negada. Você ainda pode buscar um lugar manualmente.");
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationStatus("A localização demorou para responder. Tente novamente ou busque um lugar.");
          return;
        }

        setLocationStatus("Não foi possível obter sua localização agora. Você pode buscar um lugar manualmente.");
      },
      GEOLOCATION_OPTIONS
    );
  }, []);

  useEffect(() => {
    if (autoRequestedRef.current) {
      return;
    }

    autoRequestedRef.current = true;
    void buscarMinhaLocalizacao();
  }, [buscarMinhaLocalizacao]);

  const buscarLugarEspecifico = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const query = placeSearch.trim();

      if (!query) {
        setLocationStatus("Digite um lugar para buscar.");
        return;
      }

      try {
        setPlaceSearchLoading(true);
        setLocationStatus("Buscando o lugar informado...");

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        if (!Array.isArray(data) || !data.length) {
          setLocationStatus("Não encontramos esse lugar.");
          return;
        }

        const place = data[0];
        const latitude = Number(place.lat);
        const longitude = Number(place.lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocationStatus("Não foi possível usar esse lugar.");
          return;
        }

        setSearchedLocation({
          latitude,
          longitude,
          label: place.display_name || query,
        });
        setLocationMode("search");
        setLocationStatus("Lugar encontrado. Os tours foram reordenados por proximidade a esse ponto.");
      } catch (error) {
        console.error(error);
        setLocationStatus("Erro ao buscar o lugar informado.");
      } finally {
        setPlaceSearchLoading(false);
      }
    },
    [placeSearch]
  );

  const limparLocalizacao = useCallback(() => {
    setUserLocation(null);
    setSearchedLocation(null);
    setLocationMode(null);
    setLocationStatus("Ordenação por proximidade desativada.");
  }, []);

  const createMarkerHandlers = useCallback(
    (tourId: number) => ({
      click: () => setSelectedTourId(tourId),
      mouseover: () => setSelectedTourId(tourId),
    }),
    []
  );

  const locationDetails = useMemo(() => {
    if (permissionState === "denied") {
      return `${locationStatus} A permissão de localização está bloqueada no navegador.`;
    }

    if (permissionState === "prompt") {
      return `${locationStatus} Verifique o aviso do navegador se quiser usar sua posição atual.`;
    }

    return locationStatus;
  }, [locationStatus, permissionState]);

  return (
    <div className="explorer-page">
      <div className="explorer-topbar">
        <div className="explorer-panel explorer-panel--filters">
          <p className="explorer-hud-label">Filtros</p>
          <div className="explorer-filters">
            <input
              type="text"
              className="explorer-search"
              placeholder="Buscar por título, categoria, cidade, país ou endereço"
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
          <p className="explorer-hud-label">Localização</p>
          <form className="explorer-place-search" onSubmit={buscarLugarEspecifico}>
            <input
              type="text"
              className="explorer-place-search__input"
              placeholder="Buscar um lugar específico"
              value={placeSearch}
              onChange={(event) => setPlaceSearch(event.target.value)}
            />
            <button
              type="submit"
              className="explorer-location-btn explorer-location-btn--secondary"
            >
              {placeSearchLoading ? "Buscando..." : "Buscar lugar"}
            </button>
          </form>

          <div className="explorer-location-actions">
            <button type="button" className="explorer-location-btn" onClick={() => void buscarMinhaLocalizacao()}>
              Usar minha localização
            </button>
            {userLocation ? (
              <button
                type="button"
                className="explorer-location-btn explorer-location-btn--ghost"
                onClick={limparLocalizacao}
              >
                Limpar localização
              </button>
            ) : null}
          </div>

          <p className="explorer-location-status">{locationDetails}</p>
        </div>
      </div>

      {loading ? (
        <div className="explorer-hud-empty">
          <strong>Carregando pontos do mapa...</strong>
          <p className="explorer-hud-subtitle">
            Preparando os ambientes públicos disponíveis para navegação.
          </p>
        </div>
      ) : !selectedTour ? (
        <div className="explorer-hud-empty">
          <strong>Nenhum ambiente encontrado</strong>
          <p className="explorer-hud-subtitle">
            Ajuste a pesquisa, a categoria ou cadastre ambientes públicos com coordenadas.
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
          referenceLocation={searchedLocation || userLocation}
          selectedTour={selectedTour}
        />

        {userLocation?.accuracy ? (
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={userLocation.accuracy}
            pathOptions={{
              color: "#9fe7ff",
              weight: 1.5,
              fillColor: "#bff3ff",
              fillOpacity: 0.14,
            }}
          />
        ) : null}

        {userLocation ? (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userMarkerIcon}>
            <Popup>
              <div className="explorer-popup">
                <h3>{userLocation.label}</h3>
                <p>Sua localização atual.</p>
                {locationMode === "geolocation" ? (
                  <p>Precisão estimada: {formatarPrecisao(userLocation.accuracy) || "indisponível"}.</p>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ) : null}

        {toursFiltrados.map((tour) => {
          const imageUrl = tour.imagemPreview ? `${API_URL}${tour.imagemPreview}` : null;
          const localizacao = formatarLocalizacao(tour);

          return (
            <Marker
              key={tour.id}
              position={[tour.latitude, tour.longitude]}
              icon={markerIcon}
              eventHandlers={createMarkerHandlers(tour.id)}
            >
              <Tooltip direction="top" offset={[0, -28]} opacity={1}>
                <div className="explorer-marker-tooltip">
                  <strong>{tour.titulo}</strong>
                  {searchedLocation || userLocation ? <span>{formatarDistancia(tour.distanciaKm)}</span> : null}
                </div>
              </Tooltip>
              <Popup>
                <div className="explorer-popup">
                  <h3>{tour.titulo}</h3>
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
                  {searchedLocation || userLocation ? <p>{formatarDistancia(tour.distanciaKm)}</p> : null}
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
