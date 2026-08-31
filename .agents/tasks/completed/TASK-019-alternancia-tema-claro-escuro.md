---
id: TASK-019
title: Alternância manual de tema claro/escuro, persistida por navegador
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [navigation, diagram-shell, class-diagram, object-diagram, system-view]
related_use_cases: []
related_adrs: [ADR-007]
---

# TASK-019 — Alternância manual de tema claro/escuro

## Contexto
Pedido do usuário (2026-08-31): dar ao usuário final a opção de escolher entre tema claro e escuro. O design system do ClassMap já tem os dois conjuntos completos de tokens desde o ADR-002/TASK-006 (`src/index.css`) — hoje o tema segue só `prefers-color-scheme` (o do sistema operacional), e já existe um hook `[data-theme='dark'|'light']` deixado de propósito no CSS para uma futura alternância manual (`src/index.css:11`), mas nenhum componente ou lógica de persistência o usa ainda. Decisão de arquitetura (onde persistir a preferência: local vs. sincronizada via Supabase) registrada em `ADR-007` — optou-se por `localStorage`, sem sincronização entre dispositivos.

## Problema
O usuário final não tem nenhum controle visível para escolher o tema da aplicação — só o tema do sistema operacional é respeitado, e mesmo esse não pode ser sobreposto manualmente (o hook `[data-theme]` existe no CSS, mas nada no `src/` o define).

## Objetivo
Um controle de alternância de tema (claro/escuro), acessível em qualquer tela autenticada da aplicação, cuja escolha persiste entre reloads no mesmo navegador (via `localStorage`) e, na ausência de escolha explícita, continua respeitando `prefers-color-scheme` como hoje.

## Fora de escopo
- Sincronização da preferência entre dispositivos/navegadores (ver Alternativa C rejeitada em `ADR-007` — reavaliar só se pedido explicitamente no futuro).
- Qualquer opção de tema além de claro/escuro (ex.: temas customizados, alto contraste).
- Mudança de schema Postgres, RLS ou do contrato JSON de import/export — escopo 100% frontend/cliente.
- Tela de login (`LoginPage`) — pode ficar de fora do escopo inicial se não tiver um cabeçalho compatível; decidir na implementação e registrar se ficou fora.

## Comportamento atual
`src/index.css` aplica `--bg`/`--text`/etc. via `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) {...} }` e via `:root[data-theme='dark'] {...}`, mas nenhum código em `src/` lê ou escreve `data-theme` em `document.documentElement` — o segundo bloco está morto até esta task. Não existe `localStorage` nem componente de toggle em nenhuma feature.

## Comportamento esperado
- Um componente `ThemeToggle` (ícone sol/lua ou switch, dois estados) visível em:
  - `AppLayout` (`.app-header`, ao lado do botão "Sair") — cobre Organizações/Projetos/Diagramas.
  - `DiagramShell` (`.diagram-shell-topbar`, junto às `topbarActions`) — cobre Diagrama de Classes e Diagrama de Objetos, que já compartilham este shell (TASK-006/007/008).
  - A topbar própria do `SystemViewPage` (não usa `DiagramShell`, ver TASK-009).
- Alternar o controle: atualiza `document.documentElement.dataset.theme` (`'light'` ou `'dark'`) imediatamente, e grava a escolha em `localStorage` (chave sugerida: `classmap-theme`).
- Ao carregar a aplicação: se houver uma preferência salva em `localStorage`, aplicá-la antes do primeiro paint relevante (evitar flash de tema errado — ex. leitura síncrona em `main.tsx` antes de `createRoot`, ou script inline em `index.html`). Sem preferência salva, não define `data-theme` — mantém o comportamento atual de seguir `prefers-color-scheme`.

## Regras de negócio
- RN-01: Preferência de tema é armazenada só em `localStorage`, nunca no Supabase (ver `ADR-007`) — não criar coluna nova em `profiles` nem chamada de rede para isso.
- RN-02: Sem preferência explícita salva, a aplicação segue `prefers-color-scheme` do sistema operacional (comportamento atual não pode regredir).

