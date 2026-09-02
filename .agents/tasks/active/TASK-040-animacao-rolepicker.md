---
id: TASK-040
title: Transição do carimbo ao trocar de papel no RolePicker
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [navigation]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-040 — Transição do carimbo ao trocar de papel no RolePicker

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Feedback".

`RolePicker` (`src/features/navigation/RolePicker.tsx`, TASK-036/ADR-011, raise "Painel Catódico") mostra os 2 papéis de acesso sempre lado a lado — o concedido "carimbado" (`--accent` sólido, `.role-picker-opt.active`), o outro como marca fantasma (contorno fraco). Hoje a troca entre os dois é seca (a classe `active` muda, sem transição).

## Problema

Trocar de papel no `RolePicker` não comunica "o carimbo passou de uma opção para a outra" — só troca de estado instantaneamente, o que é inconsistente com a metáfora de carimbo já estabelecida no resto da direção.

## Objetivo

Ao trocar `value` no `RolePicker`, o preenchimento sólido (`--accent`) desliza/faz fade de uma opção para a outra em ~200ms, `cubic-bezier(0.16, 1, 0.3, 1)` — nunca um corte seco, nunca as duas opções carimbadas ao mesmo tempo.

## Fora de escopo

- Mudar a estrutura/acessibilidade do `RolePicker` (`role="radiogroup"`, `role="radio"`, `aria-checked`) — só a transição visual do preenchimento.
- Outros seletores de opção do app (`EdgeTypeGrid`, `ClassColorGrid`) — só `RolePicker` nesta task, mesmo que usem padrão visual parecido.

## Comportamento atual

`className={opt.value === value ? 'role-picker-opt active' : 'role-picker-opt'}` — troca de classe sem transição declarada em `src/index.css`.

## Comportamento esperado

- `.role-picker-opt` ganha `transition: background-color 200ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms cubic-bezier(0.16, 1, 0.3, 1)` (ou equivalente, cobrindo as propriedades que mudam entre fantasma e carimbado).
- Nunca animar `width`/`padding`/posição (evita reflow) — só cor/preenchimento.
- Bloco de `prefers-reduced-motion: reduce` próprio, reduzindo para transição instantânea (mantendo a troca de estado, só sem a animação).

## Regras de negócio

- RN-01: a transição nunca deve fazer os 2 botões parecerem "carimbados" simultaneamente durante o meio do movimento — a troca é de preenchimento (cor), não de opacidade cruzada entre os dois elementos.

## Critérios de aceitação

