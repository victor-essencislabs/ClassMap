---
id: TASK-018
title: Nome próprio para cada módulo, na criação (Visão do Sistema)
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [system-view]
related_use_cases: []
related_adrs: []
---

# TASK-018 — Nome próprio para cada módulo, na criação (Visão do Sistema)

Task trivial e de escopo único — mesmo padrão já implementado na TASK-016 (nome de diagrama na criação), aplicado agora ao módulo dentro da Visão do Sistema. Sem ambiguidade de abordagem, pulando o ritual de 3 opções do `bootstrap-plan`.

## Contexto
Feedback do usuário (2026-08-29): "quando eu adiciono um módulo, seria interessante que eu pudesse adicionar o nome dele, para que fiquem separados com módulos pelo nome, exemplo, módulo account, módulo company etc, assim o cliente coloca a documentação necessária daquele módulo em específico, sabendo o nome dele, ao invés de ficar 'novo módulo'". Investigação confirmou que `SystemViewModule.name` já existe no tipo (`src/features/system-view/types.ts`) e já é exibido na sidebar (`.ov-module-title`, `src/features/system-view/SystemViewPage.tsx:127`) — mas `contentOperations.addModule` sempre grava `name: 'Novo módulo'` (`src/features/system-view/contentOperations.ts:39-42`), e não existe nenhum campo de edição de nome de módulo na UI (`updateModule` já existe em `contentOperations.ts:44-50`, mas não é chamado por nenhum componente).

## Problema
Todo módulo criado na Visão do Sistema nasce e permanece com o nome genérico "Novo módulo", sem nenhuma forma de diferenciá-los — um projeto com módulos "Account", "Company", "Billing" etc. hoje mostra três entradas idênticas "Novo módulo" na sidebar, tornando impossível saber qual bloco de entidades/campos/documentação pertence a qual módulo do sistema real.

## Objetivo
Ao clicar em "+ Módulo", pedir o nome do módulo antes de criá-lo (ex.: "Account", "Company"), e permitir renomeá-lo depois, já que módulos tendem a ser de longa duração (ao contrário do diagrama, que só é nomeado uma vez na criação).

## Fora de escopo
- Qualquer mudança de schema — `content` continua um JSONB livre em `diagrams`, `SystemViewModule.name` já existe no tipo.
- Unicidade de nome de módulo dentro do mesmo diagrama (não pedido; se dois módulos ficarem com o mesmo nome, é responsabilidade de quem edita).
- Qualquer mudança no schema JSON de import/export — Visão do Sistema já está fora do contrato Zod (TASK-005).

## Comportamento atual
`SystemViewPage.tsx` chama `ops.addModule(content)` direto ao clicar em "+ Módulo" (linha 116), sempre criando `{ name: 'Novo módulo', entities: [] }`. O nome é exibido em `.ov-module-title` (linha 127) como texto estático, sem input — não há como editá-lo depois.

## Comportamento esperado
- Clicar em "+ Módulo" abre um modal (reaproveitando `Modal`, TASK-010, mesmo padrão da TASK-016 em `DiagramsPage.tsx`) com um campo de texto vazio (placeholder "ex.: Account, Company"); confirmar cria o módulo com o nome digitado. Campo vazio/só espaços cai no padrão atual (`'Novo módulo'`), nunca cria com nome vazio.
- `.ov-module-title` na sidebar passa a ser editável inline quando `!readOnly` (mesmo padrão de `entity.name` em `EntityDetail`, que já usa um `<input>` ligado a `ops.updateEntity`) — chama `ops.updateModule(content, module.id, { name })`, já existente e sem uso até hoje.

## Regras de negócio
Nenhuma nova.

