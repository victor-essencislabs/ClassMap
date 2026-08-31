---
id: TASK-026
title: UI de criar usuário pelo admin + troca obrigatória de senha no primeiro login
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [navigation, auth]
related_use_cases: []
related_adrs: [ADR-010]
---

# TASK-026 — UI de criar usuário + troca obrigatória de senha

## Contexto
Decisão registrada em `ADR-010`: o admin passa a criar a conta do usuário diretamente (e-mail + senha temporária), via a Edge Function `admin-create-user` (`TASK-025`, depende dela para existir de verdade — pode ser desenvolvida em paralelo usando um mock da chamada, mas só é validável de ponta a ponta depois da TASK-025 implantada). O usuário criado precisa ser obrigado a trocar a senha antes de continuar navegando. O autocadastro público (TASK-023) sai da tela de login.

## Problema
Hoje `AccessManagementModal` só sabe vincular alguém que **já tem conta** (`findUserIdByEmail`) — não existe nenhuma forma, pela UI, de criar uma conta nova com senha. E não existe nenhum mecanismo de forçar troca de senha no primeiro acesso.

## Objetivo
1. `AccessManagementModal` (organização e projeto) ganha uma segunda ação, "Criar novo usuário" — e-mail + senha temporária (com botão de gerar uma aleatória) + papel — ao lado da já existente "Adicionar por e-mail" (que continua servindo para alguém que já tem conta).
2. Login com uma conta marcada para troca de senha força uma tela de trocar senha antes de liberar qualquer navegação.
3. O papel escolhido (em qualquer um dos dois fluxos) ganha uma legenda curta do que ele permite.
4. A alternância pública "Criar conta" sai de `LoginPage` (rejeitado em `ADR-010`/supersede `ADR-009`) — cadastro deixa de ser uma ação que um visitante inicia sozinho.

## Fora de escopo
- A Edge Function em si (`TASK-025`).
- Selecionar múltiplos projetos de uma vez ao criar um usuário pela organização — o fluxo "Criar novo usuário" na organização só define o papel de organização; conceder acesso a um projeto específico continua sendo feito na tela do projeto (ver "Comportamento esperado" para o caso em que isso já vem consolidado).
- Reenviar/trocar a senha temporária de alguém depois de criada (se o admin errou a senha, a solução por ora é revogar e criar de novo — sem tela de "resetar senha").

## Comportamento atual
`AccessManagementModal.tsx` só tem o formulário "Adicionar por e-mail" (chama `findUserIdByEmail`, erro se não encontrar). `RequireAuth.tsx` só checa se há sessão — nenhuma lógica de senha obrigatória. `LoginPage.tsx` tem a alternância Entrar/Criar conta (TASK-023).

## Comportamento esperado

### `AccessManagementModal` — "Criar novo usuário"
- Uma alternância no topo do formulário de adicionar: "Já tem conta" (fluxo atual, por e-mail) / "Criar conta nova" (novo).
- No modo "Criar conta nova": campos e-mail, senha (com botão "Gerar senha" preenchendo um valor aleatório legível, ex. 12 caracteres) e o mesmo seletor de papel já existente. Confirmar chama a nova função `createUserWithPassword` (`queries.ts`, invoca a Edge Function).
  - **No modal de organização** (`OrganizationsPage`): cria com `organization_id` da org atual e o `org_role` escolhido (admin/member) — mesmo padrão de hoje, só que criando a conta em vez de exigir que já exista.
  - **No modal de projeto** (`ProjectsPage`): cria com `organization_id` da organização dona do projeto (já disponível — `ProjectsPage` já sabe o `orgId` da URL) **e** `project_id`/`project_role` do projeto atual — consolida os 2 passos (organização + projeto) numa ação só, já que uma pessoa recém-criada só via project_members não conseguiria nem navegar até a organização na lista de "Organizações" (RLS de `organizations_select` exige `organization_members`). Texto de ajuda no formulário deixa isso explícito: "Essa pessoa também será adicionada como membro de {organização}, para conseguir navegar até aqui."
- Sucesso: mostra a senha gerada de novo num aviso persistente (algo como "Conta criada. Repasse para {email}: senha `xxxxx` — ela vai precisar trocar no primeiro login."), já que depois de fechar o modal não há mais como recuperar essa senha (não fica guardada em lugar nenhum além do que a Admin API define).
- Erros: e-mail já cadastrado (409 da function) mostra mensagem clara sugerindo usar "Já tem conta" em vez de "Criar conta nova".

