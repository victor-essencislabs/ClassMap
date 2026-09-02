---
id: TASK-043
title: Assentamento animado do "ajustar à tela" no canvas de diagrama
status: active
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

- [x] CA-01: clicar em "Ajustar à tela" no Diagrama de Classes assenta suavemente (~150ms), nos dois temas. **Confirmado ao vivo** contra produção real (2026-09-01, ver "Correção pós-implementação"): medido via `performance.now()`, `settling` liga em ~16ms e desliga em ~155-170ms após o clique — bug real encontrado e corrigido no caminho (assentamento do carregamento inicial, não do botão manual).
- [x] CA-02: mesmo comportamento no Diagrama de Objetos. Mesma implementação/hook compartilhado (`useCanvasZoomPan`) e mesma classe `settling` aplicada no wrapper de `ObjectDiagramCanvas.tsx` — confirmado ao vivo junto com o CA-01.
- [x] CA-03: pan/zoom por gesto contínuo (scroll/drag) continua 1:1, sem nenhuma transição/lag perceptível. A classe `settling` nunca é aplicada fora da janela de ~150ms pós-`fitToScreen` (nunca setada por `onBackgroundPointerDown`/wheel/`zoomIn`/`zoomOut`/`panToNode` — esses, ao contrário, **interrompem** um assentamento em andamento, ver RN-01) — confirmado por teste automatizado (`useCanvasZoomPan.test.ts`).
- [x] CA-04: `prefers-reduced-motion: reduce` remove a transição, sem quebrar o enquadramento final. Bloco `@media (prefers-reduced-motion: reduce)` próprio em `src/index.css` zera `transition` de `.canvas-viewport.settling` — o valor final de `transform` (calculado por `fitToScreenTransform`, inalterado) continua sendo aplicado normalmente, só sem a transição.
- [x] CA-05: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados. Ver seção "Validação" — build/lint limpos, 1 teste falhando é pré-existente e fora do escopo desta task (ver "Divergências"); `detect.mjs` rodado, achado pré-existente também fora do escopo.

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

- [x] Trabalhar em worktree git isolado, branch `task/043-animacao-fit-to-screen` criada a partir de `feature/animacoes-sistema` **depois** de TASK-041/TASK-042 já mescladas nela (ver nota de dependência de merge acima). Ver "Divergências" — o HEAD deste worktree ao ser aberto não era ainda `feature/animacoes-sistema` (estava em `b273d76`, anterior à própria criação da rodada de animação); a branch da task foi recriada a partir do commit real da tip de `feature/animacoes-sistema` (`1387f4a`, TASK-045 já mesclada).
- [x] `useCanvasZoomPan.ts`: adicionar o sinalizador `settling` (com `setTimeout`/`useRef` para limpar após ~150ms).
- [x] `ClassDiagramCanvas.tsx`/`ObjectDiagramCanvas.tsx`: aplicar a classe condicional no wrapper de transform (mudança de 1 linha cada).
- [x] `src/index.css`: regra de transição escopada à classe `settling`, nunca ao wrapper de transform como um todo (evita afetar pan/zoom contínuo).
- [x] Testes: `useCanvasZoomPan` (ou teste novo) confirmando que `settling` liga ao chamar `fitToScreen` e desliga sozinho depois do tempo esperado.
- [x] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [x] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [x] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [x] Unitários: novo teste em `useCanvasZoomPan`/`canvasTransform` confirmando o ciclo de `settling` (`useCanvasZoomPan.test.ts`, 6 casos: liga/desliga, reinício de janela, interrupção por `zoomIn`/`zoomOut`, por pan de fundo, por `panToNode`).
- [ ] Manual: navegador embutido, clicar "Ajustar à tela" nos dois diagramas, tentar interagir durante a animação, dark/light, `prefers-reduced-motion` ligado e desligado. **Não executado nesta sessão** — ver "Divergências": o harness de preview deste ambiente serve o checkout do repositório principal (`C:\Users\Essencis007\Documents\ClassMap`), não este worktree isolado, então não reflete o código desta branch. Recomendado ao usuário validar visualmente numa sessão com acesso ao worktree mesclado (ou depois do merge em `feature/animacoes-sistema`).

