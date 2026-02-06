# TODO - Correção Arquitetura Vercel Serverless

## ✅ Tarefas Concluídas

- [x] 1. Criar `/api/health.ts` - Handler Vercel puro para health check
- [x] 2. Criar `/api/chat.ts` - Handler Vercel que importa de `backend/dist/rag/*`
- [x] 3. Criar `/api/ingest.ts` - Handler Vercel que importa de `backend/dist/ingestion/*`
- [x] 4. Atualizar `vercel.json` - Configurar rotas corretamente
- [x] 5. Build do backend - `backend/dist/*` gerado com sucesso

## 📋 Estrutura Final

```
/api/                    ← Handlers Vercel Serverless (puros, sem Express)
  health.ts    → GET /api/health
  chat.ts      → POST /api/chat
  ingest.ts    → POST /api/ingest

backend/src/             ← Core RAG (lógica pura, sem HTTP)
  rag/
  embeddings/
  ingestion/
  vectorstore/

backend/dist/            ← Compilado, importado pelos handlers Vercel
```

## 🔑 Características dos Novos Handlers

- ✅ Usam `export default async function handler(req, res)`
- ❌ Sem `express`, `app.listen`, ou `express.Router()`
- ✅ Importam lógica do core RAG de `backend/dist/*`
- ✅ Suportam Edge Runtime

## 🚀 Próximos Passos (Deploy)

```bash
# Deploy para Vercel
vercel --prod

# Testar após deploy
curl https://seu-projeto.vercel.app/api/health
```

