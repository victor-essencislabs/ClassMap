---
id: TASK-022
title: Agrupar a listagem de diagramas por tipo (rotas dedicadas)
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [navigation]
related_use_cases: []
related_adrs: [ADR-008]
---

# TASK-022 — Agrupar a listagem de diagramas por tipo

## Contexto
Feedback do usuário (2026-08-31): a `DiagramsPage` lista todos os diagramas de um projeto numa lista só, misturando os 3 tipos (Classes/Objetos/Visão do Sistema). Decisão de arquitetura registrada em `ADR-008`: duas rotas novas por tipo (cards de tipo → lista por tipo → painel), sem migração de schema, reaproveitando o padrão de despacho por valor já usado em `DiagramRouterPage`.

## Problema
Um projeto com vários diagramas de tipos diferentes mostra tudo misturado numa lista só (`src/features/navigation/DiagramsPage.tsx`), dificultando encontrar rapidamente "todos os Diagramas de Classes" ou "todas as Visões do Sistema" à medida que o projeto cresce.

## Objetivo
`DiagramsPage` (`/orgs/:orgId/projects/:projectId`) passa a mostrar 3 cards de tipo, com contagem; clicar num card leva a uma lista só dos diagramas daquele tipo, com o botão de criar já específico daquele tipo; clicar num item da lista abre o painel, como hoje.

## Fora de escopo
- Qualquer mudança de schema — `diagrams.type` já existe e não muda.
- Mudar a rota de abertura de um diagrama específico (`/diagrams/:diagramId`, UUID) — continua igual, só o componente que a atende ganha uma checagem prévia por valor (ver ADR-008).
- Uma 4ª visualização (roadmap "casos de uso") — fora de escopo até ser especificada.

## Comportamento atual
`DiagramsPage.tsx` busca `listDiagrams(projectId)` e renderiza todos numa `<ul>` só, com um badge de tipo por item (`DIAGRAM_TYPE_LABELS[diagram.type]`) e 3 botões de criar juntos no rodapé (um por tipo).

## Comportamento esperado
- `DiagramsPage` (mesma rota `/orgs/:orgId/projects/:projectId`) passa a renderizar 3 cards — um por `DiagramType` (`classes`, `objects`, `system-view`) — cada um com o label (`DIAGRAM_TYPE_LABELS`) e a contagem de diagramas daquele tipo já existentes no projeto (`diagrams.filter(d => d.type === type).length`).
- Clicar num card navega para `/orgs/:orgId/projects/:projectId/diagrams/:type` (`type` = valor literal `'classes' | 'objects' | 'system-view'`).
- Essa nova rota renderiza uma página (`DiagramTypeListPage` ou nome equivalente) que reaproveita a lógica hoje em `DiagramsPage` (fetch + lista + modal de nome + criar), mas filtrada por `type` — o botão de criar já é só "+ Diagrama de Classes" (ou o tipo correspondente), sem os outros dois juntos.
- Em `App.tsx`, a rota `/orgs/:orgId/projects/:projectId/diagrams/:x` passa a ser atendida por um componente que primeiro checa se `x` é um dos 3 valores de `DiagramType` conhecidos: se for, renderiza a nova lista por tipo; se não for, trata como `diagramId` (UUID) e delega para o `DiagramRouterPage` já existente, sem nenhuma mudança de comportamento aí.
- Clicar num item da lista por tipo continua indo para `/orgs/:orgId/projects/:projectId/diagrams/:diagramId`, sem mudança.

## Regras de negócio
Nenhuma nova — RN-01/RN-02 da TASK-002 (reforço de UI por papel, RLS é a autorização real) continuam valendo sem alteração.