## Riscos e rollback

Risco médio — é a única task desta rodada que introduz um novo pedaço de estado num hook compartilhado (`useCanvasZoomPan.ts`), usado pelos dois diagramas; testar bem para não vazar a transição para pan/zoom contínuo (isso pioraria a sensação de responsividade do canvas, o oposto do objetivo). Overlap esperado e aceito com TASK-041 (`ClassDiagramCanvas.tsx`) e TASK-042 (`ObjectDiagramCanvas.tsx`) — por isso esta task só mescla depois das outras duas (wave 2). Rollback: reverter `settling` em `useCanvasZoomPan.ts`, a classe condicional nos 2 arquivos de canvas e a regra CSS.

## Registro de execução

### Alterações realizadas

`useCanvasZoomPan.ts` ganhou o sinalizador `settling: boolean` no objeto retornado pelo hook, sem mudar a assinatura de nenhuma função pública já existente. `fitToScreen` agora, além do `setTransform` de sempre, liga `settling` (`setSettling(true)`) e agenda (`setTimeout`, guardado em `useRef`) desligá-lo depois de `SETTLE_DURATION_MS` (150, constante nova no topo do arquivo, comentada como espelhando a duração da transição CSS). Um helper `clearSettling` (limpa o timeout pendente e força `settling=false`) é chamado no início de `zoomIn`, `zoomOut`, `panToNode`, `onBackgroundPointerDown` e do handler nativo de `wheel` — implementa RN-01: qualquer gesto do usuário (clique nos botões de zoom, iniciar um pan pelo fundo, girar a roda do mouse, ou clicar um item da sidebar que centraliza via `panToNode`) interrompe um assentamento em andamento sem lançar erro (o `setTimeout` já agendado é cancelado; se ele já tiver dessarmado sozinho antes, `clearTimeout` num id inexistente é no-op). Um `useEffect` de cleanup limpa o timeout pendente ao desmontar o componente.

`ClassDiagramCanvas.tsx` e `ObjectDiagramCanvas.tsx`: mudança de exatamente 1 linha cada, no `<div className="canvas-viewport" ...>` que recebe o `style={{ transform: zoomPan.transform }}` — a `className` virou um template string que acrescenta `' settling'` quando `zoomPan.settling` é `true`. Nenhuma outra linha desses dois arquivos foi tocada (as partes de seleção de card/conector nascendo da TASK-041 e de destaque de herança da TASK-042 continuam intactas).

`src/index.css`: novo bloco ao final do arquivo (TASK-043, comentado com o id da task, mesmo padrão das 7 tasks anteriores da rodada) com `.canvas-viewport.settling { transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1); }` e um `@media (prefers-reduced-motion: reduce)` próprio zerando essa transição — nunca tocando o `.canvas-viewport` como um todo, para não vazar nenhum atraso para pan/zoom contínuo por gesto (CA-03).

Teste novo `useCanvasZoomPan.test.ts` (`renderHook` + `vi.useFakeTimers`, mesmo padrão de `Toast.test.tsx`): 6 casos cobrindo o estado inicial, o ciclo liga/desliga em ~150ms, o reinício da janela numa segunda chamada de `fitToScreen`, e a interrupção (RN-01) por `zoomIn`/`zoomOut`, por iniciar um pan pelo fundo (`onBackgroundPointerDown`) e por `panToNode`.

### Arquivos principais

- `src/features/diagram-shell/useCanvasZoomPan.ts` — sinalizador `settling` + interrupção por gesto (RN-01).
- `src/features/diagram-shell/useCanvasZoomPan.test.ts` — novo, cobre o ciclo de `settling`.
- `src/features/class-diagram/ClassDiagramCanvas.tsx` — 1 linha (classe condicional no wrapper de transform).
- `src/features/object-diagram/ObjectDiagramCanvas.tsx` — 1 linha (idem).
- `src/index.css` — novo bloco `TASK-043` (regra `.canvas-viewport.settling` + `prefers-reduced-motion`).

