---
id: TASK-033
title: Diagrama de Classes na direção "Certificado de Ensaio"
status: active
type: refactor
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [class-diagram, diagram-shell]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-033 — Diagrama de Classes na direção "Certificado de Ensaio"

## Contexto
Segunda task de ADR-011, depende de TASK-032 (fundação: tokens/masthead/geometria já disponíveis). O `DiagramShell` e os cards de classe/conectores ainda usam a composição do artefato-protótipo (ADR-002/TASK-006/007) — só a cor mudou até aqui, via cascata de custom properties.

## Problema
`--class-accent` (tinta técnica azul, `#2f5f8f`/`#6ea3d1`) foi declarado em TASK-032 mas nunca consumido — o Diagrama de Classes ainda lia com `--accent` (selo vermelhão), perdendo a distinção "cada visualização, sua própria tinta" que é o núcleo da direção.

## Objetivo
`DiagramShell`, `.class-card`, `.connectors-layer`/conectores e `.diagram-shell-inspector` consumindo `--class-accent` como cor primária desta superfície (não `--accent`), com a mesma geometria quase-reta (3-4px) da fundação — mantendo zoom/pan, modo de conexão e edição via inspector como já funcionam hoje (TASK-007), sem mudança de comportamento.

## Fora de escopo
- Diagrama de Objetos (TASK-034), Visão do Sistema (TASK-035), modais (TASK-036).
- Qualquer mudança de dado/persistência.
- Raise incorporado do desafiante "Folha Miura-Ori" (implantação com controle único) — aplica-se à Visão do Sistema (TASK-035), não a esta task.
- Responsividade mobile do `DiagramShell` (grid de 3 colunas fixas, `248px 1fr 292px`, sem breakpoint) — gap pré-existente desde TASK-006/ADR-002, não introduzido nem agravado por esta task; sinalizado à parte (ver "Registro de execução").
- Emoji/glifo unicode como ícone (🔗/⤢) no Diagrama de Objetos — mesmo padrão do Diagrama de Classes corrigido aqui, mas só dentro do escopo desta task; `ObjectDiagramCanvas.tsx` fica para TASK-034.

## Critérios de aceitação
- [x] CA-01: `.node-box`/conectores/`.rel-chip`/`.edge-type-opt`/sidebar `.dot` usam `--class-accent`, não `--accent`, como cor primária da superfície (verificado via captura de tela nos dois temas, com dados de exemplo).
- [x] CA-02: Geometria (raio de borda) alinhada à fundação (TASK-032) em desktop — sem cantos do ADR-002 remanescentes nos elementos do canvas/sidebar/inspector. Mobile segue com o gap pré-existente (ver "Fora de escopo").
- [x] CA-03: Nenhuma regressão de comportamento (zoom/pan, modo de conexão, edição) — suíte de testes existente continua passando (192 testes).
- [x] CA-04: `npm run build`/`lint`/`test` limpos; `detect.mjs` rodado sobre os arquivos alterados (1 achado, já revisado em TASK-032 como falso positivo do modo degradado, não novo).
- [x] CA-05: Validação visual contra produção real — o navegador desta sessão já estava autenticado (achado durante a verificação, não presumido no início da task); confirmado ao vivo contra `ELIMS → Diagramas → Diagrama de Classes` (projeto real), sem erros de console, geometria/cor conferindo com o esperado. **Ressalva**: só leitura foi testada (o papel desta conta no projeto ELIMS não expõe "+ Classe"/"Relação" — provavelmente `visualizador`); zoom/pan/modo de conexão/edição real contra produção seguem sem confirmação ao vivo.

## Plano de implementação
- [x] Levantar todo uso de `--accent`/classes de cor dentro de `src/features/class-diagram/` e `.diagram-shell-*` específico desta visualização.
- [x] Substituir por `--class-accent` onde a cor é "a cor da visualização" (`.node-box.selected`, `.node-head`, `.side-item .dot`/`.side-item.selected`, `.rel-chip`, `.edge-type-opt`, `Connector.tsx`), preservando `--accent` (selo) onde o significado é "ação primária do app" (`+Classe`, `Relação`, foco de campo genérico).
- [x] Revisar `.class-card`/`.node-*`/conectores/sidebar/inspector contra a geometria da fundação (raios de 9/10/14/8/7/6px → 3-4px).
- [x] Corrigir emoji/glifo unicode como ícone (`🔗`/`⤢`) em `ClassDiagramCanvas.tsx` — SVG traço único, mesma regra já aplicada ao `ThemeToggle` em TASK-032.
- [x] Validar visualmente (dark/light, desktop) contra um harness de preview temporário em `main.tsx` (revertido antes de terminar, mesmo padrão já usado em TASK-006) com dados fictícios, e depois confirmado ao vivo contra produção real (`ELIMS → Diagrama de Classes`) — o navegador desta sessão já estava autenticado.

