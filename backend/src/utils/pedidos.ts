const PEDIDO_STATUS_CONCLUIDO = new Set(['completo', 'concluido', 'concluído', 'completed']);
const PEDIDO_PAGAMENTO_DESTAQUE = 'pago_a_mais';

export function isPedidoConcluido(status?: string | null): boolean {
  if (typeof status !== 'string') {
    return false;
  }

  return PEDIDO_STATUS_CONCLUIDO.has(status.trim().toLowerCase());
}

export function isPedidoPagoAMais(pagamentoStatus?: string | null): boolean {
  if (typeof pagamentoStatus !== 'string') {
    return false;
  }

  return pagamentoStatus.trim().toLowerCase() === PEDIDO_PAGAMENTO_DESTAQUE;
}

export function comparePedidosPorDestaque<T extends {
  pagamentoStatus?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}>(a: T, b: T): number {
  const aDestacado = isPedidoPagoAMais(a.pagamentoStatus) ? 1 : 0;
  const bDestacado = isPedidoPagoAMais(b.pagamentoStatus) ? 1 : 0;

  if (aDestacado !== bDestacado) {
    return bDestacado - aDestacado;
  }

  const aData = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
  const bData = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();

  return bData - aData;
}