### Troca obrigatória de senha
- `RequireAuth.tsx` passa a checar `session.user.user_metadata?.must_change_password` — se `true`, renderiza uma tela nova (`ForcePasswordChangePage`, dentro de `src/features/auth/`) em vez de `children`, bloqueando qualquer navegação.
- `ForcePasswordChangePage`: formulário de nova senha (com confirmação), chama `supabase.auth.updateUser({ password, data: { must_change_password: false } })` (100% client-side — a própria pessoa trocando a própria senha, sem precisar de nenhum privilégio extra). Sucesso atualiza a sessão automaticamente (Supabase dispara `USER_UPDATED` no listener já existente em `AuthContext`) — `RequireAuth` re-renderiza e libera a navegação normal, sem precisar de reload manual.

### Legenda de papéis
- Ao lado do `<select>` de papel (nos dois modais, `AccessManagementModal`), uma linha curta explicando a opção selecionada: `visualizador` → "Só navega e visualiza os diagramas."; `editor` → "Cria, edita e exclui diagramas."; `member` → "Navega na organização; acesso a projetos é concedido à parte."; `admin` → "Gerencia acesso e pode excluir organização/projetos."

### Remoção do autocadastro público
- `LoginPage.tsx` volta a ter só o formulário de entrar (reverte a alternância da TASK-023) — `signUp` de `queries.ts` pode ficar (sem uso na UI, ou removido; decidir na implementação e registrar).

## Regras de negócio
- RN-01: criar um usuário pelo modal de projeto sempre inclui o vínculo de organização (`member`, por padrão) — nunca cria alguém só com `project_members` e nenhum jeito de navegar até lá.
- RN-02: a senha gerada/definida só é mostrada uma vez, na tela de sucesso do próprio fluxo de criação — nunca fica visível de novo depois de fechado o modal.

## Critérios de aceitação
- [ ] CA-01: criar um usuário pelo modal de organização cria a conta (via `TASK-025`) e já aparece na lista de membros da organização.
- [ ] CA-02: criar um usuário pelo modal de projeto cria a conta com vínculo de organização (`member`) **e** de projeto (papel escolhido) numa ação só.
- [ ] CA-03: logar com uma conta marcada para troca de senha mostra a tela de troca antes de qualquer outra rota; trocar a senha libera a navegação normal sem reload manual.
- [ ] CA-04: e-mail já cadastrado no modo "Criar conta nova" mostra erro claro, sem criar duplicata.
- [ ] CA-05: `LoginPage` não tem mais nenhuma opção de autocadastro público.
- [ ] CA-06: `npm run build`, `npm run lint` e `npm test` limpos.

## Impacto técnico
### Backend
Não aplicável (consome a function da TASK-025).
### Frontend
`src/lib/supabase/queries.ts` (`createUserWithPassword`, novo); `src/features/navigation/AccessManagementModal.tsx` (alternância + formulário de criar conta + legenda de papel); `src/features/navigation/OrganizationsPage.tsx`/`ProjectsPage.tsx` (passam `organization_id`/`project_id` para o novo fluxo); `src/features/auth/RequireAuth.tsx` (checagem de `must_change_password`); `src/features/auth/ForcePasswordChangePage.tsx` (novo); `src/features/auth/LoginPage.tsx` (remove alternância de cadastro).
### Banco de dados
Nenhuma mudança.
### Integrações
Chama a Edge Function da TASK-025 via `supabase.functions.invoke`.
### Segurança
Senha temporária só existe na tela de sucesso do próprio admin, uma vez — nunca persistida em nenhum estado além do necessário para exibir naquele momento.

## Plano de implementação
- [ ] `createUserWithPassword` em `queries.ts`.
- [ ] Alternância "Já tem conta"/"Criar conta nova" + formulário novo em `AccessManagementModal`.
- [ ] Wiring em `OrganizationsPage`/`ProjectsPage` (organização/projeto atuais).
- [ ] `ForcePasswordChangePage` + checagem em `RequireAuth`.
- [ ] Legenda de papel nos dois modais.
- [ ] Reverter `LoginPage` (remove alternância de cadastro).

## Estratégia de testes
- [ ] Componente: `AccessManagementModal.test.tsx` (estender) — criar conta chama `createUserWithPassword` com os parâmetros certos (organização vs. projeto), erro de e-mail duplicado exibido, legenda de papel muda com a seleção.
- [ ] Componente: `RequireAuth`/`ForcePasswordChangePage` (novo teste) — sessão com `must_change_password: true` mostra a tela de troca, não os `children`; trocar libera a navegação.
- [ ] Componente: `LoginPage.test.tsx` (ajustar) — remover os testes de CA-01/02 da TASK-023 (alternância não existe mais) ou adaptar para confirmar que ela **não** aparece.
- [ ] Manual: contra produção real, depois da TASK-025 implantada — ciclo completo (admin cria conta pelo projeto, pessoa loga, troca senha, acessa o projeto).

