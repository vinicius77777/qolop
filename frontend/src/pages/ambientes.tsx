import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  getAmbientes,
  getAmbientesPublicos,
  deleteAmbiente,
  getMe,
  registrarVisualizacaoAmbiente,
  Usuario,
} from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FiEye, FiTrash2, FiEdit, FiSearch, FiLayers, FiGlobe, FiZap } from "react-icons/fi";
import "../styles/ambientes.css";

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

const heroMessages = [
  "Explore ambientes com rapidez",
  "Entre no espaço antes da visita",
  "Visual direto, foco no tour",
  "Menos ruído, mais descoberta",
];

const Ambientes: React.FC = () => {
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

  const navigate = useNavigate();
  const location = useLocation();

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
    setImagemPreview(amb.imagemPreview ? `${API_URL}${amb.imagemPreview}` : null);
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
  const premiumAmbientes = ambientesFiltrados.filter((amb) => isPagoAMais(amb)).length;
  const categoriasAtivas = new Set(
    ambientesFiltrados.map((amb) => normalizeCategoria(amb.categoria)).filter(Boolean)
  ).size;

  const ambienteDestaque = ambientesFiltrados[0] || null;
  const recenteCategoria =
    ambienteDestaque?.categoria || ambientesFiltrados.find((amb) => amb.categoria)?.categoria;

  const heroStats = [
    {
      value: totalAmbientes.toString().padStart(2, "0"),
      label: "ambientes visíveis agora",
    },
    {
      value: categoriasAtivas.toString().padStart(2, "0"),
      label: "camadas de exploração",
    },
    {
      value: ambientesPublicos.toString().padStart(2, "0"),
      label: "experiências públicas ativas",
    },
  ];

  const spotlightCards = [
    {
      icon: <FiLayers />,
      title: "Leitura rápida",
      body: "Cards mais diretos para a pessoa bater o olho e decidir se quer abrir o tour.",
    },
    {
      icon: <FiGlobe />,
      title: "Busca simples",
      body: "Filtro por categoria e busca por texto para achar o ambiente sem excesso de informação.",
    },
    {
      icon: <FiZap />,
      title: "Ação imediata",
      body: "Preview, status e botão de ver ficam em evidência para acelerar a navegação.",
    },
  ];

  if (loading) {
    return (
      <div className="amb-loading-screen">
        <motion.div
          className="amb-loading-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Carregando a experiência dos ambientes...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="amb-page">
      <div className="amb-noise" />
      <div className="amb-ambient amb-ambient--one" />
      <div className="amb-ambient amb-ambient--two" />
      <div className="amb-ambient amb-ambient--three" />

      <main className="amb-shell">
        <section className="amb-hero">
          <motion.div
            className="amb-hero-copy"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="amb-eyebrow">
              Ambientes · {usuario?.nome ? usuario.nome.split(" ")[0] : "exploração ativa"}
            </span>

            <h1 className="amb-title">
              Escolha um ambiente e abra o tour com facilidade.
            </h1>

            <p className="amb-lead">
              Tudo foi organizado para ficar simples: encontre o ambiente, clique em
              ver e entre no tour.
            </p>

            <div className="amb-hero-actions">
              <button
                type="button"
                className="amb-hero-btn amb-hero-btn--primary"
                onClick={() => {
                  const grid = document.getElementById("amb-grid");
                  grid?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Explorar ambientes
              </button>

              <button
                type="button"
                className="amb-hero-btn amb-hero-btn--secondary"
                onClick={() => navigate("/inicio", { state: { from: location.pathname } })}
              >
                Voltar ao início
              </button>
            </div>

            <div className="amb-scroll-indicator">Role para ver os ambientes</div>
          </motion.div>

          <motion.div
            className="amb-hero-panel"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.12 }}
          >
            <div className="amb-panel-top">
              <div className="amb-window-controls">
                <span />
                <span />
                <span />
              </div>
              <div className="amb-panel-label">Scene / immersive browser</div>
            </div>

            <div className="amb-hero-marquee">
              <motion.div
                className="amb-hero-marquee-track"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 16, ease: "linear", repeat: Infinity }}
              >
                {heroMessages.concat(heroMessages).map((item, index) => (
                  <span key={`${item}-${index}`}>{item}</span>
                ))}
              </motion.div>
            </div>

            <div className="amb-stats">
              {heroStats.map((item, index) => (
                <motion.div
                  key={item.label}
                  className="amb-stat"
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

            <div className="amb-hero-focus">
              <div>
                <span className="amb-mini-label">Ambiente em destaque</span>
                <h3>{ambienteDestaque?.titulo || "Nenhum ambiente encontrado"}</h3>
                <p>
                  {ambienteDestaque?.descricao?.slice(0, 110) ||
                    "Ajuste os filtros para revelar novos ambientes."}
                </p>
              </div>

              <div className="amb-focus-side">
                <span className="amb-focus-chip">
                  {formatCategoriaLabel(recenteCategoria)}
                </span>
                <span className="amb-focus-meta">
                  {premiumAmbientes} premium / {ambientesPublicos} públicos
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="amb-story">
          <div className="amb-story-grid">
            {spotlightCards.map((card, index) => (
              <motion.article
                key={card.title}
                className="amb-story-card"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <div className="amb-story-icon">{card.icon}</div>
                <span className="amb-story-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="amb-browser" id="amb-grid">
          <div className="amb-browser-top">
            <div className="amb-browser-copy">
              <span className="amb-section-kicker">Ambientes disponíveis</span>
              <h2>Veja os ambientes de forma simples e direta.</h2>
              <p>
                Use a busca ou o filtro e abra o tour que quiser visitar.
              </p>
            </div>

            <div className="amb-controls">
              <div className="amb-search-shell">
                <FiSearch className="amb-search-icon" />
                <input
                  type="text"
                  className="amb-search"
                  placeholder="Buscar ambiente"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="amb-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="todos">Todas as categorias</option>
                {categoriasDisponiveis.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {formatCategoriaLabel(categoria)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="amb-marquee" aria-label="mensagem contínua da experiência">
            <motion.div
              className="amb-marquee-track"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 18, ease: "linear", repeat: Infinity }}
            >
              <span>Explorar com profundidade</span>
              <span>Ambientes com identidade</span>
              <span>Visual mais sensorial</span>
              <span>Navegação cinematográfica</span>
              <span>Explorar com profundidade</span>
              <span>Ambientes com identidade</span>
              <span>Visual mais sensorial</span>
              <span>Navegação cinematográfica</span>
            </motion.div>
          </div>

          <div className="amb-grid">
            {ambientesFiltrados.map((amb, index) => {
              const pagamentoStatus = getPagamentoStatus(amb);
              const pagoAMais = pagamentoStatus === "pago_a_mais";

              return (
                <motion.article
                  key={amb.id}
                  className={`amb-card${pagoAMais ? " amb-card--overpaid" : ""}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                  transition={{ duration: 0.5, delay: index % 6 * 0.04 }}
                  whileHover={{ y: -8 }}
                >
                  <div className="amb-card-media">
                    {amb.imagemPreview ? (
                      <img src={`${API_URL}${amb.imagemPreview}`} className="amb-card-img" />
                    ) : (
                      <div className="amb-card-placeholder">
                        <span>Sem preview</span>
                      </div>
                    )}

                    <div className="amb-card-overlay">
                      <span className="amb-card-badge">
                        {formatCategoriaLabel(amb.categoria)}
                      </span>
                      {pagoAMais && <span className="amb-overpaid-badge">Pago a mais</span>}
                    </div>
                  </div>

                  <div className="amb-card-body">
                    <div className="amb-card-header">
                      <div>
                        <span className="amb-card-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3>{amb.titulo}</h3>
                      </div>
                    </div>

                    <p className="amb-card-description">
                      {amb.descricao?.slice(0, 120)}
                      {amb.descricao && amb.descricao.length > 120 ? "..." : ""}
                    </p>

                    <div className="amb-card-meta">
                      <p>
                        <strong>Empresa:</strong>{" "}
                        {amb.empresa?.nome || amb.empresaPedido?.nome || "Não informada"}
                      </p>
                      <p>
                        <strong>Visibilidade:</strong> {amb.publico ? "Público" : "Restrito"}
                      </p>
                    </div>

                    <div className="amb-card-actions">
                      <button className="amb-view-btn" onClick={() => void handleVisualizarAmbiente(amb)}>
                        <FiEye /> Ver
                      </button>

                      {(amb.siteUrl?.trim() || amb.linkVR?.trim()) ? (
                        <button
                          type="button"
                          className="amb-contact-trigger"
                          onClick={() => openAmbienteLink(amb)}
                        >
                          Abrir no site
                        </button>
                      ) : null}

                      {hasContatoDisponivel(amb) ? (
                        <button
                          type="button"
                          className="amb-contact-trigger"
                          onClick={() => setContactTarget(amb)}
                        >
                          Falar com responsável
                        </button>
                      ) : null}

                      {usuario?.role === "admin" && (
                        <>
                          <button className="amb-edit-btn" onClick={() => abrirEdicao(amb)}>
                            <FiEdit /> Editar
                          </button>
                          <button className="amb-delete-btn" onClick={() => handleExcluir(amb.id)}>
                            <FiTrash2 /> Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      </main>

      {showEditModal &&
        createPortal(
          <div className="amb-modal-overlay amb-modal-overlay--scroll" onClick={() => setShowEditModal(false)}>
            <motion.div
              className="amb-modal-box amb-modal-box--offset"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Editar Ambiente</h2>
              <form onSubmit={handleEditar} className="amb-form">
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                <input value={linkVR} onChange={(e) => setLinkVR(e.target.value)} />

                <div className="checkbox-wrapper">
                  <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} id="amb-publico-edit" />
                  <label htmlFor="amb-publico-edit">Público</label>
                </div>

                <label className="amb-file-label">
                  Alterar imagem
                  <input type="file" onChange={handleImagemChange} />
                </label>
                {imagemPreview && <img src={imagemPreview} className="amb-preview-img" />}

                <div className="amb-form-actions">
                  <button className="amb-submit-btn">Salvar</button>
                  <button type="button" className="amb-cancel-btn" onClick={() => setShowEditModal(false)}>Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}

      {contactTarget &&
        createPortal(
          <div className="amb-modal-overlay" onClick={() => setContactTarget(null)}>
            <div
              className="modal-box"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "520px" }}
            >
              <p style={{ marginTop: 0, marginBottom: 16, fontSize: "1.05rem", fontWeight: 700 }}>
                Escolha como deseja falar com o responsável
              </p>
              <div className="modal-actions" style={{ justifyContent: "stretch" }}>
                {getContatoEmail(contactTarget) ? (
                  <button
                    type="button"
                    className="amb-contact-option amb-contact-option--email"
                    style={{ width: "100%" }}
                    onClick={() => openEmailContato(contactTarget)}
                  >
                    Enviar email
                  </button>
                ) : null}
                {getContatoTelefone(contactTarget) ? (
                  <button
                    type="button"
                    className="amb-contact-option amb-contact-option--phone"
                    style={{ width: "100%" }}
                    onClick={() => openPhoneContato(contactTarget)}
                  >
                    Falar no celular
                  </button>
                ) : null}
                {!getContatoEmail(contactTarget) && !getContatoTelefone(contactTarget) ? (
                  <div
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      textAlign: "center",
                    }}
                  >
                    Responsável:{" "}
                    {contactTarget.empresa?.nome ||
                      contactTarget.empresaPedido?.nome ||
                      contactTarget.usuario?.nome ||
                      "Não informado"}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="amb-cancel-btn"
                  style={{ width: "100%" }}
                  onClick={() => setContactTarget(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {confirmExcluir.open &&
        createPortal(
          <div className="amb-modal-overlay">
            <div className="modal-box">
              <p>Deseja realmente excluir este ambiente?</p>
              <div className="modal-actions">
                <button onClick={handleExcluirConfirmado} style={{ background: "#e53935", color: "#fff" }}>Excluir</button>
                <button onClick={() => setConfirmExcluir({ id: 0, open: false })} style={{ background: "#444", color: "#fff" }}>Cancelar</button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {selected &&
        createPortal(
          <div className="amb-modal-overlay" onClick={() => setSelected(null)}>
            <motion.div className="amb-vr-container" onClick={(e) => e.stopPropagation()}>
              {showVRLoading && (
                <div className={`amb-vr-loading ${fadeOut ? "fade-out" : ""}`}>
                  <div className="amb-vr-arrow"></div>
                </div>
              )}
              <iframe
                src={`${selected.linkVR}${selected.linkVR.includes("?") ? "&" : "?"}play=1`}
                className="amb-vr-frame"
                allow="autoplay; fullscreen; xr-spatial-tracking; camera *; microphone *"
                allowFullScreen
                title={selected.titulo}
              />
              <div className="amb-card-actions" style={{ padding: "12px 16px 0" }}>
                {(selected.siteUrl?.trim() || selected.linkVR?.trim()) ? (
                  <button
                    type="button"
                    className="amb-contact-trigger"
                    onClick={() => openAmbienteLink(selected)}
                  >
                    Abrir no site
                  </button>
                ) : null}
                {hasContatoDisponivel(selected) ? (
                  <button
                    type="button"
                    className="amb-contact-trigger"
                    onClick={() => setContactTarget(selected)}
                  >
                    Falar com responsável
                  </button>
                ) : null}
              </div>
              <button className="amb-close-vr" onClick={() => setSelected(null)}>Fechar</button>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Ambientes;
