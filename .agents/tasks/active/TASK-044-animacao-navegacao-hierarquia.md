---
id: TASK-044
title: Transição de profundidade na navegação Organizações→Projetos→Diagramas
status: active
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

- [x] CA-01: navegar Organizações → Projetos → lista de diagramas por tipo mostra a transição de entrada em cada troca, nos dois temas.
- [x] CA-02: navegar de volta (nível acima) mostra a transição na direção oposta (ou o comportamento fixo documentado em "Decisões", se essa for a escolha).
- [x] CA-03: `prefers-reduced-motion: reduce` remove o `translateX`, mantendo só o fade.
- [x] CA-04: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

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

- [x] Trabalhar em worktree git isolado, branch `task/044-animacao-navegacao` criada a partir de `feature/animacoes-sistema`.
- [x] `AppLayout.tsx`: `useLocation()` + `key={location.pathname}` no wrapper de `children`, com a heurística de direção (ou o fallback fixo, documentando a escolha).
- [x] `src/index.css`: keyframe/classe de entrada com fade + `translateX`, bloco de reduced-motion próprio.
- [x] Validar visualmente a navegação completa Organizações → Projetos → Diagramas (por tipo) e de volta.
- [x] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [x] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [x] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [x] Unitários: se a heurística de direção virar uma função pura, testá-la isoladamente.
- [x] Manual: navegador embutido, navegação completa nos dois sentidos, dark/light, `prefers-reduced-motion` ligado e desligado.

## Riscos e rollback

Risco baixo — mudança isolada a `AppLayout.tsx` + 1 regra CSS nova, sem tocar as 3 telas de diagrama. Atenção a não introduzir flash de conteúdo vazio durante a remontagem por `key` (mesma armadilha que a TASK-035 já navegou com sucesso). Rollback: reverter `AppLayout.tsx` e a classe de transição em `index.css`.

## Registro de execução

### Alterações realizadas

- `AppLayout.tsx` ganhou `useLocation()` (react-router-dom) e uma heurística pura exportada (`routeDepth(pathname)` — conta segmentos não vazios do path) para decidir a direção da transição comparando a profundidade da rota atual com a da renderização anterior. Diferente do padrão de `useRef` sugerido inicialmente (ver "Decisões"), a comparação usa `useState` (padrão oficial do React de "guardar informação de renders anteriores": compara durante o render e chama `setState` condicionalmente), evitando o warning `react(refs)` do `oxlint` e um re-render extra desnecessário fora da troca real de rota.
- O wrapper de `children` dentro de `<main>` agora é um `<div key={location.pathname} className="app-page-transition app-page-transition-{direction}">` — mesma mecânica de remontagem por `key` já usada em `EntityDetail`/`ov-detail-in` (TASK-035), reaproveitando a convenção do projeto em vez de inventar uma nova.
- `src/index.css`: bloco novo comentado com o id da task (`TASK-044`), antes do `@media (prefers-reduced-motion: reduce)` global — 3 `@keyframes` (`app-page-in-forward`, `app-page-in-back`, `app-page-in-fade`) e as classes `.app-page-transition`/`.app-page-transition-back` (fade + `translateX(±8px)→0`, 200ms, `cubic-bezier(0.16, 1, 0.3, 1)`, `animation-fill-mode: both` para não expor o estado final antes do frame de animação — mesma preocupação de "flash" já navegada pela TASK-035). Dentro do bloco de reduced-motion global já existente, uma regra a mais troca `animation-name` para `app-page-in-fade` nas duas classes, removendo o `translateX` e mantendo só o fade — sem duplicar o bloco de media query (a task permite reduced-motion "próprio", e reaproveitar o único bloco global já existente evita 2 blocos de reduced-motion concorrentes no mesmo arquivo).
- `AppLayout.test.tsx` (novo): teste unitário de `routeDepth` (3 casos) + 2 testes de integração com `MemoryRouter`/`Routes` confirmando que descer um nível aplica `app-page-transition-forward` e subir aplica `app-page-transition-back`.

### Arquivos principais

- `src/features/navigation/AppLayout.tsx`
- `src/features/navigation/AppLayout.test.tsx` (novo)
- `src/index.css`

### Decisões

- **Heurística de direção implementada de fato** (não foi preciso o fallback fixo documentado na task como alternativa aceitável): contagem de segmentos de `location.pathname` via `routeDepth`, comparada entre a rota atual e a anterior. É trivial com o roteamento atual porque toda navegação da hierarquia (`/` → `/orgs/:orgId` → `/orgs/:orgId/projects/:projectId` → `/orgs/:orgId/projects/:projectId/diagrams/:tipo`) estritamente adiciona ou remove 2 segmentos por nível — não há caso ambíguo dentro do escopo desta task (as 3 telas de diagrama full-bleed, que quebrariam essa contagem monotônica, estão fora de escopo e não passam por `AppLayout`).
- **`useState` em vez de `useRef`** para guardar a profundidade/direção anteriores: a primeira implementação usava `useRef` mutado durante o render (mesma família de padrão), mas o `oxlint` acusou `react(refs): Cannot access refs during render` em 5 pontos. Trocado pelo padrão oficial do React ("storing information from previous renders" — comparar durante o render e chamar `setState` condicionalmente), que resolve os mesmos objetivos sem o aviso de lint e sem introduzir `useEffect` (a task pedia explicitamente para reaproveitar um padrão sem `useEffect`, mesma família do `key`/TASK-035).
- **Reduced-motion**: em vez de um segundo bloco `@media (prefers-reduced-motion: reduce)` "próprio" separado do global, a regra nova de TASK-044 foi anexada dentro do único bloco global já existente no fim de `index.css` (mesmo bloco que já tinha as regras de `.toast`/`ov-detail-in`) — mais simples e sem risco de duas media queries idênticas divergirem com o tempo. A "regra própria" pedida pela task é a regra em si (nova, específica de `.app-page-transition*`), não necessariamente um bloco de media query fisicamente isolado.

