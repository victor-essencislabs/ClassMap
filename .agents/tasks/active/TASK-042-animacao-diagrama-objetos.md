---
id: TASK-042
title: Diagrama de Objetos — seleção de card animada e destaque de herança na criação
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [object-diagram]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-042 — Diagrama de Objetos: seleção de card e destaque de herança

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Feedback + Estado" — equivalente objeto da TASK-041, mas com uma segunda ideia mais especulativa (destaque de herança).

**Atenção — overlap conhecido e aceito**: esta task toca `ObjectDiagramCanvas.tsx` (para rastrear qual objeto acabou de ser criado), no mesmo arquivo que a TASK-043 (assentamento do "ajustar à tela") também toca, em linhas diferentes. Mesclar esta task (042) antes da TASK-043 na branch `feature/animacoes-sistema`.

## Problema

1. A borda de seleção de um card de objeto (`.node-box.object.selected`, tinta `--object-accent`) aparece/some sem transição.
2. Quando um objeto é criado a partir de uma classe, ele herda os valores iniciais dos atributos por snapshot (RN-01 da TASK-004) — hoje esses valores aparecem no card (`ObjectCard.tsx`) sem nenhuma indicação visual de que vieram da classe, não foram digitados ali.

## Objetivo

- Card selecionado: mesma transição de borda da TASK-041 (~120ms), com `--object-accent`.
- Objeto recém-criado: destaque momentâneo (fundo `--object-soft` piscando uma vez, ~300ms) nos campos que vieram da herança, para comunicar a origem do dado.

## Fora de escopo

- O item de herança é a ideia mais especulativa desta rodada (levantamento original já sinalizava: "vale confirmar se esse é um problema real de compreensão antes de construir"). Implementar mesmo assim, mas deixar registrado no "Registro de execução" se, na prática, o efeito parecer ruído em vez de esclarecimento — decisão final de manter/reverter é do usuário, não do subagente.
- Links entre objetos (`ObjectLinkConnector.tsx`) — sem efeito de "nascendo" nesta rodada (ver TASK-041, "Fora de escopo", sobre Diagrama de Objetos).
- Diagrama de Classes — ver TASK-041.

## Comportamento atual

- `.node-box.object.selected` (aplicado em `ObjectCard.tsx`) muda de classe sem transição declarada.
- `ObjectCard.tsx` renderiza `obj.values` (nome + valor) sem diferenciar herdado de editado.

## Comportamento esperado

- `.node-box.object.selected`: mesma transição de borda da TASK-041 (~120ms), cor `--object-accent`.
- No momento da criação de um objeto (fluxo em `ObjectDiagramCanvas.tsx` que gera o snapshot inicial de atributos), marcar o objeto recém-criado (ex.: `useState<string | null>` com o id) e passar um prop `justCreated` para `ObjectCard.tsx`; quando verdadeiro, cada `.node-row` de valor pisca `--object-soft` uma vez (~300ms), e o próprio card limpa o flag ao final (`onAnimationEnd`) para não repetir em re-renders.
- Bloco de `prefers-reduced-motion: reduce` próprio para os dois efeitos.

## Regras de negócio

- RN-01: o destaque de herança dispara só na criação do objeto — nunca ao reabrir um diagrama existente ou editar um valor manualmente depois.
- RN-02: cor `--object-accent`/`--object-soft` (identidade estrutural do Diagrama de Objetos), nunca `--accent`.

## Critérios de aceitação

