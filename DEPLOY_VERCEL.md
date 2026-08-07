# Deploy na Vercel — Frontend

> O **backend** está publicado no **Render**: `https://qolop.onrender.com`
> (healthcheck: `https://qolop.onrender.com/health` → `{"status":"ok"}`)

Este guia cobre apenas o **frontend** (a API já está no ar).

## Frontend

Crie um projeto na Vercel apontando para a pasta `frontend`.

### Configuração esperada

- Framework: `Vite`
- Root Directory: `frontend`
- Install Command: `npm install --workspaces=false --include=dev` (definido no `vercel.json`)
- Build Command: `npm run build`
- Output Directory: `dist`

> O `package.json` do frontend declara `"engines": { "node": ">=20.19.0" }`
> (o Vite 7 exige Node 20.19+ ou 22.12+). A Vercel respeita esse campo e
> usa a versão correta automaticamente.

### Por que `--workspaces=false` e `dedupe`

Este repositório é um monorepo npm (`workspaces` na raiz apontando para
`frontend` e `backend`). Quando a Vercel roda o install, o npm subia o React
para o `node_modules` da raiz e o Vite acabava empacotando **duas cópias de
React** — o app abria em branco com:

```
TypeError: Cannot read properties of null (reading 'useRef')
```

Isso já está corrigido com:

1. `frontend/vercel.json` → `installCommand: "npm install --workspaces=false --include=dev"`
   impede o hoisting do monorepo durante o install na Vercel.
2. `frontend/vite.config.ts` → `resolve.dedupe: ["react", "react-dom"]`
   garante uma única cópia de React/ReactDOM no bundle (rede de segurança).
3. `frontend/package-lock.json` → regenerado de forma **self-contained**
   (sem referência ao workspace `..` da raiz).

### Variáveis de ambiente

No projeto do **frontend**, configure:

```env
VITE_API_URL=https://qolop.onrender.com
```

Sem essa variável, o app tem fallback para `http://localhost:3000` (dev).

### Como a URL da API é usada

O valor de `VITE_API_URL` é lido de um único lugar:

- `frontend/src/utils/apiConfig.ts`

E é consumido por:

- `frontend/src/services/httpClient.ts` (todas as chamadas via `request`)
- `frontend/src/utils/mediaUrl.ts` (uploads locais `/uploads/...`)
- páginas que usam `fetch` direto: `tour`, `analytics`, `criarTour`, `empresa`, `ambientes`

### CORS no backend

O backend no Render usa `ALLOWED_ORIGINS`. Depois de publicar o frontend,
adicione a URL pública dele no **Render**:

```env
ALLOWED_ORIGINS=https://SEU-FRONTEND.vercel.app,https://www.seudominio.com
```

E faça o redeploy do serviço no Render.

## Observações sobre uploads

- O backend no Render **serve** os arquivos de `backend/uploads` pela rota `/uploads`.
- A Vercel **não persiste** arquivos locais — todo upload continua indo para o backend.
- Para produção 100% robusta, migre o armazenamento para Supabase Storage,
  Cloudinary ou S3 (o frontend já suporta URLs absolutas via `resolveMediaUrl`).

## Checklist final

- [ ] projeto criado na Vercel com root `frontend`
- [ ] `VITE_API_URL=https://qolop.onrender.com` configurada
- [ ] URL do frontend adicionada em `ALLOWED_ORIGINS` no Render
- [ ] login funcionando
- [ ] cadastro funcionando
- [ ] ambientes funcionando
- [ ] explorer funcionando
- [ ] tours funcionando
- [ ] uploads carregando (rota `/uploads` do Render)
