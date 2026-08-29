---
id: TASK-014
title: Customização de cor do card de classe
status: backlog
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
- [ ] CA-01: Usuário `editor` escolhe uma cor entre pelo menos 20 opções, e o card daquela classe muda de cor no canvas imediatamente.
- [ ] CA-02: Salvar e recarregar a página preserva a cor escolhida (persistida em `diagrams.content`, mesmo padrão de autosave já existente).
- [ ] CA-03: Exportar o diagrama como JSON (TASK-005/010) não inclui o campo `color` em nenhuma classe, mesmo que tenha cor escolhida.
- [ ] CA-04: Uma classe sem cor escolhida continua com a aparência atual (cor padrão do design system), sem regressão visual.
- [ ] CA-05: `npm run build`, `npm run lint` e `npm test` limpos.

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
- [ ] Definir a paleta de 20+ cores (tokens hex, testados em dark/light).
- [ ] Adicionar `color?` ao tipo e à lógica de edição (`contentOperations.ts`).
- [ ] Seletor de cor no inspector (grade de swatches).
- [ ] Aplicar a cor no `ClassCard`/`.node-box` (provavelmente na borda/cabeçalho, preservando legibilidade do texto).
- [ ] Confirmar que `exportClassDiagram` (`classDiagramConversion.ts`) não inclui `color` no JSON exportado.

## Estratégia de testes
- [ ] Unitários: `contentOperations.test.ts` (escolher cor, persistir, exportar não inclui `color` — CA-03 como teste explícito).
- [ ] Componente: seletor de cor no inspector, aplicação visual no card.
- [ ] Manual: os 4 CAs num navegador real, nos dois temas.

## Riscos e rollback
Baixo risco — mudança aditiva e opcional (`color?`), sem afetar diagramas existentes nem o contrato público. Rollback: reverter os arquivos alterados, sem perda de dado (diagramas sem cor continuam funcionando).

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
