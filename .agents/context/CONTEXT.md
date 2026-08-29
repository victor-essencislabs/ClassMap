---
estado: real
fonte: git (branch main, sem commits até este bootstrap) e ClassMap_Documentacao.pdf (Essencislabs, Agosto 2026)
ultima-revisao: 2026-08-29 (bootstrap-plan — ADR-006 e TASK-017 geradas a partir de feedback de UX sobre o Diagrama de Objetos)
---

# Contexto Atual do Projeto — ClassMap

Última atualização: 2026-08-29

## Estado atual

ClassMap é uma ferramenta web para a Essencislabs que substitui o Visual Paradigm na documentação visual dos sistemas Elims e GeoCloudAI (diagramas de classes, objetos e Visão do Sistema). O repositório foi criado vazio em 2026-08-28; no mesmo dia, as 5 tasks do MVP de produção (ADR-001) tiveram todo o código implementado — schema/RLS no Supabase, o app React+Vite completo (autenticação, as 3 visualizações, import/export), com 44 testes automatizados. Ainda no mesmo dia, em sessão seguinte já no computador (navegador autenticado pelo usuário nas contas Supabase e Vercel), a infraestrutura real foi provisionada: projeto Supabase `classmap` criado (org Essencislabs, Free, São Paulo) com as 7 migrations aplicadas, Auth por e-mail confirmado habilitado, e o app publicado na Vercel em https://class-map-one.vercel.app (deploy automático a cada push na `main`), com as env vars do Supabase configuradas. Em 2026-08-29, depois de concluído o redesign (ADR-002, TASK-006..010), o usuário logou de fato pela primeira vez (contra uma instância local do app apontando para o mesmo Supabase real) e conduziu, com o agente, uma sessão de validação manual das TASK-001..005: login, navegação Organização→Projetos→Diagramas, criação de classes/relações/multiplicidade (Diagrama de Classes), objeto herdando atributos (Diagrama de Objetos), módulo/entidade com os 3 blocos (Visão do Sistema) e o ciclo completo de exportar/importar JSON (com rejeição de JSON inválido) — tudo persistindo de fato contra o Supabase real e sobrevivendo a reload de página. Falta só o que exige mais de um usuário real: isolamento entre organizações e o bloqueio de `visualizador` na UI (TASK-001/002/003/004), e a sessão com o **grupo** piloto do time e o custo observado ao longo do tempo (TASK-005, CA-05/06) — ver "Iniciativas ativas". Branch única: `main` (decisão do usuário — sem PR neste projeto por enquanto).

## Iniciativas ativas

- **Bootstrap da arquitetura de agentes e documentação** (branch `main`): concluído — `AGENTS.md`/`CLAUDE.md`, `.agents/`, `.claude/`, `.codex/` e `docs/` já commitados (`49621e0`).
- **Planejamento do MVP de produção** (ver ADR-001): decidido fatiar por camada técnica (dados → frontend → integração). 5 tasks em `.agents/tasks/` (fatiadas por camada, ver ADR-001):
  - **TASK-001 — Schema multi-tenant, RLS e autenticação no Supabase** (`supabase-multitenant`) — **em `active/`**, schema e políticas RLS implementados e validados localmente; projeto Supabase real (`classmap`) já provisionado e com as migrations aplicadas. **2026-08-29**: CA-05 (login real) validado. Falta só CA-02 contra produção "pela UI" — isolamento entre organizações — que exige um segundo usuário real numa organização diferente (indisponível nesta sessão).
  - **TASK-002 — Scaffold do frontend e navegação autenticada** (`frontend-diagramas`) — **em `active/`**, adiantada à frente da sequência formal do ADR-001 por pedido explícito do usuário (2026-08-28, pelo celular): scaffold React+Vite+TS completo (build/lint passam), autenticação e navegação Organização→Projetos→Diagramas implementadas contra o schema da TASK-001. **2026-08-29**: CA-02/CA-03 validados contra produção real (login, navegação, criação de diagrama por `editor`). Faltam CA-04/CA-05 — exigem um segundo usuário (`visualizador`/outra organização), que a UI hoje nem tem como convidar (ver "Feedback do usuário", item 2).
  - **TASK-003 — Diagrama de Classes** (`frontend-diagramas`) — **em `active/`**, também adiantada: canvas com cards de classe, conectores ortogonais com os 5 símbolos UML e multiplicidade, painel de edição, persistência via Supabase. Primeira task com testes automatizados do repositório (Vitest + Testing Library) — um bug real de seleção de conector foi pego e corrigido pelos testes antes de qualquer uso real. **2026-08-29**: CA-01 a CA-04 validados contra produção real (classe/relação/multiplicidade criadas, persistência confirmada após reload). Falta só CA-05 (`visualizador`).
  - **TASK-004 — Diagrama de Objetos e Visão do Sistema** (`frontend-diagramas`) — **em `active/`**, também adiantada: Diagrama de Objetos (herança automática de atributos por snapshot) e Visão do Sistema (módulo→entidade, 3 blocos sempre presentes) completos, com testes. Exigiu uma migration nova (`diagrams.type` ganhou `'system-view'` — reaproveita a tabela `diagrams` em vez de tabelas relacionais novas, decisão registrada na task). **2026-08-29**: CA-01 a CA-04 validados contra produção real (objeto herdando atributos, Visão do Sistema com os 3 blocos preenchidos, ambos persistindo). Falta só CA-05 (`visualizador`).
  - **TASK-005 — Contrato JSON de import/export, deploy e validação do MVP** (`contrato-ia-diagrama`) — **em `active/`**, schema Zod formal (os 5 tokens de relação já estavam documentados, agora são um validador executável), conversão e botões Importar/Exportar no Diagrama de Classes (escopo desta rodada — Diagrama de Objetos ficou de fora, decisão registrada na task), **e app publicado em produção**: https://class-map-one.vercel.app (CA-04 confirmado). **2026-08-29**: CA-01/02/03 validados contra produção real (exportar, importar com sucesso, rejeitar JSON inválido sem corromper). Faltam CA-05 (sessão com o **grupo** piloto do time — uma pessoa só não fecha esse CA) e CA-06 (confirmar custo real dentro do teto após algum tempo de uso).
