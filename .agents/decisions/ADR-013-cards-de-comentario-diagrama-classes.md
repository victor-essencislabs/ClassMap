---
id: ADR-013
title: Cards de comentário no Diagrama de Classes — internos ao ClassMap, fora do contrato JSON
status: accepted
date: 2026-09-03
deciders: [victor-essencislabs]
related_tasks: [TASK-051]
---

# ADR-013 — Cards de comentário no Diagrama de Classes

## Contexto

Pedido do usuário (2026-09-03): poder colocar "cards de comentário" dentro do painel do Diagrama de Classes — um card com uma cor (a mesma paleta já usada para colorir card de classe, TASK-014/ADR-005) e um texto livre, documentando o que aquela cor significa no diagrama (ex.: card vermelho = "classes que precisam ser excluídas", card amarelo = "classes que precisam de ajustes"). É uma anotação livre, posicionada onde o usuário quiser no canvas — não presa a nenhuma classe específica.

Mesma pergunta já resolvida para cor de card na ADR-005: esse conteúdo entra no schema Zod público de import/export (`src/features/import-export/schema.ts`, contrato com `contrato-ia-diagrama`, consumido por agentes de IA rodando em Elims/GeoCloudAI), ou fica só no modelo interno do ClassMap? Perguntado diretamente ao usuário nesta sessão — decisão abaixo.

## Decisão

Card de comentário é um novo tipo de nó no modelo interno do Diagrama de Classes (`DiagramNote` — texto livre, posição `x`/`y`, cor opcional da mesma paleta `CLASS_COLORS` já usada por `DiagramClass.color`), persistido normalmente dentro de `diagrams.content` (JSONB, sem migration nova — mesmo padrão de TASK-014). **Não entra no schema Zod público de import/export** — mesmo precedente já usado para posição/cor de classe (ADR-005, TASK-003/TASK-005): um comentário é uma anotação humana feita depois, sobre um diagrama já existente; um agente de IA gerando o diagrama a partir de código-fonte não tem como (nem deveria) inventar o que uma cor "significa" para o time.

Reaproveita a mesma paleta de cores já existente (`CLASS_COLORS`) em vez de criar uma paleta nova — reforça visualmente a associação "esta cor de comentário é a mesma cor que aparece nos cards de classe".

## Alternativas consideradas

### Alternativa B — Comentário entra no contrato JSON público
Adicionar `notes?` ao schema Zod, para que comentários sobrevivam a um ciclo exportar→importar entre sessões/projetos. Rejeitada (confirmado com o usuário): exigiria coordenação com `contrato-ia-diagrama` e a skill `gerar-diagrama-classmap` precisaria saber ignorar esse campo (já que um agente gerando a partir de código-fonte não tem como decidir o texto de um comentário) — custo de mudança de contrato desproporcional a um recurso de anotação. Mesmo raciocínio da ADR-005, Alternativa B (lá, para cor).

### Alternativa C — Legenda fixa (não um card livre no canvas)
Em vez de um card arrastável e posicionável livremente, uma lista fixa "cor → significado" num painel lateral, sem posição no canvas. Mais simples de implementar (sem drag, sem `x`/`y`), mas não atende ao pedido literal do usuário ("ele coloca um card... dentro do painel" — ele quer o card posicionado no meio do diagrama, perto do que comenta, não uma lista à parte). Rejeitada por não bater com o pedido como formulado.

## Consequências

### Positivas
- Nenhuma migration, nenhuma mudança de contrato público, nenhuma coordenação com `contrato-ia-diagrama` — escopo 100% contido em `frontend-diagramas`.
- Reaproveita a paleta de cores já existente (`CLASS_COLORS`, `ClassColorGrid`) — sem paleta nova, sem componente de seleção de cor novo.
- Consistente com o precedente já estabelecido para posição/cor de classe.

### Negativas
- Um diagrama gerado por um agente de IA (skill `gerar-diagrama-classmap`) nunca vem com comentários — são sempre um acabamento manual, feito depois, dentro do ClassMap.
- Exportar e reimportar um diagrama **perde os comentários** (mesmo comportamento já aceito para posição/cor de classe) — reimportar de um JSON regenerado a partir do código-fonte não preserva anotações manuais feitas antes.

### Riscos
Nenhum novo — mudança de UI/modelo interno sem tocar RLS, autorização ou o contrato público. `notes` é um campo novo opcional em `ClassDiagramContent` — diagramas já salvos sem esse campo continuam funcionando (tratado como lista vazia).

## Plano de adoção

Uma task só (`TASK-051`, `frontend-diagramas`): `DiagramNote` (`types.ts`) + operações puras (`contentOperations.ts`) + `NoteCard.tsx` (arrastável, reaproveitando o mesmo padrão de drag do `ClassCard`) + inspector de nota (texto livre + `ClassColorGrid` reaproveitado + excluir) + botão "+ Nota" na topbar + notas entram no cálculo de bounds do "ajustar à tela".

## Validação

Testes cobrindo: criar/mover/colorir/editar texto/excluir uma nota persiste no conteúdo do diagrama; recarregar preserva; exportar JSON não inclui `notes` (mesmo CA explícito já usado para `color` na TASK-014, para não regredir esta decisão silenciosamente); um diagrama salvo sem o campo `notes` (formato anterior a esta ADR) continua carregando sem erro.

## Revisão

Reavaliar a Alternativa B se o produto pedir explicitamente que comentários sobrevivam a um ciclo de reimportação entre projetos/sessões (hoje não há esse pedido).
