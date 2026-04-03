const PEDIDO_STATUS_CONCLUIDO = new Set(['completo', 'concluido', 'concluído', 'completed']);

export function isPedidoConcluido(status?: string | null): boolean {
  if (typeof status !== 'string') {
    return false;
  }

  return PEDIDO_STATUS_CONCLUIDO.has(status.trim().toLowerCase());
}