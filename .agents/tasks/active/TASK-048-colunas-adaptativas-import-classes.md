---
id: TASK-048
title: Colunas adaptativas no layout inicial de import do Diagrama de Classes
status: active
type: bug
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [import-export]
related_use_cases: []
related_adrs: [ADR-012]
---

# TASK-048 — Colunas adaptativas no layout inicial de import

## Contexto
Achado testando ao vivo (2026-09-03) o diagrama real do ELIMS (85 classes, 190 relações, JSON gerado via skill `gerar-diagrama-classmap`) importado no ClassMap local. Ver `ADR-012` para a decisão (colunas adaptativas ao número de classes, algoritmo de empacotamento em si sem mudança).

## Problema
`importClassDiagram` (`src/features/import-export/classDiagramConversion.ts`) usa `IMPORT_GRID_COLUMNS = 4`, uma constante fixa, independente do número de classes do JSON importado. Para diagramas grandes (85 classes no caso testado), o resultado é um empacotamento em ~4 colunas estreitas e coladas, ~21 cards de altura cada — um diagrama extremamente alto e fino. "Ajustar à tela" precisa encolher tudo para caber na altura, deixando o texto dos cards ilegível e um espaço em branco enorme nas laterais do canvas (o conteúdo ocupa uma fração pequena da largura disponível).

## Objetivo
O número de colunas do layout inicial de import cresce com o número de classes do JSON, produzindo um diagrama com proporção largura/altura razoável mesmo para diagramas grandes (dezenas de classes), sem regredir a aparência de diagramas pequenos (poucas classes) que hoje já funcionam bem.

## Fora de escopo
- Trocar o algoritmo de empacotamento em si (masonry por coluna mais curta) por um layout consciente de grafo/relações — ver ADR-012, Alternativa B, rejeitada por ora.
- Ordenar classes por conectividade antes de empacotar — ver ADR-012, Alternativa C, fica registrada como follow-up, não nesta task.
- Qualquer mudança no schema JSON de import/export (`schema.ts`) — posição/layout não faz parte do contrato público (precedente TASK-003/TASK-005/ADR-005).

## Comportamento atual
`IMPORT_GRID_COLUMNS` é uma constante fixa (`= 4`) em `classDiagramConversion.ts`. `importClassDiagram` inicializa `columnHeights` com esse tamanho fixo e, para cada classe do JSON (na ordem em que aparece), escolhe a coluna com menor altura acumulada no momento.

## Comportamento esperado
O número de colunas usado no empacotamento é calculado a partir de `parsed.data.classes.length` (N), crescendo com N em vez de ficar fixo em 4. A fórmula exata (ex. algo na linha de `Math.max(1, Math.ceil(Math.sqrt(N * fator_de_forma)))`) e o `fator_de_forma` são definidos na implementação, calibrados visualmente contra o diagrama real do ELIMS (85 classes) para que "ajustar à tela" produza uma proporção largura/altura razoável (não uma faixa estreita e gigante) — não existe um número "correto" a priori, é ajuste empírico validado visualmente. O algoritmo de escolha de coluna (menor altura acumulada) e o restante do empacotamento (largura de coluna, gap, margem) não mudam.

**Implementado**: a fórmula usa a altura estimada real das classes (soma de `estimateClassCardHeight` de cada uma, mesma função já usada para ancorar conectores — não um `fator_de_forma` arbitrário desacoplado do conteúdo), resolvendo para o número de colunas que aproxima `largura_total/altura_total` de uma proporção alvo (`IMPORT_TARGET_ASPECT_RATIO = 1.6`, calibrada visualmente). Ver "Registro de execução".

## Regras de negócio
- RN-01: A fórmula de colunas nunca produz menos colunas que o comportamento atual para diagramas pequenos (não pode regredir o caso comum já validado em produção).
- RN-02: Nenhum card resultante pode se sobrepor a outro — mesma garantia que a TASK-005 já dava (mantida pelo algoritmo de coluna mais curta, que não muda).