- [ ] CA-01: ao clicar na opção não-selecionada, o preenchimento transiciona suavemente em ~200ms, nos 3 usos do componente (`AccessManagementModal`: linha de membro existente, formulário "já tem conta", formulário "criar conta nova"). CSS implementado corretamente por leitura de código — os 3 usos (`AccessManagementModal.tsx:197,264,316`) renderizam o mesmo `RolePicker`/`.role-picker-opt`, a transição declarada em `src/index.css` vale para os 3 sem lógica por instância — mas **não confirmado visualmente em navegador** nesta sessão (bloqueio de ambiente, ver "Divergências"), então não marco como verificado.
- [ ] CA-02: nos dois temas (claro/escuro), a transição de cor permanece legível durante o movimento (sem estado intermediário de baixo contraste). Por leitura de código, a transição interpola só entre os 2 pares de valores finais já usados (fantasma: `--border`/transparente/`--text-faint`; carimbado: `--accent`/`--accent`/`--accent-contrast`), sem introduzir cor intermediária fora da paleta claro/escuro já validada (ADR-011/TASK-032) — mas, pela mesma razão do CA-01, **não confirmado visualmente**, então não marco como verificado.
- [x] CA-03: `prefers-reduced-motion: reduce` remove a transição, mantendo a troca de estado correta. Bloco `@media (prefers-reduced-motion: reduce) { .role-picker-opt { transition: none; } }` local (não o bloco global do arquivo) — a troca de classe `active` continua funcionando (é lógica do componente, não da transição), só a interpolação visual é removida.
- [x] CA-04: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados. Ver "Validação" abaixo.

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/navigation/RolePicker.tsx` (se precisar de ajuste de estrutura para a transição funcionar), `src/index.css` (`.role-picker-opt`/`.role-picker-opt.active`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [x] Trabalhar em worktree git isolado, branch `task/040-animacao-rolepicker` criada a partir de `feature/animacoes-sistema`.
- [x] Ajustar `.role-picker-opt` em `src/index.css` com as transições especificadas + bloco de reduced-motion próprio.
- [ ] Validar visualmente nos 3 pontos de uso (`AccessManagementModal`), nos dois temas — **bloqueado** (ver "Divergências"/"Pendências").
- [x] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [x] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [x] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [x] Unitários: existente (`RolePicker` coberto indiretamente via `AccessManagementModal.test.tsx`) não quebrou — suíte de `src/features/navigation/` (37 testes) passando integralmente.
- [ ] Manual: navegador embutido, dark/light, `prefers-reduced-motion` ligado e desligado, nos 3 pontos de uso do componente — **não realizado** (ver "Divergências").

## Riscos e rollback

Risco mínimo — mudança isolada a 1 componente + 1 regra CSS, sem mudança de comportamento/acessibilidade. Rollback: reverter `.role-picker-opt` em `index.css`.

## Registro de execução

### Alterações realizadas

`src/index.css` (`.role-picker-opt`): adicionada `transition` declarando `background-color`, `color` e `border-color` em 200ms `cubic-bezier(0.16, 1, 0.3, 1)` — exatamente as 3 propriedades que mudam entre o estado fantasma (`.role-picker-opt`) e carimbado (`.role-picker-opt.active`); nenhuma propriedade de layout (`width`/`padding`/posição) entra na transição, conforme pedido (RN "nunca animar... evita reflow"). Bloco `@media (prefers-reduced-motion: reduce)` próprio e local, logo depois de `.role-picker-opt:disabled`, zerando só essa `transition` — não tocou o bloco global de reduced-motion já existente no fim do arquivo (`.toast`/`.ov-detail`), seguindo o mapeamento de overlap combinado para toda a rodada TASK-038..045 ("cada task no seu próprio bloco @media local").

Nenhuma mudança em `RolePicker.tsx`: a transição funciona só trocando a classe `active` no mesmo elemento (`<button>`), sem precisar de estrutura nova, cross-fade entre dois elementos, ou lógica de estado adicional — o que também garante RN-01 por construção (é impossível os dois botões parecerem carimbados ao mesmo tempo, já que cada um só anima suas próprias propriedades de cor, nunca opacidade cruzada).

### Arquivos principais

- `src/index.css` — única alteração de código (`.role-picker-opt` + bloco de reduced-motion local).

### Decisões

- Não alterei `RolePicker.tsx`: a task previa "se precisar de ajuste de estrutura" — não precisou, a transição CSS pura no mesmo elemento já cobre o comportamento pedido e simplifica a implementação (menos superfície de mudança, sem risco à acessibilidade já estabelecida em `role="radiogroup"`/`role="radio"`/`aria-checked`, que ficaram intocados, conforme "Fora de escopo").
- Reduced-motion em bloco `@media` próprio e local (não no bloco global já existente no arquivo) — decisão já tomada no planejamento da rodada inteira (`.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), replicada aqui sem desvio.

### Divergências

