---
id: TASK-016
title: Nome próprio para cada diagrama, na criação
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [navigation]
related_use_cases: []
related_adrs: []
---

# TASK-016 — Nome próprio para cada diagrama

Task trivial e de escopo único (a coluna já existe no banco, é só expor um campo na criação) — sem ambiguidade de abordagem, pulando o ritual de 3 opções do `bootstrap-plan`.

## Contexto
Feedback do usuário (`.agents/context/CONTEXT.md`, sessão de validação manual de 2026-08-29): "quando criamos os diagramas, não é possível adicionar um nome para cada diagrama". Investigação confirmou que `diagrams.name` já existe na tabela (`supabase/migrations/20260828130100_schema_tables.sql`, com `default 'Novo diagrama'`) e já é exibido na UI (`diagram.name` em `SystemViewPage.tsx`/`DiagramEditorPage.tsx` etc.) — só que `DiagramsPage.tsx` sempre chama `createEmptyDiagram(projectId, type, DIAGRAM_TYPE_LABELS[type])`, sobrescrevendo com o rótulo do tipo ("Diagrama de Classes", "Diagrama de Objetos", "Visão do Sistema") em vez de deixar o usuário escolher.

## Problema
Um projeto com mais de um diagrama do mesmo tipo (ex.: dois "Diagrama de Classes" — um para o módulo de Pedidos, outro para Catálogo) não tem como diferenciá-los pelo nome — os dois aparecem como "Diagrama de Classes" na lista.

## Objetivo
Ao clicar em "+ Diagrama de X", pedir um nome (com um padrão sugerido, ex. o próprio rótulo do tipo, editável) antes de criar o registro.

## Fora de escopo
- Renomear um diagrama já existente (pode ser uma task futura, se o usuário pedir — hoje o pedido foi só sobre a criação).
- Qualquer mudança de schema — `diagrams.name` já existe.

## Comportamento atual
`src/features/navigation/DiagramsPage.tsx` cria o diagrama direto ao clicar em "+ Diagrama de Classes"/"+ Diagrama de Objetos"/"+ Visão do Sistema", sem nenhum campo de nome — `name` sempre vira `DIAGRAM_TYPE_LABELS[type]`.

## Comportamento esperado
- Clicar em "+ Diagrama de X" abre um modal (reaproveitando `Modal`, TASK-010) com um campo de texto pré-preenchido com o rótulo do tipo (`DIAGRAM_TYPE_LABELS[type]`), editável.
- Confirmar cria o diagrama com o nome digitado (`createEmptyDiagram(projectId, type, nomeDigitado)`); campo vazio cai de volta no rótulo padrão (nunca cria com nome vazio, já que a coluna tem `not null`).

## Regras de negócio
Nenhuma nova.

