---
id: TASK-041
title: Diagrama de Classes — seleção de card animada e conector nascendo ao ser criado
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: [ADR-011]
---

# TASK-041 — Diagrama de Classes: seleção de card e conector nascendo

## Contexto

Parte da rodada de 8 tasks de animação (TASK-038..045, ver `.agents/context/CONTEXT.md`, "Animação do sistema — planejamento"), desenhada para execução paralela por subagentes na branch `feature/animacoes-sistema`. Grupo "Feedback + Continuidade" — as 2 ideias vivem no Diagrama de Classes e viraram uma task só por tocarem arquivos vizinhos (`ClassCard.tsx`/`Connector.tsx`).

**Atenção — overlap conhecido e aceito**: esta task também toca `ClassDiagramCanvas.tsx` (para rastrear qual relação acabou de ser criada), no mesmo arquivo que a TASK-043 (assentamento do "ajustar à tela") também toca, em linhas diferentes. Mesmo padrão já aceito neste projeto (ver TASK-014×TASK-015 em `ClassDiagramCanvas.tsx`, `.agents/context/CONTEXT.md`, "Backlog inteiro via subagentes paralelos"). **Mesclar esta task (041) antes da TASK-043** na branch `feature/animacoes-sistema`, para a TASK-043 já rebasear sobre o estado final do arquivo.

## Problema

1. A borda de seleção de um card de classe (`.node-box.selected`, tinta `--class-accent`) aparece/some sem transição — corte seco.
2. Um conector novo (relação criada no modo de conexão) aparece já pronto, sem comunicar "essa relação acabou de nascer".

## Objetivo

- Card selecionado: transição de opacidade/espessura da borda em ~120ms — nunca do tamanho do card (evita reflow).
- Conector recém-criado: a linha se desenha do card de origem ao destino via `stroke-dasharray`/`stroke-dashoffset` (~250ms, `cubic-bezier(0.16, 1, 0.3, 1)`), em vez de aparecer pronta. Símbolos de ponta (losango/triângulo/seta) aparecem só ao final do traço, não durante.

## Fora de escopo

- Diagrama de Objetos (`ObjectLinkConnector.tsx`) — fora de escopo desta rodada de 11 ideias; ver nota em "Riscos" para uma possível task futura de paridade.
- Arrastar o ponto de controle do conector (inércia/easing na soltura) — mencionado no levantamento original como ideia relacionada, mas não incluído nesta rodada de 8 tasks para manter escopo pequeno; considerar como task futura se o efeito de "nascer" for aprovado.
- Assentamento do "ajustar à tela" — ver TASK-043.

## Comportamento atual

- `.node-box.selected` muda de classe sem transição declarada.
- `Connector.tsx` (`src/features/class-diagram/Connector.tsx`) renderiza o `<path>` da relação (incluindo losango/triângulo/seta conforme `relationship.type`) sempre no estado final, sem diferenciar "recém-criado" de "já existente".

## Comportamento esperado

- `.node-box.selected`: `transition: border-color 120ms ease-out` (ou equivalente) em `ClassCard.tsx`/`src/index.css`.
- `ClassDiagramCanvas.tsx` rastreia o id da última relação criada (ex.: `useState<string | null>` atualizado no handler que cria a relação) e passa um prop `justCreated` para o `Connector` correspondente; o próprio `Connector` limpa esse estado (ex.: via `onAnimationEnd`) para não repetir o efeito em re-renders futuros.
- `Connector.tsx`, quando `justCreated`, aplica `stroke-dasharray`/`stroke-dashoffset` animado no `<path>` principal (~250ms); os símbolos de ponta (losango/triângulo/seta) só aparecem com um `opacity` que entra depois do traço (delay ~200ms, duração curta).
- Bloco de `prefers-reduced-motion: reduce` próprio para os dois efeitos: seleção reduz para troca instantânea de cor; conector reduz para aparecer pronto (sem desenho), preservando o feedback de "algo novo apareceu" via um fade curto único.

