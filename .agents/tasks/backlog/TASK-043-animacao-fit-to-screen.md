---
id: TASK-043
title: Assentamento animado do "ajustar à tela" no canvas de diagrama
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [diagram-shell, class-diagram, object-diagram]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-043 — Assentamento animado do "ajustar à tela"

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Continuidade".

**Dependência de merge (não de código)**: esta task toca `ClassDiagramCanvas.tsx` e `ObjectDiagramCanvas.tsx` nos mesmos arquivos que TASK-041 e TASK-042, respectivamente (linhas diferentes). **Só iniciar a mesclagem desta task na branch `feature/animacoes-sistema` depois de TASK-041 e TASK-042 já mescladas** — dispatch do subagente pode ocorrer em paralelo com as demais, mas o merge final é sequencial (wave 2, ver CONTEXT.md).

O botão "Ajustar à tela" (`FitToScreenGlyph`, ⤢) existe no Diagrama de Classes e no Diagrama de Objetos, chamando `zoomPan.fitToScreen(...)` (`useCanvasZoomPan.ts` → `canvasTransform.ts`), que recalcula `zoom`/`pan` para enquadrar todo o conteúdo. Hoje a mudança de transform é aplicada sem transição — o conteúdo "pula" para o novo enquadramento.

## Problema

Clicar em "Ajustar à tela" causa um salto abrupto de zoom/pan, sem comunicar visualmente que é a mesma tela se reenquadrando (não um novo estado).

## Objetivo

Ao chamar `fitToScreen`, o `transform` (translate + scale) do conteúdo do canvas assenta suavemente no novo valor em ~150ms, `cubic-bezier(0.16, 1, 0.3, 1)` — só para esse gesto pontual (nunca durante pan/zoom contínuo por gesto do usuário, que precisa continuar 1:1 para não parecer com lag).

## Fora de escopo

- Transição durante scroll/drag contínuo do canvas — deve continuar 1:1 com o gesto, sem easing.
- Qualquer mudança na lógica de cálculo de `fitToScreen` (`canvasTransform.ts`) — só a aplicação visual da transição.
- Diagrama de Objetos e Diagrama de Classes têm o comportamento idêntico — não introduzir diferença entre os dois.

## Comportamento atual

`useCanvasZoomPan.ts` expõe `fitToScreen(bounds)` que chama `setTransform(fitToScreenTransform(bounds, viewport()))` imediatamente — o elemento que aplica `transform: translate(...) scale(...)` (em `ClassDiagramCanvas.tsx`/`ObjectDiagramCanvas.tsx`) não distingue esse caso de um `setTransform` vindo de pan/zoom contínuo.

## Comportamento esperado

- `useCanvasZoomPan.ts` ganha um jeito de sinalizar "esta mudança de transform deve ser transicionada" (ex.: um `settling: boolean` que fica `true` por ~150ms depois de `fitToScreen` ser chamado, depois volta a `false`) — sem mudar a assinatura pública usada pelos outros consumidores do hook.
- `ClassDiagramCanvas.tsx`/`ObjectDiagramCanvas.tsx`: o elemento com o `transform` inline ganha uma classe condicional (ex.: `settling`) quando o hook sinaliza, ativando `transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1)` só nesse momento — a mesma regra CSS não deve se aplicar durante pan/zoom contínuo por gesto.
- Bloco de `prefers-reduced-motion: reduce` próprio, removendo a transição (o "pulo" imediato já é aceitável como alternativa reduzida — é uma mudança de posição, não uma perda de feedback funcional).

## Regras de negócio

- RN-01: a transição nunca pode interferir com um gesto de pan/zoom iniciado pelo usuário durante o assentamento — se o usuário interagir enquanto anima, o assentamento é interrompido sem erro.

## Critérios de aceitação

- [ ] CA-01: clicar em "Ajustar à tela" no Diagrama de Classes assenta suavemente (~150ms), nos dois temas.
- [ ] CA-02: mesmo comportamento no Diagrama de Objetos.
- [ ] CA-03: pan/zoom por gesto contínuo (scroll/drag) continua 1:1, sem nenhuma transição/lag perceptível.
- [ ] CA-04: `prefers-reduced-motion: reduce` remove a transição, sem quebrar o enquadramento final.
- [ ] CA-05: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/diagram-shell/useCanvasZoomPan.ts`, `src/features/class-diagram/ClassDiagramCanvas.tsx` (mudança de 1 linha — classe condicional no wrapper de transform), `src/features/object-diagram/ObjectDiagramCanvas.tsx` (idem), `src/index.css`.
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [ ] Trabalhar em worktree git isolado, branch `task/043-animacao-fit-to-screen` criada a partir de `feature/animacoes-sistema` **depois** de TASK-041/TASK-042 já mescladas nela (ver nota de dependência de merge acima).
- [ ] `useCanvasZoomPan.ts`: adicionar o sinalizador `settling` (com `setTimeout`/`useRef` para limpar após ~150ms).
- [ ] `ClassDiagramCanvas.tsx`/`ObjectDiagramCanvas.tsx`: aplicar a classe condicional no wrapper de transform (mudança de 1 linha cada).
- [ ] `src/index.css`: regra de transição escopada à classe `settling`, nunca ao wrapper de transform como um todo (evita afetar pan/zoom contínuo).
- [ ] Testes: `useCanvasZoomPan` (ou teste novo) confirmando que `settling` liga ao chamar `fitToScreen` e desliga sozinho depois do tempo esperado.
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: novo teste em `useCanvasZoomPan`/`canvasTransform` confirmando o ciclo de `settling`.
- [ ] Manual: navegador embutido, clicar "Ajustar à tela" nos dois diagramas, tentar interagir durante a animação, dark/light, `prefers-reduced-motion` ligado e desligado.

## Riscos e rollback

Risco médio — é a única task desta rodada que introduz um novo pedaço de estado num hook compartilhado (`useCanvasZoomPan.ts`), usado pelos dois diagramas; testar bem para não vazar a transição para pan/zoom contínuo (isso pioraria a sensação de responsividade do canvas, o oposto do objetivo). Overlap esperado e aceito com TASK-041 (`ClassDiagramCanvas.tsx`) e TASK-042 (`ObjectDiagramCanvas.tsx`) — por isso esta task só mescla depois das outras duas (wave 2). Rollback: reverter `settling` em `useCanvasZoomPan.ts`, a classe condicional nos 2 arquivos de canvas e a regra CSS.

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
