---
id: TASK-041
title: Diagrama de Classes — seleção de card animada e conector nascendo ao ser criado
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-041 — Diagrama de Classes: seleção de card e conector nascendo

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Feedback + Continuidade" — as 2 ideias vivem no Diagrama de Classes e viraram uma task só por tocarem arquivos vizinhos (`ClassCard.tsx`/`Connector.tsx`).

**Atenção — overlap conhecido e aceito**: esta task também toca `ClassDiagramCanvas.tsx` (para rastrear qual relação acabou de ser criada), no mesmo arquivo que a TASK-043 (assentamento do "ajustar à tela") também toca, em linhas diferentes. Mesmo padrão já aceito neste projeto (ver TASK-014×TASK-015 em `ClassDiagramCanvas.tsx`, `.agents/context/CONTEXT.md`, "Backlog inteiro via subagentes paralelos"). **Mesclar esta task (041) antes da TASK-043** na branch `feature/animacoes-sistema`, para a TASK-043 já rebasear sobre o estado final do arquivo.

## Problema

1. A borda de seleção de um card de classe (`.node-box.selected`, tinta `--class-accent`) aparece/some sem transição — corte seco.
2. Um conector novo (relação criada no modo de conexão) aparece já pronto, sem comunicar "essa relação acabou de nascer".

## Objetivo

- Card selecionado: transição de opacidade/espessura da borda em ~120ms — nunca do tamanho do card (evita reflow).
- Conector recém-criado: a linha se desenha do card de origem ao destino via `stroke-dasharray`/`stroke-dashoffset` (~250ms, `cubic-bezier(0.16, 1, 0.3, 1)`), em vez de aparecer pronta. Símbolos de ponta (losango/triângulo/seta) aparecem só ao final do traço, não durante.

## Fora de escopo

- Diagrama de Objetos (`ObjectLinkConnector.tsx`) — fora de escopo desta rodada de 11 ideias; ver nota em "Riscos" para uma possível task futura de paridade.
- Arrastar o ponto de controle do conector (inércia/easing na soltura) — mencionado no levantamento original como ideia relacionada, mas não incluído nesta rodada de 8 tasks para manter escopo pequeno; considerar como task futura se o efeito de "nascer" for aprovado.
- Assentamento do "ajustar à tela" — ver TASK-043.

## Comportamento atual

- `.node-box.selected` muda de classe sem transição declarada.
- `Connector.tsx` (`src/features/class-diagram/Connector.tsx`) renderiza o `<path>` da relação (incluindo losango/triângulo/seta conforme `relationship.type`) sempre no estado final, sem diferenciar "recém-criado" de "já existente".

## Comportamento esperado

- `.node-box.selected`: `transition: border-color 120ms ease-out` (ou equivalente) em `ClassCard.tsx`/`src/index.css`.
- `ClassDiagramCanvas.tsx` rastreia o id da última relação criada (ex.: `useState<string | null>` atualizado no handler que cria a relação) e passa um prop `justCreated` para o `Connector` correspondente; o próprio `Connector` limpa esse estado (ex.: via `onAnimationEnd`) para não repetir o efeito em re-renders futuros.
- `Connector.tsx`, quando `justCreated`, aplica `stroke-dasharray`/`stroke-dashoffset` animado no `<path>` principal (~250ms); os símbolos de ponta (losango/triângulo/seta) só aparecem com um `opacity` que entra depois do traço (delay ~200ms, duração curta).
- Bloco de `prefers-reduced-motion: reduce` próprio para os dois efeitos: seleção reduz para troca instantânea de cor; conector reduz para aparecer pronto (sem desenho), preservando o feedback de "algo novo apareceu" via um fade curto único.

## Regras de negócio

- RN-01: o efeito de "conector nascendo" dispara só na criação — nunca ao reabrir um diagrama existente ou selecionar uma relação já existente.
- RN-02: a cor usada em ambos os efeitos é `--class-accent` (identidade estrutural do Diagrama de Classes), nunca `--accent` — regra de papel de cor já estabelecida em `DESIGN.md`.

## Critérios de aceitação

- [ ] CA-01: selecionar um card transiciona a borda suavemente (~120ms), nos dois temas.
- [ ] CA-02: criar uma relação nova desenha a linha do zero até o destino (~250ms), com os símbolos de ponta aparecendo só ao final.
- [ ] CA-03: reabrir um diagrama com relações existentes NÃO dispara o efeito de desenho — as linhas aparecem prontas.
- [ ] CA-04: `prefers-reduced-motion: reduce` reduz os 2 efeitos conforme especificado, sem perder o feedback de "algo novo apareceu".
- [ ] CA-05: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/ClassCard.tsx`, `src/features/class-diagram/Connector.tsx`, `src/features/class-diagram/ClassDiagramCanvas.tsx` (rastreio do id recém-criado — mudança pequena e isolada, ver nota de overlap acima), `src/index.css`.
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [ ] Trabalhar em worktree git isolado, branch `task/041-animacao-diagrama-classes` criada a partir de `feature/animacoes-sistema`.
- [ ] `.node-box.selected`: adicionar transição de borda em `src/index.css`.
- [ ] `ClassDiagramCanvas.tsx`: rastrear id da relação recém-criada (mudança mínima, isolada do resto do arquivo).
- [ ] `Connector.tsx`: `stroke-dasharray`/`stroke-dashoffset` animado quando `justCreated`, símbolos de ponta com delay.
- [ ] Testes: pelo menos 1 caso confirmando que `justCreated` só é verdadeiro logo após a criação, e não em relações pré-existentes carregadas.
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: `ClassDiagramCanvas.test.tsx`/teste novo confirmando que o flag de "recém-criado" não vaza para relações carregadas de um diagrama existente.
- [ ] Manual: navegador embutido, criar relação nova de cada um dos 5 tipos, dark/light, `prefers-reduced-motion` ligado e desligado.

## Riscos e rollback

Risco baixo-médio — a parte de rastrear "recém-criado" em `ClassDiagramCanvas.tsx` é a única mudança de lógica (não só CSS) desta rodada de 8 tasks; testar bem para não vazar o flag entre re-renders. Rollback: reverter `.node-box.selected` em `index.css`, o rastreio em `ClassDiagramCanvas.tsx` e o `stroke-dasharray` condicional em `Connector.tsx`. Overlap esperado e aceito com TASK-043 em `ClassDiagramCanvas.tsx` — mesclar 041 antes de 043.

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
