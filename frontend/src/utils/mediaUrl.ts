import { API_URL } from "./apiConfig";

function isAbsoluteUrl(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  );
}

/**
 * Converte um caminho de mídia vindo da API em uma URL utilizável no navegador.
 *
 * - URLs absolutas (Supabase Storage, data:, blob:) são retornadas como estão.
 * - Caminhos relativos começando com "/" (uploads locais) são prefixados
 *   com a base da API (VITE_API_URL).
 *
 * Em produção com Supabase Storage, o backend retorna URLs absolutas
 * (`https://xxxx.supabase.co/storage/v1/object/public/uploads/...`),
 * então concatenar `${API_URL}${imagemPreview}` quebraria a imagem.
 */
export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  return `${API_URL}/${value}`;
}
