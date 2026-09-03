---
id: TASK-055
title: Criar diagrama novo (tecla N) com a classe selecionada e as relacionadas
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [class-diagram, navigation, supabase-queries]
related_use_cases: []
related_adrs: []
---

# TASK-055 — Criar diagrama novo (tecla N) com a classe selecionada e as relacionadas

> **Branch obrigatória**: mesma branch da TASK-054 — `feature/foco-classe-relacionadas`, criada a partir de `main`. Esta task **não** é implementada em `main`, e nada vai para o remoto ou para `main` sem pedido explícito do usuário. Mesmo padrão de `feature/animacoes-sistema` (TASK-038..045).
>
> **Depende da TASK-054**: consome `focusSubgraph.ts` (subgrafo induzido + layout), criado lá. Implementar depois dela, na mesma branch — ver "Relação com a TASK-054".

## Contexto
Segundo pedido do usuário na mesma conversa da TASK-054 (2026-09-03): além do modal efêmero de foco (`V`), poder apertar `N` com uma classe selecionada e **criar um diagrama de classes novo** contendo só aquela classe e as classes com que ela se relaciona. A diferença de intenção entre as duas é clara e deliberada: `V` é para *olhar agora* (não persiste nada), `N` é para *destacar um recorte e trabalhar nele depois* — um diagrama de verdade, salvo no projeto, que aparece na lista, pode ser editado, renomeado, exportado e compartilhado como qualquer outro.

Motivação de fundo, a mesma da TASK-054: o diagrama real do ELIMS tem 85 classes e 190 relações num painel só. Recortar um subdomínio ("tudo que toca `Sample`") é hoje um trabalho 100% manual — criar diagrama vazio, recriar cada classe à mão, recriar cada relação.

**Sem ritual de 3 opções/ADR**: não muda contrato JSON, não muda schema Postgres, não muda RLS, não introduz infraestrutura nova. É uma composição de peças que já existem (a criação de diagrama do `DiagramTypeListPage`, o `content` montado programaticamente do import, o subgrafo da TASK-054). O único ponto novo que merecia debate — reaproveitar ou regenerar os ids das classes copiadas — está decidido e justificado abaixo (RN-05).

## Problema
Não existe nenhum caminho para derivar um diagrama de outro. Confirmado no levantamento:
- `createEmptyDiagram(projectId, type, name)` (`src/lib/supabase/queries.ts:233`) é a **única** forma de criar diagrama, e sempre insere `content: {}`.
- O import de JSON **não** cria diagrama: `ImportExportControls` → `importClassDiagram` → `onImport` está ligado ao `handleChange` do `DiagramEditorPage` (linha 168), ou seja, **sobrescreve o diagrama aberto**.

Ou seja, hoje recortar um subdomínio significa recriar tudo à mão, ou exportar o JSON inteiro, editar fora do produto e importar por cima de um diagrama novo criado à parte.

## Objetivo
Com uma classe selecionada, `N` cria no **mesmo projeto** um diagrama de classes novo contendo a classe focada, as classes diretamente relacionadas a ela e as relações entre elas — já posicionadas (mesmo layout do modal da TASK-054) — e abre esse diagrama.

## Fora de escopo
- **Vínculo vivo entre o diagrama-mãe e o derivado**: o novo diagrama é uma **cópia independente**, um snapshot. Editar a classe no derivado não altera o original, e vice-versa. Mesmo precedente já adotado no Diagrama de Objetos (atributos herdados por snapshot na criação, TASK-004). Sincronizar/mesclar de volta não está no escopo e não deve ser sugerido pela UI.
- **Vizinhança de 2+ níveis**, escolher quais vizinhas entram, ou recortar a partir de várias classes selecionadas — o pedido é o mesmo conjunto da TASK-054.
- **Diagrama de Objetos** e **Visão do Sistema**: só Diagrama de Classes (`type = 'classes'`).
- **Copiar cards de comentário (`notes`)**: nota é anotação livre sem vínculo com classe (ADR-013) — não há critério para dizer que uma nota pertence ao recorte. O diagrama novo nasce sem notas.
- **Desfazer a criação**: excluir o diagrama derivado usa o caminho normal já existente (TASK-028).

## Comportamento atual
`N` não faz nada (nenhum atalho `'n'`/`'N'` em `src/`). Criar diagrama só pelo botão `+ Diagrama de Classes` do `DiagramTypeListPage`, que abre um modal pedindo o nome (TASK-016) e chama `createEmptyDiagram` — content vazio, e **sem navegar** para o diagrama criado (só recarrega a lista).

