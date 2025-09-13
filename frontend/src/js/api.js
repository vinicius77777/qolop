// api.js
const API_URL = "http://localhost:3000";

function pegarToken() {
  return localStorage.getItem("token");
}

// ==================== Perfil ====================
async function carregarPerfil() {
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${pegarToken()}` },
  });
  return res.json();
}

const perfilForm = document.getElementById("perfilForm");
if (perfilForm) {
  carregarPerfil().then((usuario) => {
    perfilForm.nome.value = usuario.nome;
    perfilForm.email.value = usuario.email;
  });

  perfilForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = perfilForm.nome.value;
    const email = perfilForm.email.value;

    const res = await fetch(`${API_URL}/usuarios/${usuario.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pegarToken()}`,
      },
      body: JSON.stringify({ nome, email }),
    });

    const data = await res.json();
    alert(res.ok ? "Perfil atualizado!" : data.error);
  });
}

// ==================== Ambientes ====================
async function carregarAmbientes() {
  const res = await fetch(`${API_URL}/ambientes`);
  const ambientes = await res.json();

  const lista = document.getElementById("listaAmbientes");
  if (lista) {
    lista.innerHTML = "";
    ambientes.forEach((a) => {
      const div = document.createElement("div");
      div.classList.add("ambiente-card");
      div.innerHTML = `
        <h3>${a.titulo}</h3>
        <p>${a.descricao}</p>
        <a href="${a.linkVR}" target="_blank">Ver em 3D</a>
      `;
      lista.appendChild(div);
    });
  }
}
if (document.getElementById("listaAmbientes")) carregarAmbientes();

// ==================== Pedidos ====================
const pedidoForm = document.getElementById("pedidoForm");
if (pedidoForm) {
  pedidoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const empresa = pedidoForm.empresa.value;
    const email = pedidoForm.email.value;
    const telefone = pedidoForm.telefone.value;
    const mensagem = pedidoForm.mensagem.value;

    const res = await fetch(`${API_URL}/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa, email, telefone, mensagem }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Pedido enviado!");
      carregarPedidos();
    } else {
      alert(data.error || "Erro ao enviar pedido");
    }
  });
}

async function carregarPedidos() {
  const res = await fetch(`${API_URL}/pedidos`, {
    headers: { Authorization: `Bearer ${pegarToken()}` },
  });
  const pedidos = await res.json();

  const lista = document.getElementById("listaPedidos");
  if (lista) {
    lista.innerHTML = "";
    pedidos.forEach((p) => {
      const div = document.createElement("div");
      div.classList.add("pedido-card");
      div.innerHTML = `
        <h3>${p.empresa}</h3>
        <p><b>Email:</b> ${p.email}</p>
        <p><b>Status:</b> ${p.status}</p>
        <p>${p.mensagem}</p>
      `;
      lista.appendChild(div);
    });
  }
}
if (document.getElementById("listaPedidos")) carregarPedidos();