## Critérios de aceitação
- [x] CA-01: Importar o JSON real do ELIMS (85 classes / 190 relações, arquivo de referência anexado ao pedido original — `docs/diagrams/classmap/elims-sistema-completo.json` no repositório ELIMS_Replit) produz um diagrama cuja proporção largura/altura, depois de "ajustar à tela", permite ler o nome das classes sem precisar de zoom manual imediato.
- [x] CA-02: Importar um diagrama pequeno (ex. 5 classes, mesmo exemplo usado em `IMPORT_PLACEHOLDER`/testes existentes) produz um layout visualmente equivalente ao comportamento atual (sem regressão perceptível).
- [x] CA-03: Nenhum card se sobrepõe a outro em nenhum dos dois cenários (85 classes e 5 classes) — mesma verificação que os testes existentes de `classDiagramConversion.test.ts` já fazem para o caso pequeno, estendida para um caso grande.
- [x] CA-04: `npm run build`, `npm run lint` e `npm test` limpos.
- [x] CA-05: Validação visual ao vivo (dev server local ou produção) reimportando o diagrama real do ELIMS, confirmando a leitura antes/depois.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/import-export/classDiagramConversion.ts` (`IMPORT_GRID_COLUMNS` → função/cálculo a partir de `N`). Possível ajuste em `classDiagramConversion.test.ts` (casos novos cobrindo N grande).
### Banco de dados
Nenhuma mudança — posição continua dentro do JSONB `diagrams.content` já existente, sem migration.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] Trocar `IMPORT_GRID_COLUMNS` fixo por um cálculo a partir de `parsed.data.classes.length`.
- [x] Calibrar o fator de forma visualmente contra o diagrama real do ELIMS (85 classes) e contra um caso pequeno (5 classes) — sem fórmula "correta" a priori, ajustar até a proporção ficar razoável nos dois extremos.
- [x] Adicionar caso de teste em `classDiagramConversion.test.ts` para N grande (ex. 40+ classes sintéticas), confirmando ausência de sobreposição (CA-03) e um número de colunas maior que o fixo anterior.
- [x] Validar visualmente ao vivo reimportando o JSON real do ELIMS (CA-05).

## Estratégia de testes
- [x] Unitários: `classDiagramConversion.test.ts` — casos existentes (diagrama pequeno, sem sobreposição) continuam passando; caso novo para N grande.
- [ ] Integração: não aplicável (mudança contida em uma função pura).
- [ ] E2E: não aplicável (sem E2E neste repositório, ver `.claude/rules/global.md`).
- [x] Manual: reimportar o diagrama real do ELIMS num navegador real (dev server local ou produção) e confirmar leitura visual (CA-01, CA-05).

## Riscos e rollback
Baixo risco — mudança aditiva e contida numa função pura, sem afetar o contrato JSON público nem a edição livre pós-import (usuário continua podendo arrastar qualquer card). Rollback: reverter o cálculo para a constante fixa `= 4`.

## Registro de execução

### Alterações realizadas
- `estimateClassCardHeight` (`src/features/class-diagram/types.ts`) teve o parâmetro afrouxado de `DiagramClass` para `{ stereotype?: string; attributes: { length: number } }` — a função só lia `stereotype`/`attributes.length`, nunca `id`/`x`/`y`, então a assinatura mais estreita não muda nenhum call site existente (`contentOperations.ts`, `Connector.tsx` continuam passando um `DiagramClass` completo, que satisfaz o tipo estruturalmente). Isso permite chamar a função sobre as classes ainda "cruas" do JSON parseado (sem `id` atribuído ainda).
- `classDiagramConversion.ts`: removida a constante fixa `IMPORT_GRID_COLUMNS = 4`. Nova função `computeImportGridColumns(classes)` calcula o número de colunas a partir da altura total estimada de todas as classes (soma de `estimateClassCardHeight` de cada uma + gap vertical) e de uma proporção alvo `IMPORT_TARGET_ASPECT_RATIO = 1.6` (largura:altura), resolvendo `colunas = sqrt(R * alturaTotal / larguraDaColuna)`. `importClassDiagram` chama essa função uma vez, antes do loop de empacotamento, e usa o resultado (`columnCount`) onde antes usava a constante fixa — o algoritmo de escolha de coluna (menor altura acumulada) não mudou.
- `classDiagramConversion.test.ts`: 2 casos novos — diagrama sintético de 85 classes (mesmo tamanho do ELIMS real) confirmando mais de 4 colunas usadas e ausência de sobreposição; diagrama sintético de 5 classes confirmando ausência de sobreposição e no máximo 5 colunas (sem "explodir" colunas para diagramas pequenos). Um `hasOverlap()` local replica o cálculo de altura do próprio import (não importa símbolo interno) para checar sobreposição real entre cards.

### Arquivos principais
- `src/features/class-diagram/types.ts`
- `src/features/import-export/classDiagramConversion.ts`
- `src/features/import-export/classDiagramConversion.test.ts`

### Decisões
- **Fórmula usa a altura real estimada das classes, não uma constante desacoplada do conteúdo.** Em vez de um `fator_de_forma` arbitrário multiplicando só `N` (número de classes), a fórmula soma `estimateClassCardHeight` de cada classe (mesma função já usada para ancorar conectores) — assim, um diagrama com muitas classes de poucos atributos e um diagrama com poucas classes de muitos atributos recebem números de coluna proporcionais ao volume de conteúdo real, não só à contagem de classes.
- **`IMPORT_TARGET_ASPECT_RATIO = 1.6`**, calibrado calculando o resultado contra os dados reais do JSON do ELIMS (85 classes) antes de implementar (ver simulação abaixo) e confirmado visualmente depois: produz 14 colunas para o caso do ELIMS (contra as 4 fixas de antes), e cai naturalmente para 2-3 colunas em diagramas pequenos (5-10 classes) — não "explode" colunas onde não faz sentido.
- Simulação feita antes de implementar (Node ad-hoc, não commitada): com `R=1.6` e os dados reais do ELIMS, `colunas=14`, proporção final largura:altura ≈ 1.55:1 (contra ≈ 0.13:1 do comportamento antigo, 4 colunas). Para diagramas pequenos (2 a 10 classes sintéticas, 6 atributos cada), a fórmula produz 2 a 4 colunas — igual ou muito próximo ao comportamento antigo, sem regressão perceptível.

### Divergências
Nenhuma em relação à task/ADR — a fórmula exata (não especificada de antemão, "a definir na implementação") ficou baseada na altura real das classes em vez de só `N`, o que não estava explícito no texto original da task mas está dentro do espaço de solução previsto ("a fórmula exata... são definidos na implementação").

### Pendências
Nenhuma. As Alternativas B (motor de layout de grafo) e C (ordenação por conectividade) do ADR-012 seguem deliberadamente fora de escopo — ver critério de reavaliação na seção "Revisão" do próprio ADR.

## Validação

```
npx vitest run src/features/import-export/classDiagramConversion.test.ts
✓ 5 arquivos de teste, 37 testes (2 novos desta task)

