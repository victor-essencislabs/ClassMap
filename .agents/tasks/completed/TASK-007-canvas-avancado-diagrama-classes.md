---
id: TASK-007
title: Diagrama de Classes — canvas avançado (zoom/pan, modo de conexão, busca+stats, inspector)
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: [ADR-002]
---

# TASK-007 — Diagrama de Classes: canvas avançado

## Contexto
Segunda task de ADR-002, depende de TASK-006 (shell/tokens já existentes). É a mais arriscada das 5 (ver "Riscos" do ADR-002) — reimplementa em React as interações de canvas do artefato-protótipo (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`) que hoje não existem em `src/features/class-diagram/`.

## Problema
`ClassDiagramCanvas.tsx` atual (`src/features/class-diagram/ClassDiagramCanvas.tsx`) tem cards de classe posicionáveis (`ClassCard.tsx`) e conectores UML ortogonais (`Connector.tsx`, já com os 5 símbolos e multiplicidade — TASK-003), mas: sem zoom/pan (canvas cresce por scroll simples, `.canvas-area{overflow:auto}`), sem modo de conexão (criar relação exige 2 `<select>` + botão "Criar relação" em vez de clicar origem→destino no canvas), sem busca nem stats, e a edição é um painel flutuante (`.edit-panel`, `ClassEditPanel`/`RelationshipEditPanel` dentro do próprio `ClassDiagramCanvas.tsx`) em vez do inspector fixo do shell.

## Objetivo
Diagrama de Classes com o mesmo nível de interação do artefato: zoom/pan no canvas, criar relação clicando na classe de origem e depois na de destino (com banner de instrução e cancelamento), sidebar com busca por nome + contadores (classes/relações/objetos) e lista de classes, inspector fixo (do shell da TASK-006) para editar a classe/relação selecionada — mantendo 100% do modelo de dados (`ClassDiagramContent`, `contentOperations.ts`) e da persistência via Supabase já existentes.

## Fora de escopo
- Diagrama de Objetos (TASK-008) e Visão do Sistema (TASK-009) — só Diagrama de Classes aqui.
- Botões de import/export (TASK-010) — o layout deles muda de lugar (vão para a topbar do shell), mas a lógica e o visual dos modais ficam para TASK-010.
- O dataset de exemplo fake do artefato ("Carregar exemplo real (.vpp)", 116 classes fictício-real do GeoCloudAI) — fora de escopo por decisão do ADR-002 (o parser `.vpp` real cobre esse caminho em paralelo).

## Comportamento atual
Ver `src/features/class-diagram/ClassDiagramCanvas.tsx` e `src/features/class-diagram/DiagramEditorPage.tsx` — toolbar com "+ Adicionar classe" e formulário de nova relação (2 selects), canvas com scroll simples, painel de edição flutuante ao lado do canvas.

## Comportamento esperado
- Canvas dentro do slot `canvas` do shell (TASK-006), com zoom (`+`/`−`/"ajustar à tela", igual `.zoom-controls` do artefato) e pan (arrastar o fundo do canvas, não uma classe).
- Modo de conexão: um botão entra em "modo conectar", o cursor vira crosshair, um banner aparece ("Clique na classe de origem, depois na de destino" + botão Cancelar), clicar em duas classes cria a relação (tipo default `association`, editável depois no inspector).
- Sidebar (slot `sidebar` do shell): campo de busca filtrando a lista de classes por nome, stats (`Classes`/`Relações`/`Objetos` — objetos sempre 0 aqui, é só para paridade visual com o artefato, que mostra os 3 contadores em qualquer visualização), lista de classes clicável (seleciona/centraliza no canvas).
- Inspector (slot `inspector` do shell): substitui `ClassEditPanel`/`RelationshipEditPanel` atuais — mesmos campos (nome, estereótipo, atributos, tipo de relação, multiplicidade), reestilizados conforme `.field`/`.attr-row`/`.rel-chip` do artefato, sempre visível (mostra "Selecione uma classe ou relação..." quando nada está selecionado, em vez de painel que aparece/desaparece).
- `+ Classe` na topbar (era "+ Adicionar classe" na toolbar).

## Regras de negócio
- RN-01 (já vigente, TASK-003): símbolos UML e ponto de controle arrastável do conector não mudam — só o container/interação ao redor muda.
- RN-02 (nova): entrar em modo de conexão e cancelar (banner ou tecla Esc) nunca deve deixar uma relação parcialmente criada — só a criação com origem E destino clicados conta.

## Critérios de aceitação
- [x] CA-01: Zoom (+/−/ajustar à tela) e pan funcionam no canvas, sem quebrar o posicionamento absoluto dos cards existentes (`DiagramClass.x/y`).
- [x] CA-02: Criar uma relação clicando origem→destino no canvas produz o mesmo resultado (`DiagramRelationship` com `from`/`to`/`type`) que o formulário antigo de 2 selects produzia — validado via teste automatizado.
- [x] CA-03: Busca na sidebar filtra a lista de classes em tempo real por substring do nome (case-insensitive).
- [x] CA-04: Inspector mostra e edita classe/relação selecionada com paridade de campos ao `ClassEditPanel`/`RelationshipEditPanel` atuais (nenhum campo perdido na migração).
- [x] CA-05: `visualizador` (role !== 'editor') não vê nenhum controle de criação/edição (mesmo reforço de UI já existente, RN-02 da TASK-002) — só navega/dá zoom/pan.
- [x] CA-06: Comparação lado a lado com o artefato confirma paridade visual (cores dos nós, `.node-head`/`.node-row`, sombra `.node-box`) nos dois temas.
- [x] CA-07: `npm run build`, `npm run lint` e `npm test` limpos — testes existentes de `ClassDiagramCanvas.test.tsx`/`contentOperations.test.ts` continuam passando (adaptados se a migração de painel flutuante → inspector exigir).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/ClassDiagramCanvas.tsx`, `DiagramEditorPage.tsx`, possivelmente novo(s) arquivo(s) para o hook de zoom/pan (reaproveitável por TASK-008) e o modo de conexão. `ClassCard.tsx`/`Connector.tsx` só mudam se a mudança de coordenadas (zoom) exigir ajuste na forma como calculam posição.
### Banco de dados
Nenhuma mudança — `ClassDiagramContent` (`src/features/class-diagram/types.ts`) não muda de forma.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova — reforço de UI de `readOnly` já existente (RN-02 da TASK-002) precisa ser preservado nos novos controles.

## Plano de implementação
- [x] Implementar o hook/lógica de zoom/pan do canvas (candidato a ser reaproveitado por TASK-008 — decidir se vira um hook compartilhado já nesta task ou se TASK-008 extrai depois).
- [x] Implementar o modo de conexão (estado `connectMode`/`connectFrom`, banner, clique em `ClassCard` para completar).
- [x] Migrar `ClassEditPanel`/`RelationshipEditPanel` para o slot `inspector` do shell (TASK-006).
- [x] Implementar busca + stats na sidebar.
- [x] Atualizar `DiagramEditorPage.tsx` para montar tudo dentro do shell compartilhado.
- [x] Validar contra o artefato (CA-06) antes de considerar concluída.

## Estratégia de testes
- [x] Unitários: zoom/pan (matemática de transformação), modo de conexão (máquina de estado), busca (filtro).
- [x] Componente: `ClassDiagramCanvas.test.tsx` adaptado para o novo layout/inspector.
- [ ] Manual: os 5+ critérios de aceitação, com usuários `editor` e `visualizador`, num navegador real (mesma pendência já registrada em TASK-003 para validação com Supabase real) — pendente (ver Pendências).
- [ ] Integração: persistência real contra o Supabase para toda alteração feita via canvas/inspector novos — pendente, mesma razão.

## Riscos e rollback
Task mais arriscada de ADR-002 — zoom/pan e modo de conexão implementados do zero podem divergir do artefato em detalhes de sensibilidade/UX. Rollback: reverter para `ClassDiagramCanvas.tsx` anterior (painel flutuante + formulário de 2 selects) sem perda de dados, porque `ClassDiagramContent` não muda de forma.

## Registro de execução
### Alterações realizadas
- Reli o JS do artefato completo (`applyTransform`/`fitToScreen`/`panToNode`/handler de `wheel`/`startConnect`/`handleConnectClick`/`renderClassInspector`/`renderEdgeInspector`) para replicar fielmente a matemática de zoom/pan, a máquina de estado do modo de conexão e o conteúdo exato do inspector.
- Criei `src/features/diagram-shell/canvasTransform.ts` (matemática pura: `clampZoom`, `zoomAtPoint`, `zoomByFactor`, `computeBounds`, `fitToScreen`, `panToNode`, `screenDeltaToWorld`) + `canvasTransform.test.ts`, e `useCanvasZoomPan.ts` (hook que liga essa matemática a estado React + wheel nativo com `{passive:false}` + drag do fundo do canvas) — **compartilhados** em `diagram-shell/` desde já (decisão da task, ver abaixo), para TASK-008 reaproveitar sem extrair depois.
- Criei `src/features/class-diagram/connectMode.ts` (`resolveConnectClick`, máquina de estado pura do modo de conexão) + `connectMode.test.ts` (RN-02).
- Adicionei a `contentOperations.ts`: `filterClassesByQuery` (CA-03), `toBoundedNode` (adapta `DiagramClass` para o `BoundedNode` genérico do zoom/pan compartilhado) e um segundo parâmetro opcional `origin` em `addClass` (centraliza a nova classe no trecho visível do canvas, com zoom/pan atuais) — todos com testes novos em `contentOperations.test.ts`.
- Corrigi `ClassCard.tsx`/`Connector.tsx`: o arraste de card e do ponto de controle do conector agora divide o delta de ponteiro pelo `zoom` atual (`screenDeltaToWorld`) — sem isso, arrastar com zoom aplicado moveria na velocidade errada (bug que não existia antes por não haver zoom). Também troquei as cores hardcoded (`#2563eb`, `var(--diagram-bg, #fff)`) pelos tokens do design system (`var(--accent)`, `var(--surface-raised)`, TASK-006).
- Restilizei `ClassCard.tsx` para as classes `.node-box`/`.node-head`/`.node-row`/`.node-empty-row`/`.attr-type` do design system (TASK-006), no lugar de `.class-card`/`.class-card-header`/`.class-card-attributes` (CA-06).
- Reescrevi `ClassDiagramCanvas.tsx` por completo: monta `DiagramShell` (TASK-006) com sidebar (busca + stats + lista clicável), canvas (zoom/pan via `useCanvasZoomPan`, modo de conexão, `ClassCard`/`Connector` dentro de um `.canvas-viewport` transformável, zoom-controls, connect-banner, empty-hint) e inspector fixo (`ClassInspector`/`RelationshipInspector`, com paridade de campos ao painel antigo — CA-04 — e variante somente-leitura para `visualizador` — CA-05). Criei `EdgeTypeGrid.tsx` (grid visual de tipo de relação com os 5 ícones SVG do artefato, substituindo o `<select>` textual).
- Adicionei `canvasProps` em `DiagramShell` (TASK-006) — ver Decisões (bug encontrado e corrigido durante a validação visual).
- Atualizei `DiagramEditorPage.tsx` para passar breadcrumb/título/indicador de salvamento como `topbarCenter` e `ImportExportControls` como `topbarActions` do `ClassDiagramCanvas` (que agora é quem monta o `DiagramShell`).
- Atualizei `DiagramRouterPage.tsx`/`App.tsx`: o `AppLayout` saiu do nível de rota e virou uma decisão por `diagram.type` dentro do roteador — Diagrama de Classes não usa mais `AppLayout` (o shell é full-bleed e é seu próprio chrome de página); Diagrama de Objetos/Visão do Sistema continuam exatamente como antes até TASK-008/009.
- Reescrevi `ClassDiagramCanvas.test.tsx` (interações novas) e adaptei `contentOperations.test.ts`.

### Arquivos principais
- [src/features/diagram-shell/canvasTransform.ts](../../../src/features/diagram-shell/canvasTransform.ts) + [canvasTransform.test.ts](../../../src/features/diagram-shell/canvasTransform.test.ts)
- [src/features/diagram-shell/useCanvasZoomPan.ts](../../../src/features/diagram-shell/useCanvasZoomPan.ts)
- [src/features/diagram-shell/DiagramShell.tsx](../../../src/features/diagram-shell/DiagramShell.tsx) — `canvasProps` novo.
- [src/features/class-diagram/connectMode.ts](../../../src/features/class-diagram/connectMode.ts) + [connectMode.test.ts](../../../src/features/class-diagram/connectMode.test.ts)
- [src/features/class-diagram/EdgeTypeGrid.tsx](../../../src/features/class-diagram/EdgeTypeGrid.tsx)
- [src/features/class-diagram/ClassDiagramCanvas.tsx](../../../src/features/class-diagram/ClassDiagramCanvas.tsx) — reescrito.
- [src/features/class-diagram/ClassCard.tsx](../../../src/features/class-diagram/ClassCard.tsx), [Connector.tsx](../../../src/features/class-diagram/Connector.tsx), [contentOperations.ts](../../../src/features/class-diagram/contentOperations.ts) — ajustados.
- [src/features/class-diagram/DiagramEditorPage.tsx](../../../src/features/class-diagram/DiagramEditorPage.tsx)
- [src/features/navigation/DiagramRouterPage.tsx](../../../src/features/navigation/DiagramRouterPage.tsx), [src/App.tsx](../../../src/App.tsx)

### Decisões
- **Zoom/pan compartilhado desde já em `diagram-shell/`** (não em `class-diagram/`): a task deixava em aberto se isso viraria compartilhado agora ou só na extração da TASK-008. Optei por já deixar em `diagram-shell/` porque a matemática (`canvasTransform.ts`) não depende de nada específico de classes — só de `BoundedNode` genérico — custo zero agora, evita um refactor depois.
- **`DiagramShell` ganhou `canvasProps`** (ref/className/handlers de ponteiro aplicados na própria `.diagram-shell-canvas`): a primeira versão do canvas envolvia seu conteúdo num `<div className="diagram-shell-canvas">` PRÓPRIO, além do que `DiagramShell` já cria — um bug real de duplo-wrapping descoberto na validação visual (CA-06): o `.zoom-controls` (`position:absolute;bottom:16px`) ficava posicionado relativo ao div INTERNO (sem altura, por só conter filhos `position:absolute`), não ao div externo dimensionado pelo grid — resultado: botões de zoom renderizados fora da tela. Corrigido generalizando `DiagramShell` para aceitar essas props na área que ele mesmo já cria, em vez de deixar quem consome recriar a mesma div. Vale para TASK-008 reaproveitar sem repetir o erro.
- **Correção de bug pré-existente no arraste do ponto de controle do conector**: `Connector.tsx` usava `e.clientX` bruto como novo `controlX` (funcionava só coincidentemente, sem zoom/pan/scroll). Como a TASK-007 introduz zoom de verdade, o bug ficaria visível (arrastar moveria rápido/devagar demais fora de proporção) — corrigido calculando um delta relativo (`screenDeltaToWorld`), mesmo padrão já usado no arraste do card.
- **Entrada do modo de conexão**: o artefato só entra em modo de conexão a partir do botão "🔗 Ligar a outra classe" do inspector (com uma classe já selecionada como origem). Adicionei TAMBÉM um botão genérico "🔗 Relação" na topbar (origem em branco, primeiro clique define a origem) — cobre o "clicar origem→depois destino" descrito no "Comportamento esperado" da task sem exigir uma classe pré-selecionada. Os dois pontos de entrada usam a mesma máquina de estado (`connectMode`/`connectFrom`/`resolveConnectClick`).
- **Inspector com variante somente-leitura ao invés de escondido por completo para `visualizador`**: o painel antigo simplesmente não existia para quem não é editor. CA-05 pede "nenhum controle de criação/edição", não "nenhuma informação visível" — por isso o inspector do `visualizador` mostra os mesmos dados (nome, atributos, relações, tipo, multiplicidade) como texto, sem inputs nem botões de ação. Mais completo que o comportamento anterior, sem violar CA-05 (testado explicitamente).
- **Import/Export não foi restilizado** (só relocado para a topbar) — como já estava explícito em "Fora de escopo" da task (visual dos modais é TASK-010).

### Divergências
Nenhuma divergência dos critérios de aceitação.

### Pendências
- Validação manual num navegador real contra um projeto Supabase de verdade (`editor` e `visualizador`) — mesma pendência já registrada na TASK-003, ainda sem sessão de teste com o time. A validação desta task foi feita com conteúdo mockado localmente (sem Supabase), cobrindo CA-01 a CA-07.
- TASK-008 (Diagrama de Objetos) precisa decidir se reaproveita `ClassCard`-como-padrão visual (`.node-box.object`) e o mesmo `useCanvasZoomPan`/`canvasTransform` — ambos já preparados para isso.

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros (mesmos 4 warnings pré-existentes de outras features, nenhum novo)
npm test        # vitest run — 12 arquivos, 74 testes passando (50 da TASK-006 + 24 novos: canvasTransform, connectMode, contentOperations novos casos, ClassDiagramCanvas reescrito)
```
Comparação visual (CA-06): página de preview temporária (revertida depois, `main.tsx`/`__preview__.tsx` só durante a sessão) com 2 classes + 1 relação mockadas, navegador embutido, `localhost:5173`, viewport 1440×900, temas dark e light emulados via `prefers-color-scheme`. Confirmado contra o artefato: grid/topbar/sidebar/inspector, cores e sombra do `.node-box`/`.node-head`/`.node-row`, conector ortogonal com seta, `.zoom-controls`, `.connect-banner` (pill roxo, texto branco), busca+stats da sidebar, inspector com `.field`/`.attr-row`/`.rel-chip`/`.edge-type-grid`. Zoom in/out e "ajustar à tela" testados interativamente (matemática confirmada também por `canvasTransform.test.ts`).

## Handoff
Nenhum handoff pendente — task concluída nesta sessão. Próxima: `.agents/tasks/backlog/TASK-008-canvas-avancado-diagrama-objetos.md`.
