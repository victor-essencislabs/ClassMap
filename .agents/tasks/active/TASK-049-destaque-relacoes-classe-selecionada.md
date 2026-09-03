---
id: TASK-049
title: Destaque por sentido das relações da classe selecionada (Diagrama de Classes)
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: []
---

# TASK-049 — Destaque por sentido das relações da classe selecionada

## Contexto
Pedido do usuário (2026-09-03, mesma sessão da TASK-048): ao selecionar um card no Diagrama de Classes, não há nenhum jeito de ver visualmente com quem aquela classe se relaciona sem abrir a lista "Relações" do inspector — os conectores no canvas não mudam de aparência quando uma classe (em vez de uma relação) é selecionada.

**Sem ritual de 3 opções/ADR**: não é uma decisão de arquitetura — é comportamento de seleção, 100% efêmero (nada persistido em `diagrams.content`), sem tocar o schema de import/export nem qualquer contrato. Mesmo padrão já aceito neste projeto para decisões de UI dentro de `frontend-diagramas` (ver TASK-038..045, animações do sistema).

## Problema
`Connector.tsx` só reagia à seleção direta da própria relação (clicar na linha) — selecionar o card de uma classe não alterava a aparência de nenhum conector que a tocasse.

## Objetivo
Selecionar uma classe destaca, por sentido, todas as relações que a tocam — cor diferente conforme a classe selecionada é `from` (relação "saindo") ou `to` (relação "chegando") daquela relação — e recua visualmente as relações que não a tocam, para tornar óbvio "com quem esta classe se relaciona" sem precisar abrir a lista do inspector.

## Fora de escopo
- Semântica de "dono"/"pertence" por tipo de relação: avaliado e descartado — os 5 tipos de relação não têm uma direção de posse consistente entre si (em agregação/composição `from` é o todo/dono, mas em herança `from` é quem herda — sentidos opostos de "quem contém quem"). A cor reflete o sentido cru da seta (`from`/`to`), não uma leitura semântica por tipo.
- Hover (só clique, reaproveitando a seleção que já existe hoje).
- Destacar/recuar outros CARDS (só os conectores) — não pedido, e cards já mostram estado de seleção próprio.
- Mudar o comportamento de selecionar uma relação diretamente (clicar na linha) — continua igual a antes desta task.

## Comportamento atual
`Connector` recebia um prop `selected: boolean`, `true` só quando a relação em si era a seleção atual (`selection.type === 'relationship'`). Selecionar uma classe não afetava nenhum conector.

## Comportamento esperado
- Novo tipo `ConnectorEmphasis` (`'selected' | 'outgoing' | 'incoming' | 'dimmed' | 'normal'`), calculado por `connectorEmphasis(rel)` em `ClassDiagramCanvas.tsx` a partir da seleção atual:
  - Relação selecionada diretamente → `'selected'` (comportamento anterior, inalterado: `--class-accent`, traço mais grosso, ponto de controle visível).
  - Uma classe selecionada e a relação toca ela como `from` → `'outgoing'` (`--class-accent`, mesma tinta de "selecionado" mas traço um pouco mais fino).
  - Uma classe selecionada e a relação toca ela como `to` → `'incoming'` (nova cor `--rel-incoming`, dourado).
  - Uma classe selecionada e a relação NÃO a toca → `'dimmed'` (opacidade 0.35 no grupo inteiro).
  - Nada selecionado, ou uma relação selecionada e este conector não é ela → `'normal'` (aparência padrão, `currentColor`).
- A lista "Relações" do inspector ganha uma bolinha (`.rel-dir-dot`) na mesma cor do conector correspondente — legenda embutida, sem elemento novo flutuante no canvas.

## Regras de negócio
- RN-01: Cor por sentido cru da seta (`from`/`to`), nunca por semântica de tipo de relação — ver "Fora de escopo".
- RN-02: Numa auto-relação (`from === to === classe selecionada`, caso raro), desempate para `'outgoing'`.
- RN-03: Selecionar uma relação diretamente nunca aplica `dimmed` nas outras (só destaque por classe faz isso).