## Comportamento esperado
1. Com uma classe selecionada, foco fora de campo de texto e usuário `editor`, `N` abre um modal pedindo o **nome** do novo diagrama, pré-preenchido com uma sugestão baseada na classe focada (ex.: `Foco — Sample`).
2. Confirmando, o diagrama é criado no mesmo projeto com `type = 'classes'` e o `content` do recorte já posicionado.
3. Concluída a criação, o app navega para o diagrama novo (`/orgs/:orgId/projects/:projectId/diagrams/:novoId`), que abre normalmente pelo `DiagramsRouteDispatcher` → `DiagramRouterPage` → `DiagramEditorPage`.
4. O mesmo recorte também pode ser criado por um botão dentro do modal de foco da TASK-054 (RN-07) — o que o usuário está vendo ali é exatamente o que vai virar diagrama.
5. Erro na criação (rede/RLS) mostra o erro e **não** navega — o diagrama de origem continua aberto e intacto.

## Regras de negócio
- **RN-01**: só `editor` (`!readOnly`). `visualizador` não cria diagrama — o INSERT seria recusado pela RLS (`diagrams_insert` exige `project_role(project_id) = 'editor'`), e a UI não deve nem oferecer o caminho. Diferente do `V` da TASK-054, que é liberado para todo mundo.
- **RN-02**: `N` nunca dispara com o foco num `input`/`textarea`/`select` — senão digitar "n" no nome de uma classe criaria um diagrama. Mesma guarda de `document.activeElement` da TASK-052. Esta regra é mais crítica aqui que na TASK-052: o efeito colateral é **escrita no banco**, não uma janela que fecha com `Esc`.
- **RN-03**: `N` só age com uma **classe** selecionada (não relação, não comentário, não vazio).
- **RN-04**: o diagrama novo é criado **no mesmo projeto** do diagrama de origem, com `type = 'classes'` — nunca em outro projeto, nunca com outro tipo. (Atenção ao valor literal: o token de tipo em `diagrams.type` é `'classes'`, não `'class'`.)
- **RN-05**: os ids de classe/atributo/relação são **reaproveitados**, não regenerados. Eles vivem dentro do JSONB, sem unicidade global nem FK, e `relationships.from`/`to` só precisam ser válidos dentro do próprio `content` — reaproveitar mantém tudo consistente sem remapeamento (portanto sem a classe inteira de bugs de remapear `from`/`to` errado) e preserva a rastreabilidade "esta classe é a mesma classe do diagrama-mãe". Se algum dia existir sincronização de volta, aí sim isso vira uma decisão a rever — e é exatamente por isso que fica registrada aqui como decisão consciente, não como acidente.
- **RN-06**: `x`/`y` **são** recalculados pelo layout do recorte (as posições do diagrama-mãe não fazem sentido num diagrama de 8 classes), e `controlX` de cada relação é recalculado junto — copiar o `controlX` antigo com posições novas produz conectores com o cotovelo em lugar absurdo. `color` (ADR-005) e `stereotype` são copiados como estão.
- **RN-07**: o modal de foco da TASK-054 ganha um botão que dispara exatamente este mesmo fluxo (mesmo caminho de código do atalho `N`), visível só para `editor`. É o lugar mais honesto para oferecer isso: o usuário está vendo o recorte exato que será criado.
- **RN-08**: antes de navegar para o diagrama novo, qualquer alteração pendente do diagrama **atual** precisa estar salva. O autosave do `DiagramEditorPage` tem debounce de 800 ms (`AUTOSAVE_DELAY_MS`) — navegar dentro dessa janela desmonta o componente e **perde** a alteração pendente (ex.: arrastar um card e apertar `N` em seguida). Garantir a gravação antes de navegar, ou não navegar.
- **RN-09**: nenhuma migration, nenhuma policy nova, nenhuma RPC. A RLS de INSERT já existente cobre o caso; se a implementação parecer precisar de mais que isso, parar e reavaliar — provavelmente está errada.
- **RN-10**: o recorte de uma classe sem relação nenhuma cria um diagrama com uma classe só. É inútil, mas é o que o usuário pediu, é consistente e não corrompe nada — não bloquear (no máximo, deixar claro no texto do modal quantas classes serão criadas).

