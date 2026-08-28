---
estado: real
fonte: git (branch main, sem commits até este bootstrap) e ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026)
ultima-revisao: 2026-08-28 (bootstrap-plan — ADR-001 e TASK-001..005)
---

# Contexto Atual do Projeto — ClassMap

Última atualização: 2026-08-28

## Estado atual

ClassMap é uma ferramenta web para a Essencislabs que substitui o Visual Paradigm na documentação visual dos sistemas Elims e GeoCloudAI (diagramas de classes, objetos e Visão do Sistema). O repositório foi criado vazio em 2026-08-28 — este bootstrap monta a arquitetura de agentes de IA (Claude Code + Codex) e a documentação de arquitetura, mas **nenhum código de aplicação existe ainda**. A stack de produção já está decidida (React + Vite/Vercel + Supabase), mas a implementação não começou. Branch única: `main`, sem commits antes deste bootstrap.

## Iniciativas ativas

- **Bootstrap da arquitetura de agentes e documentação** (branch `main`): concluído — `AGENTS.md`/`CLAUDE.md`, `.agents/`, `.claude/`, `.codex/` e `docs/` já commitados (`49621e0`).
- **Planejamento do MVP de produção** (ver ADR-001): decidido fatiar por camada técnica (dados → frontend → integração). 5 tasks em `.agents/tasks/` (fatiadas por camada, ver ADR-001):
  - **TASK-001 — Schema multi-tenant, RLS e autenticação no Supabase** (`supabase-multitenant`) — **em `active/`**, schema e políticas RLS implementados e validados localmente; falta provisionar o projeto Supabase real e validar CA-05.
  - **TASK-002 — Scaffold do frontend e navegação autenticada** (`frontend-diagramas`) — **em `active/`**, adiantada à frente da sequência formal do ADR-001 por pedido explícito do usuário (2026-08-28, pelo celular): scaffold React+Vite+TS completo (build/lint passam), autenticação e navegação Organização→Projetos→Diagramas implementadas contra o schema da TASK-001; falta o mesmo projeto Supabase real para validar CA-02 a CA-05.
  - TASK-003 — Diagrama de Classes (`frontend-diagramas`, backlog, depende de TASK-002)
  - TASK-004 — Diagrama de Objetos e Visão do Sistema (`frontend-diagramas`, backlog, depende de TASK-003)
  - TASK-005 — Contrato JSON de import/export, deploy e validação do MVP (`contrato-ia-diagrama`, backlog, depende de TASK-003/004)
- **Fluxo de git ajustado** (2026-08-28, pedido do usuário): projeto ainda sem colaboradores externos revisando — commits e push vão direto para `main`, sem branch de feature nem PR, até o usuário pedir o contrário.
- Próximo passo real (requer computador): provisionar um projeto Supabase real, aplicar as migrations de `supabase/migrations/`, configurar Auth (Email/senha), preencher `.env.local` do frontend com as credenciais, e validar CA-05 da TASK-001 + CA-02 a CA-05 da TASK-002. Autorização para essa integração já está registrada nas duas tasks. Até lá, seguir adiantando o que não depender de credenciais (ex.: avançar em TASK-003 assim que fizer sentido sem um backend real para persistir/recarregar).

## Arquitetura vigente

Camada de dados (TASK-001) e o scaffold de frontend (TASK-002) já têm
código real:

- `supabase/migrations/` — schema Organização→Usuários→Projetos→Diagramas
  + RLS (ver `supabase/README.md`); validado contra um Postgres local,
  ainda não contra um projeto Supabase gerenciado real.
- Raiz do repositório — app React 19 + Vite 8 + TypeScript
  (`package.json`, `src/`): `src/lib/supabase/` (client único + camada de
  queries), `src/features/auth/` (login, contexto de sessão, guard de
  rota) e `src/features/navigation/` (Organizações→Projetos→Diagramas).
  Builda e linta limpo; ainda não foi exercitado contra um Supabase real.

As demais camadas (Diagrama de Classes/Objetos, Visão do Sistema,
import/export) continuam só **planejadas** em `docs/architecture/`
(documentos marcados `estado: planejado`) — ver os papéis em
`.claude/agents/` (`frontend-diagramas`, `supabase-multitenant`,
`parser-vpp`, `contrato-ia-diagrama`).

## Restrições importantes

- Isolamento multi-tenant (organização/projeto) é garantido por RLS no Postgres — nunca por lógica de aplicação.
- Diagrama de objetos gerado por IA nunca contém dados reais de usuários ou de produção.
- Arquivo `.vpp` é lido inteiramente no navegador (sql.js/WASM) — nunca enviado a um backend.
- Nenhuma automação de CI/publicação automática de diagrama no MVP — importação é sempre manual, com revisão humana.
- Orçamento de infraestrutura de produção não pode ultrapassar R$ 50/mês.

(Lista completa e oficial: `.agents/test-onboarding.md`, seção Constituição.)

## Dívida técnica conhecida

- Nenhuma — projeto novo, sem código ainda.
- O protótipo funcional descrito na documentação (três abas, extração de 116 classes/113 relações de um `.vpp` real do GeoCloudAI) existe fora deste repositório; precisa ser (re)construído aqui seguindo a stack de produção decidida.

## Decisões recentes

- **ADR-001** — Fatiamento do MVP de produção por camada técnica (dados → frontend → integração). Ver `.agents/decisions/README.md`.

## Riscos atuais

- **Orçamento**: manter a operação dentro de R$ 50/mês depende dos planos gratuitos da Vercel/Supabase continuarem cobrindo o uso do time conforme ele cresce.
- **Fidelidade do parser `.vpp`**: a prova de conceito validou 100% de fidelidade contra um único arquivo real do GeoCloudAI — outros arquivos `.vpp` (Elims, ou GeoCloudAI mais recentes) podem expor casos não cobertos pelo parser original.
- **Contrato JSON com agentes externos**: o schema de import/export é consumido por agentes de IA rodando em outros repositórios (Elims, GeoCloudAI); mudanças de schema sem ADR quebram esses agentes silenciosamente.

## Não fazer agora

- Automação de CI/publicação automática de diagramas a cada merge (roadmap "avançado", fora de escopo do MVP).
- Aba de "casos de uso" (quarta visualização) — roadmap, ainda não especificado em detalhe.
- Cursores de colaboração em tempo real estilo Figma — decisão explícita de manter só lista de presença.
- RBAC granular além de visualizador/editor — decisão explícita de manter simples.
