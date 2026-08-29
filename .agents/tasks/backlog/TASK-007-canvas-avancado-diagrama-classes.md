---
id: TASK-007
title: Diagrama de Classes — canvas avançado (zoom/pan, modo de conexão, busca+stats, inspector)
status: backlog
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
- [ ] CA-01: Zoom (+/−/ajustar à tela) e pan funcionam no canvas, sem quebrar o posicionamento absoluto dos cards existentes (`DiagramClass.x/y`).
- [ ] CA-02: Criar uma relação clicando origem→destino no canvas produz o mesmo resultado (`DiagramRelationship` com `from`/`to`/`type`) que o formulário antigo de 2 selects produzia — validado via teste automatizado.
- [ ] CA-03: Busca na sidebar filtra a lista de classes em tempo real por substring do nome (case-insensitive).
- [ ] CA-04: Inspector mostra e edita classe/relação selecionada com paridade de campos ao `ClassEditPanel`/`RelationshipEditPanel` atuais (nenhum campo perdido na migração).
- [ ] CA-05: `visualizador` (role !== 'editor') não vê nenhum controle de criação/edição (mesmo reforço de UI já existente, RN-02 da TASK-002) — só navega/dá zoom/pan.
- [ ] CA-06: Comparação lado a lado com o artefato confirma paridade visual (cores dos nós, `.node-head`/`.node-row`, sombra `.node-box`) nos dois temas.
- [ ] CA-07: `npm run build`, `npm run lint` e `npm test` limpos — testes existentes de `ClassDiagramCanvas.test.tsx`/`contentOperations.test.ts` continuam passando (adaptados se a migração de painel flutuante → inspector exigir).

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
- [ ] Implementar o hook/lógica de zoom/pan do canvas (candidato a ser reaproveitado por TASK-008 — decidir se vira um hook compartilhado já nesta task ou se TASK-008 extrai depois).
- [ ] Implementar o modo de conexão (estado `connectMode`/`connectFrom`, banner, clique em `ClassCard` para completar).
- [ ] Migrar `ClassEditPanel`/`RelationshipEditPanel` para o slot `inspector` do shell (TASK-006).
- [ ] Implementar busca + stats na sidebar.
- [ ] Atualizar `DiagramEditorPage.tsx` para montar tudo dentro do shell compartilhado.
- [ ] Validar contra o artefato (CA-06) antes de considerar concluída.

## Estratégia de testes
- [ ] Unitários: zoom/pan (matemática de transformação), modo de conexão (máquina de estado), busca (filtro).
- [ ] Componente: `ClassDiagramCanvas.test.tsx` adaptado para o novo layout/inspector.
- [ ] Manual: os 5+ critérios de aceitação, com usuários `editor` e `visualizador`, num navegador real (mesma pendência já registrada em TASK-003 para validação com Supabase real).
- [ ] Integração: persistência real contra o Supabase para toda alteração feita via canvas/inspector novos.

## Riscos e rollback
Task mais arriscada de ADR-002 — zoom/pan e modo de conexão implementados do zero podem divergir do artefato em detalhes de sensibilidade/UX. Rollback: reverter para `ClassDiagramCanvas.tsx` anterior (painel flutuante + formulário de 2 selects) sem perda de dados, porque `ClassDiagramContent` não muda de forma.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Link para o handoff ativo, quando aplicável.
