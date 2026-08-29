---
id: TASK-016
title: Nome próprio para cada diagrama, na criação
status: backlog
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
- [ ] CA-01: Criar um diagrama com um nome customizado ("Diagrama de Classes — Pedidos") persiste e aparece exatamente assim na lista de diagramas e no topo da tela do diagrama.
- [ ] CA-02: Deixar o campo vazio ao confirmar usa o rótulo padrão do tipo (mesmo comportamento de hoje), sem erro.
- [ ] CA-03: Dois diagramas do mesmo tipo no mesmo projeto, com nomes diferentes, aparecem diferenciados na lista.
- [ ] CA-04: `npm run build`, `npm run lint` e `npm test` limpos.

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
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum — task ainda não iniciada.
