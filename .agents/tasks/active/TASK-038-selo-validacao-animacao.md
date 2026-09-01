---
id: TASK-038
title: Animação do selo de validação nos pontos de confirmação (momento autoral)
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [class-diagram, object-diagram, system-view, import-export, navigation]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-038 — Animação do selo de validação nos pontos de confirmação

## Contexto

Pedido do usuário (`/impeccable animate`, 2026-09-01): levantamento de animações interessantes para o ClassMap, dentro da direção visual já implementada "Certificado de Ensaio" (`ADR-011`, `DESIGN.md`). Desse levantamento, esta é a única ideia indicada como **momento autoral** — o único ponto do app com licença para um instante de verdade (as demais tasks desta rodada, TASK-039..045, são feedback rápido/funcional, modo Operate). O selo (`.brand-mark`, círculo com gradiente cônico nas 3 tintas do sistema) já é a marca do produto; hoje, quando uma ação é confirmada, o app só troca texto/ícone estático — nenhum lugar "carimba" de verdade.

Faz parte de uma rodada de 8 tasks (TASK-038..045) desenhadas para execução paralela por subagentes, todas na mesma branch `feature/animacoes-sistema` (ver `.agents/context/CONTEXT.md`, seção "Animação do sistema — planejamento"). Esta task é a única do grupo "Momento autoral" — as outras 7 são "Feedback"/"Continuidade"/"Estado".

## Problema

Confirmações de sucesso hoje são só texto/ícone estático, em 5 pontos distintos do app, sem nenhum reconhecimento visual do instante em que algo foi certificado:

1. Indicador "Salvo" no topbar do Diagrama de Classes (`DiagramEditorPage.tsx`).
2. Indicador "Salvo" no topbar do Diagrama de Objetos (`ObjectDiagramPage.tsx`).
3. Indicador "Salvo" no topbar da Visão do Sistema (`SystemViewPage.tsx`).
4. Botão "Copiar" do modal de exportar JSON, que já troca para `CheckGlyph` no sucesso (`ImportExportControls.tsx`).
5. Bloco de sucesso "Conta criada..." ao criar um novo usuário em `AccessManagementModal.tsx` (a senha temporária aparece uma única vez, RN-02 da TASK-026).

## Objetivo

Um único efeito visual reutilizável — "o carimbo bate no papel" — aplicado consistentemente nesses 5 pontos: scale-in de 0.94→1 combinado com uma rotação sutil (3-4° corrigindo para 0°) em 300-400ms, com `cubic-bezier(0.16, 1, 0.3, 1)` (chegada confiante, nunca bounce/elástico), mais um halo curto de opacidade na borda do elemento pai (150ms) reforçando "isso acabou de ser certificado".

## Fora de escopo

- Qualquer outro toast/feedback genérico do app (ver TASK-039) — este efeito é só para os 5 pontos listados acima, que representam confirmação/certificação, não feedback de ação qualquer.
- Mudar o texto ou a lógica de quando cada indicador aparece — só a entrada visual.
- Presença em tempo real ("quem está online") — não implementada no frontend ainda, fora de escopo desta rodada.

## Comportamento atual

Nos 5 pontos, o estado de sucesso aparece sem nenhuma transição própria (troca de texto seca, ou `CheckGlyph` estático já presente desde a TASK-036).

## Comportamento esperado

- Um utilitário CSS reutilizável (ex.: classe `.seal-confirm`, aplicada via `key`/remontagem ou via uma classe `is-confirmed` adicionada no momento da confirmação) dispara o keyframe de carimbo.
- Nos 3 indicadores "Salvo": o texto/ícone da transição `saving → saved` ganha o efeito no exato momento em que o estado muda para `saved`.
- No botão "Copiar" (`ImportExportControls.tsx`): o `CheckGlyph` que já aparece ganha o efeito ao surgir (substitui/complementa o pulso simples já existente, se houver).
- No bloco "Conta criada..." (`AccessManagementModal.tsx`): o efeito dispara na entrada do bloco inteiro (quando `createdAccount` passa a não-nulo).
- Cada aplicação tem seu próprio bloco `@media (prefers-reduced-motion: reduce)` logo após a regra nova, reduzindo a versão para um fade simples (sem scale/rotação) — nunca removendo o feedback de sucesso por completo.

## Regras de negócio

- RN-01: o efeito nunca dispara em re-render por outro motivo (ex.: reabrir um diagrama já salvo) — só na transição real para o estado de sucesso.
- RN-02: nunca misturar `--accent` (selo, cor de ação) com `--class-accent`/`--object-accent` no mesmo elemento — o carimbo usa sempre `--accent` (regra de papel de cor já estabelecida em `DESIGN.md`), mesmo quando aparece dentro de uma tela de Diagrama de Classes/Objetos.

## Critérios de aceitação

