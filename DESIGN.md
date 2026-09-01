# Design

<!-- impeccable:design-schema 1 -->

## Status

**Completo — ADR-011 implementado de ponta a ponta.** Este documento registra a direção visual "Certificado de Ensaio" (ADR-011) como construída: tokens, navegação (Organizações/Projetos/Diagramas), login/acesso (TASK-032), Diagrama de Classes (TASK-033, `--class-accent`), Diagrama de Objetos (TASK-034, `--object-accent`), Visão do Sistema (TASK-035, masthead estendido + geometria + animação de implantação única) e modais (TASK-036, `RolePicker` + selo de validação no sucesso). Uma ressalva: TASK-036 não teve validação ao vivo contra produção real (a aba autenticada foi fechada por engano no meio da sessão) — só contra um harness de preview sintético. Recomendado confirmar visualmente na próxima sessão.

## Direção

**Certificado de Ensaio** — cada tela do ClassMap lê como um laudo técnico certificado (o tipo de documento que o próprio Elims processa), não um dashboard SaaS genérico. Escolhida numa rodada de decisão visual (`concept-seed.mjs --scope direction --mode operate`, seed key `54ce3b5a`) entre 7 direções próprias derivadas do domínio real da audiência (mineração/geoquímica/lab) e 6 desafiantes de catálogo genérico. Ver `.agents/decisions/ADR-011-redesign-laudo-certificado-ensaio.md` para o registro completo da decisão, incluindo os "raises" incorporados de desafiantes descartados.

Contrato de direção (`index.html`, comentário HTML no topo do `<body>`):
- **THESIS**: ClassMap não é um dashboard — é o laudo técnico assinado que substitui uma imagem estática do Visual Paradigm por um registro vivo e auditável.
- **STORY**: o time abre um diagrama e lê como abriria o laudo de um ensaio — cabeçalho travado com projeto/autor/data, corpo em tabela/grade travada, selo "salvo" quando confirmado.
- **FIRST VIEWPORT**: cabeçalho de laudo travado no topo (marca + ações), corpo full-bleed sobre a grade técnica do papel de certificado.

## Paleta

Papel/tinta como base neutra; cada visualização tem sua própria tinta — nunca decorativo, sempre um papel funcional específico.

| Token | Papel (claro) | Papel (escuro) | Uso |
|---|---|---|---|
| `--bg` / `--surface` | `#f7f6f2` / `#fbfaf7` | `#17181a` / `#1e2023` | fundo de página / superfície de card |
| `--text` / `--text-muted` / `--text-faint` | `#14161c` / `#5c5f57` / `#8b8e85` | `#ece9e2` / `#a9ac9f` / `#75786d` | tinta grafite, 3 pesos |
| `--accent` / `--accent-strong` | `#b8322a` / `#8f231d` | `#c4402f` / `#d1523f` | **selo de validação** — ação primária em todo o app (botões, links, foco, masthead) |
| `--class-accent` | `#2f5f8f` | `#6ea3d1` | tinta técnica azul — Diagrama de Classes (TASK-033): card selecionado, header do card, dot/linha selecionada da sidebar, conector, chip de relação, seletor de tipo UML |
| `--class-soft` / `--class-soft-border` | `#e2ebf3` / `#a9c2d9` | `#223140` / `#3d5a78` | tons companheiros de `--class-accent` (fundo suave / borda em hover) |
| `--object-accent` / `--object-soft` | `#2f8f5f` / `#e2f2e9` | `#4fbf8f` / `#16332a` | tinta QC verde — Diagrama de Objetos (TASK-034): card selecionado, header do card, dot/linha selecionada da sidebar, conector, valores de atributo |
| `--danger` | `#af2d55` | `#e8688a` | destrutivo — deliberadamente numa família de matiz diferente do selo (magenta vs. vermelhão-alaranjado) |
| `--border` / `--border-soft` | `#d8d3c3` / `#e7e3d6` | `#3a3d38` / `#2e302c` | régua/traço técnico |

Contraste verificado (WCAG AA): texto branco sobre `--accent` ≥ 4.5:1 nos dois temas (o tom escuro foi ajustado de um vermelhão mais claro/pastel para este valor mais saturado especificamente por causa desse piso). `--text-muted` sobre `--bg` ≥ 6:1 nos dois temas.

**Regra de papel de cor (TASK-033)**: `--accent` (selo) é a cor de *ação* — botões primários, links, foco, masthead — em todo o app, mesmo dentro de uma tela de diagrama. `--class-accent`/`--object-accent` são cor de *identidade estrutural* — só nos elementos que representam o próprio diagrama (card, conector, dot da sidebar, seletor de tipo), nunca em botões de ação genéricos. As duas nunca se misturam num mesmo elemento.

## Tipografia

**IBM Plex Sans** (500/600/700) para UI — substitui Manrope (ADR-002). **IBM Plex Mono** (400/500/600, classe `.mono`) para todo dado técnico/tabular: nomes de atributos, IDs, contadores — mantido do ADR-002, agora com `font-variant-numeric: tabular-nums` para alinhamento de coluna em dados numéricos.

## Geometria

Cantos quase retos em toda a fundação — `3px` em controles (botão, input, badge), `4px` em contêineres (card, linha de lista, formulário inline). Reduzido deliberadamente da geometria mais arredondada do artefato-protótipo (`0.5rem`–`0.9rem`, badges em pílula `999px`): um laudo técnico não tem cantos de bolha de SaaS. Badges de entidade (`--entity-badge`) são retângulos com texto maiúsculo rastreado (`letter-spacing: 0.04em`), lidos como etiqueta de classificação carimbada, não pílula decorativa.

