---
id: TASK-014
title: Customização de cor do card de classe
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: [ADR-005]
---

# TASK-014 — Customização de cor do card de classe

## Contexto
Feedback do usuário (`.agents/context/CONTEXT.md`, sessão de validação manual de 2026-08-29). Ver `ADR-005` para a decisão (cor interna ao ClassMap, paleta fixa de 20+ cores, fora do contrato JSON público).

## Problema
Todo card de classe usa a mesma cor fixa do design system (`--accent`) — não há como diferenciar classes visualmente além do nome/estereótipo.

## Objetivo
Usuário `editor` escolhe uma cor (de uma paleta de pelo menos 20 opções predefinidas) para o card de uma classe, no inspector; a cor persiste com o diagrama e é aplicada ao `ClassCard`/`.node-box` no canvas.

## Fora de escopo
- Cor de objeto (`ObjectCard`) — o pedido do usuário foi especificamente "card de classe".
- Incluir a cor no schema de import/export (ver ADR-005, Alternativa B rejeitada).
- Color-picker livre (RGB/hex arbitrário) — a paleta é fixa (ver ADR-005).

## Comportamento atual
`DiagramClass` (`src/features/class-diagram/types.ts`) não tem campo de cor. `ClassCard.tsx`/`.node-box` (CSS) usam `--accent` fixo para todo card de classe.

## Comportamento esperado
- `DiagramClass` ganha `color?: string` (um token da paleta, ex. `'purple'`/`'#7c5cff'` — a definir na implementação).
- Paleta de pelo menos 20 cores predefinidas, escolhidas para funcionar em dark e light (mesmo cuidado de contraste já aplicado aos tokens existentes do design system).
- Seletor de cor no inspector da classe (grade de swatches, mesmo padrão visual de `EdgeTypeGrid` — TASK-007 — para o seletor de tipo de relação).
- Sem cor escolhida (`color` undefined), o card continua com a cor padrão atual (`--accent`) — comportamento não muda para diagramas já existentes.
- Exportar o diagrama (JSON) **não inclui** o campo `color` (CA explícito abaixo, para não regredir a decisão da ADR-005 silenciosamente no futuro).

## Regras de negócio
- RN-01: A cor nunca entra no schema Zod de import/export (`schema.ts`) — ver ADR-005.
- RN-02: Só `editor` escolhe a cor (mesmo reforço de UI das demais edições de classe).

