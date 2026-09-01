---
id: TASK-032
title: Fundação do redesign "Certificado de Ensaio" — tokens, navegação e login/acesso
status: active
type: refactor
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [design-system, navigation, auth, theme]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-032 — Fundação do redesign "Certificado de Ensaio"

## Contexto

Primeira task de ADR-011. O usuário pediu um redesign do sistema inteiro, classificando o visual vigente (indigo `#4a4fe0`, Manrope, cards brancos — extraído do artefato-protótipo em ADR-002/TASK-006) como genérico ("parece IA"). Conduzido via `/impeccable`, a direção escolhida foi "Certificado de Ensaio": cada tela lê como um laudo técnico certificado, não um dashboard SaaS.

## Problema

Os tokens de design e os componentes de navegação/login vigentes carregam a identidade antiga (ADR-002) — trocar só a paleta sem revisitar a geometria (cantos muito arredondados, badges em pílula, sombra flutuante de SaaS) deixaria a nova cor "vestida" na composição antiga, sem cumprir o pedido de redesign.

## Objetivo

Ter, em `src/index.css`/`index.html`, os tokens completos da nova direção (papel/tinta/selo/azul-técnico/verde-QC, dark e light) e, nos componentes de navegação e login/acesso, a geometria/composição da nova direção (cantos quase retos, masthead de laudo, selo circular) — sem tocar ainda a composição específica das 3 telas de diagrama (isso é TASK-033/034/035) nem dos modais (TASK-036).

## Fora de escopo

- Composição/geometria do `DiagramShell` e dos cards de classe/objeto — TASK-033/034 (a cor já muda via cascata de tokens, a geometria não).
- Composição da Visão do Sistema — TASK-035.
- Modais (import/export, gestão de acesso) — TASK-036 (cor já muda via cascata, geometria não).
- Qualquer mudança de dado/lógica — task é 100% design system/CSS/componentes de apresentação.

## Comportamento atual

`src/index.css` tinha os tokens do artefato-protótipo (ADR-002), Manrope como fonte de UI, cantos arredondados (`0.5rem`–`0.9rem`), badges em pílula, `ThemeToggle` usando emoji (`☀️`/`🌙`) como ícone.

## Comportamento esperado

- Tokens novos (ver ADR-011 e `DESIGN.md` para a tabela completa) em `:root`, no bloco `@media (prefers-color-scheme: dark)` e em `:root[data-theme='dark']` — mesmo padrão de 3 blocos já usado desde TASK-006/ADR-007.
- Fonte de UI: IBM Plex Sans (substitui Manrope); IBM Plex Mono mantido para dado técnico/tabular, com `font-variant-numeric: tabular-nums` adicionado.
- `.brand-mark`/`.card h1::before`: círculo com gradiente cônico nas 3 tintas do sistema (selo → azul técnico → verde QC) e anel de relevo, no lugar do quadrado arredondado com gradiente 2 tons.
- `.app-header`: masthead com régua dupla (cinza + selo, via `::after`).
- `.card` (login): régua do selo no topo (`border-top: 3px solid var(--accent)`), canto quase reto (4px), sombra rasa (`var(--shadow)`) no lugar do halo flutuante.
- Geometria mais crua em toda a navegação: `.entity-link`/`.empty-state`/`.inline-create-form`/`.list li` de `0.75rem`+ para `4px`; `.btn`/`button.primary`/inputs de `0.5rem`–`8px` para `3px`; `.entity-badge`/`.badge` de pílula (`999px`) para retângulo (`3px`).
- `.entity-link:hover`: removido o "lift" (`translateY`) e o glow colorido — vira mudança de borda/fundo só, mais "linha de ledger" que "card de SaaS flutuante".
- `ThemeToggle`: ícones SVG desenhados (sol/lua, traço único) no lugar de emoji.
- `::selection` e `:focus-visible` globais usando a tinta do selo (antes, cor padrão do navegador).
- Contraste WCAG AA verificado e ajustado: `--accent` escuro recalibrado de `#cf4a3a`/`#e2604f` para `#c4402f`/`#d1523f` (texto branco sobre o selo passava perto de 4.1:1 antes do ajuste, agora ~5:1).
- Direção registrada como comentário HTML (`impeccable-direction`) no primeiro filho de `<body>` em `index.html`.

## Regras de negócio

Nenhuma nova — task de design system/apresentação, sem lógica de dados.

## Critérios de aceitação

