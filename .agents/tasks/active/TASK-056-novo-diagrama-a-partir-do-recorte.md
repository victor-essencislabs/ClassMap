---
id: TASK-056
title: Criar diagrama novo (tecla N) com a classe selecionada e as relacionadas
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [class-diagram, navigation, supabase-queries]
related_use_cases: []
related_adrs: []
---

# TASK-056 — Criar diagrama novo (tecla N) com a classe selecionada e as relacionadas

> **Branch obrigatória**: mesma branch da TASK-055 — `feature/foco-classe-relacionadas`, criada a partir de `main`. Esta task **não** é implementada em `main`, e nada vai para o remoto ou para `main` sem pedido explícito do usuário. Mesmo padrão de `feature/animacoes-sistema` (TASK-038..045).
>
> **Depende da TASK-055**: consome `focusSubgraph.ts` (subgrafo induzido + layout), criado lá. Implementar depois dela, na mesma branch — ver "Relação com a TASK-055".

## Contexto
Segundo pedido do usuário na mesma conversa da TASK-055 (2026-09-03): além do modal efêmero de foco (`V`), poder apertar `N` com uma classe selecionada e **criar um diagrama de classes novo** contendo só aquela classe e as classes com que ela se relaciona. A diferença de intenção entre as duas é clara e deliberada: `V` é para *olhar agora* (não persiste nada), `N` é para *destacar um recorte e trabalhar nele depois* — um diagrama de verdade, salvo no projeto, que aparece na lista, pode ser editado, renomeado, exportado e compartilhado como qualquer outro.

Motivação de fundo, a mesma da TASK-055: o diagrama real do ELIMS tem 85 classes e 190 relações num painel só. Recortar um subdomínio ("tudo que toca `Sample`") é hoje um trabalho 100% manual — criar diagrama vazio, recriar cada classe à mão, recriar cada relação.

**Sem ritual de 3 opções/ADR**: não muda contrato JSON, não muda schema Postgres, não muda RLS, não introduz infraestrutura nova. É uma composição de peças que já existem (a criação de diagrama do `DiagramTypeListPage`, o `content` montado programaticamente do import, o subgrafo da TASK-055). O único ponto novo que merecia debate — reaproveitar ou regenerar os ids das classes copiadas — está decidido e justificado abaixo (RN-05).

## Problema
Não existe nenhum caminho para derivar um diagrama de outro. Confirmado no levantamento:
- `createEmptyDiagram(projectId, type, name)` (`src/lib/supabase/queries.ts:233`) é a **única** forma de criar diagrama, e sempre insere `content: {}`.
- O import de JSON **não** cria diagrama: `ImportExportControls` → `importClassDiagram` → `onImport` está ligado ao `handleChange` do `DiagramEditorPage` (linha 168), ou seja, **sobrescreve o diagrama aberto**.

Ou seja, hoje recortar um subdomínio significa recriar tudo à mão, ou exportar o JSON inteiro, editar fora do produto e importar por cima de um diagrama novo criado à parte.

## Objetivo
Com uma classe selecionada, `N` cria no **mesmo projeto** um diagrama de classes novo contendo a classe focada, as classes diretamente relacionadas a ela e as relações entre elas — já posicionadas (mesmo layout do modal da TASK-055) — e abre esse diagrama.

## Fora de escopo
- **Vínculo vivo entre o diagrama-mãe e o derivado**: o novo diagrama é uma **cópia independente**, um snapshot. Editar a classe no derivado não altera o original, e vice-versa. Mesmo precedente já adotado no Diagrama de Objetos (atributos herdados por snapshot na criação, TASK-004). Sincronizar/mesclar de volta não está no escopo e não deve ser sugerido pela UI.
- **Vizinhança de 2+ níveis**, escolher quais vizinhas entram, ou recortar a partir de várias classes selecionadas — o pedido é o mesmo conjunto da TASK-055.
- **Diagrama de Objetos** e **Visão do Sistema**: só Diagrama de Classes (`type = 'classes'`).
- **Copiar cards de comentário (`notes`)**: nota é anotação livre sem vínculo com classe (ADR-013) — não há critério para dizer que uma nota pertence ao recorte. O diagrama novo nasce sem notas.
- **Desfazer a criação**: excluir o diagrama derivado usa o caminho normal já existente (TASK-028).

