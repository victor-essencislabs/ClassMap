---
id: TASK-039
title: Entrada/saída animada do toast de feedback
status: backlog
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

- [ ] CA-01: toast entra com slide-up + fade em 150ms, visível nos dois temas.
- [ ] CA-02: toast sai só com fade em 100ms (mais rápido que a entrada).
- [ ] CA-03: `prefers-reduced-motion: reduce` remove o `translateY`, mantendo só o fade.
- [ ] CA-04: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

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

- [ ] Trabalhar em worktree git isolado, branch `task/039-animacao-toast` criada a partir de `feature/animacoes-sistema`.
- [ ] Ajustar `.toast`/`.toast.show` em `src/index.css` para a curva/duração especificada, com bloco de reduced-motion próprio logo abaixo.
- [ ] Confirmar visualmente (harness de preview) que a saída não deixa o toast "pulando" de posição antes de sumir.
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: existente (`Toast.test.tsx`) não deve quebrar.
- [ ] Manual: navegador embutido, dark/light, `prefers-reduced-motion` ligado e desligado.

## Riscos e rollback

Risco mínimo — mudança isolada a 1 componente + 1 regra CSS. Rollback: reverter `.toast`/`.toast.show` em `index.css`.

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
