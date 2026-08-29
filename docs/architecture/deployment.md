---
estado: real
fonte: infraestrutura provisionada em 2026-08-28 (sessão no computador, navegador autenticado pelo usuário nas contas Supabase e Vercel) — ver `.agents/context/CONTEXT.md`
ultima-revisao: 2026-08-29 (bootstrap-audit — atualizado de "planejado" para "real": deploy já existe desde 2026-08-28)
---

# Implantação

Ambiente real: **Vercel** (frontend) + **Supabase** (dados/auth/realtime gerenciados), ambos no plano gratuito — dentro do teto de orçamento de **R$ 50/mês** (RN de `.claude/rules/global.md`). App publicado em https://class-map-one.vercel.app.

## Processos/serviços

| Serviço | Processo | Porta | Path público | Env relevantes |
|---|---|---|---|---|
| SPA Frontend | build Vite + deploy automático (Vercel `class-map`, a cada push em `main`) | gerida pela Vercel | `/` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (configuradas em produção na Vercel) |
| Supabase | gerenciado (SaaS), projeto `classmap` (org Essencislabs, Free, `sa-east-1`) | n/a | n/a | credenciais do projeto Supabase (painel do Supabase) |

## Roteamento/proxy (se houver)

Nenhum proxy customizado — a Vercel serve a SPA diretamente.

## Variáveis de ambiente relevantes

- `VITE_SUPABASE_URL` — URL do projeto Supabase `classmap`, configurada em produção na Vercel.
- `VITE_SUPABASE_ANON_KEY` — chave anônima do Supabase, segura para uso no client porque a autorização real é feita por RLS; configurada em produção na Vercel.

## Boot da aplicação

1. Build da SPA (Vite).
2. Deploy automático a cada push em `main` (Vercel).
3. Toda migration de schema/RLS deve estar aplicada antes de qualquer release que dependa dela — as 7 migrations da TASK-001/004 já foram aplicadas manualmente ao projeto `classmap` real; ainda não há pipeline automatizado de migration (aplicação continua manual, documentada em `supabase/README.md`).

## Armazenamento de arquivos (se aplicável)

Arquivos `.vpp` são processados só em memória no navegador do usuário (sql.js) — nunca enviados ou persistidos em storage do backend/Supabase.

## Observabilidade

Nenhuma definida além do que Vercel/Supabase oferecem nativamente (logs de deploy, dashboard do Supabase). Revisar quando o MVP de produção entrar em operação real com o time.

## Divergência conhecida

Nenhuma — schema/RLS e deploy correspondem ao que está descrito acima. Pendência (não é divergência): ninguém se cadastrou/logou de fato no app publicado ainda (falta validar CA-05 da TASK-001 e CA-05/06 da TASK-005 — ver `.agents/context/CONTEXT.md`).
