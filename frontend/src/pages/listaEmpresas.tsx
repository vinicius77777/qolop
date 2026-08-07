import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEmpresas } from "../services/ambienteService";
import type { EmpresaComAmbiente } from "../services/types";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "../styles/listaEmpresas.css";

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
    return <div className="empresas-loading">Carregando empresas...</div>;
  }

  if (error) {
    return (
      <div className="empresas-page">
        <div className="empresas-wrapper">
          <div className="empresas-loading">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="empresas-page">
      <div className="empresas-wrapper">
        <header className="empresas-header">
          <h1 className="empresas-title">Empresas Parceiras</h1>
          <p className="empresas-description">
            Conheça as empresas que já possuem ambientes cadastrados na plataforma.
          </p>
        </header>

        {empresas.length === 0 ? (
          <div className="empresas-empty">
            <p>Nenhuma empresa com ambiente cadastrado no momento.</p>
          </div>
        ) : (
          <div className="empresas-grid">
            {empresas.map((empresa) => (
              <Link
                key={empresa.id}
                to={`/empresa/${empresa.slug}`}
                className="empresas-card"
              >
                <div className="empresas-card-media">
                  {empresa.logo ? (
                    <img
                      src={resolveMediaUrl(empresa.logo) ?? undefined}
                      alt={empresa.nome}
                      className="empresas-card-logo"
                    />
                  ) : (
                    <div className="empresas-card-placeholder">
                      <span>{empresa.nome.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                <div className="empresas-card-body">
                  <h3 className="empresas-card-title">{empresa.nome}</h3>

                  {empresa.descricao && (
                    <p className="empresas-card-desc">
                      {empresa.descricao.length > 120
                        ? `${empresa.descricao.slice(0, 120)}...`
                        : empresa.descricao}
                    </p>
                  )}

                  <div className="empresas-card-meta">
                    <span className="empresas-meta-item">
                      {empresa.totalAmbientes}{" "}
                      {empresa.totalAmbientes === 1 ? "ambiente" : "ambientes"}
                    </span>

                    {empresa.whatsapp && (
                      <span className="empresas-meta-item empresas-meta-item--contact">
                        WhatsApp
                      </span>
                    )}

                    {empresa.email && (
                      <span className="empresas-meta-item empresas-meta-item--contact">
                        Email
                      </span>
                    )}
                  </div>
                </div>

                <div className="empresas-card-cta">
                  <span>Ver perfil da empresa →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
