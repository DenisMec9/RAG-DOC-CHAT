# Plano de Organização do Projeto para Deploy Vercel

## Objetivo
Limpar a estrutura e garantir que o deploy no Vercel funcione corretamente.

## Problemas Identificados
1. Duplicação de frontend (`frontend/` e `public/`)
2. `public/` tem problemas de encoding
3. `api/index.js` não é usado e pode causar conflitos

## Ações a Executar

### Passo 1: Limpar arquivos duplicados
- [ ] Remover pasta `public/` (duplicada com encoding issue)
- [ ] Remover arquivo `api/index.js` (não usado no Vercel)

### Passo 2: Atualizar vercel.json
- [ ] Adicionar configuração para servir frontend estático
- [ ] Configurar rotas SPA (fallback para index.html)
- [ ] Manter rotas da API

### Passo 3: Atualizar frontend/app.js
- [ ] Ajustar API_BASE para detectar Vercel automaticamente
- [ ] Melhorar detecção de ambiente

### Passo 4: Criar pasta frontend/assets se necessário
- [ ] Verificar se CSS/JS precisam de pasta assets

## Estrutura Final
```
rag-doc-chat/
├── api/
│   ├── chat.ts       (Vercel Serverless)
│   ├── ingest.ts     (Vercel Serverless)
│   └── health.ts     (Vercel Serverless)
├── frontend/
│   ├── index.html    (SPA frontend)
│   ├── app.js
│   └── styles.css
├── backend/           (Para desenvolvimento local)
├── vercel.json        (Configuração Vercel)
└── package.json
```

## Configuração do Vercel
O `vercel.json` deve:
1. Rotear `/api/*` para funções serverless
2. Servir arquivos estáticos de `frontend/`
3. Fazer fallback SPA para index.html em rotas não-API

## Variáveis de Ambiente (já configuradas no Vercel)
- `OPENAI_API_KEY` ✅
- `OPENAI_CHAT_MODEL` (opcional, padrão: gpt-4o-mini)
- `OPENAI_EMBEDDING_MODEL` (opcional, padrão: text-embedding-3-small)

