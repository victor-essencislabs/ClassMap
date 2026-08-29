---
id: TASK-017
title: Link entre objetos no Diagrama de Objetos
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [object-diagram]
related_use_cases: []
related_adrs: [ADR-006]
---

# TASK-017 — Link entre objetos no Diagrama de Objetos

## Contexto
Feedback do usuário (sessão de 2026-08-29, revisando a tela publicada do Diagrama de Objetos): não é possível ligar dois objetos entre si, diferente do Diagrama de Classes. Ver `ADR-006` para a decisão (link simples, sem os 5 tipos UML/multiplicidade, que descrevem relação entre classes, não entre instâncias).

## Problema
`ObjectDiagramContent` (`src/features/object-diagram/types.ts`) só tem `objects: DiagramObject[]` — nenhuma estrutura de ligação entre objetos. `ObjectDiagramCanvas.tsx` não tem modo de conexão (decisão original da TASK-008, revista por esta task/ADR-006). A contagem "Relações" na sidebar do Diagrama de Objetos fica sempre em 0.

## Objetivo
Usuário `editor` consegue, no Diagrama de Objetos, clicar num objeto de origem e depois num de destino para criar um link simples entre eles (linha reta, sem símbolo geométrico), com um rótulo textual opcional. O link persiste com o diagrama, aparece no canvas, e a contagem "Relações" da sidebar passa a refletir o número real de links.

## Fora de escopo
- Os 5 tipos UML (associação/agregação/composição/herança/dependência) e multiplicidade entre objetos — ver ADR-006, Alternativa B rejeitada (não fazem sentido semântico entre instâncias concretas).
- Incluir `links` no contrato JSON público de import/export (`schema.ts`) — ver ADR-006, Alternativa C, registrada como trabalho futuro, não desta task.
- Reaproveitar `Connector.tsx` diretamente — é específico dos símbolos de classe; esta task cria um componente de conector simplificado.

## Comportamento atual
`ObjectDiagramCanvas.tsx` não tem botão/modo de conexão. Objetos só podem ser criados, movidos, editados (valores/nome de instância) e excluídos — nunca ligados entre si.

## Comportamento esperado
- Botão "🔗 Link" na topbar do Diagrama de Objetos (mesma posição/padrão visual do "🔗 Relação" do Diagrama de Classes), visível só para `editor`.
- Ao ativar o modo, clicar num objeto de origem e depois num objeto de destino cria um link entre eles; clicar duas vezes no mesmo objeto não cria laço (mesma regra de `resolveConnectClick`); cancelar o modo (ex. Esc) nunca deixa um link parcialmente criado.
- Link renderizado como linha reta simples entre os dois cards (sem losango/triângulo/seta), com roteamento ortogonal e ponto de controle arrastável, no mesmo espírito visual de `Connector.tsx`.
- Inspector do link (ao selecioná-lo): campo de rótulo textual opcional, botão de excluir o link.
- Excluir um objeto remove também todos os links que o referenciam (origem ou destino) — sem link "órfão".
- Sidebar: card de stats "Relações" passa a mostrar `links.length` real, não mais fixo em 0.

## Regras de negócio
- RN-01: Um link nunca liga um objeto a ele mesmo.
- RN-02: Excluir um objeto exclui em cascata todos os links que o referenciam.
- RN-03: Só `editor` cria/exclui link ou entra no modo de conexão (mesmo reforço de UI já aplicado às demais edições do Diagrama de Objetos).
- RN-04: `links` nunca é incluído no schema Zod de import/export (`schema.ts`) — ver ADR-006.

