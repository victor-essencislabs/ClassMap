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
  - **TASK-003 — Diagrama de Classes** (`frontend-diagramas`) — **em `active/`**, também adiantada: canvas com cards de classe, conectores ortogonais com os 5 símbolos UML e multiplicidade, painel de edição, persistência via Supabase (código pronto). Primeira task com testes automatizados do repositório (Vitest + Testing Library) — um bug real de seleção de conector foi pego e corrigido pelos testes antes de qualquer uso real. Falta validação manual em navegador e persistência real (mesma pendência das anteriores).
  - **TASK-004 — Diagrama de Objetos e Visão do Sistema** (`frontend-diagramas`) — **em `active/`**, também adiantada: Diagrama de Objetos (herança automática de atributos por snapshot) e Visão do Sistema (módulo→entidade, 3 blocos sempre presentes) completos, com testes. Exigiu uma migration nova (`diagrams.type` ganhou `'system-view'` — reaproveita a tabela `diagrams` em vez de tabelas relacionais novas, decisão registrada na task). Suíte de testes do repositório agora com 34 casos (6 arquivos). Mesma pendência de validação manual/persistência real.
  - TASK-005 — Contrato JSON de import/export, deploy e validação do MVP (`contrato-ia-diagrama`, backlog, depende de TASK-003/004)
- **Fluxo de git ajustado** (2026-08-28, pedido do usuário): projeto ainda sem colaboradores externos revisando — commits e push vão direto para `main`, sem branch de feature nem PR, até o usuário pedir o contrário.
- Próximo passo real (requer computador): provisionar um projeto Supabase real, aplicar as migrations de `supabase/migrations/` (incluindo a que adiciona `'system-view'` a `diagrams.type`), configurar Auth (Email/senha), preencher `.env.local` do frontend com as credenciais, e validar CA-05 da TASK-001 + os CAs pendentes das TASK-002/003/004 (login real, isolamento visível na UI, persistência de cada tipo de diagrama). Autorização para essa integração já está registrada nas quatro tasks. Só depois disso mover TASK-001..004 para `completed/` e seguir para a TASK-005 (contrato JSON de import/export, deploy na Vercel, validação com o time) — essa sim depende fortemente de infraestrutura real (deploy) e não dá para adiantar tanto sem ela quanto as anteriores.

## Arquitetura vigente

Camada de dados (TASK-001) e o scaffold de frontend (TASK-002) já têm
código real:

- `supabase/migrations/` — schema Organização→Usuários→Projetos→Diagramas
  + RLS (ver `supabase/README.md`); validado contra um Postgres local,
  ainda não contra um projeto Supabase gerenciado real.
- Raiz do repositório — app React 19 + Vite 8 + TypeScript
  (`package.json`, `src/`): `src/lib/supabase/` (client único + camada de
  queries), `src/features/auth/` (login, contexto de sessão, guard de
  rota), `src/features/navigation/` (Organizações→Projetos→Diagramas),
  `src/features/class-diagram/` (canvas do Diagrama de Classes — cards,
  conectores UML ortogonais, painel de edição), `src/features/object-diagram/`
  (instâncias com atributos herdados por snapshot) e
  `src/features/system-view/` (módulo→entidade, 3 blocos sempre
  presentes). Builda, linta e testa limpo (`npm test` — Vitest +
  Testing Library, 34 casos); ainda não foi exercitado contra um
  Supabase real.

A camada de import/export (TASK-005) continua só **planejada** em
`docs/architecture/` (documentos marcados `estado: planejado`) — ver os papéis em
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
