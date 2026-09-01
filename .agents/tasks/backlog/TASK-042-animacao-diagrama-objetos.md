---
id: TASK-042
title: Diagrama de Objetos — seleção de card animada e destaque de herança na criação
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [object-diagram]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-042 — Diagrama de Objetos: seleção de card e destaque de herança

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Feedback + Estado" — equivalente objeto da TASK-041, mas com uma segunda ideia mais especulativa (destaque de herança).

**Atenção — overlap conhecido e aceito**: esta task toca `ObjectDiagramCanvas.tsx` (para rastrear qual objeto acabou de ser criado), no mesmo arquivo que a TASK-043 (assentamento do "ajustar à tela") também toca, em linhas diferentes. Mesclar esta task (042) antes da TASK-043 na branch `feature/animacoes-sistema`.

## Problema

1. A borda de seleção de um card de objeto (`.node-box.object.selected`, tinta `--object-accent`) aparece/some sem transição.
2. Quando um objeto é criado a partir de uma classe, ele herda os valores iniciais dos atributos por snapshot (RN-01 da TASK-004) — hoje esses valores aparecem no card (`ObjectCard.tsx`) sem nenhuma indicação visual de que vieram da classe, não foram digitados ali.

## Objetivo

- Card selecionado: mesma transição de borda da TASK-041 (~120ms), com `--object-accent`.
- Objeto recém-criado: destaque momentâneo (fundo `--object-soft` piscando uma vez, ~300ms) nos campos que vieram da herança, para comunicar a origem do dado.

## Fora de escopo

- O item de herança é a ideia mais especulativa desta rodada (levantamento original já sinalizava: "vale confirmar se esse é um problema real de compreensão antes de construir"). Implementar mesmo assim, mas deixar registrado no "Registro de execução" se, na prática, o efeito parecer ruído em vez de esclarecimento — decisão final de manter/reverter é do usuário, não do subagente.
- Links entre objetos (`ObjectLinkConnector.tsx`) — sem efeito de "nascendo" nesta rodada (ver TASK-041, "Fora de escopo", sobre Diagrama de Objetos).
- Diagrama de Classes — ver TASK-041.

## Comportamento atual

- `.node-box.object.selected` (aplicado em `ObjectCard.tsx`) muda de classe sem transição declarada.
- `ObjectCard.tsx` renderiza `obj.values` (nome + valor) sem diferenciar herdado de editado.

## Comportamento esperado

- `.node-box.object.selected`: mesma transição de borda da TASK-041 (~120ms), cor `--object-accent`.
- No momento da criação de um objeto (fluxo em `ObjectDiagramCanvas.tsx` que gera o snapshot inicial de atributos), marcar o objeto recém-criado (ex.: `useState<string | null>` com o id) e passar um prop `justCreated` para `ObjectCard.tsx`; quando verdadeiro, cada `.node-row` de valor pisca `--object-soft` uma vez (~300ms), e o próprio card limpa o flag ao final (`onAnimationEnd`) para não repetir em re-renders.
- Bloco de `prefers-reduced-motion: reduce` próprio para os dois efeitos.

## Regras de negócio

- RN-01: o destaque de herança dispara só na criação do objeto — nunca ao reabrir um diagrama existente ou editar um valor manualmente depois.
- RN-02: cor `--object-accent`/`--object-soft` (identidade estrutural do Diagrama de Objetos), nunca `--accent`.

## Critérios de aceitação

- [ ] CA-01: selecionar um card de objeto transiciona a borda suavemente (~120ms), nos dois temas.
- [ ] CA-02: criar um objeto a partir de uma classe com atributos faz os valores herdados piscarem uma vez (~300ms).
- [ ] CA-03: reabrir um diagrama com objetos existentes NÃO dispara o destaque de herança.
- [ ] CA-04: editar um valor manualmente depois da criação não reaciona o destaque.
- [ ] CA-05: `prefers-reduced-motion: reduce` reduz os 2 efeitos conforme especificado.
- [ ] CA-06: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/ObjectCard.tsx`, `src/features/object-diagram/ObjectDiagramCanvas.tsx` (rastreio do id recém-criado — mudança pequena e isolada, ver nota de overlap acima), `src/index.css`.
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [ ] Trabalhar em worktree git isolado, branch `task/042-animacao-diagrama-objetos` criada a partir de `feature/animacoes-sistema`.
- [ ] `.node-box.object.selected`: adicionar transição de borda em `src/index.css`.
- [ ] `ObjectDiagramCanvas.tsx`: rastrear id do objeto recém-criado (mudança mínima).
- [ ] `ObjectCard.tsx`: destaque de `--object-soft` nos `.node-row` quando `justCreated`.
- [ ] Testes: confirmar que o flag de "recém-criado" não vaza para objetos pré-existentes nem sobrevive a uma edição manual do valor.
- [ ] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [ ] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [ ] Preencher "Registro de execução"/"Validação", incluindo uma nota honesta sobre se o destaque de herança pareceu útil ou ruído na verificação manual.
- [ ] Mover para `.agents/tasks/active/`.

## Estratégia de testes

- [ ] Unitários: teste novo confirmando que `justCreated` não vaza para objetos carregados de um diagrama existente nem sobrevive a uma edição.
- [ ] Manual: navegador embutido, criar objeto de uma classe com atributos, editar um valor depois, dark/light, `prefers-reduced-motion` ligado e desligado.

## Riscos e rollback

Risco baixo-médio — mesma natureza da TASK-041 (rastreio de "recém-criado" é lógica, não só CSS). Risco adicional próprio: o destaque de herança é a ideia mais especulativa da rodada — se na validação manual parecer confuso/ruído, sinalizar ao usuário em vez de insistir. Rollback: reverter `.node-box.object.selected` em `index.css`, o rastreio em `ObjectDiagramCanvas.tsx` e o destaque condicional em `ObjectCard.tsx`. Overlap esperado e aceito com TASK-043 em `ObjectDiagramCanvas.tsx` — mesclar 042 antes de 043.

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
