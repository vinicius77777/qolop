import { clearStoredSession, request } from "./httpClient";
import type { Usuario } from "./types";
import { sanitizeUsuario } from "../utils/permissions";

interface AuthResponse {
  token?: string;
  usuario: Usuario;
}

interface CreateEmpresaResponse {
  empresa: {
    id: number;
    nome: string;
    slug: string;
    descricao?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    logo?: string | null;
    publico: boolean;
  };
  usuario: Usuario;
}

interface PasswordResetRequestResponse {
  message: string;
}

interface PasswordResetConfirmResponse {
  message: string;
}

export async function login(email: string, senha: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });

  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  return {
    ...data,
    usuario: sanitizeUsuario(data.usuario),
  };
}

export async function register(
  nome: string,
  email: string,
  senha: string
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha }),
  });

  return {
    ...data,
    usuario: sanitizeUsuario(data.usuario),
  };
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResponse> {
  return request<PasswordResetRequestResponse>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(data: {
  email: string;
  token: string;
  senha: string;
}): Promise<PasswordResetConfirmResponse> {
  return request<PasswordResetConfirmResponse>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<Usuario> {
  const usuario = await request<Usuario>("/auth/me", { method: "GET" }, true);

  return sanitizeUsuario(usuario);
}

export function logout() {
  clearStoredSession();
}

export async function getUsuarios(): Promise<Usuario[]> {
  const usuarioAtual = await getMe();
  let usuarios = await request<Usuario[]>("/usuarios", { method: "GET" }, true);

  if (usuarioAtual.role !== "admin") {
    usuarios = usuarios.filter((usuario) => usuario.empresa?.id === usuarioAtual.empresa?.id);
  }

  return usuarios.map((usuario) => sanitizeUsuario(usuario));
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

  return request<Usuario>(`/usuarios/${id}`, { method: "PUT", body: form }, true);
}

export async function createEmpresa(data: {
  nome: string;
  email?: string | null;
  descricao?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  logo?: File | null;
  publico?: boolean;
}): Promise<CreateEmpresaResponse> {
  const form = new FormData();
  form.append("nome", data.nome);

  if (data.email !== undefined && data.email !== null) {
    form.append("email", data.email);
  }

  if (data.descricao !== undefined && data.descricao !== null) {
    form.append("descricao", data.descricao);
  }

  if (data.telefone !== undefined && data.telefone !== null) {
    form.append("telefone", data.telefone);
  }

  if (data.whatsapp !== undefined && data.whatsapp !== null) {
    form.append("whatsapp", data.whatsapp);
  }

  if (data.logo) {
    form.append("logo", data.logo);
  }

  if (data.publico !== undefined) {
    form.append("publico", data.publico ? "true" : "false");
  }

  const response = await request<CreateEmpresaResponse>(
    "/empresa",
    {
      method: "POST",
      body: form,
    },
    true
  );

  return {
    ...response,
    usuario: sanitizeUsuario(response.usuario),
  };
}
