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

- [ ] CA-01: os 3 indicadores "Salvo" (Classes/Objetos/Visão do Sistema) disparam o efeito de carimbo ao passar de `saving`/vazio para `saved`, nos dois temas.
- [ ] CA-02: o botão "Copiar" do modal de exportar dispara o efeito ao confirmar a cópia.
- [ ] CA-03: o bloco "Conta criada..." dispara o efeito ao aparecer.
- [ ] CA-04: `prefers-reduced-motion: reduce` reduz os 5 pontos a um fade simples, sem remover o feedback.
- [ ] CA-05: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

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
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum handoff pendente — task recém-criada, ainda não implementada.