## Critérios de aceitação
- [x] CA-01: Criar um módulo com nome customizado ("Account") persiste e aparece exatamente assim na sidebar da Visão do Sistema. Coberto por teste automatizado (`SystemViewPage.test.tsx`, "CA-01").
- [x] CA-02: Deixar o campo vazio ao confirmar a criação usa o padrão atual ("Novo módulo"), sem erro. Coberto por teste automatizado (`SystemViewPage.test.tsx`, "CA-02", campo só com espaços) e por `contentOperations.test.ts` (`addModule` sem nome, com string vazia e com espaços).
- [x] CA-03: Renomear um módulo existente pela sidebar persiste o novo nome (autosave via `updateDiagramContent`, mesmo mecanismo já existente para entidade/campos). Coberto por teste automatizado (`SystemViewPage.test.tsx`, "CA-03", confirma `updateDiagramContent` chamado com o nome novo). Não validado manualmente contra o Supabase real (sobrevivência a reload real) — sem acesso a produção/segundo usuário nesta sessão, mesma ressalva de TASK-011..017.
- [x] CA-04: Em modo `visualizador` (`readOnly`), o nome do módulo aparece como texto, sem input editável nem botão "+ Módulo" — mesmo padrão já aplicado a entidade/campos nesta tela. Coberto por teste automatizado (`SystemViewPage.test.tsx`, "CA-04").
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos. Ver "Validação".

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/system-view/SystemViewPage.tsx` (modal de nome antes de `addModule`; input inline em `.ov-module-title` usando `ops.updateModule`, já existente em `contentOperations.ts`).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma.

## Plano de implementação
- [x] Modal de nome ao clicar em "+ Módulo" (reaproveitando `Modal`, mesmo padrão de `DiagramsPage.tsx`/TASK-016), com `name?.trim() || 'Novo módulo'` antes de chamar `ops.addModule` — `addModule` ganhou o parâmetro opcional `name?: string`.
- [x] Trocar `.ov-module-title` estático por `<input>` quando `!readOnly`, ligado a `ops.updateModule(content, module.id, { name: e.target.value })` — mesmo padrão de `ov-entity-name-input` (nova classe `.ov-module-title-input` em `index.css`).

## Estratégia de testes
- [x] Unitário: `contentOperations.test.ts` — `addModule` com nome custom e com nome vazio/espaços/ausente (fallback); `updateModule` ganhou teste explícito de renomeação preservando entidades.
- [x] Componente: `SystemViewPage.test.tsx` — modal abre, confirma com nome digitado (CA-01), campo vazio cai no padrão (CA-02), input de renomeação inline muda o nome exibido e persiste via `updateDiagramContent` (CA-03), `readOnly` não mostra input nem botão de criar (CA-04). Os 2 testes pré-existentes (RN-02, "+ Campo") foram ajustados para passar pelo modal em vez de criar o módulo direto.
- [ ] Manual: criar 2-3 módulos com nomes diferentes ("Account", "Company"), confirmar diferenciação na sidebar e persistência após reload — não realizado nesta sessão (sem acesso a produção/segundo usuário, mesma lacuna estrutural de TASK-011..017).

## Riscos e rollback
Risco muito baixo — mudança pequena e isolada a `system-view/`, sem tocar schema nem o contrato JSON. Rollback: reverter `SystemViewPage.tsx` e a assinatura de `addModule` em `contentOperations.ts`.

## Registro de execução
### Alterações realizadas
`contentOperations.addModule` ganhou o parâmetro opcional `name?: string`, com `name?.trim() || 'Novo módulo'` (mesmo fallback de `createEmptyDiagram`/TASK-016). `SystemViewPage.tsx`: o botão "+ Módulo" abre um `Modal` (reaproveitando o componente da TASK-010, mesmo padrão de `DiagramsPage.tsx`/TASK-016) com um campo de texto vazio (placeholder "ex.: Account, Company"); confirmar (`handleAddModule`) chama `ops.addModule(content, name)` e fecha o modal; Enter no campo também confirma. `.ov-module-title` deixou de ser sempre texto estático: quando `!readOnly`, vira um `<input>` ligado a `ops.updateModule(content, module.id, { name })` — o mesmo `updateModule` que já existia em `contentOperations.ts` desde a TASK-004, mas nunca era chamado por nenhum componente. Nova classe `.ov-module-title-input` em `index.css`, espelhando o par `.ov-entity-name`/`.ov-entity-name-input` já existente (mesmos tokens de hover/focus).

### Arquivos principais
- `src/features/system-view/contentOperations.ts` — `addModule(content, name?)`.
- `src/features/system-view/SystemViewPage.tsx` — modal de nome antes de `addModule`; input inline em `.ov-module-title`.
- `src/index.css` — `.ov-module-title-input` (novo).
- `src/features/system-view/contentOperations.test.ts` — testes de `addModule` (nome custom/fallback) e `updateModule` (renomeação preservando entidades).
- `src/features/system-view/SystemViewPage.test.tsx` — testes de CA-01..CA-04; os 2 testes pré-existentes ajustados para passar pelo modal (helper `createModule`); mock de `getMyProjectRole`/`updateDiagramContent` trocado para funções controláveis por teste (mesmo padrão de `DiagramsPage.test.tsx`), para poder simular `visualizador` (CA-04) e inspecionar o conteúdo salvo (CA-03).

### Decisões
- Além do modal na criação (o que foi pedido explicitamente), também tornei o nome do módulo editável depois, pelo mesmo padrão de `entity.name` — decisão registrada na própria task (ver "Objetivo"), porque módulo é uma entidade de vida longa e sem isso um módulo criado sem nome digitado ficaria preso a "Novo módulo" para sempre.
- Sem ADR — mesmo precedente da TASK-016 (mudança pequena, sem schema/contrato JSON envolvido).

### Divergências
Nenhuma — implementação seguiu exatamente o "Comportamento esperado" e o "Plano de implementação" da task.

### Pendências
- Validação manual contra o Supabase real (login de verdade) não foi feita — mesma lacuna estrutural de todas as TASK-011..018 desta fase do projeto (sem acesso a produção/segundo usuário nesta sessão). CA-01..CA-04 têm cobertura automatizada completa.

## Validação
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, mesmos warnings pré-existentes em outros arquivos — `AuthContext.tsx`, `Toast.tsx` —, nenhum novo).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — ok, 19 arquivos / 143 testes passando (todos os pré-existentes + os novos de `contentOperations.test.ts`/`SystemViewPage.test.tsx` desta task).

## Handoff
Nenhum — task fica em `active/` até a validação manual contra o Supabase real (mesmo padrão das demais tasks desta fase).
