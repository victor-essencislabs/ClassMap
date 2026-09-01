---
id: ADR-011
title: Redesign visual do ClassMap — direção "Certificado de Ensaio", substitui os tokens do artefato-protótipo (ADR-002)
status: accepted
date: 2026-09-01
deciders: [victor-essencislabs]
related_tasks: [TASK-032, TASK-033, TASK-034, TASK-035, TASK-036]
---

# ADR-011 — Redesign visual do ClassMap: direção "Certificado de Ensaio"

## Contexto

Os tokens de design vigentes (`src/index.css`, indigo `#4a4fe0`/`#8489ff`, Manrope, cards brancos com sombra suave) foram extraídos literalmente de um artefato-protótipo validado em 2026-08-29 (ADR-002/TASK-006..010). O usuário testou o app publicado e classificou esse visual como genérico — "parece IA", indistinguível de qualquer outro dashboard SaaS gerado por um agente. Pediu explicitamente um redesign do sistema inteiro (navegação, as 3 visualizações de diagrama, login/acesso), sem referência ou restrição visual fixada — direção a propor do zero.

Conduzida via `/impeccable` (skill de design), rodada de decisão visual (`concept-seed.mjs --scope direction --mode operate`, seed key `54ce3b5a`): 7 direções próprias derivadas do mundo real da audiência (time técnico da Essencislabs documentando Elims — um LIMS de ensaio geoquímico/mineração — e GeoCloudAI), pesadas contra 6 desafiantes de um catálogo genérico. O usuário escolheu, entre as opções apresentadas numa página de decisão visual, a direção **"Certificado de Ensaio"** (candidata de maior ressonância da lista própria, card "ESCOLHA DO IMPECCABLE") em vez da direção sorteada ("Caderneta de Campo").

## Decisão

Substituir os tokens de design e a linguagem visual do artefato-protótipo (ADR-002) pela direção **Certificado de Ensaio**: cada tela do ClassMap lê como um laudo técnico certificado — cabeçalho travado com metadados (projeto/autor/data), corpo em tabela/grade travada, selo de validação como acento primário — em vez de um dashboard SaaS genérico.

Tokens principais:
- Papel/superfície: `#f7f6f2` (claro) / equivalente escuro a definir na implementação.
- Tinta/texto: `#14161c`.
- Selo vermelhão (acento primário — ações, validação, "salvo"): `#b8322a`.
- Tinta técnica azul (estrutural — Diagrama de Classes, grades): `#2f5f8f`.
- Tinta QC verde (Diagrama de Objetos — valores medidos/concretos): `#2f8f5f`.
- Tipografia: IBM Plex Sans (UI) + IBM Plex Mono (todo dado técnico/tabular — já usado parcialmente desde TASK-006), substitui Manrope.

Raises incorporados de desafiantes descartados/competitivos da rodada (ver payload da decisão, `.impeccable/decision-payload.json`):
- Do desafiante "Folha Miura-Ori": um único controle de foco implanta os 3 blocos da Visão do Sistema com precisão mecânica — nunca abertura parcial.
- Do desafiante "Painel Catódico": papéis (visualizador/editor) sempre mostram as duas opções lado a lado, a concedida "carimbada", a outra como marca fantasma.
- Do desafiante "Serviço Teletexto": tabelas da Visão do Sistema seguem grade de coluna rígida e exata.

Escopo: sistema inteiro (navegação, Diagrama de Classes, Diagrama de Objetos, Visão do Sistema, login/gestão de acesso), mesmo padrão de fatiamento por task usado em ADR-002 (fundação primeiro, depois cada superfície).

## Alternativas consideradas

### Alternativa A — Manter a direção sorteada ("Caderneta de Campo")
Mundo de caderneta de campo geológica/laboratorial (papel quadriculado, lápis vermelho de interpretação, abas de amostra coloridas). Boa aderência ao domínio e à métrica de cadeia de custódia já existente no produto (autor/data por diagrama), mas o usuário preferiu a leitura mais direta de "laudo certificado" — mais próxima do próprio domínio do Elims (um LIMS), com risco de virar padrão de categoria já nomeado na própria rodada e aceito pelo usuário.

### Alternativa B — Polir o visual atual em vez de substituí-lo
Manter indigo/Manrope e só refinar espaçamento/hierarquia. Rejeitada: o próprio pedido do usuário foi "redesenhar", não "polir" — a queixa é a identidade em si (genérica), não um defeito de execução dentro dela.

## Consequências

### Positivas
- Identidade visual distintiva, ancorada no domínio real do produto (laudo/certificado de ensaio), não mais um acento indigo genérico.
- Sistema de cor com papéis funcionais claros (selo=ação/validação, azul=estrutura de classes, verde=valores de objeto), reaproveitando o padrão já existente de `--accent`/`--object-accent`/`--danger` como slots, só com novos valores e um papel a mais.

### Negativas
- Mesmo custo de reengenharia de ADR-002: reimplementação em CSS/React, não um simples find-replace de cor (cabeçalho travado, selo, grade técnica são elementos novos, não só recoloração).
- Trabalho fatiado em múltiplas tasks (fundação + 4 superfícies) — entrega completa não é imediata.

### Riscos
- "Vira padrão de categoria" — risco nomeado na própria rodada de decisão (Elims já é um LIMS, então a metáfora de laudo é a leitura mais óbvia do domínio). Mitigação: o selo e a grade técnica precisam ser tratados com rigor visual real (dados, não decoração) — critério de aceitação de cada task cobre isso.
- Contraste/acessibilidade do selo vermelhão sobre papel claro precisa ser validado (WCAG AA) antes de virar cor de ação primária em botões — verificado na implementação da fundação (TASK-032).

## Plano de adoção

Mesmo padrão de ADR-002: fundação primeiro, depois cada superfície, nesta ordem de dependência:

1. **TASK-032** (`frontend-diagramas`) — Fundação: tokens de `src/index.css` (papel/tinta/selo/azul-técnico/verde-QC, dark e light), fontes (IBM Plex Sans + Mono), `AppLayout`/navegação e telas de login/acesso.
2. **TASK-033** (`frontend-diagramas`, depende de TASK-032) — Diagrama de Classes: `DiagramShell`, cards de classe, conectores, inspector.
3. **TASK-034** (`frontend-diagramas`, depende de TASK-032 e TASK-033) — Diagrama de Objetos: mesma infraestrutura de canvas com a tinta QC verde.
4. **TASK-035** (`frontend-diagramas`, depende de TASK-032) — Visão do Sistema: cabeçalho de laudo travado, tabelas em grade rígida (raise do desafiante Teletexto).
5. **TASK-036** (`frontend-diagramas`, depende de TASK-032 e TASK-033) — Modais (import/export, gestão de acesso): selo de validação, papéis lado a lado (raise do desafiante Painel Catódico).

## Validação

- Cada task conclui com captura de tela em desktop e mobile, nos dois temas, revisadas contra o contrato de direção (`index.html`, comentário `impeccable-direction`).
- `npm run build`/`npm run lint`/`npm test` limpos a cada task.
- `node .claude/skills/impeccable/scripts/detect.mjs --json` rodado sobre os arquivos alterados de cada task.

## Revisão

Reavaliar se, ao concluir TASK-033 (a mais arriscada — conectores/canvas com a nova paleta), o selo vermelhão como acento único de ação (botões primários, links, foco) causar problema de contraste ou fadiga visual em uso prolongado — nesse caso, reconsiderar mover parte da carga de acento para a tinta azul técnica.
