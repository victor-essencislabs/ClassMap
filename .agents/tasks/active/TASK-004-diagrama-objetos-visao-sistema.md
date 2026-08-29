---
id: TASK-004
title: Diagrama de Objetos e Visão do Sistema
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [object-diagram, system-view]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-004 — Diagrama de Objetos e Visão do Sistema

## Contexto
Quarta task do MVP (ver ADR-001), depende do Diagrama de Classes (**TASK-003**) já existir — o Diagrama de Objetos referencia classes já criadas, e a Visão do Sistema é uma visualização complementar de nível de detalhe mais fino.

## Problema
Hoje só existe o Diagrama de Classes. Falta (1) a visualização de instâncias concretas (Diagrama de Objetos) e (2) a visão de sistema completo no nível de planilha técnica que o gestor pede recorrentemente (Visão do Sistema).

## Objetivo
Implementar o Diagrama de Objetos (instâncias vinculadas a uma classe, herdando seus atributos) e a Visão do Sistema (navegação módulo → entidade, com os blocos Campos / Métodos de API / Regras de Permissão).

## Fora de escopo
- Import/export em arquivo JSON (TASK-005).
- Geração automática de objetos por IA a partir de código-fonte (isso é a skill `gerar-diagrama-classmap`, usada em outros repositórios, não aqui).

## Comportamento atual
Só o Diagrama de Classes existe (TASK-003).

## Comportamento esperado
**Diagrama de Objetos:**
- Usuário `editor` cria um objeto vinculado a uma classe existente do Diagrama de Classes do mesmo projeto.
- O objeto herda automaticamente a lista de atributos da classe; o usuário só preenche os valores.
- Persistência/recarregamento preservam o estado, igual ao Diagrama de Classes.

**Visão do Sistema:**
- Navegação por módulo → entidade.
- Ao selecionar uma entidade, 3 blocos sempre presentes: Campos (coluna DB, tipo, restrições PK/FK/autoincrement/obrigatoriedade/unicidade, tipo no model, tipo no DTO, regra de validação, tipo no frontend), Métodos de API (controller → service → repository, código de permissão vinculado quando existir), Regras de Permissão (descrição + condição de código).

## Regras de negócio
- RN-01: Um objeto sempre referencia uma classe existente e herda sua lista de atributos — nunca um atributo solto sem classe correspondente.
- RN-02: A Visão do Sistema sempre expõe os 3 blocos por entidade selecionada — nenhum bloco é omitido, mesmo vazio (ver `.claude/agents/frontend-diagramas.md`).
- RN-03: Edição só é permitida a usuário `editor` (mesmo reforço de UI das tasks anteriores).

