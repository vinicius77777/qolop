import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createEmpresa } from "../services/authService";
import "../styles/divulgarEspaco.css";

interface DivulgarEspacoState {
  nome?: string;
  email?: string;
}

export default function DivulgarEspaco() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession, user } = useAuth();

  const state = useMemo(() => (location.state || {}) as DivulgarEspacoState, [location.state]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(state.email || user?.email || "");
  const [telefone, setTelefone] = useState("");
  const [descricao, setDescricao] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogo(file);

    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }

    if (!file) {
      setLogoPreview(null);
      return;
    }

    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nomeNormalizado = nome.trim();

    if (!nomeNormalizado) {
      setError("O nome da empresa é obrigatório.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createEmpresa({
        nome: nomeNormalizado,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        descricao: descricao.trim() || null,
        logo,
        publico: true,
      });

      await refreshSession();
      navigate("/inicio", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar sua empresa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="divulgar-page">
      <div className="divulgar-noise" />
      <div className="divulgar-ambient divulgar-ambient--one" />
      <div className="divulgar-ambient divulgar-ambient--two" />

      <button type="button" className="divulgar-back-button" onClick={() => navigate("/inicio")}>
        ← Voltar
      </button>

      <main className="divulgar-shell">
        <motion.section
          className="divulgar-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
        >
          <span className="divulgar-eyebrow">Divulgação de espaço</span>
          <h1>Cadastre sua empresa para divulgar um ambiente.</h1>
          <p className="divulgar-lead">
            O nome da empresa é obrigatório. Os demais campos são opcionais: e-mail, telefone, descrição e logo.
          </p>

          {state.nome ? (
            <div className="divulgar-note">
              Você está entrando com a conta de <strong>{state.nome}</strong>.
            </div>
          ) : null}

          {error ? <p className="divulgar-error">{error}</p> : null}

          <form className="divulgar-form" onSubmit={handleSubmit}>
            <div className="divulgar-field">
              <label htmlFor="empresa-nome">Nome da empresa *</label>
              <input
                id="empresa-nome"
                type="text"
                placeholder="Ex.: Qolop Studio"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                required
              />
            </div>

            <div className="divulgar-grid">
              <div className="divulgar-field">
              <label htmlFor="empresa-email">E-mail <span className="divulgar-optional">(opcional)</span></label>
                <input
                  id="empresa-email"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="divulgar-field">
              <label htmlFor="empresa-telefone">Telefone <span className="divulgar-optional">(opcional)</span></label>
                <input
                  id="empresa-telefone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(event) => setTelefone(event.target.value)}
                />
              </div>
            </div>

            <div className="divulgar-field">
              <label htmlFor="empresa-descricao">Descrição <span className="divulgar-optional">(opcional)</span></label>
              <textarea
                id="empresa-descricao"
                placeholder="Descreva sua empresa e o tipo de espaço que deseja divulgar."
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                rows={4}
              />
            </div>

            <div className="divulgar-field">
              <label htmlFor="empresa-logo">Logo <span className="divulgar-optional">(opcional)</span></label>
              <input
                id="empresa-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
              />
            </div>

            {logoPreview ? (
              <div className="divulgar-logo-preview">
                <span>Pré-visualização da logo</span>
                <img src={logoPreview} alt="Pré-visualização da logo da empresa" />
              </div>
            ) : null}

            <button type="submit" className="divulgar-submit" disabled={loading}>
              {loading ? "Salvando..." : "Criar empresa e continuar"}
            </button>
          </form>
        </motion.section>
      </main>
    </div>
  );
}
