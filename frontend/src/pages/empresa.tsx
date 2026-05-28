import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/empresa.css";

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

  if (isLoading) return <div className="empresa-loading">Carregando...</div>;

  if (error || !empresa) {
    return (
      <div className="empresa-page">
        <div className="empresa-wrapper">
          <div className="empresa-loading">{error || "Empresa não encontrada"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="empresa-page">
      <div className="empresa-wrapper">
        <header className="empresa-header">
          <h1 className="empresa-title">{empresa.nome}</h1>
          <p className="empresa-description">{empresa.descricao}</p>
        </header>

        <div className="empresa-meta">
          {empresa.telefone && (
            <div className="empresa-meta-item">Telefone: {empresa.telefone}</div>
          )}
          {empresa.whatsapp && (
            <div className="empresa-meta-item">WhatsApp: {empresa.whatsapp}</div>
          )}
          <div className="empresa-meta-item">Visualizações: {empresa.visualizacoes}</div>
        </div>

        <section>
          <h2 className="empresa-section-title">Tours Públicos</h2>

          <div className="empresa-grid">
            {empresa.ambientes.length > 0 ? (
              empresa.ambientes.map((tour) => (
                <div key={tour.id} className="empresa-card">
                  <h3>{tour.titulo}</h3>
                  {tour.imagemPreview && <img src={`${API_URL}${tour.imagemPreview}`} alt={tour.titulo} />}
                  <a
                    className="empresa-card-link"
                    href={`/tour/${tour.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver tour VR
                  </a>
                </div>
              ))
            ) : (
              <div className="empresa-loading">Nenhum tour público disponível.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