## Regras de negócio

- RN-01: o efeito de "conector nascendo" dispara só na criação — nunca ao reabrir um diagrama existente ou selecionar uma relação já existente.
- RN-02: a cor usada em ambos os efeitos é `--class-accent` (identidade estrutural do Diagrama de Classes), nunca `--accent` — regra de papel de cor já estabelecida em `DESIGN.md`.

## Critérios de aceitação

- [ ] CA-01: selecionar um card transiciona a borda suavemente (~120ms), nos dois temas. **Implementado** (`transition: border-color 120ms ease-out, box-shadow 120ms ease-out` em `.diagram-shell-canvas .node-box`, `src/index.css`); não verificado ao vivo num navegador real nesta sessão — ver "Pendências".
- [ ] CA-02: criar uma relação nova desenha a linha do zero até o destino (~250ms), com os símbolos de ponta aparecendo só ao final. **Implementado** (`Connector.tsx` + `.connector.just-created` em `src/index.css`); mecanismo de disparo (`justCreated`) coberto por teste automatizado, mas o resultado visual da animação em si não foi verificado ao vivo — ver "Pendências".
- [x] CA-03: reabrir um diagrama com relações existentes NÃO dispara o efeito de desenho — as linhas aparecem prontas. Coberto por teste automatizado (`ClassDiagramCanvas.test.tsx`, RN-01).
- [ ] CA-04: `prefers-reduced-motion: reduce` reduz os 2 efeitos conforme especificado, sem perder o feedback de "algo novo apareceu". **Implementado** (bloco `@media (prefers-reduced-motion: reduce)` próprio, `src/index.css`); não verificado ao vivo — ver "Pendências".
- [x] CA-05: `npm run build`/`npm run lint`/`npm test` limpos; `detect.mjs` rodado sobre os arquivos alterados. Ver "Validação" (1 falha pré-existente e não relacionada, documentada).

## Impacto técnico

### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/ClassCard.tsx`, `src/features/class-diagram/Connector.tsx`, `src/features/class-diagram/ClassDiagramCanvas.tsx` (rastreio do id recém-criado — mudança pequena e isolada, ver nota de overlap acima), `src/index.css`.
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma superfície nova.

## Plano de implementação

- [x] Trabalhar em worktree git isolado, branch `task/041-animacao-diagrama-classes` criada a partir de `feature/animacoes-sistema`.
- [x] `.node-box.selected`: adicionar transição de borda em `src/index.css`.
- [x] `ClassDiagramCanvas.tsx`: rastrear id da relação recém-criada (mudança mínima, isolada do resto do arquivo).
- [x] `Connector.tsx`: `stroke-dasharray`/`stroke-dashoffset` animado quando `justCreated`, símbolos de ponta com delay.
- [x] Testes: pelo menos 1 caso confirmando que `justCreated` só é verdadeiro logo após a criação, e não em relações pré-existentes carregadas.
- [x] Rodar `npm run build`/`npm run lint`/`npm test` no worktree.
- [x] Rodar `detect.mjs --json` sobre os arquivos alterados.
- [x] Preencher "Registro de execução"/"Validação" e mover para `.agents/tasks/active/`.

## Estratégia de testes

- [x] Unitários: `ClassDiagramCanvas.test.tsx`/teste novo confirmando que o flag de "recém-criado" não vaza para relações carregadas de um diagrama existente. Complementado por `Connector.test.ts` (função pura `isJustCreatedAnimationEnd`) — ver "Decisões" sobre por que a interação real via evento `animationend` não pôde ser testada em jsdom.
- [ ] Manual: navegador embutido, criar relação nova de cada um dos 5 tipos, dark/light, `prefers-reduced-motion` ligado e desligado. **Não executado nesta sessão** — ver "Pendências".

## Riscos e rollback

