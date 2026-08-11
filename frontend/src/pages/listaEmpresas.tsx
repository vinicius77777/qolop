import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowUpRight, FiMail, FiPhone } from "react-icons/fi";
import { getEmpresas } from "../services/ambienteService";
import type { EmpresaComAmbiente } from "../services/types";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "../styles/listaEmpresas.css";

const TJ_EASE = [0.22, 1, 0.36, 1] as const;

export default function ListaEmpresas() {
  const [empresas, setEmpresas] = useState<EmpresaComAmbiente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function carregar() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getEmpresas();

        if (isMounted) {
          setEmpresas(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao carregar empresas");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    carregar();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="tj-org-page tj-org-loading">
        <motion.div
          className="tj-org-loading-mark"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          ORGANIZAÇÕES
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tj-org-page">
        <main className="tj-org-content">
          <div className="tj-org-empty">
            <span className="tj-org-eyebrow">Indisponível</span>
            <h2>Organizações indisponíveis</h2>
            <p>{error}</p>
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
            <span>Organizações</span>
            <span className="tj-org-dot" />
            <span>parceiras ativas</span>
          </motion.div>

          <motion.h1
            className="tj-org-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: TJ_EASE, delay: 0.1 }}
          >
            Empresas com
            <br />
            ambientes no ar.
          </motion.h1>

          <motion.p
            className="tj-org-lead"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: TJ_EASE, delay: 0.18 }}
          >
            Conheça as empresas que já possuem ambientes cadastrados na plataforma.
            Clique em uma linha para abrir o perfil público.
          </motion.p>

          <motion.div
            className="tj-org-hero-actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: TJ_EASE, delay: 0.26 }}
          >
            <span className="tj-org-count">
              {empresas.length === 1 ? "1 organização" : `${empresas.length} organizações`}
            </span>
          </motion.div>
        </header>

        {/* ============ LISTA TIPOGRÁFICA ============ */}
        {empresas.length === 0 ? (
          <section className="tj-org-empty">
            <span className="tj-org-eyebrow">Sem organizações</span>
            <h2>Nenhuma empresa cadastrada ainda.</h2>
            <p>Quando uma empresa publicar um ambiente, ela aparecerá nesta lista.</p>
          </section>
        ) : (
          <section className="tj-org-list">
            {empresas.map((empresa, index) => (
              <motion.div
                key={empresa.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: TJ_EASE, delay: (index % 8) * 0.05 }}
              >
                <Link to={`/empresa/${empresa.slug}`} className="tj-org-row">
                  <span className="tj-org-row-index">{String(index + 1).padStart(2, "0")}</span>

                  <span className="tj-org-row-media">
                    {empresa.logo ? (
                      <img
                        src={resolveMediaUrl(empresa.logo) ?? undefined}
                        alt=""
                        className="tj-org-row-logo"
                      />
                    ) : (
                      <span className="tj-org-row-placeholder">
                        {empresa.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <span className="tj-org-row-main">
                    <strong>{empresa.nome}</strong>
                    {empresa.descricao ? (
                      <span className="tj-org-row-desc">
                        {empresa.descricao.length > 140
                          ? `${empresa.descricao.slice(0, 140)}…`
                          : empresa.descricao}
                      </span>
                    ) : (
                      <span className="tj-org-row-desc">
                        Empresa parceira com ambientes disponíveis.
                      </span>
                    )}
                  </span>

                  <span className="tj-org-row-meta">
                    <span className="tj-org-chip">
                      {empresa.totalAmbientes}{" "}
                      {empresa.totalAmbientes === 1 ? "ambiente" : "ambientes"}
                    </span>
                    {empresa.whatsapp && (
                      <span className="tj-org-chip tj-org-chip--contact" title="WhatsApp disponível">
                        <FiPhone /> WhatsApp
                      </span>
                    )}
                    {empresa.email && (
                      <span className="tj-org-chip tj-org-chip--contact" title="Email disponível">
                        <FiMail /> Email
                      </span>
                    )}
                  </span>

                  <span className="tj-org-row-arrow">
                    <FiArrowUpRight />
                  </span>
                </Link>
              </motion.div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
