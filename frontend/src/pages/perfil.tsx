import React, { useEffect, useState } from "react";
import { getMe, updateUsuario } from "../services/api";

const Perfil: React.FC = () => {
  const [usuario, setUsuario] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [foto, setFoto] = useState("");
  const [msg, setMsg] = useState("");

  // carregar perfil atual
  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setUsuario(data);
        setNome(data.nome);
        setEmail(data.email);
        setFoto(data.foto || "");
      } catch (err: any) {
        setMsg("Erro ao carregar perfil: " + err.message);
      }
    })();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUsuario(usuario.id, {
        nome,
        email,
        senha: senha || undefined, // só manda senha se o campo tiver preenchido
        foto,
      });
      setMsg("Perfil atualizado com sucesso ✅");
      setSenha(""); // limpa o campo senha
      // recarregar dados atualizados
      const atualizado = await getMe();
      setUsuario(atualizado);
    } catch (err: any) {
      setMsg("Erro ao atualizar perfil: " + err.message);
    }
  };

  if (!usuario) return <p>Carregando perfil...</p>;

  return (
    <div className="perfil">
      <h2>Meu Perfil</h2>
      {msg && <p>{msg}</p>}
      <form onSubmit={handleSalvar}>
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Nova senha (opcional)"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <input
          type="text"
          placeholder="Foto (URL)"
          value={foto}
          onChange={(e) => setFoto(e.target.value)}
        />
        <button type="submit">Salvar Alterações</button>
      </form>
      {usuario.foto && (
        <div>
          <h3>Pré-visualização:</h3>
          <img src={usuario.foto} alt="Foto de perfil" width={120} />
        </div>
      )}
    </div>
  );
};

export default Perfil;