## Comportamento atual
`N` não faz nada (nenhum atalho `'n'`/`'N'` em `src/`). Criar diagrama só pelo botão `+ Diagrama de Classes` do `DiagramTypeListPage`, que abre um modal pedindo o nome (TASK-016) e chama `createEmptyDiagram` — content vazio, e **sem navegar** para o diagrama criado (só recarrega a lista).

## Comportamento esperado
1. Com uma classe selecionada, foco fora de campo de texto e usuário `editor`, `N` abre um modal pedindo o **nome** do novo diagrama, pré-preenchido com uma sugestão baseada na classe focada (ex.: `Foco — Sample`).
2. Confirmando, o diagrama é criado no mesmo projeto com `type = 'classes'` e o `content` do recorte já posicionado.
3. Concluída a criação, o app navega para o diagrama novo (`/orgs/:orgId/projects/:projectId/diagrams/:novoId`), que abre normalmente pelo `DiagramsRouteDispatcher` → `DiagramRouterPage` → `DiagramEditorPage`.
4. O mesmo recorte também pode ser criado por um botão dentro do modal de foco da TASK-055 (RN-07) — o que o usuário está vendo ali é exatamente o que vai virar diagrama.
5. Erro na criação (rede/RLS) mostra o erro e **não** navega — o diagrama de origem continua aberto e intacto.

## Regras de negócio
- **RN-01**: só `editor` (`!readOnly`). `visualizador` não cria diagrama — o INSERT seria recusado pela RLS (`diagrams_insert` exige `project_role(project_id) = 'editor'`), e a UI não deve nem oferecer o caminho. Diferente do `V` da TASK-055, que é liberado para todo mundo.
- **RN-02**: `N` nunca dispara com o foco num `input`/`textarea`/`select` — senão digitar "n" no nome de uma classe criaria um diagrama. Mesma guarda de `document.activeElement` da TASK-052. Esta regra é mais crítica aqui que na TASK-052: o efeito colateral é **escrita no banco**, não uma janela que fecha com `Esc`.
- **RN-03**: `N` só age com uma **classe** selecionada (não relação, não comentário, não vazio).
- **RN-04**: o diagrama novo é criado **no mesmo projeto** do diagrama de origem, com `type = 'classes'` — nunca em outro projeto, nunca com outro tipo. (Atenção ao valor literal: o token de tipo em `diagrams.type` é `'classes'`, não `'class'`.)
- **RN-05**: os ids de classe/atributo/relação são **reaproveitados**, não regenerados. Eles vivem dentro do JSONB, sem unicidade global nem FK, e `relationships.from`/`to` só precisam ser válidos dentro do próprio `content` — reaproveitar mantém tudo consistente sem remapeamento (portanto sem a classe inteira de bugs de remapear `from`/`to` errado) e preserva a rastreabilidade "esta classe é a mesma classe do diagrama-mãe". Se algum dia existir sincronização de volta, aí sim isso vira uma decisão a rever — e é exatamente por isso que fica registrada aqui como decisão consciente, não como acidente.
- **RN-06**: `x`/`y` **são** recalculados pelo layout do recorte (as posições do diagrama-mãe não fazem sentido num diagrama de 8 classes), e `controlX` de cada relação é recalculado junto — copiar o `controlX` antigo com posições novas produz conectores com o cotovelo em lugar absurdo. `color` (ADR-005) e `stereotype` são copiados como estão.
- **RN-07**: o modal de foco da TASK-055 ganha um botão que dispara exatamente este mesmo fluxo (mesmo caminho de código do atalho `N`), visível só para `editor`. É o lugar mais honesto para oferecer isso: o usuário está vendo o recorte exato que será criado.
- **RN-08**: antes de navegar para o diagrama novo, qualquer alteração pendente do diagrama **atual** precisa estar salva. O autosave do `DiagramEditorPage` tem debounce de 800 ms (`AUTOSAVE_DELAY_MS`) — navegar dentro dessa janela desmonta o componente e **perde** a alteração pendente (ex.: arrastar um card e apertar `N` em seguida). Garantir a gravação antes de navegar, ou não navegar.
- **RN-09**: nenhuma migration, nenhuma policy nova, nenhuma RPC. A RLS de INSERT já existente cobre o caso; se a implementação parecer precisar de mais que isso, parar e reavaliar — provavelmente está errada.
- **RN-10**: o recorte de uma classe sem relação nenhuma cria um diagrama com uma classe só. É inútil, mas é o que o usuário pediu, é consistente e não corrompe nada — não bloquear (no máximo, deixar claro no texto do modal quantas classes serão criadas).

