import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getAmbientes,
  getAmbientesPublicos,
  getAmbientesPopulares,
  deleteAmbiente,
  getMe,
  registrarVisualizacaoAmbiente,
  Usuario,
} from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  FiArrowUpRight,
  FiChevronDown,
  FiClock,
  FiEdit,
  FiEye,
  FiSearch,
  FiTrash2,
  FiTrendingUp,
} from "react-icons/fi";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { API_URL } from "../utils/apiConfig";
import TajimaCursor from "../components/tajimaCursor";
import "../styles/ambientes.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

interface Ambiente {
  id: number;
  titulo: string;
  descricao: string;
  linkVR: string;
  siteUrl?: string | null;
  imagemPreview?: string | null;
  publico: boolean;
  categoria?: string;
  usuario?: { id: number; nome: string; email?: string | null };
  empresa?: { id: number; nome: string; email?: string; telefone?: string; whatsapp?: string };
  empresaPedido?: { id: number; nome: string; email?: string; telefone?: string; whatsapp?: string } | null;
  pedidoId?: number | null;
  pedido?: {
    id: number;
    pagamentoStatus?: string;
    email?: string | null;
    telefone?: string | null;
  } | null;
}

function getPagamentoStatus(ambiente: Ambiente) {
  return ambiente.pedido?.pagamentoStatus || null;
}

function isPagoAMais(ambiente: Ambiente) {
  return getPagamentoStatus(ambiente) === "pago_a_mais";
}

