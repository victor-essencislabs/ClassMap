---
id: ADR-005
title: Customização de cor do card de classe — interna ao ClassMap, fora do contrato JSON
status: accepted
date: 2026-08-29
deciders: [victor-essencislabs]
related_tasks: [TASK-014]
---

# ADR-005 — Customização de cor do card de classe

## Contexto

Feedback do usuário registrado em `.agents/context/CONTEXT.md` (sessão de validação manual das TASK-001..005, 2026-08-29): hoje `ClassCard`/`.node-box` usam só as cores fixas do design system (roxo `--accent` para classes, ciano `--object-accent` para objetos), sem nenhum controle de cor por card. Pedido: poder pintar o card de uma classe com uma cor à escolha, com pelo menos 20 cores disponíveis.

## Decisão

Cor é um atributo puramente visual do Diagrama de Classes, armazenado só no modelo interno do ClassMap (`color?: string` em `DiagramClass`, `src/features/class-diagram/types.ts`), persistido normalmente dentro de `diagrams.content` (JSONB, sem migration nova). Paleta fixa de pelo menos 20 cores predefinidas (tokens hexadecimais escolhidos para funcionar nos dois temas, dark/light — não um color-picker livre de qualquer RGB), selecionável no inspector da classe (mesma área onde hoje se edita nome/estereótipo/atributos). **Não entra no schema Zod público de import/export** (`src/features/import-export/schema.ts`, contrato com `contrato-ia-diagrama`) — mesmo padrão já usado para posição/layout, que também é só do ClassMap e não faz parte do contrato (decisão já registrada na TASK-003/TASK-005).

## Alternativas consideradas

### Alternativa B — Cor entra no contrato JSON público
Adicionar `color?` ao schema Zod (`schema.ts`), para que diagramas gerados por um agente de IA (ou reimportados) preservem a cor escolhida. Mais fiel no round-trip (exportar→importar preserva a cor), mas expande a superfície do contrato público por um recurso puramente estético — exigiria ADR própria de mudança de contrato (aprovada por `contrato-ia-diagrama`, ver `.claude/agents/contrato-ia-diagrama.md`, regra 3) e a skill `gerar-diagrama-classmap` precisaria passar a saber que o campo existe (mesmo que só para ignorá-lo, já que um agente gerando a partir de código-fonte não tem como "decidir" uma cor). Rejeitada: custo de mudança de contrato (coordenação com outro papel, risco de quebrar agentes de IA já rodando em Elims/GeoCloudAI) desproporcional ao ganho de um recurso decorativo.

### Alternativa C — Cor por estereótipo, não por classe individual
Em vez de cada classe escolher sua própria cor, a cor seria derivada do campo `stereotype` já existente (ex.: toda classe `<<entity>>` de uma cor, toda `<<service>>` de outra) — um mapa fixo estereótipo→cor, sem seletor manual nem paleta de 20 cores. Menor escopo de UI (não precisa de picker), mas não atende ao pedido literal do usuário ("pintar o card da cor que o usuário quiser") — uma classe sem estereótipo preenchido, ou duas classes com o mesmo estereótipo que o usuário queira diferenciar, ficariam sem solução. Rejeitada por não resolver o pedido como formulado.

## Consequências

### Positivas
- Nenhuma migration, nenhuma mudança de contrato público, nenhuma coordenação com `contrato-ia-diagrama` — escopo 100% contido em `frontend-diagramas`.
- Consistente com o precedente já estabelecido (posição/layout também são só do ClassMap, não do contrato).

### Negativas
- Um diagrama gerado por um agente de IA (via skill `gerar-diagrama-classmap`) nunca vem colorido — a cor é sempre um acabamento manual, feito depois, dentro do ClassMap.
- Exportar e reimportar um diagrama **perde a cor** (mesmo comportamento já aceito para posição) — se um usuário colore um diagrama, exporta e reimporta em outro projeto, precisa colorir de novo.

### Riscos
Nenhum novo — é uma mudança de UI/modelo interno sem tocar RLS, autorização ou o contrato público.

## Plano de adoção

Uma task só (`TASK-014`, `frontend-diagramas`): paleta de cores + campo `color` em `DiagramClass`/`contentOperations.ts` + seletor no inspector + aplicar a cor no `ClassCard`/`.node-box` (provavelmente como acento na borda/cabeçalho do card, preservando a legibilidade dos tokens de tema já existentes).

## Validação

Testes de componente cobrindo: escolher uma cor persiste no conteúdo do diagrama, recarregar preserva a cor, exportar JSON não inclui `color` (CA explícito, para não regredir a decisão desta ADR silenciosamente).

## Revisão

Reavaliar a Alternativa B se o produto pedir explicitamente que agentes de IA gerem diagramas já coloridos (hoje não há esse pedido).
