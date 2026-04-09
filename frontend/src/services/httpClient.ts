const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function getStoredToken() {
  return localStorage.getItem("token");
}

export function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
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

    let data: unknown = {};
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

  console.error("API ERROR:", lastData);

  if (lastStatus === 429) {
    throw new Error("Muitas requisições em sequência. Tente novamente em alguns segundos.");
  }

  const errorPayload =
    typeof lastData === "object" && lastData !== null ? (lastData as Record<string, unknown>) : {};

  const errorDetails = Array.isArray(errorPayload.details)
    ? errorPayload.details.filter((detail): detail is string => typeof detail === "string")
    : [];

  const message =
    errorDetails.length > 0
      ? errorDetails.join(", ")
      : typeof errorPayload.error === "string"
        ? errorPayload.error
        : "Erro na requisição";

  throw new Error(message);
}