## Critérios de aceitação
- [x] CA-01: Com uma classe selecionada, `N` abre o modal de nome pré-preenchido; confirmando, um diagrama novo é criado no mesmo projeto e o app navega para ele.
- [x] CA-02: O diagrama criado contém exatamente a classe focada + as diretamente relacionadas, e todas as relações entre essas classes — o mesmo conjunto que a TASK-055 mostra no modal para a mesma classe.
- [x] CA-03: As classes do diagrama novo aparecem posicionadas e sem sobreposição, com os conectores UML corretos (tipo e multiplicidade preservados) e os cotovelos em lugar coerente (RN-06).
- [x] CA-04: Atributos, `stereotype` e `color` de cada classe copiada estão preservados.
- [x] CA-05: O diagrama de origem fica **inalterado** — mesmas classes, mesmas posições, mesmo `content` (a comparação depois da criação não pode acusar diff).
- [x] CA-06: O diagrama novo aparece na lista de Diagramas de Classes do projeto e reabre corretamente depois de um reload de página (persistiu de verdade).
- [x] CA-07: `N` com o foco num campo de texto digita a letra normalmente e não cria nada (RN-02).
- [x] CA-08: `N` sem seleção, ou com relação/comentário selecionado, não faz nada (RN-03).
- [x] CA-09: Usuário `visualizador` não tem o caminho na UI e, se o atalho for disparado, nada é criado (RN-01).
- [x] CA-10: Arrastar um card e apertar `N` imediatamente (dentro da janela de 800 ms do autosave) não perde a posição arrastada (RN-08).
- [x] CA-11: Falha na criação (simulável mockando `queries`) mostra erro, não navega e não deixa o diagrama de origem num estado estranho.
- [x] CA-12: O botão dentro do modal de foco cria o mesmo diagrama que o atalho (RN-07).
- [x] CA-13: `npm run build`, `npm run lint` e `npm test` limpos, sem warning novo.
- [x] CA-14: Validação ao vivo contra o Supabase real: recorte de uma classe de alta conectividade do diagrama real do ELIMS (ex.: `Sample`, 21 relações) criado, aberto, conferido e **excluído ao final** — sem tocar em nenhum diagrama real do usuário (mesmo protocolo de painel descartável das TASK-048..053).