## Critérios de aceitação
- [x] CA-01: Usuário `editor` escolhe uma cor entre pelo menos 20 opções, e o card daquela classe muda de cor no canvas imediatamente.
- [x] CA-02: Salvar e recarregar a página preserva a cor escolhida (persistida em `diagrams.content`, mesmo padrão de autosave já existente).
- [x] CA-03: Exportar o diagrama como JSON (TASK-005/010) não inclui o campo `color` em nenhuma classe, mesmo que tenha cor escolhida.
- [x] CA-04: Uma classe sem cor escolhida continua com a aparência atual (cor padrão do design system), sem regressão visual.
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/types.ts` (`color?` em `DiagramClass`), `contentOperations.ts` (`updateClass` já aceita patch parcial — confirmar que cobre `color`), `ClassCard.tsx`/`ClassDiagramCanvas.tsx` (inspector, seletor de cor), `src/index.css` (paleta + aplicação da cor no `.node-box`).
### Banco de dados
Nenhuma mudança — `color` vive dentro do JSONB `diagrams.content` já existente.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] Definir a paleta de 20+ cores (tokens hex, testados em dark/light).
- [x] Adicionar `color?` ao tipo e à lógica de edição (`contentOperations.ts`).
- [x] Seletor de cor no inspector (grade de swatches).
- [x] Aplicar a cor no `ClassCard`/`.node-box` (provavelmente na borda/cabeçalho, preservando legibilidade do texto).
- [x] Confirmar que `exportClassDiagram` (`classDiagramConversion.ts`) não inclui `color` no JSON exportado.

## Estratégia de testes
- [x] Unitários: `contentOperations.test.ts` (escolher cor, persistir, exportar não inclui `color` — CA-03 como teste explícito).
- [x] Componente: seletor de cor no inspector, aplicação visual no card.
- [ ] Manual: os 4 CAs num navegador real, nos dois temas — **não executado nesta sessão** (worktree isolado, sem sessão de login real contra o Supabase; ver Pendências).

## Riscos e rollback
Baixo risco — mudança aditiva e opcional (`color?`), sem afetar diagramas existentes nem o contrato público. Rollback: reverter os arquivos alterados, sem perda de dado (diagramas sem cor continuam funcionando).

## Registro de execução

### Alterações realizadas
- `DiagramClass` ganhou `color?: string` (`types.ts`), documentado como interno ao ClassMap (nunca entra no contrato JSON).
- Paleta fixa `CLASS_COLORS` (22 cores, `types.ts`) — cada entrada é `{ id, label, hex }`; o valor persistido em `DiagramClass.color` é sempre um dos `hex` da lista (nunca RGB/hex arbitrário digitado pelo usuário).
- Novo componente `ClassColorGrid.tsx`, espelhando literalmente o padrão de `EdgeTypeGrid.tsx` (grade `role="radiogroup"`/`role="radio"`, suporte a teclado, opção "×" para limpar a cor).
- `ClassCard.tsx` aplica a cor via variável CSS `--node-color` (inline style, só quando `cls.color` existe) + classe `has-color` — sem cor, nada muda no DOM/estilo (CA-04).
- `ClassDiagramCanvas.tsx`: `ClassInspector` ganhou o campo "Cor do card (opcional)" com `ClassColorGrid`, atrás do mesmo `!readOnly` que já protege os outros campos de edição (RN-02); a bolinha da sidebar (`.side-item .dot`) também reflete a cor escolhida.
- `src/index.css`: regras `.node-box.has-color`/`.has-color.selected`/`.has-color .node-head` (acento via `border-color` + `color-mix(in srgb, var(--node-color) 16%, var(--surface-raised))` no cabeçalho — texto do cabeçalho continua `var(--text)`, nunca a cor escolhida, para não arriscar contraste ruim com hues como amarelo) e `.class-color-grid`/`.class-color-opt` (grid de 6 colunas de swatches quadrados, ativo com `box-shadow` tintado).
- Testes novos: `contentOperations.test.ts` (4 casos — `addClass` sem cor, `updateClass` grava/atualiza só a classe alvo, limpar a cor, round-trip `JSON.stringify`/`parse`), `classDiagramConversion.test.ts` (1 caso — export explícito não contém `color`, CA-03), `ClassDiagramCanvas.test.tsx` (3 casos — escolher cor aplica `has-color`/`--node-color` no card, sem cor não ganha a classe, "×" limpa a cor escolhida; mais uma asserção no teste de visualizador confirmando que o `radiogroup` "Cor do card" não aparece em modo `readOnly`).
- `schema.ts` (`src/features/import-export/`) **não foi tocado** — confirmado por leitura que `ClassSchema` não tem `color`, e `exportClassDiagram` monta o objeto exportado campo a campo (nunca faz spread de `DiagramClass`), então `color` não vaza mesmo sem nenhuma mudança nesse arquivo.

### Arquivos principais
- `src/features/class-diagram/types.ts`
- `src/features/class-diagram/ClassColorGrid.tsx` (novo)
- `src/features/class-diagram/ClassCard.tsx`
- `src/features/class-diagram/ClassDiagramCanvas.tsx`
- `src/index.css`
- `src/features/class-diagram/contentOperations.test.ts`
- `src/features/class-diagram/ClassDiagramCanvas.test.tsx`
- `src/features/import-export/classDiagramConversion.test.ts`

### Decisões
- **`color` guarda o hex diretamente** (não um id/token de paleta) — mais simples de aplicar via `style={{ '--node-color': cls.color }}` sem uma tabela de lookup extra, e casa com o exemplo já dado pela própria task/ADR-005 (`'#7c5cff'`). O `id`/`label` de `CLASS_COLORS` existem só para o seletor (chave React + `title`/`aria-label`), não para o dado persistido.
- **Uma única lista de hex, sem par light/dark por cor** — em vez de duplicar cada cor para os dois temas (como `--accent`/`--object-accent` fazem), a cor é aplicada só como acento (borda + `color-mix` com `var(--surface-raised)` no cabeçalho), nunca como cor de texto sólida. Como `color-mix` mistura com o token de superfície do tema atual, o resultado já se adapta automaticamente a dark/light sem precisar de dois hex por cor — mesma técnica que o arquivo já usa em outro lugar (`color-mix(in srgb, var(--accent) 45%, transparent)`), só que aplicada aqui à paleta nova.
- **Paleta com 22 cores** (>= 20 pedidas pela ADR-005), tons na família "500" de paletas de UI bem estabelecidas (vermelho/laranja/âmbar/amarelo/lima/verde/esmeralda/verde-azulado/ciano/azul-celeste/azul/índigo/violeta/roxo/fúcsia/rosa/rosa-choque + marrom/ardósia/cinza/pedra/grafite para opções neutras) — saturação/luminosidade médias, escolhidas para continuar visíveis como borda tanto contra `--surface-raised` claro quanto escuro, sem precisar validar cada uma com uma ferramenta de contraste (não é texto — é acento).
- **Texto do cabeçalho do card colorido continua `var(--text)`** (nunca a cor escolhida) — decisão deliberada para não arriscar baixo contraste em hues claros (amarelo, lima) quando usados como cor de texto; a identificação visual da cor vem da borda + tingimento leve do fundo do cabeçalho + bolinha da sidebar.
- **Card selecionado com cor**: a borda continua na cor escolhida (não volta para `--accent`), e o anel de seleção (`box-shadow`) fica tingido da própria cor (`color-mix(... 40%, transparent)`) — mantém "isto está selecionado" claro sem esconder "esta classe tem uma cor".

### Divergências
- Nenhuma divergência de escopo em relação à ADR-005/task. A única definição que a task deixou em aberto ("um token da paleta, ex. `'purple'`/`'#7c5cff'` — a definir na implementação") foi resolvida por armazenar o hex diretamente (ver "Decisões" acima).
- A paleta final (22 cores nomeadas em português, tons "500" de paleta de UI padrão) não estava pré-definida na task/ADR — é a definição de implementação desta rodada, documentada em `CLASS_COLORS` (`types.ts`).

### Pendências
- **Validação manual nos dois temas (dark/light) e num navegador real não foi feita nesta sessão** — este agente rodou isolado num worktree git, sem uma sessão de login real contra o Supabase (mesma limitação já registrada nas TASK-001..005 antes da sessão de validação manual do usuário). A cobertura de CA-01..04 aqui é 100% via testes automatizados (`contentOperations.test.ts`, `ClassDiagramCanvas.test.tsx`, `classDiagramConversion.test.ts`) + build/lint. Recomenda-se ao usuário abrir um Diagrama de Classes real, escolher algumas cores (inclusive tons mais claros como amarelo/lima) e conferir legibilidade nos dois temas antes de considerar a task pronta para `completed/`.
- Cor de objeto (`ObjectCard`) continua fora de escopo, como já decidido na ADR-005/task.

## Validação

Todos os comandos rodados no worktree desta sessão (`npm install` executado antes, conforme instruções de fluxo):

```
npm run build
> tsc -b && vite build
✓ built in 547ms (sem erros de typecheck)

npm run lint
> oxlint
(só os 4 warnings pré-existentes de outras features — react(only-export-components)/react(set-state-in-effect) em Toast.tsx/AuthContext.tsx/OrganizationsPage.tsx; nenhum warning/erro novo em class-diagram/import-export)

npm test
> vitest run
Test Files  13 passed (13)
     Tests  98 passed (98)
```

(90 testes existentes antes desta task + 8 novos: 4 em `contentOperations.test.ts`, 1 em `classDiagramConversion.test.ts`, 3 em `ClassDiagramCanvas.test.tsx`.)

## Handoff
Nenhum handoff formal — task implementada de ponta a ponta nesta sessão (código + testes automatizados). Pendência única: validação manual num navegador real contra os dois temas (ver "Pendências" acima), que exige uma sessão com o app rodando contra um Supabase/diagrama real — mesma limitação estrutural já registrada para outras tasks executadas em worktree isolado.
