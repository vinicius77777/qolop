import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
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

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em processamento" },
  { value: "completed", label: "Concluído" },
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

function getPagamentoDisplayLabel(
  pagamentoStatus?: PagamentoStatus,
  pago?: boolean
) {
  const normalized = normalizePagamentoStatus(pagamentoStatus, pago);
  if (normalized === "pago_a_mais") {
    return "Destaque";
  }
  return getPagamentoLabel(pagamentoStatus, pago);
}

function getPedidoCreatedAt(pedido: Pedido & { criado_em?: string }) {
  return pedido.createdAt || pedido.criado_em || "";
}

function formatarData(data?: string) {
  if (!data) return "Agora";
  return new Date(data).toLocaleString("pt-BR");
}

function formatarDataCurta(data?: string) {
  if (!data) return "Agora";
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return "Agora";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
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

function getStatusDotTone(status?: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "completed") return "success";
  if (normalized === "in_progress") return "warning";
  return "pending";
}

function getStatusLabelForDrawer(status?: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "completed") return "Concluído";
  if (normalized === "in_progress") return "Em processamento";
  return "Pendente";
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
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);

  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<PedidoFieldErrors>({});

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const allPedidosRef = useRef<Array<Pedido & { criado_em?: string }>>([]);
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

  // Painel deslizante: pedido aberto
  const [pedidoAbertoId, setPedidoAbertoId] = useState<number | null>(null);

  const isEditing = editingId !== null && editingId === pedidoAbertoId;

  const searchTerm = useMemo(() => normalizeSearchTerm(busca), [busca]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => {
      setFeedback(null);
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  // Fecha o drawer ao trocar de rota
  useEffect(() => {
    setPedidoAbertoId(null);
  }, [location.pathname]);

  // Fecha o drawer com Escape
  useEffect(() => {
    if (pedidoAbertoId === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPedidoAbertoId(null);
        limparEdicao();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pedidoAbertoId]);

  useEffect(() => {
    (async () => {
      try {
        const user = await getMe();
        setUsuario(user);

        const data = await getPedidos({
          empresaId: user?.role === "admin" ? undefined : user?.empresa?.id,
        });
        const pedidosConvertidos = formatarPedidos(data);
        const pedidosFiltradosPorUsuario = filtrarPorUsuario(pedidosConvertidos, user);

        allPedidosRef.current = pedidosFiltradosPorUsuario;
        setAllPedidos(pedidosFiltradosPorUsuario);
        setPedidos(pedidosFiltradosPorUsuario);
        setError("");
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

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

  const filtrarLocalmente = useCallback((data: Array<Pedido & { criado_em?: string }>) => {
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
  }, [pagamentoFiltro, searchTerm, statusFiltro]);

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

  const atualizarLista = useCallback(async (
    currentUser = usuario,
    silent = false,
    action: PendingAction = "refresh"
  ) => {
    if (!silent) {
      setIsRefreshing(true);
    }
    if (action) {
      setPendingAction(action);
      setLoadingState({
        action,
        message: getPendingActionLabel(action),
      });
    }

    try {
      const data = await getPedidos({
        empresaId: currentUser?.role === "admin" ? undefined : currentUser?.empresa?.id,
      });
      const pedidosConvertidos = formatarPedidos(data);
      const pedidosFiltradosPorUsuario = filtrarPorUsuario(pedidosConvertidos, currentUser);

      allPedidosRef.current = pedidosFiltradosPorUsuario;
      setAllPedidos(pedidosFiltradosPorUsuario);
      setPedidos(pedidosFiltradosPorUsuario);
      setError("");
      return pedidosFiltradosPorUsuario;
    } catch (err: any) {
      const message = err?.message || "Erro ao carregar pedidos.";
      setError(message);
      throw err;
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
      setPendingAction(null);
      setLoadingState(null);
    }
  }, [usuario]);

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
      await atualizarLista(usuario, true, "refresh");
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
      if (pedidoAbertoId === confirmExcluir.id) {
        setPedidoAbertoId(null);
        limparEdicao();
      }
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

  const pedidoAberto = useMemo(() => {
    if (pedidoAbertoId === null) return null;
    return pedidosOrdenados.find((p) => p.id === pedidoAbertoId) || null;
  }, [pedidoAbertoId, pedidosOrdenados]);

  const pedidosFiltrados = useMemo(() => {
    return filtrarLocalmente(pedidosOrdenados);
  }, [pedidosOrdenados, filtrarLocalmente]);

  const totalPedidos = pedidosFiltrados.length;
  const pendentes = pedidosFiltrados.filter(
    (p) => normalizeStatus(p.status) === "pending"
  ).length;
  const concluidos = pedidosFiltrados.filter(
    (p) => normalizeStatus(p.status) === "completed"
  ).length;
  const emProgresso = pedidosFiltrados.filter(
    (p) => normalizeStatus(p.status) === "in_progress"
  ).length;

  const isAdmin = usuario?.role === "admin";
  const pedidoDestaque = pedidosFiltrados[0] || pedidosOrdenados[0] || null;
  const filtrosAtivos =
    searchTerm.length > 0 || statusFiltro !== "all" || pagamentoFiltro !== "all";
  const hasData = allPedidos.length > 0 || pedidosOrdenados.length > 0;
  const hasVisibleResults = pedidosFiltrados.length > 0;
  const displayError = error ? getDisplayErrorMessage(error, pedidosOrdenados.length) : "";
  const hasSearchTerm = searchTerm.length > 0;

  if (loading) {
    return (
      <div className="tj-ped-page tj-ped-loading">
        <motion.div
          className="tj-ped-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          PEDIDOS
        </motion.div>
      </div>
    );
  }

  return (
    <div className="tj-ped-page">
      <div className="tj-ped-bg" aria-hidden="true">
        <span className="tj-ped-orb tj-ped-orb--one" />
        <span className="tj-ped-orb tj-ped-orb--two" />
        <span className="tj-ped-orb tj-ped-orb--three" />
      </div>

      <main className="tj-ped-content">
        {/* ============ HERO MINIMALISTA ============ */}
        <header className="tj-ped-hero">
          <motion.div
            className="tj-ped-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Pedidos</span>
            <span className="tj-ped-dot" />
            <span>{usuario?.nome ? usuario.nome.split(" ")[0] : "fluxo ativo"}</span>
          </motion.div>

          <motion.h1
            className="tj-ped-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Opere cada pedido
            <br />
            sem sair da linha do tempo.
          </motion.h1>

          <motion.p
            className="tj-ped-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Os pedidos aparecem em uma lista tipográfica contínua. Clique em qualquer
            linha para abrir os detalhes no painel lateral — sem redirecionar.
          </motion.p>

          <motion.div
            className="tj-ped-hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            <button
              type="button"
              className="tj-ped-action tj-ped-action--solid"
              onClick={() => {
                setTelefone(formatTelefone(usuario?.empresa?.telefone || usuario?.empresa?.whatsapp || ""));
                setAbrirModal(true);
              }}
              disabled={enviando || pendingAction === "delete"}
            >
              Novo pedido
              <FiArrowRight />
            </button>

            <button
              type="button"
              className="tj-ped-action"
              onClick={() => navigate("/inicio", { state: { from: location.pathname } })}
              disabled={Boolean(loadingState)}
            >
              Voltar ao início
            </button>
          </motion.div>
        </header>

        {/* ============ NÚMEROS GIGANTES ============ */}
        <section className="tj-ped-stats" aria-label="Resumo dos pedidos">
          <div className="tj-ped-stat">
            <strong>{String(totalPedidos).padStart(2, "0")}</strong>
            <span>{filtrosAtivos ? "após filtros" : "visíveis agora"}</span>
          </div>
          <div className="tj-ped-stat">
            <strong>{String(pendentes).padStart(2, "0")}</strong>
            <span>aguardando passo</span>
          </div>
          <div className="tj-ped-stat">
            <strong>{String(emProgresso).padStart(2, "0")}</strong>
            <span>em processamento</span>
          </div>
          <div className="tj-ped-stat">
            <strong>{String(concluidos).padStart(2, "0")}</strong>
            <span>fluxos concluídos</span>
          </div>
        </section>

        {feedback && (
          <motion.div
            className={`tj-ped-feedback tj-ped-feedback--${feedback.tone}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role={feedback.tone === "error" ? "alert" : "status"}
            aria-live={feedback.tone === "error" ? "assertive" : "polite"}
          >
            {feedback.tone === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
            <span>{feedback.message}</span>
            <button
              type="button"
              className="tj-ped-feedback-close"
              onClick={() => setFeedback(null)}
              aria-label="Fechar aviso"
            >
              <FiX />
            </button>
          </motion.div>
        )}

        {loadingState && (
          <div className="tj-ped-busy" role="status" aria-live="polite">
            <FiRefreshCw className="tj-ped-spin" />
            <span>{loadingState.message}</span>
          </div>
        )}

        {displayError && (
          <div className="tj-ped-error" role="alert" aria-live="assertive">
            <FiAlertCircle />
            <div>
              <strong>Algo precisa de atenção.</strong>
              <span>{displayError}</span>
            </div>
          </div>
        )}

        {/* ============ TIMELINE ============ */}
        <section className="tj-ped-browser">
          <div className="tj-ped-browser-head">
            <div className="tj-ped-browser-copy">
              <span className="tj-ped-eyebrow">Linha do tempo</span>
              <h2>Pedidos em ordem de fluxo.</h2>
              <p>
                Cada linha é um pedido. O ponto luminoso indica o estado — verde para
                concluído, âmbar para em processamento, cinza para pendente.
              </p>
            </div>

            <button
              type="button"
              className="tj-ped-action tj-ped-action--ghost"
              onClick={() => atualizarLista(usuario, false, "refresh")}
              disabled={isRefreshing || pendingAction === "delete"}
            >
              <FiRefreshCw className={isRefreshing ? "tj-ped-spin" : ""} />
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          <div className="tj-ped-toolbar">
            <label className="tj-ped-search">
              <FiSearch className="tj-ped-search-icon" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por empresa, cliente, email, local..."
                aria-label="Buscar pedidos"
              />
              {hasSearchTerm && (
                <button
                  type="button"
                  className="tj-ped-search-clear"
                  onClick={() => setBusca("")}
                  aria-label="Limpar busca"
                >
                  <FiX />
                </button>
              )}
            </label>

            <div className="tj-ped-filters">
              <label className="tj-ped-filter-field">
                <span>Status</span>
                <select
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

              <label className="tj-ped-filter-field">
                <span>Pagamento</span>
                <select
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
                  className="tj-ped-link"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <p className="tj-ped-count" role="status" aria-live="polite">
            {pedidosFiltrados.length} pedido{pedidosFiltrados.length === 1 ? "" : "s"}
            {filtrosAtivos ? " após filtros" : " na linha do tempo"}
          </p>

          {hasVisibleResults ? (
            <div className="tj-ped-timeline">
              {pedidosFiltrados.map((p, index) => {
                const statusTone = getStatusDotTone(p.status);
                const pagamentoAtual = normalizePagamentoStatus(
                  p.pagamentoStatus,
                  p.pago
                );
                const isDestaque = pagamentoAtual === "pago_a_mais";
                const isOpen = pedidoAbertoId === p.id;

                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    className={`tj-ped-row${isDestaque ? " tj-ped-row--destaque" : ""}${isOpen ? " is-open" : ""}`}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: TJ_EASE, delay: (index % 8) * 0.04 }}
                    onClick={() => {
                      if (isOpen) {
                        setPedidoAbertoId(null);
                        limparEdicao();
                      } else {
                        limparEdicao();
                        setPedidoAbertoId(p.id);
                      }
                    }}
                    aria-expanded={isOpen}
                  >
                    <span className={`tj-ped-dot tj-ped-dot--${statusTone}`} />
                    <span className="tj-ped-row-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="tj-ped-row-main">
                      <strong>{p.empresa?.nome || p.nomeCliente || "Pedido sem empresa"}</strong>
                      <span>{getStatusLabelForDrawer(p.status)} · {getLocationLabel(p)}</span>
                    </span>
                    <span className="tj-ped-row-date">{formatarDataCurta(getPedidoCreatedAt(p))}</span>
                    {isDestaque && <span className="tj-ped-row-star">★</span>}
                    <FiChevronRight className="tj-ped-row-chevron" />
                  </motion.button>
                );
              })}
            </div>
          ) : hasData ? (
            <div className="tj-ped-empty">
              <span className="tj-ped-eyebrow">Nenhum resultado</span>
              <p>
                {hasSearchTerm
                  ? `A busca por "${searchTerm}" não encontrou combinações com os filtros atuais.`
                  : "Os filtros atuais não encontraram pedidos compatíveis."}
              </p>
              <button
                type="button"
                className="tj-ped-action"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="tj-ped-empty">
              <span className="tj-ped-eyebrow">Sem pedidos</span>
              <p>
                {displayError
                  ? "No momento não foi possível carregar pedidos do servidor."
                  : "Quando novos pedidos chegarem, eles aparecerão nesta linha do tempo."}
              </p>
              <div className="tj-ped-hero-actions">
                <button
                  type="button"
                  className="tj-ped-action tj-ped-action--solid"
                  onClick={() => {
                    setTelefone(formatTelefone(usuario?.empresa?.telefone || usuario?.empresa?.whatsapp || ""));
                    setAbrirModal(true);
                  }}
                >
                  Criar primeiro pedido
                </button>
                <button
                  type="button"
                  className="tj-ped-action"
                  onClick={() => atualizarLista(usuario, false, "refresh")}
                  disabled={isRefreshing}
                >
                  <FiRefreshCw className={isRefreshing ? "tj-ped-spin" : ""} />
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Destaque do fluxo */}
        {pedidoDestaque && hasVisibleResults && (
          <section className="tj-ped-focus">
            <div>
              <span className="tj-ped-eyebrow">Em destaque</span>
              <h2>{pedidoDestaque.empresa?.nome || "Nenhum pedido encontrado"}</h2>
              <p>
                {getStatusLabelForDrawer(pedidoDestaque.status)} · {getLocationLabel(pedidoDestaque)}
              </p>
            </div>
            <button
              type="button"
              className="tj-ped-action tj-ped-action--ghost"
              onClick={() => setPedidoAbertoId(pedidoDestaque.id)}
            >
              Abrir detalhes
              <FiChevronRight />
            </button>
          </section>
        )}
      </main>

      {/* ============ DRAWER DE DETALHES ============ */}
      {pedidoAberto &&
        createPortal(
          <div className="tj-ped-overlay" onClick={() => { setPedidoAbertoId(null); limparEdicao(); }}>
            <motion.aside
              className="tj-ped-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={`Detalhes do pedido ${pedidoAberto.id}`}
              initial={{ x: "100%", opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.6 }}
              transition={{ duration: 0.45, ease: TJ_EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tj-ped-drawer-head">
                <div className="tj-ped-drawer-title">
                  <span className="tj-ped-eyebrow">Pedido #{pedidoAberto.id}</span>
                  <h2>{pedidoAberto.empresa?.nome || pedidoAberto.nomeCliente || "Pedido"}</h2>
                  <div className="tj-ped-drawer-status">
                    <span className={`tj-ped-dot tj-ped-dot--${getStatusDotTone(pedidoAberto.status)}`} />
                    <span>{getStatusLabelForDrawer(pedidoAberto.status)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="tj-ped-drawer-close"
                  onClick={() => { setPedidoAbertoId(null); limparEdicao(); }}
                  aria-label="Fechar detalhes"
                >
                  <FiX />
                </button>
              </div>

              <div className="tj-ped-drawer-body">
                {!isEditing ? (
                  <>
                    <div className="tj-ped-drawer-meta">
                      <div className="tj-ped-drawer-meta-item">
                        <span>Email</span>
                        <strong>{pedidoAberto.email}</strong>
                      </div>
                      {pedidoAberto.telefone && (
                        <div className="tj-ped-drawer-meta-item">
                          <span>Telefone</span>
                          <strong>{formatTelefone(pedidoAberto.telefone)}</strong>
                        </div>
                      )}
                      <div className="tj-ped-drawer-meta-item">
                        <span>Criado em</span>
                        <strong>{formatarData(getPedidoCreatedAt(pedidoAberto))}</strong>
                      </div>
                      <div className="tj-ped-drawer-meta-item">
                        <span>Local</span>
                        <strong>
                          <FiMapPin /> {getLocationLabel(pedidoAberto)}
                        </strong>
                      </div>
                      {pedidoAberto.cep && (
                        <div className="tj-ped-drawer-meta-item">
                          <span>CEP</span>
                          <strong>{formatCep(pedidoAberto.cep)}</strong>
                        </div>
                      )}
                    </div>

                    <div className="tj-ped-drawer-message">
                      <span className="tj-ped-eyebrow">Mensagem</span>
                      <p>{pedidoAberto.mensagem || "Sem mensagem adicional."}</p>
                    </div>

                    {isAdmin && (
                      <>
                        <div className="tj-ped-drawer-section">
                          <div className="tj-ped-drawer-section-head">
                            <span className="tj-ped-eyebrow">Pagamento</span>
                            <FiCreditCard />
                          </div>
                          <label className="tj-ped-filter-field tj-ped-filter-field--full">
                            <span>Status do pagamento</span>
                            <select
                              value={normalizePagamentoStatus(pedidoAberto.pagamentoStatus, pedidoAberto.pago)}
                              onChange={(e) => alterarPagamento(pedidoAberto.id, e.target.value as PagamentoStatus)}
                              disabled={Boolean(pendingAction)}
                            >
                              {PAGAMENTO_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {normalizePagamentoStatus(pedidoAberto.pagamentoStatus, pedidoAberto.pago) === "pago_a_mais" && (
                            <p className="tj-ped-drawer-note tj-ped-drawer-note--gold">
                              Este pedido está marcado como destaque (pago a mais).
                            </p>
                          )}
                        </div>

                        {pedidoAberto.pagamentoHistorico && pedidoAberto.pagamentoHistorico.length > 0 && (
                          <div className="tj-ped-drawer-section">
                            <span className="tj-ped-eyebrow">Última atualização</span>
                            {(pedidoAberto.pagamentoHistorico as PagamentoHistoricoEntry[])
                              .slice(-1)
                              .map((item, historyIndex) => (
                                <div key={`${pedidoAberto.id}-${historyIndex}`} className="tj-ped-drawer-history">
                                  <span className={`tj-ped-glow-chip tj-ped-glow-chip--${item.status}`}>
                                    {getPagamentoDisplayLabel(item.status)}
                                  </span>
                                  <span>
                                    <FiClock /> {formatarData(item.updatedAt)}
                                    {item.updatedByNome ? ` · por ${item.updatedByNome}` : ""}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}

                    {usuario?.role === "admin" && (
                      <div className="tj-ped-drawer-section">
                        <span className="tj-ped-eyebrow">Status</span>
                        <label className="tj-ped-filter-field tj-ped-filter-field--full">
                          <span>Progresso do pedido</span>
                          <select
                            value={normalizeStatus(pedidoAberto.status)}
                            onChange={(e) => alterarStatus(pedidoAberto.id, e.target.value)}
                            disabled={Boolean(pendingAction)}
                          >
                            {STATUS_OPTIONS.filter((option) => option.value !== "all").map(
                              (option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="tj-ped-drawer-edit">
                    <span className="tj-ped-eyebrow">Editando pedido</span>

                    <div className="tj-ped-field">
                      <label htmlFor={`edit-telefone-${pedidoAberto.id}`}>Telefone</label>
                      <input
                        id={`edit-telefone-${pedidoAberto.id}`}
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
                            ? getFieldErrorId(`edit-${pedidoAberto.id}`, "telefone")
                            : undefined
                        }
                        disabled={Boolean(pendingAction)}
                      />
                      {editFieldErrors.telefone && (
                        <span id={getFieldErrorId(`edit-${pedidoAberto.id}`, "telefone")} className="tj-ped-field-error" role="alert">
                          {editFieldErrors.telefone}
                        </span>
                      )}
                    </div>

                    <div className="tj-ped-field">
                      <label htmlFor={`edit-local-${pedidoAberto.id}`}>Local</label>
                      <textarea
                        id={`edit-local-${pedidoAberto.id}`}
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
                            ? getFieldErrorId(`edit-${pedidoAberto.id}`, "local")
                            : undefined
                        }
                        disabled={Boolean(pendingAction)}
                      />
                      {editFieldErrors.local && (
                        <span id={getFieldErrorId(`edit-${pedidoAberto.id}`, "local")} className="tj-ped-field-error" role="alert">
                          {editFieldErrors.local}
                        </span>
                      )}
                    </div>

                    <div className="tj-ped-field">
                      <label htmlFor={`edit-cep-${pedidoAberto.id}`}>CEP</label>
                      <input
                        id={`edit-cep-${pedidoAberto.id}`}
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
                            ? getFieldErrorId(`edit-${pedidoAberto.id}`, "cep")
                            : undefined
                        }
                        disabled={Boolean(pendingAction)}
                      />
                      {editFieldErrors.cep && (
                        <span id={getFieldErrorId(`edit-${pedidoAberto.id}`, "cep")} className="tj-ped-field-error" role="alert">
                          {editFieldErrors.cep}
                        </span>
                      )}
                    </div>

                    <div className="tj-ped-field">
                      <label htmlFor={`edit-mensagem-${pedidoAberto.id}`}>Mensagem</label>
                      <textarea
                        id={`edit-mensagem-${pedidoAberto.id}`}
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
                            ? getFieldErrorId(`edit-${pedidoAberto.id}`, "mensagem")
                            : undefined
                        }
                        disabled={Boolean(pendingAction)}
                      />
                      {editFieldErrors.mensagem && (
                        <span id={getFieldErrorId(`edit-${pedidoAberto.id}`, "mensagem")} className="tj-ped-field-error" role="alert">
                          {editFieldErrors.mensagem}
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="tj-ped-field">
                        <label htmlFor={`edit-pagamento-${pedidoAberto.id}`}>Pagamento</label>
                        <select
                          id={`edit-pagamento-${pedidoAberto.id}`}
                          value={editPagamentoStatus}
                          onChange={(e) => setEditPagamentoStatus(e.target.value as PagamentoStatus)}
                          disabled={Boolean(pendingAction)}
                        >
                          {PAGAMENTO_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="tj-ped-drawer-foot">
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      className="tj-ped-action tj-ped-action--ghost"
                      onClick={() => startEdit(pedidoAberto)}
                      disabled={Boolean(pendingAction)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="tj-ped-action tj-ped-action--danger"
                      onClick={() => abrirConfirmExcluir(pedidoAberto.id)}
                      disabled={Boolean(pendingAction)}
                    >
                      Excluir
                    </button>
                    {usuario?.role === "admin" && (
                      <button
                        type="button"
                        className="tj-ped-action tj-ped-action--accent"
                        onClick={() => {
                          const pedidoLocal = pedidoAberto.local?.trim() || "";
                          const pedidoCep = pedidoAberto.cep?.trim() || "";
                          const pedidoMensagem = pedidoAberto.mensagem?.trim() || "";
                          const pedidoEmpresaNome = pedidoAberto.empresa?.nome?.trim() || "";
                          const clienteNome = pedidoAberto.nomeCliente?.trim() || "";
                          const clienteEmail = pedidoAberto.email?.trim() || "";
                          const pedidoTelefone = pedidoAberto.telefone?.trim() || "";
                          const initialTitle = buildInitialTourTitle(pedidoAberto);
                          const initialDescricao = buildInitialTourDescricao(pedidoAberto);
                          const initialEndereco = pedidoLocal || pedidoCep || "";
                          const initialCep = pedidoCep;

                          const navigationState: CriarTourNavigationState = {
                            clienteNome: clienteNome || pedidoEmpresaNome,
                            clienteEmail,
                            pedidoId: pedidoAberto.id,
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
                        disabled={Boolean(pendingAction)}
                      >
                        Gerar Tour <FiArrowRight />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="tj-ped-action tj-ped-action--solid"
                      onClick={() => salvarEdit(pedidoAberto.id)}
                      disabled={Boolean(pendingAction)}
                    >
                      {pendingAction === "update" ? (
                        <>
                          <FiRefreshCw className="tj-ped-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar"
                      )}
                    </button>
                    <button
                      type="button"
                      className="tj-ped-action tj-ped-action--ghost"
                      onClick={limparEdicao}
                      disabled={Boolean(pendingAction)}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </motion.aside>
          </div>,
          document.body
        )}

      {/* ============ MODAL NOVO PEDIDO ============ */}
      {abrirModal &&
        createPortal(
          <div className="tj-ped-overlay" onClick={() => setAbrirModal(false)}>
            <motion.div
              className="tj-ped-modal"
              style={{ x: "-50%", y: "-50%" }}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: TJ_EASE }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tj-ped-modal-title"
            >
              <div className="tj-ped-modal-head">
                <div>
                  <span className="tj-ped-eyebrow">Novo registro</span>
                  <h2 id="tj-ped-modal-title">Novo Pedido</h2>
                </div>
                <button
                  type="button"
                  className="tj-ped-drawer-close"
                  onClick={() => setAbrirModal(false)}
                  aria-label="Fechar modal"
                  disabled={enviando}
                >
                  <FiX />
                </button>
              </div>

              <form className="tj-ped-form" onSubmit={handleCriar} noValidate>
                <div className="tj-ped-field">
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
                    <span id={getFieldErrorId("create", "telefone")} className="tj-ped-field-error" role="alert">
                      {createFieldErrors.telefone}
                    </span>
                  )}
                </div>

                <div className="tj-ped-field">
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
                    <span id={getFieldErrorId("create", "mensagem")} className="tj-ped-field-error" role="alert">
                      {createFieldErrors.mensagem}
                    </span>
                  )}
                </div>

                <div className="tj-ped-location-mode">
                  <span className="tj-ped-eyebrow">Como deseja informar o local?</span>
                  <div className="tj-ped-location-options">
                    <button
                      type="button"
                      className={`tj-ped-chip${locationMode === "cep" ? " is-active" : ""}`}
                      onClick={() => {
                        setLocationMode("cep");
                        setLocal("");
                        setCreateFieldErrors((prev) => ({ ...prev, local: undefined }));
                      }}
                      disabled={enviando}
                    >
                      CEP
                    </button>
                    <button
                      type="button"
                      className={`tj-ped-chip${locationMode === "manual" ? " is-active" : ""}`}
                      onClick={() => {
                        setLocationMode("manual");
                        setCep("");
                        setCreateFieldErrors((prev) => ({ ...prev, cep: undefined }));
                      }}
                      disabled={enviando}
                    >
                      Endereço manual
                    </button>
                  </div>
                </div>

                {locationMode === "cep" && (
                  <div className="tj-ped-field">
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
                      <span id={getFieldErrorId("create", "cep")} className="tj-ped-field-error" role="alert">
                        {createFieldErrors.cep}
                      </span>
                    )}
                  </div>
                )}

                {locationMode === "manual" && (
                  <div className="tj-ped-field">
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
                      <span id={getFieldErrorId("create", "local")} className="tj-ped-field-error" role="alert">
                        {createFieldErrors.local}
                      </span>
                    )}
                  </div>
                )}

                <p className="tj-ped-drawer-note">
                  A busca e os filtros consideram empresa, cliente, contato, mensagem, local e CEP.
                </p>

                <div className="tj-ped-form-actions">
                  <button
                    type="submit"
                    className="tj-ped-action tj-ped-action--solid"
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <FiRefreshCw className="tj-ped-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar"
                    )}
                  </button>
                  <button
                    type="button"
                    className="tj-ped-action tj-ped-action--ghost"
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

      {/* ============ CONFIRMAR EXCLUSÃO ============ */}
      {confirmExcluir.open &&
        createPortal(
          <div className="tj-ped-overlay">
            <motion.div
              className="tj-ped-modal tj-ped-modal--sm"
              style={{ x: "-50%", y: "-50%" }}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: TJ_EASE }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tj-ped-confirm-title"
            >
              <h2 id="tj-ped-confirm-title">Excluir pedido?</h2>
              <p className="tj-ped-drawer-note">
                Essa ação remove o pedido da lista atual e não pode ser desfeita.
              </p>
              <div className="tj-ped-form-actions">
                <button
                  type="button"
                  className="tj-ped-action tj-ped-action--danger"
                  onClick={handleExcluirConfirmado}
                  disabled={pendingAction === "delete"}
                >
                  {pendingAction === "delete" ? (
                    <>
                      <FiRefreshCw className="tj-ped-spin" />
                      Excluindo...
                    </>
                  ) : (
                    "Excluir"
                  )}
                </button>
                <button
                  type="button"
                  className="tj-ped-action tj-ped-action--ghost"
                  onClick={() => setConfirmExcluir({ id: 0, open: false })}
                  disabled={pendingAction === "delete"}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