Risco baixo-médio — a parte de rastrear "recém-criado" em `ClassDiagramCanvas.tsx` é a única mudança de lógica (não só CSS) desta rodada de 8 tasks; testar bem para não vazar o flag entre re-renders. Rollback: reverter `.node-box.selected` em `index.css`, o rastreio em `ClassDiagramCanvas.tsx` e o `stroke-dasharray` condicional em `Connector.tsx`. Overlap esperado e aceito com TASK-043 em `ClassDiagramCanvas.tsx` — mesclar 041 antes de 043.

## Registro de execução
### Alterações realizadas
- `src/index.css`: `.diagram-shell-canvas .node-box` ganhou `transition: border-color 120ms ease-out, box-shadow 120ms ease-out` (corte seco de seleção vira transição — só cor/realce, nunca dimensão, evitando reflow). Novo bloco no fim do arquivo, comentado com o id da task: `@keyframes connector-draw`/`connector-symbol-in`/`connector-fade-once`, `.connector.just-created .connector-path` (traço via `stroke-dashoffset`, ~250ms, `cubic-bezier(0.16, 1, 0.3, 1)`) e `.connector.just-created .connector-symbol` (símbolos de ponta com `opacity` atrasado ~200ms), mais um `@media (prefers-reduced-motion: reduce)` local próprio (não tocou o bloco global já existente) reduzindo os dois efeitos: seleção vira troca instantânea (transição removida) e o conector aparece pronto com um único fade curto no grupo inteiro (`connector-fade-once`).
- `src/features/class-diagram/Connector.tsx`: novas props `justCreated?: boolean` e `onJustCreatedAnimationEnd?: () => void`. O `<g>` da relação ganha a classe `connector`/`connector just-created`; o `<path>` visível ganha `className="connector-path"` e `pathLength={justCreated ? 1 : undefined}` (normaliza `stroke-dasharray`/`stroke-dashoffset` para a faixa 0..1 independente do comprimento real em pixels, só durante a animação); losango/triângulo/setas ganham `className="connector-symbol"`. Handler `onAnimationEnd` no `<g>` chama `onJustCreatedAnimationEnd` só quando o nome da animação for a "última" de cada modo (`connector-symbol-in` no movimento normal, `connector-fade-once` em reduced-motion) — extraído como função pura exportada `isJustCreatedAnimationEnd` (ver "Decisões").
- `src/features/class-diagram/ClassDiagramCanvas.tsx`: novo estado `justCreatedRelationshipId` (começa `null`); setado só dentro do handler que cria a relação de fato (`handleCardClick`, ramo de conclusão do modo de conexão) — nunca ao carregar `content` de um diagrama existente (RN-01 satisfeita por construção, sem precisar de lógica extra de "é a primeira renderização?"). Passado ao `Connector` como `justCreated`; `onJustCreatedAnimationEnd` limpa o id só se ainda for o mesmo (evita corrida caso uma segunda relação seja criada antes da primeira animação terminar). Mudança pequena e isolada, sem tocar as demais ~20 funções do arquivo (ver nota de overlap com TASK-043 no cabeçalho da task).
- `src/features/class-diagram/ClassDiagramCanvas.test.tsx`: novo teste (`TASK-041 RN-01`) confirmando que uma relação carregada de um diagrama já existente nunca ganha `just-created`, e que uma relação criada de fato nesta sessão ganha.
- `src/features/class-diagram/Connector.test.ts` (novo): 4 casos unitários para `isJustCreatedAnimationEnd`.

### Arquivos principais
- [src/index.css](../../../src/index.css)
- [src/features/class-diagram/Connector.tsx](../../../src/features/class-diagram/Connector.tsx)
- [src/features/class-diagram/ClassDiagramCanvas.tsx](../../../src/features/class-diagram/ClassDiagramCanvas.tsx)
- [src/features/class-diagram/ClassDiagramCanvas.test.tsx](../../../src/features/class-diagram/ClassDiagramCanvas.test.tsx)
- [src/features/class-diagram/Connector.test.ts](../../../src/features/class-diagram/Connector.test.ts) (novo)
- `src/features/class-diagram/ClassCard.tsx` — **não alterado**: a transição de `.node-box.selected` é 100% CSS (a classe `selected` já era alternada por este componente desde a TASK-003); listado no "Impacto técnico" original só como referência de onde a classe vive, não indicava mudança de código necessária ali.