## Critérios de aceitação
- [x] CA-01: Alternar o controle de tema muda visivelmente as cores da tela atual (tokens de `src/index.css` respondendo a `data-theme`). Coberto por teste automatizado (`ThemeToggle.test.tsx`) e confirmado visualmente ao vivo (ver "Validação") — o botão ☀️/🌙 aparece corretamente na topbar de `AppLayout`.
- [x] CA-02: Recarregar a página após escolher um tema mantém a escolha (persistida em `localStorage`), sem flash perceptível do tema anterior/errado antes da hidratação. Coberto por teste automatizado (`theme.test.ts`, `applyStoredThemeOnBoot`).
- [x] CA-03: Sem nenhuma escolha prévia salva, o tema exibido é o do sistema operacional (`prefers-color-scheme`), idêntico ao comportamento antes desta task. Coberto por teste automatizado (`useTheme`, "CA-03").
- [x] CA-04: O controle está presente e funcional nas 3 superfícies de topbar da aplicação autenticada: navegação (`AppLayout`), telas de Diagrama de Classes/Objetos (`DiagramShell`) e Visão do Sistema (`SystemViewPage`). Confirmado ao vivo nas 3, contra dados reais (ver "Validação").
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos. Ver "Validação".

## Impacto técnico
### Backend
Não aplicável.
### Frontend
Novo módulo `src/features/theme/` (hook `useTheme` + componente `ThemeToggle` + função de leitura/aplicação inicial); pontos de montagem em `src/features/navigation/AppLayout.tsx`, `src/features/diagram-shell/DiagramShell.tsx` e `src/features/system-view/SystemViewPage.tsx`; possível ajuste em `src/main.tsx` ou `index.html` para aplicar o tema salvo antes do primeiro paint.
### Banco de dados
Nenhuma mudança (decisão de `ADR-007`).
### Integrações
Nenhuma.
### Segurança
Nenhuma — preferência de UI sem dado sensível.

## Plano de implementação
- [x] Criar `src/features/theme/` com a lógica de leitura/escrita de `localStorage` + `useTheme()` (estado do tema efetivo + função de alternância que atualiza `document.documentElement.dataset.theme`).
- [x] Aplicar a preferência salva o mais cedo possível no boot (`main.tsx`, antes de `createRoot`), preservando o fallback para `prefers-color-scheme` quando não há preferência salva.
- [x] Criar o componente `ThemeToggle` (usando os tokens existentes, sem introduzir cores novas fora do design system).
- [x] Montar `ThemeToggle` em `AppLayout.tsx`, `DiagramShell.tsx` (slot fixo próprio, não via `topbarActions` — decisão registrada abaixo) e `SystemViewPage.tsx`.
- [x] Testes cobrindo CA-01..CA-04 (ver "Estratégia de testes").

## Estratégia de testes
- [x] Unitários: lógica de leitura/escrita de `localStorage` e o hook `useTheme` (tema salvo é aplicado; ausência de tema salvo não escreve `data-theme`).
- [x] Componente: `ThemeToggle` alterna `data-theme` ao clicar (`ThemeToggle.test.tsx`).
- [x] Manual: alternar o tema, confirmar persistência — feito ao vivo, completo, depois que o usuário logou de novo (a primeira tentativa foi interrompida por um erro do agente, não do código; ver "Registro de execução"). Confirmado nas 3 superfícies contra o projeto real ELIMS: `AppLayout` (Organizações), `DiagramShell` (Diagrama de Classes, com 5 classes reais), `SystemViewPage` (Visão do Sistema, módulos reais) — alternar muda as cores visivelmente (CA-01), recarregar mantém a escolha sem flash (CA-02, verificado com reload real da página).

## Riscos e rollback
Risco baixo — mudança de UI/preferência de cliente, sem tocar schema, RLS ou o contrato JSON público de import/export. Rollback: remover `src/features/theme/` e os pontos de montagem do `ThemeToggle`; o CSS de `src/index.css` permanece inofensivo (mesmo estado de antes da task, com o hook `[data-theme]` sem uso).

## Registro de execução
### Alterações realizadas
Novo módulo `src/features/theme/theme.ts`: `getStoredTheme`/`applyTheme`/`applyStoredThemeOnBoot` (funções puras, cada uma com try/catch em torno de `localStorage` — degrada para "sem preferência salva" em vez de quebrar, ex. modo privado restrito) e o hook `useTheme` (deriva o tema efetivo — a escolha salva, ou `prefers-color-scheme` na ausência de uma — sem `useEffect`, só `useState` porque a leitura inicial já reflete o que `applyStoredThemeOnBoot` aplicou no `<html>` antes do primeiro render). `ThemeToggle.tsx`: botão único (☀️/🌙 conforme o tema efetivo), reaproveitado sem mudança nos 3 pontos de montagem. `main.tsx` chama `applyStoredThemeOnBoot()` antes de `createRoot` (evita flash, CA-02). Montagem: `AppLayout.tsx` (dentro de um `.app-header-actions` novo, ao lado de "Sair" — precisou desse wrapper porque `.app-header` já usava `justify-content: space-between` com só 2 filhos diretos); `DiagramShell.tsx` (como irmão fixo depois de `.topbar-actions`, não via a prop `topbarActions` — cobre Diagrama de Classes/Objetos de uma vez, sem exigir que cada consumidor do shell se lembre de montá-lo); `SystemViewPage.tsx` (mesmo padrão, fora do bloco condicional `!readOnly` para continuar visível em modo `visualizador`). CSS novo: `.theme-toggle` (botão de ícone único, tokens existentes) e `.app-header-actions` (wrapper de layout).

