# TODO - RAG Doc Chat

## ✅ PROBLEMAS JÁ CORRIGIDOS

### Bug de Upload de Arquivos (FIXED)
- `Cannot destructure property 'files' of 'req.body' as it is undefined`
- **Solução**: Usando `formidable` para processar `multipart/form-data`
- `bodyParser: false` configurado no Vercel

---

## 📦 DEPLOY STATUS

### Estrutura do Projeto
```
rag-doc-chat/
├── api/                    # Serverless Functions (Vercel)
│   ├── chat.ts            # Endpoint do chat
│   ├── ingest.ts          # Endpoint de upload
│   └── health.ts          # Health check
├── frontend/              # Frontend estático (SPA)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── backend/              # Backend local (Node.js Express)
│   ├── dist/             # Compilado (npm run build)
│   └── src/
├── vercel.json           # Configuração Vercel
└── package.json
```

---

## 🚀 COMO FAZER DEPLOY

### 1. Variáveis de Ambiente (Já configuradas no Vercel)
```
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini (opcional)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small (opcional)
```

### 2. Deploy no Vercel
```bash
# Instalar CLI se necessário
npm i -g vercel

# Fazer login
vercel login

# Deploy (na pasta do projeto)
vercel --prod
```

### 3. Ou conectar direto no Vercel Dashboard
1. Acesse https://vercel.com
2. "Add New Project"
3. Importe do GitHub ou envie os arquivos
4. Configure as variáveis de ambiente
5. Deploy!

---

## 🧪 TESTE LOCAL

### Backend Local (porta 3001)
```bash
cd backend
npm run dev
# Acesse: http://localhost:3001
```

### Frontend Local (porta 3000)
```bash
# Com o backend rodando, abra frontend/index.html
# Ou use um servidor local:
npx serve frontend
```

---

## 🔧 FUNCIONALIDADES

### API Endpoints

#### POST /api/ingest
Upload de arquivos PDF/TXT para indexação
```bash
curl -X POST -F "files=@documento.pdf" https://seu-projeto.vercel.app/api/ingest
```

#### POST /api/chat
Perguntas ao RAG
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"question":"Qual o resumo do documento?"}' \
  https://seu-projeto.vercel.app/api/chat
```

#### GET /api/health
Health check
```bash
curl https://seu-projeto.vercel.app/api/health
```

---

## 📋 PROBLEMAS CONHECIDOS

1. **Timeout em PDFs grandes**: O processamento de PDFs grandes pode exceder 30 segundos
   - **Solução**: Dividir arquivos ou usar arquivo menor

2. **Vectorstore em /tmp**: No Vercel, dados em /tmp são efêmeros
   - **Solução**: Para produção, considere usar banco de dados persistente

---

## 🔄 PRÓXIMOS MELHORIAS (Opcional)

- [ ] Usar Supabase/PostgreSQL como vectorstore persistente
- [ ] Adicionar rate limiting
- [ ] Interface para gerenciar documentos
- [ ] Suporte a mais formatos (DOCX, Markdown)
- [ ] Autenticação de usuários

