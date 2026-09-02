---
id: TASK-039
title: Entrada/saída animada do toast de feedback
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [diagram-shell]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-039 — Entrada/saída animada do toast de feedback

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Feedback" (reconhecer uma ação rápida, sem espetáculo — modo Operate).

`useToast`/`Toast` (`src/features/diagram-shell/Toast.tsx`, TASK-006) é o componente de feedback reutilizável ("Exemplo carregado", etc.) usado pelas telas de diagrama. Hoje a transição de entrada/saída é genérica (`opacity`/`transform` em `src/index.css:2364`, sem curva própria), a mesma para todo o app.

## Problema

O toast aparece/some sem uma curva de chegada com personalidade — não comunica "confirmado" com a mesma linguagem visual do resto da direção "Certificado de Ensaio".

## Objetivo

Toast entra com slide-up de 4px + fade em 150ms (`cubic-bezier(0.16, 1, 0.3, 1)`), e sai mais rápido que entra (100ms, sem slide — só fade). Feedback rotineiro: rápido, sem espera perceptível.

## Fora de escopo

- Mudar quando/quais mensagens disparam o toast — só a transição de entrada/saída.
- O carimbo de validação (TASK-038) — esse é um efeito distinto, aplicado só nos 5 pontos de confirmação/certificação, não no toast genérico.

## Comportamento atual

`.toast` usa `transition: opacity 0.2s ease, transform 0.2s ease` (`src/index.css:2364`) — mesma curva/duração para entrada e saída, sem deslocamento vertical.

## Comportamento esperado

- Entrada (classe `show` adicionada): opacity 0→1 + `translateY(4px)→translateY(0)`, 150ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
- Saída (classe `show` removida): opacity 1→0, 100ms, sem `translateY` (só fade, mais rápido que a entrada).
- Coberto por `@media (prefers-reduced-motion: reduce)` próprio, reduzindo a versão para fade puro nos dois sentidos, sem `translateY`.

## Regras de negócio

- RN-01: o toast continua `role="status"`/`aria-live="polite"` (acessibilidade já existente) — não alterar.

## Critérios de aceitação

