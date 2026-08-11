import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowUpRight, FiEye, FiPhone } from "react-icons/fi";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { API_URL } from "../utils/apiConfig";
import "../styles/empresa.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

interface Tour {
  id: number;
  titulo: string;
  imagemPreview: string | null;
}

interface Empresa {
  id: number;
  nome: string;
  descricao: string;
  telefone: string | null;
  whatsapp: string | null;
  visualizacoes: number;
  ambientes: Tour[];
}

interface EmpresaApiResponse {
  id: number;
  nome?: string;
  descricao?: string;
  telefone?: string | null;
  whatsapp?: string | null;
  visualizacoes?: number;
  ambientes?: Tour[];
  error?: string;
}

function normalizeEmpresa(data: EmpresaApiResponse): Empresa | null {
  if (!data || typeof data !== "object" || !data.nome) {
    return null;
  }

  return {
    id: data.id,
    nome: data.nome,
    descricao: data.descricao ?? "",
    telefone: data.telefone ?? null,
    whatsapp: data.whatsapp ?? null,
    visualizacoes: data.visualizacoes ?? 0,
    ambientes: Array.isArray(data.ambientes) ? data.ambientes : [],
  };
}

export default function Empresa() {
  const { slug } = useParams();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function carregarEmpresa() {
      try {
        setIsLoading(true);
        setError("");

        const res = await fetch(`${API_URL}/empresa/${slug}`);
        const data = (await res.json()) as EmpresaApiResponse;

        if (!res.ok) {
          throw new Error(data.error || "Não foi possível carregar a empresa");
        }

        const nextEmpresa = normalizeEmpresa(data);

        if (!nextEmpresa) {
          throw new Error("Resposta inválida da empresa");
        }

        if (isMounted) {
          setEmpresa(nextEmpresa);
        }
      } catch (err) {
        if (isMounted) {
          setEmpresa(null);
          setError(err instanceof Error ? err.message : "Erro ao carregar empresa");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    carregarEmpresa();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="tj-org-page tj-org-loading">
        <motion.div
          className="tj-org-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          ORGANIZAÇÃO
        </motion.div>
      </div>
    );
  }

  if (error || !empresa) {
    return (
      <div className="tj-org-page">
        <main className="tj-org-content">
          <div className="tj-org-empty">
            <span className="tj-org-eyebrow">Indisponível</span>
            <h2>Organização indisponível</h2>
            <p>{error || "Empresa não encontrada."}</p>
            <Link className="tj-org-link" to="/empresas">
              ← Voltar para organizações
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="tj-org-page">
      <div className="tj-org-bg" aria-hidden="true">
        <span className="tj-org-orb tj-org-orb--one" />
        <span className="tj-org-orb tj-org-orb--two" />
        <span className="tj-org-orb tj-org-orb--three" />
      </div>

      <main className="tj-org-content">
        {/* ============ HERO MINIMALISTA ============ */}
        <header className="tj-org-hero">
          <motion.div
            className="tj-org-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: TJ_EASE, delay: 0.05 }}
          >
            <span>Organização</span>
            <span className="tj-org-dot" />
            <span>perfil público</span>
          </motion.div>

          <motion.h1
            className="tj-org-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            {empresa.nome}
          </motion.h1>

          <motion.p
            className="tj-org-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            {empresa.descricao || "Empresa parceira com ambientes disponíveis."}
          </motion.p>

          <motion.div
            className="tj-org-hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            {empresa.whatsapp && (
              <a
                className="tj-org-count"
                href={`https://wa.me/${empresa.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <FiPhone /> WhatsApp
              </a>
            )}
            {empresa.telefone && (
              <span className="tj-org-count">{empresa.telefone}</span>
            )}
            <span className="tj-org-count">
              <FiEye /> {empresa.visualizacoes}{" "}
              {empresa.visualizacoes === 1 ? "visualização" : "visualizações"}
            </span>
          </motion.div>
        </header>

        {/* ============ TOURS ============ */}
        <section className="tj-org-block">
          <div className="tj-org-block-head">
            <div>
              <span className="tj-org-eyebrow">Tours públicos</span>
              <h2>Ambientes desta organização.</h2>
            </div>
            <span className="tj-org-count">
              {empresa.ambientes.length === 1
                ? "1 ambiente"
                : `${empresa.ambientes.length} ambientes`}
            </span>
          </div>

          {empresa.ambientes.length === 0 ? (
            <p className="tj-org-empty-text">
              Nenhum tour público disponível para esta organização.
            </p>
          ) : (
            <div className="tj-org-tour-list">
              {empresa.ambientes.map((tour, index) => {
                const imageUrl = resolveMediaUrl(tour.imagemPreview);

                return (
                  <motion.a
                    key={tour.id}
                    className="tj-org-tour"
                    href={`/tour/${tour.id}`}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: TJ_EASE, delay: (index % 8) * 0.05 }}
                  >
                    {imageUrl ? (
                      <span className="tj-org-tour-media">
                        <img src={imageUrl} alt="" className="tj-org-tour-img" />
                      </span>
                    ) : (
                      <span className="tj-org-tour-media tj-org-tour-media--empty">
                        Sem preview
                      </span>
                    )}

                    <span className="tj-org-tour-main">
                      <strong>{tour.titulo}</strong>
                      <span>Tour #{tour.id}</span>
                    </span>

                    <span className="tj-org-tour-arrow">
                      <FiArrowUpRight />
                    </span>
                  </motion.a>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