## Critérios de aceitação
- [x] CA-01: Selecionar uma classe com relações nos dois sentidos mostra conectores `outgoing` (`--class-accent`) e `incoming` (`--rel-incoming`) corretos, e `dimmed` (opacidade reduzida) nos que não tocam a classe.
- [x] CA-02: A lista "Relações" do inspector mostra a bolinha na cor correspondente (mesmo sentido do conector no canvas).
- [x] CA-03: Selecionar uma relação diretamente continua com o comportamento anterior (só ela em `--class-accent`, mais grossa), sem `dimmed` nas outras.
- [x] CA-04: `npm run build`, `npm run lint` e `npm test` limpos, sem warning novo.
- [x] CA-05: Validação visual ao vivo contra o diagrama real do ELIMS (85 classes/190 relações).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/Connector.tsx` (prop `selected: boolean` → `emphasis: ConnectorEmphasis`, cor/traço/opacidade por estado), `src/features/class-diagram/ClassDiagramCanvas.tsx` (`connectorEmphasis()`, bolinha `.rel-dir-dot` no `rel-chip`, span do nome ganhou classe própria `rel-chip-label` — a regra de truncamento de texto da TASK-015 dependia de `:first-child`, que passou a apontar para a bolinha nova), `src/index.css` (token `--rel-incoming` nos 3 blocos de tema, `.connector.dimmed`, `.rel-dir-dot`).
### Banco de dados
Nenhuma mudança — seleção é estado local do componente (`useState`), nunca persistido.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] Token `--rel-incoming` (light/dark/override) em `src/index.css`.
- [x] `ConnectorEmphasis` em `Connector.tsx`, substituindo o prop `selected: boolean`.
- [x] `connectorEmphasis()` em `ClassDiagramCanvas.tsx`, usado na renderização dos `Connector`.
- [x] `.rel-dir-dot` no `rel-chip` do inspector + CSS.
- [x] Corrigir a regra de truncamento (`:first-child` → `.rel-chip-label`) para não quebrar com a bolinha nova antes do texto.
- [x] Testes novos em `ClassDiagramCanvas.test.tsx`.
- [x] Validar visualmente ao vivo.

## Estratégia de testes
- [x] Unitários/componente: `ClassDiagramCanvas.test.tsx` — 2 casos novos (destaque por sentido + dimmed ao selecionar classe; seleção direta de relação não muda para as demais).
- [ ] Integração: não aplicável.
- [ ] E2E: não aplicável (sem E2E neste repositório).
- [x] Manual: validado ao vivo contra o diagrama real do ELIMS (classe "Sample", 21 relações — 13 outgoing, 8 incoming, 169 outras relações do diagrama dimmed).

## Riscos e rollback
Baixo risco — mudança de UI aditiva, sem persistência nem contrato. Rollback: reverter os 3 arquivos (`Connector.tsx`, `ClassDiagramCanvas.tsx`, `index.css`).

## Registro de execução

### Alterações realizadas
- `src/index.css`: novo token `--rel-incoming` (`#a6741e` claro / `#d9a441` escuro) nos 3 blocos de tema (`:root`, `prefers-color-scheme: dark`, `[data-theme='dark']`); `.connector.dimmed { opacity: 0.35 }` (mesmo valor já usado no ponto de controle inativo do conector, por consistência); `.rel-dir-dot`/`.rel-dir-dot.incoming` (bolinha de 7px no `rel-chip`); `.rel-chip-label` substituindo `.rel-chip > span:first-child` (a bolinha nova ocupa a posição de 1º filho, então a regra de truncamento de nome longo — TASK-015 — precisou migrar de seletor posicional para uma classe própria).
- `src/features/class-diagram/Connector.tsx`: prop `selected: boolean` → `emphasis: ConnectorEmphasis` (`'selected' | 'outgoing' | 'incoming' | 'dimmed' | 'normal'`, tipo exportado e documentado). `stroke`/`strokeWidth` derivados de `emphasis` (outgoing reaproveita `--class-accent`, incoming usa `--rel-incoming`, dimmed/normal ficam em `currentColor`, diferindo só na opacidade do grupo). O `<g>` ganha a classe `dimmed` quando `emphasis === 'dimmed'`. O ponto de controle de arraste (círculo) continua ligado só a `emphasis === 'selected'` (editar o traço só faz sentido na relação selecionada de verdade, não no destaque por classe).
- `src/features/class-diagram/ClassDiagramCanvas.tsx`: nova função `connectorEmphasis(rel)` (relação selecionada → `'selected'`; classe selecionada → `'outgoing'`/`'incoming'`/`'dimmed'` conforme a relação toca ou não; nada selecionado → `'normal'`); usada na prop `emphasis` do `Connector`. `rel-chip` (lista "Relações" do inspector) ganhou `<span className="rel-dir-dot">` antes do texto (classe `incoming` quando a classe atual é `to`), e o span do nome ganhou `className="rel-chip-label"`.
- Testes novos em `ClassDiagramCanvas.test.tsx`: um caso monta 3 classes com relações nos dois sentidos + uma relação que não toca a classe selecionada, confirma `stroke`/`dimmed` de cada conector e a bolinha correspondente nos chips do inspector; outro confirma que selecionar uma relação diretamente não aplica `dimmed` nas outras (RN-03).

