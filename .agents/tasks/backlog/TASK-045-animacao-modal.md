---
id: TASK-045
title: Abrir/fechar animado do modal genérico
status: backlog
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

- [ ] CA-01: abrir qualquer modal do app (testar pelo menos `ClassPickerModal`, exportar/importar JSON e `AccessManagementModal`) mostra o backdrop e o painel entrando em sequência, nos dois temas.
- [ ] CA-02: fechar é visivelmente mais rápido que abrir.
- [ ] CA-03: `prefers-reduced-motion: reduce` reduz para fade puro, sem `scale`/delay.
- [ ] CA-04: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

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

- [ ] Trabalhar em worktree git isolado, branch `task/045-animacao-modal` criada a partir de `feature/animacoes-sistema`.
- [ ] Confirmar que todo modal do app passa por `Modal.tsx` (grep por `modal-overlay`/`class="modal"` fora deste componente) — registrar em "Divergências" se achar exceção, sem corrigir aqui.
- [ ] `src/index.css`: transições de `.modal-overlay`/`.modal` conforme especificado + bloco de reduced-motion próprio.
- [ ] Validar visualmente em pelo menos 3 modais diferentes do app, nos dois temas.
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: existente (`AccessManagementModal.test.tsx` e outros que renderizam `Modal`) não deve quebrar.
- [ ] Manual: navegador embutido, pelo menos 3 modais diferentes, dark/light, `prefers-reduced-motion` ligado e desligado.

## Riscos e rollback

Risco mínimo — mudança concentrada em 1 componente compartilhado + 1 regra CSS, beneficia todos os modais do app de uma vez. Rollback: reverter `.modal-overlay`/`.modal` em `index.css`.

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
