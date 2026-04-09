export interface Empresa {
  id: number;
  nome: string;
  telefone?: string;
  whatsapp?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  foto?: string;
  role?: "user" | "empresa" | "admin";
  criado_em?: string;
  empresa?: Empresa | null;
}

export type PagamentoStatus = "nao_pago" | "pago" | "pago_a_mais";
export type PedidoUiStatus = "pending" | "in_progress" | "completed";
export type PedidoApiStatus =
  | PedidoUiStatus
  | "novo"
  | "em_andamento"
  | "concluido"
  | "concluído"
  | "pendente"
  | "completo";

export interface PagamentoHistoricoEntry {
  status: PagamentoStatus;
  updatedAt: string;
  updatedById?: number;
  updatedByNome?: string;
  updatedByRole?: string;
}

export interface Pedido {
  id: number;
  empresaId?: number;
  empresa?: { id: number; nome: string };
  nomeCliente?: string;
  email: string;
  telefone?: string;
  mensagem: string;
  status?: PedidoApiStatus | string;
  createdAt: string;
  updatedAt?: string;
  tipoServico?: string;
  area?: number;
  valorSimulado?: number;
  local?: string;
  cep?: string;
  pago?: boolean;
  pagamentoStatus?: PagamentoStatus;
  pagamentoHistorico?: PagamentoHistoricoEntry[];
  locationMode?: "manual" | "cep";
}

export interface GetPedidosParams {
  search?: string;
  status?: PedidoApiStatus | "all";
  pagamentoStatus?: PagamentoStatus | "all";
  empresaId?: number | string;
}

export interface Ambiente {
  id: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  siteUrl?: string | null;
  publico: boolean;
  categoria?: string;
  imagemPreview?: string | null;
  cidade?: string | null;
  pais?: string | null;
  endereco?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pedidoId?: number | null;
  pedido?: {
    id: number;
    pagamentoStatus?: PagamentoStatus;
    pago?: boolean;
    telefone?: string | null;
    email?: string | null;
  } | null;
  usuario?: { id: number; nome: string; email?: string; empresa?: Empresa | null };
  empresa?: { id: number; nome: string; whatsapp?: string; email?: string; telefone?: string };
  empresaPedido?: { id: number; nome: string; email?: string; telefone?: string; whatsapp?: string } | null;
}

export interface CreateAmbientePayload {
  pedidoId?: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  siteUrl?: string;
  imagem?: File | null;
  publico?: boolean;
  categoria?: string;
  cidade?: string;
  pais?: string;
  endereco?: string;
  cep?: string;
  latitude: number;
  longitude: number;
  clienteEmail?: string;
}

export interface Lead {
  nome?: string;
  email?: string;
  telefone?: string;
  mensagem?: string;
  empresaId: number;
}