## Impacto técnico
### Backend
Não aplicável — nenhuma Edge Function. A única exceção server-side do projeto continua sendo `admin-create-user` (ADR-010).
### Frontend
- `src/lib/supabase/queries.ts` — **função nova** `createDiagramWithContent(projectId, type, name, content)`: insert idêntico ao `createEmptyDiagram` (linha 233), só com `content` preenchido em vez de `{}`. Mesma camada única de acesso a dados (RN-01 da TASK-002 — componente nunca chama o SDK direto).
- `src/features/class-diagram/focusSubgraph.ts` — reaproveitado da TASK-055, sem duplicar lógica. Se precisar de ajuste de assinatura, ajustar lá (com os testes da TASK-055 passando).
- `src/features/class-diagram/ClassDiagramCanvas.tsx` — `useEffect` do atalho `N` (guardas RN-01/RN-02/RN-03) + modal de nome (mesmo padrão do `DiagramTypeListPage`, TASK-016) + tratamento de erro.
- `src/features/class-diagram/ClassFocusModal.tsx` (TASK-055) — botão da RN-07.
- `src/features/class-diagram/DiagramEditorPage.tsx` — provavelmente é aqui que a criação/navegação precisa acontecer de fato: é quem tem o `diagramId`, o autosave (RN-08) e acesso aos params de rota (`orgId`/`projectId`). Avaliar passar um callback ao `ClassDiagramCanvas` em vez de dar a ele conhecimento de rota/Supabase — o canvas hoje não fala com o Supabase, e manter essa separação vale mais que a economia de um prop.
- `useNavigate` (react-router-dom) — hoje só usado em `AppLayout.tsx:16`; este é o segundo uso.
### Banco de dados
**Nenhuma migration.** `diagrams` já aceita o insert (`project_id`, `type`, `name`, `content`), e `diagrams_insert` (`20260828130300_rls_policies.sql`) já autoriza `editor`. Nenhuma policy nova (RN-09).
### Integrações
Nenhuma. O contrato JSON de import/export (`src/features/import-export/schema.ts`) **não é tocado** — o recorte é montado em memória a partir de `ClassDiagramContent` já carregado, sem passar por serialização de contrato.
### Segurança
Nenhuma superfície nova: um INSERT a mais na mesma tabela, com a mesma policy já existente. O gate de UI por papel é reforço, não a garantia — a garantia é a RLS (mesma postura de todo o projeto).

## Plano de implementação
- [x] Confirmar que a TASK-055 já está implementada e commitada na branch (esta task depende de `focusSubgraph.ts`).
- [x] `createDiagramWithContent` em `queries.ts` + teste.
- [x] Função pura que monta o `content` do recorte a partir do subgrafo já posicionado (reaproveitando `focusSubgraph.ts`), com `notes` ausente e `controlX` recalculado (RN-06). Testes primeiro.
- [x] Modal de nome (sugestão pré-preenchida, contagem de classes do recorte no texto de apoio).
- [x] Fluxo de criação + navegação em `DiagramEditorPage.tsx`, com a garantia de save pendente da RN-08 e o tratamento de erro da CA-11.
- [x] `useEffect` do atalho `N` em `ClassDiagramCanvas.tsx` (guardas RN-01/02/03) chamando o callback.
- [x] Botão no `ClassFocusModal` (RN-07), só para `editor`.
- [x] Testes de componente.
- [x] Validar ao vivo contra o ELIMS real, com diagrama descartável, excluído ao final (CA-14).

## Estratégia de testes
- [x] Unitários: montagem do `content` do recorte (conjunto correto de classes/relações; `notes` ausente; `controlX` recalculado; atributos/`stereotype`/`color` preservados; ids reaproveitados conforme RN-05; o `content` de origem não é mutado).
- [x] Integração (mock de `src/lib/supabase/queries`, padrão já usado em `system-view/SystemViewPage.test.tsx`): sucesso cria com os argumentos certos (`projectId` correto, `type: 'classes'`, nome do modal) e navega para o id retornado; falha mostra erro e não navega (CA-11).
- [x] Componente (`ClassDiagramCanvas.test.tsx`): atalho respeita as 3 guardas (RN-01/02/03); botão do modal de foco dispara o mesmo caminho (CA-12).
- [ ] E2E: não aplicável (o repositório não tem E2E — ver `.claude/rules/global.md`).
- [x] Manual: contra o Supabase real (ELIMS), classe `Sample` — criar, conferir conteúdo/posições/conectores, reabrir depois de reload (CA-06), confirmar que o diagrama de origem não mudou (CA-05), excluir o diagrama de teste ao final. Testar também o caso da CA-10 (arrastar um card e apertar `N` imediatamente).

## Riscos e rollback
Risco maior que o da TASK-055, porque **escreve no banco**. Três pontos de atenção, todos com CA dedicada:
1. **Atalho de uma tecla que cria linha no banco** — a guarda de campo de texto (RN-02) é o que separa "atalho útil" de "criar diagramas lixo sem querer ao digitar". Se durante a implementação parecer frágil, o modal de nome (que já existe no fluxo) é a rede de segurança: nada é criado antes de o usuário confirmar ali.
2. **Perda de alteração pendente ao navegar** (RN-08) — o modo de falha é silencioso, por isso vira CA-10 explícita em vez de "cuidado ao implementar".
3. **Poluir a lista de diagramas do projeto** com recortes de teste — mitigado pelo protocolo de diagrama descartável já usado nas TASK-048..053.