- [x] CA-01: selecionar um card de objeto transiciona a borda suavemente (~120ms), nos dois temas. Verificado por leitura de código (`transition: border-color 120ms ease-out` em `.diagram-shell-canvas .node-box.object`, independente do tema — só o valor de `--object-accent` muda entre claro/escuro). **Não confirmado ao vivo num navegador** — ver "Divergências".
- [x] CA-02: criar um objeto a partir de uma classe com atributos faz os valores herdados piscarem uma vez (~300ms). Mecanismo coberto por teste automatizado (classe `inherited-flash` aplicada aos `.node-row` logo após a criação); a animação CSS em si (`node-row-inherited-flash`, 300ms) não roda em jsdom nem foi vista rodando num navegador real — ver "Divergências".
- [x] CA-03: reabrir um diagrama com objetos existentes NÃO dispara o destaque de herança. Coberto por teste automatizado (`ObjectDiagramCanvas.test.tsx`, objeto pré-carregado sem `inherited-flash`).
- [x] CA-04: editar um valor manualmente depois da criação não reaciona o destaque. Coberto por teste automatizado (simula `animationend`/`webkitanimationend`, edita o valor em seguida, confirma que a classe não volta).
- [ ] CA-05: `prefers-reduced-motion: reduce` reduz os 2 efeitos conforme especificado. Implementado (bloco `@media (prefers-reduced-motion: reduce)` próprio zerando `transition`/`animation`), mas **não verificado ao vivo** alternando a preferência num navegador — sem cobertura automatizada de `prefers-reduced-motion` neste repositório (nenhuma task anterior testou isso via Vitest/jsdom). Deixado sem marcar por rigor.
- [x] CA-06: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados. Ver "Validação".

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/ObjectCard.tsx`, `src/features/object-diagram/ObjectDiagramCanvas.tsx` (rastreio do id recém-criado — mudança pequena e isolada, ver nota de overlap acima), `src/index.css`.
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [x] Trabalhar em worktree git isolado, branch `task/042-animacao-diagrama-objetos` criada a partir de `feature/animacoes-sistema`.
- [x] `.node-box.object.selected`: adicionar transição de borda em `src/index.css`.
- [x] `ObjectDiagramCanvas.tsx`: rastrear id do objeto recém-criado (mudança mínima).
- [x] `ObjectCard.tsx`: destaque de `--object-soft` nos `.node-row` quando `justCreated`.
- [x] Testes: confirmar que o flag de "recém-criado" não vaza para objetos pré-existentes nem sobrevive a uma edição manual do valor.
- [x] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [x] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [x] Preencher "Registro de execução"/"Validação", incluindo uma nota honesta sobre se o destaque de herança pareceu útil ou ruído na verificação manual.
- [x] Mover para `.agents/tasks/active/`.

## Estratégia de testes

- [x] Unitários: teste novo confirmando que `justCreated` não vaza para objetos carregados de um diagrama existente nem sobrevive a uma edição.
- [ ] Manual: navegador embutido, criar objeto de uma classe com atributos, editar um valor depois, dark/light, `prefers-reduced-motion` ligado e desligado. **Não executado** — porta padrão do dev server (5173) ocupada por outro subagente desta mesma rodada paralela (TASK-038..045); ver "Divergências".

## Riscos e rollback

Risco baixo-médio — mesma natureza da TASK-041 (rastreio de "recém-criado" é lógica, não só CSS). Risco adicional próprio: o destaque de herança é a ideia mais especulativa da rodada — se na validação manual parecer confuso/ruído, sinalizar ao usuário em vez de insistir. Rollback: reverter `.node-box.object.selected` em `index.css`, o rastreio em `ObjectDiagramCanvas.tsx` e o destaque condicional em `ObjectCard.tsx`. Overlap esperado e aceito com TASK-043 em `ObjectDiagramCanvas.tsx` — mesclar 042 antes de 043.

## Registro de execução

### Alterações realizadas

- **`src/index.css`**: 3 blocos novos, todos comentados com `TASK-042 (ADR-011)`:
  1. `.diagram-shell-canvas .node-box.object { transition: border-color 120ms ease-out; }` — mesma transição de seleção da TASK-041, num bloco próprio (não depende da ordem de merge com ela).
  2. `@keyframes node-row-inherited-flash` + `.diagram-shell-canvas .node-row.inherited-flash { animation: node-row-inherited-flash 300ms ease-out; }` — pisca `background-color: var(--object-soft)` uma vez (0% transparente → 25% `--object-soft` → 100% transparente de volta).
  3. Bloco próprio `@media (prefers-reduced-motion: reduce)` zerando `transition`/`animation` dos 2 efeitos acima (RN-02: cor sempre `--object-accent`/`--object-soft`, nunca `--accent`).
- **`src/features/object-diagram/ObjectDiagramCanvas.tsx`**: novo `useState<string | null>` `justCreatedId`. Setado em `handlePickClass` só quando o objeto recém-criado tem `values.length > 0` (objeto sem atributos não tem `.node-row` para animar — evitaria nunca disparar `onAnimationEnd` e prender o flag). Passado a `ObjectCard` como `justCreated={obj.id === justCreatedId}`, com `onJustCreatedShown` limpando o estado (`current === obj.id ? null : current`, para não apagar por engano o id de um objeto criado depois).
- **`src/features/object-diagram/ObjectCard.tsx`**: novas props `justCreated?`/`onJustCreatedShown?`. Cada `.node-row` de valor ganha a classe `inherited-flash` quando `justCreated`; `onAnimationEnd` no `.node-body` (bubbling dos `.node-row` filhos) chama `onJustCreatedShown` — inofensivo disparar mais de uma vez (um por `.node-row` que terminou de animar), já que o canvas só zera um `useState`.
- **`src/features/object-diagram/ObjectDiagramCanvas.test.tsx`**: 3 testes novos (descrever "destaque de herança na criação") cobrindo CA-02/CA-03/CA-04, mais um helper `fireInheritedFlashEnd` — ver "Decisões" sobre por que ele dispara 2 nomes de evento.

### Arquivos principais

`src/features/object-diagram/ObjectCard.tsx`, `src/features/object-diagram/ObjectDiagramCanvas.tsx`, `src/features/object-diagram/ObjectDiagramCanvas.test.tsx`, `src/index.css`.

### Decisões

- **`justCreatedId` só é setado quando o objeto tem atributos** (`created.values.length > 0`): sem isso, um objeto criado a partir de uma classe sem atributos ficaria com `justCreated` preso para sempre (nunca haveria `.node-row` para disparar `onAnimationEnd`), reacendendo o flag holder mesmo depois de reload/edição. Decisão local, não estava explícita na task.
- **`onJustCreatedShown` no `.node-body` em vez de em cada `.node-row`**: um único listener via bubbling é mais simples do que coordenar "todos os `.node-row` terminaram" — disparar a limpeza do estado mais de uma vez é inofensivo (idempotente).
- **Achado de ambiente, não de produto — documentado para quem for escrever testes parecidos depois**: neste projeto (React 19 + jsdom via Vitest), o `onAnimationEnd` sintético do React só é entregue quando o evento nativo despachado tem o nome que o próprio React resolveu via detecção de propriedade de estilo com prefixo de fornecedor — nesta combinação de versões, jsdom expõe `WebkitAnimation` no `CSSStyleDeclaration` mas não a forma sem prefixo, então React registra o listener como `webkitanimationend`, não `animationend`. `fireEvent.animationEnd` (testing-library) sozinho não chega ao handler. O teste novo dispara os 2 nomes (`fireInheritedFlashEnd`) para não depender de uma versão específica do jsdom. Nenhum código de produção foi alterado por causa disso — é uma particularidade só do ambiente de teste.

### Divergências

- **Avaliação honesta do destaque de herança (pedida explicitamente pela task)**: não cheguei a ver o efeito rodando de verdade num navegador (ver "Pendências" abaixo) — só a mecânica (classe aplicada/removida no momento certo) foi confirmada por teste automatizado e por leitura de código. Pela descrição (pisca `--object-soft` por 300ms nos valores recém-herdados, uma vez, na criação), a intenção — "esse valor não foi digitado, veio da classe" — parece razoável e sutil o bastante para não virar ruído constante (dispara uma única vez, não a cada seleção). Mas concordo com a ressalva já registrada na própria task: é a ideia mais especulativa da rodada, e sem ver rodando ao vivo eu não asseguraria que 300ms/`--object-soft` sejam perceptíveis o suficiente (ou não rápidos demais) num objeto com várias linhas de valor piscando ao mesmo tempo. Recomendo ao usuário essa confirmação visual antes de considerar o CA-02 fechado de fato.
- **Validação manual ao vivo não executada nesta sessão**: a porta padrão do dev server (5173) estava ocupada por outro subagente desta mesma rodada paralela (TASK-038..045, todos dispachados juntos por desenho — ver `.agents/context/CONTEXT.md`, "Ondas de dispatch/merge sugeridas"). Tentei `autoPort: true` em `.claude/launch.json` para contornar, sem sucesso — revertido antes do commit, sem deixar essa mudança no diff final. Não forcei encerrar o processo de outro subagente para não interferir no trabalho paralelo dele. CA-01 e CA-05 ficaram sem confirmação visual (dark/light, `prefers-reduced-motion`); CA-02 teve só a mecânica confirmada. Mesma natureza da ressalva já registrada em TASK-036/037 (sem sessão autenticada/harness disponível) — aqui o bloqueio foi de porta, não de credencial.

### Pendências

- Confirmação visual ao vivo (navegador real, dark/light, `prefers-reduced-motion` ligado/desligado) dos 2 efeitos — recomendado ao usuário numa sessão em que a porta do dev server esteja livre, ou apontando o preview para outra porta.
- Decisão final sobre manter/reverter o destaque de herança é do usuário (conforme a própria task pede), depois de ver o efeito ao vivo — não decidida aqui.

## Validação

Todos os comandos rodados em `C:\Users\Essencis007\Documents\ClassMap\.claude\worktrees\agent-aca87bab7f2a6f3b2` (worktree isolado desta task), branch `task/042-animacao-diagrama-objetos`.

- `npm install` — OK (worktree novo, 130 pacotes).
- `npm run build` — OK (`tsc -b && vite build`, sem erros; bundle final 307.30 kB / gzip 94.78 kB).
- `npm run lint` — OK (`oxlint`, 0 erros; 3 warnings pré-existentes em `AuthContext.tsx`/`Toast.tsx`, nenhum nos arquivos desta task).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — 200 de 201 testes passando (28 arquivos). A única falha (`src/features/import-export/agentPrompt.test.ts`, "não sobra frontmatter YAML da skill importada") é **pré-existente e não relacionada a esta task** — confirmado rodando a mesma suíte num `git stash` (HEAD limpo, antes de qualquer mudança desta task): a falha já existe lá. `src/features/navigation/DiagramsRouteDispatcher.test.tsx` mostrou 1 falha isolada numa corrida da suíte completa mas passou em toda repetição isolada e na repetição seguinte da suíte completa — flakiness sob carga da suíte cheia, não uma regressão desta task (14 testes de `ObjectDiagramCanvas.test.tsx`, incluindo os 3 novos desta task, passam de forma consistente).
- `node "C:\Users\Essencis007\.claude\skills\impeccable\scripts\detect.mjs" --json <arquivos alterados>` — 1 achado (`border-accent-on-rounded`, warning, em `src/index.css:217`, bloco `.card` do login) — **linha pré-existente da TASK-032, fora do diff desta task** (confirmado via `git diff`/`git show HEAD:src/index.css`). Nenhum achado nos trechos novos desta task. Nota: o caminho do script não existe neste repositório em `.claude/skills/impeccable/` (só `.claude/skills/gerar-diagrama-classmap/` existe aqui) — rodado a partir da instalação de usuário em `C:\Users\Essencis007\.claude\skills\impeccable\scripts\detect.mjs`.

## Handoff

Sem handoff pendente de continuidade de código — task implementada e com CA-01..04/06 verificados (CA-05 e a confirmação visual de CA-01/CA-02 ficam para uma sessão com o dev server disponível, ver "Pendências"). Overlap com TASK-043 em `ObjectDiagramCanvas.tsx` é esperado (ver nota no topo do arquivo) — mesclar esta task antes da TASK-043 em `feature/animacoes-sistema`.
