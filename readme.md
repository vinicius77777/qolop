
# 📘 README - Projeto Qolop

## 📌 Requisitos

Antes de começar, instale no seu PC:

* [Node.js (>=18.x)](https://nodejs.org/en/)
* [npm (vem junto com Node.js)](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
* [MySQL (>=8.x)](https://dev.mysql.com/downloads/mysql/)
* [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) → será instalado junto com `npm install`

---

## ⚙️ 1. Configuração do Banco de Dados

1. Crie um banco no MySQL:

```sql
CREATE DATABASE qolop;
```

2. Configure a string de conexão no arquivo **`.env`** dentro da pasta `backend/`:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/qolop"
JWT_SECRET="sua_chave_secreta_super_segura"
```

> Substitua `usuario` e `senha` pelo usuário e senha do seu MySQL.

---

## ⚙️ 2. Backend (API)

1. Entre na pasta:

```bash
cd backend
```

2. Instale as dependências:

```bash
npm install
```

3. Gere o Prisma Client e rode as migrations:

```bash
npx prisma migrate dev --name init_schema
```

4. Rode o servidor:

```bash
npm run dev
```

✅ O backend estará rodando em:
👉 `http://localhost:3000`

---

## ⚙️ 3. Frontend (React)

1. Entre na pasta:

```bash
cd frontend
```

2. Instale as dependências:

```bash
npm install
```

3. Rode o projeto:

```bash
npm run dev
```

✅ O frontend estará rodando em:
👉 `http://localhost:5173` (ou a porta que o Vite mostrar)

---

## 🚀 Fluxo de Uso (via Postman ou Frontend)

### 1. Criar usuário **normal**

```json
POST http://localhost:3000/usuarios
{
  "nome": "João",
  "email": "joao@email.com",
  "senha": "123456",
  "role": "user"
}
```

### 2. Criar usuário **admin**

```json
POST http://localhost:3000/usuarios
{
  "nome": "Admin",
  "email": "admin@email.com",
  "senha": "123456",
  "role": "admin"
}
```

### 3. Fazer login

```json
POST http://localhost:3000/login
{
  "email": "admin@email.com",
  "senha": "123456"
}
```

🔑 Resposta vem com `token`. Use ele no **Authorization** (Bearer Token).

### 4. Rotas de Pedidos

* Criar pedido: `POST /pedidos`
* Listar pedidos: `GET /pedidos` (auth)
* Atualizar pedido (admin): `PUT /pedidos/:id`
* Deletar pedido (admin): `DELETE /pedidos/:id`

### 5. Rotas de Ambientes

* Criar ambiente (admin): `POST /ambientes`
* Listar ambientes: `GET /ambientes`
* Atualizar ambiente (admin): `PUT /ambientes/:id`
* Deletar ambiente (admin): `DELETE /ambientes/:id`

---

## 📂 Estrutura de Pastas

```
qolop/
│── backend/          # API Node.js + Express + Prisma
│   ├── src/server.ts
│   ├── prisma/schema.prisma
│   ├── package.json
│   └── .env
│
│── frontend/         # React + Vite + TS
│   ├── src/pages/
│   ├── src/services/api.ts
│   ├── src/App.tsx
│   └── package.json
```

---

## ✅ Check-list para rodar em outro PC

1. Instalar Node.js e MySQL
2. Clonar o projeto
3. Configurar `.env` no backend
4. Rodar `npm install` no backend e frontend
5. Rodar `npx prisma migrate dev` no backend
6. Iniciar backend (`npm run dev`)
7. Iniciar frontend (`npm run dev`)

