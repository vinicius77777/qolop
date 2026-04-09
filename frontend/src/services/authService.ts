import { clearStoredSession, request } from "./httpClient";
import type { Usuario } from "./types";

interface AuthResponse {
  token?: string;
  usuario: Usuario;
}

export async function login(email: string, senha: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });

  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  return data;
}

export function register(
  nome: string,
  email: string,
  senha: string,
  empresaNome?: string,
  orgaoPublico = false
) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha, empresaNome, orgaoPublico }),
  });
}

export function getMe(): Promise<Usuario> {
  return request<Usuario>("/auth/me", { method: "GET" }, true);
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

  return request<Usuario>(`/usuarios/${id}`, { method: "PUT", body: form }, true);
}