## Critérios de aceitação
- [x] CA-01: `DiagramsPage` mostra os 3 cards de tipo com a contagem correta de diagramas já criados no projeto. Coberto por teste automatizado (`DiagramsPage.test.tsx`, "CA-01").
- [x] CA-02: Clicar num card navega para a lista daquele tipo, mostrando só diagramas desse tipo. Coberto por teste automatizado (`DiagramsPage.test.tsx` "CA-02" para o link; `DiagramTypeListPage.test.tsx` "CA-02" para o filtro).
- [x] CA-03: Criar um novo diagrama a partir da lista por tipo já cria com o tipo certo, sem exigir escolher o tipo de novo. Coberto por teste automatizado (`DiagramTypeListPage.test.tsx`, "CA-03").
- [x] CA-04: Abrir um diagrama existente pela lista (UUID) continua funcionando, sem regressão em nenhuma das 3 visualizações. Coberto por teste automatizado (`DiagramsRouteDispatcher.test.tsx`, "CA-04").
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos. Ver "Validação".

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/navigation/DiagramsPage.tsx` (vira a tela de 3 cards); nova página (ex.: `DiagramTypeListPage.tsx`) com a lógica hoje em `DiagramsPage` filtrada por tipo; `src/App.tsx` (rota `/orgs/:orgId/projects/:projectId/diagrams/:x` passa a despachar por valor antes de delegar a `DiagramRouterPage`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma nova.

## Plano de implementação
- [x] `DiagramsPage.tsx` vira 3 cards com contagem por tipo (mantém o fetch de `listDiagrams`, só muda a renderização e a navegação).
- [x] Extrair/criar `DiagramTypeListPage.tsx` com a lista + modal de criação hoje em `DiagramsPage`, filtrada por `type` (recebido via prop, não `useParams` diretamente — quem lê o param é o despachante).
- [x] Componente despachante (`DiagramsRouteDispatcher.tsx`) em `src/features/navigation/` que decide, pelo valor do parâmetro, entre a lista por tipo e o `DiagramRouterPage` existente.

## Estratégia de testes
- [x] Componente: `DiagramsPage.test.tsx` — cards mostram contagem certa, link aponta para a rota certa (reescrito, a lista misturada saiu daqui).
- [x] Componente: `DiagramTypeListPage.test.tsx` (novo) — filtra corretamente, cria já com o tipo certo (testes migrados do antigo `DiagramsPage.test.tsx`, TASK-016).
- [x] Componente: `DiagramsRouteDispatcher.test.tsx` (novo) — um slug de tipo abre a lista (dentro de `AppLayout`), um UUID continua abrindo o painel de diagrama (sem `AppLayout`, CA-04).
- [x] Manual: navegar pelos 3 tipos, abrir um existente — contra produção real. Feito nesta sessão: o usuário logou no dev server local; o agente navegou Organizações ("Essencis Labs") → Projetos ("ELIMS") → Diagramas (os 3 cards, com contagem real: "2 painéis"/"1 painel"/"1 painel") → "Diagrama de Classes" (lista só os 2 diagramas desse tipo, botão "+ Diagrama de Classes") → abriu "teste de classes", um diagrama real com 5 classes/2 relações (Equipment, EquipmentMaintenance, Reagent, ReagentLot, XrfMeasurement) — abriu normalmente, sem regressão (CA-04). Não criou um diagrama novo ao vivo (CA-03 já coberto por teste automatizado; evitado para não acumular dado de teste na conta real do usuário).

## Riscos e rollback
Risco baixo-médio — mexe em rota compartilhada (`/diagrams/:x`), então testar bem a checagem por valor para não quebrar a abertura de diagramas existentes (CA-04 é o critério mais importante de não regressão). Rollback: reverter `DiagramsPage.tsx`, remover a página nova e a rota, restaurando o componente único em `App.tsx`.

## Registro de execução
### Alterações realizadas
`DiagramsPage.tsx` deixou de buscar/exibir a lista de diagramas — agora só busca `listDiagrams` para contar por tipo e renderiza 3 itens (`entity-list`, mesmo padrão visual de Organizações/Projetos) linkando para `/diagrams/:type`. Toda a lógica que estava lá (fetch + papel do usuário + modal de nome + criação, filtrada por tipo) foi extraída para `DiagramTypeListPage.tsx`, que recebe `type` como prop (não lê da URL diretamente — quem lê o parâmetro da URL e decide o que renderizar é o novo `DiagramsRouteDispatcher.tsx`, que substituiu `DiagramRouterPage` diretamente na rota `/diagrams/:diagramId` em `App.tsx`: se o parâmetro bate com um dos 3 valores de `DiagramType` (`isDiagramType`, novo helper em `diagramTypeLabels.ts`), renderiza `DiagramTypeListPage` dentro de `AppLayout`; senão, delega para o `DiagramRouterPage` original, sem nenhuma mudança nele). `DIAGRAM_TYPE_LABELS` saiu de dentro de `DiagramsPage.tsx` para o novo módulo compartilhado `diagramTypeLabels.ts` (também exporta `DIAGRAM_TYPES` e `isDiagramType`), evitando duplicar o mapa de rótulos entre as duas páginas e o despachante.

### Arquivos principais
- `src/features/navigation/diagramTypeLabels.ts` (novo) — `DIAGRAM_TYPE_LABELS`/`DIAGRAM_TYPES`/`isDiagramType`.
- `src/features/navigation/DiagramsPage.tsx` — virou a tela de 3 cards.
- `src/features/navigation/DiagramTypeListPage.tsx` (novo) — lista + criação por tipo (lógica que saiu de `DiagramsPage`).
- `src/features/navigation/DiagramsRouteDispatcher.tsx` (novo) — despacha `/diagrams/:x` por valor.
- `src/App.tsx` — rota `/diagrams/:diagramId` passou a apontar para `DiagramsRouteDispatcher`.
- `src/features/navigation/DiagramsPage.test.tsx` (reescrito), `DiagramTypeListPage.test.tsx` (novo), `DiagramsRouteDispatcher.test.tsx` (novo).

### Decisões
- O parâmetro de rota continuou se chamando `:diagramId` (não renomeado para algo genérico tipo `:x`) — `DiagramEditorPage`/`ObjectDiagramPage`/`SystemViewPage`/`DiagramRouterPage` já leem `useParams<{ diagramId: string }>()` dentro do mesmo match de rota; renomear o param quebraria todos eles sem necessidade real, já que o dispatcher lê o mesmo `diagramId` e só decide o que fazer com o valor.
- `DiagramTypeListPage` recebe `type` via prop (decidido pelo dispatcher), não via `useParams` direto — evita duplicar a lógica de "isDiagramType" dentro da própria página.
- Sem ADR novo — a decisão de arquitetura já estava em `ADR-008`, gerada no planejamento; esta task só implementa o que lá foi decidido.

### Divergências
Nenhuma — implementação seguiu o "Comportamento esperado" da task e o plano de adoção do `ADR-008`.

### Pendências
Nenhuma — validado ao vivo contra produção real nesta mesma sessão, depois que o usuário logou no dev server local (ver "Estratégia de testes"). Só a criação de um diagrama novo pelo fluxo por tipo (CA-03) não foi exercitada ao vivo, coberta por teste automatizado.

## Validação
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, mesmos 3 warnings pré-existentes em `Toast.tsx`/`AuthContext.tsx`, nenhum novo).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — ok, 24 arquivos / 164 testes passando.
- Verificação ao vivo: `npm run dev` local (via Browser pane, usuário logado), navegação completa Organizações→Projetos→Diagramas (3 cards com contagem real)→lista por tipo→abertura de diagrama real, sem erros de console, sem regressão.

## Handoff
Nenhum — todas as CAs fechadas com evidência (automatizada + manual ao vivo). Movida para `completed/` via `bootstrap-complete` (2026-08-31).
