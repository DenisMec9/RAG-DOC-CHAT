# RAG Doc Chat

Interface simples para fazer upload de PDFs/TXT, indexar conteúdo e conversar com um chat que responde com base no material enviado.

## Rodar localmente

1. Backend

```bash
cd backend
npm install
npm run dev
```

2. Frontend

```bash
cd frontend
npx serve -l 3000
```

## Variáveis de ambiente (backend)

Crie o arquivo `backend/.env` com:

```
OPENAI_API_KEY=coloque_sua_chave
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
VECTORSTORE_PATH=data/vectorstore.json
CHUNK_SIZE=700
CHUNK_OVERLAP=100
PORT=3001
```

## Deploy na Vercel

- Frontend é servido pela pasta `public/`
- Backend roda em `api/index.ts` como Serverless Function
- Configure as variáveis de ambiente no painel da Vercel (mesmas do `.env`)

