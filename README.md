# Qolop

Projeto full stack com:

- `backend/`: API Node.js + Express + Prisma
- `frontend/`: React + Vite + TypeScript

## Requisitos

- Node.js 18+
- npm
- MySQL 8+

## Estrutura do projeto

```text
qolop/
├── backend/
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
└── package.json
```

## Scripts na raiz

A raiz agora funciona como ponto de entrada do workspace.

```bash
npm run dev:backend
npm run dev:frontend
npm run build:backend
npm run build:frontend
npm run test:backend
npm run prisma -- migrate dev
```

## Configuração do banco

Crie um banco MySQL:

```sql
CREATE DATABASE qolop;
```

Depois configure `backend/.env`:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/qolop"
JWT_SECRET="sua_chave_secreta_super_segura"
```

## Instalação

Instale dependências do backend e frontend separadamente:

```bash
cd backend
npm install
cd ../frontend
npm install
```

## Rodando em desenvolvimento

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

Backend:

- `http://localhost:3000`

Frontend:

- `http://localhost:5173`

## Prisma

Exemplo para criar/aplicar migrations:

```bash
npm run prisma -- migrate dev --name init_schema
```

## Fluxo básico

### Criar usuário

`POST /usuarios`

```json
{
  "nome": "João",
  "email": "joao@email.com",
  "senha": "123456",
  "role": "user"
}
```

### Criar admin

`POST /usuarios`

```json
{
  "nome": "Admin",
  "email": "admin@email.com",
  "senha": "123456",
  "role": "admin"
}
```

### Login

`POST /login`

```json
{
  "email": "admin@email.com",
  "senha": "123456"
}
```

A resposta retorna um token para uso em `Authorization: Bearer <token>`.

## Rotas principais

### Pedidos

- `POST /pedidos`
- `GET /pedidos`
- `PUT /pedidos/:id`
- `DELETE /pedidos/:id`

### Ambientes

- `POST /ambientes`
- `GET /ambientes`
- `PUT /ambientes/:id`
- `DELETE /ambientes/:id`

## Observações

- O backend e o frontend têm dependências próprias.
- A raiz serve para organizar o workspace e expor scripts de conveniência.
- Para produção, valide variáveis de ambiente, acesso ao banco e URLs da API.

## Autor

Vinícius Fernandes  
GitHub: https://github.com/vinicius77777