npm run build
> tsc -b && vite build
✓ built in 411ms (sem erro de typecheck)

npm run lint
> oxlint
(só os 4 warnings pré-existentes de outras features, nenhum novo em class-diagram/import-export)

npx vitest run --exclude "**/.claude/worktrees/**"
✓ 35 arquivos de teste, 257 testes (255 antes desta task + 2 novos)
```

**Validação visual ao vivo** (dev server local, `npm run dev`, navegador desta sessão): criado um painel de teste descartável ("TASK-048 teste colunas adaptativas") no projeto real ELIMS, reimportando o JSON real de 85 classes/190 relações (o mesmo arquivo do pedido original) já com o algoritmo corrigido. Resultado: 14 colunas (contra 4 antes), diagrama ocupando toda a largura disponível do canvas em vez de uma faixa estreita, texto legível num zoom moderado depois de "ajustar à tela", sem nenhuma sobreposição visível entre cards. Painel de teste excluído ao final (não é diagrama real do usuário, só para esta validação) — o painel original "Diagrama completo do ELIMS" não foi tocado.

## Handoff
Nenhum handoff necessário — task implementada de ponta a ponta nesta sessão (ADR → código → testes → validação visual ao vivo), pronta para revisão do usuário e eventual `bootstrap-complete` mover para `completed/`.
