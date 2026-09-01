---
id: TASK-045
title: Abrir/fechar animado do modal genérico
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [diagram-shell]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-045 — Abrir/fechar animado do modal genérico

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Estado".

`Modal` (`src/features/diagram-shell/Modal.tsx`, TASK-010) é o componente base compartilhado por todos os modais do app (`ClassPickerModal`, exportar/importar JSON, `AccessManagementModal`, confirmações de exclusão) — uma única mudança aqui beneficia todos os usos de uma vez, sem precisar tocar cada modal individualmente. Hoje `.modal-overlay show`/`.modal` aparecem sem transição própria.

## Problema

Abrir/fechar qualquer modal do app é instantâneo — sem hierarquia temporal entre o fundo escurecendo e o painel aparecendo, o que faz a interface parecer "cortar" em vez de abrir uma camada nova.

## Objetivo

- Backdrop (`.modal-overlay`): fade isolado, ~150ms.
- Painel (`.modal`): scale-in de 0.98→1 + fade, ~180ms, começando ~20ms depois do backdrop — para não parecer um bloco só entrando junto.
- Fechar: mesma lógica, mais rápido (exit mais rápido que entrance, conforme convenção já adotada nas outras tasks desta rodada).

## Fora de escopo

- Mudar a lógica de fechar por clique fora/Esc (`handleOverlayClick`/`handleKeyDown`) — já existe e funciona, só a transição visual.
- Qualquer modal que não use o componente `Modal` compartilhado (confirmar que não existe nenhum — se existir, sinalizar em "Divergências", não corrigir nesta task).

## Comportamento atual

`.modal-overlay.show`/`.modal` aparecem/somem sem transição declarada em `src/index.css` (a classe `show` já existe no markup de `Modal.tsx`, mas a regra CSS correspondente não anima entrada/saída).

## Comportamento esperado

- `.modal-overlay`: `transition: opacity 150ms ease-out` na entrada; saída mais rápida (~100ms).
- `.modal`: `transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1)`, com um `transition-delay` de ~20ms na entrada (não na saída).
- Conteúdo do modal permanece visível no estado padrão (sem JS) — falha de script não deve esconder o modal (ver `animate.md`, "Implementar para o runtime").
- Bloco de `prefers-reduced-motion: reduce` próprio, reduzindo para fade puro sem `scale`/delay.

## Regras de negócio

- RN-01: a transição de fechar nunca pode ser mais lenta que a de abrir (convenção "exit mais rápido que entrance" desta rodada).

## Critérios de aceitação