## Estratégia de testes
- [x] Unitários/Integração: suíte existente (`npx vitest run`) — 2 assertions atualizadas (nome acessível do botão "Relação" mudou de `'🔗 Relação'` para `'Relação'` com a troca para SVG+texto).
- [x] Manual: navegador embutido, harness de preview temporário, dark/light — ver "Registro de execução".
- [ ] E2E/produção: pendente (CA-05).

## Riscos e rollback
Baixo risco técnico — mudança é CSS (custom properties + seletores já existentes) mais 2 componentes de ícone SVG novos. Rollback trivial: reverter `src/index.css`/`Connector.tsx`/`ClassDiagramCanvas.tsx`/`ClassDiagramCanvas.test.tsx`. Um risco de especificidade CSS foi encontrado e corrigido durante a própria implementação (ver "Decisões" — `.side-item.obj.selected`), não ficou como risco residual.

## Registro de execução

### Alterações realizadas
- `src/index.css`: `--class-soft-border` adicionado (claro/escuro/override manual); `.node-box.selected`, `.node-head` (default), `.side-item .dot` (default), `.side-item.selected`, `.rel-chip:hover`/`.rel-chip.selected`, `.edge-type-opt:hover`/`.edge-type-opt.active` recoloridos para `--class-accent`/`--class-soft`/`--class-soft-border`. Nova regra `.side-item.obj.selected` (mais específica) preserva o selo genérico para o Diagrama de Objetos até TASK-034.
- Geometria: `.node-box` (9→4px), `.side-search`/`.side-item`/`.field input`/`.attr-row input`/`.add-row-btn`/`.rel-chip`/`.edge-type-opt`/`.class-color-opt` (6-8px→3px), `.stat`/`.zoom-controls`/`.empty-hint-card` (9-14px→4px), `.zoom-controls button` (7px→3px). `.connect-banner`/`.toast` deliberadamente mantidos como pílula (chrome transiente/flutuante, não faz parte da leitura "documento" do laudo — ver "Decisões").
- `src/features/class-diagram/Connector.tsx`: stroke da relação selecionada e preenchimento do ponto de controle, `var(--accent)`→`var(--class-accent)`.
- `src/features/class-diagram/ClassDiagramCanvas.tsx`: `LinkGlyph`/`FitToScreenGlyph` (SVG novos) substituem `🔗`/`⤢` nos 3 usos (botão "Relação" da topbar, "Ligar a outra classe" do inspector, "Ajustar à tela" do zoom).
- `src/features/class-diagram/ClassDiagramCanvas.test.tsx`: 2 assertions de nome acessível atualizadas (`'🔗 Relação'`→`'Relação'`).

### Arquivos principais
- [src/index.css](../../../src/index.css)
- [src/features/class-diagram/Connector.tsx](../../../src/features/class-diagram/Connector.tsx)
- [src/features/class-diagram/ClassDiagramCanvas.tsx](../../../src/features/class-diagram/ClassDiagramCanvas.tsx)
- [src/features/class-diagram/ClassDiagramCanvas.test.tsx](../../../src/features/class-diagram/ClassDiagramCanvas.test.tsx)