### Arquivos principais
- `src/index.css`
- `src/features/class-diagram/Connector.tsx`
- `src/features/class-diagram/ClassDiagramCanvas.tsx`
- `src/features/class-diagram/ClassDiagramCanvas.test.tsx`

### Decisões
- **Cor por sentido cru da seta (`from`/`to`), não por semântica de tipo** — ver "Fora de escopo": testado mentalmente contra os 5 tipos de relação, uma leitura de "dono"/"pertence" universal seria inconsistente (agregação e herança apontam `from`/`to` em sentidos opostos de "quem contém quem"). O símbolo geométrico (losango/triângulo/seta) já existente continua comunicando o tipo; a cor só comunica direção relativa à classe selecionada.
- **`outgoing` reaproveita `--class-accent`** (mesma tinta já usada para "isto está selecionado" no Diagrama de Classes) em vez de uma 3ª cor nova — minimiza tokens novos (só 1: `--rel-incoming`) e mantém a mesma leitura "azul = relacionado à minha seleção" já estabelecida no app.
- **Dimmed via opacidade no `<g>` inteiro**, não recolorindo cada elemento (path/símbolo/texto) individualmente — mais simples de manter e evita duplicar a lógica de cor em 3 lugares diferentes dentro do componente.
- **Handle de arraste do ponto de controle não reage ao destaque por classe** (só a `emphasis === 'selected'`) — arrastar um conector para reformatar o traço só faz sentido quando essa relação específica está selecionada para edição, não quando ela só está destacada por tocar a classe selecionada.

### Divergências
Nenhuma em relação ao pedido original do usuário — a única definição que ficou por conta da implementação foi a cor exata de `--rel-incoming` (dourado, não especificado pelo usuário) e o valor de opacidade do `dimmed` (reaproveitado de um precedente já existente no próprio arquivo).

### Pendências
Nenhuma.

## Validação

```
npx vitest run src/features/class-diagram/ClassDiagramCanvas.test.tsx
✓ 5 arquivos de teste, 72 testes (2 novos desta task)

npm run build
> tsc -b && vite build
✓ built in 347ms (sem erro de typecheck)

npm run lint
> oxlint
(mesmos 8 warnings já existentes na sessão — nenhum novo; o de Connector.tsx só mudou de linha por causa dos comentários novos)

npx vitest run --exclude "**/.claude/worktrees/**"
✓ 35 arquivos de teste, 259 testes (257 antes desta task + 2 novos)
```

**Validação visual ao vivo** (dev server local, projeto ELIMS real, painel "Diagrama completo do ELIMS", 85 classes/190 relações): selecionada a classe `Sample` (21 relações no total). Confirmado via inspeção de estilo computado (não só visual): 13 relações `Sample → X` com bolinha/traço `#2f5f8f` (`--class-accent`, outgoing), 8 relações `X → Sample` com bolinha/traço `#a6741e` (`--rel-incoming`, incoming), as 169 relações restantes do diagrama com a classe `dimmed` no `<g>` (opacidade reduzida) — números batem exatamente com a lista "Relações" do inspector. Confirmado também visualmente no canvas: o card `Sample` com borda destacada e linhas escuras (azul/dourado) saindo dele, o resto do diagrama nitidamente mais claro. Testado também que selecionar uma relação diretamente (clique na linha) continua no comportamento anterior, sem recuar as outras.

## Handoff
Nenhum handoff necessário — task implementada de ponta a ponta nesta sessão (proposta → confirmação do usuário → código → testes → validação visual ao vivo).
