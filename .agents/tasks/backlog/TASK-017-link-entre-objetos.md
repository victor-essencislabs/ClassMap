---
id: TASK-017
title: Link entre objetos no Diagrama de Objetos
status: backlog
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
- [ ] CA-01: Usuário `editor` ativa o modo de conexão, clica em dois objetos diferentes, e um link aparece entre eles no canvas.
- [ ] CA-02: Clicar duas vezes no mesmo objeto durante o modo de conexão não cria link (mesmo objeto como origem e destino).
- [ ] CA-03: Selecionar um link permite editar um rótulo opcional e excluí-lo pelo inspector.
- [ ] CA-04: Excluir um objeto remove todos os links que o referenciavam, sem erro nem link órfão visível.
- [ ] CA-05: Salvar e recarregar a página preserva os links (persistidos em `diagrams.content`, mesmo padrão de autosave já existente).
- [ ] CA-06: O card "Relações" da sidebar mostra a contagem real de links, não mais fixo em 0.
- [ ] CA-07: Exportar/gerar um JSON de diagrama (quando aplicável) nunca inclui `links` — CA explícito, para não regredir a decisão da ADR-006 silenciosamente no futuro.
- [ ] CA-08: `npm run build`, `npm run lint` e `npm test` limpos.

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
- [ ] Adicionar `ObjectLink` (`{ id, from, to, label? }`) e `links: ObjectLink[]` a `ObjectDiagramContent`.
- [ ] `contentOperations.ts`: `addLink`, `removeLink`, `updateLinkLabel`; ajustar `removeObject` para também remover links relacionados.
- [ ] Modo de conexão na topbar (reaproveitar `class-diagram/connectMode.ts`, sem duplicar a máquina de estado).
- [ ] Componente de conector simples (linha reta ortogonal + ponto de controle arrastável, sem losango/triângulo/seta).
- [ ] Inspector do link (rótulo opcional + excluir).
- [ ] Sidebar: substituir o "0" fixo de "Relações" pela contagem real (`content.links.length`).
- [ ] Confirmar que nenhum caminho de import/export inclui `links` (CA-07).

## Estratégia de testes
- [ ] Unitários: `contentOperations.test.ts` (criar link, remover link, remover objeto remove links relacionados, RN-01 não permite laço).
- [ ] Componente: fluxo completo do modo de conexão (`ObjectDiagramCanvas.test.tsx`), seleção/edição/exclusão de link pelo inspector.
- [ ] Manual: os 8 CAs num navegador real, nos dois temas (dark/light).

## Riscos e rollback
Baixo risco — mudança aditiva (`links` novo, opcional, começa vazio em todo diagrama existente), sem afetar objetos/diagramas já persistidos nem o contrato público. Rollback: reverter os arquivos alterados; diagramas existentes continuam funcionando sem links.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum — task ainda não iniciada.
