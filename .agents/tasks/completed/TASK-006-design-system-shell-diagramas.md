---
id: TASK-006
title: Design system e shell de 3 colunas para as telas de diagrama
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [design-system, class-diagram, object-diagram, system-view]
related_use_cases: []
related_adrs: [ADR-002]
---

# TASK-006 — Design system e shell de 3 colunas para as telas de diagrama

## Contexto
Primeira task de ADR-002. As 3 visualizações de diagrama (Diagrama de Classes, Diagrama de Objetos, Visão do Sistema) hoje usam um layout de página simples (`<section className="diagram-editor-page">`, toolbar + canvas + painel de edição flutuante) sem nenhuma fundação compartilhada. O artefato-protótipo validado pelo usuário (`https://claude.ai/code/artifact/4f3aa122-e526-4577-8d62-b4bf916453dc`, título "ClassMap") define um shell de app profissional em grid de 3 colunas (topbar + sidebar + canvas + inspector) com tokens de design completos para dark/light — nenhuma das 3 telas tem isso hoje.

## Problema
Sem uma fundação compartilhada de tokens/layout, cada uma das próximas 3 tasks (TASK-007/008/009) reinventaria cores, espaçamento e estrutura de página de forma inconsistente entre si — exatamente o problema já visto na navegação (Organizações/Projetos/Diagramas foram restilizadas nesta sessão com uma aproximação genérica, antes de o artefato real ser localizado).

## Objetivo
Ter, em `src/index.css` e em um componente de layout compartilhado, os tokens de design exatos do artefato e a estrutura de grid de 3 colunas (topbar/sidebar/canvas/inspector), prontos para as 3 páginas de diagrama montarem seu conteúdo dentro — sem nenhuma lógica de diagrama ainda (isso é as tasks seguintes).

## Fora de escopo
- Qualquer interação de canvas (zoom/pan/modo de conexão) — TASK-007/008.
- Conteúdo da sidebar/inspector específico de cada visualização — TASK-007/008/009 preenchem isso.
- Visão do Sistema não usa o grid canvas/inspector (é nav+detail, ver TASK-009) — mas reaproveita os tokens de cor/tipografia desta task.

## Comportamento atual
`src/index.css` tem tokens genéricos (roxo `#7c3aed`, aproximação feita em 2026-08-29 sem acesso ao artefato real). `DiagramEditorPage.tsx`/`ObjectDiagramPage.tsx`/`SystemViewPage.tsx` usam `<section className="diagram-editor-page">` com toolbar + canvas + painel de edição flutuante (`.edit-panel`), sem sidebar nem inspector.

## Comportamento esperado
- Tokens CSS extraídos literalmente do artefato (variáveis abaixo, dark e light via `prefers-color-scheme` + `[data-theme]`, mesmo padrão já usado em `src/index.css` para a navegação):
  ```
  --bg:#f3f4f8 / #12131a
  --surface:#ffffff / #1a1c26
  --surface-alt:#eceef4 / #20222e
  --surface-raised:#ffffff / #242733
  --border:#d9dce5 / #333648
  --border-soft:#e6e8f0 / #2a2d3c
  --text:#1b1e27 / #e8e9f2
  --text-muted:#5c6274 / #9a9fb5
  --text-faint:#9198ab / #6c7188
  --accent:#4a4fe0 / #8489ff
  --accent-strong:#3538c2 / #a1a5ff
  --accent-soft:#eceeff / #242849
  --accent-soft-border:#c9ccff / #3d4180
  --object-accent:#0e9c8f / #3fd6c5
  --object-soft:#e2f7f4 / #173330
  --danger:#d1436b / #f0728f
  --canvas-dot:#d6d9e4 / #2a2d3c
  --canvas-bg:#eaecf3 / #16171f
  ```
- Tipografia: Manrope (500/600/700/800) para UI, IBM Plex Mono (400/500/600) para nomes de atributos/código — mesmo `<link>` do Google Fonts do artefato, classe utilitária `.mono`.
- Componente de layout compartilhado (`DiagramShell` ou nome equivalente decidido na implementação) com `display:grid; grid-template-columns:248px 1fr 292px; grid-template-rows:56px 1fr` e as áreas `topbar/sidebar/canvas/inspector`, aceitando slots (`topbarActions`, `sidebar`, `canvas`, `inspector`) via props/children.
- Topbar com marca (`brand-mark` gradiente `--accent`→`--object-accent`, já existe um padrão parecido em `AppLayout.tsx` da navegação — decidir se reaproveita ou diverge, registrar a decisão) e área de ações à direita.
- Componente de toast reutilizável (mensagem temporária, ex. "Exemplo carregado", usado depois pelas tasks seguintes).

