export type PagamentoHistoricoLike = {
  status?: string | null;
  observacao?: string | null;
  data?: string | Date | null;
  usuario?: string | null;
};

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizePagamentoStatus(status?: string | null): string | null {
  if (typeof status !== 'string') {
    return null;
  }

  const normalized = normalizeWhitespace(status).toLowerCase();

  if (!normalized) {
    return null;
  }

  return normalized;
}

export function isPagamentoFieldBeingChanged(currentValue: unknown, nextValue: unknown): boolean {
  if (typeof currentValue === 'string' || typeof nextValue === 'string') {
    const currentNormalized = normalizePagamentoStatus(
      typeof currentValue === 'string' ? currentValue : currentValue == null ? null : String(currentValue),
    );
    const nextNormalized = normalizePagamentoStatus(
      typeof nextValue === 'string' ? nextValue : nextValue == null ? null : String(nextValue),
    );

    return currentNormalized !== nextNormalized;
  }

  return currentValue !== nextValue;
}

export function buildPagamentoHistoricoEntry(entry: PagamentoHistoricoLike): {
  status: string | null;
  observacao: string | null;
  data: string;
  usuario: string | null;
} {
  return {
    status: normalizePagamentoStatus(entry.status),
    observacao: typeof entry.observacao === 'string' ? entry.observacao.trim() || null : null,
    data: entry.data instanceof Date ? entry.data.toISOString() : entry.data ? new Date(entry.data).toISOString() : new Date().toISOString(),
    usuario: typeof entry.usuario === 'string' ? entry.usuario.trim() || null : null,
  };
}

export function parsePagamentoHistorico(value: unknown): Array<{
  status: string | null;
  observacao: string | null;
  data: string;
  usuario: string | null;
}> {
  if (Array.isArray(value)) {
    return value.map((item) => buildPagamentoHistoricoEntry((item || {}) as PagamentoHistoricoLike));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => buildPagamentoHistoricoEntry((item || {}) as PagamentoHistoricoLike));
      }
    } catch (error) {
      return [];
    }
  }

  return [];
}