1. **Validação visual ao vivo bloqueada por ambiente**: tentei montar um harness de preview temporário em `src/main.tsx` (renderizando só `RolePicker` isolado, padrão já usado em TASK-033/036/037) para confirmar a transição nos dois temas e com `prefers-reduced-motion` ligado/desligado. `preview_start` (harness de navegador desta sessão) recusou iniciar em qualquer porta — inclusive numa porta alternativa (5182) com `autoPort: true` e sem flag de porta fixa no comando, exatamente o remédio que a própria ferramenta sugeriu — sempre com o erro "Port 5173 is in use by another chat's dev server", indicando que outra sessão de chat está com um servidor de dev rodando nesta mesma pasta de worktree neste exato momento. Não é uma falta de credencial (como nas tasks anteriores) — é um conflito de infraestrutura de preview entre sessões concorrentes na mesma pasta, fora do meu controle. Revertido o harness (`main.tsx` voltou ao original) e o `.claude/launch.json` (voltou ao original, só uma alteração de fim-de-linha CRLF/LF descartada via `git checkout`) antes do commit. CA-01/CA-02 não marcados como verificados por causa disso — só a correção do CSS foi confirmada por leitura de código (propriedades corretas, valores corretos, sem introduzir cor fora da paleta).
2. **2 testes pré-existentes falhando, fora do escopo desta task**: `src/features/import-export/agentPrompt.test.ts` tem 1 teste (`'não sobra frontmatter YAML da skill importada'`) falhando de forma consistente (`markdown` ainda contém `'name: gerar-diagrama-classmap'`) — confirmado que a falha já existe na baseline (`feature/animacoes-sistema`/`main`, commit `6a7b5d8`) antes de qualquer mudança minha, via `git stash` + reexecução do teste isolado. É um bug real da TASK-037 (extração do frontmatter YAML do `SKILL.md` importado via `?raw`), não relacionado a `RolePicker`/animação. Não corrigi, conforme instrução de não expandir escopo — sinalizando para o dono da TASK-037/`contrato-ia-diagrama` avaliar.
3. **1 achado do `detect.mjs`, pré-existente e fora do arquivo tocado por esta task**: ver "Validação" abaixo — `border-accent-on-rounded` em `.card` (linha 217), decisão deliberada de ADR-011/TASK-032 (régua do selo no topo do card de login), não em `.role-picker-opt`. Não é um achado novo desta task.

### Pendências

- Confirmar visualmente (dark/light, `prefers-reduced-motion` ligado/desligado, nos 3 pontos de uso em `AccessManagementModal`) numa sessão com harness de preview disponível ou acesso a produção real — recomendado ao usuário como próximo passo antes de considerar CA-01/CA-02 fechados.

## Validação

- `npm install` — ok (worktree novo, 130 pacotes).
- `npm run build` — limpo (`tsc -b && vite build`, sem erros de tipo, bundle gerado).
- `npm run lint` — limpo (`oxlint`); só os 3 avisos pré-existentes de sempre (`AuthContext.tsx` x2, `Toast.tsx`), nenhum novo, nenhum em `index.css`.
- `npx vitest run --exclude "**/.claude/worktrees/**"` — 197 de 198 testes passando; a 1 falha (`agentPrompt.test.ts`) é pré-existente e fora de escopo (ver "Divergências", item 2), confirmada via `git stash` contra a baseline sem minha mudança. Testes de `src/features/navigation/` (onde `RolePicker`/`AccessManagementModal` vivem) rodados isoladamente: 37/37 passando, sem nenhuma assertion quebrada pela mudança de CSS.
- `node <caminho-global>/.claude/skills/impeccable/scripts/detect.mjs --json src/index.css` — o script não existe em `.claude/skills/impeccable/scripts/` deste repositório (só existe a skill `gerar-diagrama-classmap` no `.claude/skills/` do projeto); localizado em `~/.claude/skills/impeccable/scripts/detect.mjs` (instalação global da skill `impeccable` do usuário) e executado de lá. 1 achado: `border-accent-on-rounded` em `.card` (`src/index.css:217`, `border-top: 3px solid var(--accent)` + `border-radius: 4px`) — pré-existente desde TASK-032/ADR-011 (a "régua do selo" do card de login, decisão deliberada de produto), não em `.role-picker-opt` nem introduzido por esta task.
- Validação visual manual: **não realizada** nesta sessão — ver "Divergências", item 1 (bloqueio de infraestrutura de preview, não falta de credencial).

## Handoff

Nenhum handoff formal — task completa do ponto de vista de código/build/lint/test, mas com uma pendência explícita de validação visual (ver "Pendências"), recomendada para a próxima sessão com harness de preview disponível.
