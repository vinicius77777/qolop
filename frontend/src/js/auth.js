// auth.js
const API_URL = "http://localhost:3000"; // backend Node

// Salvar/pegar token
function salvarToken(token) {
  localStorage.setItem("token", token);
}
function pegarToken() {
  return localStorage.getItem("token");
}
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const senha = loginForm.senha.value;

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();
      if (res.ok) {
        salvarToken(data.token);
        alert("Login bem-sucedido!");
        window.location.href = "dashboard.html";
      } else {
        alert(data.error || "Erro no login");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com servidor");
    }
  });
}

// Cadastro
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = registerForm.nome.value;
    const email = registerForm.email.value;
    const senha = registerForm.senha.value;

    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Cadastro realizado! Faça login.");
        window.location.href = "index.html";
      } else {
        alert(data.error || "Erro no cadastro");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com servidor");
    }
  });
}
