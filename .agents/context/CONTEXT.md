---
estado: real
fonte: git (branch main, sem commits até este bootstrap) e ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026)
ultima-revisao: 2026-08-28 (integração real Supabase+Vercel, sessão seguinte ao bootstrap-plan)
---

# Contexto Atual do Projeto — ClassMap

Última atualização: 2026-08-28

## Estado atual

ClassMap é uma ferramenta web para a Essencislabs que substitui o Visual Paradigm na documentação visual dos sistemas Elims e GeoCloudAI (diagramas de classes, objetos e Visão do Sistema). O repositório foi criado vazio em 2026-08-28; no mesmo dia, as 5 tasks do MVP de produção (ADR-001) tiveram todo o código implementado — schema/RLS no Supabase, o app React+Vite completo (autenticação, as 3 visualizações, import/export), com 44 testes automatizados. Ainda no mesmo dia, em sessão seguinte já no computador (navegador autenticado pelo usuário nas contas Supabase e Vercel), a infraestrutura real foi provisionada: projeto Supabase `classmap` criado (org Essencislabs, Free, São Paulo) com as 7 migrations aplicadas, Auth por e-mail confirmado habilitado, e o app publicado na Vercel em https://class-map-one.vercel.app (deploy automático a cada push na `main`), com as env vars do Supabase configuradas. Falta só validação humana: alguém se cadastrar/logar de fato (CA-05 da TASK-001, CA-04 já confirmado tecnicamente) e a sessão com o grupo piloto do time (CA-05 da TASK-005) — ver "Iniciativas ativas". Branch única: `main` (decisão do usuário — sem PR neste projeto por enquanto).

## Iniciativas ativas

- **Bootstrap da arquitetura de agentes e documentação** (branch `main`): concluído — `AGENTS.md`/`CLAUDE.md`, `.agents/`, `.claude/`, `.codex/` e `docs/` já commitados (`49621e0`).
- **Planejamento do MVP de produção** (ver ADR-001): decidido fatiar por camada técnica (dados → frontend → integração). 5 tasks em `.agents/tasks/` (fatiadas por camada, ver ADR-001):
  - **TASK-001 — Schema multi-tenant, RLS e autenticação no Supabase** (`supabase-multitenant`) — **em `active/`**, schema e políticas RLS implementados e validados localmente; projeto Supabase real (`classmap`) já provisionado e com as migrations aplicadas — falta só validar CA-05 com um cadastro/login real.
  - **TASK-002 — Scaffold do frontend e navegação autenticada** (`frontend-diagramas`) — **em `active/`**, adiantada à frente da sequência formal do ADR-001 por pedido explícito do usuário (2026-08-28, pelo celular): scaffold React+Vite+TS completo (build/lint passam), autenticação e navegação Organização→Projetos→Diagramas implementadas contra o schema da TASK-001; o projeto Supabase real já existe e está em produção — falta logar de fato para validar CA-02 a CA-05.
  - **TASK-003 — Diagrama de Classes** (`frontend-diagramas`) — **em `active/`**, também adiantada: canvas com cards de classe, conectores ortogonais com os 5 símbolos UML e multiplicidade, painel de edição, persistência via Supabase (código pronto). Primeira task com testes automatizados do repositório (Vitest + Testing Library) — um bug real de seleção de conector foi pego e corrigido pelos testes antes de qualquer uso real. Falta validação manual em navegador e persistência real (mesma pendência das anteriores).
  - **TASK-004 — Diagrama de Objetos e Visão do Sistema** (`frontend-diagramas`) — **em `active/`**, também adiantada: Diagrama de Objetos (herança automática de atributos por snapshot) e Visão do Sistema (módulo→entidade, 3 blocos sempre presentes) completos, com testes. Exigiu uma migration nova (`diagrams.type` ganhou `'system-view'` — reaproveita a tabela `diagrams` em vez de tabelas relacionais novas, decisão registrada na task). Mesma pendência de validação manual/persistência real.
  - **TASK-005 — Contrato JSON de import/export, deploy e validação do MVP** (`contrato-ia-diagrama`) — **em `active/`**, schema Zod formal (os 5 tokens de relação já estavam documentados, agora são um validador executável), conversão e botões Importar/Exportar no Diagrama de Classes (escopo desta rodada — Diagrama de Objetos ficou de fora, decisão registrada na task), **e app publicado em produção**: https://class-map-one.vercel.app (CA-04 confirmado). Faltam CA-05 (sessão com o grupo piloto do time) e CA-06 (confirmar custo real dentro do teto após algum tempo de uso).