### Decisões

- **`panToNode` também interrompe `settling`, além de `zoomIn`/`zoomOut`/pan/wheel.** A task não cita `panToNode` explicitamente em RN-01 (fala em "gesto de pan/zoom"), mas decidi tratá-lo como mais uma fonte de `setTransform` que não deve herdar uma transição pendente de um `fitToScreen` anterior — sem isso, clicar rápido em "Ajustar à tela" e depois num item da sidebar (que centraliza via `panToNode`, um salto instantâneo por design) poderia acidentalmente ficar visualmente "suave" também, o que a task explicitamente não pede (só `fitToScreen` deve ter easing). Interpretação minha, registrada aqui para revisão.
- **`SETTLE_DURATION_MS = 150` duplicado como constante em `useCanvasZoomPan.ts` e como valor literal em `src/index.css`** (não há como compartilhar uma constante entre TS e CSS puro neste projeto sem introduzir CSS-in-JS, fora de escopo). Comentado nos dois lados avisando que uma mudança exige mudar a outra — mesmo tipo de acoplamento textual já aceito em outras partes do design system deste projeto.
- Branch da task recriada a partir do commit real da tip de `feature/animacoes-sistema` em vez do HEAD do worktree como recebido — ver "Divergências" abaixo.

### Divergências

- **HEAD do worktree, ao ser aberto, não estava em `feature/animacoes-sistema`.** As instruções de dispatch afirmavam "o HEAD já é a branch `feature/animacoes-sistema`, já contendo as 7 tasks anteriores mescladas", mas `git status`/`git log` mostraram o worktree em `b273d76` (commit anterior até à própria TASK-032, sem nenhuma das 8 tasks de animação, sem `TASK-038..045` no histórico). `feature/animacoes-sistema` existe no repositório (checked out no worktree principal, `1387f4a`, com TASK-038/041/045 já mescladas conforme o log) mas não era o HEAD deste worktree isolado. Corrigido criando a branch da task diretamente a partir do commit `1387f4a` (`git checkout -b task/043-animacao-fit-to-screen 1387f4a`), sem tentar `git checkout feature/animacoes-sistema` neste worktree (a branch já está checked out no worktree principal — dois worktrees não podem ter a mesma branch checked out ao mesmo tempo). Resultado: a branch da task parte do código correto (todas as 7 tasks anteriores presentes), só o nome do branch de origem no worktree é que não batia com a premissa do dispatch. Não investiguei a causa raiz (por que o worktree foi provisionado num commit anterior) — fora do escopo desta task, mas pode valer registrar centralmente para as próximas rodadas.
- **A task TASK-043 estava em `.agents/tasks/backlog/`, não em `.agents/tasks/active/`** ao abrir este worktree — outra premissa do dispatch que não bateu ("já não está mais em backlog/"). Movida para `active/` como parte desta execução (`git mv`), seguindo o ciclo de vida documentado em `AGENTS.md` ("você move para active/ ao começar").
- **1 teste pré-existente falhando, fora do escopo desta task**: `src/features/import-export/agentPrompt.test.ts` → `"não sobra frontmatter YAML da skill importada"` falha porque o markdown gerado por `buildAgentPromptMarkdown` (TASK-037) inclui o frontmatter YAML da skill `.claude/skills/gerar-diagrama-classmap/SKILL.md` dentro do bloco de código do prompt (o import `?raw` traz o arquivo inteiro, frontmatter incluso) — bug real de TASK-037, não relacionado a `diagram-shell`/`class-diagram`/`object-diagram`/zoom-pan. Confirmado pré-existente: nenhum arquivo tocado por esta task tem relação com `import-export/`; rodei o arquivo de teste isolado e ele falha do mesmo jeito. Não corrigido — fora do escopo/owner desta task (seria uma mudança em `agentPrompt.ts` da TASK-037, não em `diagram-shell`).
- **Achado do `detect.mjs`, fora do escopo desta task**: 1 warning (`border-accent-on-rounded`) em `src/index.css:217`, na regra `.card` do card de login (`border-top: 3px solid var(--accent)` com `border-radius: 4px`) — código do ADR-011/TASK-032 (fundação do redesign), muito antes do bloco novo desta task (que começa perto do fim do arquivo). Não corrigido — não é código tocado por TASK-043.
- **Validação visual ao vivo não realizada.** O harness de preview deste ambiente (`preview_start`) serve o checkout do repositório principal (`C:\Users\Essencis007\Documents\ClassMap`, onde `feature/animacoes-sistema` está checked out), não o código deste worktree isolado — confirmado inspecionando o `sourceMappingURL`/`fileName` do módulo `main.tsx` servido, que apontava para o caminho do repositório principal, não do worktree. Um harness sintético temporário foi criado (`src/_task043-harness.tsx` + `.env.local` + edição temporária de `main.tsx`) para tentar montar `ClassDiagramCanvas` isoladamente, mas como o preview não reflete este worktree, o teste não teve valor e os 3 arquivos temporários foram revertidos/removidos antes do commit (nenhum vestígio ficou no diff final). CA-01/CA-02 (assentamento suave nos dois temas, nos dois diagramas) ficam verificados só por leitura de código + teste automatizado do ciclo `settling`, não por confirmação visual — mesma ressalva estrutural já usada em outras tasks desta rodada quando não há credencial/ambiente disponível.