## Critérios de aceitação
- [x] CA-01: Usuário `editor` cria um objeto vinculado a uma classe existente e vê a lista de atributos herdada automaticamente. Validado via teste de componente; **validado em produção em 2026-08-29** — objeto "instância : Cliente" criado a partir da classe real "Cliente" (TASK-003), herdando `id`/`nome` automaticamente.
- [x] CA-02: Preencher e salvar valores de atributo de um objeto persiste e recarrega corretamente. Lógica testada (`contentOperations.test.ts`, round-trip JSON); **persistência real via Supabase validada em 2026-08-29** — `id = 42`/`nome = "Maria Silva"` preenchidos e confirmados intactos após reload completo da página.
- [x] CA-03: A Visão do Sistema lista módulos e, dentro deles, entidades navegáveis. Validado via teste de componente; **validado em produção em 2026-08-29** — módulo e entidade "Pedido" criados e navegáveis via `.ov-nav`/`.ov-entity-btn` reais (layout da TASK-009).
- [x] CA-04: Selecionar uma entidade sempre exibe os 3 blocos (Campos, Métodos de API, Regras de Permissão), mesmo que algum esteja vazio. Validado via teste de componente e de lógica pura; **validado em produção em 2026-08-29** — os 3 blocos renderizados vazios ao criar a entidade, depois preenchidos (1 campo com badge PK, 1 método com badge de permissão, 1 regra de permissão com condição destacada) e confirmados persistidos após reload.
- [ ] CA-05: Usuário `visualizador` acessa as duas visualizações sem controles de edição. Validado via teste de componente; **validação end-to-end contra produção ainda pendente** — mesma causa registrada nas TASK-001/002/003 (sem segundo usuário real disponível).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/` e `src/features/system-view/`.
### Banco de dados
Reutiliza a coluna de conteúdo de diagrama já existente. Uma migration
nova (`20260828140000_diagrams_add_system_view_type.sql`) estende o
`CHECK` de `diagrams.type` para aceitar `'system-view'` — decisão
registrada abaixo em "Decisões": a Visão do Sistema também vive como um
`diagrams.content` (JSONB), não como tabelas relacionais novas.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma nova além do já coberto pelas tasks anteriores.

## Plano de implementação
- [x] Diagrama de Objetos: seletor de classe existente, herança automática de atributos, formulário de valores.
- [x] Visão do Sistema: navegação módulo→entidade e os 3 blocos de conteúdo.
- [x] Persistência/recarregamento via Supabase — código pronto (mesmo padrão de autosave debounced da TASK-003); round-trip real ainda não exercitado.
- [x] Reforço de UI visualizador/editor.

## Estratégia de testes
- [x] Unitários: lógica de herança de atributos do objeto (`object-diagram/contentOperations.test.ts`, 7 casos) e lógica de módulo/entidade/campo/método/regra da Visão do Sistema (`system-view/contentOperations.test.ts`, 9 casos).
- [x] Componente: `ObjectDiagramCanvas.test.tsx` (CA-01, CA-05) e `SystemViewPage.test.tsx` (CA-03, CA-04, com a camada Supabase mockada via `vi.mock`).
- [x] Manual: os 5 critérios de aceitação, num navegador real. **Como `editor`, validado em 2026-08-29** (CA-01/02/03/04); como `visualizador`, segue pendente (CA-05, sem segunda conta).
- [x] Integração: persistência real contra o Supabase. **Validado em 2026-08-29** — objeto e Visão do Sistema, ambos persistidos e recarregados corretamente contra o projeto `classmap` real.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se a Visão do Sistema precisar de uma fonte de dados distinta do Diagrama de Classes (ex.: metadados de banco/DTO que não fazem parte do schema JSON de diagrama), isso pode exigir uma extensão de schema não prevista na TASK-001 — sinalizar como divergência assim que identificado, não decidir silenciosamente.

## Registro de execução
### Alterações realizadas
Diagrama de Objetos completo: cards de instância, herança automática de
atributos ao escolher uma classe de um Diagrama de Classes do mesmo
projeto, edição de valores em painel lateral. Visão do Sistema completa:
navegação módulo→entidade, com os 3 blocos (Campos/Métodos de
API/Regras de Permissão) sempre renderizados por entidade, cada um
editável como tabela/lista. Ambos com autosave debounced via Supabase,
seguindo o mesmo padrão da TASK-003.

### Arquivos principais
- `supabase/migrations/20260828140000_diagrams_add_system_view_type.sql` — estende `diagrams.type` para aceitar `'system-view'`.
- `src/features/object-diagram/`: `types.ts`, `contentOperations.ts` (+ `.test.ts`), `ObjectCard.tsx`, `ObjectDiagramCanvas.tsx` (+ `.test.tsx`), `ObjectDiagramPage.tsx`.
- `src/features/system-view/`: `types.ts`, `contentOperations.ts` (+ `.test.ts`), `SystemViewPage.tsx` (+ `.test.tsx`).
- `src/features/navigation/DiagramRouterPage.tsx` — nova: despacha a rota `/orgs/:orgId/projects/:projectId/diagrams/:diagramId` para a tela certa conforme `diagram.type`.
- `src/features/navigation/DiagramsPage.tsx` — "Criar diagrama" agora oferece os 3 tipos (classes/objetos/visão do sistema); todo diagrama é clicável (antes só `type: 'classes'` era).
- `src/lib/supabase/types.ts` — `DiagramType` ganhou `'system-view'`.
- `src/features/class-diagram/types.ts` — `isClassDiagramContent` extraído de `DiagramEditorPage.tsx` para ser reaproveitado pelo Diagrama de Objetos (que precisa ler as classes de um Diagrama de Classes existente).

### Decisões
- **Visão do Sistema reaproveita `diagrams`/`diagrams.content` (JSONB)**, com uma migration nova só para estender o `CHECK` de `type` — decidido em vez de criar tabelas relacionais próprias (módulos/entidades/campos/métodos/regras). Justificativa: o conteúdo é hierárquico e usado só dentro de uma tela (nenhuma query relacional cross-entidade é necessária agora), e reaproveitar `diagrams` evita duplicar RLS/permissão de projeto para um terceiro tipo de conteúdo. Revisitar via ADR se a Visão do Sistema precisar um dia de busca/relatório cross-projeto que só SQL relacional resolve bem.
- **Objeto herda atributos por SNAPSHOT na criação, não por referência viva** à classe de origem (RN-01) — o objeto guarda sua própria cópia de `{id, name, type}` por atributo. Mais simples e resiliente (o Diagrama de Objetos não quebra se a classe original for renomeada/excluída depois), ao custo de não acompanhar uma mudança posterior nos atributos da classe. Documentado em `object-diagram/types.ts`; revisitar se o produto precisar de sincronização viva.
- **`DiagramRouterPage` faz uma segunda leitura do diagrama** (só para saber `type`) além da leitura que cada tela específica já faz — redundância pequena e aceitável neste estágio, evitando um refactor maior para repassar o diagrama já carregado entre um roteador genérico e três telas bem distintas.
- **Regras de Permissão sem estrutura tipada de "condição"** — `codeCondition` é texto livre (ex.: `"user.papel === 'admin'"`), não uma DSL estruturada. Mais simples para o MVP; formalizar como DSL é decisão de produto futura, não desta task.

### Divergências
Nenhuma do plano original.

### Pendências
- ~~Persistência real (CA-02) e validação manual em navegador~~ — **feito em 2026-08-29** como `editor` (ver CA-01 a CA-04 acima).
- **CA-05 como `visualizador`** segue sem confirmação end-to-end — exige um segundo usuário real, indisponível nesta sessão (mesma causa das TASK-001/002/003).
- Um Diagrama de Objetos sem nenhum Diagrama de Classes no mesmo projeto
  ainda funciona (mostra aviso "crie um Diagrama de Classes antes"), mas
  isso não foi testado com múltiplos Diagramas de Classes no mesmo
  projeto — cenário plausível, não crítico para o MVP.

## Validação
- `npm test` (`vitest run`): 34 testes, 6 arquivos — todos passando
  (11 de `class-diagram/contentOperations`, 5 de `ClassDiagramCanvas`,
  7 de `object-diagram/contentOperations`, 2 de `ObjectDiagramCanvas`,
  9 de `system-view/contentOperations`, 2 de `SystemViewPage`, todos
  sem erros não tratados).
- `npm run build` (`tsc -b && vite build`): sem erros de tipo.
- `npm run lint` (`oxlint`): 0 erros (mesmos 2 avisos pré-existentes).
- Migration `20260828140000_diagrams_add_system_view_type.sql` validada
  contra Postgres local: `type = 'system-view'` aceito, tipo inválido
  continua rejeitado pelo `CHECK`.
- **2026-08-29, contra produção real** (usuário logado pelo navegador,
  papel `editor`): Diagrama de Objetos criado, objeto "instância :
  Cliente" adicionado a partir da classe real "Cliente" (herança
  automática de `id`/`nome` confirmada), valores `42`/`"Maria Silva"`
  preenchidos e persistidos após reload. Visão do Sistema criada, módulo
  + entidade "Pedido" adicionados, os 3 blocos preenchidos (1 campo com
  badge PK, 1 método com badge de permissão "PEDIDO_CRIAR", 1 regra de
  permissão com condição `user.role === 'admin'`) e confirmados
  persistidos após reload. CA-05 (`visualizador`) não testado (sem
  segunda conta).

## Handoff
CA-01/02/03/04 fechados contra produção real em 2026-08-29, para as
duas visualizações desta task. Falta só CA-05 (`visualizador`) — exige
um segundo usuário real, mesma pendência registrada na
TASK-001/002/003. Só então mover TASK-001/002/003/004 para
`completed/`. Depois disso, a sequência natural do ADR-001 segue para a
TASK-005 (contrato JSON de import/export, deploy na Vercel e validação
com o time).