- [x] CA-01: abrir qualquer modal do app (testar pelo menos `ClassPickerModal`, exportar/importar JSON e `AccessManagementModal`) mostra o backdrop e o painel entrando em sequência, nos dois temas. Verificado por: (a) réplica estática das regras CSS reais num harness HTML isolado, dark/light, clique/×/Esc/clique-fora todos exercitados; (b) 7 testes automatizados de `Modal.tsx` (`Modal.test.tsx`). Não verificado contra os 3 modais reais dentro do app rodando (ver "Divergências" — sem sessão de dev server disponível nesta execução).
- [x] CA-02: fechar é visivelmente mais rápido que abrir. Confirmado por medição de `getComputedStyle().animationDuration` no harness: abrir = 150ms (backdrop) / 180ms+20ms delay (painel); fechar = 100ms (backdrop e painel) — sempre mais rápido, nunca mais lento (RN-01).
- [x] CA-03: `prefers-reduced-motion: reduce` reduz para fade puro, sem `scale`/delay. Confirmado por medição de `getComputedStyle()` com a classe de reduced-motion forçada no harness: overlay e painel passam a usar a MESMA keyframe de fade puro (`modal-overlay-in`/`modal-overlay-out`, sem `transform`), 100ms/80ms, `animation-delay: 0ms`.
- [x] CA-04: `npm run build`/`npm run lint`/`npx vitest run --exclude "**/.claude/worktrees/**"` limpos (199/200 — a única falha é pré-existente e não relacionada, ver "Divergências"); `detect.mjs --json` rodado sobre os 3 arquivos alterados (1 achado, também pré-existente e fora da região tocada por esta task, ver "Divergências").

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/diagram-shell/Modal.tsx` (se precisar de uma classe extra para diferenciar entrada/saída), `src/index.css` (`.modal-overlay`/`.modal`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [x] Trabalhar em worktree git isolado, branch `task/045-animacao-modal` criada a partir de `feature/animacoes-sistema`.
- [x] Confirmar que todo modal do app passa por `Modal.tsx` (grep por `modal-overlay`/`class="modal"` fora deste componente) — nenhuma exceção encontrada (ver "Divergências").
- [x] `src/index.css`: transições de `.modal-overlay`/`.modal` conforme especificado + bloco de reduced-motion próprio (implementado com `@keyframes`/`animation` em vez do `transition` literal do texto da task — ver "Decisões").
- [x] Validar visualmente — ver ressalva em "Divergências": harness estático (réplica exata das regras CSS + JS de `requestClose`), não os 3 modais reais dentro do app rodando.
- [x] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [x] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [x] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [x] Unitários: existente (`AccessManagementModal.test.tsx` e outros que renderizam `Modal`) não quebrou. `Modal.test.tsx` em si precisou ser atualizado (ver "Decisões") — as 4 asserções originais continuam verificando exatamente o mesmo comportamento (fecha por ×/clique fora/Esc, não fecha clicando dentro), só que aguardando (`waitFor`) o `onClose` que agora é assíncrono; 2 testes novos cobrem a classe `.closing` durante a transição e o guard contra disparo duplo.
- [x] Manual: harness HTML isolado (réplica exata das regras CSS reais + lógica de `requestClose`), dark/light, `prefers-reduced-motion` emulado via classe forçada (o navegador de automação não expõe emulação nativa desse media feature) — ver "Divergências" para a ressalva sobre não ter testado os 3 modais reais dentro do app.

## Riscos e rollback

Risco mínimo — mudança concentrada em 1 componente compartilhado + 1 regra CSS, beneficia todos os modais do app de uma vez. Rollback: reverter `.modal-overlay`/`.modal` em `index.css`.

## Registro de execução
### Alterações realizadas

- `src/index.css`: novo bloco "TASK-045" logo após as regras existentes de `.modal-overlay`/`.modal`/`.modal-head`/`.modal-body`. 4 `@keyframes` (`modal-overlay-in`/`-out`, `modal-panel-in`/`-out`), aplicadas via `animation` (não `transition`) em `.modal-overlay.show` (150ms fade) e `.modal-overlay.show .modal` (180ms scale+fade, 20ms de atraso, `backwards` para não piscar no estado final durante o atraso). `.closing` (adicionada por `Modal.tsx`) troca para as keyframes de saída, mais rápidas (100ms, sem atraso) — RN-01. Bloco `@media (prefers-reduced-motion: reduce)` próprio logo em seguida, reduzindo overlay e painel para a MESMA keyframe de fade puro (sem `transform`), 100ms na entrada / 80ms na saída.
- `src/features/diagram-shell/Modal.tsx`: novo estado interno `closing` + `closingRef` (guarda contra disparo duplo do timer). `handleOverlayClick`, o handler de `Escape` e o botão × passaram a chamar `requestClose()` em vez de `onClose` diretamente; `requestClose` marca `closing=true` (adiciona a classe `closing` no overlay e no painel, disparando a animação de saída) e um `useEffect` agenda a chamada real de `onClose` (prop do componente) 100ms depois — tempo mínimo para a transição de saída não ser cortada. A condição de QUANDO fechar (alvo do clique, tecla Esc) não mudou.
- `src/features/diagram-shell/Modal.test.tsx`: as 4 asserções originais (× / clique fora / Esc / clique dentro não fecha) mantidas com o mesmo significado, atualizadas para `waitFor(() => expect(onClose)...)` já que `onClose` agora é assíncrono (100ms depois do clique/tecla). 2 testes novos: `.closing` aparece no overlay e no painel imediatamente após pedir fechar, e `onClose` ainda não foi chamado nesse instante (a transição realmente acontece antes do unmount); Esc + clique fora em sequência rápida não disparam `onClose` duas vezes (guard).

### Arquivos principais

- `src/index.css`
- `src/features/diagram-shell/Modal.tsx`
- `src/features/diagram-shell/Modal.test.tsx`

### Decisões

1. **`animation`/`@keyframes` na entrada, não `transition` literal.** O texto da task descreve a entrada em termos de `transition`/`transition-delay`, mas `Modal.tsx` sempre monta o overlay já com a classe `show` aplicada (React monta/desmonta o componente inteiro — não existe hoje nenhum toggle de visibilidade via CSS). Um elemento que nasce já no seu estado final não anima via `transition` (não há "de onde" interpolar no primeiro paint) — precisaria de um toggle de classe via JS um frame depois do mount, o que contraria diretamente o requisito explícito da própria task ("conteúdo do modal permanece visível no estado padrão (sem JS) — falha de script não deve esconder o modal", que bate com o `animate.md` real do skill impeccable: "Keep content visible in the default state so failed scripts do not hide the page"). `@keyframes`/`animation` resolve isso de forma nativa do CSS (roda independente de qualquer JS de aplicação, e o elemento sempre acaba no seu estilo persistente declarado) — mesmo padrão já usado neste repositório para o mesmo problema (`ov-detail-in`, TASK-035). Os números pedidos (150ms/180ms/20ms de atraso/100ms de saída) foram todos preservados, só a técnica CSS mudou.
2. **Fechar precisou de JS (não só CSS) para ser real.** Todos os 8 usos de `Modal` no app desmontam o componente via renderização condicional do React (`{aberto && <Modal ... />}`) assim que `onClose` é chamado — ou seja, sem alguma forma de manter o nó no DOM por mais alguns instantes, não existe "saída" visível nenhuma (o elemento simplesmente some do DOM no mesmo tick). `Modal.tsx` ganhou um estado `closing` interno que segura a notificação real ao dono (`onClose`) por 100ms (igual à duração da animação de saída) enquanto toca a keyframe de saída. A CONDIÇÃO de fechar (alvo do clique = overlay, tecla Esc) não mudou — só o que acontece depois de decidir fechar, que é exatamente "a transição visual" pedida pela task.
3. **`Modal.test.tsx` precisou mudar de síncrono para `waitFor`.** Consequência direta da decisão 2 — as 4 asserções `toHaveBeenCalledTimes(1)` logo após o evento não podem mais ser síncronas, já que `onClose` real só dispara depois do timer de 100ms. Nenhum dos outros arquivos de teste do app que renderizam `Modal` como subcomponente (`AccessManagementModal.test.tsx`, etc.) dependia dessa sincronia — todos continuam passando sem alteração.
4. **`.closing` reaproveita as próprias keyframes de entrada como "fade puro" no reduced-motion**, em vez de criar keyframes novas — evita duplicar a mesma definição (`opacity: 0→1`/`1→0`) só para trocar o nome.

### Divergências

1. **Achado de infraestrutura, fora do escopo desta task — colisão de `git stash` entre agentes concorrentes.** Durante a implementação, um `git stash` seguido de `git stash pop` (usado para confirmar que 2 falhas de teste pré-existentes não eram causadas por esta task) recuperou o WIP de OUTRO agente (`task/038-selo-validacao`, commit dangling `777142460e263f2936306ac0a3903f320f6d513a`) em vez do meu próprio stash — a pilha de stash é compartilhada entre todos os worktrees do mesmo repositório (armazenada no `.git` comum), mesmo cada worktree tendo working directory próprio. Identificado e corrigido nesta sessão (o WIP alheio foi restaurado a partir do commit dangling, sem perda; meu próprio stash foi localizado por mensagem de commit — `WIP on task/045-animacao-modal: ...`, hash `5b1ba188221b34de9d406f5d5ae52b968614dec4` — e reaplicado). **Risco real para o restante da rodada**: se outro agente também usar `git stash` num worktree diferente enquanto ainda houver stashes pendentes na pilha compartilhada, o mesmo acidente pode se repetir — e da próxima vez pode não ser percebido (arquivos de uma task aparecendo silenciosamente no commit de outra). Recomendo evitar `git stash` como técnica de verificação entre os agentes desta rodada (usar `git diff`/`git show`/branches temporárias em vez disso), e o usuário pode querer conferir os outros worktrees ativos (`task/038-selo-validacao`, `task/039`, `040`, `041`, `044`) por segurança quando cada um deles finalizar.
2. **Validação visual não foi contra os 3 modais reais dentro do app rodando.** `preview_start` reportou a porta 5173 ocupada por "outra sessão de chat" (`classmap-dev`) — consistente com múltiplos agentes desta rodada de animação rodando em paralelo. Tentativas de contornar (porta alternativa via `.claude/launch.json`) não destravaram o servidor (a ferramenta parece atrelada à mesma porta/nome independente da config), e o Browser pane já estava em uso por uma aba de outro agente (`agent-a0101f1425ef85931`, harness da TASK-038). Optei por não insistir nisso para não interferir no trabalho paralelo de outro agente. Validação feita em vez disso com uma réplica HTML estática, isolada, copiando literalmente as regras CSS adicionadas em `index.css` e a lógica de `requestClose` de `Modal.tsx` — cobre a correção das durações/keyframes/reduced-motion (medido via `getComputedStyle`) e o comportamento de abrir/fechar por ×, clique fora e Esc, mas não é o app real, não é os 3 modais nomeados no CA-01 (`ClassPickerModal`/exportar-importar/`AccessManagementModal`) especificamente, e não passou por login algum (não havia necessidade — nenhuma mudança aqui toca dado de produção). Consistente com a mesma ressalva já registrada nas TASK-036/037 desta mesma rodada de sessões. Recomendo ao usuário confirmar visualmente os 3 modais reais numa sessão com o dev server livre.
3. **Nenhuma exceção encontrada ao grep pedido no plano** — `modal-overlay`/`class="modal"`/`className="modal"` só aparecem em `Modal.tsx` (definição) e `Modal.test.tsx` (seletor de teste); todos os 8 usos no app (`ClassPickerModal`, `ImportExportControls` ×2, `AccessManagementModal`, `DeleteConfirmModal`, `DiagramTypeListPage` ×2, `SystemViewPage` ×2) passam pelo componente `Modal` compartilhado.
4. **Achado de bug real, fora do escopo — `stripFrontmatter` de `agentPrompt.ts` (TASK-037) não é CRLF-safe.** A única falha de teste pré-existente nesta sessão (`agentPrompt.test.ts`, "não sobra frontmatter YAML da skill importada") tem causa raiz identificada: o regex `/^---\n[\s\S]*?\n---\n/` em `src/features/import-export/agentPrompt.ts` assume `\n`, mas `.claude/skills/gerar-diagrama-classmap/SKILL.md` está com final de linha `\r\n` neste checkout Windows (confirmado por `xxd`), então o regex não casa e o frontmatter YAML não é removido do prompt gerado. Não é causado nem afetado por esta task (`diagram-shell`) — apenas encontrado ao confirmar que as 2 falhas de teste pré-existentes eram alheias a esta mudança. Não corrigido aqui (fora do escopo/dono é `contrato-ia-diagrama`/`import-export`), só registrado.
5. **1 achado do `detect.mjs`, pré-existente e fora da região tocada** — `border-accent-on-rounded` em `src/index.css:217` (`.card { border-top: 3px solid var(--accent); }`, da fundação TASK-032/ADR-011, ~1900 linhas antes do bloco desta task). Não é um achado sobre o CSS adicionado por esta task.

### Pendências

- Validação visual dos 3 modais reais citados no CA-01 dentro do app rodando (`ClassPickerModal`, exportar/importar JSON, `AccessManagementModal`), numa sessão com a porta do dev server livre — ver "Divergências", item 2.
- (Fora do escopo desta task, só registrado) corrigir `stripFrontmatter` em `agentPrompt.ts` para CRLF — ver "Divergências", item 4.

## Validação

- `npm install` — ok (worktree novo).
- `npm run build` — ok, limpo (`tsc -b && vite build`).
- `npm run lint` — ok, limpo (`oxlint`; únicos avisos são pré-existentes em `Toast.tsx`/`AuthContext.tsx`, não tocados por esta task).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — 199 de 200 passando (27 de 28 arquivos). A 1 falha (`agentPrompt.test.ts`) é pré-existente e não relacionada — confirmado rodando a mesma suíte contra o estado limpo da branch `feature/animacoes-sistema` (antes de qualquer mudança desta task), onde a mesma falha já ocorre (junto com uma segunda falha, `DiagramsRouteDispatcher.test.tsx`, que se mostrou intermitente — passou na build final). `Modal.test.tsx` sozinho: 7 de 7 passando.
- `node .claude/skills/impeccable/scripts/detect.mjs --json <3 arquivos alterados>` (script localizado em `~/.claude/skills/impeccable/`, não vendorizado neste repositório) — 1 achado, pré-existente e fora da região tocada por esta task (ver "Divergências", item 5).
- Validação manual: harness HTML estático isolado (fora do repositório, nunca commitado), réplica exata das regras CSS de `index.css` + lógica de `requestClose` de `Modal.tsx`. Confirmado via screenshot: abrir/fechar por botão, tema claro e escuro (alternância de `data-theme`), clique fora fecha (clicando sobre a área do overlay que fica atrás dos botões da página, comportamento correto). Confirmado via `getComputedStyle()` no navegador: entrada = overlay 150ms ease-out / painel 180ms cubic-bezier(0.16,1,0.3,1) com 20ms de atraso; saída = ambos 100ms, sem atraso (RN-01/CA-02); com reduced-motion forçado = ambos usam a mesma keyframe de fade puro (sem `transform`), 100ms na entrada / 80ms na saída (CA-03). Ressalva: não é o app real nem os modais nomeados no CA-01 especificamente — ver "Divergências", item 2.

## Handoff

Sem handoff de continuidade de sessão — task concluída nesta execução. Only pendência real registrada é a validação visual contra o app rodando de verdade (ver "Pendências"), que qualquer sessão futura com o dev server livre pode fechar sem precisar reabrir o código.