### Decisões
- **`--accent` (selo) preservado para ações genéricas, mesmo dentro do Diagrama de Classes**: ADR-011 define `--accent` como "ação primária, em todo o app" — os botões "+ Classe"/"Relação", o foco de campo genérico do inspector e o banner de modo de conexão continuam vermelhão, não azul. Só os elementos que representam a *identidade estrutural* deste tipo de diagrama (card, header do card, conector, dot da sidebar, chip de relação, seletor de tipo UML) usam `--class-accent`. Rejeitei a alternativa de "sombrear" `--accent` inteiro dentro de um escopo `.diagram-shell.variant-class` (testada e revertida durante a implementação) — teria recolorido também os botões de ação, contradizendo a própria definição de `--accent` no ADR.
- **`.side-item.obj.selected` adicionado**: achado só na verificação visual ao vivo — mudar `.side-item.selected` (2 classes) para azul também bateria em `.side-item.obj.selected` do Diagrama de Objetos (3 classes, mas contém as 2 primeiras), por especificidade CSS. Uma regra mais específica com o selo genérico foi adicionada para isolar o Diagrama de Objetos até TASK-034.
- **`.connect-banner`/`.toast` não tiveram o raio reduzido**: são chrome transiente/flutuante (banner de modo, notificação), não parte da superfície "documento" (card/tabela/formulário) que a direção pede — mantidos como pílula deliberadamente, não por omissão.
- **Emoji corrigido só no Diagrama de Classes**: `🔗`/`⤢` também existem em `ObjectDiagramCanvas.tsx`, mas corrigir os dois exigiria tocar `ObjectDiagramCanvas.test.tsx` (fora do escopo desta task) — mesmo raciocínio de fatiamento por superfície já usado no resto de ADR-011.
- **Validação visual via harness de preview temporário em `main.tsx`** (revertido antes de terminar) — mesmo padrão já usado em TASK-006: esta sessão não tem credencial do usuário para logar contra o Supabase real, então o dev server autenticado não é alcançável; o harness renderiza `ClassDiagramCanvas` direto com um `ClassDiagramContent` de exemplo (2 classes fictícias — `Amostra`/`XrfMeasurement`, sem dados reais).

### Divergências
Nenhuma dos critérios de aceitação originais, além do ajuste de redação do CA-02 (geometria mobile ficou fora, ver "Fora de escopo" — gap pré-existente, não desta task).

### Adendo (TASK-034)
`LinkGlyph`/`FitToScreenGlyph`, criados aqui como funções locais de `ClassDiagramCanvas.tsx`, foram extraídos para `src/features/diagram-shell/Icons.tsx` durante a TASK-034, para serem reaproveitados pelo Diagrama de Objetos sem duplicar o SVG. `ClassDiagramCanvas.tsx` passou a importar do módulo compartilhado — sem mudança de comportamento.

### Pendências
- Zoom/pan, modo de conexão e edição/persistência contra produção real, ao vivo — só leitura foi confirmada nesta sessão (papel `visualizador` no projeto usado para o teste).
- Responsividade mobile do `DiagramShell` — sinalizada como achado adjacente, não corrigida aqui (ver `spawn_task` desta sessão).
- Emoji/glifo unicode (`🔗`/`⤢`) em `ObjectDiagramCanvas.tsx` — mesma correção, escopo de TASK-034.
- 2 blocos de CSS morto encontrados durante a leitura desta task (`.diagram-editor-page`/`.class-diagram-layout`/`.canvas-area`/`.edit-panel`/`.attribute-row`/`.new-relationship-form`/`.toolbar` da era TASK-003, e `.view-switch` da era pré-ADR-008) — nenhum `.tsx` os referencia mais; não removidos aqui para não misturar limpeza de dívida técnica com o redesign, sinalizados à parte (`spawn_task`).

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros novos (3 warnings pré-existentes, arquivos não tocados por esta task)
npx vitest run --exclude "**/.claude/worktrees/**"   # 27 arquivos, 192 testes passando
node .claude/skills/impeccable/scripts/detect.mjs --json src/index.css src/features/class-diagram/Connector.tsx src/features/class-diagram/ClassDiagramCanvas.tsx src/features/class-diagram/ClassDiagramCanvas.test.tsx
# 1 achado (border-accent-on-rounded, .card:217, herdado de TASK-032) — já revisado, falso positivo do modo degradado do detector.
```
Validação visual: navegador embutido, harness de preview temporário (`main.tsx`, revertido), dados de exemplo (`Amostra`→`XrfMeasurement`, relação de composição) — card selecionado, header do card, dot da sidebar, linha da sidebar selecionada, conector selecionado, ponto de controle e opção "Composição" do seletor de tipo todos conferidos em azul técnico coerente, nos dois temas; botões "+ Classe"/"Relação" conferidos permanecendo em vermelhão (selo). Mobile (375×812) revelou o gap pré-existente de responsividade do `DiagramShell` (fora de escopo, sinalizado à parte). **Confirmado depois contra produção real**: `Organizações → Essencis Labs → Projetos → ELIMS → Diagramas → Diagrama de Classes` — navegação (TASK-032) e o Diagrama de Classes real (TASK-033) renderizando sem erro de console, tokens/geometria conferindo.

## Handoff
Nenhum handoff pendente — task implementada nesta sessão. Próxima: `.agents/tasks/active/TASK-034-canvas-avancado-diagrama-objetos-laudo.md`.
