// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/* =====================================================
   FUNÇÃO BASE
===================================================== */
async function request(
  endpoint: string,
  options: RequestInit = {},
  auth = false
) {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let lastData: any = {};
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {}

    lastData = data;
    lastStatus = res.status;

    if (res.ok) {
      return data;
    }

    if (res.status === 401) {
      if (auth) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
      }
      throw new Error(data?.error || (auth ? "Sessão expirada" : "Acesso não autorizado"));
    }

    if (res.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      continue;
    }

    break;
  }

  console.error("API ERROR:", lastData);
  if (lastStatus === 429) {
    throw new Error("Muitas requisições em sequência. Tente novamente em alguns segundos.");
  }

  const errorDetails = Array.isArray(lastData?.details)
    ? lastData.details.filter((detail: unknown): detail is string => typeof detail === "string")
    : [];

  const message =
    errorDetails.length > 0
      ? errorDetails.join(", ")
      : lastData?.error || "Erro na requisição";

  throw new Error(message);
}

/* =====================================================
   👤 USUÁRIOS / AUTH
===================================================== */
export interface Empresa {
  id: number;
  nome: string;
  telefone?: string;
  whatsapp?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  foto?: string;
  role?: "user" | "empresa" | "admin";
  criado_em?: string;
  empresa?: Empresa | null;
}

export async function login(email: string, senha: string) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
  if (data.token) localStorage.setItem("token", data.token);
  return data;
}

export async function register(
  nome: string,
  email: string,
  senha: string,
  empresaNome?: string,
  orgaoPublico = false
) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha, empresaNome, orgaoPublico }),
  });
}

export function getMe(): Promise<Usuario> {
  return request("/auth/me", { method: "GET" }, true);
}

export function logout() {
  localStorage.removeItem("token");
}

export async function getUsuarios(): Promise<Usuario[]> {
  const usuarioAtual = await getMe();
  let usuarios = await request("/usuarios", { method: "GET" }, true);

  if (usuarioAtual.role !== "admin") {
    usuarios = usuarios.filter(
      (u: Usuario) => u.empresa?.id === usuarioAtual.empresa?.id
    );
  }

  return usuarios;
}

export function updateUsuario(
  id: number,
  data: { nome?: string; email?: string; foto?: File | null; senha?: string }
): Promise<Usuario> {
  const form = new FormData();
  if (data.nome) form.append("nome", data.nome);
  if (data.email) form.append("email", data.email);
  if (data.foto) form.append("foto", data.foto);
  if (data.senha) form.append("senha", data.senha);

  return request(`/usuarios/${id}`, { method: "PUT", body: form }, true);
}

/* =====================================================
   📦 PEDIDOS
===================================================== */
export type PagamentoStatus = "nao_pago" | "pago" | "pago_a_mais";
export type PedidoUiStatus = "pending" | "in_progress" | "completed";
export type PedidoApiStatus =
  | PedidoUiStatus
  | "novo"
  | "em_andamento"
  | "concluido"
  | "concluído"
  | "pendente"
  | "completo";

export interface PagamentoHistoricoEntry {
  status: PagamentoStatus;
  updatedAt: string;
  updatedById?: number;
  updatedByNome?: string;
  updatedByRole?: string;
}

export interface Pedido {
  id: number;
  empresaId?: number;
  empresa?: { id: number; nome: string };
  nomeCliente?: string;
  email: string;
  telefone?: string;
  mensagem: string;
  status?: PedidoApiStatus | string;
  createdAt: string;
  updatedAt?: string;
  tipoServico?: string;
  area?: number;
  valorSimulado?: number;
  local?: string;
  cep?: string;
  pago?: boolean;
  pagamentoStatus?: PagamentoStatus;
  pagamentoHistorico?: PagamentoHistoricoEntry[];
  locationMode?: "manual" | "cep";
}

export interface GetPedidosParams {
  search?: string;
  status?: PedidoApiStatus | "all";
  pagamentoStatus?: PagamentoStatus | "all";
  empresaId?: number | string;
}

const PEDIDO_STATUS_TO_API: Record<PedidoUiStatus, "novo" | "em_andamento" | "concluido"> = {
  pending: "novo",
  in_progress: "em_andamento",
  completed: "concluido",
};

export function mapPedidoStatusToApi(status?: string) {
  if (!status) return undefined;

  const normalized = status.trim().toLowerCase();

  if (normalized === "all") {
    return undefined;
  }

  if (normalized in PEDIDO_STATUS_TO_API) {
    return PEDIDO_STATUS_TO_API[normalized as PedidoUiStatus];
  }

  switch (normalized) {
    case "novo":
    case "pendente":
      return "novo";
    case "em_andamento":
    case "in progress":
      return "em_andamento";
    case "concluido":
    case "concluído":
    case "completo":
      return "concluido";
    default:
      return normalized;
  }
}