## Critérios de aceitação
- [ ] CA-01: Com uma classe selecionada, `N` abre o modal de nome pré-preenchido; confirmando, um diagrama novo é criado no mesmo projeto e o app navega para ele.
- [ ] CA-02: O diagrama criado contém exatamente a classe focada + as diretamente relacionadas, e todas as relações entre essas classes — o mesmo conjunto que a TASK-054 mostra no modal para a mesma classe.
- [ ] CA-03: As classes do diagrama novo aparecem posicionadas e sem sobreposição, com os conectores UML corretos (tipo e multiplicidade preservados) e os cotovelos em lugar coerente (RN-06).
- [ ] CA-04: Atributos, `stereotype` e `color` de cada classe copiada estão preservados.
- [ ] CA-05: O diagrama de origem fica **inalterado** — mesmas classes, mesmas posições, mesmo `content` (a comparação depois da criação não pode acusar diff).
- [ ] CA-06: O diagrama novo aparece na lista de Diagramas de Classes do projeto e reabre corretamente depois de um reload de página (persistiu de verdade).
- [ ] CA-07: `N` com o foco num campo de texto digita a letra normalmente e não cria nada (RN-02).
- [ ] CA-08: `N` sem seleção, ou com relação/comentário selecionado, não faz nada (RN-03).
- [ ] CA-09: Usuário `visualizador` não tem o caminho na UI e, se o atalho for disparado, nada é criado (RN-01).
- [ ] CA-10: Arrastar um card e apertar `N` imediatamente (dentro da janela de 800 ms do autosave) não perde a posição arrastada (RN-08).
- [ ] CA-11: Falha na criação (simulável mockando `queries`) mostra erro, não navega e não deixa o diagrama de origem num estado estranho.
- [ ] CA-12: O botão dentro do modal de foco cria o mesmo diagrama que o atalho (RN-07).
- [ ] CA-13: `npm run build`, `npm run lint` e `npm test` limpos, sem warning novo.
- [ ] CA-14: Validação ao vivo contra o Supabase real: recorte de uma classe de alta conectividade do diagrama real do ELIMS (ex.: `Sample`, 21 relações) criado, aberto, conferido e **excluído ao final** — sem tocar em nenhum diagrama real do usuário (mesmo protocolo de painel descartável das TASK-048..053).

## Impacto técnico
### Backend
Não aplicável — nenhuma Edge Function. A única exceção server-side do projeto continua sendo `admin-create-user` (ADR-010).
### Frontend
- `src/lib/supabase/queries.ts` — **função nova** `createDiagramWithContent(projectId, type, name, content)`: insert idêntico ao `createEmptyDiagram` (linha 233), só com `content` preenchido em vez de `{}`. Mesma camada única de acesso a dados (RN-01 da TASK-002 — componente nunca chama o SDK direto).
- `src/features/class-diagram/focusSubgraph.ts` — reaproveitado da TASK-054, sem duplicar lógica. Se precisar de ajuste de assinatura, ajustar lá (com os testes da TASK-054 passando).
- `src/features/class-diagram/ClassDiagramCanvas.tsx` — `useEffect` do atalho `N` (guardas RN-01/RN-02/RN-03) + modal de nome (mesmo padrão do `DiagramTypeListPage`, TASK-016) + tratamento de erro.
- `src/features/class-diagram/ClassFocusModal.tsx` (TASK-054) — botão da RN-07.
- `src/features/class-diagram/DiagramEditorPage.tsx` — provavelmente é aqui que a criação/navegação precisa acontecer de fato: é quem tem o `diagramId`, o autosave (RN-08) e acesso aos params de rota (`orgId`/`projectId`). Avaliar passar um callback ao `ClassDiagramCanvas` em vez de dar a ele conhecimento de rota/Supabase — o canvas hoje não fala com o Supabase, e manter essa separação vale mais que a economia de um prop.
- `useNavigate` (react-router-dom) — hoje só usado em `AppLayout.tsx:16`; este é o segundo uso.
### Banco de dados
**Nenhuma migration.** `diagrams` já aceita o insert (`project_id`, `type`, `name`, `content`), e `diagrams_insert` (`20260828130300_rls_policies.sql`) já autoriza `editor`. Nenhuma policy nova (RN-09).
### Integrações
Nenhuma. O contrato JSON de import/export (`src/features/import-export/schema.ts`) **não é tocado** — o recorte é montado em memória a partir de `ClassDiagramContent` já carregado, sem passar por serialização de contrato.
### Segurança
Nenhuma superfície nova: um INSERT a mais na mesma tabela, com a mesma policy já existente. O gate de UI por papel é reforço, não a garantia — a garantia é a RLS (mesma postura de todo o projeto).