Rollback: descartar a branch — `main` não é tocada. Diagramas criados durante o desenvolvimento são excluídos pelo caminho normal.

## Relação com a TASK-055
As duas nascem do mesmo pedido e compartilham a definição de recorte. A **fonte única** dessa definição é `focusSubgraph.ts` (TASK-055): mesmo conjunto de classes/relações e mesmo layout, de propósito — o diagrama criado pela TASK-056 deve abrir parecido com o que o usuário acabou de ver no modal da TASK-055. Se as duas divergirem no que consideram "as classes relacionadas", o produto fica incoerente (o `V` mostra um conjunto, o `N` cria outro).

Se por algum motivo o usuário decidir implementar só uma das duas, esta (`N`) ainda funciona sozinha — mas então o módulo `focusSubgraph.ts` e seus testes passam a fazer parte **desta** task, e a RN-07 (botão no modal de foco) cai por não haver modal.

## Registro de execução

### Alterações realizadas
- **`queries.ts`** — `createDiagramWithContent(projectId, type, name, content)` nova: mesmo insert de `createEmptyDiagram`, com `content` preenchido. Nenhuma migration, nenhuma policy (RN-09 cumprida).
- **`focusSubgraph.ts`** (da TASK-055) — `focusSubgraphToContent` (o recorte como `ClassDiagramContent`, sem `notes`, ids reaproveitados), `suggestedFocusDiagramName`, e o parâmetro `FocusLayoutMode` (`'compact' | 'full'`) no layout — ver "Divergências".
- **`ClassDiagramCanvas.tsx`** — `useEffect` do atalho `N` (guardas de `readOnly`, campo de texto e modificador), modal de nome com texto que descreve o que será criado, e `onCreateDerivedDiagram` novo na interface do componente. O canvas monta o "o quê"; a página sabe o "onde" — o canvas continua sem falar com o Supabase.
- **`DiagramEditorPage.tsx`** — `flushPendingSave()` (RN-08) e `handleCreateDerivedDiagram` (cria + navega); `useNavigate` (segundo uso no app, depois de `AppLayout`).
- **`ClassFocusModal.tsx`** — botão "Criar diagrama com este recorte" (RN-07), só quando o host sabe criar e o usuário é `editor`.
- **`src/index.css`** — bloco `TASK-056` (botão no cabeçalho do modal de foco + a dica de tecla, unificada com a da TASK-055).

### Arquivos principais
- `src/lib/supabase/queries.ts`
- `src/features/class-diagram/focusSubgraph.ts` + `focusSubgraph.test.ts`
- `src/features/class-diagram/ClassDiagramCanvas.tsx` + `ClassDiagramCanvas.test.tsx`
- `src/features/class-diagram/DiagramEditorPage.tsx` + `DiagramEditorPage.test.tsx`
- `src/features/class-diagram/ClassFocusModal.tsx`
- `src/index.css`

### Decisões
- **O canvas entrega o conteúdo pronto; a página decide onde ele vai parar.** `onCreateDerivedDiagram(name, content)` em vez de passar `focusClassId` para a página: o canvas é quem entende de diagrama, a página é quem entende de projeto/rota/Supabase. Mantém a regra da TASK-002 (componente nunca chama o SDK direto) sem inverter responsabilidade.
- **Prop opcional, não obrigatória** — sem `onCreateDerivedDiagram`, o atalho e os botões simplesmente não existem. É o que deixa o canvas montável em teste (e em qualquer host que não saiba criar diagrama) sem stub de Supabase.
- **`flushPendingSave` em vez de bloquear a navegação** — a alternativa seria avisar "há alterações não salvas". Mas o autosave é o contrato deste produto: o usuário não sabe que existe um debounce de 800ms e não deveria precisar saber. Gravar e seguir é o que ele já espera que aconteça.
- **Modal de nome como confirmação obrigatória** — além de nomear (precedente da TASK-016), é o que separa um atalho de uma tecla de "criar diagrama sem querer ao digitar". O texto diz quantas classes e relações serão criadas e avisa que é cópia independente, para a confirmação não ser às cegas.
- **Ids reaproveitados** (RN-05), conforme planejado. Efeito colateral observado ao vivo, positivo: como os ids são os mesmos, a seleção e o foco continuam válidos no diagrama recém-aberto.

