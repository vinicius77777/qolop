// src/pages/perfil.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getMe, logout, updateUsuario, type Usuario } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/perfil.css";

const Perfil: React.FC = () => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [msg, setMsg] = useState("");
  const [tipoMsg, setTipoMsg] = useState<"success" | "error" | "info">("info");
  const [salvando, setSalvando] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setUsuario(data);
        setNome(data.nome);
        setEmail(data.email);
      } catch {
        setTipoMsg("error");
        setMsg("Erro ao carregar perfil.");
      }
    })();
  }, []);

  const iniciais = useMemo(() => {
    if (!usuario?.nome) return "US";
    return usuario.nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("");
  }, [usuario]);

  const perfilMudou = useMemo(() => {
    if (!usuario) return false;

    const nomeMudou = nome.trim() !== usuario.nome;
    const emailMudou = email.trim() !== usuario.email;
    const senhaMudou = Boolean(novaSenha.trim());

    return nomeMudou || emailMudou || senhaMudou;
  }, [usuario, nome, email, novaSenha]);

  const forcaSenha = useMemo(() => {
    const senha = novaSenha.trim();
    if (!senha) return { label: "Não definida", nivel: 0 };

    let pontos = 0;
    if (senha.length >= 8) pontos += 1;
    if (/[A-Z]/.test(senha)) pontos += 1;
    if (/[0-9]/.test(senha)) pontos += 1;
    if (/[^A-Za-z0-9]/.test(senha)) pontos += 1;

    if (pontos <= 1) return { label: "Fraca", nivel: 1 };
    if (pontos <= 3) return { label: "Média", nivel: 2 };
    return { label: "Forte", nivel: 3 };
  }, [novaSenha]);

  const senhaValida = !novaSenha || novaSenha.trim().length >= 8;
  const confirmacaoValida = !novaSenha || novaSenha === confirmarSenha;
  const podeSalvar =
    Boolean(nome.trim()) &&
    Boolean(email.trim()) &&
    perfilMudou &&
    senhaValida &&
    confirmacaoValida &&
    !salvando;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (!usuario) return;

    if (!nome.trim() || !email.trim()) {
      setTipoMsg("error");
      setMsg("Preencha nome e e-mail corretamente.");
      return;
    }

    if (novaSenha && novaSenha.trim().length < 8) {
      setTipoMsg("error");
      setMsg("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
      setTipoMsg("error");
      setMsg("A confirmação da nova senha não confere.");
      return;
    }

    setSalvando(true);

    try {
      await updateUsuario(usuario.id, {
        nome: nome.trim(),
        email: email.trim(),
        senha: novaSenha || undefined,
      });

      const atualizado = await getMe();
      setUsuario(atualizado);
      setNome(atualizado.nome);
      setEmail(atualizado.email);

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setTipoMsg("success");
      setMsg("Perfil atualizado com sucesso ✅");
    } catch (err: any) {
      setTipoMsg("error");
      setMsg(err?.message || "Erro ao atualizar perfil.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDescartar = () => {
    if (!usuario) return;

    setNome(usuario.nome);
    setEmail(usuario.email);
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setTipoMsg("info");
    setMsg("Alterações descartadas.");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!usuario) {
    return <p className="perfil-loading">Carregando perfil...</p>;
  }

  return (
    <div className="perfil-page">
      <div className="perfil-wrapper">
        <section className="perfil-hero">
          <div className="perfil-avatar">{iniciais}</div>

          <div className="perfil-hero-content">
            <span className="perfil-badge">Conta ativa</span>
            <h1 className="perfil-title">Meu Perfil</h1>
            <p className="perfil-subtitle">
              Gerencie seus dados, atualize suas credenciais e mantenha sua conta segura.
            </p>
          </div>

          <div className="perfil-hero-actions">
            <button type="button" className="perfil-secondary-btn" onClick={() => navigate(-1)}>
              Voltar
            </button>
            <button type="button" className="perfil-ghost-btn" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </section>

        {msg && <p className={`perfil-message perfil-message--${tipoMsg}`}>{msg}</p>}

        <section className="perfil-grid">
          <aside className="perfil-card perfil-summary">
            <h2>Resumo da conta</h2>

            <div className="perfil-summary-list">
              <div className="perfil-summary-item">
                <span>Nome</span>
                <strong>{usuario.nome}</strong>
              </div>

              <div className="perfil-summary-item">
                <span>E-mail</span>
                <strong>{usuario.email}</strong>
              </div>

              <div className="perfil-summary-item">
                <span>Perfil</span>
                <strong>{usuario.role || "user"}</strong>
              </div>

              <div className="perfil-summary-item">
                <span>Empresa</span>
                <strong>{usuario.empresa?.nome || "Não vinculada"}</strong>
              </div>
            </div>

            <div className="perfil-tip-box">
              <h3>Dica de segurança</h3>
              <p>
                Use uma senha com letras maiúsculas, números e símbolos para deixar sua conta mais
                protegida.
              </p>
            </div>
          </aside>

          <section className="perfil-card">
            <div className="perfil-section-header">
              <div>
                <h2>Editar informações</h2>
                <p>As alterações são salvas imediatamente após a confirmação.</p>
              </div>
              {perfilMudou && <span className="perfil-chip">Alterações pendentes</span>}
            </div>

            <form className="perfil-form" onSubmit={handleSalvar}>
              <div className="perfil-field">
                <label htmlFor="nome">Nome</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div className="perfil-field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="perfil-security-box">
                <div className="perfil-section-header">
                  <div>
                    <h3>Segurança</h3>
                    <p>Atualize sua senha quando necessário.</p>
                  </div>
                </div>

                <div className="perfil-field">
                  <label htmlFor="senhaAtual">Senha atual</label>
                  <div className="perfil-password-group">
                    <input
                      id="senhaAtual"
                      type={mostrarSenhaAtual ? "text" : "password"}
                      placeholder="Digite sua senha atual"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                    />
                    <button
                      type="button"
                      className="perfil-toggle-password"
                      onClick={() => setMostrarSenhaAtual((prev) => !prev)}
                    >
                      {mostrarSenhaAtual ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className="perfil-field">
                  <label htmlFor="novaSenha">Nova senha</label>
                  <div className="perfil-password-group">
                    <input
                      id="novaSenha"
                      type={mostrarNovaSenha ? "text" : "password"}
                      placeholder="Mínimo de 8 caracteres"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                    />
                    <button
                      type="button"
                      className="perfil-toggle-password"
                      onClick={() => setMostrarNovaSenha((prev) => !prev)}
                    >
                      {mostrarNovaSenha ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <div className="perfil-password-meta">
                    <div className={`perfil-strength perfil-strength--${forcaSenha.nivel}`}>
                      <span>Força da senha:</span>
                      <strong>{forcaSenha.label}</strong>
                    </div>
                    {novaSenha && !senhaValida && (
                      <small className="perfil-field-error">
                        A senha precisa ter pelo menos 8 caracteres.
                      </small>
                    )}
                  </div>
                </div>

                <div className="perfil-field">
                  <label htmlFor="confirmarSenha">Confirmar nova senha</label>
                  <div className="perfil-password-group">
                    <input
                      id="confirmarSenha"
                      type={mostrarConfirmacao ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                    />
                    <button
                      type="button"
                      className="perfil-toggle-password"
                      onClick={() => setMostrarConfirmacao((prev) => !prev)}
                    >
                      {mostrarConfirmacao ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  {novaSenha && !confirmacaoValida && (
                    <small className="perfil-field-error">As senhas não coincidem.</small>
                  )}
                </div>
              </div>

              <div className="perfil-actions">
                <button
                  type="button"
                  className="perfil-secondary-btn"
                  onClick={handleDescartar}
                  disabled={!perfilMudou || salvando}
                >
                  Descartar
                </button>

                <button type="submit" className="perfil-primary-btn" disabled={!podeSalvar}>
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </section>
        </section>
      </div>
    </div>
  );
};

export default Perfil;