## Motivo de assinatura — o masthead

Uma única régua dupla (cinza + tinta do selo, 2px) sob o `.app-header` (nav/login) e sob o `.diagram-shell-topbar` (as 3 telas de diagrama, TASK-035 estendeu de `.app-header`), mais uma régua de 3px na mesma tinta no topo do card de login — o "cabeçalho travado" de um laudo. **Deliberadamente usado uma única vez por página** (o masthead da própria página, não repetido card a card) — nunca vira um `border-left`/`border-right` decorativo em list items ou callouts (banido pelo craft floor). Não estender esse motivo para dentro de cada card/linha.

## Implantação de uma vez (raise da Folha Miura-Ori)

Na Visão do Sistema, selecionar uma entidade sempre mostra os 3 blocos (Campos/Métodos de API/Regras de Permissão) juntos — nunca parcial (RN-02 do produto). TASK-035 reforçou isso visualmente: `EntityDetail` remonta por `key={entity.id}` a cada troca de entidade, disparando a animação `ov-detail-in` (fade + rise de 6px, 0.18s ease-out) no cabeçalho e nas 3 seções **com a mesma duração e sem atraso entre elas** — lido como um único movimento mecânico, nunca uma revelação em cascata item a item. Guardado por `prefers-reduced-motion`.

## O selo (marca)

`.brand-mark` é um círculo (não mais o quadrado arredondado do ADR-002) com gradiente cônico nas 3 tintas do sistema (selo → azul técnico → verde QC) e um anel de relevo (`box-shadow` de 2 camadas, não sombra difusa) — lido como um carimbo de certificação, cada tinta representando uma das 3 visualizações do produto.

## Ícones

Desenhados em SVG inline, traço único (`stroke-width: 1.5–1.6`), nunca emoji/glifo unicode — módulo compartilhado `src/features/diagram-shell/Icons.tsx` (`LinkGlyph`/`FitToScreenGlyph`/`CheckGlyph`), usado pelas 3 telas de diagrama e pelos modais. Corrigidos: `ThemeToggle` (sol/lua, TASK-032, usava `☀️`/`🌙`); Diagrama de Classes e de Objetos (TASK-033/034, usavam `🔗`/`⤢`); botão de copiar do export ganhou `CheckGlyph` no sucesso (TASK-036). **Pendente de auditoria**: nenhuma varredura sistemática confirmou que não sobra emoji/glifo em nenhum outro canto do app — só os pontos encontrados ao tocar cada arquivo foram corrigidos.

## Papéis lado a lado (raise do Painel Catódico)

Em `AccessManagementModal`, o seletor de papel (visualizador/editor, admin/member) nunca é um `<select>` — é `RolePicker` (`src/features/navigation/RolePicker.tsx`): as 2 opções sempre visíveis lado a lado, a concedida "carimbada" (`--accent` sólido, texto em `--accent-contrast`), a outra como marca fantasma (contorno fraco, `--text-faint`). Usado nos 3 lugares onde um papel aparece: linha de membro existente, formulário "já tem conta" e formulário "criar conta nova".

## O que herda a direção automaticamente (cascata de tokens)

Todas as superfícies do app já consomem os tokens da direção — não há mais nenhuma tela usando geometria/composição do artefato-protótipo (ADR-002). ADR-011 está implementado de ponta a ponta (TASK-032 a TASK-036).

## Gaps conhecidos (não implementados, decisão pendente do usuário)

- **Metadados de autor por diagrama**: `PRODUCT.md`/`docs/product/` registram "última atualização + autor" como funcionalidade de colaboração do produto, mas o schema (`diagrams`) só tem `updated_at` — não há coluna de autor. Mostrar isso no cabeçalho de qualquer tela exige uma migration (decisão do papel `supabase-multitenant`), fora do escopo de uma task de redesign visual.
- **"Última atualização" no cabeçalho**: o dado (`updated_at`) existe, mas nenhuma das 3 telas de diagrama mostra isso hoje — adicionar seria funcionalidade nova, não restilização, e idealmente entra nas 3 telas de uma vez (não só numa).
- **TASK-036 sem validação em produção real** — só harness de preview sintético (ver `TASK-036`, "Divergências"). Recomendado confirmar visualmente (`Organizações`/`Projetos` → "Gerenciar acesso") na próxima sessão.

## Fontes

- `.agents/decisions/ADR-011-redesign-laudo-certificado-ensaio.md` — decisão completa, alternativas, raises incorporados.
- `.agents/tasks/active/TASK-032-fundacao-redesign-laudo-certificado.md` — registro de execução da fundação.
- `.agents/tasks/active/TASK-033-canvas-avancado-diagrama-classes-laudo.md` — registro de execução do Diagrama de Classes.
- `.agents/tasks/active/TASK-034-canvas-avancado-diagrama-objetos-laudo.md` — registro de execução do Diagrama de Objetos.
- `.agents/tasks/active/TASK-035-visao-sistema-laudo.md` — registro de execução da Visão do Sistema.
- `.agents/tasks/active/TASK-036-modais-laudo.md` — registro de execução dos modais.
- `index.html` — contrato de direção (comentário `impeccable-direction`), seed key `54ce3b5a`.