Efeito colateral encontrado e corrigido: os testes de `theme.ts`/`ThemeToggle` quebravam com "Cannot read properties of undefined (reading 'clear')" ao referenciar `localStorage`/`window.localStorage` — Node 22+ registra um `globalThis.localStorage` experimental (atrás da flag `--localstorage-file`) que impede o jsdom do Vitest de instalar o dele. Corrigido com um polyfill simples em `src/test/setup.ts` (classe `MemoryStorage`, `Object.defineProperty(globalThis, 'localStorage', ...)`), aplicado uma vez para toda a suíte.

### Arquivos principais
- `src/features/theme/theme.ts` (novo) — lógica pura + `useTheme`.
- `src/features/theme/ThemeToggle.tsx` (novo) — componente.
- `src/features/theme/theme.test.ts`, `src/features/theme/ThemeToggle.test.tsx` (novos).
- `src/main.tsx` — `applyStoredThemeOnBoot()` antes de `createRoot`.
- `src/features/navigation/AppLayout.tsx`, `src/features/diagram-shell/DiagramShell.tsx`, `src/features/system-view/SystemViewPage.tsx` — montagem do `ThemeToggle`.
- `src/index.css` — `.theme-toggle`, `.app-header-actions`.
- `src/test/setup.ts` — polyfill de `localStorage` para a suíte inteira (corrige um problema de ambiente, não específico desta task, mas só apareceu por ela ser a primeira a usar `localStorage` em teste).

### Decisões
- `ThemeToggle` montado como elemento fixo em `DiagramShell`/`SystemViewPage` (não passado via `topbarActions` por quem consome o shell) — decisão já prevista no "Comportamento esperado" da task, mantida na implementação: garante as 3 superfícies sem depender de cada página lembrar de incluir o controle.
- `useTheme` sem `useEffect` — o estado local (`useState`) já nasce correto porque `applyStoredThemeOnBoot` roda antes de qualquer componente montar; um efeito seria redundante (e voltaria a esbarrar no lint `set-state-in-effect` sem necessidade real).
- Polyfill de `localStorage` em `src/test/setup.ts`, não escopado só a esta feature — é um problema de ambiente de teste (Node 22+ vs. Vitest/jsdom), não específico do tema; deixado no setup global para qualquer teste futuro que precise de `localStorage` não tropeçar no mesmo problema.
- Sem ADR novo — a decisão de arquitetura (persistência em `localStorage`) já estava em `ADR-007`, gerada no planejamento.

### Divergências
Nenhuma — implementação seguiu o "Comportamento esperado" da task e o plano de adoção do `ADR-007`. `LoginPage` ficou de fora do escopo, como a própria task já previa como opção ("Fora de escopo").

### Pendências
Nenhuma — o usuário logou de novo no dev server local e a verificação ao vivo foi concluída nas 3 superfícies (ver "Validação"). Na primeira tentativa, um clique do agente mirou errado (coordenada calculada a partir de uma screenshot em escala diferente da viewport real) e caiu em "Sair", derrubando a sessão — lição registrada em memória (`classmap-producao-acesso-teste`): depois de qualquer resize/navegação, preferir clicar por `ref` recém-obtido (`find`/`read_page`) em vez de coordenada calculada a partir de uma screenshot, cujo tamanho pode não bater 1:1 com a viewport real.

## Validação
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, mesmos 3 warnings pré-existentes em `Toast.tsx`/`AuthContext.tsx`, nenhum novo).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — ok, 26 arquivos / 176 testes passando (12 novos desta task).
- Verificação ao vivo completa (`npm run dev` local, usuário logado, dados reais do projeto ELIMS): alternar em `AppLayout` (Organizações) mudou a tela inteira para escuro (`document.documentElement.dataset.theme`/`localStorage` confirmados via JS, além do visual); reload da página manteve o tema sem flash (CA-02); `DiagramShell` (Diagrama de Classes, 5 classes reais) e `SystemViewPage` (Visão do Sistema) renderizaram corretamente em escuro, com o ícone 🌙 visível na topbar de ambos (CA-04).

## Handoff
Nenhum — todas as CAs fechadas com evidência automatizada e manual ao vivo nas 3 superfícies. Movida para `completed/` via `bootstrap-complete` (2026-08-31).