### Divergências
Dois defeitos reais apareceram **só na validação ao vivo**, nenhum previsto nas CAs; os dois corrigidos aqui, com teste de regressão:

1. **O modal de foco ficava aberto por cima do diagrama recém-criado.** Navegar para o diagrama novo troca só o parâmetro da rota (`:diagramId`), então o React Router **não remonta** `DiagramEditorPage`/`ClassDiagramCanvas` — o estado `focusClassId` sobrevivia à navegação. Corrigido fechando os dois modais no sucesso (e mantendo os dois abertos no erro, para não perder o contexto).
2. **O diagrama criado nascia com os cards sobrepostos.** O layout da TASK-055 posiciona assumindo `FOCUS_CARD_HEIGHT` (56px), que é a altura do card **compacto do modal** — mas o diagrama de verdade renderiza o card inteiro, que no ELIMS real chega a 749px. Corrigido com o parâmetro `FocusLayoutMode`: `'compact'` (modal, altura fixa) e `'full'` (diagrama criado, `estimateClassCardHeight` por classe). O padrão continua `'compact'`, então a TASK-055 não muda de comportamento. **É o mesmo recorte e o mesmo algoritmo — só a altura de quem vai desenhar muda.**

Fora isso: **CA-09 não foi exercitada ao vivo** (exige um segundo usuário `visualizador` — mesma lacuna estrutural registrada desde a TASK-001), só por teste automatizado, em dois níveis (componente e página).

### Pendências
Nenhuma.

## Validação

```
npm run build
✓ built in 211ms (tsc -b limpo)

npm run lint
8 warnings — os mesmos 8 pré-existentes, nenhum novo

npx vitest run --exclude "**/.claude/worktrees/**"
✓ 36 arquivos, 365 testes (336 ao fim da TASK-055 + 29 novos:
  11 em focusSubgraph.test.ts, 14 em ClassDiagramCanvas.test.tsx,
  4 em DiagramEditorPage.test.tsx)
```

**Validação ao vivo** (dev server local contra o Supabase real, projeto ELIMS, diagrama real "QC e Calculo Análitico" — 17 classes, 14 relações):

- `AnalyticalMethod` selecionada → `N` → modal com o nome sugerido e o texto correto ("AnalyticalMethod + 5 classes relacionadas (5 relações)... cópia independente").
- Confirmado → diagrama criado e aberto: 6 classes, 5 relações, nome aplicado, rota trocada para o id novo (CA-01/CA-02).
- **Zero pares de cards sobrepostos** conferido por `getBoundingClientRect` depois da correção do `FocusLayoutMode` — alturas reais de 109px a 749px, com o empilhamento respeitando cada uma (CA-03). Atributos, estereótipo e conectores UML com multiplicidade preservados (CA-04).
- **Reload completo da página**: o diagrama continuou lá, íntegro (CA-06) — persistiu de verdade, não era só estado local.
- **Diagrama de origem inalterado** (CA-05): 17 classes / 14 relações, indicador de salvamento vazio — nenhuma gravação disparada nele durante todo o teste.
- **Botão dentro do modal de foco** confirmado abrindo o mesmo fluxo (CA-12).
- **Limpeza**: os 2 diagramas de teste criados nesta sessão (`TESTE-056 descartavel` e um `Foco — AnalyticalMethod` da rodada anterior à correção) foram excluídos ao final, cada um com a confirmação conferida pelo nome antes de apertar. Os 11 diagramas reais do projeto seguem intactos.

## Handoff
Nenhum handoff necessário — task implementada de ponta a ponta nesta sessão. As duas tasks da branch `feature/foco-classe-relacionadas` (TASK-055 e TASK-056) estão prontas; falta a decisão do usuário sobre mesclar em `main`.
