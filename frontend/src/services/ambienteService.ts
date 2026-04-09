import { getStoredToken, request } from "./httpClient";
import { getMe } from "./authService";
import type { Ambiente, CreateAmbientePayload, Lead, Empresa, Usuario } from "./types";

export function getAmbiente(id: number): Promise<Ambiente> {
  return request<Ambiente>(`/ambientes/${id}`, { method: "GET" }, Boolean(getStoredToken()));
}

export async function getAmbientes(usuario?: Usuario | null): Promise<Ambiente[]> {
  const usuarioAtual = usuario || (await getMe());

  if (!usuarioAtual?.role) {
    return request<Ambiente[]>("/ambientes", { method: "GET" });
  }

  if (usuarioAtual.role === "admin") {
    return request<Ambiente[]>("/admin/ambientes", { method: "GET" }, true);
  }

  if (usuarioAtual.role === "empresa") {
    return request<Ambiente[]>("/empresa/ambientes", { method: "GET" }, true);
  }

  return request<Ambiente[]>("/ambientes", { method: "GET" });
}

export function getAmbientesPublicos(): Promise<Ambiente[]> {
  return request<Ambiente[]>("/ambientes", { method: "GET" }, Boolean(getStoredToken()));
}

export async function getAmbientesExplorer(): Promise<Ambiente[]> {
  try {
    return await request<Ambiente[]>("/explorer", { method: "GET" }, Boolean(getStoredToken()));
  } catch (error) {
    console.warn("Falha ao carregar /explorer, usando fallback /ambientes:", error);
    return request<Ambiente[]>("/ambientes", { method: "GET" }, Boolean(getStoredToken()));
  }
}

export function createAmbiente(data: CreateAmbientePayload): Promise<Ambiente> {
  const form = new FormData();
  form.append("titulo", data.titulo);
  form.append("descricao", data.descricao);
  form.append("linkVR", data.linkVR);
  if (data.siteUrl) form.append("siteUrl", data.siteUrl);
  if (data.imagem) form.append("imagem", data.imagem);
  form.append("publico", data.publico ? "true" : "false");
  if (data.categoria) form.append("categoria", data.categoria);
  if (data.cidade) form.append("cidade", data.cidade);
  if (data.pais) form.append("pais", data.pais);
  if (data.endereco) form.append("endereco", data.endereco);
  if (data.cep) form.append("cep", data.cep);
  form.append("latitude", String(data.latitude));
  form.append("longitude", String(data.longitude));
  if (data.clienteEmail) form.append("clienteEmail", data.clienteEmail);
  if (data.pedidoId !== undefined) form.append("pedidoId", String(data.pedidoId));

  return request<Ambiente>("/ambientes", { method: "POST", body: form }, true);
}

export function updateAmbiente(
  id: number,
  data: {
    titulo?: string;
    descricao?: string;
    linkVR?: string;
    siteUrl?: string;
    imagem?: File | null;
    publico?: boolean;
    cidade?: string;
    pais?: string;
    endereco?: string;
    cep?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<Ambiente> {
  const form = new FormData();
  if (data.titulo) form.append("titulo", data.titulo);
  if (data.descricao) form.append("descricao", data.descricao);
  if (data.linkVR) form.append("linkVR", data.linkVR);
  if (data.siteUrl) form.append("siteUrl", data.siteUrl);
  if (data.imagem) form.append("imagem", data.imagem);
  if (data.publico !== undefined) form.append("publico", data.publico ? "true" : "false");
  if (data.cidade) form.append("cidade", data.cidade);
  if (data.pais) form.append("pais", data.pais);
  if (data.endereco) form.append("endereco", data.endereco);
  if (data.cep) form.append("cep", data.cep);
  if (data.latitude !== undefined) form.append("latitude", String(data.latitude));
  if (data.longitude !== undefined) form.append("longitude", String(data.longitude));

  return request<Ambiente>(`/ambientes/${id}`, { method: "PUT", body: form }, true);
}

export function deleteAmbiente(id: number): Promise<void> {
  return request<void>(`/ambientes/${id}`, { method: "DELETE" }, true);
}

export function enviarLead(data: Lead) {
  return request("/leads", { method: "POST", body: JSON.stringify(data) });
}

export function getEmpresa(slug: string): Promise<Empresa> {
  return request<Empresa>(`/empresa/${slug}`);
}

async function getClientLocationMetadata(): Promise<{ cidade?: string; pais?: string }> {
  if (!("geolocation" in navigator) || !window.isSecureContext) {
    return {};
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 60000,
      });
    });

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    const data = await response.json();

    const address = data?.address || {};

    return {
      cidade:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.city_district ||
        address.suburb ||
        address.county ||
        undefined,
      pais: address.country || undefined,
    };
  } catch {
    return {};
  }
}

export async function registrarVisualizacaoAmbiente(id: number) {
  const location = await getClientLocationMetadata();

  return request(
    `/ambientes/${id}/view`,
    {
      method: "POST",
      body: JSON.stringify(location),
    },
    Boolean(getStoredToken())
  );
}