### Divergências

- Achado fora de escopo, não corrigido nesta task: `detect.mjs` sinalizou `border-accent-on-rounded` em `src/index.css:217` (`.card { border-top: 3px solid var(--accent); border-radius: 4px; }`), mas essa regra é do `.card` de login, da fundação TASK-032 (ADR-011) — não foi tocada por TASK-044 e não faz parte do escopo desta task (só apareceu porque `detect.mjs` varre o arquivo inteiro, não um diff). Sinalizado para quem revisar a rodada de animação decidir se vira task própria.
- `npx vitest run --exclude "**/.claude/worktrees/**"` mostra 1 falha pré-existente e não relacionada: `src/features/import-export/agentPrompt.test.ts > não sobra frontmatter YAML da skill importada` — confirmado que falha igual no commit-base (`6a7b5d8`, antes de qualquer mudança desta task, via `git stash`), então é uma regressão da TASK-037 (ou do conteúdo atual de `.claude/skills/gerar-diagrama-classmap/SKILL.md`), não introduzida aqui. Não corrigida, por estar fora do escopo desta task. Também foi observada uma falha intermitente em `DiagramsRouteDispatcher.test.tsx > CA-04` ao rodar a suíte completa (timeout de `findByRole` sob carga) que não se reproduz rodando o arquivo isolado nem se relaciona ao código desta task (aquele caminho de rota nem usa `AppLayout`) — registrada aqui por transparência, não como bug desta task.

### Pendências

- Validação visual foi feita contra um harness sintético temporário (`src/main.tsx` sobrescrito com dados fictícios e revertido antes do commit — mesmo padrão já usado nas TASK-033/036), não contra produção real: este worktree não tem `.env.local` com credenciais do Supabase (`isSupabaseConfigured` seria `false`, a app mostraria `NotConfiguredPage`). Recomendado ao usuário confirmar visualmente numa sessão com sessão autenticada real (Organizações → Projetos → lista de diagramas por tipo e volta, nos dois temas), mesma ressalva estrutural já registrada nas demais tasks desta rodada de animação.

## Validação

- `npm install` — 130 pacotes instalados, 0 vulnerabilidades (worktree novo).
- `npm run build` — `tsc -b && vite build` limpo (212 módulos, build em <1.5s).
- `npm run lint` — `oxlint` limpo (0 erros; 4 warnings pré-existentes/de padrão do projeto — `only-export-components` em `Toast.tsx`/`AuthContext.tsx`/`AppLayout.tsx`, mesmo padrão já aceito nesses outros arquivos, e `set-state-in-effect` pré-existente em `AuthContext.tsx`, não tocado por esta task).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — 200 passaram, 1 falhou (`agentPrompt.test.ts`, pré-existente e não relacionada — ver "Divergências"); confirmado que o mesmo teste falha no commit-base sem nenhuma mudança desta task. 3 testes novos de `AppLayout.test.tsx` passando (rodados também isolados, `npx vitest run src/features/navigation/AppLayout.test.tsx` — 3/3 verdes, repetido 2x sem flakiness).
- `node .claude/skills/impeccable/scripts/detect.mjs --json <arquivos alterados>` — rodado via caminho global (`~/.claude/skills/impeccable/scripts/detect.mjs`, este worktree não tem uma cópia local do script) sobre `AppLayout.tsx`, `AppLayout.test.tsx` e `index.css`: 1 achado (`border-accent-on-rounded`, `index.css:217`), pré-existente e fora do escopo desta task (ver "Divergências").
- Validação visual manual: harness temporário (`main.tsx` sobrescrito, revertido antes do commit) servido via `npx vite --port 5188` no navegador embutido — confirmado por inspeção do DOM (`document.querySelector('main > div').className`) que descer um nível (Organizações→Projetos→Diagramas) aplica `app-page-transition-forward` e subir aplica `app-page-transition-back`, em dark e light (`resize_window` com `colorScheme`), sem flash de conteúdo vazio, com o `h1` da página nova sempre correto no momento da checagem (não é um "loading" — RN-01). Confirmado também, inspecionando `document.styleSheets`, que a regra de `prefers-reduced-motion: reduce` existe e troca `animation-name` de `.app-page-transition`/`.app-page-transition-back` para `app-page-in-fade` (sem `translateX`). Não foi possível validar contra produção real — ver "Pendências".

## Handoff

Nenhum handoff pendente — task implementada e validada nesta sessão (ver "Registro de execução"/"Validação"). Única continuação sugerida: confirmação visual contra produção real com sessão autenticada, quando disponível (ver "Pendências").