## Plano de implementação
- [ ] Confirmar que a TASK-054 já está implementada e commitada na branch (esta task depende de `focusSubgraph.ts`).
- [ ] `createDiagramWithContent` em `queries.ts` + teste.
- [ ] Função pura que monta o `content` do recorte a partir do subgrafo já posicionado (reaproveitando `focusSubgraph.ts`), com `notes` ausente e `controlX` recalculado (RN-06). Testes primeiro.
- [ ] Modal de nome (sugestão pré-preenchida, contagem de classes do recorte no texto de apoio).
- [ ] Fluxo de criação + navegação em `DiagramEditorPage.tsx`, com a garantia de save pendente da RN-08 e o tratamento de erro da CA-11.
- [ ] `useEffect` do atalho `N` em `ClassDiagramCanvas.tsx` (guardas RN-01/02/03) chamando o callback.
- [ ] Botão no `ClassFocusModal` (RN-07), só para `editor`.
- [ ] Testes de componente.
- [ ] Validar ao vivo contra o ELIMS real, com diagrama descartável, excluído ao final (CA-14).

## Estratégia de testes
- [ ] Unitários: montagem do `content` do recorte (conjunto correto de classes/relações; `notes` ausente; `controlX` recalculado; atributos/`stereotype`/`color` preservados; ids reaproveitados conforme RN-05; o `content` de origem não é mutado).
- [ ] Integração (mock de `src/lib/supabase/queries`, padrão já usado em `system-view/SystemViewPage.test.tsx`): sucesso cria com os argumentos certos (`projectId` correto, `type: 'classes'`, nome do modal) e navega para o id retornado; falha mostra erro e não navega (CA-11).
- [ ] Componente (`ClassDiagramCanvas.test.tsx`): atalho respeita as 3 guardas (RN-01/02/03); botão do modal de foco dispara o mesmo caminho (CA-12).
- [ ] E2E: não aplicável (o repositório não tem E2E — ver `.claude/rules/global.md`).
- [ ] Manual: contra o Supabase real (ELIMS), classe `Sample` — criar, conferir conteúdo/posições/conectores, reabrir depois de reload (CA-06), confirmar que o diagrama de origem não mudou (CA-05), excluir o diagrama de teste ao final. Testar também o caso da CA-10 (arrastar um card e apertar `N` imediatamente).

## Riscos e rollback
Risco maior que o da TASK-054, porque **escreve no banco**. Três pontos de atenção, todos com CA dedicada:
1. **Atalho de uma tecla que cria linha no banco** — a guarda de campo de texto (RN-02) é o que separa "atalho útil" de "criar diagramas lixo sem querer ao digitar". Se durante a implementação parecer frágil, o modal de nome (que já existe no fluxo) é a rede de segurança: nada é criado antes de o usuário confirmar ali.
2. **Perda de alteração pendente ao navegar** (RN-08) — o modo de falha é silencioso, por isso vira CA-10 explícita em vez de "cuidado ao implementar".
3. **Poluir a lista de diagramas do projeto** com recortes de teste — mitigado pelo protocolo de diagrama descartável já usado nas TASK-048..053.

Rollback: descartar a branch — `main` não é tocada. Diagramas criados durante o desenvolvimento são excluídos pelo caminho normal.

## Relação com a TASK-054
As duas nascem do mesmo pedido e compartilham a definição de recorte. A **fonte única** dessa definição é `focusSubgraph.ts` (TASK-054): mesmo conjunto de classes/relações e mesmo layout, de propósito — o diagrama criado pela TASK-055 deve abrir parecido com o que o usuário acabou de ver no modal da TASK-054. Se as duas divergirem no que consideram "as classes relacionadas", o produto fica incoerente (o `V` mostra um conjunto, o `N` cria outro).

Se por algum motivo o usuário decidir implementar só uma das duas, esta (`N`) ainda funciona sozinha — mas então o módulo `focusSubgraph.ts` e seus testes passam a fazer parte **desta** task, e a RN-07 (botão no modal de foco) cai por não haver modal.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Link para o handoff ativo, quando aplicável.