export function getPedidos(params?: GetPedidosParams): Promise<Pedido[]> {
  const searchParams = new URLSearchParams();

  if (params?.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const apiStatus = mapPedidoStatusToApi(params?.status);
  if (apiStatus) {
    searchParams.set("status", apiStatus);
  }

  if (params?.pagamentoStatus && params.pagamentoStatus !== "all") {
    searchParams.set("pagamentoStatus", params.pagamentoStatus);
  }

  if (
    params?.empresaId !== undefined &&
    params.empresaId !== null &&
    String(params.empresaId).trim()
  ) {
    searchParams.set("empresaId", String(params.empresaId));
  }

  const query = searchParams.toString();
  const endpoint = query ? `/pedidos?${query}` : "/pedidos";

  return request(endpoint, { method: "GET" }, true);
}

export function getHistoricoPedidos(usuarioId: number | string): Promise<Pedido[]> {
  return request(`/historico/${usuarioId}/pedidos`, { method: "GET" }, true);
}

export function getHistoricoPedidosPublico(usuarioId: number | string): Promise<Pedido[]> {
  return request(`/historico-publico/${usuarioId}/pedidos`, { method: "GET" });
}

export function createPedido(data: {
  nomeCliente?: string;
  email: string;
  telefone?: string;
  mensagem: string;
  tipoServico?: string;
  area?: number;
  valorSimulado?: number;
  local?: string;
  cep?: string;
  pago?: boolean;
  locationMode?: "manual" | "cep";
  status?: PedidoApiStatus;
  pagamentoStatus?: PagamentoStatus;
}): Promise<Pedido> {
  const payload = {
    ...data,
    status: mapPedidoStatusToApi(data.status),
  };

  return request("/pedidos", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export function updatePedido(id: number, data: Partial<Pedido>): Promise<Pedido> {
  const payload = {
    ...data,
    status: mapPedidoStatusToApi(data.status),
  };

  return request(`/pedidos/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, true);
}

export function deletePedido(id: number) {
  return request(`/pedidos/${id}`, { method: "DELETE" }, true);
}

/* =====================================================
   🌍 AMBIENTES
===================================================== */
export interface Ambiente {
  id: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  siteUrl?: string | null;
  publico: boolean;
  categoria?: string;
  imagemPreview?: string | null;
  cidade?: string | null;
  pais?: string | null;
  endereco?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pedidoId?: number | null;
  pedido?: {
    id: number;
    pagamentoStatus?: PagamentoStatus;
    pago?: boolean;
    telefone?: string | null;
    email?: string | null;
  } | null;
  usuario?: { id: number; nome: string; email?: string; empresa?: Empresa | null };
  empresa?: { id: number; nome: string; whatsapp?: string; email?: string; telefone?: string };
  empresaPedido?: { id: number; nome: string; email?: string; telefone?: string; whatsapp?: string } | null;
}

// GET /ambientes/:id — público
export function getAmbiente(id: number): Promise<Ambiente> {
  const token = localStorage.getItem("token");
  return request(`/ambientes/${id}`, { method: "GET" }, Boolean(token));
}

// GET inteligente — usa rota correta por role
export async function getAmbientes(usuario?: Usuario | null): Promise<Ambiente[]> {
  const usuarioAtual = usuario || (await getMe());

  if (!usuarioAtual?.role) {
    return request("/ambientes", { method: "GET" });
  }

  if (usuarioAtual.role === "admin") {
    // admin vê todos via /admin/ambientes
    return request("/admin/ambientes", { method: "GET" }, true);
  } else if (usuarioAtual.role === "empresa") {
    // empresa vê só os seus via /empresa/ambientes
    return request("/empresa/ambientes", { method: "GET" }, true);
  } else {
    // user vê só públicos via /ambientes
    return request("/ambientes", { method: "GET" });
  }
}



// GET /ambientes — só públicos (sem auth)
export function getAmbientesPublicos(): Promise<Ambiente[]> {
  const token = localStorage.getItem("token");
  return request("/ambientes", { method: "GET" }, Boolean(token));
}

// GET /explorer — públicos prontos para o mapa/explorer
export async function getAmbientesExplorer(): Promise<Ambiente[]> {
  const token = localStorage.getItem("token");

  try {
    return await request("/explorer", { method: "GET" }, Boolean(token));
  } catch (error) {
    console.warn("Falha ao carregar /explorer, usando fallback /ambientes:", error);
    return request("/ambientes", { method: "GET" }, Boolean(token));
  }
}

export interface CreateAmbientePayload {
  pedidoId?: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  siteUrl?: string;
  imagem?: File | null;
  publico?: boolean;
  categoria?: string;
  cidade?: string;
  pais?: string;
  endereco?: string;
  cep?: string;
  latitude: number;
  longitude: number;
  clienteEmail?: string;
}

// POST /ambiente — cria ambiente
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

  return request("/ambientes", { method: "POST", body: form }, true);
}

// PUT /ambiente/:id — edita ambiente
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

  return request(`/ambientes/${id}`, { method: "PUT", body: form }, true);
}

// DELETE /ambiente/:id
export function deleteAmbiente(id: number): Promise<void> {
  return request(`/ambientes/${id}`, { method: "DELETE" }, true);
}

/* =====================================================
   📩 LEADS
===================================================== */
export interface Lead {
  nome?: string;
  email?: string;
  telefone?: string;
  mensagem?: string;
  empresaId: number;
}

export function enviarLead(data: Lead) {
  return request("/leads", { method: "POST", body: JSON.stringify(data) });
}

/* =====================================================
   🏢 EMPRESA
===================================================== */
export function getEmpresa(slug: string) {
  return request(`/empresa/${slug}`);
}

async function getClientLocationMetadata() {
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
  const token = localStorage.getItem("token");

  return request(
    `/ambientes/${id}/view`,
    {
      method: "POST",
      body: JSON.stringify(location),
    },
    Boolean(token)
  );
}