### Pendências

- Validação visual manual (dois diagramas, dois temas, `prefers-reduced-motion` ligado/desligado, tentativa de interromper o assentamento) numa sessão com acesso real ao app rodando a partir desta branch (ou já mesclada em `feature/animacoes-sistema`).
- Achados fora de escopo sinalizados acima (teste de `agentPrompt.test.ts` e o warning do `detect.mjs` em `.card`) ficam para quem tocar `import-export/`/a fundação do redesign (`TASK-032`/`TASK-037`), não para esta task.

## Validação

Todos os comandos rodados no worktree `C:\Users\Essencis007\Documents\ClassMap\.claude\worktrees\agent-ac659316198e2d4d1`, branch `task/043-animacao-fit-to-screen`.

- `npm install` — ok, 130 pacotes, 0 vulnerabilidades (worktree novo, sem `node_modules`).
- `npm run build` — **limpo** (`tsc -b && vite build`, 212 módulos, build em ~300-550ms).
- `npm run lint` — **limpo** (`oxlint`): só os 5 warnings pré-existentes já conhecidos do projeto (`only-export-components`/`set-state-in-effect` em `AuthContext.tsx`, `Toast.tsx`, `AppLayout.tsx`, `Connector.tsx`), nenhum warning novo em nenhum arquivo tocado por esta task.
- `npx vitest run` — **30 de 31 arquivos de teste passaram, 218 de 219 testes** (inclui os 6 testes novos de `useCanvasZoomPan.test.ts`, todos passando). A 1 falha (`agentPrompt.test.ts`) é pré-existente e fora de escopo — ver "Divergências". Confirmado isolando `npx vitest run src/features/import-export/agentPrompt.test.ts`: falha do mesmo jeito, sem relação com nenhum arquivo desta task.
- `node ~/.claude/skills/impeccable/scripts/detect.mjs --json <arquivos alterados>` (instalação global — este repositório não tem a skill local, mesmo achado das tasks anteriores desta rodada) sobre `useCanvasZoomPan.ts`, `ClassDiagramCanvas.tsx`, `ObjectDiagramCanvas.tsx`, `index.css`, `useCanvasZoomPan.test.ts`: 1 achado, `border-accent-on-rounded` em `src/index.css:217` (`.card`, pré-existente do ADR-011/TASK-032, fora do bloco novo desta task) — ver "Divergências". Nenhum achado no código novo/alterado de fato por esta task.
- Manual (navegador embutido, clicar "Ajustar à tela" nos dois diagramas, tentar interagir durante a animação, dark/light, `prefers-reduced-motion`): **não realizado** — ver "Divergências" (harness de preview deste ambiente não reflete este worktree isolado).