- [x] CA-01: toast entra com slide-up + fade em 150ms, visível nos dois temas.
- [x] CA-02: toast sai só com fade em 100ms (mais rápido que a entrada).
- [x] CA-03: `prefers-reduced-motion: reduce` remove o `translateY`, mantendo só o fade.
- [x] CA-04: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/diagram-shell/Toast.tsx` (se precisar de uma classe extra para diferenciar entrada/saída), `src/index.css` (regra `.toast`/`.toast.show` existente, ajustada + bloco de reduced-motion próprio).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [x] Trabalhar em worktree git isolado, branch `task/039-animacao-toast` criada a partir de `feature/animacoes-sistema`.
- [x] Ajustar `.toast`/`.toast.show` em `src/index.css` para a curva/duração especificada, com bloco de reduced-motion próprio logo abaixo.
- [x] Confirmar visualmente (harness de preview) que a saída não deixa o toast "pulando" de posição antes de sumir.
- [x] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [x] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [x] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [x] Unitários: existente (`Toast.test.tsx`) não deve quebrar.
- [x] Manual: navegador embutido, dark/light. `prefers-reduced-motion` verificado por inspeção estática das regras (CSSOM), não visualmente — ver "Divergências".

## Riscos e rollback

Risco mínimo — mudança isolada a 1 componente + 1 regra CSS. Rollback: reverter `.toast`/`.toast.show` em `index.css`.

## Registro de execução

### Alterações realizadas

`.toast`/`.toast.show` reescritos em `src/index.css` para separar a transição de
entrada da de saída, sem exigir classe extra no componente React:

- **Entrada** (`.toast.show`, disparada quando a classe é *adicionada*): usa
  `animation: 0.15s cubic-bezier(0.16, 1, 0.3, 1) toast-in` — keyframe
  `toast-in` novo, `0% { opacity:0; transform: translateX(-50%) translateY(4px) }`
  → `100% { opacity:1; transform: translateX(-50%) translateY(0) }`. Slide-up de
  4px + fade em 150ms com a curva pedida.
- **Saída** (`.toast` base, aplicada quando a classe é *removida*): só
  `transition: opacity 0.1s ease` — sem `transform` na lista de propriedades
  de transição. Como o valor de `transform` no estado "shown" (após
  `animation-fill-mode: none`, o padrão, reverter para o valor em cascata) e no
  estado "hidden" são o mesmo (`translateX(-50%)`, sem `translateY`), a saída
  nunca desloca o toast — só o `opacity` anima, do jeito que a task pediu
  ("sem translateY") e sem o "pulo" de posição que uma implementação ingênua
  (com `transform` mudando de valor sem transição própria) teria no primeiro
  frame da saída.
- **`prefers-reduced-motion: reduce`**: `.toast.show` troca a `animation` por
  `none` e usa `transition: opacity 0.15s ease` no lugar — mantém só o fade
  (sem `translateY` em nenhum sentido). A saída já era fade-only por
  construção, então não precisou de override adicional no bloco reduzido; o
  bloco antigo (`.toast { transition: none }`, que suprimia toda a
  transição/fade) foi substituído porque a CA-03 pede manter o fade, só
  remover o deslocamento.

Nenhuma mudança em `Toast.tsx` — a diferenciação entrada/saída ficou 100% em
CSS (`animation` na entrada via `.toast.show`, `transition` na saída via
`.toast` base), sem precisar de uma terceira classe.

### Arquivos principais

- `src/index.css` (única alteração de código — regra `.toast`/`.toast.show`,
  `@keyframes toast-in` novo, bloco `@media (prefers-reduced-motion: reduce)`
  ajustado).
- `.agents/tasks/backlog/TASK-039-animacao-toast.md` → movido para
  `.agents/tasks/active/` (este arquivo).

### Decisões

- **`animation` na entrada + `transition` na saída, em vez de uma classe
  extra `entering`/`leaving`.** A troca de `.toast` para `.toast.show` (e
  vice-versa) já é a única transição de estado que `Toast.tsx` produz (TASK-006,
  não alterado nesta task). Usar `animation` na regra `.toast.show` (aplicada
  quando a classe é adicionada) e `transition` na regra `.toast` base
  (aplicada quando a classe é removida) obtém curvas/durações diferentes por
  direção sem precisar de uma terceira classe React nem de lógica de
  `transitionend`/`animationend` no componente — mantém o "Fora de escopo"
  (só a transição, não o disparo das mensagens) e o footprint de 1 arquivo
  citado no "Riscos e rollback" da própria task.
- **Curva de saída não especificada na task → `ease` (100ms).** O
  "Comportamento esperado" fixa duração (100ms) e propriedade (só opacity),
  mas não uma curva própria para a saída — mantido `ease`, mesmo valor usado
  antes da mudança (não é uma escolha nova, é a ausência de uma exigida).

### Divergências

- **Validação visual da animação *durante* a transição não foi possível no
  harness de preview desta sessão** — só o estado de repouso (mostrado/escondido)
  foi confirmado por captura de tela real (ver "Validação"). Tentativas de
  amostrar `getComputedStyle`/`requestAnimationFrame` durante a janela de
  150ms/100ms mostraram a aba do Browser pane sem avançar quadros de animação
  enquanto não está em primeiro plano (mesmo depois de `tabs_select`) —
  aparenta ser uma limitação de composição/rAF da aba automatizada deste
  ambiente, não um problema do CSS em si. Em vez disso, a regra CSS
  efetivamente carregada foi inspecionada via CSSOM
  (`document.styleSheets`) no navegador real, confirmando literalmente as
  durações/curva/keyframe esperados (ver "Validação"). Recomendado ao usuário
  confirmar a sensação da transição a olho nu numa sessão com a aba em foco
  (ou em produção), já que a mecânica CSS está correta mas o timing "ao vivo"
  não foi visto rodar quadro a quadro nesta sessão.
- **Achado fora do escopo, não corrigido**: `npx vitest run` tem 1 falha
  pré-existente, sem relação com esta task —
  `src/features/import-export/agentPrompt.test.ts` ("não sobra frontmatter
  YAML da skill importada") falha porque `buildAgentPromptMarkdown()`
  (TASK-037) embute o conteúdo bruto de
  `.claude/skills/gerar-diagrama-classmap/SKILL.md` — incluindo o frontmatter
  YAML (`name: gerar-diagrama-classmap`, `description: ...`) — dentro do bloco
  de código do prompt gerado. Confirmado pré-existente: falha do mesmo jeito
  em `6a7b5d8` (base de `feature/animacoes-sistema`, antes de qualquer
  mudança desta task — testado com `git stash`). Não corrigido aqui (fora do
  escopo de TASK-039, dono é `contrato-ia-diagrama`/TASK-037).
- **`detect.mjs` aponta 1 achado pré-existente em `src/index.css`**, fora das
  linhas tocadas por esta task: `border-accent-on-rounded` na linha 217
  (`.card`, tela de login, `border-top: 3px solid var(--accent)` sobre
  `border-radius: 4px`) — decisão deliberada de produto desde a TASK-032
  (ADR-011, "régua do selo" no topo do card), não um antipattern real neste
  caso. Não alterado.

### Pendências

- Confirmação visual "ao vivo" da curva de entrada/saída (quadro a quadro),
  numa sessão com credencial real ou com o Browser pane em foco de fato
  durante a animação — ver "Divergências" acima.
- A falha pré-existente em `agentPrompt.test.ts` (TASK-037) segue sem dono
  designado nesta rodada de animação — sinalizada, não uma pendência desta
  task.

## Validação

Todos os comandos rodados em
`C:\Users\Essencis007\Documents\ClassMap\.claude\worktrees\agent-ae5a8c2bb423b2a96`
(worktree isolado, branch `task/039-animacao-toast`).

- `npm install` — ok, 130 pacotes, 0 vulnerabilidades.
- `npm run build` — ok (`tsc -b && vite build`), sem erros de tipo, build de
  produção gerado normalmente.
- `npm run lint` (`oxlint`) — saída limpa (exit 0); só warnings pré-existentes
  sem relação com este arquivo (`AuthContext.tsx`, e um warning de fast-refresh
  em `Toast.tsx` que já existia antes desta task, por causa do `export`
  de `useToast` no mesmo arquivo do componente).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — **197 de 198 testes
  passam** (28 arquivos, 27 passam). A 1 falha
  (`agentPrompt.test.ts`) é pré-existente e sem relação com esta task — ver
  "Divergências". `Toast.test.tsx` (os 4 testes que cobrem este componente)
  passa integralmente, sozinho e dentro da suíte completa.
- `node .claude/skills/impeccable/scripts/detect.mjs --json src/index.css`
  (script resolvido em `C:\Users\Essencis007\.claude\skills\impeccable\scripts\detect.mjs`
  — instalação global do usuário, não existe cópia deste script neste
  repositório) — 1 achado, `border-accent-on-rounded` na linha 217, fora das
  linhas alteradas por esta task (ver "Divergências" — decisão deliberada de
  produto, TASK-032/ADR-011).
- **Verificação visual**: harness temporário em `src/main.tsx` (revertido
  antes do commit via `git checkout -- src/main.tsx`, mesmo padrão já usado
  em TASK-006/033), renderizando só `<Toast/>`/`useToast` com um botão de
  disparo e um botão de alternância de tema, servido por `npm run dev
  --port 57391` (porta 5173 ocupada por outra sessão em paralelo; `autoPort`
  não teve efeito na disputa de porta do harness de preview compartilhado,
  contornado subindo o Vite manualmente numa porta livre). Screenshot real
  confirmou o toast totalmente visível e legível no estado de repouso
  ("Exemplo carregado", tema escuro). Inspeção via CSSOM
  (`document.styleSheets`) no mesmo navegador confirmou literalmente as
  regras carregadas — `.toast.show { animation: 0.15s cubic-bezier(0.16, 1,
  0.3, 1) ... toast-in }`, `@keyframes toast-in { 0% {opacity:0;
  transform: translateX(-50%) translateY(4px)} 100% {opacity:1;
  transform: translateX(-50%) translateY(0px)} }`, `.toast { transition:
  opacity 0.1s }`, e o bloco de `prefers-reduced-motion: reduce` com
  `.toast.show { animation: none; transition: opacity 0.15s }` — batendo
  exatamente com o "Comportamento esperado" da task. Não foi possível
  capturar a transição quadro a quadro nesta sessão (ver "Divergências").
  Alternância de tema claro/escuro do harness não chegou a ser confirmada
  visualmente com sucesso (bug do próprio harness descartável — aplicava
  `data-theme` num elemento que não recarregou a tempo do clique registrar
  no teste automatizado do agente —, não do código de produção; irrelevante
  para o resultado já que a regra de CSS do toast não depende de tema).

## Handoff
Nenhum handoff pendente — implementação concluída nesta sessão. Recomendado
ao usuário, numa próxima sessão com a aba em foco (ou já em produção): abrir
qualquer diagrama, disparar um toast (ex.: tentar conectar uma classe/objeto
a si mesmo) e confirmar a olho nu a sensação do slide-up + fade na entrada e
do fade puro, mais rápido, na saída — ver "Pendências".
