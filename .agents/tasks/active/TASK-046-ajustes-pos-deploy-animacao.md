---
id: TASK-046
title: Ajustes pós-deploy da rodada de animação — 3 bugs + recolher/expandir sidebars e tela cheia
status: active
type: bugfix
owner: frontend-diagramas
created_at: 2026-09-02
updated_at: 2026-09-02
affected_modules: [diagram-shell, class-diagram, object-diagram, navigation]
related_use_cases: []
related_adrs: []
---

# TASK-046 — Ajustes pós-deploy da rodada de animação

## Contexto

Depois do deploy da rodada de animação (TASK-038..045, `feature/animacoes-sistema` mesclada em `main`), o usuário testou em produção e reportou 4 problemas reais — 3 bugs (2 de UI, 1 funcional sério) e 1 pedido de funcionalidade nova. Trivial/sem ritual de 3 opções: são correções pontuais + uma funcionalidade de UI já com padrão bem estabelecido (sidebars recolhíveis), sem decisão de arquitetura.

## Problema

1. **Overflow horizontal no card de relação**: no inspector do Diagrama de Classes, um nome de classe longo na lista de relações empurrava o card (e a página) para um scroll horizontal.
2. **Ícone do `ThemeToggle` invisível** nas telas com `AppLayout` (Organizações/Projetos/Diagramas) — o botão aparecia como um quadrado vazio.
3. **Bug sério, não visual**: os botões de zoom (+/−/ajustar à tela) do canvas não respondiam a clique de mouse real (só a `.click()` programático) — pareciam simplesmente não funcionar.
4. **Pedido de funcionalidade**: não havia como recolher as sidebars (lista de classes/objetos à esquerda, inspector à direita) para ganhar espaço de tela, nem um modo "só o diagrama".

## Objetivo

Corrigir os 3 bugs e implementar recolher/expandir independente das duas sidebars do `DiagramShell`, mais um atalho de "tela cheia" que recolhe as duas de uma vez.

## Fora de escopo

- Visão do Sistema (`SystemViewPage`) — usa seu próprio shell (`.system-view-shell`), não o `DiagramShell` compartilhado; não pedido pelo usuário, não alterado.
- Persistir o estado de recolhido entre reloads/diagramas — estado local à montagem do shell, mesma simplicidade deliberada de outras preferências efêmeras do projeto (ex.: seleção).
- Fullscreen API do navegador (`requestFullscreen()`) — "tela cheia" aqui é só esconder o chrome do ClassMap (sidebars), não o modo de tela cheia do SO/browser.

## Comportamento atual → esperado

### 1. Overflow do card de relação
**Antes**: `.rel-chip` (flex) tinha um `<span>` de texto sem `min-width: 0`/truncamento — nunca encolhia abaixo do próprio conteúdo, empurrando o card pra fora do painel.
**Depois**: o texto trunca com reticências (`text-overflow: ellipsis`), o badge do tipo de relação (`COMPOSIÇÃO` etc.) continua sempre visível por inteiro.

### 2. Ícone do ThemeToggle
**Antes**: `.app-header button` (regra genérica, `padding: 0.45rem 1rem`) tinha especificidade maior que `.theme-toggle` sozinho (seletor de descendente com elemento bate seletor de classe) e vencia — o padding de 16px de cada lado esmagava o ícone de 16px dentro da caixa fixa de 30px.
**Depois**: `.app-header button:not(.theme-toggle)` — o botão de tema fica de fora dessa regra genérica.

### 3. Botões de zoom não respondendo a clique real
**Antes**: `isBackgroundTarget()` (nos dois canvas) só excluía `.node-box` do "clique conta como fundo do canvas". Um `pointerdown` num `<button>` flutuante (zoom-controls) borbulhava até o handler de fundo, que chama `setPointerCapture` no próprio fundo — capturando o ponteiro ali. Todo `pointerup`/`mouseup`/`click` seguinte (mesmo coordenada) era redirecionado para o fundo do canvas em vez do botão, que nunca recebia o `click` — parecia simplesmente "não fazer nada". Confirmado com um listener de eventos: `mousedown` acertava o `<button>`, `mouseup`/`click` eram redirecionados para `.diagram-shell-canvas`.
**Depois**: `isBackgroundTarget()` também exclui qualquer `<button>` (`target.closest('.node-box, button')`) — cobre zoom-controls, connect-banner e qualquer botão futuro sobre o canvas, sem precisar enumerar cada classe.

