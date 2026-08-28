---
id: TASK-003
title: Diagrama de Classes — canvas, cards e conectores UML
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-003 — Diagrama de Classes: canvas, cards e conectores UML

## Contexto
Terceira task do MVP (ver ADR-001), depende da navegação autenticada da **TASK-002** já existir (é dentro dela que o usuário abre um diagrama). É a visualização mais importante do produto — a que substitui o Visual Paradigm no dia a dia do time.

## Problema
Hoje um diagrama criado na TASK-002 é só um registro vazio no banco — não há nenhuma forma de desenhar ou visualizar classes, atributos e relações.

## Objetivo
Implementar o Diagrama de Classes completo: canvas com cards de classe (nome, estereótipo opcional, atributos) e conectores ortogonais com os 5 tipos de relação UML (associação, agregação, composição, herança, dependência) e multiplicidade opcional — persistindo e recarregando o estado via Supabase, respeitando a permissão editor/visualizador.

## Fora de escopo
- Diagrama de Objetos e Visão do Sistema (TASK-004).
- Import/export em arquivo JSON (TASK-005) — nesta task o diagrama só precisa persistir no banco.
- Personalização de cor por card (roadmap "Personalização", fora do MVP).

## Comportamento atual
Diagrama existe só como registro vazio no banco (resultado da TASK-002).

## Comportamento esperado
- Canvas onde o usuário `editor` cria/edita/remove cards de classe (nome, estereótipo opcional, lista de atributos com nome e tipo).
- Conectores ortogonais (ângulo reto, ponto de controle arrastável) entre duas classes, com o tipo escolhido em um seletor visual: associação (seta simples), agregação (losango vazado), composição (losango preenchido), herança (triângulo vazado), dependência (seta tracejada).
- Multiplicidade opcional (`1`, `0..*`, `n`) em cada ponta do conector.
- Conteúdo do diagrama (classes + relações) persistido na coluna de conteúdo (JSON/JSONB) do registro de diagrama no Supabase.
- Usuário `visualizador` vê o diagrama renderizado, sem controles de edição.

## Regras de negócio
- RN-01: Os 5 tipos de relação UML são todos suportados, com o símbolo geométrico correto — nenhum deve ser simplificado para um único tipo de seta genérico (ver `.claude/agents/frontend-diagramas.md`).
- RN-02: Conectores são ortogonais (ângulo reto), não curvas suaves — estilo Visual Paradigm, decisão deliberada de produto.
- RN-03: Edição só é permitida a usuário com papel `editor` no projeto (reforço de UI; garantia real é RLS da TASK-001).

## Critérios de aceitação
- [x] CA-01: Usuário `editor` cria uma classe com nome, estereótipo opcional e ao menos 2 atributos. Validado via teste de componente (`ClassDiagramCanvas.test.tsx`); validação manual num navegador real ainda pendente (ver "Pendências").
- [x] CA-02: Usuário `editor` cria uma relação de cada um dos 5 tipos entre duas classes, cada uma renderizada com o símbolo correto. Validado via teste de componente; conferência visual (o símbolo geométrico *parece* certo, não só existe no DOM) ainda pendente.
- [x] CA-03: Multiplicidade opcional é exibida corretamente nas duas pontas de um conector, quando preenchida. Validado via teste de componente.
- [ ] CA-04: Salvar e recarregar a página preserva exatamente o estado do diagrama (classes, atributos, relações, multiplicidade, posições). A serialização em si é validada (round-trip JSON.stringify/parse, `contentOperations.test.ts`); **persistência real via Supabase pendente** (mesma causa das TASK-001/002 — nenhum projeto real).
- [x] CA-05: Usuário `visualizador` visualiza o diagrama completo, mas não tem acesso a nenhum controle de edição. Validado via teste de componente.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
Todo o escopo: `src/features/class-diagram/` (canvas, `ClassCard`, `Connector`).
### Banco de dados
Nenhuma mudança de schema — usa a coluna de conteúdo do diagrama já criada na TASK-001.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma nova além do reforço de UI já coberto pela TASK-001/002.

## Plano de implementação
- [x] Definir a estrutura de dados interna do diagrama (classes/atributos/relações) — feita como superset do schema JSON de `contrato-ia-diagrama` (mesmos nomes `classes`/`attributes`/`relationships`/`from`/`to`/`type`, ver `src/features/class-diagram/types.ts`). **Não é ainda o contrato formal da TASK-005** — os tokens de `RelationshipType` precisam ser confirmados (ou virar ADR) quando a TASK-005 formalizar o schema público.
- [x] Implementar `ClassCard` (criação/edição de nome, estereótipo, atributos).
- [x] Implementar `Connector` ortogonal com ponto de controle arrastável.
- [x] Implementar o seletor de tipo de relação (5 símbolos) e o campo de multiplicidade.
- [x] Persistir/recarregar o conteúdo do diagrama via Supabase — código pronto (`getDiagram`/`updateDiagramContent`, autosave debounced); **round-trip real ainda não exercitado** (sem projeto Supabase).
- [x] Aplicar reforço de UI para visualizador/editor.