### Decisões
- **`pathLength` normalizado em vez de medir o comprimento real do traço em pixels**: em vez de `getTotalLength()` via ref (mais preciso, mais código), usei o atributo SVG `pathLength={1}` só durante `justCreated` — normaliza `stroke-dasharray`/`stroke-dashoffset` para a faixa 0..1 independente da distância real entre os cards, then a CSS anima só `stroke-dashoffset: 1 → 0`. Único efeito colateral aceito: para o tipo `dependency` (linha tracejada, `stroke-dasharray: '6 4'` normalmente), durante a janela de ~250-320ms da animação de criação o traço aparece temporariamente sólido em vez de tracejado (porque a CSS da animação sobrescreve o `stroke-dasharray` do atributo enquanto `just-created` está ativo) — ao terminar a animação, a classe cai e o padrão tracejado correto volta imediatamente. Nenhum critério de aceitação cobre a fidelidade do padrão tracejado durante a janela de criação; troquei robustez/simplicidade (funciona igual para os 5 tipos de relação, sem medir nada em runtime) por essa imperfeição cosmética breve, só para `dependency` recém-criada.
- **Handler de fim de animação isolado numa função pura exportada (`isJustCreatedAnimationEnd`)**: ao escrever o teste de integração, descobri que jsdom não implementa o construtor `AnimationEvent` (`"AnimationEvent" in window` é `false`) — e o próprio React (`react-dom-client.development.js`, checagem em `getVendorPrefixedEventName`) usa exatamente essa checagem de feature-detection para decidir por qual nome de evento nativo escutar `animationend`. Resultado: em jsdom, `onAnimationEnd` do React **nunca** dispara, nem com `fireEvent.animationEnd` nem construindo um `Event('animationend', ...)` à mão (confirmado com um teste mínimo isolado, `<div onAnimationEnd>` + `fireEvent.animationEnd`, que também falhou). Isso é uma limitação conhecida de React+jsdom, não um bug do código de produção (funciona normalmente em qualquer navegador real, que implementa `AnimationEvent`). Para não deixar a lógica de "qual nome de animação encerra o efeito" sem nenhuma cobertura automatizada, extraí a decisão para `isJustCreatedAnimationEnd` (função pura, sem DOM) e testei ela isolada em `Connector.test.ts`; o teste de integração em `ClassDiagramCanvas.test.tsx` cobre só a metade que É testável em jsdom (RN-01: o flag nasce `true` só na criação de fato, nunca ao carregar um diagrama existente).
- **`transition` na regra base `.node-box`, não em `.node-box.selected`**: para a transição funcionar tanto ao entrar quanto ao sair da seleção (e do estado `has-color`), a declaração `transition` precisa estar na regra que sempre se aplica ao elemento, não só na variante `.selected` — senão a transição нне dispara ao remover a classe (o elemento já teria perdido a declaração de `transition` no mesmo instante em que perde `border-color: var(--class-accent)`).
- **Warning novo de lint aceito** (`react(only-export-components)` em `Connector.tsx`, por exportar `isJustCreatedAnimationEnd` ao lado do componente `Connector`): mesmo padrão já presente e aceito no repositório (`Toast.tsx`, `AuthContext.tsx` têm o mesmo warning) — não bloqueia `npm run lint` (exit 0, é warning, não erro).

