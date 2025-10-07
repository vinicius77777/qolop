// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(endpoint: string, options: RequestInit = {}, auth = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // 🔥 garante que sempre tenha JSON, mesmo em erro
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || "Erro na requisição");
  }

  return data;
}


export interface Usuario {
  id: number;
  nome: string;
  email: string;
  foto?: string;
  role?: string;
  criado_em?: string;
}

export function login(email: string, senha: string) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
}

export function register(nome: string, email: string, senha: string, foto?: string) {
  return request("/usuarios", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha, foto }),
  });
}

export function getMe(): Promise<Usuario> {
  return request("/me", { method: "GET" }, true);
}

export function getUsuarios(): Promise<Usuario[]> {
  return request("/usuarios", { method: "GET" }, true);
}

export function getUsuario(id: number): Promise<Usuario> {
  return request(`/usuarios/${id}`, { method: "GET" }, true);
}

export interface UsuarioUpdateData {
  nome?: string;
  email?: string;
  senha?: string;
  foto?: string;
}

export function updateUsuario(id: number, data: UsuarioUpdateData): Promise<Usuario> {
  return request(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }, true);
}

export function deleteUsuario(id: number) {
  return request(`/usuarios/${id}`, { method: "DELETE" }, true);
}

/**
 * =========================================
 * 📦 PEDIDOS
 * =========================================
 */
export interface Pedido {
  id: number;
  empresa: string;
  email: string;
  telefone?: string;
  mensagem: string;
  status: string;
  criado_em: string;
}

export function getPedidos(): Promise<Pedido[]> {
  return request("/pedidos", {}, true);
}

export function createPedido(empresa: string, email: string, telefone: string, mensagem: string): Promise<Pedido> {
  return request("/pedidos", {
    method: "POST",
    body: JSON.stringify({ empresa, email, telefone, mensagem }),
  });
}

export function updatePedido(id: number, status: string): Promise<Pedido> {
  return request(`/pedidos/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }, true);
}

export function deletePedido(id: number) {
  return request(`/pedidos/${id}`, { method: "DELETE" }, true);
}

/**
 * =========================================
 * 🌍 AMBIENTES
 * =========================================
 */
export interface Ambiente {
  id: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  imagemPreview?: string;
}

export function getAmbientes(): Promise<Ambiente[]> {
  return request("/ambientes");
}

export function getAmbiente(id: number): Promise<Ambiente> {
  return request(`/ambientes/${id}`);
}

export function createAmbiente(titulo: string, descricao: string, linkVR: string, imagemPreview?: string): Promise<Ambiente> {
  return request("/ambientes", {
    method: "POST",
    body: JSON.stringify({ titulo, descricao, linkVR, imagemPreview }),
  }, true);
}

export function updateAmbiente(id: number, titulo: string, descricao: string, linkVR: string, imagemPreview?: string): Promise<Ambiente> {
  return request(`/ambientes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ titulo, descricao, linkVR, imagemPreview }),
  }, true);
}

export function deleteAmbiente(id: number) {
  return request(`/ambientes/${id}`, { method: "DELETE" }, true);
}