- [x] CA-01: `npm run build`/`npm run lint`/`npx vitest run --exclude "**/.claude/worktrees/**"` limpos (nenhum teste depende de radius/cor específicos).
- [x] CA-02: Login renderiza corretamente nos dois temas (dark/light) e em viewport mobile (375×812), verificado no navegador embutido contra o dev server local.
- [x] CA-03: Contraste texto-sobre-selo ≥ 4.5:1 nos dois temas (calculado manualmente e verificado visualmente).
- [x] CA-04: `node .claude/skills/impeccable/scripts/detect.mjs --json` rodado sobre os arquivos alterados — 1 achado (`border-accent-on-rounded` em `.card`), revisado e descartado como falso positivo (detector em modo degradado, sem CSS parser real, não mede o valor de `border-radius`; a régua de 4px do card não gera clash visual, confirmado por captura de tela).
- [x] CA-05: **Atualização (durante TASK-033)** — o navegador desta sessão já estava autenticado (achado ao tentar navegar para validar TASK-033, não presumido aqui). Confirmado ao vivo: `Organizações → Essencis Labs → Projetos (ELIMS/GeocloudAI) → Diagramas`, sem erro de console, tokens/geometria/masthead conferindo com o esperado.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/index.css` (tokens + geometria de navegação/login/masthead), `index.html` (fontes + comentário de direção), `src/features/navigation/AppLayout.tsx` (nenhuma mudança de código, só CSS), `src/features/auth/LoginPage.tsx` (nenhuma mudança de código, só CSS), `src/features/theme/ThemeToggle.tsx` (emoji → SVG).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [x] Rodar a rodada de decisão visual (`/impeccable`, `concept-seed.mjs --scope direction --mode operate`) e registrar a escolha em ADR-011.
- [x] Substituir os tokens de `src/index.css` (3 blocos: `:root`, media query dark, `[data-theme='dark']`).
- [x] Trocar fonte de UI em `index.html` (Manrope → IBM Plex Sans).
- [x] Revisitar geometria de `.app-header`/`.brand-mark`/`.card`/navegação (entity-list, badges, formulário inline, botões).
- [x] Corrigir `ThemeToggle` (emoji → SVG).
- [x] Adicionar `::selection`/`:focus-visible` globais.
- [x] Verificar contraste e recalibrar `--accent` escuro.
- [x] Registrar contrato de direção em `index.html`.
- [x] Validar visualmente (dark/light, desktop/mobile) contra o dev server local.
- [x] Rodar `detect.mjs` e revisar achados.
- [x] Escrever `DESIGN.md` (parcial, ver seção "Pendências").

## Estratégia de testes

- [x] Unitários/Integração: suíte existente (`npx vitest run`) — nenhum teste novo (task é CSS/tokens, sem lógica nova; a suíte existente não asserta cor/raio).
- [x] Manual: navegador embutido, dev server local, dark/light/mobile (ver "Registro de execução").
- [x] E2E/produção: confirmado ao vivo durante a TASK-033 (ver CA-05 acima) — navegação real, sem erro de console.

## Riscos e rollback

Baixo risco técnico — mudança é quase inteiramente CSS (custom properties + seletores existentes), sem mudança de estrutura de componente além do `ThemeToggle` (emoji→SVG, comportamento idêntico). Rollback trivial: reverter `src/index.css`/`index.html`/`ThemeToggle.tsx`. Risco de produto (não técnico): o próprio ADR-011 nomeia o risco de a leitura "laudo/certificado" virar padrão de categoria óbvio para o domínio (Elims já é um LIMS) — mitigado nesta task por tratar o selo/masthead com rigor (régua funcional, não decoração fractal).

## Registro de execução

### Alterações realizadas
- Tokens completos substituídos em `src/index.css` (`:root`, media query dark, `[data-theme='dark']`) — ver tabela em `DESIGN.md`.
- `index.html`: `<link>` de fontes trocado (Manrope→IBM Plex Sans, IBM Plex Mono mantido); comentário de direção (`impeccable-direction`, THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM/FINISH) adicionado como primeiro filho de `<body>`.
- `.app-header`/`.brand-mark`/`.card`/`.card h1::before`: masthead + selo circular com gradiente cônico 3 tintas.
- Geometria de `.entity-link`/`.entity-badge`/`.badge`/`.empty-state`/`.inline-create-form`/`.list li`/`.btn`/`button.primary`/inputs/`.theme-toggle`: raios reduzidos para 3-4px (de 0.375rem–0.9rem/999px).
- `.entity-link:hover`: removido lift+glow, hover vira só borda/fundo.
- `ThemeToggle.tsx`: `SunIcon`/`MoonIcon` SVG inline (traço único, `currentColor`) no lugar de `☀️`/`🌙`.
- `::selection`/`:focus-visible` globais adicionados a `src/index.css`.
- `--accent` escuro recalibrado (`#cf4a3a`→`#c4402f`, `#e2604f`→`#d1523f`) após checagem de contraste.
- `DESIGN.md` criado (parcial — ver seção "Pendências").
- `PRODUCT.md` criado nesta mesma sessão, antes do redesign (`/impeccable init`) — não fazia parte do escopo desta task, mas é pré-requisito do fluxo.

