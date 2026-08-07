import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Ambiente, getAmbiente, registrarVisualizacaoAmbiente } from "../services/api";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { API_URL } from "../utils/apiConfig";
import "../styles/tour.css";

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

export default function Tour() {
  const { id } = useParams();
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null);
  const entryTimeRef = useRef<number>(0);
  const viewIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const ambienteId = Number(id);
    entryTimeRef.current = Date.now();

    getAmbiente(ambienteId).then(setAmbiente);
    registrarVisualizacaoAmbiente(ambienteId).then((res) => {
      viewIdRef.current = res.viewId;
    }).catch((err) => {
      console.error("Erro ao registrar visualização do ambiente:", err);
    });

    // Enviar duração ao sair da página
    const enviarDuracao = () => {
      const durationSec = Math.round((Date.now() - entryTimeRef.current) / 1000);

      if (viewIdRef.current && durationSec > 0) {
        // Usar sendBeacon para garantir envio mesmo com a página fechando
        const payload = JSON.stringify({ duration: durationSec });
        navigator.sendBeacon(
          `${API_URL}/ambientes/view/${viewIdRef.current}/duration`,
          new Blob([payload], { type: "application/json" })
        );
      }
    };

    window.addEventListener("beforeunload", enviarDuracao);
    window.addEventListener("pagehide", enviarDuracao);

    return () => {
      enviarDuracao();
      window.removeEventListener("beforeunload", enviarDuracao);
      window.removeEventListener("pagehide", enviarDuracao);
    };
  }, [id]);

  const contato = useMemo(() => {
    if (!ambiente) return null;

    const telefoneCliente = ambiente.pedido?.telefone || "";
    const emailCliente = ambiente.pedido?.email || ambiente.usuario?.email || "";
    const whatsappEmpresa =
      ambiente.empresa?.whatsapp || ambiente.empresaPedido?.whatsapp || ambiente.empresa?.telefone || "";

    return {
      telefoneCliente,
      telefoneClienteNormalizado: normalizePhone(telefoneCliente),
      emailCliente,
      whatsappEmpresa,
      whatsappEmpresaNormalizado: normalizePhone(whatsappEmpresa),
      siteUrl: ambiente.siteUrl || "",
    };
  }, [ambiente]);

  if (!ambiente) {
    return <div className="tour-loading">Carregando tour...</div>;
  }

  const abrirWhatsapp = (numero: string, label: string) => {
    const numeroNormalizado = normalizePhone(numero);

    if (!numeroNormalizado) return;

    const msg = encodeURIComponent(`Olá! Vi o tour "${ambiente.titulo}" no Qolop e queria falar com ${label}.`);
    window.open(`https://wa.me/${numeroNormalizado}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const abrirEmail = (email: string) => {
    if (!email) return;

    const assunto = encodeURIComponent(`Contato sobre o tour "${ambiente.titulo}"`);
    const corpo = encodeURIComponent(`Olá! Vi o tour "${ambiente.titulo}" no Qolop e gostaria de falar com você.`);
    window.location.href = `mailto:${email}?subject=${assunto}&body=${corpo}`;
  };

  const abrirSite = (url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const possuiAcoesContato = Boolean(
    contato?.telefoneClienteNormalizado ||
      contato?.emailCliente ||
      contato?.whatsappEmpresaNormalizado ||
      contato?.siteUrl
  );

  return (
    <div className="tour-page">
      <div className="tour-wrapper">
        <section className="tour-card">
          <h1 className="tour-title">{ambiente.titulo}</h1>
          <p className="tour-description">{ambiente.descricao}</p>
        </section>

        {ambiente.imagemPreview && (
          <section className="tour-card">
            <img
              className="tour-image"
              src={resolveMediaUrl(ambiente.imagemPreview) ?? undefined}
              alt={ambiente.titulo}
            />
          </section>
        )}

        <section className="tour-card tour-frame-wrapper">
          <iframe
            className="tour-frame"
            src={ambiente.linkVR}
            allowFullScreen
            title={ambiente.titulo}
          />
        </section>

        {possuiAcoesContato && contato ? (
          <section className="tour-card">
            <div className="tour-actions tour-actions--stacked">
              {contato.telefoneClienteNormalizado ? (
                <button
                  className="tour-whatsapp-btn"
                  onClick={() => abrirWhatsapp(contato.telefoneCliente, "o cliente")}
                >
                  Entrar em contato com o cliente
                </button>
              ) : null}

              {contato.emailCliente ? (
                <button className="tour-whatsapp-btn tour-whatsapp-btn--secondary" onClick={() => abrirEmail(contato.emailCliente)}>
                  Enviar e-mail para o cliente
                </button>
              ) : null}

              {contato.whatsappEmpresaNormalizado ? (
                <button
                  className="tour-whatsapp-btn tour-whatsapp-btn--secondary"
                  onClick={() => abrirWhatsapp(contato.whatsappEmpresa, "a empresa")}
                >
                  Falar com a empresa
                </button>
              ) : null}

              {contato.siteUrl ? (
                <button className="tour-whatsapp-btn tour-whatsapp-btn--ghost" onClick={() => abrirSite(contato.siteUrl)}>
                  Ir para o site
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