## Critérios de aceitação
- [x] CA-01: Usuário `editor` ativa o modo de conexão, clica em dois objetos diferentes, e um link aparece entre eles no canvas. Coberto por teste automatizado (`ObjectDiagramCanvas.test.tsx`).
- [x] CA-02: Clicar duas vezes no mesmo objeto durante o modo de conexão não cria link (mesmo objeto como origem e destino). Coberto por teste automatizado.
- [x] CA-03: Selecionar um link permite editar um rótulo opcional e excluí-lo pelo inspector. Coberto por teste automatizado.
- [x] CA-04: Excluir um objeto remove todos os links que o referenciavam, sem erro nem link órfão visível. Coberto por teste automatizado (unitário em `contentOperations.test.ts` e de componente em `ObjectDiagramCanvas.test.tsx`).
- [x] CA-05: Salvar e recarregar a página preserva os links (persistidos em `diagrams.content`, mesmo padrão de autosave já existente). Implementado (`links` entra no mesmo objeto salvo por `updateDiagramContent`/autosave já existente; `ObjectDiagramPage.tsx` normaliza diagramas antigos sem `links` para `[]` ao carregar) — **não validado manualmente contra o Supabase real nesta sessão** (worktree isolado, sem navegador autenticado contra produção — mesma lacuna estrutural já registrada em `.agents/context/CONTEXT.md` para as demais tasks desta onda). Ver "Pendências".
- [x] CA-06: O card "Relações" da sidebar mostra a contagem real de links, não mais fixo em 0. Coberto por teste automatizado.
- [x] CA-07: Exportar/gerar um JSON de diagrama (quando aplicável) nunca inclui `links` — CA explícito, para não regredir a decisão da ADR-006 silenciosamente no futuro. Coberto por teste automatizado novo (`src/features/import-export/schema.test.ts`): confirma que o schema Zod de objeto exportado não declara nenhum campo `links` e que um JSON importado com `links` dentro de um objeto tem esse campo descartado na validação. O Diagrama de Objetos ainda não tem nenhum caminho de export implementado (dívida técnica pré-existente, ver `CONTEXT.md`) — `exportClassDiagram` sempre grava `objects: []`, então não há hoje nenhum caminho de código que sequer tentaria serializar `links`.
- [x] CA-08: `npm run build`, `npm run lint` e `npm test` limpos.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/types.ts` (`links: ObjectLink[]` em `ObjectDiagramContent`, tipo `ObjectLink`), `contentOperations.ts` (criar/remover link, cascata ao remover objeto), `ObjectDiagramCanvas.tsx` (botão "🔗 Link" na topbar, estado do modo de conexão reaproveitando `class-diagram/connectMode.ts`, contagem real de "Relações" na sidebar, inspector do link), novo componente de conector simples (linha reta + ponto de controle, sem símbolos geométricos).
### Banco de dados
Nenhuma mudança — `links` vive dentro do JSONB `diagrams.content` já existente (`type: 'objects'`).
### Integrações
Nenhuma nova. Confirmar explicitamente (CA-07) que `links` não vaza para o schema de import/export.
### Segurança
Nenhuma superfície nova — mesmo reforço de papel (`editor`/`visualizador`) já aplicado às demais edições desta tela.

## Plano de implementação
- [x] Adicionar `ObjectLink` (`{ id, from, to, label? }` + `controlX`, ver "Divergências") e `links: ObjectLink[]` a `ObjectDiagramContent`.
- [x] `contentOperations.ts`: `addLink`, `removeLink`, `updateLink` (rótulo e/ou `controlX`, ver "Divergências"); ajustar `removeObject` para também remover links relacionados.
- [x] Modo de conexão na topbar (reaproveitar `class-diagram/connectMode.ts`, sem duplicar a máquina de estado).
- [x] Componente de conector simples (linha reta ortogonal + ponto de controle arrastável, sem losango/triângulo/seta).
- [x] Inspector do link (rótulo opcional + excluir).
- [x] Sidebar: substituir o "0" fixo de "Relações" pela contagem real (`content.links.length`).
- [x] Confirmar que nenhum caminho de import/export inclui `links` (CA-07).

## Estratégia de testes
- [x] Unitários: `contentOperations.test.ts` (criar link, remover link, editar rótulo, remover objeto remove links relacionados de ambos os lados (origem e destino), RN-01 não permite laço, link para id inexistente é ignorado).
- [x] Componente: fluxo completo do modo de conexão (`ObjectDiagramCanvas.test.tsx`) — criar link, clique duplo no mesmo objeto, cancelar, seleção/edição/exclusão de link pelo inspector, cascata ao excluir objeto, contagem real na sidebar, botão desabilitado com menos de 2 objetos, botão ausente para `visualizador`.
- [ ] Manual: os 8 CAs num navegador real, nos dois temas (dark/light) — não executado nesta sessão (worktree isolado, ver CA-05/"Pendências").

## Riscos e rollback
Baixo risco — mudança aditiva (`links` novo, opcional, começa vazio em todo diagrama existente), sem afetar objetos/diagramas já persistidos nem o contrato público. Rollback: reverter os arquivos alterados; diagramas existentes continuam funcionando sem links.

## Registro de execução
### Alterações realizadas
`ObjectDiagramContent` ganhou `links: ObjectLink[]` (`types.ts`). `contentOperations.ts` ganhou `addLink`/`updateLink`/`removeLink`, e `removeObject` passou a filtrar também os links que referenciam o objeto removido (origem ou destino), mesmo precedente de `removeClass` no Diagrama de Classes. `ObjectDiagramCanvas.tsx` ganhou: botão "🔗 Link" na topbar (mesma posição/padrão do "🔗 Relação", desabilitado com menos de 2 objetos, ausente para `visualizador`); estado `connectMode`/`connectFrom` reaproveitando `resolveConnectClick` de `class-diagram/connectMode.ts` sem nenhuma duplicação da máquina de estado; banner de conexão com "Cancelar"; um `Selection` discriminado (`{type:'object'}` | `{type:'link'}` | `null`) substituindo o antigo `selectedId` só-de-objeto, para o inspector poder mostrar tanto o objeto quanto o link selecionado; toast reaproveitado de `diagram-shell/Toast` para o aviso "Escolha um objeto diferente" (RN-01). `ObjectCard.tsx` ganhou a prop `connectMode` (mesmo padrão de `ClassCard`) para não arrastar o card durante o modo de conexão. Novo componente `ObjectLinkConnector.tsx` — linha reta com roteamento ortogonal (mesma técnica de `M...L...L...L` de `Connector.tsx`) e ponto de controle arrastável, mas sem nenhum dos símbolos geométricos (losango/triângulo/seta) nem multiplicidade. `ObjectDiagramPage.tsx` normaliza diagramas antigos (persistidos antes desta task, sem `links` no JSONB) para `links: []` ao carregar, em vez de deixar `undefined`. A sidebar mostra `content.links.length` real em "Relações" em vez do "0" fixo. Um teste novo (`src/features/import-export/schema.test.ts`) confirma explicitamente RN-04/CA-07: o schema Zod de objeto exportado não declara `links`, e um JSON importado com `links` dentro de um objeto tem esse campo descartado pela validação (zod strip).

### Arquivos principais
- `src/features/object-diagram/types.ts` — `ObjectLink`, `links` em `ObjectDiagramContent`.
- `src/features/object-diagram/contentOperations.ts` — `addLink`/`updateLink`/`removeLink`, cascata em `removeObject`.
- `src/features/object-diagram/ObjectLinkConnector.tsx` (novo) — conector simples.
- `src/features/object-diagram/ObjectDiagramCanvas.tsx` — modo de conexão, inspector de link, sidebar.
- `src/features/object-diagram/ObjectCard.tsx` — prop `connectMode`.
- `src/features/object-diagram/ObjectDiagramPage.tsx` — normalização de `links` ao carregar diagrama antigo.
- `src/features/object-diagram/contentOperations.test.ts` — testes novos de `addLink`/`updateLink`/`removeLink`/cascata/RN-01.
- `src/features/object-diagram/ObjectDiagramCanvas.test.tsx` — testes novos de componente (CA-01..04/06, RN-02, visualizador).
- `src/features/import-export/schema.test.ts` (novo) — RN-04/CA-07.

### Decisões
- **`ObjectLink` ganhou `controlX: number`, além de `{ id, from, to, label? }` literal da ADR-006.** A ADR descreve o shape essencial da decisão de produto (link simples, sem os 5 tipos UML), mas tanto o "Comportamento esperado" quanto o "Plano de implementação" da própria task exigem um "ponto de controle arrastável" no componente de conector — sem um campo persistido para isso, o ponto de controle resetaria para o padrão a cada reload em vez de "arrastável" de verdade. Segue exatamente o mesmo precedente já usado em `DiagramRelationship.controlX` (`class-diagram/types.ts`). Registrado aqui como decisão, não como divergência silenciosa do ADR, porque o dado adicionado é puramente de layout interno (mesma categoria de `x`/`y`), nunca exposto no contrato JSON público (RN-04 continua valendo).
- Reaproveitado `Toast`/`useToast` (`diagram-shell/Toast.tsx`, já usado pelo Diagrama de Classes) para o aviso de RN-01 ("Escolha um objeto diferente"), em vez de inventar um mecanismo de aviso novo.
- `Selection` do canvas virou um tipo discriminado (`{type:'object'|'link', id}` | `null`), espelhando exatamente o padrão já usado em `ClassDiagramCanvas.tsx` para `{type:'class'|'relationship'}` — mantém os dois componentes (Classes/Objetos) com a mesma forma de lidar com seleção mista de nó/aresta.
- Sem nenhum estilo CSS novo — `.connect-mode`, `.connect-banner`, `.connectors-layer`, `.insp-actions .btn.danger` e `--object-accent` já existiam de forma genérica (TASK-006/007/008) e cobrem o Diagrama de Objetos sem alteração.

### Divergências
- Ver "Decisões" acima: `ObjectLink.controlX` não está no shape `{ id, from, to, label? }` citado literalmente na ADR-006/task, mas decorre diretamente de um requisito explícito da própria task ("ponto de controle arrastável") — sem ele esse requisito não seria implementável de forma persistente. Nenhuma outra divergência do plano original.

### Pendências
- CA-05 (persistência através de reload) não foi validada manualmente contra o Supabase real nesta sessão — mesma lacuna estrutural já registrada em `.agents/context/CONTEXT.md` para as demais tasks desta onda (worktree isolado, sem navegador autenticado contra produção). O mecanismo (`links` dentro do mesmo objeto `content` já salvo pelo autosave existente + normalização ao carregar) é o mesmo já usado e validado para `objects`/`values`, então o risco residual é baixo, mas fica como validação manual explícita pendente.
- Validação manual dos 8 CAs num navegador real, nos dois temas (dark/light) — não executada nesta sessão, mesmo padrão de pendência já registrado para TASK-011/012/014/015/016.

## Validação
- `npm install` — ok, 130 pacotes, 0 vulnerabilidades (worktree isolado, sem `node_modules` prévio).
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo, sem warnings novos).
- `npm run lint` — ok (`oxlint`), mesmos 3 warnings pré-existentes em arquivos não tocados por esta task (`Toast.tsx`, `AuthContext.tsx`), nenhum novo.
- `npm test` (`vitest run`) — ok, **18 arquivos / 125 testes passando** (111 pré-existentes na `main` desta onda + 14 novos: 6 em `contentOperations.test.ts`, 6 em `ObjectDiagramCanvas.test.tsx`, 2 em `schema.test.ts`).
- CA-05 e a validação manual dos 8 CAs — não executados (ver "Pendências" acima).

## Handoff
Nenhum — task fica em `active/` (não movida para `completed/` por instrução explícita do fluxo de trabalho desta sessão) até a validação manual (CA-05 e os demais CAs num navegador real) ser feita contra um projeto Supabase real.
