import { API_URL } from "../utils/apiConfig";

export function getStoredToken() {
  return localStorage.getItem("token");
}

export function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

function formatApiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Erro na requisição";
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.details)) {
    const details = record.details.filter((detail): detail is string => typeof detail === "string");
    if (details.length > 0) {
      return details.join(", ");
    }
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error;
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return "Erro na requisição";
}

export async function request<TResponse>(
  endpoint: string,
  options: RequestInit = {},
  auth = false
): Promise<TResponse> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let lastData: unknown = {};
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    lastData = data;
    lastStatus = res.status;

    if (res.ok) {
      return data as TResponse;
    }

    if (res.status === 401) {
      if (auth) {
        clearStoredSession();
      }

      const unauthorizedMessage =
        typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : typeof data === "object" &&
              data !== null &&
              "message" in data &&
              typeof data.message === "string"
            ? data.message
            : auth
              ? "Sessão expirada"
              : "Acesso não autorizado";

      throw new Error(unauthorizedMessage);
    }

    if (res.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      continue;
    }

    break;
  }

  console.error("API ERROR:", {
    endpoint,
    status: lastStatus,
    response: lastData,
    message: formatApiErrorMessage(lastData),
  });

  if (lastStatus === 429) {
    throw new Error("Muitas requisições em sequência. Tente novamente em alguns segundos.");
  }

  throw new Error(formatApiErrorMessage(lastData));
}