function normalizeCategoria(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatCategoriaLabel(value?: string) {
  if (!value) return "Sem categoria";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getContatoEmail(ambiente: Ambiente) {
  return ambiente.pedido?.email || ambiente.empresa?.email || ambiente.empresaPedido?.email || ambiente.usuario?.email || "";
}

function getContatoTelefone(ambiente: Ambiente) {
  return ambiente.pedido?.telefone || ambiente.empresa?.whatsapp || ambiente.empresa?.telefone || ambiente.empresaPedido?.whatsapp || ambiente.empresaPedido?.telefone || "";
}

function sanitizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  return digits.startsWith("55") ? digits : `55${digits}`;
}

function getEmailContatoPayload(ambiente: Ambiente, email: string) {
  return {
    to: email.trim(),
    subject: `Interesse no ambiente ${ambiente.titulo}`,
    body: `Olá,\n\nTenho interesse no ambiente "${ambiente.titulo}" e gostaria de mais informações.\n\nObrigado!`,
  };
}

function getEmailProviderLink(ambiente: Ambiente, email: string) {
  const payload = getEmailContatoPayload(ambiente, email);
  const domain = payload.to.split("@")[1]?.toLowerCase() || "";

  if (domain.includes("gmail")) {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(payload.to)}&su=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;
  }

  if (domain.includes("yahoo")) {
    return `https://compose.mail.yahoo.com/?to=${encodeURIComponent(payload.to)}&subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;
  }

  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) {
    return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(payload.to)}&subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;
  }

  return `mailto:${payload.to}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;
}

function openEmailContato(ambiente: Ambiente) {
  const email = getContatoEmail(ambiente);
  if (!email) return;
  window.open(getEmailProviderLink(ambiente, email), "_blank", "noopener,noreferrer");
}

function openPhoneContato(ambiente: Ambiente) {
  const telefone = getContatoTelefone(ambiente);
  if (!telefone) return;
  window.open(`https://wa.me/${sanitizePhoneNumber(telefone)}`, "_blank", "noopener,noreferrer");
}

function hasContatoDisponivel(ambiente: Ambiente) {
  return Boolean(
    getContatoEmail(ambiente) ||
      getContatoTelefone(ambiente) ||
      ambiente.empresa?.nome ||
      ambiente.empresaPedido?.nome ||
      ambiente.usuario?.nome
  );
}

function openAmbienteLink(ambiente: Ambiente) {
  const link = ambiente.siteUrl?.trim() || ambiente.linkVR?.trim();

  if (!link) return;

  window.open(link, "_blank", "noopener,noreferrer");
}

const Ambientes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Ambiente | null>(null);
  const [showVRLoading, setShowVRLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [linkVR, setLinkVR] = useState("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [publico, setPublico] = useState(true);

  const [confirmExcluir, setConfirmExcluir] = useState({ id: 0, open: false });
  const [contactTarget, setContactTarget] = useState<Ambiente | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement | null>(null);

  const [populares, setPopulares] = useState<Ambiente[]>([]);
  const [ultimoVisto, setUltimoVisto] = useState<Ambiente | null>(null);

  const [hasFinePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
  );

  const isTouch = !hasFinePointer;

  const navigate = useNavigate();
  const location = useLocation();

  function salvarUltimoVisto(amb: Ambiente) {
    if (!isAuthenticated) {
      return;
    }

    const entry = {
      id: amb.id,
      titulo: amb.titulo,
      imagemPreview: amb.imagemPreview,
      categoria: amb.categoria,
    };
    localStorage.setItem("ultimoAmbienteVisto", JSON.stringify(entry));
    setUltimoVisto(amb);
  }

  const carregarUltimoVistoLocal = React.useCallback(() => {
    if (!isAuthenticated) {
      setUltimoVisto(null);
      return;
    }

    try {
      const raw = localStorage.getItem("ultimoAmbienteVisto");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === "number") {
        const match = ambientes.find((a) => a.id === parsed.id);
        if (match) {
          setUltimoVisto(match);
          return;
        }
      }
    } catch { /* ignora */ }
    setUltimoVisto(null);
  }, [ambientes, isAuthenticated]);

  useEffect(() => {
    async function carregar() {
      try {
        let user: Usuario | null = null;

        try {
          user = await getMe();
          setUsuario(user);
        } catch {
          const usuarioLocal = localStorage.getItem("usuario");

          if (usuarioLocal && usuarioLocal !== "undefined") {
            try {
              user = JSON.parse(usuarioLocal) as Usuario;
              setUsuario(user);
            } catch {
              user = null;
            }
          }
        }

        try {
          const data = await getAmbientes(user);
          setAmbientes(data);
        } catch {
          const data = await getAmbientesPublicos();
          setAmbientes(data);
        }
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [navigate]);

  useEffect(() => {
    getAmbientesPopulares()
      .then(setPopulares)
      .catch(() => setPopulares([]));
  }, []);

  useEffect(() => {
    if (ambientes.length > 0) {
      carregarUltimoVistoLocal();
    }
  }, [ambientes, carregarUltimoVistoLocal, isAuthenticated]);

  useEffect(() => {
    if (selected) {
      setShowVRLoading(true);
      setFadeOut(false);
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setShowVRLoading(false), 600);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [selected]);

  useEffect(() => {
    function handlePointerDownOutside(event: PointerEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setCategoriesOpen(false);
      }
    }

    function handleKeyDownEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCategoriesOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDownEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDownEscape);
    };
  }, []);

  function handleImagemChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setImagemFile(file);
    setImagemPreview(URL.createObjectURL(file));
  }

  function limparFormulario() {
    setTitulo("");
    setDescricao("");
    setLinkVR("");
    setImagemFile(null);
    setImagemPreview(null);
    setEditId(null);
    setPublico(true);
  }

  function abrirEdicao(amb: Ambiente) {
    setEditId(amb.id);
    setTitulo(amb.titulo);
    setDescricao(amb.descricao);
    setLinkVR(amb.linkVR);
    setImagemPreview(resolveMediaUrl(amb.imagemPreview));
    setPublico(amb.publico);
    setShowEditModal(true);
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    try {
      const formData = new FormData();
      formData.append("titulo", titulo);
      formData.append("descricao", descricao);
      formData.append("linkVR", linkVR);
      formData.append("publico", publico.toString());
      if (imagemFile) formData.append("imagem", imagemFile);

      const res = await fetch(`${API_URL}/ambientes/${editId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Erro ao editar ambiente");

      const data = await getAmbientes();
      setAmbientes(data);
      limparFormulario();
      setShowEditModal(false);
    } catch (err) {
      console.error("Erro ao editar ambiente:", err);
      alert("Falha ao editar ambiente. Veja console para detalhes.");
    }
  }

  async function handleVisualizarAmbiente(amb: Ambiente) {
    setSelected(amb);
    salvarUltimoVisto(amb);

    if (!isAuthenticated) {
      return;
    }

    try {
      await registrarVisualizacaoAmbiente(amb.id);
    } catch (err) {
      console.error("Erro ao registrar visualização do ambiente:", err);
    }
  }

  function handleExcluir(id: number) {
    setConfirmExcluir({ id, open: true });
  }

  async function handleExcluirConfirmado() {
    await deleteAmbiente(confirmExcluir.id);
    const data = await getAmbientes();
    setAmbientes(data);
    setConfirmExcluir({ id: 0, open: false });
  }

  const normalizedSearch = search.trim().toLowerCase();

  const categoriasDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          ambientes
            .map((amb) => normalizeCategoria(amb.categoria))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [ambientes]
  );

  const ambientesFiltrados = useMemo(
    () =>
      ambientes
        .filter((a) => {
          const searchableContent = [
            a.titulo,
            a.descricao,
            a.categoria,
            a.empresa?.nome,
            a.empresaPedido?.nome,
            a.usuario?.nome,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            normalizedSearch === "" || searchableContent.includes(normalizedSearch);

          const normalizedCategory = normalizeCategoria(a.categoria);
          const matchesCategory =
            categoryFilter === "todos" || normalizedCategory === categoryFilter;

          const podeVer =
            usuario?.role === "admin"
              ? true
              : usuario?.role === "empresa"
              ? a.empresa?.id === usuario.empresa?.id || a.publico
              : a.publico;

          return matchesSearch && matchesCategory && podeVer;
        })
        .sort((a, b) => {
          const overpaidA = isPagoAMais(a) ? 1 : 0;
          const overpaidB = isPagoAMais(b) ? 1 : 0;

          if (overpaidA !== overpaidB) {
            return overpaidB - overpaidA;
          }

          return 0;
        }),
    [ambientes, categoryFilter, normalizedSearch, usuario]
  );

  const totalAmbientes = ambientesFiltrados.length;
  const ambientesPublicos = ambientesFiltrados.filter((amb) => amb.publico).length;
  const categoriasAtivas = new Set(
    ambientesFiltrados.map((amb) => normalizeCategoria(amb.categoria)).filter(Boolean)
  ).size;

  if (loading) {
    return (
      <div className="tj-amb-page tj-amb-loading">
        <motion.div
          className="tj-amb-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          AMBIENTES
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`tj-amb-page${hasFinePointer ? " tj-amb-page--cursor" : ""}`}>
      <div className="tj-amb-bg" aria-hidden="true">
        <span className="tj-amb-orb tj-amb-orb--one" />
        <span className="tj-amb-orb tj-amb-orb--two" />
        <span className="tj-amb-orb tj-amb-orb--three" />
      </div>

      {hasFinePointer && <TajimaCursor />}

      <main className="tj-amb-content">
        {/* ============ HERO MINIMALISTA ============ */}
        <header className="tj-amb-hero">
          <motion.div
            className="tj-amb-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Ambientes</span>
            <span className="tj-amb-dot" />
            <span>{usuario?.nome ? usuario.nome.split(" ")[0] : "exploração ativa"}</span>
          </motion.div>

          <motion.h1
            className="tj-amb-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Escolha um ambiente
            <br />
            e abra o tour.
          </motion.h1>

          <motion.p
            className="tj-amb-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Encontre o ambiente, clique em ver e entre no tour. Sem etapas, sem ruído.
          </motion.p>

          <motion.div
            className="tj-amb-hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            <a
              href="#tj-amb-grid"
              className="tj-amb-action tj-amb-action--solid"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("tj-amb-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Explorar ambientes
              <FiArrowUpRight />
            </a>

            <button
              type="button"
              className="tj-amb-action"
              onClick={() => navigate("/inicio", { state: { from: location.pathname } })}
            >
              Voltar ao início
            </button>
          </motion.div>

          {/* ============ NÚMEROS GIGANTES ============ */}
          <div className="tj-amb-stats">
            <div className="tj-amb-stat">
              <strong>{String(totalAmbientes).padStart(2, "0")}</strong>
              <span>Ambientes visíveis</span>
            </div>
            <div className="tj-amb-stat">
              <strong>{String(categoriasAtivas).padStart(2, "0")}</strong>
              <span>Camadas de exploração</span>
            </div>
            <div className="tj-amb-stat">
              <strong>{String(ambientesPublicos).padStart(2, "0")}</strong>
              <span>Tours públicos</span>
            </div>
          </div>
        </header>

        {/* ============ QUICK ACCESS — sem caixas, tipografia limpa ============ */}
        {(populares.length > 0 || ultimoVisto) && (
          <section className="tj-amb-quick">
            {populares.length > 0 && (
              <div className="tj-amb-quick-block">
                <span className="tj-amb-eyebrow">
                  <FiTrendingUp /> Mais vistos
                </span>
                <div className="tj-amb-quick-list">
                  {populares.slice(0, 4).map((amb, index) => (
                    <button
                      key={`pop-${amb.id}`}
                      type="button"
                      className="tj-amb-quick-item"
                      onClick={() => handleVisualizarAmbiente(amb)}
                    >
                      <span className="tj-amb-quick-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="tj-amb-quick-title">{amb.titulo}</span>
                      <span className="tj-amb-quick-cat">{formatCategoriaLabel(amb.categoria)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {ultimoVisto && (
              <div className="tj-amb-quick-block">
                <span className="tj-amb-eyebrow">
                  <FiClock /> Seu último visto
                </span>
                <button
                  type="button"
                  className="tj-amb-quick-item tj-amb-quick-item--last"
                  onClick={() => handleVisualizarAmbiente(ultimoVisto)}
                >
                  <span className="tj-amb-quick-index">★</span>
                  <span className="tj-amb-quick-title">{ultimoVisto.titulo}</span>
                  <span className="tj-amb-quick-cat">{formatCategoriaLabel(ultimoVisto.categoria)}</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* ============ GALERIA ============ */}
        <section className="tj-amb-browser" id="tj-amb-grid">
          <div className="tj-amb-browser-head">
            <div className="tj-amb-browser-copy">
              <span className="tj-amb-eyebrow">Ambientes disponíveis</span>
              <h2>Veja os ambientes de forma simples e direta.</h2>
            </div>

            <div className="tj-amb-controls">
              <label className="tj-amb-search">
                <FiSearch className="tj-amb-search-icon" />
                <input
                  type="text"
                  className="tj-amb-search-input"
                  placeholder="Buscar ambiente"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <div className="tj-amb-catselect" ref={categoriesRef}>
                <button
                  type="button"
                  className={`tj-amb-catselect__trigger${categoriesOpen ? " is-open" : ""}${
                    categoryFilter !== "todos" ? " has-value" : ""
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={categoriesOpen}
                  onClick={() => setCategoriesOpen((prev) => !prev)}
                >
                  <span className="tj-amb-glow" aria-hidden="true" />
                  <span className="tj-amb-catselect__label">
                    {categoryFilter === "todos"
                      ? "Todas as categorias"
                      : formatCategoriaLabel(categoryFilter)}
                  </span>
                  <FiChevronDown className="tj-amb-catselect__chevron" aria-hidden="true" />
                </button>

                {categoriesOpen ? (
                  <div className="tj-amb-catselect__menu" role="listbox" aria-label="Filtrar por categoria">
                    <button
                      type="button"
                      role="option"
                      aria-selected={categoryFilter === "todos"}
                      className={`tj-amb-cat${categoryFilter === "todos" ? " is-active" : ""}`}
                      onClick={() => {
                        setCategoryFilter("todos");
                        setCategoriesOpen(false);
                      }}
                    >
                      <span className="tj-amb-glow" aria-hidden="true" />
                      Todas as categorias
                    </button>
                    {categoriasDisponiveis.map((categoria) => (
                      <button
                        key={categoria}
                        type="button"
                        role="option"
                        aria-selected={categoryFilter === categoria}
                        className={`tj-amb-cat${categoryFilter === categoria ? " is-active" : ""}`}
                        onClick={() => {
                          setCategoryFilter(categoria);
                          setCategoriesOpen(false);
                        }}
                      >
                        <span className="tj-amb-glow" aria-hidden="true" />
                        {formatCategoriaLabel(categoria)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {isTouch && (
            <p className="tj-amb-touch-note">Toque em um ambiente para ver as ações.</p>
          )}

          <div className="tj-amb-grid">
            {ambientesFiltrados.map((amb, index) => {
              const pagoAMais = isPagoAMais(amb);
              const imageUrl = resolveMediaUrl(amb.imagemPreview);

              return (
                <motion.figure
                  key={amb.id}
                  className={`tj-amb-card${pagoAMais ? " tj-amb-card--gold" : ""}`}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
                  transition={{ duration: 0.65, ease: TJ_EASE, delay: (index % 6) * 0.05 }}
                >
                  <div className="tj-amb-card-media">
                    {imageUrl ? (
                      <img src={imageUrl} className="tj-amb-card-img" alt={amb.titulo} loading="lazy" />
                    ) : (
                      <div className="tj-amb-card-placeholder">
                        <span>Sem preview</span>
                      </div>
                    )}

                    <div className="tj-amb-card-veil" />

                    <div className="tj-amb-card-badges">
                      {amb.categoria ? (
                        <span className="tj-amb-card-badge">{formatCategoriaLabel(amb.categoria)}</span>
                      ) : null}
                      {pagoAMais && <span className="tj-amb-card-badge tj-amb-card-badge--gold">Destaque</span>}
                    </div>

                    <button
                      type="button"
                      className="tj-amb-card-cta"
                      onClick={() => void handleVisualizarAmbiente(amb)}
                    >
                      <FiEye />
                      Ver tour
                    </button>
                  </div>

                  <figcaption className="tj-amb-card-caption">
                    <div className="tj-amb-card-line">
                      <span className="tj-amb-card-index">{String(index + 1).padStart(2, "0")}</span>
                      {amb.empresa?.nome || amb.empresaPedido?.nome ? (
                        <span className="tj-amb-card-owner">
                          {amb.empresa?.nome || amb.empresaPedido?.nome}
                        </span>
                      ) : null}
                      {!amb.publico ? <span className="tj-amb-card-visibility">Restrito</span> : null}
                    </div>

                    <h3>{amb.titulo}</h3>
                    {amb.descricao ? (
                      <p className="tj-amb-card-desc">
                        {amb.descricao.slice(0, 110)}
                        {amb.descricao.length > 110 ? "…" : ""}
                      </p>
                    ) : null}

                    <div className="tj-amb-card-links">
                      {(amb.siteUrl?.trim() || amb.linkVR?.trim()) ? (
                        <button type="button" className="tj-amb-link" onClick={() => openAmbienteLink(amb)}>
                          Abrir no site
                        </button>
                      ) : null}
                      {hasContatoDisponivel(amb) ? (
                        <button
                          type="button"
                          className="tj-amb-link"
                          onClick={() => (isAuthenticated ? setContactTarget(amb) : navigate("/login"))}
                        >
                          Falar com responsável
                        </button>
                      ) : null}
                      {usuario?.role === "admin" && (
                        <>
                          <button type="button" className="tj-amb-link tj-amb-link--danger" onClick={() => abrirEdicao(amb)}>
                            <FiEdit /> Editar
                          </button>
                          <button type="button" className="tj-amb-link tj-amb-link--danger" onClick={() => handleExcluir(amb.id)}>
                            <FiTrash2 /> Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </figcaption>
                </motion.figure>
              );
            })}
          </div>

          {ambientesFiltrados.length === 0 && (
            <div className="tj-amb-empty">
              <p>Nenhum ambiente encontrado para esses filtros.</p>
              <button
                type="button"
                className="tj-amb-action"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("todos");
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ============ MODAL EDITAR ============ */}
      {showEditModal &&
        createPortal(
          <div className="tj-amb-modal-overlay" onClick={() => setShowEditModal(false)}>
            <motion.div
              className="tj-amb-modal"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: TJ_EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Editar Ambiente</h2>
              <form onSubmit={handleEditar} className="tj-amb-form">
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
                <textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" />
                <input value={linkVR} onChange={(e) => setLinkVR(e.target.value)} placeholder="Link VR" />

                <label className="tj-amb-form-check">
                  <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
                  <span>Público</span>
                </label>

                <label className="tj-amb-file-label">
                  Alterar imagem
                  <input type="file" onChange={handleImagemChange} />
                </label>
                {imagemPreview && <img src={imagemPreview} className="tj-amb-preview-img" alt="Preview do ambiente" />}

                <div className="tj-amb-form-actions">
                  <button type="submit" className="tj-amb-action tj-amb-action--solid">Salvar</button>
                  <button type="button" className="tj-amb-action" onClick={() => setShowEditModal(false)}>Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}

      {/* ============ MODAL CONTATO ============ */}
      {contactTarget &&
        createPortal(
          <div className="tj-amb-modal-overlay" onClick={() => setContactTarget(null)}>
            <motion.div
              className="tj-amb-modal tj-amb-modal--sm"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: TJ_EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Falar com o responsável</h2>
              <div className="tj-amb-form-actions">
                {getContatoEmail(contactTarget) ? (
                  <button type="button" className="tj-amb-action" onClick={() => openEmailContato(contactTarget)}>
                    Enviar email
                  </button>
                ) : null}
                {getContatoTelefone(contactTarget) ? (
                  <button type="button" className="tj-amb-action" onClick={() => openPhoneContato(contactTarget)}>
                    Falar no celular
                  </button>
                ) : null}
                {!getContatoEmail(contactTarget) && !getContatoTelefone(contactTarget) ? (
                  <p className="tj-amb-modal-note">
                    Responsável:{" "}
                    {contactTarget.empresa?.nome ||
                      contactTarget.empresaPedido?.nome ||
                      contactTarget.usuario?.nome ||
                      "Não informado"}
                  </p>
                ) : null}
                <button type="button" className="tj-amb-action" onClick={() => setContactTarget(null)}>
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {/* ============ MODAL CONFIRMAR EXCLUSÃO ============ */}
      {confirmExcluir.open &&
        createPortal(
          <div className="tj-amb-modal-overlay">
            <motion.div
              className="tj-amb-modal tj-amb-modal--sm"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: TJ_EASE }}
            >
              <h2>Excluir ambiente?</h2>
              <p className="tj-amb-modal-note">Esta ação não pode ser desfeita.</p>
              <div className="tj-amb-form-actions">
                <button type="button" className="tj-amb-action tj-amb-action--danger" onClick={handleExcluirConfirmado}>
                  Excluir
                </button>
                <button type="button" className="tj-amb-action" onClick={() => setConfirmExcluir({ id: 0, open: false })}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {/* ============ MODAL VR ============ */}
      {selected &&
        createPortal(
          <div className="tj-amb-modal-overlay tj-amb-modal-overlay--vr" onClick={() => setSelected(null)}>
            <motion.div
              className="tj-amb-vr"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: TJ_EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              {showVRLoading && (
                <div className={`tj-amb-vr-loading${fadeOut ? " is-done" : ""}`}>
                  <div className="tj-amb-vr-bar" />
                </div>
              )}
              <iframe
                src={`${selected.linkVR}${selected.linkVR.includes("?") ? "&" : "?"}play=1`}
                className="tj-amb-vr-frame"
                allow="autoplay; fullscreen; xr-spatial-tracking; camera *; microphone *"
                allowFullScreen
                title={selected.titulo}
              />
              <div className="tj-amb-vr-footer">
                {(selected.siteUrl?.trim() || selected.linkVR?.trim()) ? (
                  <button type="button" className="tj-amb-link" onClick={() => openAmbienteLink(selected)}>
                    Abrir no site
                  </button>
                ) : null}
                {hasContatoDisponivel(selected) ? (
                  <button
                    type="button"
                    className="tj-amb-link"
                    onClick={() => (isAuthenticated ? setContactTarget(selected) : navigate("/login"))}
                  >
                    Falar com responsável
                  </button>
                ) : null}
              </div>
              <button className="tj-amb-vr-close" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Ambientes;
