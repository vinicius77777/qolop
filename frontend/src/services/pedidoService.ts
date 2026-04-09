import { request } from "./httpClient";
import type { GetPedidosParams, PagamentoStatus, Pedido, PedidoApiStatus, PedidoUiStatus } from "./types";

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

  return request<Pedido[]>(endpoint, { method: "GET" }, true);
}

export function getHistoricoPedidos(usuarioId: number | string): Promise<Pedido[]> {
  return request<Pedido[]>(`/historico/${usuarioId}/pedidos`, { method: "GET" }, true);
}

export function getHistoricoPedidosPublico(usuarioId: number | string): Promise<Pedido[]> {
  return request<Pedido[]>(`/historico-publico/${usuarioId}/pedidos`, { method: "GET" });
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

  return request<Pedido>(
    "/pedidos",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true
  );
}

export function updatePedido(id: number, data: Partial<Pedido>): Promise<Pedido> {
  const payload = {
    ...data,
    status: mapPedidoStatusToApi(data.status),
  };

  return request<Pedido>(
    `/pedidos/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    true
  );
}

export function deletePedido(id: number) {
  return request<void>(`/pedidos/${id}`, { method: "DELETE" }, true);
}