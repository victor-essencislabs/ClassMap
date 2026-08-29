---
id: TASK-008
title: Diagrama de Objetos — canvas avançado (reaproveita infraestrutura da TASK-007)
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [object-diagram]
related_use_cases: []
related_adrs: [ADR-002]
---

# TASK-008 — Diagrama de Objetos: canvas avançado

## Contexto
Terceira task de ADR-002, depende de TASK-006 (shell/tokens) e TASK-007 (infraestrutura de zoom/pan do canvas, para não duplicar). O artefato-protótipo (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`) usa o mesmo shell/canvas para objetos e classes, diferenciando visualmente por `--object-accent` (ciano) em vez de `--accent` (roxo) — `.node-box.object`, `.node-head` com sublinhado, `.node-row .attr-val` colorido.

## Problema
`ObjectDiagramCanvas.tsx` (`src/features/object-diagram/`) tem a mesma limitação que o Diagrama de Classes tinha antes da TASK-007: sem zoom/pan, sem sidebar de busca/stats, edição em painel flutuante (`ObjectEditPanel` dentro do próprio arquivo) em vez de inspector fixo. Diferente do Diagrama de Classes, aqui não há "modo de conexão" (objetos não se conectam entre si neste modelo) — o fluxo de criação é escolher um Diagrama de Classes de origem + uma classe (já existe, via `classDiagrams`/`loadClasses` props).

## Objetivo
Diagrama de Objetos com o mesmo shell de 3 colunas e zoom/pan da TASK-007 (reaproveitando o hook/lógica criado lá), sidebar com busca+stats, inspector fixo para editar nome da instância e valores dos atributos herdados — com a paleta `--object-accent` do artefato para diferenciar visualmente de Diagrama de Classes.

## Fora de escopo
- Modo de conexão entre objetos — não existe no artefato nem no modelo de dados atual (`ObjectDiagramContent`, `src/features/object-diagram/types.ts`).
- Diagrama de Classes (TASK-007, pré-requisito) e Visão do Sistema (TASK-009).
- Import/export de Diagrama de Objetos — já fora de escopo desde a TASK-005 original (decisão registrada lá), não reaberto aqui.

## Comportamento atual
Ver `src/features/object-diagram/ObjectDiagramCanvas.tsx` e `ObjectDiagramPage.tsx` — formulário de 2 selects (diagrama de origem + classe) na toolbar, canvas com scroll simples, `ObjectEditPanel` flutuante.

## Comportamento esperado
- Canvas dentro do shell (mesmo zoom/pan da TASK-007, idealmente o mesmo hook/componente reaproveitado, não uma segunda implementação).
- Sidebar com busca (por nome da instância ou da classe) + stats (`Classes` mostra 0 aqui — é view de objetos —, `Objetos` com a contagem real; manter os 3 contadores por paridade visual com o artefato, igual decidido na TASK-007).
- Inspector fixo para `ObjectEditPanel` (nome da instância, valores por atributo herdado).
- Estilo `.node-box.object`/`.object-accent` aplicado aos cards de instância (`ObjectCard.tsx`) — sublinhado no cabeçalho, cor ciana nos valores.
- Fluxo de "criar objeto a partir de uma classe" continua igual (não é canvas-driven como o modo de conexão de relações) — só o container visual muda (provavelmente um botão na topbar abre um modal de seleção, como o `#class-picker-modal` do artefato, em vez do formulário de 2 selects na toolbar).

## Regras de negócio
Nenhuma nova — herança de atributos por snapshot (RN-01 da TASK-004) não muda.

## Critérios de aceitação
- [x] CA-01: Zoom/pan funciona igual ao Diagrama de Classes (mesma infraestrutura da TASK-007, sem duplicação de lógica).
- [x] CA-02: Busca filtra objetos por nome de instância ou classe de origem.
- [x] CA-03: Inspector edita nome da instância e valores dos atributos com paridade ao `ObjectEditPanel` atual (nenhum campo perdido).
- [x] CA-04: Modal (ou equivalente) de "escolher diagrama de origem + classe" para criar um novo objeto, substituindo o formulário de 2 selects da toolbar, sem perder a validação de "nenhum Diagrama de Classes no projeto ainda" já existente.
- [x] CA-05: `visualizador` não vê controles de criação/edição (mesmo reforço de UI da TASK-004).
- [x] CA-06: Comparação lado a lado com o artefato confirma a paleta `--object-accent` aplicada corretamente nos dois temas.
- [x] CA-07: `npm run build`, `npm run lint` e `npm test` limpos.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/ObjectDiagramCanvas.tsx`, `ObjectDiagramPage.tsx`, `ObjectCard.tsx` (estilo). Reaproveita o hook de zoom/pan criado na TASK-007 (import cross-feature ou extração para um local compartilhado, a decidir na implementação).
### Banco de dados
Nenhuma mudança — `ObjectDiagramContent` não muda de forma.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] Confirmar/ajustar onde o hook de zoom/pan da TASK-007 vive para ser importável aqui sem duplicação.
- [x] Migrar `ObjectEditPanel` para o inspector do shell.
- [x] Implementar busca+stats na sidebar.
- [x] Substituir o formulário de 2 selects por um modal de seleção (ou manter na topbar, se ficar melhor — decisão de implementação, registrar o motivo).
- [x] Aplicar `--object-accent` em `ObjectCard.tsx`.
- [x] Validar contra o artefato (CA-06).

## Estratégia de testes
- [x] Unitários: filtro de busca, seleção de classe de origem.
- [x] Componente: `ObjectDiagramCanvas.test.tsx` adaptado ao novo layout.
- [ ] Manual: os critérios de aceitação com `editor`/`visualizador` num navegador real — pendente (ver Pendências, mesma razão da TASK-007).
- [ ] Integração: persistência real contra o Supabase — pendente, mesma razão.

## Riscos e rollback
Menor risco que TASK-007 — reaproveita infraestrutura já validada lá. Rollback: reverter para `ObjectDiagramCanvas.tsx` anterior, sem perda de dados (`ObjectDiagramContent` não muda de forma).

## Registro de execução
### Alterações realizadas
- Reaproveitei sem alterar `diagram-shell/canvasTransform.ts`/`useCanvasZoomPan.ts` (TASK-007) — nenhuma duplicação de lógica de zoom/pan (CA-01). O `DiagramShell.canvasProps` (também da TASK-007) já resolvia o wiring de ref/handlers sem repetir o bug de duplo-wrapping.
- Adicionei a `object-diagram/types.ts`: `OBJECT_CARD_WIDTH` (constante, antes só existia local em `ObjectCard.tsx`) e `estimateObjectCardHeight` (mesmo espírito de `estimateClassCardHeight`, cabeçalho sempre de 2 linhas porque o rótulo "objeto" é fixo, ao contrário do estereótipo opcional da classe).
- Adicionei a `contentOperations.ts`: `filterObjectsByQuery` (CA-02, casa por nome da instância OU da classe), `toBoundedNode` (adapta para o zoom/pan compartilhado) e um segundo parâmetro opcional `origin` em `addObject` (mesmo padrão do `addClass` da TASK-007, centraliza o novo objeto no trecho visível do canvas).
- Reescrevi `ObjectCard.tsx`: arraste corrigido para dividir pelo `zoom` (`screenDeltaToWorld`, mesmo bug/correção da TASK-007 em `ClassCard`) e restilizado para `.node-box.object`/`.node-head` (sublinhado, `--object-accent`)/`.node-row .attr-val` — CSS já pronta desde a TASK-006, só a marcação mudou.
- Criei `ClassPickerModal.tsx`: mesma lógica/validação do formulário de 2 selects antigo (inclusive a mensagem "Crie um Diagrama de Classes..." quando o projeto não tem nenhum), agora dentro de `.modal-overlay`/`.modal` (CA-04), aberto por um botão "+ Objeto" na topbar.
- Reescrevi `ObjectDiagramCanvas.tsx`: monta `DiagramShell` com sidebar (busca por instância/classe + stats, `Classes`/`Relações` sempre 0 aqui — decisão já tomada na TASK-007 — `Objetos` com a contagem real), canvas (zoom/pan, sem SVG de conectores — objetos não têm relação entre si) e inspector fixo (`ObjectInspector`, paridade de campos com o `ObjectEditPanel` antigo — CA-03 — variante somente-leitura para `visualizador`, mesmo padrão do `ClassInspector` da TASK-007).
- Atualizei `ObjectDiagramPage.tsx` (breadcrumb/título/indicador de salvamento como `topbarCenter`, mesmo padrão do `DiagramEditorPage`) e `DiagramRouterPage.tsx` (Diagrama de Objetos também deixou de usar `AppLayout` — é full-bleed com o shell próprio, igual ao Diagrama de Classes desde a TASK-007; só Visão do Sistema continua com o layout antigo, até TASK-009).
- Reescrevi `ObjectDiagramCanvas.test.tsx` e adaptei `contentOperations.test.ts`.

### Arquivos principais
- [src/features/object-diagram/types.ts](../../../src/features/object-diagram/types.ts) — `OBJECT_CARD_WIDTH`/`estimateObjectCardHeight` novos.
- [src/features/object-diagram/contentOperations.ts](../../../src/features/object-diagram/contentOperations.ts) + [contentOperations.test.ts](../../../src/features/object-diagram/contentOperations.test.ts)
- [src/features/object-diagram/ObjectCard.tsx](../../../src/features/object-diagram/ObjectCard.tsx) — reescrito.
- [src/features/object-diagram/ClassPickerModal.tsx](../../../src/features/object-diagram/ClassPickerModal.tsx) — novo.
- [src/features/object-diagram/ObjectDiagramCanvas.tsx](../../../src/features/object-diagram/ObjectDiagramCanvas.tsx) — reescrito.
- [src/features/object-diagram/ObjectDiagramPage.tsx](../../../src/features/object-diagram/ObjectDiagramPage.tsx)
- [src/features/navigation/DiagramRouterPage.tsx](../../../src/features/navigation/DiagramRouterPage.tsx) — Diagrama de Objetos também full-bleed agora.

### Decisões
- **Modal de criação na topbar ("+ Objeto"), não mais na toolbar** — a task deixava em aberto "manter na topbar, se ficar melhor". Optei pela topbar (consistente com "+ Classe"/"🔗 Relação" da TASK-007) em vez de um botão dentro da sidebar ou do canvas, mantendo o mesmo padrão de onde ficam as ações de criação em todo o shell.
- **Sem estilizar os `<select>` do modal com uma classe nova do design system** — o `.modal-body` da TASK-006 só estiliza `p`/`textarea` (pensado para o modal de import/export). Criar uma classe nova só para 2 selects de um modal específico pareceu desproporcional ao escopo desta task; usei `<select>` simples (mesmo visual "cru" que a toolbar antiga já tinha), sem regressão funcional. Fica como possível polimento futuro, não um requisito de nenhum CA.
- **`OBJECT_CARD_WIDTH` extraído para `types.ts`** — antes só existia como constante local duplicada em `ObjectCard.tsx` (mesmo padrão pré-existente de `ClassCard.tsx`, não mexido na TASK-007). Como a task exigia calcular bounds do card em outro lugar (`toBoundedNode`), extrair a largura para `types.ts` evitou uma segunda duplicação — `ClassCard.tsx`/`CLASS_CARD_WIDTH` local não foi tocado (fora do escopo desta task).
- **Inspector com variante somente-leitura** (mesma decisão da TASK-007) — `visualizador` vê os mesmos dados como texto, sem inputs/botões de ação.

### Divergências
Nenhuma divergência dos critérios de aceitação.

### Pendências
- Mesma pendência da TASK-007: validação manual num navegador real contra um projeto Supabase de verdade (`editor`/`visualizador`), ainda sem sessão de teste com o time. Validação desta task feita com conteúdo mockado localmente.
- TASK-009 (Visão do Sistema) é a única tela de diagrama que ainda não usa o shell/zoom-pan compartilhado — ela não usa o grid canvas/inspector (é nav+detail, por decisão já registrada em ADR-002), então não reaproveita `useCanvasZoomPan`, só os tokens de cor/tipografia.

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros (mesmos 4 warnings pré-existentes, nenhum novo)
npm test        # vitest run — 12 arquivos, 82 testes passando (74 da TASK-007 + 8 novos: contentOperations e ObjectDiagramCanvas)
```
Comparação visual (CA-06): página de preview temporária (revertida depois) com 2 objetos mockados (um com valores preenchidos, um vazio), navegador embutido, `localhost:5173`, viewport 1440×900, temas dark e light emulados via `prefers-color-scheme`. Confirmado contra o artefato: `.node-box.object` com cabeçalho sublinhado em `--object-accent`, valores dos atributos na mesma cor, sidebar com pontos ciano (`.side-item.obj .dot`), stats (Classes/Relações sempre 0, Objetos real), modal de criação (`.modal-overlay`/`.modal`) com a mensagem de "nenhum Diagrama de Classes" preservada.

## Handoff
Nenhum handoff pendente — task concluída nesta sessão. Próxima: `.agents/tasks/backlog/TASK-009-layout-visao-sistema-artefato.md`.