- **Suíte de testes automatizados do repositório**: 44 casos em 8 arquivos (`npm test` — Vitest + Testing Library), cobrindo a lógica de edição/conversão de todas as 3 visualizações e o import/export, sem depender de nenhum projeto Supabase real.
- **Fluxo de git ajustado** (2026-08-28, pedido do usuário): projeto ainda sem colaboradores externos revisando — commits e push vão direto para `main`, sem branch de feature nem PR, até o usuário pedir o contrário.
- **Infraestrutura real provisionada** (2026-08-28, sessão no computador): projeto Supabase `classmap` (org Essencislabs, Free, `sa-east-1`) com as 7 migrations aplicadas e Auth por e-mail confirmado habilitado; projeto Vercel `class-map` conectado ao GitHub (`victor-essencislabs/ClassMap`, branch `main`, deploy automático a cada push) com as env vars do Supabase configuradas, publicado em https://class-map-one.vercel.app. O agente não criou nenhuma conta de usuário nem digitou senha de autenticação — isso é o único passo que falta para validar os CAs pendentes das TASK-001/002/003/004 (login real, isolamento visível na UI, persistência de cada tipo de diagrama) e para agendar a sessão com o grupo piloto (CA-05 da TASK-005). Só depois disso mover TASK-001..005 para `completed/` — fecha o MVP de produção do ADR-001.

## Arquitetura vigente

Todas as 5 camadas do MVP (TASK-001..005) já têm código real:

- `supabase/migrations/` — schema Organização→Usuários→Projetos→Diagramas
  + RLS (ver `supabase/README.md`); validado contra um Postgres local e
  já aplicado ao projeto Supabase gerenciado real (`classmap`).
- Raiz do repositório — app React 19 + Vite 8 + TypeScript
  (`package.json`, `src/`): `src/lib/supabase/` (client único + camada de
  queries), `src/features/auth/` (login, contexto de sessão, guard de
  rota), `src/features/navigation/` (Organizações→Projetos→Diagramas),
  `src/features/class-diagram/` (canvas do Diagrama de Classes — cards,
  conectores UML ortogonais, painel de edição), `src/features/object-diagram/`
  (instâncias com atributos herdados por snapshot) e
  `src/features/system-view/` (módulo→entidade, 3 blocos sempre
  presentes) e `src/features/import-export/` (schema Zod +
  conversão + botões Importar/Exportar, só Diagrama de Classes por
  enquanto). Builda, linta e testa limpo (`npm test` — Vitest +
  Testing Library, 44 casos); o projeto Supabase real existe e está
  conectado (env vars em produção na Vercel), mas ninguém logou nele
  de fato ainda.

Nenhuma camada de frontend planejada em `docs/architecture/` continua
sem código, e o app já está publicado — falta só validação humana com
o time (TASK-005, CA-05/06). Ver os papéis em
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

- **Schema aplicado e app publicado, mas sem login real ainda** — o código (schema/RLS, frontend, testes) foi validado contra um Postgres local e testes automatizados; o schema já está aplicado no Supabase real e o app já está publicado na Vercel, mas ninguém se cadastrou/logou de fato ainda. Essa é a única lacuna de validação restante antes de fechar o MVP — ver as pendências de cada TASK-001..005.
- Import/export (TASK-005) cobre só o Diagrama de Classes — Diagrama de Objetos ficou fora do escopo desta rodada (decisão registrada na task).
- O protótipo funcional descrito na documentação (três abas, extração de 116 classes/113 relações de um `.vpp` real do GeoCloudAI) existe fora deste repositório; precisa ser (re)construído aqui seguindo a stack de produção decidida — o parser `.vpp` em si ainda não foi iniciado (fora do escopo das 5 tasks do MVP, avança em paralelo per `.claude/agents/parser-vpp.md`).

## Decisões recentes

- **ADR-001** — Fatiamento do MVP de produção por camada técnica (dados → frontend → integração). Ver `.agents/decisions/README.md`.

## Riscos atuais

- **Orçamento**: manter a operação dentro de R$ 50/mês depende dos planos gratuitos da Vercel/Supabase continuarem cobrindo o uso do time conforme ele cresce.
- **Fidelidade do parser `.vpp`**: a prova de conceito validou 100% de fidelidade contra um único arquivo real do GeoCloudAI — outros arquivos `.vpp` (Elims, ou GeoCloudAI mais recentes) podem expor casos não cobertos pelo parser original.
- **Contrato JSON com agentes externos**: agora um schema Zod executável (TASK-005, `src/features/import-export/schema.ts`), não mais só documentação — o risco de "mudança silenciosa" ficou mais concreto, não menor: qualquer PR que toque esse arquivo sem ADR quebra agentes de IA rodando em Elims/GeoCloudAI de verdade, e o schema atual só cobre Diagrama de Classes (Diagrama de Objetos ainda não tem conversão implementada).

## Não fazer agora

- Automação de CI/publicação automática de diagramas a cada merge (roadmap "avançado", fora de escopo do MVP).
- Aba de "casos de uso" (quarta visualização) — roadmap, ainda não especificado em detalhe.
- Cursores de colaboração em tempo real estilo Figma — decisão explícita de manter só lista de presença.
- RBAC granular além de visualizador/editor — decisão explícita de manter simples.