## Estratégia de testes
- [x] Unitários: lógica de serialização/desserialização do conteúdo do diagrama (`contentOperations.test.ts` — 11 casos, incluindo round-trip `JSON.stringify`/`JSON.parse`).
- [x] Componente: interação de UI sem depender de um backend real (`ClassDiagramCanvas.test.tsx` — 5 casos, cobrindo CA-01, CA-02, CA-03 e CA-05 no nível de DOM/jsdom).
- [ ] Manual: os 5 critérios de aceitação, com usuários `editor` e `visualizador`, num navegador real. **Pendente** — precisa de sessão autenticada real (mesma pendência da TASK-002).
- [ ] Integração: persistência real contra o Supabase (não mock) para CA-04. **Pendente**.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se a estrutura de dados interna divergir do schema JSON de import/export definido em `contrato-ia-diagrama`, há retrabalho na TASK-005 — mitigar desenhando os dois juntos desde o início desta task.

## Registro de execução
### Alterações realizadas
Canvas completo do Diagrama de Classes: cards de classe arrastáveis,
conectores ortogonais com ponto de controle arrastável e os 5 símbolos
UML corretos, painel lateral de edição (classe e relação), multiplicidade
opcional nas duas pontas, e persistência via Supabase (autosave com
debounce de 800ms). Rota nova:
`/orgs/:orgId/projects/:projectId/diagrams/:diagramId`, ligada a partir
da lista de diagramas da TASK-002 (só para diagramas `type: 'classes'`;
`type: 'objects'` mostra "em breve", TASK-004).

Durante a escrita dos testes de componente, um bug real foi encontrado e
corrigido antes de qualquer uso real: clicar num conector selecionava e
imediatamente desselecionava no mesmo evento, porque o clique borbulhava
até o `onClick` de deselecionar do `<svg>` de fundo. Corrigido com
`e.stopPropagation()` no `<g>` do conector.

### Arquivos principais
- `src/features/class-diagram/types.ts` — `ClassDiagramContent`, convenção de símbolos.
- `src/features/class-diagram/contentOperations.ts` — lógica pura de edição (testável sem renderizar componentes).
- `src/features/class-diagram/ClassCard.tsx`, `Connector.tsx`, `ClassDiagramCanvas.tsx`, `DiagramEditorPage.tsx`.
- `src/features/class-diagram/contentOperations.test.ts` (11 testes) e `ClassDiagramCanvas.test.tsx` (5 testes).
- `vitest.config.ts`, `src/test/setup.ts` — infraestrutura de teste (jsdom + Testing Library) introduzida nesta task.
- `src/lib/supabase/queries.ts` — `getDiagram`/`updateDiagramContent` adicionados.

### Decisões
- **Estrutura interna do diagrama é um superset do contrato JSON já documentado** em `.claude/agents/contrato-ia-diagrama.md` (mesmos nomes de campo), acrescentando posição/ponto de controle/ids — não é o contrato formal em si; a TASK-005 ainda precisa confirmar os tokens exatos de `RelationshipType` (`association`/`aggregation`/`composition`/`inheritance`/`dependency`) e decidir se posições entram no export ou ficam só internas.
- **Convenção de símbolo por ponta**: losango (agregação/composição) na ponta `from` (quem tem o campo/coleção); seta (associação/dependência) e triângulo (herança) na ponta `to`. Documentada em `types.ts`; combinar com `contrato-ia-diagrama` ao formalizar o schema.
- **Roteamento ortogonal de 3 segmentos** com um único ponto de controle horizontal (`controlX`) — mais simples que múltiplos pontos, ainda assim arrastável e sempre ortogonal (RN-02).
- **Nova relação por formulário (De/Tipo/Para), não por arrastar-e-conectar** — mais simples e confiável de implementar/testar; arrastar para conectar pode ser revisitado depois como melhoria de UX, não é regra de negócio.
- **Altura do card é estimada, não medida do DOM** (`estimateClassCardHeight`) — evita a complexidade de `ResizeObserver`/refs só para ancorar conectores; suficiente para o objetivo (conector mirar a área do card, não um pixel exato).
- **Suíte de testes (Vitest + Testing Library + jsdom) introduzida nesta task** — primeira vez que o repositório tem testes automatizados; escolhida por já integrar nativamente com Vite.

### Divergências
Nenhuma do plano original.

### Pendências
- Mesma pendência das TASK-001/002: nenhum projeto Supabase real
  provisionado neste ambiente. CA-04 (persistência real) e a validação
  manual em navegador (CA-01/02/03/05 fora do jsdom) ficam para quando
  houver acesso a computador — autorização já registrada.
- TASK-005 deve revisitar `RelationshipType` e a presença de
  posição/ponto de controle no schema público antes de fechar o
  contrato formal (não é um problema agora, é um lembrete para não
  esquecer).

## Validação
- `npm test` (`vitest run`): 16 testes, 2 arquivos —
  `contentOperations.test.ts` (11, lógica pura + round-trip de
  serialização) e `ClassDiagramCanvas.test.tsx` (5, interação de UI:
  CA-01, CA-02 com os 5 tipos de relação, CA-03, exclusão em cascata,
  CA-05). Todos passando, sem erros não tratados.
- `npm run build` (`tsc -b && vite build`): sem erros de tipo.
- `npm run lint` (`oxlint`): 0 erros (mesmos 2 avisos de estilo pré-existentes em `AuthContext.tsx`).
- Validação manual em navegador contra dados reais: não feita nesta sessão (ver "Pendências").

## Handoff
Próxima sessão com acesso a computador: além dos passos já listados no
handoff da TASK-002 (provisionar Supabase, preencher `.env.local`,
criar usuários de teste), abrir o Diagrama de Classes de ponta a ponta
como `editor` e como `visualizador` para validar CA-01/02/03/04/05
visualmente (símbolos corretos, drag funcionando, persistência real) —
só então mover TASK-001/002/003 para `completed/`.
