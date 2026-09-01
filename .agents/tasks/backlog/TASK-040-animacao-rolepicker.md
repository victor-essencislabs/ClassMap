---
id: TASK-040
title: Transição do carimbo ao trocar de papel no RolePicker
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [navigation]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-040 — Transição do carimbo ao trocar de papel no RolePicker

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Feedback".

`RolePicker` (`src/features/navigation/RolePicker.tsx`, TASK-036/ADR-011, raise "Painel Catódico") mostra os 2 papéis de acesso sempre lado a lado — o concedido "carimbado" (`--accent` sólido, `.role-picker-opt.active`), o outro como marca fantasma (contorno fraco). Hoje a troca entre os dois é seca (a classe `active` muda, sem transição).

## Problema

Trocar de papel no `RolePicker` não comunica "o carimbo passou de uma opção para a outra" — só troca de estado instantaneamente, o que é inconsistente com a metáfora de carimbo já estabelecida no resto da direção.

## Objetivo

Ao trocar `value` no `RolePicker`, o preenchimento sólido (`--accent`) desliza/faz fade de uma opção para a outra em ~200ms, `cubic-bezier(0.16, 1, 0.3, 1)` — nunca um corte seco, nunca as duas opções carimbadas ao mesmo tempo.

## Fora de escopo

- Mudar a estrutura/acessibilidade do `RolePicker` (`role="radiogroup"`, `role="radio"`, `aria-checked`) — só a transição visual do preenchimento.
- Outros seletores de opção do app (`EdgeTypeGrid`, `ClassColorGrid`) — só `RolePicker` nesta task, mesmo que usem padrão visual parecido.

## Comportamento atual

`className={opt.value === value ? 'role-picker-opt active' : 'role-picker-opt'}` — troca de classe sem transição declarada em `src/index.css`.

## Comportamento esperado

- `.role-picker-opt` ganha `transition: background-color 200ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms cubic-bezier(0.16, 1, 0.3, 1)` (ou equivalente, cobrindo as propriedades que mudam entre fantasma e carimbado).
- Nunca animar `width`/`padding`/posição (evita reflow) — só cor/preenchimento.
- Bloco de `prefers-reduced-motion: reduce` próprio, reduzindo para transição instantânea (mantendo a troca de estado, só sem a animação).

## Regras de negócio

- RN-01: a transição nunca deve fazer os 2 botões parecerem "carimbados" simultaneamente durante o meio do movimento — a troca é de preenchimento (cor), não de opacidade cruzada entre os dois elementos.

## Critérios de aceitação

- [ ] CA-01: ao clicar na opção não-selecionada, o preenchimento transiciona suavemente em ~200ms, nos 3 usos do componente (`AccessManagementModal`: linha de membro existente, formulário "já tem conta", formulário "criar conta nova").
- [ ] CA-02: nos dois temas (claro/escuro), a transição de cor permanece legível durante o movimento (sem estado intermediário de baixo contraste).
- [ ] CA-03: `prefers-reduced-motion: reduce` remove a transição, mantendo a troca de estado correta.
- [ ] CA-04: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/navigation/RolePicker.tsx` (se precisar de ajuste de estrutura para a transição funcionar), `src/index.css` (`.role-picker-opt`/`.role-picker-opt.active`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [ ] Trabalhar em worktree git isolado, branch `task/040-animacao-rolepicker` criada a partir de `feature/animacoes-sistema`.
- [ ] Ajustar `.role-picker-opt` em `src/index.css` com as transições especificadas + bloco de reduced-motion próprio.
- [ ] Validar visualmente nos 3 pontos de uso (`AccessManagementModal`), nos dois temas.
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: existente (`RolePicker` coberto indiretamente via `AccessManagementModal.test.tsx`) não deve quebrar.
- [ ] Manual: navegador embutido, dark/light, `prefers-reduced-motion` ligado e desligado, nos 3 pontos de uso do componente.

## Riscos e rollback

Risco mínimo — mudança isolada a 1 componente + 1 regra CSS, sem mudança de comportamento/acessibilidade. Rollback: reverter `.role-picker-opt` em `index.css`.

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