## Riscos e rollback
Risco baixo-médio — depende da TASK-025 existir de verdade para validação end-to-end; sem ela, dá para desenvolver a UI com `createUserWithPassword` mockado nos testes. Rollback: reverter os arquivos listados; `LoginPage` volta a ter (ou continua sem, dependendo da ordem) a alternância de autocadastro.

## Registro de execução
### Alterações realizadas
Implementado exatamente conforme o "Comportamento esperado": modo "Criar conta nova" no `AccessManagementModal` (organização e projeto), troca obrigatória de senha via `RequireAuth`/`ForcePasswordChangePage`, legenda de papel nos dois modos, e reversão de `LoginPage` (autocadastro público removido).

### Arquivos principais
- `src/lib/supabase/queries.ts` — `createUserWithPassword` (invoca a Edge Function, mapeia erros por código para mensagens amigáveis via `CREATE_USER_ERROR_MESSAGES`), `updatePassword` (client-side, `auth.updateUser`); `signUp` removido (sem uso depois da reversão de `LoginPage`).
- `src/features/navigation/AccessManagementModal.tsx` — alternância "Já tem conta"/"Criar conta nova", formulário de criar conta (e-mail, senha com botão "Gerar senha", papel), aviso persistente com a senha na tela de sucesso, `AccessRoleOption.description` (legenda).
- `src/features/navigation/OrganizationsPage.tsx`/`ProjectsPage.tsx` — passam `createUser`/`createUserHelpText` ao modal; `ORGANIZATION_ROLE_OPTIONS`/`PROJECT_ROLE_OPTIONS` ganharam `description`.
- `src/features/auth/RequireAuth.tsx` — checagem de `must_change_password`.
- `src/features/auth/ForcePasswordChangePage.tsx` (novo).
- `src/features/auth/LoginPage.tsx` — revertida (só formulário de entrar).
- `src/index.css` — `.access-add-mode-toggle`, `.btn.active`, `.field-hint`, `.field-with-action`, `.access-created-account`.
- Testes: `AccessManagementModal.test.tsx` (estendido), `RequireAuth.test.tsx` (novo), `LoginPage.test.tsx` (reescrito para CA-05), `OrganizationsPage.test.tsx`/`ProjectsPage.test.tsx` (mock de `createUserWithPassword` adicionado).
- `docs/architecture/components.md`, `docs/security/README.md` (seções 6/7) — atualizados.

### Decisões
- `signUp` **removido** de `queries.ts` (não só deixado sem uso) — mesmo raciocínio já aplicado a `removeModule`/`removeEntity` antes de serem religados: código morto sem nenhum chamador é sinalizado como problema neste projeto (ver spawn_task da TASK-021), então já não o deixei chegar a esse estado.
- Erro de e-mail duplicado tratado inteiramente em `createUserWithPassword` (mapeamento de `error.context.json()` de um `FunctionsHttpError` para mensagem amigável) — o componente só exibe `err.message`, sem lógica de código de erro na UI.
- Texto do estado vazio de `OrganizationsPage` (pedir acesso a um admin, mostrando o e-mail da sessão) **mantido como fallback**, não removido — decisão registrada no snapshot: ainda é o texto certo para alguém autenticado sem organização nenhuma, mesmo sem autocadastro público como causa principal desse estado agora.
- Papel de organização (`org_role`) do fluxo "Criar conta nova" no modal de **projeto** fixado em `'member'` (RN-01) — sem seletor extra, mesmo default já usado no restante do produto.

### Divergências
Nenhuma — comportamento esperado implementado como descrito na task.

### Pendências
- **Validação manual de ponta a ponta (CA-01..03, CA-06 parcial) depende do deploy da TASK-025** — sem a Edge Function em produção, não há como testar contra o Supabase real. CA-04 (e-mail duplicado) e CA-05 (sem autocadastro em `LoginPage`) já são verificáveis por inspeção/teste automatizado, e foram.
- Achado incidental durante a validação: `.claude/worktrees/` tem 7 worktrees git obsoletos de uma rodada anterior de subagentes paralelos (já mesclados em `main`) que inflam `npx vitest run` sem `--exclude` de 27 para 151 arquivos — sinalizado ao usuário via `spawn_task`, fora do escopo desta task.

## Validação
- `npm run build` — limpo.
- `npm run lint` — limpo (só os 3 warnings pré-existentes de `AuthContext.tsx`/`Toast.tsx`, não relacionados a esta task).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — **189 testes, 27 arquivos, todos passando** (rodar sem o `--exclude` conta também os worktrees obsoletos, ver "Pendências").
- Validação manual contra produção (CA-01..03): **pendente do deploy da TASK-025**, ver task irmã.

## Handoff
Código pronto para revisão. Falta: (1) decisão do usuário sobre o deploy da Edge Function (TASK-025); (2) depois disso, o ciclo manual completo — admin cria conta pelo modal de projeto, pessoa loga, troca senha, acessa o projeto — contra produção real.
