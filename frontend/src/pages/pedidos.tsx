import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiClipboard,
  FiMapPin,
  FiCreditCard,
  FiClock,
  FiLayers,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import {
  getPedidos,
  createPedido,
  updatePedido,
  deletePedido,
  getMe,
  Usuario,
  Pedido,
  PagamentoStatus,
  PagamentoHistoricoEntry,
} from "../services/api";
import "../styles/pedidos.css";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em progresso" },
  { value: "completed", label: "Completo" },
] as const;

const PAGAMENTO_OPTIONS: Array<{ value: PagamentoStatus; label: string }> = [
  { value: "nao_pago", label: "Não pago" },
  { value: "pago", label: "Pago" },
  { value: "pago_a_mais", label: "Pago a mais" },
];

const PAGAMENTO_FILTER_OPTIONS = [
  { value: "all", label: "Todos pagamentos" },
  ...PAGAMENTO_OPTIONS,
] as const;

const heroMessages = [
  "Pedidos com leitura clara",
  "Fluxo operacional com presença",
  "Menos ruído, mais decisão",
  "Acompanhamento com ritmo visual",
];

type FeedbackTone = "success" | "error";
type FeedbackState = { tone: FeedbackTone; message: string } | null;
type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];
type PagamentoFilter = (typeof PAGAMENTO_FILTER_OPTIONS)[number]["value"];
type PendingAction =
  | "create"
  | "refresh"
  | "update"
  | "delete"
  | "status"
  | "payment"
  | "filter"
  | null;
type PedidoFieldErrors = Partial<Record<"telefone" | "mensagem" | "local" | "cep", string>>;
type LoadingState = {
  action: Exclude<PendingAction, null>;
  pedidoId?: number;
  message: string;
};
type CriarTourNavigationState = {
  clienteNome?: string;
  clienteEmail?: string;
  pedidoId?: number;
  pedidoLocal?: string;
  pedidoCep?: string;
  pedidoMensagem?: string;
  pedidoTelefone?: string;
  pedidoEmpresaNome?: string;
  initialTitle?: string;
  initialDescricao?: string;
  initialEndereco?: string;
  initialCep?: string;
};

function normalizeStatus(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "novo":
    case "pendente":
    case "pending":
      return "pending";
    case "em_andamento":
    case "in_progress":
    case "in progress":
      return "in_progress";
    case "concluído":
    case "concluido":
    case "completed":
    case "completo":
      return "completed";
    default:
      return "pending";
  }
}

function getStatusLabel(status?: string) {
  return (
    STATUS_OPTIONS.find((option) => option.value === normalizeStatus(status))
      ?.label || "Pendente"
  );
}

function normalizePagamentoStatus(
  pagamentoStatus?: PagamentoStatus,
  pago?: boolean
): PagamentoStatus {
  if (pagamentoStatus === "pago" || pagamentoStatus === "pago_a_mais") {
    return pagamentoStatus;
  }
  if (pagamentoStatus === "nao_pago") {
    return "nao_pago";
  }
  return pago ? "pago" : "nao_pago";
}

function getPagamentoLabel(pagamentoStatus?: PagamentoStatus, pago?: boolean) {
  const normalized = normalizePagamentoStatus(pagamentoStatus, pago);
  return (
    PAGAMENTO_OPTIONS.find((option) => option.value === normalized)?.label ||
    "Não pago"
  );
}

function getPagamentoBadgeClass(
  pagamentoStatus?: PagamentoStatus,
  pago?: boolean
) {
  const normalized = normalizePagamentoStatus(pagamentoStatus, pago);
  if (normalized === "pago_a_mais") return "payment-badge payment-badge--overpaid";
  if (normalized === "pago") return "payment-badge payment-badge--paid";
  return "payment-badge payment-badge--unpaid";
}

function getPedidoCreatedAt(pedido: Pedido & { criado_em?: string }) {
  return pedido.createdAt || pedido.criado_em || "";
}

function formatarData(data?: string) {
  if (!data) return "Agora";
  return new Date(data).toLocaleString("pt-BR");
}

function getLocationLabel(pedido: Pedido) {
  if (pedido.local) return pedido.local;
  if (pedido.cep) return `CEP ${pedido.cep}`;
  return "Local ainda não informado";
}

