---
name: global
description: Regras globais do ClassMap, válidas para qualquer subagente ou alteração no repositório.
---

## Propósito

ClassMap não tem uma camada de backend própria com controllers/services — a "API" é o SDK do Supabase (Postgres + Auth + Realtime), com autorização garantida no banco via RLS. Única exceção pontual e documentada, desde a TASK-025/`ADR-010`: a Edge Function `supabase/functions/admin-create-user/` — a única operação do produto que exige a `service_role key` (Admin API do Supabase para criar usuário com senha já definida), isolada nesse arquivo, nunca exposta ao cliente. Não é uma guinada para "ter backend próprio" em geral — toda nova necessidade de lógica privilegiada deve ser justificada e registrada em ADR, como esta foi. Essas regras existem para que frontend, dados e parser `.vpp` continuem consistentes com essa decisão, independente de qual agente/ferramenta (Claude Code, Codex) executa a mudança.

## Escopo

Todo o repositório: `src/` (frontend React/Vite), `supabase/migrations/` (schema e RLS), e a documentação em `docs/`.

## Práticas exigidas

- RLS habilitada e testada em toda tabela multi-tenant — nunca depender só de filtro em código de aplicação.
- Mudança de schema Postgres só via migration versionada em `supabase/migrations/`.
- Mudança no schema JSON de import/export de diagramas (contrato com agentes de IA externos) registrada em `.agents/decisions/` antes de implementada.
- Presença em tempo real via Supabase Realtime Presence — estado efêmero, nunca persistido em tabela.
- Qualquer escolha de infraestrutura paga justificada contra o teto de R$ 50/mês.

## Práticas proibidas

- Enviar o conteúdo de um arquivo `.vpp` (ou dados dele extraídos) para um backend/servidor — o parser roda só no navegador.
- Incluir dados reais de usuários ou de produção em um diagrama de objetos gerado por agente de IA.
- Automatizar a publicação de um diagrama gerado por IA sem revisão humana explícita (fora de escopo do MVP).
- Introduzir um terceiro nível de permissão (além de visualizador/editor) sem ADR aprovado.

## Documentos necessários antes de alterar código

- `.agents/context/CONTEXT.md`
- Subagente relevante: `.claude/agents/<papel>.md`
- Task ativa em `.agents/tasks/active/`, se houver

## Comandos de validação

Desde a TASK-002 (`package.json` na raiz):

- `npm run build` — typecheck (`tsc -b`) + build de produção (Vite). Rodar antes de qualquer commit que toque `src/`.
- `npm run lint` — `oxlint`.
- `npm test` — `vitest run`. Rodar antes de qualquer commit que toque `src/features/class-diagram/` (ou outra feature que ganhe testes).

Ainda não há testes E2E neste repositório (adiados para a TASK-005,
contra um projeto Supabase real). Migrations do Supabase (TASK-001) não
têm comando de teste automatizado; validação é manual, documentada em
`supabase/README.md`.

## Condições de atualização

Revisar quando um novo padrão arquitetural for adotado ou quando um ADR novo em `.agents/decisions/` mudar uma regra aqui listada.
