---
id: TASK-044
title: Transição de profundidade na navegação Organizações→Projetos→Diagramas
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [navigation]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-044 — Transição de profundidade na navegação hierárquica

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Continuidade".

`AppLayout.tsx` renderiza `<main>{children}</main>`, onde `children` é a página roteada (`OrganizationsPage` → `ProjectsPage` → `DiagramTypeListPage`/lista por tipo, ver `ADR-008`). Hoje a troca de página ao navegar entre níveis é instantânea — sem nenhuma pista visual de que se está descendo (ou subindo) um nível na hierarquia Organização→Projetos→Diagramas.

## Problema

Navegar entre os 3 níveis da hierarquia não comunica direção/profundidade — a troca de tela é idêntica visualmente a qualquer outra mudança de estado do app.

## Objetivo

Uma transição sutil de profundidade (fade + deslocamento horizontal de 8px, ~200ms, `cubic-bezier(0.16, 1, 0.3, 1)`) ao trocar de página dentro de `AppLayout`, na direção da navegação (entrando da direita ao descer um nível, da esquerda ao subir) — sem virar uma page-transition de site de marketing.

## Fora de escopo

- As 3 telas de diagrama (Classes/Objetos/Visão do Sistema) — usam seu próprio shell full-bleed (`DiagramShell`/`.system-view-shell`), não `AppLayout` (ver `.agents/context/CONTEXT.md`, "Redesign das telas de diagrama"). Esta task cobre só as páginas que passam por `AppLayout` (Organizações, Projetos, listas de diagrama por tipo).
- Transição entre as 3 visualizações de diagrama dentro do mesmo diagrama — não existe esse conceito hoje (são rotas distintas por tipo, ADR-008), fora de escopo.
- Adicionar breadcrumb visual novo — só a transição da própria página, o cabeçalho (`.app-header`) já é fixo e não participa da transição.

## Comportamento atual

`<main>{children}</main>` troca de conteúdo instantaneamente a cada navegação de rota.

## Comportamento esperado

- `AppLayout.tsx` usa `useLocation()` (react-router-dom) para saber a rota atual, e `key={location.pathname}` no wrapper de `children` (ou um wrapper interno) para forçar remontagem a cada troca de rota — mesmo padrão mecânico já usado em `EntityDetail`/`ov-detail-in` (TASK-035), reaproveitando a convenção.
- Direção do deslocamento: heurística simples baseada em profundidade do path (contar segmentos de `location.pathname`) — mais segmentos que a rota anterior = "descendo" (entra da direita); menos segmentos = "subindo" (entra da esquerda). Se a heurística não for trivial de implementar com o roteamento atual, um deslocamento fixo (sempre da direita) é uma alternativa aceitável — registrar a escolha em "Decisões".
- Fade (opacity 0→1) + `translateX(8px ou -8px)→translateX(0)`, ~200ms.
- Bloco de `prefers-reduced-motion: reduce` próprio, removendo o `translateX` e mantendo só o fade.

## Regras de negócio

- RN-01: a transição nunca atrasa a interatividade da nova página — o conteúdo já deve responder a clique/teclado durante a animação (não é um "loading", é só entrada visual).

## Critérios de aceitação

- [ ] CA-01: navegar Organizações → Projetos → lista de diagramas por tipo mostra a transição de entrada em cada troca, nos dois temas.
- [ ] CA-02: navegar de volta (nível acima) mostra a transição na direção oposta (ou o comportamento fixo documentado em "Decisões", se essa for a escolha).
- [ ] CA-03: `prefers-reduced-motion: reduce` remove o `translateX`, mantendo só o fade.
- [ ] CA-04: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/navigation/AppLayout.tsx`, `src/index.css` (nova classe de transição de página).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [ ] Trabalhar em worktree git isolado, branch `task/044-animacao-navegacao` criada a partir de `feature/animacoes-sistema`.
- [ ] `AppLayout.tsx`: `useLocation()` + `key={location.pathname}` no wrapper de `children`, com a heurística de direção (ou o fallback fixo, documentando a escolha).
- [ ] `src/index.css`: keyframe/classe de entrada com fade + `translateX`, bloco de reduced-motion próprio.
- [ ] Validar visualmente a navegação completa Organizações → Projetos → Diagramas (por tipo) e de volta.
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: se a heurística de direção virar uma função pura, testá-la isoladamente.
- [ ] Manual: navegador embutido, navegação completa nos dois sentidos, dark/light, `prefers-reduced-motion` ligado e desligado.

## Riscos e rollback

Risco baixo — mudança isolada a `AppLayout.tsx` + 1 regra CSS nova, sem tocar as 3 telas de diagrama. Atenção a não introduzir flash de conteúdo vazio durante a remontagem por `key` (mesma armadilha que a TASK-035 já navegou com sucesso). Rollback: reverter `AppLayout.tsx` e a classe de transição em `index.css`.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum handoff pendente — task recém-criada, ainda não implementada.