### Arquivos principais
- [src/index.css](../../../src/index.css)
- [index.html](../../../index.html)
- [src/features/theme/ThemeToggle.tsx](../../../src/features/theme/ThemeToggle.tsx)
- [DESIGN.md](../../../DESIGN.md)
- [.agents/decisions/ADR-011-redesign-laudo-certificado-ensaio.md](../../decisions/ADR-011-redesign-laudo-certificado-ensaio.md)

### Decisões
- **Escopo fatiado como ADR-002** (fundação primeiro, 4 superfícies depois) — mesmo raciocínio já usado e validado nesta base de código: uma entrega "tudo de uma vez" arrisca ficar "parecida mas incompleta" em alguma superfície.
- **`--class-accent` introduzido mas não consumido ainda** — declarado no token set desta task porque é parte do sistema de cor documentado em ADR-011, mas seu primeiro uso real é TASK-033 (Diagrama de Classes). Mesmo padrão do próprio `--object-accent` original (declarado em TASK-006, consumido a partir de TASK-008).
- **Revisão de finalização rodada em thread, não por subagente dedicado** — este harness não tem o agente `impeccable-finish-reviewer` cadastrado; a revisão seguiu `reference/degraded/finish-reviewer.md` (fresh eyes, os 6 checks, disposition `ship` para o escopo desta task), disclosure feita ao usuário na resposta desta sessão.
- **Sem geração de imagem nesta sessão** (harness sem ferramenta de imagem) — a rodada de decisão visual (`serve-question.mjs`) rodou 100% texto (paleta em chips, sem comp/mockup renderizado); `buildPath` ficou `code` sem alternativa.

### Divergências
Nenhuma dos critérios de aceitação originais. CA-05 (validação em produção), inicialmente registrada como pendente por presumir ausência de credencial, foi confirmada durante a TASK-033 (mesma sessão) — o navegador já estava autenticado; a suposição inicial de "sem login disponível" era imprecisa, corrigida assim que verificada.

### Pendências
- TASK-034/035/036 (ver ADR-011) — Diagrama de Objetos, Visão do Sistema e modais ainda usam a geometria do ADR-002 por baixo dos tokens novos (TASK-033, Diagrama de Classes, já concluída).
- Auditoria de emoji-como-ícone no restante do app (só `ThemeToggle` foi corrigido nesta task; se houver outros, cai no escopo de TASK-033+ quando tocarem o respectivo arquivo).

## Validação
```bash
npm run build   # tsc -b && vite build — OK, sem erros
npm run lint    # oxlint — sem erros novos (3 warnings pré-existentes, arquivos não tocados por esta task)
npx vitest run --exclude "**/.claude/worktrees/**"   # 27 arquivos, 192 testes passando
node .claude/skills/impeccable/scripts/detect.mjs --json index.html src/index.css src/features/navigation/AppLayout.tsx src/features/auth/LoginPage.tsx src/features/theme/ThemeToggle.tsx
# 1 achado (border-accent-on-rounded, .card:214) — revisado, falso positivo do modo degradado do detector (sem CSS parser real).
```
Validação visual: navegador embutido, dev server local (`npm run dev`), telas de login em dark/light (emulados via `prefers-color-scheme`) e mobile (375×812) — masthead, selo, régua do card, contraste dos campos/botão conferidos. Contraste texto-branco-sobre-selo calculado manualmente (WCAG relative luminance): ~6.4:1 (claro), ~5.1:1 (escuro, após recalibração).

## Handoff
Nenhum handoff pendente — task implementada nesta sessão. ADR-011 completo (TASK-032 a TASK-036, todas implementadas na mesma sessão) — ver `.agents/tasks/active/TASK-033-canvas-avancado-diagrama-classes-laudo.md` e seguintes.