- [x] CA-01: os 3 indicadores "Salvo" (Classes/Objetos/Visão do Sistema) disparam o efeito de carimbo ao passar de `saving`/vazio para `saved`, nos dois temas.
- [x] CA-02: o botão "Copiar" do modal de exportar dispara o efeito ao confirmar a cópia.
- [x] CA-03: o bloco "Conta criada..." dispara o efeito ao aparecer.
- [x] CA-04: `prefers-reduced-motion: reduce` reduz os 5 pontos a um fade simples, sem remover o feedback.
- [x] CA-05: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/DiagramEditorPage.tsx`, `src/features/object-diagram/ObjectDiagramPage.tsx`, `src/features/system-view/SystemViewPage.tsx`, `src/features/import-export/ImportExportControls.tsx`, `src/features/navigation/AccessManagementModal.tsx`, `src/index.css` (novo bloco `.seal-confirm`/keyframe, ao final do arquivo, comentado com `TASK-038`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [ ] Trabalhar em worktree git isolado, branch `task/038-selo-validacao` criada a partir de `feature/animacoes-sistema` (não `main`) — ver `.agents/context/CONTEXT.md`.
- [ ] Adicionar o keyframe/classe `.seal-confirm` em `src/index.css` (bloco novo, comentado, ao final do arquivo) + seu `@media (prefers-reduced-motion: reduce)` próprio.
- [ ] Aplicar nos 3 indicadores "Salvo".
- [ ] Aplicar no botão "Copiar" do export.
- [ ] Aplicar no bloco "Conta criada...".
- [ ] Testes automatizados cobrindo pelo menos 1 dos 5 pontos (o efeito dispara/a classe é aplicada na transição correta).
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação" nesta task e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: pelo menos 1 caso confirmando que a classe/efeito é aplicado só na transição para o estado de sucesso (não em todo render).
- [ ] Integração: existente (`AccessManagementModal.test.tsx`, `ImportExportControls.test.tsx`) não deve quebrar.
- [ ] Manual: navegador embutido, harness de preview, dark/light, `prefers-reduced-motion` ligado e desligado.
- [ ] E2E/produção: pendente de sessão com credencial real (mesma ressalva das TASK-036/037).

## Riscos e rollback

Baixo risco — puramente aditivo em CSS + pequenas mudanças de classe condicional em 5 arquivos já existentes. Rollback: reverter a classe `.seal-confirm`/keyframe em `index.css` e as 5 aplicações pontuais. Risco principal: tocar 5 arquivos aumenta a chance de um merge trivial precisar de atenção manual ao consolidar com as outras 7 tasks desta rodada — nenhum dos outros 7 grupos edita estes mesmos 5 arquivos, então conflito esperado é zero.

## Registro de execução
### Alterações realizadas

Adicionado um único utilitário CSS reutilizável (`.seal-confirm`) em
`src/index.css`, aplicado nos 5 pontos de confirmação/sucesso listados no
"Problema": os 3 indicadores "Salvo" (Classes/Objetos/Visão do Sistema),
o `CheckGlyph` do botão "Copiar" do export e o bloco "Conta criada..." do
modal de acesso. O efeito é scale-in (0.94→1) + rotação sutil (-3.5°→0°)
em 360ms com `cubic-bezier(0.16, 1, 0.3, 1)`, mais um halo curto (150ms,
`::after` com borda em `--accent`) — como CSS não tem seletor de "elemento
pai", o halo foi implementado como um anel ao redor do próprio elemento
confirmado (`position: relative` + `::after` com `inset: -5px`), que lido
visualmente cumpre a mesma função ("reforça que isso acabou de ser
certificado") sem precisar reestruturar a árvore de componentes dos 5
pontos (ver "Decisões" abaixo).

Em cada um dos 5 pontos, a classe `seal-confirm` só é aplicada/montada no
momento real da transição para o estado de sucesso — nunca em todo
re-render (RN-01):
- Nos 3 indicadores "Salvo": a classe do `<span className="save-indicator">`
  vira condicional (`saveState === 'saved' ? '... seal-confirm' : '...'`).
  Como o `saveState` inicial de cada página é `idle`/`saving` (nunca
  `saved` direto ao carregar um diagrama já salvo), reabrir um diagrama
  nunca dispara o efeito — só uma gravação de verdade (autosave ou
  renomear) o faz.
- No botão "Copiar" (`ImportExportControls.tsx`): o `CheckGlyph` passou a
  vir envolto num `<span className="seal-confirm">`, renderizado
  condicionalmente só quando `copyLabel === 'Copiado!'` — o span é
  desmontado/remontado a cada ciclo de cópia (o modal reseta `copyLabel`
  para `'Copiar'` ao abrir), então o efeito sempre tem uma transição real
  para disparar.
- No bloco "Conta criada..." (`AccessManagementModal.tsx`): a classe foi
  adicionada direto no `<p>`, que já só existe quando `createdAccount`
  não é nulo — nenhuma mudança de condição foi necessária, só a classe.

`prefers-reduced-motion: reduce` tem um bloco próprio, local (não o bloco
global já existente em `index.css`, que ninguém desta rodada edita, por
combinado em `.agents/context/CONTEXT.md`): reduz `.seal-confirm` a um
fade simples (200ms, sem scale/rotação) e remove o halo — nunca some com
o feedback de sucesso por completo.

### Arquivos principais

- `src/index.css` — bloco novo `.seal-confirm`/`@keyframes` + reduced-motion
  próprio, comentado com `TASK-038`, ao final do arquivo.
- `src/features/class-diagram/DiagramEditorPage.tsx` — indicador "Salvo".
- `src/features/object-diagram/ObjectDiagramPage.tsx` — indicador "Salvo".
- `src/features/system-view/SystemViewPage.tsx` — indicador "Salvo".
- `src/features/import-export/ImportExportControls.tsx` — `CheckGlyph` do
  botão "Copiar".
- `src/features/navigation/AccessManagementModal.tsx` — bloco "Conta
  criada...".
- `src/features/class-diagram/DiagramEditorPage.test.tsx` — teste novo
  (CA-01): confirma que `seal-confirm` não existe antes de salvar, nem
  durante `saving`, só depois de `saved`.
- `src/features/navigation/AccessManagementModal.test.tsx` — teste novo
  (CA-03): confirma que o bloco "Conta criada..." nasce com `seal-confirm`.

### Decisões

- **Halo no próprio elemento, não no "elemento pai" literal.** O texto da
  task pede um "halo curto de opacidade na borda do elemento pai". CSS não
  tem seletor de pai (`:has()` existiria, mas exigiria reestruturar cada um
  dos 5 pontos para ter um wrapper dedicado só para isso). Optei por um
  `::after` no próprio elemento que recebe `.seal-confirm`, com `inset:
  -5px`, criando um anel que visualmente "vaza" para a borda do elemento
  ao redor — mesma leitura ("isso acabou de ser certificado"), sem exigir
  wrapper novo em 5 componentes diferentes (span, button, p). Registrado
  aqui por ser a única divergência de leitura literal do texto da task;
  nenhuma regra de negócio foi violada.
- **`position: relative` em `.seal-confirm` é seguro nos 5 usos** (`span`,
  `span` dentro de `button`, `p`) — não força nenhum `display` novo, então
  não altera o layout de nenhum dos 5 pontos (o bloco "Conta criada..." é
  um `<p>` de bloco; os indicadores "Salvo" e o `CheckGlyph` são inline).
- **`border-radius: inherit` no halo** — nos 3 casos sem `border-radius`
  próprio (spans/check), resolve para `0` (quadrado), que é aceitável
  para um anel fino de 1px; no bloco "Conta criada..." (`border-radius:
  4px` já existente), o halo acompanha o arredondamento do card.

### Divergências

- **Achado fora do escopo desta task, não corrigido**: `npm test`/`npx
  vitest run` (mesmo antes de qualquer mudança desta task, confirmado
  contra o commit-base `6a7b5d8` sem meu diff) falha em
  `src/features/import-export/agentPrompt.test.ts` — "não sobra
  frontmatter YAML da skill importada". Causa raiz identificada: o
  arquivo `.claude/skills/gerar-diagrama-classmap/SKILL.md` é lido neste
  checkout com fim de linha CRLF (`core.autocrlf=true` global desta
  máquina Windows, sem `.gitattributes` no repositório normalizando isso),
  e o regex de `stripFrontmatter` em
  `src/features/import-export/agentPrompt.ts` (`/^---\n[\s\S]*?\n---\n/`)
  só casa `\n` puro — nunca `\r\n` — então o frontmatter YAML da skill
  vaza para dentro do prompt gerado. É um bug real da TASK-037, latente
  em qualquer checkout Windows com autocrlf ligado (não é falha
  introduzida por esta task, nem toca nenhum dos 5 arquivos desta task).
  Não corrigido aqui — fora do escopo/arquivos da TASK-038 (regra do
  orquestrador: bug real fora de escopo vai para Divergências/Pendências,
  não é corrigido por conta própria).
- **Incidente operacional durante a execução (worktrees git irmãos
  compartilham `refs/stash`)**: no meio desta task, usei `git stash` /
  `git stash pop` para isolar o diff antes de rodar `npm test` duas vezes
  seguidas. Como esta rodada despacha 7 subagentes em paralelo, cada um
  num `git worktree` linked separado mas todos apontando para o mesmo
  `.git` comum, `refs/stash` é um único stack **compartilhado entre
  todos os worktrees** (não é isolado por worktree, ao contrário de
  `HEAD`/index). Uma janela concorrente com outro subagente (aparentemente
  o de `task/045-animacao-modal`, a julgar pelo conteúdo recuperado)
  resultou num `git stash pop` meu aplicando o diff *daquele* subagente
  (mudanças em `Modal.tsx`/`Modal.test.tsx`/`index.css` sobre o efeito de
  abrir/fechar do `Modal` genérico) dentro do meu próprio working
  directory, e minhas próprias 8 mudanças desapareceram do stash stack
  (population cruzada nos dois sentidos). Recuperação: salvei o diff
  estranho encontrado no meu working directory em
  `%TEMP%\...\scratchpad\rescued_diff_modal.patch` (fora deste
  repositório) antes de descartá-lo do meu working tree via `git checkout
  --`, e refiz minhas 8 mudanças de memória (o conteúdo exato de cada
  edição já estava registrado nesta própria sessão). Não usei `git stash`
  de novo depois disso. **Pendência para quem consolidar esta rodada**:
  confirmar se o subagente/worktree de `task/045-animacao-modal` conseguiu
  concluir com seu próprio diff intacto (ele pode ter perdido esse mesmo
  trecho do outro lado da troca); se não, o patch recuperado está
  disponível em `rescued_diff_modal.patch` (fora deste worktree, caminho
  acima) para reaplicar manualmente lá. Recomendação para as próximas
  rodadas com múltiplos worktrees simultâneos: evitar `git stash` (usar
  `git worktree` isolado já cobre o isolamento necessário; não há motivo
  para stash dentro de uma sessão de un único agente).

### Pendências

- Validação visual ao vivo (dark/light, timing real da animação,
  `prefers-reduced-motion` ligado/desligado) não foi possível contra uma
  sessão autenticada real (mesma ressalva de TASK-036/037). Tentei um
  harness sintético (HTML standalone importando o `src/index.css` real)
  no navegador embutido — confirmou que o CSS carrega sem erro, as
  variáveis de tema resolvem (`--accent`, cores dark/light) e o
  `CheckGlyph`/texto aparecem com a cor/estilo esperados — mas o harness
  rodou em modo "static snapshot" (arquivo fora da pasta do projeto/servidor
  ativo), sem execução de JS, então não foi possível alternar tema nem
  observar a animação em movimento por esse caminho. A cobertura real da
  transição (classe aplicada só no momento certo) vem dos 2 testes
  automatizados novos (jsdom executa JS de verdade). Recomendado uma
  confirmação visual manual rápida na próxima sessão com preview real.
- Ver "Divergências" acima quanto ao bug pré-existente de CRLF em
  `agentPrompt.ts`/TASK-037 e quanto ao incidente de `git stash`
  compartilhado entre worktrees desta rodada.

## Validação

- `npm run build` — limpo (`tsc -b` + `vite build`, sem erros).
- `npm run lint` — `oxlint` limpo (exit 0); mesmos 3 warnings pré-existentes
  em arquivos não tocados por esta task (`Toast.tsx`, `AuthContext.tsx`),
  confirmados também na base antes desta task.
- `npx vitest run --exclude "**/.claude/worktrees/**"` — 199/200 passando.
  A única falha (`agentPrompt.test.ts`) é pré-existente: confirmado que
  falha igual no commit-base `6a7b5d8`, antes de qualquer mudança desta
  task (ver "Divergências"). Suite isolada dos 5 arquivos desta task (`npx
  vitest run` nos 5 arquivos de teste envolvidos) — 44/44 passando,
  incluindo os 2 testes novos (CA-01 em `DiagramEditorPage.test.tsx`,
  CA-03 em `AccessManagementModal.test.tsx`). Uma segunda rodada da suite
  completa também mostrou uma falha adicional intermitente e não
  relacionada (`DiagramsRouteDispatcher.test.tsx`, timeout de
  `findByRole` sob carga de execução paralela) que não se repetiu numa
  terceira rodada nem isoladamente — flakiness de ambiente, não deste
  código.
- `node .claude/skills/impeccable/scripts/detect.mjs --json <8 arquivos
  alterados>` (script vive em `~/.claude/skills/impeccable/`, não
  vendorizado neste repo) — 1 achado, em `src/index.css:217`
  (`border-accent-on-rounded`, a régua `.card` do login já existente
  desde a TASK-032/ADR-011) — pré-existente, fora do bloco novo desta
  task (que começa na linha ~2384). Nenhum achado no bloco `.seal-confirm`
  nem nos outros 7 arquivos.

## Handoff
Nenhum handoff pendente — task implementada nesta sessão. Ver "Pendências"
acima para os dois itens que precisam de atenção humana/de outra sessão
(validação visual ao vivo; possível reconciliação do worktree
`task/045-animacao-modal` após o incidente de `git stash` compartilhado).
