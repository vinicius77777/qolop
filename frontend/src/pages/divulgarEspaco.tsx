// src/pages/divulgarEspaco.tsx
// Difusão de tour 360° — QR Code + links de compartilhamento.
// Página no padrão Tao Tajima: fundo #050a12, QR/embed flutuando
// com borda luminosa fina e ação de copiar com check verde.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowUpRight,
  FiCheck,
  FiCode,
  FiCopy,
  FiExternalLink,
  FiLink,
  FiShare2,
  FiX,
} from "react-icons/fi";
import { getAmbientes, getMe, type Ambiente, type Usuario } from "../services/api";
import "../styles/divulgarEspaco.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;
const QR_SIZE = 220;
const CAN_SHARE = typeof navigator !== "undefined" && Boolean(navigator.share);

function buildTourUrl(ambiente: Ambiente) {
  return `${window.location.origin}/tour/${ambiente.id}`;
}

function buildEmbedCode(ambiente: Ambiente) {
  const url = buildTourUrl(ambiente);
  return `<iframe src="${url}" width="100%" height="480" frameborder="0" allow="autoplay; fullscreen; xr-spatial-tracking; camera *; microphone *" allowfullscreen></iframe>`;
}

export default function DivulgarEspaco() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function carregar() {
      try {
        const user = await getMe();

        if (user.role !== "admin" && !user.empresa?.id) {
          if (!isMounted) return;

          setUsuario(user);
          setAmbientes([]);
          setSelectedId(null);
          setError(
            "A divulgação de espaços está disponível apenas para usuários com empresa vinculada."
          );
          return;
        }

        const data = await getAmbientes(user);

        const ambientesDivulgaveis =
          user.role === "admin"
            ? Array.isArray(data)
              ? data
              : []
            : (Array.isArray(data) ? data : []).filter((ambiente) =>
                user.empresa?.id
                  ? ambiente.empresa?.id === user.empresa.id ||
                    ambiente.empresaPedido?.id === user.empresa.id ||
                    ambiente.usuario?.empresa?.id === user.empresa.id
                  : false
              );

        if (!isMounted) return;

        setUsuario(user);
        setAmbientes(ambientesDivulgaveis);

        const primeiroDivulgavel =
          ambientesDivulgaveis.find((ambiente) => ambiente.publico) ||
          ambientesDivulgaveis[0] ||
          null;

        setSelectedId(primeiroDivulgavel?.id ?? null);
        setError("");
      } catch (err) {
        if (!isMounted) return;
        console.error("Erro ao carregar ambientes para divulgação:", err);
        setError("Não foi possível carregar os espaços da sua empresa.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    carregar();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const selected = useMemo(
    () => ambientes.find((ambiente) => ambiente.id === selectedId) ?? null,
    [ambientes, selectedId]
  );

  const tourUrl = useMemo(
    () => (selected ? buildTourUrl(selected) : ""),
    [selected]
  );

  const embedCode = useMemo(
    () => (selected ? buildEmbedCode(selected) : ""),
    [selected]
  );

  const qrUrl = useMemo(() => {
    if (!tourUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&margin=12&data=${encodeURIComponent(
      tourUrl
    )}`;
  }, [tourUrl]);

  async function handleCopyLink() {
    if (!tourUrl) return;

    try {
      await navigator.clipboard.writeText(tourUrl);
      setCopied("link");
    } catch {
      setError("Não foi possível copiar o link automaticamente.");
    }
  }

  async function handleCopyEmbed() {
    if (!embedCode) return;

    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied("embed");
    } catch {
      setError("Não foi possível copiar o embed automaticamente.");
    }
  }

  function handleShare() {
    if (!tourUrl) return;

    if (CAN_SHARE && navigator.share) {
      void navigator.share({
        title: selected?.titulo || "Tour Qolop",
        text: selected?.titulo
          ? `Confira o tour ${selected.titulo} no Qolop`
          : "Confira este tour no Qolop",
        url: tourUrl,
      });
      return;
    }

    void handleCopyLink();
  }

  if (loading) {
    return (
      <div className="tj-div-page tj-div-loading">
        <motion.div
          className="tj-div-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          DIVULGAR
        </motion.div>
      </div>
    );
  }

  if (error && ambientes.length === 0) {
    return (
      <div className="tj-div-page">
        <main className="tj-div-content">
          <div className="tj-div-empty">
            <span className="tj-div-eyebrow">Indisponível</span>
            <h2>Divulgação indisponível</h2>
            <p>{error}</p>
            <button
              type="button"
              className="tj-div-action"
              onClick={() => navigate("/perfil")}
            >
              Voltar ao perfil
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="tj-div-page">
      <div className="tj-div-bg" aria-hidden="true">
        <span className="tj-div-orb tj-div-orb--one" />
        <span className="tj-div-orb tj-div-orb--two" />
        <span className="tj-div-orb tj-div-orb--three" />
      </div>

      <main className="tj-div-content">
        {/* ============ HERO ============ */}
        <header className="tj-div-hero">
          <motion.div
            className="tj-div-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Divulgação</span>
            <span className="tj-div-dot" />
            <span>compartilhe um tour</span>
          </motion.div>

          <motion.h1
            className="tj-div-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Leve o tour
            <br />
            para fora da plataforma.
          </motion.h1>

          <motion.p
            className="tj-div-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Gere um QR Code e um link de incorporação (embed) para divulgar o seu
            ambiente em materiais impressos, sites e redes sociais.
          </motion.p>
        </header>

        {/* ============ SELETOR DE AMBIENTE ============ */}
        <section className="tj-div-browser">
          <div className="tj-div-browser-head">
            <div>
              <span className="tj-div-eyebrow">Ambientes</span>
              <h2>Escolha o tour para divulgar.</h2>
            </div>
            {usuario?.role === "admin" && (
              <Link className="tj-div-link" to="/criarTour">
                Criar novo tour
                <FiArrowUpRight />
              </Link>
            )}
          </div>

          {ambientes.length === 0 ? (
            <div className="tj-div-empty">
              <span className="tj-div-eyebrow">Sem ambientes</span>
              <h2>Nenhum ambiente disponível.</h2>
              <p>
                Crie um tour primeiro para gerar QR Code e link de incorporação.
              </p>
              <button
                type="button"
                className="tj-div-action tj-div-action--solid"
                onClick={() => navigate("/criarTour")}
              >
                Criar tour
                <FiArrowUpRight />
              </button>
            </div>
          ) : (
            <div className="tj-div-list">
              {ambientes.map((ambiente, index) => {
                const isSelected = ambiente.id === selectedId;

                return (
                  <motion.button
                    key={ambiente.id}
                    type="button"
                    className={`tj-div-row${isSelected ? " is-active" : ""}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: TJ_EASE, delay: (index % 8) * 0.04 }}
                    onClick={() => setSelectedId(ambiente.id)}
                    aria-pressed={isSelected}
                  >
                    <span className={`tj-div-glow tj-div-glow--${ambiente.publico ? "public" : "private"}`} />
                    <span className="tj-div-row-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="tj-div-row-main">
                      <strong>{ambiente.titulo}</strong>
                      <span>
                        {ambiente.publico ? "Público" : "Privado"} · Tour #{ambiente.id}
                        {ambiente.cidade ? ` · ${ambiente.cidade}` : ""}
                      </span>
                    </span>
                    <span className="tj-div-row-icon">→</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* ============ PREVIEW FLUTUANTE ============ */}
        {selected && (
          <section className="tj-div-preview">
            <div className="tj-div-preview-head">
              <div>
                <span className="tj-div-eyebrow">Preview</span>
                <h2>{selected.titulo}</h2>
              </div>
              <a
                className="tj-div-action"
                href={tourUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir tour
                <FiExternalLink />
              </a>
            </div>

            <div className="tj-div-float-grid">
              {/* ---------- QR Code ---------- */}
              <div className="tj-div-float tj-div-float--qr">
                <div className="tj-div-float-head">
                  <span className="tj-div-float-icon">
                    <FiCode />
                  </span>
                  <span className="tj-div-float-title">QR Code</span>
                </div>

                <div className="tj-div-qr">
                  <img src={qrUrl} alt={`QR Code do tour ${selected.titulo}`} width={QR_SIZE} height={QR_SIZE} />
                </div>

                <p className="tj-div-float-note">
                  Funciona em materiais impressos, cards e vitrines.
                </p>
              </div>

              {/* ---------- Link + Embed ---------- */}
              <div className="tj-div-float tj-div-float--share">
                <div className="tj-div-float-head">
                  <span className="tj-div-float-icon">
                    <FiShare2 />
                  </span>
                  <span className="tj-div-float-title">Compartilhamento</span>
                </div>

                <div className="tj-div-copy-row">
                  <div className="tj-div-copy-main">
                    <span className="tj-div-copy-label">Link do tour</span>
                    <code>{tourUrl}</code>
                  </div>
                  <button
                    type="button"
                    className={`tj-div-copy-btn${copied === "link" ? " is-copied" : ""}`}
                    onClick={() => void handleCopyLink()}
                    aria-label="Copiar link do tour"
                  >
                    {copied === "link" ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>

                <div className="tj-div-copy-row">
                  <div className="tj-div-copy-main">
                    <span className="tj-div-copy-label">Embed (iframe)</span>
                    <code>{embedCode}</code>
                  </div>
                  <button
                    type="button"
                    className={`tj-div-copy-btn${copied === "embed" ? " is-copied" : ""}`}
                    onClick={() => void handleCopyEmbed()}
                    aria-label="Copiar código de incorporação"
                  >
                    {copied === "embed" ? <FiCheck /> : <FiCode />}
                  </button>
                </div>

                <div className="tj-div-share-actions">
                  <button
                    type="button"
                    className="tj-div-action tj-div-action--solid"
                    onClick={() => void handleShare()}
                  >
                    {CAN_SHARE ? <FiShare2 /> : <FiLink />}
                    {CAN_SHARE ? "Compartilhar" : "Copiar link"}
                  </button>
                  {!CAN_SHARE && (
                    <a
                      className="tj-div-action"
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        selected.titulo
                          ? `Confira o tour ${selected.titulo} no Qolop: ${tourUrl}`
                          : tourUrl
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                      <FiExternalLink />
                    </a>
                  )}
                </div>

                <p className="tj-div-float-note">
                  O embed é compatível com iframes de sites, portais e blogs.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Alerta de erro */}
        <AnimatePresence>
          {error ? (
            <motion.div
              className="tj-div-inline-alert"
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FiX onClick={() => setError("")} />
              <span>{error}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