## Regras de negócio
Nenhuma nova — esta task é só design system/layout, sem lógica de dados.

## Critérios de aceitação
- [x] CA-01: Comparação lado a lado com o artefato confirma as mesmas cores/tipografia nos dois temas (dark e light, via emulação de `prefers-color-scheme` no navegador).
- [x] CA-02: O componente de shell renderiza as 4 áreas do grid corretamente em uma página de teste/storybook mínima, sem depender de nenhum dado de diagrama real.
- [x] CA-03: `npm run build`, `npm run lint` e `npm test` continuam limpos (nenhuma das 3 páginas de diagrama é migrada para o shell nesta task — só a fundação existe).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/index.css` (tokens), novo componente de layout compartilhado (local a decidir na implementação — sugestão: `src/features/diagram-shell/` por ser usado pelas 3 features de diagrama).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] Extrair os tokens CSS do artefato para `src/index.css`, substituindo a seção de tokens genéricos adicionada em 2026-08-29.
- [x] Adicionar o `<link>` das fontes Manrope/IBM Plex Mono e a classe `.mono`.
- [x] Criar o componente de shell de 3 colunas com os slots necessários.
- [x] Criar o componente de toast.
- [x] Validar visualmente contra o artefato nos dois temas antes de considerar concluída.

## Estratégia de testes
- [x] Unitários: teste de componente do shell (renderiza os 4 slots corretamente) e do toast (aparece/some).
- [x] Manual: comparação lado a lado com o artefato (CA-01).
- [x] Integração/E2E: não aplicável ainda (nenhuma página real migrada nesta task).

## Riscos e rollback
Baixo risco — task aditiva, não migra nenhuma página existente. Rollback trivial (reverter `src/index.css` e remover os novos arquivos) sem efeito em nenhuma tela em produção.

## Registro de execução
### Alterações realizadas
- Reli o artefato completo (`Artifact` tool, `action: "read"`) e extraí literalmente: os 18 tokens de cor (dark/light via `prefers-color-scheme` + `[data-theme]`, igual ao próprio artefato — não `light-dark()` como na aproximação anterior), a estrutura de grid `#app`/`#topbar`/`#sidebar`/`#canvas-wrap`/`#inspector`, e todas as classes de componente listadas na task (`.btn`/`.view-switch`/`.side-*`/`.stat*`/`.zoom-controls`/`.connect-banner`/`.node-*`/`.field`/`.attr-row`/`.rel-chip`/`.modal-*`/`.toast`).
- Substituí o bloco de tokens genéricos de `src/index.css` (roxo `#7c3aed`) pelos tokens reais, remapeando todo uso das variáveis antigas (`--bg-page`→`--bg`, `--muted`→`--text-muted`, `--surface-hover`→`--surface-alt`, `--border-strong`→`--border`, `--accent-2`→`--object-accent`) — nenhuma variável antiga ficou órfã (conferido via grep). Isso significa que a navegação (Organizações/Projetos/Diagramas) também passou a usar os tokens reais do artefato, não só as 3 telas de diagrama — inevitável por compartilharem o mesmo arquivo CSS (ver "Próximo passo imediato" do snapshot).
- Adicionei `<link>` do Google Fonts (Manrope 500/600/700/800 + IBM Plex Mono 400/500/600) em `index.html`, `font-family: 'Manrope'` no `:root` e a classe `.mono`.
- Criei `DiagramShell` (grid de 3 colunas com slots `topbarCenter`/`topbarActions`/`sidebar`/`canvas`/`inspector`) e `Toast`/`useToast` em `src/features/diagram-shell/`.
- Adicionei ~500 linhas de CSS de componente ao final de `src/index.css` para todas as classes listadas na task.
- Validei visualmente (CA-01) via uma página de preview temporária montada em `main.tsx` (revertida antes de terminar) e o navegador embutido, nos dois temas — screenshots batem com o artefato (grid, cores, node-box, sidebar, inspector, toast).

