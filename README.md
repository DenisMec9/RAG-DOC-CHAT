# RAG Doc Chat

Aplicacao de aprendizado para fluxo completo de RAG: upload de documentos, indexacao em embeddings e chat com resposta fundamentada em contexto recuperado.

## Objetivo

Demonstrar um projeto de ponta a ponta com:
- ingestao de arquivos (`.pdf` e `.txt`)
- chunking + embeddings
- retrieval semantico com similaridade cosseno
- resposta de chat com citacao de fontes
- deploy serverless (Vercel) com persistencia no Supabase

## Arquitetura

- `frontend/`: interface SPA (upload, reindex, selecao/exclusao de arquivos, chat)
- `api/`: handlers serverless da Vercel (`chat`, `ingest`, `reindex`, `files`, `health`)
- `backend/src/`: backend local em Express, modulo de RAG e vector store

Fluxo principal:
1. Upload via `/ingest` (ou substituicao via `/reindex`)
2. Extracao de texto (`readPdf`, `readTxt`)
3. Chunking + embedding (`text-embedding-3-small` por padrao)
4. Persistencia de vetores (`Supabase` em producao, `SQLite` local)
5. Pergunta no `/chat` -> recuperacao (`topK`) -> prompt com contexto -> resposta

## Endpoints

- `POST /ingest`: adiciona novos documentos na base
- `POST /reindex`: limpa a base e reindexa os documentos enviados
- `GET /files`: lista arquivos indexados
- `DELETE /files`: remove vetores por arquivo (body: `{ "name": "arquivo.txt" }`)
- `POST /chat`: responde com `answer` + `sources`
- `GET /health`: healthcheck

## Seguranca e operacao

- autenticacao opcional por token: `APP_API_TOKEN` (Bearer)
- rate limit em endpoints criticos
- logs com `requestId`, status e latencia
- respostas de chat incluem fontes recuperadas (`source`, `chunkIndex`, `score`, `excerpt`)

## Persistencia

### Producao (recomendado)
Use Supabase com variaveis:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- opcional: `SUPABASE_VECTOR_TABLE` (padrao: `vectors`)

Schema minimo:

```sql
create table if not exists public.vectors (
  id bigint generated always as identity primary key,
  embedding jsonb not null,
  text text not null,
  metadata jsonb not null
);
```

### Local
SQLite local (`VECTORSTORE_DB_PATH` opcional). Em Vercel, storage local e efemero; por isso o projeto exige Supabase em producao (ou `ALLOW_EPHEMERAL_STORE=1` apenas para teste).

## Como rodar localmente

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Crie `backend/.env` com:

```env
OPENAI_API_KEY=...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
PORT=3001
APP_API_TOKEN=
VECTORSTORE_DB_PATH=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_VECTOR_TABLE=vectors
```

### 2) Frontend

```bash
cd frontend
npx serve -l 3000
```

## Testes

Testes automatizados minimos (ingest, chat, files):

```bash
cd backend
npm test
```

## Deploy (Vercel)

`vercel.json` ja esta configurado para:
- servir `frontend/`
- rotear `/api/*` para funcoes serverless TypeScript

Variaveis obrigatorias no projeto Vercel:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Variaveis opcionais:
- `OPENAI_CHAT_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `APP_API_TOKEN`
- `SUPABASE_VECTOR_TABLE`

## Decisoes e trade-offs

- SQLite foi mantido para desenvolvimento rapido local.
- Supabase foi adotado para resolver persistencia no ambiente serverless.
- Rate limit em memoria protege custo/abuso, mas nao e distribuido entre instancias.

## Melhorias futuras

- ranking hibrido (BM25 + embedding)
- avaliacoes automatizadas de qualidade de resposta
- dashboard simples de observabilidade (latencia, custo, acuracia)