## Correção pós-implementação (2026-09-01, validação visual manual)

A validação visual manual pendente (ver "Pendências" acima) foi feita nesta sessão, já em `feature/animacoes-sistema` (branch consolidada, não o worktree isolado), com o navegador logado contra produção real. **Achado real, corrigido**: ao abrir um Diagrama de Classes/Objetos pela primeira vez, `.canvas-viewport` ficava com a classe `settling` grudada indefinidamente (confirmado por 1+ segundo, contra os ~150ms esperados) — só era liberada pela primeira interação de zoom/pan do usuário (que chama `clearSettling()` por outro caminho).

**Causa raiz**: `<StrictMode>` (`main.tsx`) roda, só em dev, um ciclo sintético de desmontagem/remontagem logo após a montagem real de todo componente. O efeito de segurança de `useCanvasZoomPan.ts` que só fazia `clearTimeout` no cleanup (sem resetar `settling`) cancelava, nesse ciclo sintético, o timeout que o `fitToScreen` inicial tinha acabado de agendar — mas como o efeito-guarda `didInitialFit` (`ClassDiagramCanvas`/`ObjectDiagramCanvas`) impede a remontagem seguinte de chamar `fitToScreen` de novo, nada mais reagendava o timeout nem resetava `settling`, deixando o estado preso em `true` para sempre (até uma interação do usuário acionar `clearSettling()` por outro caminho). Não pego pelos testes automatizados porque `renderHook` (Testing Library) não reproduz o ciclo duplo do `StrictMode`.

**Correção**: o efeito de limpeza no unmount agora chama `clearSettling()` (já existente, usado pelos outros pontos de interrupção) em vez de um `clearTimeout` cru — isso também reseta `settling` para `false`, então o ciclo sintético do `StrictMode` deixa o estado correto antes da remontagem seguinte. Sem efeito em produção (`StrictMode` só faz esse ciclo duplo em dev) e sem efeito no comportamento do botão "Ajustar à tela" manual (confirmado: ainda liga/desliga em ~150ms, medido via `performance.now()` — ver método abaixo).

**Método de verificação** (documentado porque não é óbvio neste ambiente): `requestAnimationFrame` nunca dispara neste navegador de automação enquanto nada força um paint (confirmado: 0 callbacks em 600ms de espera) — CSS animations reais (`connector-draw`/`connector-symbol-in` da TASK-041, `node-row-inherited-flash` da TASK-042) ficam visualmente "congeladas" no primeiro frame até um `computer{action:"screenshot"}` forçar um burst de frames, e só then progridem/disparam `animationend`. Isso é limitação do ambiente (já sinalizada por 3 subagentes desta rodada), não bug do produto — confirmado tirando 1-2 screenshots em sequência e checando que a classe/estado final chega correto (`stroke-dashoffset` chega a ~0, `just-created`/`inherited-flash` são removidos). Já o bug do `settling` acima foi encontrado e confirmado por um caminho independente (monitorar o estado via `getComputedStyle`/classe do DOM ao longo de `performance.now()`, sem depender de nenhum frame ser pintado) — a lógica de state/timer em si não depende de paint, só o CSS visual depende.

`npm run build`/`lint`/`npx vitest run --exclude "**/.claude/worktrees/**"` limpos (221 testes, nenhum alterado) depois da correção, na branch `feature/animacoes-sistema`.

## Handoff

Nenhum handoff pendente para continuar a implementação — código, testes automatizados e documentação da task estão completos e commitados. Validação visual manual concluída (ver "Correção pós-implementação" acima) — o bug real encontrado já foi corrigido e revalidado.