## Critérios de aceitação
- [x] CA-01: Criar um diagrama com um nome customizado ("Diagrama de Classes — Pedidos") persiste e aparece exatamente assim na lista de diagramas e no topo da tela do diagrama. Coberto por teste automatizado (`DiagramsPage.test.tsx`, `createEmptyDiagram` chamado com o nome digitado) — a persistência em si já era comportamento existente (`name` sempre foi passado para `createEmptyDiagram`/exibido via `diagram.name`), só a origem do valor mudou. Não validado manualmente contra o Supabase real nesta sessão (sem acesso a produção/segundo usuário aqui).
- [x] CA-02: Deixar o campo vazio ao confirmar usa o rótulo padrão do tipo (mesmo comportamento de hoje), sem erro. Coberto por teste automatizado (campo só com espaços cai em `DIAGRAM_TYPE_LABELS[type]` via `name.trim() || DIAGRAM_TYPE_LABELS[type]`).
- [x] CA-03: Dois diagramas do mesmo tipo no mesmo projeto, com nomes diferentes, aparecem diferenciados na lista. **Fechado em 2026-08-29** (sessão de `bootstrap-complete`): teste automatizado novo em `DiagramsPage.test.tsx` mocka `listDiagrams` retornando dois diagramas `type: 'classes'` com nomes diferentes e confirma que ambos aparecem na lista renderizada — mesma ressalva das demais CAs desta onda (mock, não Supabase real).
- [x] CA-04: `npm run build`, `npm run lint` e `npm test` limpos.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/navigation/DiagramsPage.tsx` (modal de nome antes de `createEmptyDiagram`).
### Banco de dados
Nenhuma mudança — `diagrams.name` já existe.
### Integrações
Nenhuma.
### Segurança
Nenhuma.

## Plano de implementação
- [ ] Modal de nome (reaproveitando `Modal`), um por tipo de diagrama ou um só parametrizado pelo tipo escolhido.
- [ ] Conectar ao `createEmptyDiagram` já existente, sem mudar sua assinatura (já aceita `name` como parâmetro).

## Estratégia de testes
- [ ] Componente: modal abre com o nome padrão pré-preenchido, editável, confirma com o nome digitado.
- [ ] Manual: criar 2 diagramas do mesmo tipo com nomes diferentes, confirmar diferenciação na lista.

## Riscos e rollback
Risco muito baixo — mudança pequena e isolada, sem tocar schema. Rollback: reverter `DiagramsPage.tsx`.

## Registro de execução
### Alterações realizadas
`DiagramsPage.tsx` ganhou um modal de nome (reaproveitando o `Modal` genérico da TASK-010) entre o clique em "+ Diagrama de X" e a chamada a `createEmptyDiagram`. Antes, `handleCreateDiagram(type)` chamava `createEmptyDiagram` direto com `DIAGRAM_TYPE_LABELS[type]`. Agora o clique no botão abre o modal (`openNamingModal`) com um `<input>` pré-preenchido com o rótulo do tipo; confirmar (`handleCreateDiagram(type, name)`) usa o texto digitado, com `name.trim() || DIAGRAM_TYPE_LABELS[type]` garantindo que um campo vazio/só espaços nunca tente criar com nome vazio (CA-02). `Enter` no campo também confirma. `createEmptyDiagram` não teve a assinatura alterada — só o argumento `name` passou a vir do usuário.

### Arquivos principais
- `src/features/navigation/DiagramsPage.tsx` — modal de nome antes da criação.
- `src/features/navigation/DiagramsPage.test.tsx` (novo) — testes de componente para CA-01/CA-02, mockando `src/lib/supabase/queries` (padrão de `SystemViewPage.test.tsx`).

### Decisões
- Um único modal parametrizado pelo `namingType` (em vez de um componente por tipo de diagrama) — mesmo padrão de estado usado para `openModal` em `ImportExportControls.tsx`.
- Reaproveitado o `Modal` genérico (TASK-010) sem nenhuma mudança nele.

### Divergências
Nenhuma — implementação seguiu exatamente o "Comportamento esperado" e o "Plano de implementação" da task.

### Pendências
- Validação manual contra o Supabase real (login de verdade, projeto real) não foi feita para nenhuma CA desta task — mesma lacuna estrutural de todas as TASK-011..017 desta rodada (ver `.agents/context/CONTEXT.md`). CA-03 já tem cobertura automatizada (ver acima, fechada em 2026-08-29), então a pendência que resta é a mesma das demais: confirmar visualmente contra produção quando houver sessão com acesso.

## Validação
- `npm install` — ok, 130 pacotes, 0 vulnerabilidades (worktree isolado, sem `node_modules` prévio).
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, saída idêntica de 4 warnings pré-existentes em outros arquivos, nenhum novo).
- `npm test` — ok, 15 arquivos / 93 testes passando (90 pré-existentes + 3 em `DiagramsPage.test.tsx` — CA-01/CA-02 originais + CA-03 adicionado na sessão de `bootstrap-complete`, 2026-08-29).

## Handoff
Nenhum — task fica em `active/` (todas as CAs fechadas por evidência automatizada, mas sem validação manual contra Supabase real — mesmo padrão de TASK-001..005/011..017 desta rodada) até essa validação acontecer.
