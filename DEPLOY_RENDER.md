# Deploy no Render + Supabase

Este guia cobre o deploy do **backend** (API Express + Prisma + PostgreSQL) no Render, usando o **Supabase** como banco de dados e storage de imagens. O frontend continua hospedado na Vercel (ou pode subir no Render Static se preferir).

## 1. Arquitetura

| Componente     | Provedor              | Papel                  |
| -------------- | --------------------- | ---------------------- |
| API            | Render (Web Service)  | Express + Prisma       |
| Banco de dados | Supabase (PostgreSQL) | dados da aplicação     |
| Imagens/upload | Supabase Storage      | logos, fotos, previews |

> **Por que Supabase?** O backend foi migrado de MySQL para PostgreSQL. Isso permite usar o plano gratuito do Supabase (banco + storage) e elimina o problema de uploads efêmeros do disco do Render — as imagens passam a persistir no Storage.

## 2. Pré-requisitos

- Repositório no GitHub: `https://github.com/vinicius77777/qolop`
- Conta no [Supabase](https://supabase.com) e no [Render](https://render.com)

## 3. Preparar o Supabase

1. **Crie um projeto** em [Supabase Dashboard](https://supabase.com/dashboard) → New Project
   - Escolha uma **senha forte** para o banco (grave!)
   - Região: `South America (São Paulo)` se disponível
2. **Pegue as connection strings** (Project Settings → Database → Connection string → URI):
   - **Transaction pooler (porta 6543)** → uso na API (`DATABASE_URL`). O Prisma precisa de `pgbouncer=true` para desabilitar prepared statements — sem isso o Supabase devolve o erro `42P05 prepared statement already exists`:
     `postgresql://postgres.XXXX:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
   - **Direct connection (porta 5432)** → uso no Prisma CLI/Migrate (`DIRECT_URL`). No Prisma isso é configurado com `directUrl = env("DIRECT_URL")` no `schema.prisma`:
     `postgresql://postgres.XXXX:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
3. **Crie o bucket de storage**:
   - Storage → New bucket
   - Nome: `uploads`
   - **Public bucket**: ON (as imagens são servidas por URL pública)
4. **Pegue as credenciais de serviço (service_role)**:
   - Project Settings → API
   - Copie `Project URL` (ex.: `https://XXXXXXXX.supabase.co`) e a chave `service_role`

> ⚠️ A chave `service_role` ignora as políticas de segurança (RLS). Use-a **apenas** no backend, nunca no frontend.

## 4. Aplicar o schema no banco

O schema (Prisma) é o modelo fonte. Aplique o schema no banco do Supabase rodando **localmente na sua máquina**:

```bash
# na raiz do projeto
npm --prefix backend run prisma -- db push
```

Ou versione com migrations:

```bash
npm --prefix backend run prisma -- migrate dev --name init_supabase
```

> Se já existirem dados no MySQL atual, será necessário migrá-los (pgloader ou script). Se o app está em início de uso, começar do zero no Supabase costuma ser mais simples.

## 5. Deploy no Render

### 5.1 Via Blueprint (recomendado)

O repositório contém um `render.yaml` na raiz:

1. Render → **New > Blueprint**
2. Escolha o repositório `qolop`
3. O Render identifica o `render.yaml` e cria o serviço:
   - Root directory: `backend`
   - Build: `npm install --workspaces=false --include=dev && npm run build` (roda `prisma generate` + `tsc`)
   - Start: `npm start` (`node dist/server.js`)
   - Health check: `/health`
4. **Antes do primeiro deploy**, configure as variáveis de ambiente marcadas com `sync: false` (seção 6) e clique em Deploy.

### 5.2 Deploy manual (alternativa)

1. Render → **New > Web Service**
2. Connecte o repositório `qolop`
3. Configuração:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install --workspaces=false --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Instance Type:** Free ou Starter
4. Configure as variáveis de ambiente (seção 6)
5. **Deploy**

## 6. Variáveis de ambiente

| Variável                    | Obrigatória   | Descrição                                                                                   |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | sim           | `production`                                                                                |
| `DATABASE_URL`              | sim           | Connection string do Supabase (pooler, porta 6543) com `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL`                | sim           | Connection string direta do Supabase (porta 5432) — usada pelo Prisma CLI/Migrate           |
| `JWT_SECRET`                | sim           | Segredo forte para assinar tokens JWT                                                       |
| `ALLOWED_ORIGINS`           | sim           | URL(s) do frontend separadas por vírgula                                                    |
| `SUPABASE_URL`              | sim (uploads) | Project URL do Supabase                                                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | sim (uploads) | Chave service_role (apenas backend)                                                         |
| `SUPABASE_STORAGE_BUCKET`   | não           | Nome do bucket (padrão: `uploads`)                                                          |
| `EMAIL_USER`                | só p/ email   | Conta Gmail usada no nodemailer                                                             |
| `EMAIL_PASS`                | só p/ email   | Senha/app password do Gmail                                                                 |
| `ALLOWED_UPLOAD_MIME_TYPES` | não           | MIME types permitidos (padrão: `image/jpeg,image/png,image/webp`)                           |
| `MAX_UPLOAD_FILE_SIZE`      | não           | Tamanho máximo em bytes (padrão: `5242880`)                                                 |

Exemplo de `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=https://qolop-frontend.vercel.app
```

## 7. Ordem recomendada de publicação

1. Criar e configurar o **Supabase** (projeto, bucket, credenciais) — seção 3
2. Aplicar o schema no Supabase — seção 4
3. Subir o **backend** no Render — seção 5
4. Copiar a URL pública do backend, ex.: `https://qolop-backend.onrender.com`
5. Configurar `VITE_API_URL` no projeto do **frontend** (Vercel):
   `VITE_API_URL=https://qolop-backend.onrender.com`
6. Redeply do frontend
7. Adicionar a URL do frontend em `ALLOWED_ORIGINS` no backend e redeply

## 8. Verificando o deploy

- Health check: `GET https://qolop-backend.onrender.com/health` deve retornar `{"status":"ok", ...}`
- CORS: o frontend deve chamar a API sem erro de origem
- Login: `POST /auth/login` com credenciais válidas deve retornar token
- Upload: enviar uma imagem deve retornar uma URL do tipo
  `https://XXXXXXXX.supabase.co/storage/v1/object/public/uploads/...`

## 9. Comportamento dos uploads

O `upload.ts` agora funciona assim:

- **Supabase configurado** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) → envia o arquivo para o bucket e salva a URL pública no banco. Persiste entre deploys e restarts.
- **Supabase não configurado** (dev) → grava em disco local (`backend/uploads/`) e salva `/uploads/...`, como antes.

## 10. Observações técnicas

- `trust proxy` está habilitado no Express para o rate limit funcionar atrás do proxy do Render.
- O endpoint `/health` é usado pelo health check do Render.
- O backend continua compatível com a Vercel: com `VERCEL=1` usa o handler serverless (`api/index.ts`); caso contrário, sobe o Express na porta `PORT` (Render injeta `10000`).
- O `schema.prisma` usa `provider = "postgresql"`. Se precisar voltar a usar MySQL, troque o provider e o `DATABASE_URL` — o código da API não muda.
- A chave `service_role` do Supabase dá acesso total ao projeto: mantenha-a apenas nas variáveis de ambiente do backend, jamais no frontend.