### Divergências
- **1 teste pré-existente falhando, sem relação com esta task**: `src/features/import-export/agentPrompt.test.ts` ("não sobra frontmatter YAML da skill importada") já falha na base desta branch (`feature/animacoes-sistema`, commit `6a7b5d8`, **antes** de qualquer mudança desta task — confirmado rodando a suíte via `git stash`/`stash pop`). É da feature de import/export (TASK-037), não toca nada do Diagrama de Classes. Não corrigido aqui, por estar fora do escopo declarado da TASK-041 — só registrado.
- **1 teste de outro arquivo com falha intermitente (flaky), não reproduzível isolado**: `DiagramsRouteDispatcher.test.tsx` falhou por timeout numa das rodadas completas da suíte, mas passou tanto isolado quanto numa segunda rodada completa — não investigado a fundo (parece contenção de tempo entre arquivos de teste, não uma quebra real causada por esta task, já que o arquivo/módulo não foi tocado por ela). Sinalizado para o caso de reaparecer em runs futuros.

### Pendências
- **Validação visual ao vivo não realizada nesta sessão**: o ambiente de preview/navegador desta sessão está compartilhado com outras sessões de subagentes rodando em paralelo a mesma rodada de animação (TASK-038..045, cada uma no seu worktree) — havia uma aba de outra sessão já aberta contra este mesmo projeto (`localhost:5188`) no momento desta task, e a porta padrão do Vite (5173) já estava em uso por outro chat. Um harness temporário (`main.tsx` renderizando `ClassDiagramCanvas` isolado com dados fictícios, mesmo padrão já usado nas TASK-006/033/036) chegou a ser preparado, mas eu optei por não forçar uma porta alternativa/nome de servidor diferente para não arriscar interferir no trabalho ao vivo de uma sessão irmã — revertido antes do commit (`git checkout -- src/main.tsx vite.config.ts .claude/launch.json`, nenhum resíduo do harness ficou nesta branch). CA-01, CA-02 e CA-04 (as 3 que dependem de ver a animação de verdade rodando, dark/light, com/sem `prefers-reduced-motion`) ficam com a implementação feita e revisada por código, mas sem confirmação visual — recomendo ao usuário (ou a uma sessão sem esse conflito de porta/aba) abrir o Diagrama de Classes de um projeto real, criar uma relação de cada um dos 5 tipos e alternar tema/`prefers-reduced-motion` antes de considerar o CA definitivamente fechado.
- **Simplificação cosmética aceita para relações `dependency` durante a criação** — ver "Decisões" (traço aparece momentaneamente sólido em vez de tracejado por ~250-320ms só na animação de nascimento).

## Validação
```bash
npm install                              # worktree novo, sem node_modules — OK, 130 pacotes
npm run build                            # tsc -b && vite build — OK, sem erros
npm run lint                             # oxlint — sem erros; 4 warnings (3 pré-existentes + 1 novo aceito, ver "Decisões")
npx vitest run                           # 29 arquivos, 203 testes — 202 passando, 1 falha pré-existente e não relacionada
                                          # (src/features/import-export/agentPrompt.test.ts, confirmada pré-existente via git stash)
node C:/Users/Essencis007/.claude/skills/impeccable/scripts/detect.mjs --json \
  src/features/class-diagram/ClassCard.tsx src/features/class-diagram/Connector.tsx \
  src/features/class-diagram/ClassDiagramCanvas.tsx src/index.css \
  src/features/class-diagram/Connector.test.ts src/features/class-diagram/ClassDiagramCanvas.test.tsx
# 1 achado: border-accent-on-rounded em src/index.css:217 (`.card { border-top: 3px solid ... }`,
# herdado da TASK-032/ADR-011 — linha não tocada por esta task, fora do escopo).
```
Validação visual: **não realizada nesta sessão** — ver "Pendências" (ambiente de preview compartilhado com sessões irmãs da mesma rodada de animação, TASK-038..045).

## Handoff
Sem handoff formal — task completa do ponto de vista de código/testes automatizados, mas com uma pendência explícita de validação visual ao vivo (ver "Pendências"), a ser fechada numa sessão com acesso exclusivo ao navegador/dev server antes de considerar CA-01/CA-02/CA-04 definitivamente confirmados.