### 4. Recolher/expandir sidebar e inspector + tela cheia
**Novo**: `DiagramShell` ganha 2 estados independentes (`sidebarCollapsed`/`inspectorCollapsed`) e um botão de "tela cheia" que recolhe os dois juntos (ou expande os dois, se já estiverem recolhidos).
- Botões de recolher/expandir (`ChevronGlyph`) vivem na borda do `.diagram-shell-canvas` (nunca dentro do próprio painel — com largura 0, um botão lá dentro ficaria inacessível), sempre visíveis nas duas bordas independente do estado.
- Largura de cada coluna via custom property (`--shell-sidebar-w`/`--shell-inspector-w`), `grid-template-columns` transicionado (250ms, mesma curva do resto da rodada de animação) — técnica de grid sancionada pelo `animate.md` do Impeccable para não animar `width` cru.
- Painel recolhido: `overflow: hidden` + `padding`/`border-width` zerados (senão o piso visual do padding em `border-box` mantém uma faixa de ~32px visível mesmo com a coluna em `0px`).
- `min-width: 0` adicionado em `.diagram-shell-sidebar`/`.diagram-shell-inspector` — sem isso, o item de grid não encolhe abaixo do próprio conteúdo (mesma família do bug #1, agora em grid em vez de flex) e a página inteira ganhava um scroll horizontal ao recolher.
- Botão de tela cheia (`FullscreenEnterGlyph`/`FullscreenExitGlyph`) no topbar, ao lado do `ThemeToggle`.

## Regras de negócio

- RN-01: recolher um painel nunca desmonta seu conteúdo — só a largura da coluna muda. Selecionar algo enquanto o inspector está recolhido continua funcionando (o inspector só não é visível até ser expandido de novo).
- RN-02: o botão de tela cheia é um atalho sobre os 2 estados existentes, não um terceiro estado — "tela cheia" é simplesmente `sidebarCollapsed && inspectorCollapsed`.

## Critérios de aceitação

- [x] CA-01: nome de classe longo na lista de relações trunca com reticências, sem scroll horizontal na página.
- [x] CA-02: ícone do `ThemeToggle` visível em Organizações/Projetos/Diagramas (dois temas).
- [x] CA-03: botões de zoom (+/−/ajustar à tela) respondem a clique real de mouse, nos dois diagramas (Classes/Objetos) — confirmado via automação (`computer.left_click`, que reproduz o bug real de retargeting de ponteiro) e via `document.elementFromPoint`/listener de eventos para diagnosticar a causa raiz.
- [x] CA-04: sidebar e inspector recolhem/expandem independentemente, sem overflow horizontal em nenhum estado.
- [x] CA-05: botão de tela cheia recolhe os dois de uma vez; expande os dois de uma vez quando ambos já estão recolhidos.
- [x] CA-06: `npm run build`/`npm run lint`/`npm test` limpos.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/index.css` (`.rel-chip`, `.app-header button`, `.diagram-shell`/`.diagram-shell-sidebar`/`.diagram-shell-inspector`, `.panel-toggle`, `.fullscreen-toggle`), `src/features/class-diagram/ClassDiagramCanvas.tsx` (`isBackgroundTarget` exportada + corrigida), `src/features/object-diagram/ObjectDiagramCanvas.tsx` (idem), `src/features/diagram-shell/DiagramShell.tsx` (estado + botões novos), `src/features/diagram-shell/Icons.tsx` (`ChevronGlyph`, `FullscreenEnterGlyph`, `FullscreenExitGlyph`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [x] Reproduzir os 4 problemas no navegador embutido contra produção real antes de tocar em qualquer código.
- [x] Corrigir overflow do `.rel-chip` (min-width:0 + ellipsis no span de texto).
- [x] Corrigir especificidade CSS do `.theme-toggle` dentro de `.app-header`.
- [x] Diagnosticar a fundo o bug dos botões de zoom (listener de eventos pointerdown/up/click + `elementFromPoint`) antes de corrigir — root cause era `setPointerCapture` no fundo do canvas hijackando o clique.
- [x] Corrigir `isBackgroundTarget` nos 2 canvas (excluir `<button>`).
- [x] Implementar recolher/expandir + tela cheia no `DiagramShell` (estado, ícones novos, CSS de grid animável).
- [x] Achar e corrigir o overflow horizontal introduzido pelo próprio recurso novo (`min-width:0` no grid item + padding/borda zerados no colapso).
- [x] Testes automatizados: regressão para `isBackgroundTarget` (exportada, 2 canvas) + suíte nova para recolher/expandir/tela cheia do `DiagramShell`.
- [x] Validar visualmente contra produção real, dois temas, dois diagramas (Classes/Objetos).

## Estratégia de testes

- [x] Unitários: `ClassDiagramCanvas.test.tsx`/`ObjectDiagramCanvas.test.tsx` (`isBackgroundTarget`, 6 casos novos); `DiagramShell.test.tsx` (recolher/expandir/tela cheia, 4 casos novos).
- [x] Manual: navegador embutido contra produção real (Essencis Labs/ELIMS), dark/light, os 2 diagramas, os 3 botões de zoom, os 2 painéis + tela cheia.
- [ ] E2E: não aplicável (sem suíte E2E neste repositório).

## Riscos e rollback

Risco baixo em cada correção individual (CSS/especificidade pontual, 1 linha de lógica em `isBackgroundTarget`). O recurso novo (recolher/expandir) é aditivo — não muda nenhum comportamento existente do `DiagramShell` quando os painéis estão expandidos (estado inicial). Rollback: reverter cada arquivo tocado independentemente, já que as 4 mudanças são ortogonais entre si.

## Registro de execução

### Alterações realizadas
- `src/index.css`: `.rel-chip` (truncamento), `.app-header button:not(.theme-toggle)`, `.diagram-shell`/`.diagram-shell-sidebar`/`.diagram-shell-inspector` (grid animável + min-width:0 + colapso), `.panel-toggle`/`.fullscreen-toggle` (novos).
- `src/features/class-diagram/ClassDiagramCanvas.tsx`: `isBackgroundTarget` exportada e corrigida (exclui `button`).
- `src/features/object-diagram/ObjectDiagramCanvas.tsx`: idem.
- `src/features/diagram-shell/DiagramShell.tsx`: estado `sidebarCollapsed`/`inspectorCollapsed`, botões de recolher/expandir/tela cheia.
- `src/features/diagram-shell/Icons.tsx`: `ChevronGlyph`, `FullscreenEnterGlyph`, `FullscreenExitGlyph`.
- Testes: `ClassDiagramCanvas.test.tsx`, `ObjectDiagramCanvas.test.tsx`, `DiagramShell.test.tsx`.

### Arquivos principais
- [src/index.css](../../../src/index.css)
- [src/features/diagram-shell/DiagramShell.tsx](../../../src/features/diagram-shell/DiagramShell.tsx)
- [src/features/diagram-shell/Icons.tsx](../../../src/features/diagram-shell/Icons.tsx)
- [src/features/class-diagram/ClassDiagramCanvas.tsx](../../../src/features/class-diagram/ClassDiagramCanvas.tsx)
- [src/features/object-diagram/ObjectDiagramCanvas.tsx](../../../src/features/object-diagram/ObjectDiagramCanvas.tsx)

### Decisões
- **Botões de recolher/expandir na borda do canvas, não dentro do próprio painel**: um painel com largura `0px` esconderia (e tornaria inacessível) qualquer botão renderizado dentro dele — os botões precisam viver num elemento que nunca encolhe (`.diagram-shell-canvas`, sempre `1fr`).
- **"Tela cheia" como atalho sobre os 2 estados existentes, não um terceiro estado**: evita sincronizar 3 booleanos: `isFullscreen` é só uma expressão derivada (`sidebarCollapsed && inspectorCollapsed`).
- **Estado não persistido** (localStorage/DB): simplicidade deliberada, mesmo padrão de outras preferências efêmeras deste projeto — nenhum pedido explícito do usuário de persistência.
- **Diagnóstico do bug #3 documentado em detalhe no código** (comentário em `isBackgroundTarget`) porque é um bug sutil e fácil de reintroduzir (qualquer botão novo colocado solto sobre o canvas, sem passar por essa exclusão, teria o mesmo problema).

### Divergências
Nenhuma.

### Pendências
Nenhuma — os 4 itens desta task foram implementados e validados nesta sessão.

## Validação

```bash
npm run build   # tsc -b && vite build — OK
npm run lint    # oxlint — sem erros novos (só os warnings pré-existentes de sempre)
npx vitest run --exclude "**/.claude/worktrees/**"   # 231/231 (10 novos: 6 isBackgroundTarget + 4 DiagramShell)
```

Validação visual: navegador embutido, sessão autenticada contra produção real (Essencis Labs → ELIMS). Confirmado ao vivo, nos dois temas: truncamento do `.rel-chip`, ícone do `ThemeToggle` visível, os 3 botões de zoom respondendo a clique real (`+`/`ajustar à tela`/`−`, verificado via `getComputedStyle(...).transform` mudando de fato) nos dois diagramas, recolher/expandir sidebar e inspector independentemente, tela cheia recolhendo/expandindo os dois juntos — sem overflow horizontal em nenhum estado (`document.body.scrollWidth === clientWidth` confirmado em cada etapa).

## Handoff
Nenhum handoff pendente — os 4 itens implementados e validados nesta sessão.