function getPedidoSearchText(pedido: Pedido) {
  return [
    pedido.nomeCliente,
    pedido.empresa?.nome,
    pedido.email,
    pedido.telefone,
    pedido.mensagem,
    pedido.local,
    pedido.cep,
    getStatusLabel(pedido.status),
    getPagamentoLabel(pedido.pagamentoStatus, pedido.pago),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getPendingActionLabel(action: PendingAction) {
  switch (action) {
    case "create":
      return "Criando pedido...";
    case "refresh":
      return "Atualizando pedidos...";
    case "update":
      return "Salvando alterações...";
    case "delete":
      return "Excluindo pedido...";
    case "status":
      return "Atualizando status...";
    case "payment":
      return "Atualizando pagamento...";
    case "filter":
      return "Aplicando filtros...";
    default:
      return "";
  }
}

function getPedidoActionMessage(action: PendingAction, pedido?: Pedido | null) {
  const referencia = pedido?.empresa?.nome || pedido?.nomeCliente || "pedido";
  switch (action) {
    case "status":
      return `Atualizando status de ${referencia}...`;
    case "payment":
      return `Atualizando pagamento de ${referencia}...`;
    case "update":
      return `Salvando edição de ${referencia}...`;
    case "delete":
      return `Excluindo ${referencia}...`;
    default:
      return getPendingActionLabel(action);
  }
}

function sanitizeTelefone(value: string) {
  return value.replace(/\D/g, "").slice(0, 15);
}

function sanitizeCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function normalizeSearchTerm(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function formatTelefone(value: string) {
  const digits = sanitizeTelefone(value);

  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, digits.length - 4)}-${digits.slice(
      digits.length - 4
    )}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatCep(value: string) {
  const digits = sanitizeCep(value);

  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function getDisplayErrorMessage(error: string, pedidosCount: number) {
  if (pedidosCount > 0) {
    return error;
  }

  return `${error} Tente atualizar a lista em alguns instantes.`;
}

function getFieldErrorId(prefix: string, field: keyof PedidoFieldErrors) {
  return `${prefix}-${field}-error`;
}

function buildInitialTourTitle(pedido: Pedido) {
  const empresaNome = pedido.empresa?.nome?.trim();
  const clienteNome = pedido.nomeCliente?.trim();

  if (empresaNome && clienteNome) {
    return `Tour ${empresaNome} - ${clienteNome}`;
  }

  if (empresaNome) {
    return `Tour ${empresaNome}`;
  }

  if (clienteNome) {
    return `Tour ${clienteNome}`;
  }

  return "Novo tour";
}

function buildInitialTourDescricao(pedido: Pedido) {
  const partes = [pedido.mensagem?.trim(), pedido.local?.trim(), pedido.cep?.trim()].filter(
    Boolean
  );

  return partes.join(" • ");
}

export default function Pedidos() {
  const navigate = useNavigate();
  const location = useLocation();

  const [allPedidos, setAllPedidos] = useState<Array<Pedido & { criado_em?: string }>>([]);
  const [pedidos, setPedidos] = useState<Array<Pedido & { criado_em?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [filtering, setFiltering] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [lastSyncMode, setLastSyncMode] = useState<"server" | "fallback">("server");
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);

  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<PedidoFieldErrors>({});

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [locationMode, setLocationMode] = useState<"manual" | "cep">("cep");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTelefone, setEditTelefone] = useState("");
  const [editMensagem, setEditMensagem] = useState("");
  const [editLocal, setEditLocal] = useState("");
  const [editCep, setEditCep] = useState("");
  const [editPagamentoStatus, setEditPagamentoStatus] =
    useState<PagamentoStatus>("nao_pago");
  const [editFieldErrors, setEditFieldErrors] = useState<PedidoFieldErrors>({});

  const [abrirModal, setAbrirModal] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState<{ id: number; open: boolean }>({
    id: 0,
    open: false,
  });
  const [local, setLocal] = useState("");
  const [cep, setCep] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFilter>("all");
  const [pagamentoFiltro, setPagamentoFiltro] =
    useState<PagamentoFilter>("all");

  const searchTerm = useMemo(() => normalizeSearchTerm(busca), [busca]);

  useEffect(() => {
    if (!feedback) return;

    const timeout = window.setTimeout(() => {
      setFeedback(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    (async () => {
      try {
        const user = await getMe();
        setUsuario(user);
        await atualizarLista(user);
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
        setFiltersInitialized(true);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (!filtersInitialized || !usuario) return;

    const timeout = window.setTimeout(() => {
      atualizarLista(usuario, true, "filter").catch(() => undefined);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchTerm, statusFiltro, pagamentoFiltro, filtersInitialized, usuario]);

  function formatarPedidos(data: Pedido[]) {
    return data.map((p) => ({
      ...p,
      criado_em: (p as Pedido & { criado_em?: string }).criado_em || p.createdAt || "",
      createdAt: p.createdAt || (p as Pedido & { criado_em?: string }).criado_em || "",
      status: normalizeStatus(p.status),
      pagamentoStatus: normalizePagamentoStatus(p.pagamentoStatus, p.pago),
    }));
  }

  function filtrarPorUsuario(
    data: Array<Pedido & { criado_em?: string }>,
    currentUser?: Usuario | null
  ) {
    if (currentUser?.role === "admin") {
      return data;
    }

    if (currentUser?.role === "empresa") {
      const empresaId = currentUser.empresa?.id;
      const email = currentUser.email?.toLowerCase();

      return data.filter((p) => {
        const pedidoEmail = p.email?.toLowerCase();
        const sameEmpresa =
          empresaId !== undefined && empresaId !== null && p.empresaId === empresaId;
        const sameEmail = Boolean(email && pedidoEmail && pedidoEmail === email);

        return sameEmpresa || sameEmail;
      });
    }

    const email = currentUser?.email?.toLowerCase();

    return data.filter((p) => {
      const pedidoEmail = p.email?.toLowerCase();
      return Boolean(email && pedidoEmail && pedidoEmail === email);
    });
  }

  function filtrarLocalmente(data: Array<Pedido & { criado_em?: string }>) {
    const termoBusca = searchTerm.toLowerCase();

    return data.filter((pedido) => {
      const statusOk =
        statusFiltro === "all" || normalizeStatus(pedido.status) === statusFiltro;
      const pagamentoOk =
        pagamentoFiltro === "all" ||
        normalizePagamentoStatus(pedido.pagamentoStatus, pedido.pago) ===
          pagamentoFiltro;
      const buscaOk =
        !termoBusca || getPedidoSearchText(pedido).includes(termoBusca);

      return statusOk && pagamentoOk && buscaOk;
    });
  }

  function definirFeedback(tone: FeedbackTone, message: string) {
    setFeedback({ tone, message });
  }

  function limparFormularioCriacao() {
    setTelefone("");
    setMensagem("");
    setLocal("");
    setCep("");
    setLocationMode("cep");
    setCreateFieldErrors({});
  }

  function limparEdicao() {
    setEditingId(null);
    setEditTelefone("");
    setEditMensagem("");
    setEditLocal("");
    setEditCep("");
    setEditPagamentoStatus("nao_pago");
    setEditFieldErrors({});
  }

  function limparFiltros() {
    setBusca("");
    setStatusFiltro("all");
    setPagamentoFiltro("all");
    setLastSyncMode("server");
    setError("");
  }

  function validateCreateForm() {
    const cleanedCep = sanitizeCep(cep);
    const cleanedLocal = local.trim();
    const cleanedMensagem = mensagem.trim();
    const cleanedTelefone = sanitizeTelefone(telefone);
    const nextErrors: PedidoFieldErrors = {};

    if (telefone && cleanedTelefone.length > 0 && cleanedTelefone.length < 10) {
      nextErrors.telefone = "Informe um telefone válido com DDD.";
    }

    if (!cleanedMensagem) {
      nextErrors.mensagem = "Descreva o pedido antes de enviar.";
    }

    if (locationMode === "cep" && cleanedCep.length !== 8) {
      nextErrors.cep = "Informe um CEP válido com 8 dígitos.";
    }

    if (locationMode === "manual" && !cleanedLocal) {
      nextErrors.local = "Informe o endereço manual para continuar.";
    }

    setCreateFieldErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      cleanedCep,
      cleanedLocal,
      cleanedMensagem,
      cleanedTelefone,
      nextErrors,
    };
  }

  function validateEditForm() {
    const cleanedTelefone = sanitizeTelefone(editTelefone);
    const cleanedCep = sanitizeCep(editCep);
    const cleanedLocal = editLocal.trim();
    const cleanedMensagem = editMensagem.trim();
    const nextErrors: PedidoFieldErrors = {};

    if (editTelefone && cleanedTelefone.length > 0 && cleanedTelefone.length < 10) {
      nextErrors.telefone = "Informe um telefone válido com DDD ou deixe em branco.";
    }

    if (!cleanedMensagem) {
      nextErrors.mensagem = "A mensagem do pedido não pode ficar vazia.";
    }

    if (editCep && cleanedCep.length > 0 && cleanedCep.length !== 8) {
      nextErrors.cep = "Se informar o CEP, use 8 dígitos.";
    }

    setEditFieldErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      cleanedTelefone,
      cleanedCep,
      cleanedLocal,
      cleanedMensagem,
      nextErrors,
    };
  }

  async function atualizarLista(
    currentUser = usuario,
    silent = false,
    action: PendingAction = "refresh"
  ) {
    if (!silent) {
      setIsRefreshing(true);
    }

    if (action) {
      setPendingAction(action);
    }

    if (action === "filter") {
      setFiltering(true);
    }

    if (action) {
      setLoadingState({
        action,
        message: action === "filter" ? "Refinando resultados..." : getPendingActionLabel(action),
      });
    }

    try {
      const params = {
        search: searchTerm || undefined,
        status: statusFiltro !== "all" ? statusFiltro : undefined,
        pagamentoStatus:
          pagamentoFiltro !== "all" ? (pagamentoFiltro as PagamentoStatus) : undefined,
        empresaId:
          currentUser?.role === "admin" ? undefined : currentUser?.empresa?.id,
      };

      const data = await getPedidos(params);
      const pedidosConvertidos = formatarPedidos(data);
      const pedidosFiltradosPorUsuario = filtrarPorUsuario(pedidosConvertidos, currentUser);

      setAllPedidos(pedidosFiltradosPorUsuario);
      setPedidos(pedidosFiltradosPorUsuario);
      setLastSyncMode("server");
      setError("");
      return pedidosFiltradosPorUsuario;
    } catch (err: any) {
      const message = err?.message || "Erro ao carregar pedidos.";

      if (action === "filter") {
        const fallbackBase = filtrarPorUsuario(allPedidos, currentUser);
        const fallbackData = filtrarLocalmente(fallbackBase);
        setPedidos(fallbackData);
        setLastSyncMode("fallback");
        definirFeedback(
          "error",
          "Não foi possível aplicar os filtros no servidor. Exibindo resultado local."
        );
        setError(message);
        return fallbackData;
      }

      setError(message);
      throw err;
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
      if (action === "filter") {
        setFiltering(false);
      }
      setPendingAction(null);
      setLoadingState(null);
    }
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!usuario) return;

    const validation = validateCreateForm();

    if (!validation.isValid) {
      const firstError = Object.values(validation.nextErrors)[0];
      if (firstError) {
        setError(firstError);
        definirFeedback("error", firstError);
      }
      return;
    }

    try {
      setEnviando(true);
      setPendingAction("create");
      setLoadingState({
        action: "create",
        message:
          locationMode === "manual"
            ? "Criando pedido com endereço manual..."
            : "Criando pedido com base no CEP...",
      });

      await createPedido({
        nomeCliente: usuario.nome,
        email: usuario.email,
        telefone: validation.cleanedTelefone || undefined,
        mensagem: validation.cleanedMensagem,
        locationMode,
        local: locationMode === "manual" ? validation.cleanedLocal || undefined : undefined,
        cep: locationMode === "cep" ? validation.cleanedCep || undefined : undefined,
      });

      limparFormularioCriacao();
      setAbrirModal(false);
      setError("");
      definirFeedback("success", "Pedido criado com sucesso.");

      await atualizarLista(usuario, false, "refresh");
    } catch (err: any) {
      const message = err?.message || "Erro ao criar pedido.";
      setError(message);
      definirFeedback("error", message);
    } finally {
      setEnviando(false);
      setPendingAction(null);
      setLoadingState(null);
    }
  }

  function startEdit(p: Pedido) {
    setEditingId(p.id);
    setEditTelefone(formatTelefone(p.telefone || ""));
    setEditMensagem(p.mensagem);
    setEditLocal(p.local || "");
    setEditCep(formatCep(p.cep || ""));
    setEditPagamentoStatus(normalizePagamentoStatus(p.pagamentoStatus, p.pago));
    setEditFieldErrors({});
  }

  async function salvarEdit(editId: number) {
    const pedidoParaEditar = pedidos.find((p) => p.id === editId);
    if (!pedidoParaEditar) return;

    const validation = validateEditForm();

    const payload: Partial<Pedido> = {
      status: normalizeStatus(pedidoParaEditar.status),
      telefone: validation.cleanedTelefone || undefined,
      mensagem: validation.cleanedMensagem,
      local: validation.cleanedLocal || undefined,
      cep: validation.cleanedCep || undefined,
    };

    if (!validation.isValid) {
      const firstError = Object.values(validation.nextErrors)[0];
      if (firstError) {
        setError(firstError);
        definirFeedback("error", firstError);
      }
      return;
    }

    if (usuario?.role === "admin") {
      payload.pagamentoStatus = editPagamentoStatus;
    }

    try {
      setPendingAction("update");
      setLoadingState({
        action: "update",
        pedidoId: editId,
        message: getPedidoActionMessage("update", pedidoParaEditar),
      });
      await updatePedido(editId, payload);
      await atualizarLista(usuario, false, "refresh");
      limparEdicao();
      setError("");
      definirFeedback("success", "Pedido atualizado com sucesso.");
    } catch (err: any) {
      const message = err?.message || "Erro ao salvar pedido.";
      setError(message);
      definirFeedback("error", message);
    } finally {
      setPendingAction(null);
      setLoadingState(null);
    }
  }

  async function alterarStatus(id: number, status: string) {
    const normalizedStatus = normalizeStatus(status);
    const pedidoAtual = pedidos.find((pedido) => pedido.id === id);

    try {
      setPendingAction("status");
      setLoadingState({
        action: "status",
        pedidoId: id,
        message: getPedidoActionMessage("status", pedidoAtual),
      });
      await updatePedido(id, { status: normalizedStatus });
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: normalizedStatus } : p))
      );
      setAllPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: normalizedStatus } : p))
      );
      setError("");
      definirFeedback("success", "Status do pedido atualizado.");
    } catch (err: any) {
      const message = err?.message || "Erro ao atualizar status.";
      setError(message);
      definirFeedback("error", message);
    } finally {
      setPendingAction(null);
      setLoadingState(null);
    }
  }

  async function alterarPagamento(id: number, pagamentoStatus: PagamentoStatus) {
    if (usuario?.role !== "admin") return;

    const pedidoAtual = pedidos.find((pedido) => pedido.id === id);

    try {
      setPendingAction("payment");
      setLoadingState({
        action: "payment",
        pedidoId: id,
        message: getPedidoActionMessage("payment", pedidoAtual),
      });
      await updatePedido(id, { pagamentoStatus });
      await atualizarLista(usuario, true, "refresh");
      setError("");
      definirFeedback("success", "Pagamento atualizado com sucesso.");
    } catch (err: any) {
      const message = err?.message || "Erro ao atualizar pagamento.";
      setError(message);
      definirFeedback("error", message);
    } finally {
      setPendingAction(null);
      setLoadingState(null);
    }
  }

  function abrirConfirmExcluir(id: number) {
    setConfirmExcluir({ id, open: true });
  }

  async function handleExcluirConfirmado() {
    const pedidoAtual = pedidos.find((pedido) => pedido.id === confirmExcluir.id);

    try {
      setPendingAction("delete");
      setLoadingState({
        action: "delete",
        pedidoId: confirmExcluir.id,
        message: getPedidoActionMessage("delete", pedidoAtual),
      });
      await deletePedido(confirmExcluir.id);
      await atualizarLista(usuario, false, "refresh");
      setError("");
      definirFeedback("success", "Pedido excluído com sucesso.");
    } catch (err: any) {
      const message = err?.message || "Erro ao excluir pedido.";
      setError(message);
      definirFeedback("error", message);
    } finally {
      setConfirmExcluir({ id: 0, open: false });
      setPendingAction(null);
      setLoadingState(null);
    }
  }

  const pedidosOrdenados = useMemo(() => {
    return [...pedidos].sort((a, b) => {
      const aOverpaid =
        normalizePagamentoStatus(a.pagamentoStatus, a.pago) === "pago_a_mais" ? 1 : 0;
      const bOverpaid =
        normalizePagamentoStatus(b.pagamentoStatus, b.pago) === "pago_a_mais" ? 1 : 0;

      if (aOverpaid !== bOverpaid) {
        return bOverpaid - aOverpaid;
      }

      return (
        new Date(getPedidoCreatedAt(b) || 0).getTime() -
        new Date(getPedidoCreatedAt(a) || 0).getTime()
      );
    });
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    return filtrarLocalmente(pedidosOrdenados);
  }, [pedidosOrdenados, searchTerm, statusFiltro, pagamentoFiltro]);

  const totalPedidos = pedidosFiltrados.length;
  const pendentes = pedidosFiltrados.filter(
    (p) => normalizeStatus(p.status) === "pending"
  ).length;
  const concluidos = pedidosFiltrados.filter(
    (p) => normalizeStatus(p.status) === "completed"
  ).length;
  const destaquePago = pedidosFiltrados.filter(
    (p) => normalizePagamentoStatus(p.pagamentoStatus, p.pago) === "pago_a_mais"
  ).length;
  const emProgresso = pedidosFiltrados.filter(
    (p) => normalizeStatus(p.status) === "in_progress"
  ).length;

  const isAdmin = usuario?.role === "admin";
  const pedidoDestaque = pedidosFiltrados[0] || pedidosOrdenados[0] || null;
  const filtrosAtivos =
    searchTerm.length > 0 || statusFiltro !== "all" || pagamentoFiltro !== "all";
  const busyLabel = loadingState?.message || getPendingActionLabel(pendingAction);
  const hasData = allPedidos.length > 0 || pedidosOrdenados.length > 0;
  const hasVisibleResults = pedidosFiltrados.length > 0;
  const displayError = error ? getDisplayErrorMessage(error, pedidosOrdenados.length) : "";
  const hasSearchTerm = searchTerm.length > 0;

  const activeFilterChips = [
    hasSearchTerm
      ? {
          key: "busca",
          label: `Busca: "${searchTerm}"`,
          onRemove: () => setBusca(""),
        }
      : null,
    statusFiltro !== "all"
      ? {
          key: "status",
          label: `Status: ${getStatusLabel(statusFiltro)}`,
          onRemove: () => setStatusFiltro("all"),
        }
      : null,
    pagamentoFiltro !== "all"
      ? {
          key: "pagamento",
          label: `Pagamento: ${
            PAGAMENTO_OPTIONS.find((option) => option.value === pagamentoFiltro)?.label ||
            pagamentoFiltro
          }`,
          onRemove: () => setPagamentoFiltro("all"),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  const heroStats = [
    {
      value: String(totalPedidos).padStart(2, "0"),
      label: filtrosAtivos ? "pedidos após filtros" : "pedidos visíveis agora",
    },
    {
      value: String(pendentes).padStart(2, "0"),
      label: "aguardando próximo passo",
    },
    {
      value: String(concluidos).padStart(2, "0"),
      label: "fluxos concluídos",
    },
  ];

  const spotlightCards = [
    {
      icon: <FiClipboard />,
      title: "Leitura objetiva",
      body: "As informações principais aparecem primeiro para acelerar entendimento e tomada de decisão.",
    },
    {
      icon: <FiMapPin />,
      title: "Contexto do local",
      body: "Mesmo com poucos dados, endereço, CEP e mensagem ganham hierarquia clara dentro do card.",
    },
    {
      icon: <FiCreditCard />,
      title: "Pagamento em foco",
      body: "O estado financeiro continua evidente sem competir com o restante da operação.",
    },
  ];

  if (loading) {
    return (
      <div className="ped-loading-screen">
        <motion.div
          className="ped-loading-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          role="status"
          aria-live="polite"
        >
          <FiRefreshCw className="ped-spin" />
          <span>Carregando a experiência dos pedidos...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="ped-page">
      <div className="ped-noise" />
      <div className="ped-ambient ped-ambient--one" />
      <div className="ped-ambient ped-ambient--two" />
      <div className="ped-ambient ped-ambient--three" />

      <main className="ped-shell">
        <section className="ped-hero">
          <motion.div
            className="ped-hero-copy"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="ped-eyebrow">
              Pedidos · {usuario?.nome ? usuario.nome.split(" ")[0] : "fluxo ativo"}
            </span>

            <h1 className="ped-title">
              Um painel de pedidos com a mesma presença visual da aba de ambientes.
            </h1>

            <p className="ped-lead">
              A experiência foi simplificada para funcionar bem mesmo com poucas
              informações, mantendo profundidade visual, leitura rápida e sensação premium.
            </p>

            <div className="ped-hero-actions">
              <button
                type="button"
                className="ped-hero-btn ped-hero-btn--primary"
                onClick={() => setAbrirModal(true)}
                disabled={enviando || pendingAction === "delete"}
              >
                {enviando ? <FiRefreshCw className="ped-spin" /> : null}
                Novo pedido
              </button>

              <button
                type="button"
                className="ped-hero-btn ped-hero-btn--secondary"
                onClick={() => navigate("/inicio", { state: { from: location.pathname } })}
                disabled={Boolean(loadingState)}
              >
                Voltar ao início
              </button>
            </div>

            <div className="ped-scroll-indicator">Role e acompanhe os pedidos</div>
          </motion.div>

          <motion.div
            className="ped-hero-panel"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.12 }}
          >
            <div className="ped-panel-top">
              <div className="ped-window-controls">
                <span />
                <span />
                <span />
              </div>
              <div className="ped-panel-label">Orders / operational browser</div>
            </div>

            <div className="ped-hero-marquee">
              <motion.div
                className="ped-hero-marquee-track"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 16, ease: "linear", repeat: Infinity }}
              >
                {heroMessages.concat(heroMessages).map((item, index) => (
                  <span key={`${item}-${index}`}>{item}</span>
                ))}
              </motion.div>
            </div>

            <div className="ped-stats">
              {heroStats.map((item, index) => (
                <motion.div
                  key={item.label}
                  className="ped-stat"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.08 }}
                  whileHover={{ y: -4 }}
                >
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </motion.div>
              ))}
            </div>

            <div className="ped-hero-focus">
              <div>
                <span className="ped-mini-label">Pedido em destaque</span>
                <h3>{pedidoDestaque?.empresa?.nome || "Nenhum pedido encontrado"}</h3>
                <p>
                  {pedidoDestaque
                    ? `${getStatusLabel(pedidoDestaque.status)} · ${getLocationLabel(
                        pedidoDestaque
                      )}`
                    : "Crie um novo pedido para começar a organizar a operação por aqui."}
                </p>
              </div>

              <div className="ped-focus-side">
                {isAdmin ? (
                  <>
                    <span className="ped-focus-chip">
                      {destaquePago} com pagamento destacado
                    </span>
                    <span className="ped-focus-meta">
                      {emProgresso} em progresso / {pendentes} pendentes
                    </span>
                  </>
                ) : (
                  <span className="ped-focus-meta">
                    {emProgresso} em progresso / {pendentes} pendentes
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="ped-story">
          <div className="ped-story-header">
            <span className="ped-section-kicker">Fluxo operacional</span>
            <h2>Menos informação por bloco, mas com o mesmo impacto visual da aba de ambientes.</h2>
            <p>
              Os pedidos continuam objetivos, porém agora em uma estrutura mais elegante,
              com áreas de respiro, hierarquia clara e cards mais valorizados.
            </p>
          </div>

          <div className="ped-story-grid">
            {spotlightCards.map((card, index) => (
              <motion.article
                key={card.title}
                className="ped-story-card"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <div className="ped-story-icon">{card.icon}</div>
                <span className="ped-story-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {feedback && (
          <motion.div
            className={`ped-feedback ped-feedback--${feedback.tone}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role={feedback.tone === "error" ? "alert" : "status"}
            aria-live={feedback.tone === "error" ? "assertive" : "polite"}
          >
            <div className="ped-feedback-content">
              {feedback.tone === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              className="ped-feedback-close"
              onClick={() => setFeedback(null)}
              aria-label="Fechar aviso"
            >
              <FiX />
            </button>
          </motion.div>
        )}

        {loadingState && (
          <div className="ped-global-busy" role="status" aria-live="polite">
            <FiRefreshCw className="ped-spin" />
            <span>{loadingState.message}</span>
          </div>
        )}

        {displayError && (
          <div className="ped-error" role="alert" aria-live="assertive">
            <FiAlertCircle />
            <div>
              <strong>Algo precisa de atenção.</strong>
              <span>{displayError}</span>
            </div>
          </div>
        )}

        <section className="ped-browser" id="ped-grid">
          <div className="ped-browser-top">
            <div className="ped-browser-copy">
              <span className="ped-section-kicker">Pedidos ativos</span>
              <h2>Visual consistente para operar, editar e acompanhar com clareza.</h2>
              <p>
                Mesmo quando o pedido tem só o essencial, o layout preserva contexto,
                leitura e ações bem posicionadas.
              </p>
            </div>

            <button
              type="button"
              className="ped-hero-btn ped-hero-btn--secondary ped-refresh-btn"
              onClick={() => atualizarLista(usuario, false, "refresh")}
              disabled={isRefreshing || filtering || pendingAction === "delete"}
            >
              <FiRefreshCw className={isRefreshing ? "ped-spin" : ""} />
              {isRefreshing ? "Atualizando..." : "Atualizar lista"}
            </button>
          </div>

          <div className="ped-filter-bar">
            <div className={`ped-filter-search${filtering ? " ped-filter-search--active" : ""}`}>
              <FiSearch />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por empresa, cliente, email, telefone, mensagem, local ou CEP"
                aria-label="Buscar pedidos"
              />
              {hasSearchTerm && (
                <button
                  type="button"
                  className="ped-search-clear"
                  onClick={() => setBusca("")}
                  aria-label="Limpar busca"
                >
                  <FiX />
                </button>
              )}
            </div>

            <div className="ped-filter-group">
              <label className="ped-filter-field">
                <span>Status</span>
                <select
                  className="ped-select"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as StatusFilter)}
                  aria-label="Filtrar por status"
                  disabled={pendingAction === "delete"}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ped-filter-field">
                <span>Pagamento</span>
                <select
                  className="ped-select"
                  value={pagamentoFiltro}
                  onChange={(e) =>
                    setPagamentoFiltro(e.target.value as PagamentoFilter)
                  }
                  aria-label="Filtrar por pagamento"
                  disabled={pendingAction === "delete"}
                >
                  {PAGAMENTO_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {filtrosAtivos && (
                <button
                  type="button"
                  className="ped-action-btn ped-action-btn--ghost ped-clear-filters"
                  onClick={limparFiltros}
                  disabled={filtering}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="ped-active-filters" aria-label="Filtros ativos">
              <span className="ped-active-filters-label">Filtros ativos</span>
              <div className="ped-active-filters-list">
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="ped-filter-chip"
                    onClick={chip.onRemove}
                    aria-label={`Remover filtro ${chip.label}`}
                  >
                    <span>{chip.label}</span>
                    <FiX />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="ped-filter-summary"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>
              Exibindo <strong>{pedidosFiltrados.length}</strong> pedido
              {pedidosFiltrados.length === 1 ? "" : "s"}
              {filtrosAtivos ? " após filtros" : ""}
            </span>
            <div className="ped-summary-flags">
              {filtering && <span className="ped-sync-chip">Filtrando no servidor...</span>}
              {!filtering && filtrosAtivos && lastSyncMode === "fallback" && (
                <span className="ped-sync-chip ped-sync-chip--warning">
                  Resultado local temporário
                </span>
              )}
              {busyLabel && <span className="ped-sync-chip">{busyLabel}</span>}
            </div>
          </div>

          <div className="ped-filter-hint">
            {lastSyncMode === "fallback" && filtrosAtivos ? (
              <p>
                Os filtros atuais foram refinados localmente por causa de uma falha temporária
                de comunicação. Você pode continuar operando normalmente e tentar atualizar
                a lista quando quiser.
              </p>
            ) : filtrosAtivos ? (
              <p>
                Use busca livre com status e pagamento para encontrar rapidamente o pedido
                certo. A busca também considera mensagem, local, CEP, cliente e empresa.
              </p>
            ) : (
              <p>
                Digite parte do nome, email, telefone, mensagem, local ou CEP para refinar a
                leitura sem perder o fallback local quando necessário.
              </p>
            )}
          </div>

          <div className="ped-marquee" aria-label="mensagem contínua da experiência">
            <motion.div
              className="ped-marquee-track"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 18, ease: "linear", repeat: Infinity }}
            >
              <span>Pedidos com presença</span>
              <span>Operação mais clara</span>
              <span>Leitura com profundidade</span>
              <span>Pouca informação, boa hierarquia</span>
              <span>Pedidos com presença</span>
              <span>Operação mais clara</span>
              <span>Leitura com profundidade</span>
              <span>Pouca informação, boa hierarquia</span>
            </motion.div>
          </div>

          <div className={`ped-grid${filtering ? " ped-grid--loading" : ""}`}>
            {filtering && (
              <motion.article
                className="ped-inline-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                role="status"
                aria-live="polite"
              >
                <FiRefreshCw className="ped-spin" />
                <div>
                  <strong>Aplicando filtros</strong>
                  <p>Buscando pedidos compatíveis no servidor.</p>
                </div>
              </motion.article>
            )}

            {!filtering && hasVisibleResults ? (
              pedidosFiltrados.map((p, index) => {
                const pagamentoAtual = normalizePagamentoStatus(
                  p.pagamentoStatus,
                  p.pago
                );
                const isEditing = editingId === p.id;
                const actionDisabled = Boolean(pendingAction);
                const isCardBusy = loadingState?.pedidoId === p.id;
                const editErrorPrefix = `edit-${p.id}`;

                return (
                  <motion.article
                    key={p.id}
                    className={`ped-card${
                      pagamentoAtual === "pago_a_mais" ? " ped-card--overpaid" : ""
                    }${pendingAction ? " ped-card--busy" : ""}${isCardBusy ? " ped-card--focus-busy" : ""}`}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                    transition={{ duration: 0.5, delay: (index % 6) * 0.04 }}
                    whileHover={{ y: -8 }}
                  >
                    {isCardBusy && (
                      <div className="ped-card-busy" role="status" aria-live="polite">
                        <FiRefreshCw className="ped-spin" />
                        <span>{loadingState?.message}</span>
                      </div>
                    )}

                    <div className="ped-card-shell">
                      <div className="ped-card-top">
                        <div>
                          <span className="ped-card-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h3>{p.empresa?.nome || p.nomeCliente || "Pedido sem empresa"}</h3>
                        </div>

                        <span className={getPagamentoBadgeClass(p.pagamentoStatus, p.pago)}>
                          {getPagamentoLabel(p.pagamentoStatus, p.pago)}
                        </span>
                      </div>

                      <div className="ped-card-summary">
                        <div className="ped-summary-item">
                          <span className="ped-summary-label">Status</span>
                          <span className={`pedidos-status ${normalizeStatus(p.status)}`}>
                            {getStatusLabel(p.status)}
                          </span>
                        </div>

                        <div className="ped-summary-item">
                          <span className="ped-summary-label">Criado em</span>
                          <span className="ped-summary-value">
                            {formatarData(getPedidoCreatedAt(p))}
                          </span>
                        </div>

                        <div className="ped-summary-item ped-summary-item--wide">
                          <span className="ped-summary-label">Local</span>
                          <span className="ped-summary-value">{getLocationLabel(p)}</span>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="ped-edit-grid">
                          <div className="ped-form-field">
                            <label htmlFor={`edit-telefone-${p.id}`}>Telefone</label>
                            <input
                              id={`edit-telefone-${p.id}`}
                              type="text"
                              value={editTelefone}
                              onChange={(e) => {
                                setEditTelefone(formatTelefone(e.target.value));
                                if (editFieldErrors.telefone) {
                                  setEditFieldErrors((prev) => ({ ...prev, telefone: undefined }));
                                }
                              }}
                              placeholder="Telefone"
                              aria-invalid={Boolean(editFieldErrors.telefone)}
                              aria-describedby={
                                editFieldErrors.telefone
                                  ? getFieldErrorId(editErrorPrefix, "telefone")
                                  : undefined
                              }
                              disabled={actionDisabled}
                            />
                            {editFieldErrors.telefone && (
                              <span
                                id={getFieldErrorId(editErrorPrefix, "telefone")}
                                className="ped-field-error"
                                role="alert"
                              >
                                {editFieldErrors.telefone}
                              </span>
                            )}
                          </div>

                          <div className="ped-form-field">
                            <label htmlFor={`edit-local-${p.id}`}>Local</label>
                            <textarea
                              id={`edit-local-${p.id}`}
                              value={editLocal}
                              onChange={(e) => {
                                setEditLocal(e.target.value);
                                if (editFieldErrors.local) {
                                  setEditFieldErrors((prev) => ({ ...prev, local: undefined }));
                                }
                              }}
                              placeholder="Endereço completo"
                              aria-invalid={Boolean(editFieldErrors.local)}
                              aria-describedby={
                                editFieldErrors.local
                                  ? getFieldErrorId(editErrorPrefix, "local")
                                  : undefined
                              }
                              disabled={actionDisabled}
                            />
                            {editFieldErrors.local && (
                              <span
                                id={getFieldErrorId(editErrorPrefix, "local")}
                                className="ped-field-error"
                                role="alert"
                              >
                                {editFieldErrors.local}
                              </span>
                            )}
                          </div>

                          <div className="ped-form-field">
                            <label htmlFor={`edit-cep-${p.id}`}>CEP</label>
                            <input
                              id={`edit-cep-${p.id}`}
                              type="text"
                              value={editCep}
                              onChange={(e) => {
                                setEditCep(formatCep(e.target.value));
                                if (editFieldErrors.cep) {
                                  setEditFieldErrors((prev) => ({ ...prev, cep: undefined }));
                                }
                              }}
                              placeholder="CEP (opcional)"
                              aria-invalid={Boolean(editFieldErrors.cep)}
                              aria-describedby={
                                editFieldErrors.cep
                                  ? getFieldErrorId(editErrorPrefix, "cep")
                                  : undefined
                              }
                              disabled={actionDisabled}
                            />
                            {editFieldErrors.cep && (
                              <span
                                id={getFieldErrorId(editErrorPrefix, "cep")}
                                className="ped-field-error"
                                role="alert"
                              >
                                {editFieldErrors.cep}
                              </span>
                            )}
                          </div>

                          <div className="ped-form-field ped-form-field--full">
                            <label htmlFor={`edit-mensagem-${p.id}`}>Mensagem</label>
                            <textarea
                              id={`edit-mensagem-${p.id}`}
                              value={editMensagem}
                              onChange={(e) => {
                                setEditMensagem(e.target.value);
                                if (editFieldErrors.mensagem) {
                                  setEditFieldErrors((prev) => ({ ...prev, mensagem: undefined }));
                                }
                              }}
                              placeholder="Mensagem"
                              aria-invalid={Boolean(editFieldErrors.mensagem)}
                              aria-describedby={
                                editFieldErrors.mensagem
                                  ? getFieldErrorId(editErrorPrefix, "mensagem")
                                  : undefined
                              }
                              disabled={actionDisabled}
                            />
                            {editFieldErrors.mensagem && (
                              <span
                                id={getFieldErrorId(editErrorPrefix, "mensagem")}
                                className="ped-field-error"
                                role="alert"
                              >
                                {editFieldErrors.mensagem}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="ped-card-content">
                          <div className="ped-card-meta">
                            <p>
                              <strong>Email:</strong> {p.email}
                            </p>
                            {p.telefone && (
                              <p>
                                <strong>Telefone:</strong> {formatTelefone(p.telefone)}
                              </p>
                            )}
                            {p.cep && (
                              <p>
                                <strong>CEP:</strong> {formatCep(p.cep)}
                              </p>
                            )}
                          </div>

                          <div className="ped-card-message">
                            <span className="ped-summary-label">Mensagem</span>
                            <p>{p.mensagem || "Sem mensagem adicional."}</p>
                          </div>
                        </div>
                      )}

                      {isAdmin && (
                        <>
                          <div className="ped-payment-panel">
                            <div className="ped-payment-header">
                              <strong>Pagamento</strong>
                              <FiCreditCard />
                            </div>

                            <select
                              className="ped-select"
                              value={isEditing ? editPagamentoStatus : pagamentoAtual}
                              onChange={(e) => {
                                const value = e.target.value as PagamentoStatus;
                                if (isEditing) {
                                  setEditPagamentoStatus(value);
                                  return;
                                }
                                alterarPagamento(p.id, value);
                              }}
                              disabled={actionDisabled}
                            >
                              {PAGAMENTO_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {p.pagamentoHistorico && p.pagamentoHistorico.length > 0 && (
                            <div className="ped-history">
                              <strong>Última atualização</strong>
                              {(p.pagamentoHistorico as PagamentoHistoricoEntry[])
                                .slice(-1)
                                .map((item, historyIndex) => (
                                  <div key={`${p.id}-${historyIndex}`} className="ped-history-item">
                                    <span className={getPagamentoBadgeClass(item.status)}>
                                      {getPagamentoLabel(item.status)}
                                    </span>
                                    <span>
                                      <FiClock /> Atualizado em {formatarData(item.updatedAt)}
                                    </span>
                                    {item.updatedByNome && (
                                      <span>
                                        por {item.updatedByNome}
                                        {item.updatedByRole ? ` (${item.updatedByRole})` : ""}
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </>
                      )}

                      <div className="ped-card-footer">
                        {usuario?.role === "admin" ? (
                          <select
                            className="ped-select"
                            value={normalizeStatus(p.status)}
                            onChange={(e) => alterarStatus(p.id, e.target.value)}
                            disabled={actionDisabled}
                          >
                            {STATUS_OPTIONS.filter((option) => option.value !== "all").map(
                              (option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          <span className={`pedidos-status ${normalizeStatus(p.status)}`}>
                            {getStatusLabel(p.status)}
                          </span>
                        )}

                        <div className="ped-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="ped-action-btn ped-action-btn--primary"
                                onClick={() => salvarEdit(p.id)}
                                disabled={actionDisabled}
                              >
                                {pendingAction === "update" ? (
                                  <>
                                    <FiRefreshCw className="ped-spin" />
                                    Salvando...
                                  </>
                                ) : (
                                  "Salvar"
                                )}
                              </button>
                              <button
                                className="ped-action-btn ped-action-btn--ghost"
                                onClick={limparEdicao}
                                disabled={actionDisabled}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="ped-action-btn ped-action-btn--ghost"
                                onClick={() => startEdit(p)}
                                disabled={actionDisabled}
                              >
                                Editar
                              </button>
                              <button
                                className="ped-action-btn ped-action-btn--danger"
                                onClick={() => abrirConfirmExcluir(p.id)}
                                disabled={actionDisabled}
                              >
                                Excluir
                              </button>
                            </>
                          )}

                          {usuario?.role === "admin" && !isEditing && (
                            <button
                              className="ped-action-btn ped-action-btn--accent"
                              onClick={() => {
                                const pedidoLocal = p.local?.trim() || "";
                                const pedidoCep = p.cep?.trim() || "";
                                const pedidoMensagem = p.mensagem?.trim() || "";
                                const pedidoEmpresaNome = p.empresa?.nome?.trim() || "";
                                const clienteNome = p.nomeCliente?.trim() || "";
                                const clienteEmail = p.email?.trim() || "";
                                const pedidoTelefone = p.telefone?.trim() || "";
                                const initialTitle = buildInitialTourTitle(p);
                                const initialDescricao = buildInitialTourDescricao(p);
                                const initialEndereco = pedidoLocal || pedidoCep || "";
                                const initialCep = pedidoCep;

                                const navigationState: CriarTourNavigationState = {
                                  clienteNome: clienteNome || pedidoEmpresaNome,
                                  clienteEmail,
                                  pedidoId: p.id,
                                  pedidoLocal,
                                  pedidoCep,
                                  pedidoMensagem,
                                  pedidoTelefone,
                                  pedidoEmpresaNome,
                                  initialTitle,
                                  initialDescricao,
                                  initialEndereco,
                                  initialCep,
                                };

                                navigate("/criarTour", { state: navigationState });
                              }}
                              disabled={actionDisabled}
                            >
                              Gerar Tour <FiArrowRight />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })
            ) : hasData ? (
              <motion.article
                className="ped-empty-card"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                role="status"
                aria-live="polite"
              >
                <div className="ped-empty-icon">
                  <FiSearch />
                </div>
                <span className="ped-section-kicker">Nenhum resultado encontrado</span>
                <h3>Os filtros atuais não encontraram pedidos compatíveis.</h3>
                <p>
                  {hasSearchTerm
                    ? `A busca por "${searchTerm}" não encontrou combinações com os filtros atuais.`
                    : "Tente ajustar a busca, trocar o status ou limpar os filtros para voltar a visualizar todos os pedidos disponíveis."}
                </p>
                <div className="ped-empty-actions">
                  <button
                    type="button"
                    className="ped-hero-btn ped-hero-btn--secondary"
                    onClick={limparFiltros}
                  >
                    Limpar filtros
                  </button>
                  <button
                    type="button"
                    className="ped-hero-btn ped-hero-btn--secondary"
                    onClick={() => atualizarLista(usuario, false, "refresh")}
                    disabled={isRefreshing}
                  >
                    <FiRefreshCw className={isRefreshing ? "ped-spin" : ""} />
                    Atualizar lista
                  </button>
                </div>
              </motion.article>
            ) : (
              <motion.article
                className="ped-empty-card"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                role="status"
                aria-live="polite"
              >
                <div className="ped-empty-icon">
                  <FiLayers />
                </div>
                <span className="ped-section-kicker">Sem pedidos por enquanto</span>
                <h3>O layout continua elegante mesmo com poucas informações.</h3>
                <p>
                  {displayError
                    ? "No momento não foi possível carregar pedidos do servidor. Você ainda pode tentar novamente ou criar um novo pedido."
                    : "Quando novos pedidos chegarem, eles aparecerão aqui em cards com o mesmo visual refinado da aba de ambientes."}
                </p>
                <div className="ped-form-actions">
                  <button
                    type="button"
                    className="ped-hero-btn ped-hero-btn--primary"
                    onClick={() => setAbrirModal(true)}
                  >
                    Criar primeiro pedido
                  </button>
                  <button
                    type="button"
                    className="ped-hero-btn ped-hero-btn--secondary"
                    onClick={() => atualizarLista(usuario, false, "refresh")}
                    disabled={isRefreshing}
                  >
                    <FiRefreshCw className={isRefreshing ? "ped-spin" : ""} />
                    Tentar novamente
                  </button>
                </div>
              </motion.article>
            )}
          </div>
        </section>
      </main>

      {abrirModal &&
        createPortal(
          <div className="ped-modal-overlay" onClick={() => setAbrirModal(false)}>
            <motion.div
              className="ped-modal-box"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ped-modal-title"
            >
              <div className="ped-modal-header">
                <div>
                  <h2 id="ped-modal-title">Novo Pedido</h2>
                  <p>
                    Envie um pedido com mensagem clara e local por CEP ou endereço manual.
                  </p>
                </div>

                <button
                  type="button"
                  className="ped-feedback-close"
                  onClick={() => setAbrirModal(false)}
                  aria-label="Fechar modal"
                  disabled={enviando}
                >
                  <FiX />
                </button>
              </div>

              <form className="ped-form" onSubmit={handleCriar} noValidate>
                <div className="ped-form-field">
                  <label htmlFor="pedido-telefone">Telefone</label>
                  <input
                    id="pedido-telefone"
                    type="text"
                    placeholder="Telefone (opcional)"
                    value={telefone}
                    onChange={(e) => {
                      setTelefone(formatTelefone(e.target.value));
                      if (createFieldErrors.telefone) {
                        setCreateFieldErrors((prev) => ({ ...prev, telefone: undefined }));
                      }
                    }}
                    aria-invalid={Boolean(createFieldErrors.telefone)}
                    aria-describedby={
                      createFieldErrors.telefone
                        ? getFieldErrorId("create", "telefone")
                        : undefined
                    }
                    disabled={enviando}
                  />
                  {createFieldErrors.telefone && (
                    <span
                      id={getFieldErrorId("create", "telefone")}
                      className="ped-field-error"
                      role="alert"
                    >
                      {createFieldErrors.telefone}
                    </span>
                  )}
                </div>

                <div className="ped-form-field">
                  <label htmlFor="pedido-mensagem">Mensagem</label>
                  <textarea
                    id="pedido-mensagem"
                    placeholder="Descreva o pedido"
                    value={mensagem}
                    onChange={(e) => {
                      setMensagem(e.target.value);
                      if (createFieldErrors.mensagem) {
                        setCreateFieldErrors((prev) => ({ ...prev, mensagem: undefined }));
                      }
                    }}
                    required
                    aria-invalid={Boolean(createFieldErrors.mensagem)}
                    aria-describedby={
                      createFieldErrors.mensagem
                        ? getFieldErrorId("create", "mensagem")
                        : undefined
                    }
                    disabled={enviando}
                  />
                  {createFieldErrors.mensagem && (
                    <span
                      id={getFieldErrorId("create", "mensagem")}
                      className="ped-field-error"
                      role="alert"
                    >
                      {createFieldErrors.mensagem}
                    </span>
                  )}
                </div>

                <div className="ped-location-mode">
                  <span>Como deseja informar o local?</span>
                  <div className="ped-location-options">
                    <label className={locationMode === "cep" ? "ped-location-option--active" : ""}>
                      <input
                        type="radio"
                        name="locationMode"
                        value="cep"
                        checked={locationMode === "cep"}
                        onChange={() => {
                          setLocationMode("cep");
                          setLocal("");
                          setCreateFieldErrors((prev) => ({
                            ...prev,
                            local: undefined,
                          }));
                        }}
                        disabled={enviando}
                      />
                      CEP
                    </label>
                    <label
                      className={locationMode === "manual" ? "ped-location-option--active" : ""}
                    >
                      <input
                        type="radio"
                        name="locationMode"
                        value="manual"
                        checked={locationMode === "manual"}
                        onChange={() => {
                          setLocationMode("manual");
                          setCep("");
                          setCreateFieldErrors((prev) => ({
                            ...prev,
                            cep: undefined,
                          }));
                        }}
                        disabled={enviando}
                      />
                      Endereço manual
                    </label>
                  </div>
                </div>

                {locationMode === "cep" && (
                  <div className="ped-form-field">
                    <label htmlFor="pedido-cep">CEP</label>
                    <input
                      id="pedido-cep"
                      type="text"
                      placeholder="CEP"
                      value={cep}
                      onChange={(e) => {
                        setCep(formatCep(e.target.value));
                        if (createFieldErrors.cep) {
                          setCreateFieldErrors((prev) => ({ ...prev, cep: undefined }));
                        }
                      }}
                      required={locationMode === "cep"}
                      aria-invalid={Boolean(createFieldErrors.cep)}
                      aria-describedby={
                        createFieldErrors.cep ? getFieldErrorId("create", "cep") : undefined
                      }
                      disabled={enviando}
                    />
                    {createFieldErrors.cep && (
                      <span
                        id={getFieldErrorId("create", "cep")}
                        className="ped-field-error"
                        role="alert"
                      >
                        {createFieldErrors.cep}
                      </span>
                    )}
                  </div>
                )}

                {locationMode === "manual" && (
                  <div className="ped-form-field">
                    <label htmlFor="pedido-local">Endereço manual</label>
                    <textarea
                      id="pedido-local"
                      placeholder="Rua, número, bairro, cidade"
                      value={local}
                      onChange={(e) => {
                        setLocal(e.target.value);
                        if (createFieldErrors.local) {
                          setCreateFieldErrors((prev) => ({ ...prev, local: undefined }));
                        }
                      }}
                      required={locationMode === "manual"}
                      aria-invalid={Boolean(createFieldErrors.local)}
                      aria-describedby={
                        createFieldErrors.local
                          ? getFieldErrorId("create", "local")
                          : undefined
                      }
                      disabled={enviando}
                    />
                    {createFieldErrors.local && (
                      <span
                        id={getFieldErrorId("create", "local")}
                        className="ped-field-error"
                        role="alert"
                      >
                        {createFieldErrors.local}
                      </span>
                    )}
                  </div>
                )}

                <div className="ped-modal-tip" role="note">
                  <FiAlertCircle />
                  <span>
                    A busca e os filtros desta página consideram empresa, cliente, contato,
                    mensagem, local e CEP.
                  </span>
                </div>

                <div className="ped-form-actions">
                  <button
                    type="submit"
                    className="ped-hero-btn ped-hero-btn--primary"
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <FiRefreshCw className="ped-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar"
                    )}
                  </button>
                  <button
                    type="button"
                    className="ped-hero-btn ped-hero-btn--secondary"
                    onClick={() => {
                      setAbrirModal(false);
                      setError("");
                      setCreateFieldErrors({});
                    }}
                    disabled={enviando}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}

      {confirmExcluir.open &&
        createPortal(
          <div className="ped-modal-overlay">
            <div
              className="ped-confirm-box"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ped-confirm-title"
            >
              <p id="ped-confirm-title">Deseja realmente excluir este pedido?</p>
              <span className="ped-confirm-copy">
                Essa ação remove o pedido da lista atual e não pode ser desfeita.
              </span>
              <div className="ped-form-actions">
                <button
                  className="ped-action-btn ped-action-btn--danger"
                  onClick={handleExcluirConfirmado}
                  disabled={pendingAction === "delete"}
                >
                  {pendingAction === "delete" ? (
                    <>
                      <FiRefreshCw className="ped-spin" />
                      Excluindo...
                    </>
                  ) : (
                    "Excluir"
                  )}
                </button>
                <button
                  className="ped-action-btn ped-action-btn--ghost"
                  onClick={() => setConfirmExcluir({ id: 0, open: false })}
                  disabled={pendingAction === "delete"}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}