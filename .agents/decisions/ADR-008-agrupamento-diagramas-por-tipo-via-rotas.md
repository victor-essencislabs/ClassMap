---
id: ADR-008
title: Agrupamento da listagem de diagramas por tipo — rotas dedicadas, mesmo componente decide pelo valor do parâmetro
status: accepted
date: 2026-08-31
deciders: [victor-essencislabs]
related_tasks: [TASK-022]
---

# ADR-008 — Agrupamento da listagem de diagramas por tipo

## Contexto

Feedback do usuário (2026-08-31): a `DiagramsPage` (`/orgs/:orgId/projects/:projectId`) hoje lista todos os diagramas de um projeto numa lista só, misturando Diagrama de Classes/Objetos/Visão do Sistema. Pedido: agrupar por tipo — o usuário clica em qual tipo quer, vê a listagem dos painéis existentes daquele tipo, e entra no painel específico.

## Decisão

Duas rotas novas por tipo, sem migração de schema:
- `/orgs/:orgId/projects/:projectId` continua existindo, mas `DiagramsPage` passa a mostrar 3 cards (Diagrama de Classes / Diagrama de Objetos / Visão do Sistema), cada um com a contagem de painéis já criados daquele tipo.
- Clicar num card navega para `/orgs/:orgId/projects/:projectId/diagrams/:type` (`type` = `'classes' | 'objects' | 'system-view'`, os mesmos valores já usados em `DiagramType`/`diagrams.type` — sem inventar um novo vocabulário de slug), que lista só os diagramas daquele tipo e tem o botão "+ Novo" específico daquele tipo (hoje os 3 botões ficam juntos na mesma tela).
- A rota de abrir um diagrama específico não muda de formato: continua `/orgs/:orgId/projects/:projectId/diagrams/:diagramId` (UUID). Como React Router não decide por dois componentes diferentes registrados para o mesmo formato de caminho (`/diagrams/:x`), a rota existente vira **um único componente despachante** que primeiro checa se `:x` bate com um dos 3 valores de tipo conhecidos (→ renderiza a lista por tipo) ou não (→ trata como `diagramId` e delega para o `DiagramRouterPage` já existente) — mesmo padrão de despacho por valor que `DiagramRouterPage` já usa hoje para escolher entre `DiagramEditorPage`/`ObjectDiagramPage`/`SystemViewPage` conforme `diagram.type`.

## Alternativas consideradas

### Alternativa B — Abas/seções na mesma URL, sem rota nova
3 seções sempre visíveis (accordion ou abas client-side) na própria `DiagramsPage`, sem navegação adicional nem mudança de rota. Menor mudança de código, mas não corresponde ao fluxo descrito pelo usuário ("ele clica em qual ele quer, aí ele vê a listagem... e entra no painel específico" — dois passos distintos, não uma tela só com tudo visível) e não é linkável (um reload sempre volta ao estado padrão da aba). Rejeitada por não atender ao fluxo pedido.

### Alternativa C — Só reagrupar visualmente a lista atual
Mesma lista/rota de hoje, só com um cabeçalho de seção por tipo acima de cada grupo (`content.filter(d => d.type === t)`), sem navegação nem estado novo. Menor esforço de todos, resolve a mistura visual, mas não entrega o fluxo de dois cliques pedido — continua sendo uma lista só, que cresce indefinidamente conforme o projeto acumula diagramas. Rejeitada pelo mesmo motivo da Alternativa B.

## Consequências

### Positivas
- Fluxo de navegação bate exatamente com o pedido: tipo → lista → painel.
- URL própria e compartilhável por tipo (dá para linkar direto "lista de diagramas de classes deste projeto").
- Escopo 100% `frontend-diagramas` — nenhuma migration, nenhuma mudança de RLS.
- Reaproveita o padrão de despacho por valor já usado em `DiagramRouterPage`, em vez de inventar um mecanismo novo.

### Negativas
- Mais um nível de navegação/breadcrumb (Projeto → Tipo → Painel, antes era Projeto → Painel) — usuários acostumados com o atalho atual (2 cliques até um diagrama) passam a precisar de 3.
- O componente que hoje é só `DiagramRouterPage` (despacha por `diagram.type` depois de buscar o diagrama) ganha uma checagem extra anterior (por valor de string, antes de qualquer busca ao Supabase) — precisa ficar bem comentado para não confundir com o despacho existente.

### Riscos
Nenhum novo seno estritamente de UI — sem RLS, sem contrato JSON.

## Plano de adoção

Uma task só (`TASK-022`, `frontend-diagramas`): `DiagramsPage` vira 3 cards com contagem; nova página de lista por tipo (reaproveitando a maior parte do JSX/lógica que `DiagramsPage` já tem hoje — filtro por `type`, modal de criação); ajuste na rota `/orgs/:orgId/projects/:projectId/diagrams/:x` em `App.tsx` para despachar por valor antes de tratar como `diagramId`.

## Validação

Testes de componente cobrindo: os 3 cards mostram a contagem correta; clicar num card navega para a lista daquele tipo; a lista por tipo só mostra diagramas daquele tipo e cria um novo já com o tipo certo; abrir um diagrama existente (UUID) continua funcionando sem regressão.

## Revisão

Nenhum gatilho previsto — reavaliar só se o produto pedir uma 4ª visualização (roadmap "casos de uso", ainda não especificado) que precise do mesmo padrão de agrupamento.
