# Deploy na Vercel

Este projeto está preparado para subir na Vercel em **dois projetos separados**:

- `frontend/` → projeto Vercel do site
- `backend/` → projeto Vercel da API

## 1. Frontend

Crie um projeto na Vercel apontando para a pasta `frontend`.

### Configuração esperada

- Framework: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### Variáveis de ambiente

No projeto do frontend, configure:

- `VITE_API_URL=https://SEU-BACKEND.vercel.app`

Exemplo:

- `VITE_API_URL=https://qolop-backend.vercel.app`

---

## 2. Backend

Crie outro projeto na Vercel apontando para a pasta `backend`.

### Configuração esperada

- Framework: `Other`
- Root Directory: `backend`

O backend foi adaptado para funcionar via `api/index.ts` na Vercel.

### Variáveis de ambiente mínimas

Configure no projeto do backend:

- `NODE_ENV=production`
- `JWT_SECRET=coloque_um_segredo_forte`
- `DATABASE_URL=...`
- `ALLOWED_ORIGINS=https://SEU-FRONTEND.vercel.app`

Se usar email:

- variáveis SMTP que já existem no seu `.env`

### Exemplo de `ALLOWED_ORIGINS`

```env
ALLOWED_ORIGINS=https://qolop-frontend.vercel.app
```

Se quiser permitir mais de uma origem:

```env
ALLOWED_ORIGINS=https://qolop-frontend.vercel.app,https://www.seudominio.com
```

---

## 3. Prisma no backend

Se o backend usa Prisma com banco remoto, o banco precisa estar online em produção.

Checklist:

- `DATABASE_URL` configurada corretamente na Vercel
- schema compatível com o banco
- migrations aplicadas

Se necessário, rode as migrations antes do uso em produção.

---

## 4. Importante sobre uploads

Hoje o backend expõe `/uploads`, mas a Vercel **não é ideal para armazenamento persistente de arquivos locais**.

Isso significa:

- imagens enviadas para disco local podem não persistir de forma confiável;
- para produção real, o ideal é usar storage externo, por exemplo:
  - Cloudinary
  - Supabase Storage
  - AWS S3

## 5. Ordem recomendada de publicação

1. subir o **backend**
2. copiar a URL pública do backend
3. configurar `VITE_API_URL` no frontend
4. subir o **frontend**
5. adicionar a URL do frontend em `ALLOWED_ORIGINS` no backend

---

## 6. Checklist final

### Frontend

- [ ] projeto criado na Vercel com root `frontend`
- [ ] `VITE_API_URL` apontando para o backend publicado
- [ ] rotas do React funcionando diretamente por URL

### Backend

- [ ] projeto criado na Vercel com root `backend`
- [ ] `DATABASE_URL` configurada
- [ ] `JWT_SECRET` configurada
- [ ] `ALLOWED_ORIGINS` configurada
- [ ] SMTP configurado, se necessário

### Produção

- [ ] login funcionando
- [ ] cadastro funcionando
- [ ] ambientes funcionando
- [ ] explorer funcionando
- [ ] tours funcionando
- [ ] CORS funcionando
- [ ] uploads validados ou migrados para storage externo

---

## 7. Observação importante

O sistema está **preparado para deploy na Vercel**, mas para ficar **100% robusto em produção**, o ponto mais sensível ainda é o armazenamento de uploads.