### Arquivos principais
- [src/index.css](../../../src/index.css) — tokens (linhas 1–91) + componentes do shell (a partir de "Diagram shell — fundação de design system").
- [index.html](../../../index.html) — `<link>` das fontes.
- [src/features/diagram-shell/DiagramShell.tsx](../../../src/features/diagram-shell/DiagramShell.tsx)
- [src/features/diagram-shell/Toast.tsx](../../../src/features/diagram-shell/Toast.tsx)
- [src/features/diagram-shell/DiagramShell.test.tsx](../../../src/features/diagram-shell/DiagramShell.test.tsx)
- [src/features/diagram-shell/Toast.test.tsx](../../../src/features/diagram-shell/Toast.test.tsx)

### Decisões
- **Dark/light via `prefers-color-scheme`+`[data-theme]`, não `light-dark()`**: a aproximação anterior usava `light-dark()`; o artefato usa media query + atributo `[data-theme]` (permitindo uma futura alternância manual de tema sem depender do SO). Adotado o padrão do artefato, por ser a fonte de verdade e já vir pronto para essa extensão futura.
- **`.brand-mark` reaproveitado, gradiente corrigido**: mantive a mesma classe `.brand-mark` já usada em `AppLayout.tsx` (não criei uma variante divergente), mas corrigi a ordem do gradiente para `linear-gradient(135deg, var(--accent), var(--object-accent))`, igual ao artefato (a versão anterior tinha a ordem trocada com `--accent-2`, que deixou de existir). O tamanho do artefato (22px) foi aplicado só dentro de `.diagram-shell-topbar` — o brand-mark de 28px do `AppLayout` (nav e tela de login) não foi alterado, para não mudar um elemento fora do escopo desta ADR.
- **`.field` escopado sob `.diagram-shell-inspector`**: o artefato define `.field`/`.field input` como classe global (é uma página estática só com ids). No app real, `.field` já era usado por `.inline-create-form` da navegação (Organizações/Projetos) com um estilo diferente. Para não regredir esse componente (fora do escopo de ADR-002), a versão do inspector ficou escopada (`.diagram-shell-inspector .field`) em vez de global — mesmo efeito visual dentro do shell, zero impacto fora dele. Mesma lógica aplicada às demais classes só usadas dentro de uma área do shell (`.side-*`/`.stat*` sob `.diagram-shell-sidebar`; `.zoom-controls`/`.connect-banner`/`.node-*` sob `.diagram-shell-canvas`; `.view-switch`/`.brand-name`/`.divider-v`/`.topbar-actions` sob `.diagram-shell-topbar`). Classes usadas em mais de uma área (`.btn`, `.modal-overlay`/`.modal`, `.toast`) permaneceram globais, como no artefato.
- **`DiagramShell` sem integração com `AppLayout`**: o shell usa `height:100vh` (igual ao artefato, pensado para ocupar a tela inteira). Como nenhuma página real foi migrada nesta task, não decidi ainda se as páginas de diagrama vão deixar de usar `AppLayout` (header próprio) ou se o shell vai calcular a altura descontando o header — fica para TASK-007 (ver Pendências).
- **Fonte Manrope aplicada globalmente** (não só nas telas de diagrama): como o token de fonte vive no mesmo `:root` compartilhado, e o objetivo é um design system único, apliquei a mudança de fonte a todo o app (nav incluída), não só ao shell novo.

### Divergências
Nenhuma divergência dos critérios de aceitação. A única adaptação foi o escopamento de classes descrito acima (decisão registrada, não uma divergência do resultado esperado).

### Pendências (para TASK-007/008/009)
- Decidir como `DiagramShell` convive com `AppLayout` (o shell substitui o header da navegação para as rotas de diagrama, ou `AppLayout` para de envolver essas 3 páginas?).
- Nenhuma página real (`DiagramEditorPage`/`ObjectDiagramPage`/`SystemViewPage`) foi migrada para o shell — só a fundação existe, conforme escopo desta task.

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros (mesmos 4 warnings pré-existentes de outras features, nenhum novo além de 1 idêntico de padrão em Toast.tsx)
npm test        # vitest run — 10 arquivos, 50 testes passando (44 anteriores + 6 novos: 2 de DiagramShell, 4 de Toast/useToast)
```
Comparação visual (CA-01): navegador embutido, `localhost:5173`, viewport 1440×900, temas dark e light emulados via `prefers-color-scheme` — grid, cores, tipografia, node-box, sidebar (busca/stats/lista), inspector (campos/atributos/chip de relação) e toast conferem com o artefato nas duas variações.

## Handoff
Nenhum handoff pendente — task concluída nesta sessão. Próxima: `.agents/tasks/backlog/TASK-007-canvas-avancado-diagrama-classes.md`.
