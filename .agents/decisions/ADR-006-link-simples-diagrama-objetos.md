---
id: ADR-006
title: Diagrama de Objetos — link simples entre instâncias, sem os 5 tipos UML
status: accepted
date: 2026-08-29
deciders: [victor-essencislabs]
related_tasks: [TASK-017]
---

# ADR-006 — Link simples entre objetos no Diagrama de Objetos

## Contexto

Usuário observou, revisando a tela publicada do Diagrama de Objetos (ADR-002/TASK-008), que não é possível ligar dois objetos entre si criando um relacionamento — diferente do Diagrama de Classes, que tem modo de conexão (`connectMode.ts`) com os 5 tipos UML e multiplicidade (`Connector.tsx`). Isso é comportamento deliberado, já documentado em `ObjectDiagramCanvas.tsx`/TASK-008 ("Sem modo de conexão — objetos não se relacionam entre si neste modelo, fora de escopo"), mas o usuário pediu explicitamente para tornar isso possível, "igual é feito no diagrama de classes".

O modelo de dados atual (`ObjectDiagramContent`, `src/features/object-diagram/types.ts`) só tem `objects: DiagramObject[]`, sem nenhuma estrutura de ligação — a contagem "Relações" da sidebar do Diagrama de Objetos fica sempre em 0, por decisão da TASK-007/008. O contrato JSON público (`schema.ts`/`contrato-ia-diagrama.md`) já declara `objects`, mas o Diagrama de Objetos ainda não tem conversão import/export implementada (dívida técnica já registrada em `CONTEXT.md`) — a mudança de modelo interno proposta aqui não precisa tocar esse contrato.

## Decisão

Adicionar uma estrutura de **link simples** entre objetos — sem os 5 tipos UML (associação/agregação/composição/herança/dependência) nem multiplicidade, que descrevem relação entre *classes*, não entre *instâncias concretas já materializadas*. Um link é `{ id, from, to, label? }` (rótulo textual livre e opcional), renderizado como uma linha reta simples entre os cards de objeto.

Reaproveitar a máquina de estado de conexão já existente e testada (`connectMode.ts`, `resolveConnectClick`) para o modo "clique origem→destino" no Diagrama de Objetos — ela já é genérica por ids, não específica de classe. O componente de conector é novo (não reaproveita `Connector.tsx` diretamente, que é específico dos 5 símbolos geométricos de classe), mas replica seu padrão de roteamento ortogonal e ponto de controle arrastável, para manter consistência visual entre as duas telas.

A contagem "Relações" na sidebar do Diagrama de Objetos passa a refletir `links.length` de verdade.

## Alternativas consideradas

### Alternativa B — Paridade total com o Diagrama de Classes (os 5 tipos UML + multiplicidade também entre objetos)
Reaproveitar/generalizar `Connector.tsx` como está, com os mesmos 5 tipos e multiplicidade nas duas pontas, UI idêntica ("🔗 Relação" na topbar). Entregaria a paridade visual pedida literalmente, mas é semanticamente incorreta em UML: herança/agregação/composição descrevem a relação entre classes, não entre duas instâncias concretas — um objeto não "herda" de outro objeto, por exemplo. Rejeitada: o ganho de paridade visual não compensa introduzir uma inconsistência de domínio que pode confundir quem usa o ClassMap para documentação real do Elims/GeoCloudAI.

### Alternativa C — Link simples + fechar também a lacuna do contrato JSON de import/export para objetos
Mesma decisão de modelo interno desta ADR, mas estendendo já nesta rodada o contrato público (`schema.ts`, `contrato-ia-diagrama.md`, skill `gerar-diagrama-classmap`) para incluir `links` em `objects`, implementando a conversão import/export que hoje não existe para Diagrama de Objetos. Fecharia de vez uma dívida técnica já registrada, mas dobra o escopo do que foi pedido (o pedido era só a ligação visual) e exigiria coordenação obrigatória com `contrato-ia-diagrama` (mudança de contrato público sempre precisa de ADR própria) além de uma task adicional. Rejeitada por ora — fica registrada como trabalho futuro natural (ver "Revisão").

## Consequências

### Positivas
- Atende ao pedido do usuário sem introduzir um conceito UML incorreto entre instâncias.
- Reaproveita a máquina de estado de conexão já testada (`connectMode.ts`), reduzindo a superfície de código novo.
- Nenhuma migration, nenhuma mudança de contrato público, nenhuma coordenação com `contrato-ia-diagrama` — escopo 100% contido em `frontend-diagramas`, mesmo padrão de precedente do ADR-005.

### Negativas
- Não é visualmente idêntico ao Diagrama de Classes (sem os símbolos geométricos) — usuário já escolheu esta opção ciente do trade-off.
- Um link criado no Diagrama de Objetos não tem hoje nenhum caminho de export/import (mesma limitação já aceita para todo o Diagrama de Objetos) — se isso incomodar na prática, ver Alternativa C.

### Riscos
Nenhum novo — mudança de UI/modelo interno, sem tocar RLS, autorização, migration ou o contrato público.

## Plano de adoção

Uma task só (`TASK-017`, `frontend-diagramas`) — escopo cabe inteiro num único papel/camada (frontend), mesmo padrão do precedente ADR-005/TASK-014: `links` em `ObjectDiagramContent` + `contentOperations.ts` (criar/remover link) + modo de conexão na topbar + componente de conector simples + contagem real em "Relações".

## Validação

Testes unitários de `contentOperations.ts` (criar link, remover link, remover objeto remove seus links) + teste de componente cobrindo o fluxo clicar origem→destino→link criado. Comparação lado a lado com o artefato-protótipo não se aplica aqui (essa interação não existe no artefato original) — validação por critérios de aceitação da task.

## Revisão

Reavaliar a Alternativa C se o produto precisar que um agente de IA externo gere objetos já ligados entre si (hoje o pedido é só a interação manual dentro do ClassMap).
