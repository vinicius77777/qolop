// src/pages/empresa.tsx
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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Empresa() {
  const { slug } = useParams();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/empresa/${slug}`)
      .then((res) => res.json())
      .then(setEmpresa);
  }, [slug]);

  if (!empresa) return <div className="empresa-loading">Carregando...</div>;

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
          <div className="empresa-meta-item">
            Visualizações: {empresa.visualizacoes}
          </div>
        </div>

        <section>
          <h2 className="empresa-section-title">Tours Públicos</h2>

          <div className="empresa-grid">
            {empresa.ambientes.map((tour) => (
              <div key={tour.id} className="empresa-card">
                <h3>{tour.titulo}</h3>
                {tour.imagemPreview && (
                  <img
                    src={`${API_URL}${tour.imagemPreview}`}
                    alt={tour.titulo}
                  />
                )}
                <a
                  className="empresa-card-link"
                  href={`/tour/${tour.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver tour VR
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