- **Suíte de testes automatizados do repositório**: 44 casos em 8 arquivos (`npm test` — Vitest + Testing Library), cobrindo a lógica de edição/conversão de todas as 3 visualizações e o import/export, sem depender de nenhum projeto Supabase real.
- **Fluxo de git ajustado** (2026-08-28, pedido do usuário): projeto ainda sem colaboradores externos revisando — commits e push vão direto para `main`, sem branch de feature nem PR, até o usuário pedir o contrário.
- **Infraestrutura real provisionada** (2026-08-28, sessão no computador): projeto Supabase `classmap` (org Essencislabs, Free, `sa-east-1`) com as 7 migrations aplicadas e Auth por e-mail confirmado habilitado; projeto Vercel `class-map` conectado ao GitHub (`victor-essencislabs/ClassMap`, branch `main`, deploy automático a cada push) com as env vars do Supabase configuradas, publicado em https://class-map-one.vercel.app.
- **Sessão de validação manual real** (2026-08-29): o usuário logou de fato pela primeira vez (o agente nunca digita senha — só conduziu a navegação/validação depois do login) e, junto com o agente, validou contra produção: login (CA-05 TASK-001), navegação Organização→Projetos→Diagramas e criação de diagrama por `editor` (CA-02/03 TASK-002), Diagrama de Classes completo — classe, relação com tipo/multiplicidade, persistência após reload (CA-01..04 TASK-003), Diagrama de Objetos e Visão do Sistema — herança de atributos, os 3 blocos, persistência (CA-01..04 TASK-004), e o ciclo de exportar/importar/rejeitar JSON inválido (CA-01..03 TASK-005). Registro completo em cada task (`.agents/tasks/active/TASK-00{1..5}*.md`, seções "Validação"/"Registro de execução"). **O que ainda falta, e por que nenhum agente sozinho fecha**: (1) isolamento entre organizações e bloqueio de `visualizador` na UI (TASK-001 CA-02, TASK-002 CA-04/05, TASK-003 CA-05, TASK-004 CA-05) — exige um **segundo usuário real**, e a UI hoje nem tem como convidar um (ver "Feedback do usuário" abaixo); (2) sessão com o **grupo** piloto do time (TASK-005 CA-05) — por definição, mais de uma pessoa; (3) custo observado ao longo do tempo (TASK-005 CA-06) — exige tempo de operação, não uma sessão de teste. Só depois disso mover TASK-001..005 para `completed/` — fecha o MVP de produção do ADR-001.

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
  Testing Library, 90 casos com ADR-002); o projeto Supabase real existe,
  está conectado (env vars em produção na Vercel) e já foi validado com
  login/navegação/CRUD reais em 2026-08-29 (ver "Sessão de validação
  manual real" acima).

Nenhuma camada de frontend planejada em `docs/architecture/` continua
sem código, o app já está publicado, e o fluxo de um usuário `editor`
já foi validado de ponta a ponta contra produção — falta só o que
exige mais de uma pessoa (isolamento entre organizações, papel
`visualizador`, sessão em grupo do time — ver "Sessão de validação
manual real"). Ver os papéis em
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

- **Falta um segundo usuário real para fechar o MVP** — o código (schema/RLS, frontend, testes) foi validado contra Postgres local, testes automatizados e, desde 2026-08-29, contra produção real com um usuário `editor` (login, navegação, CRUD das 3 visualizações, import/export — ver "Sessão de validação manual real"). A lacuna que resta não é mais "ninguém logou" — é que isolamento entre organizações e o papel `visualizador` só podem ser comprovados com um **segundo** usuário real (outra organização e/ou papel diferente), que a UI atual nem tem como convidar (ver "Feedback do usuário — pendente de virar task", item 2) — ver as pendências de cada TASK-001..005.
- Import/export (TASK-005) cobre só o Diagrama de Classes — Diagrama de Objetos ficou fora do escopo desta rodada (decisão registrada na task).
- O protótipo funcional descrito na documentação (três abas, extração de 116 classes/113 relações de um `.vpp` real do GeoCloudAI) **foi localizado** em 2026-08-29 — é um Artifact publicado pelo usuário (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`, título "ClassMap"), HTML/CSS/JS single-file com o design/UX de referência completo (shell de 3 colunas, tokens dark/light, zoom/pan, modo de conexão, Visão do Sistema com tabelas). Ver ADR-002 — o parser `.vpp` em si continua não iniciado (fora de escopo de ADR-001/002, avança em paralelo per `.claude/agents/parser-vpp.md`).
- **Redesign das telas de diagrama para bater com o artefato** (ADR-002, 2026-08-29) — **concluído**: o usuário testou o app publicado (TASK-001..005 em produção) e apontou que Diagrama de Classes/Objetos/Visão do Sistema estavam muito abaixo do artefato-protótipo válido. Decisão: reimplementação idiomática em React (manteve `ClassDiagramContent`/`ObjectDiagramContent`/`SystemViewContent` e a persistência via Supabase já testados, reconstruiu só o shell/interações). 5 tasks, todas **concluídas** em 2026-08-29, nesta ordem de dependência: **TASK-006** (design system + shell de 3 colunas, fundação, ver `.agents/tasks/completed/TASK-006-design-system-shell-diagramas.md`) → **TASK-007** (Diagrama de Classes: zoom/pan, modo de conexão, busca+stats, inspector, ver `.agents/tasks/completed/TASK-007-canvas-avancado-diagrama-classes.md`) → **TASK-008** (Diagrama de Objetos: mesmo zoom/pan compartilhado, paleta `--object-accent`, modal de criação, ver `.agents/tasks/completed/TASK-008-canvas-avancado-diagrama-objetos.md`) → **TASK-009** (Visão do Sistema: layout nav+tabelas do artefato, ver `.agents/tasks/completed/TASK-009-layout-visao-sistema-artefato.md`) → **TASK-010** (Import/Export: modais estilizados + `Modal` genérico extraído para o design system, ver `.agents/tasks/completed/TASK-010-modais-import-export-artefato.md`). As 3 visualizações de diagrama são full-bleed com chrome próprio (Diagrama de Classes/Objetos usam `DiagramShell`; Visão do Sistema usa seu próprio shell `.system-view-shell` + `.ov-nav`/`.ov-detail`) — nenhuma usa mais `AppLayout`.

## Feedback do usuário — já virou task (`bootstrap-plan`, 2026-08-29)

Registrado em 2026-08-29, durante a sessão de validação manual das TASK-001..005 (usuário logado de fato pela primeira vez, testando a hierarquia Organização→Projetos→Diagramas e o Diagrama de Classes contra o Supabase real). Os 5 itens já viraram ADR/task em `.agents/tasks/backlog/`, nenhuma iniciada ainda:

1. **Falta excluir organização e projeto** → `ADR-003` (hard delete + confirmação por nome — RLS/cascade já existiam desde a TASK-001, escopo 100% frontend) → `TASK-011`.
2. **Falta cadastro/gestão de usuários na UI** (RN-03 da TASK-001 só no schema/RLS, sem UI) → `ADR-004` (vincular usuário já cadastrado, por e-mail — sem Edge Function/convite real nesta rodada) → `TASK-012` (`supabase-multitenant`: RPC `find_user_id_by_email`) → `TASK-013` (`frontend-diagramas`, depende da TASK-012: tela de gestão de acesso). **Nota**: concluir TASK-013 também é o caminho mais natural para finalmente ter um segundo usuário real e fechar as pendências de isolamento/`visualizador` das TASK-001..004 (ver "Falta um segundo usuário real para fechar o MVP" acima).
3. **Sidebar do Diagrama de Objetos com problema visual** → `TASK-015` (trivial, sem ADR — bug visual + teste de responsividade desktop/mobile pedido explicitamente pelo usuário).
4. **Customização de cor do card de classe** → `ADR-005` (cor interna ao ClassMap, paleta fixa de 20+ cores, fora do contrato JSON público) → `TASK-014`.
5. **Diagrama sem nome próprio ao ser criado** → `TASK-016` (trivial, sem ADR — `diagrams.name` já existe no schema, só faltava o campo na criação).
6. **Objetos não podem ser ligados entre si no Diagrama de Objetos** (feedback de 2026-08-29, revisão da tela publicada — comportamento era deliberado desde a TASK-008, mas o usuário pediu explicitamente para habilitar) → `ADR-006` (link simples entre instâncias, sem os 5 tipos UML/multiplicidade — esses descrevem relação entre classes, não entre objetos concretos; rejeitou paridade visual total com o Diagrama de Classes por inconsistência semântica) → `TASK-017` (`frontend-diagramas`).

## Decisões recentes

- **ADR-001** — Fatiamento do MVP de produção por camada técnica (dados → frontend → integração). Ver `.agents/decisions/README.md`.
- **ADR-002** — Reimplementação idiomática em React do design/UX validado no artefato-protótipo ClassMap (rejeitou vendorizar o motor vanilla JS do artefato e rejeitou um rollout "tokens primeiro" sem as tasks seguintes já definidas). Ver `.agents/decisions/README.md`.
- **ADR-003** — Exclusão de organização/projeto: hard delete com confirmação por nome (rejeitou soft delete/arquivamento por esforço desproporcional ao pedido). Ver `.agents/decisions/README.md`.
- **ADR-004** — Gestão de acesso de usuários: vincular usuário já cadastrado por e-mail via RPC nova, sem Edge Function/convite real nesta rodada (rejeitou introduzir a primeira infraestrutura server-side do projeto). Ver `.agents/decisions/README.md`.
- **ADR-005** — Customização de cor do card de classe: interna ao ClassMap, fora do contrato JSON público (mesmo precedente de posição/layout, TASK-003). Ver `.agents/decisions/README.md`.
- **ADR-006** — Diagrama de Objetos: link simples entre instâncias, sem os 5 tipos UML/multiplicidade (rejeitou paridade visual total com o Diagrama de Classes por inconsistência semântica entre instâncias concretas). Ver `.agents/decisions/README.md`.

## Riscos atuais

- **Orçamento**: manter a operação dentro de R$ 50/mês depende dos planos gratuitos da Vercel/Supabase continuarem cobrindo o uso do time conforme ele cresce.
- **Fidelidade do parser `.vpp`**: a prova de conceito validou 100% de fidelidade contra um único arquivo real do GeoCloudAI — outros arquivos `.vpp` (Elims, ou GeoCloudAI mais recentes) podem expor casos não cobertos pelo parser original.
- **Contrato JSON com agentes externos**: agora um schema Zod executável (TASK-005, `src/features/import-export/schema.ts`), não mais só documentação — o risco de "mudança silenciosa" ficou mais concreto, não menor: qualquer PR que toque esse arquivo sem ADR quebra agentes de IA rodando em Elims/GeoCloudAI de verdade, e o schema atual só cobre Diagrama de Classes (Diagrama de Objetos ainda não tem conversão implementada).

## Não fazer agora

- Automação de CI/publicação automática de diagramas a cada merge (roadmap "avançado", fora de escopo do MVP).
- Aba de "casos de uso" (quarta visualização) — roadmap, ainda não especificado em detalhe.
- Cursores de colaboração em tempo real estilo Figma — decisão explícita de manter só lista de presença.
- RBAC granular além de visualizador/editor — decisão explícita de manter simples.
