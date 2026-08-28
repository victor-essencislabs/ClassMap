---
estado: planejado
fonte: ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026), seção 6
ultima-revisao: 2026-08-28 (bootstrap inicial)
---

# Implantação

Ambiente planejado: **Vercel** (frontend) + **Supabase** (dados/auth/realtime gerenciados) — teto de orçamento de **R$ 50/mês**, com viabilidade de operar no plano gratuito de ambos na fase inicial. Escreva este documento a partir da configuração de deploy real assim que ela existir — nunca do que "deveria ser".

## Processos/serviços (planejado)

| Serviço | Processo | Porta | Path público | Env relevantes |
|---|---|---|---|---|
| SPA Frontend | build Vite + deploy automático (Vercel a cada push) | gerida pela Vercel | `/` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (planejado) |
| Supabase | gerenciado (SaaS) | n/a | n/a | credenciais do projeto Supabase (painel do Supabase) |

## Roteamento/proxy (se houver)

Nenhum proxy customizado planejado — a Vercel serve a SPA diretamente.

## Variáveis de ambiente relevantes

- `VITE_SUPABASE_URL` — URL do projeto Supabase (planejado).
- `VITE_SUPABASE_ANON_KEY` — chave anônima do Supabase, segura para uso no client porque a autorização real é feita por RLS (planejado).

## Boot da aplicação

1. Build da SPA (Vite).
2. Deploy automático a cada push (Vercel).
3. Toda migration de schema/RLS deve estar aplicada antes de qualquer release que dependa dela (planejado — ainda não há pipeline definido).

## Armazenamento de arquivos (se aplicável)

Arquivos `.vpp` são processados só em memória no navegador do usuário (sql.js) — nunca enviados ou persistidos em storage do backend/Supabase.

## Observabilidade

Nenhuma definida além do que Vercel/Supabase oferecem nativamente. Revisar ao iniciar o MVP de produção.

## Divergência conhecida

Nenhuma — este documento descreve a arquitetura planejada; ainda não há implantação real para comparar.
