---
id: ADR-012
title: Layout inicial de import do Diagrama de Classes — colunas adaptativas ao tamanho do diagrama
status: accepted
date: 2026-09-03
deciders: [victor-essencislabs]
related_tasks: [TASK-048]
---

# ADR-012 — Colunas adaptativas no layout inicial de import

## Contexto

Testado ao vivo (2026-09-03): importar o diagrama real do ELIMS (85 classes, 190 relações, gerado via skill `gerar-diagrama-classmap` a partir do código-fonte real) produz um resultado visualmente ruim no Diagrama de Classes. Causa raiz identificada em `importClassDiagram` (`src/features/import-export/classDiagramConversion.ts`): o empacotamento "masonry" (cada classe entra na coluna mais curta no momento, mesma lógica de TASK-005 para não sobrepor cards) usa um número de colunas **fixo** — `IMPORT_GRID_COLUMNS = 4`, independente de o JSON importado ter 5 classes ou 850.

Com 85 classes em 4 colunas (~21 por coluna) e largura de coluna fixa (`CLASS_CARD_WIDTH=200` + gap 60px = 260px), o resultado é uma faixa de ~1040px de largura por milhares de pixels de altura. "Ajustar à tela" precisa encolher tudo para caber na altura, deixando o texto dos cards ilegível e um espaço em branco enorme nas laterais do canvas.

Posição (`x`/`y`) é informação puramente interna ao ClassMap — nunca faz parte do contrato JSON público de import/export (mesmo precedente já registrado na TASK-003/TASK-005 e reafirmado na ADR-005 para `color`). Esta decisão não muda o schema Zod (`schema.ts`) nem exige coordenação com `contrato-ia-diagrama`.

## Decisão

`IMPORT_GRID_COLUMNS` deixa de ser uma constante fixa e passa a ser calculado a partir do número de classes do JSON importado (ex.: `Math.max(1, Math.ceil(Math.sqrt(N * fator_de_forma)))`, com `fator_de_forma` calibrado para o diagrama resultante ficar mais próximo de uma proporção larga do que alta — a proporção exata é detalhe de implementação da TASK-048, validado visualmente contra o diagrama real do ELIMS). O algoritmo de empacotamento em si (masonry por coluna mais curta, ordem do JSON) não muda — só o número de colunas que ele usa.

Diagramas pequenos (a maioria dos casos de uso hoje — poucas classes por módulo) continuam se comportando como antes; o efeito da mudança só aparece a partir de diagramas grandes como o do ELIMS.

## Alternativas consideradas

### Alternativa B — Motor de layout de grafo real (layered/hierárquico, ex. `dagre`/`elkjs`)
Substituir o masonry por um algoritmo consciente das relações: agrupa classes conectadas, minimiza cruzamento de conector, distribui em 2D de fato. É a correção mais completa — ataca tanto a proporção quanto a "espaguetização" de conectores em diagramas grandes de verdade (Elims/GeoCloudAI vão continuar gerando diagramas de 80+ classes). Rejeitada por ora: exige uma dependência de cliente nova (sem custo de infra, não fere o teto de R$50/mês, mas ainda é peso não-trivial de manutenção/teste), mais superfície de teste e mais risco de regressão numa área do produto que já acumulou trabalho fino recente (TASK-041/042 — animação de seleção/conector; TASK-043 — animação do "ajustar à tela"). Na inspeção visual do diagrama real do ELIMS que motivou esta ADR, o problema dominante foi proporção/zoom, não cruzamento de linha — não há evidência concreta hoje de que o ganho da Alternativa B compensa o custo. Mesmo padrão de decisão já usado neste projeto para rejeitar esforço desproporcional sem sinal de uso (ver ADR-004, ADR-007, ADR-009).

### Alternativa C — Colunas adaptativas + ordenação por conectividade
Mesma mudança de colunas adaptativas desta ADR, mais um passo de reordenação das classes por proximidade no grafo (ex. BFS a partir da classe com mais relações) antes de empacotar, para que classes conectadas tendam a cair em colunas vizinhas — sem trocar o algoritmo de posicionamento em si. Mais barata que a Alternativa B (sem dependência nova), mas ainda uma heurística sem garantia formal, e sem evidência ainda de que é necessária. Fica registrada como follow-up natural (ver "Revisão") se, depois da TASK-048 em produção, a leitura do diagrama do ELIMS ainda incomodar por classes relacionadas caindo em colunas distantes.

## Consequências

### Positivas
- Resolve o problema visual observado (proporção largura/altura, legibilidade após "ajustar à tela") com uma mudança pequena e localizada.
- Nenhuma dependência nova, nenhuma mudança de contrato público, nenhuma coordenação com `contrato-ia-diagrama` — escopo 100% contido em `frontend-diagramas`.
- Sem efeito sobre diagramas pequenos já validados em produção.

### Negativas
- Não resolve cruzamento de conector em diagramas grandes com muitas relações cruzando colunas — classes fortemente relacionadas podem continuar caindo em colunas não-adjacentes, porque o empacotamento continua na ordem do JSON, não na topologia do grafo.

### Riscos
Baixo. Mudança aditiva num único arquivo (`classDiagramConversion.ts`), sem afetar o schema de import/export nem a lógica de edição livre pós-import (usuário continua podendo arrastar qualquer card).

## Plano de adoção

Uma task só (`TASK-048`, `frontend-diagramas`): trocar a constante fixa pelo cálculo adaptativo, validar visualmente contra o diagrama real do ELIMS (85 classes) e contra um diagrama pequeno existente (não regredir o caso comum).

## Validação

Reimportar o JSON real do ELIMS (85 classes / 190 relações) depois da mudança e confirmar visualmente: "ajustar à tela" produz um diagrama com proporção largura/altura razoável (não uma faixa estreita e gigante) e texto legível num zoom inicial razoável. Confirmar também que um diagrama pequeno (ex. 5 classes) não muda de aparência perceptível.

## Revisão

Reavaliar a Alternativa C (ordenação por conectividade) ou a Alternativa B (motor de layout de grafo) se, depois da TASK-048 em produção, um diagrama grande real continuar difícil de ler por causa de conectores cruzando muitas colunas — decisão a tomar com evidência visual concreta, não preventivamente.
