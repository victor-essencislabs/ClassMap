# Snapshot — TASK-025 (+ TASK-026)

Gerado em: 2026-08-31
Task: `.agents/tasks/backlog/TASK-025-edge-function-admin-cria-usuario.md` (`supabase-multitenant`) e `.agents/tasks/backlog/TASK-026-ui-criar-usuario-trocar-senha.md` (`frontend-diagramas`) — as duas nasceram do mesmo ADR e formam um par: a TASK-026 consome a Edge Function da TASK-025, mas dá para desenvolver a UI em paralelo com a chamada mockada (só não valida de ponta a ponta sem a TASK-025 implantada). Este snapshot cobre as duas.

## ADR de referência

`.agents/decisions/ADR-010-provisionamento-usuario-pelo-admin-edge-function.md` — decisão completa (contexto, alternativas rejeitadas, plano de adoção). Resumo: o autocadastro público (`ADR-009`, agora `superseded`) esbarrou no limite real de **2 e-mails/hora** do serviço de e-mail padrão do Supabase (achado ao vivo, produção real, sessão de 2026-08-31). Novo modelo: o admin cria a conta do colega direto (e-mail + senha temporária), via uma Edge Function que usa a Admin API do Supabase — **primeiro componente de backend próprio do ClassMap**. Escopo de acesso continua em 2 níveis separados (organização e projeto) — decisão tomada junto, sem mudar isso.

## Assinaturas de código necessárias

### Backend (TASK-025)

- `supabase/migrations/20260828130200_auth_helpers.sql` — funções já existentes que a function **deve reaproveitar**, nunca reescrever:
  - `is_org_admin(p_organization_id uuid) returns boolean` — checa se `auth.uid()` é admin daquela organização.
  - `is_project_org_admin(p_project_id uuid) returns boolean` — idem, mas resolvendo a organização a partir do projeto.
  - Ambas `security definer`, `grant execute ... to authenticated` — chamáveis via RPC (`client.rpc('is_org_admin', { p_organization_id })`) usando um client com o JWT de quem chama, **não** a service role.
- `supabase/migrations/20260828130300_rls_policies.sql` — políticas que já autorizam os `insert` que a function vai fazer (com o client do chamador, não a service role):
  - `organization_members_insert` — `with check (is_org_admin(organization_id))`.
  - `project_members_insert` — `with check (is_project_org_admin(project_id))`.
- Nenhuma migration nova é esperada nesta task — só a Edge Function em si, em `supabase/functions/admin-create-user/index.ts` (arquivo ainda não existe, `supabase/functions/` ainda não existe no repositório).
- `supabase/README.md` — seção "Gestão de acesso de usuários — `find_user_id_by_email`" (linhas ~72-96) é o **padrão de documentação a seguir** para a seção nova desta task (mesmo formato: o que a função faz, exemplo de chamada, o que ela garante/não garante, RLS que ela reaproveita).
- Variáveis de ambiente da function: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pelo Supabase em toda Edge Function do projeto — não precisa configurar nada manualmente, e a service role **nunca** deve aparecer em `.env`/`.env.example`/código do client.

### Frontend (TASK-026)

- `src/features/navigation/AccessManagementModal.tsx` (arquivo inteiro, ~196 linhas, já lido nesta sessão de planejamento) — componente genérico reaproveitado por `OrganizationsPage`/`ProjectsPage`. Hoje só tem o formulário "Adicionar por e-mail" (`handleAdd`, chama `findUserIdByEmail` + `addMember`). Esta task adiciona um segundo modo ("Criar conta nova") no mesmo formulário — props novas a considerar: algo como `createUser?: (email: string, password: string, role: TRole) => Promise<{ userId: string }>` (genérico igual `addMember`, deixando quem chama decidir os parâmetros de organização/projeto).
- `src/features/navigation/OrganizationsPage.tsx` (arquivo inteiro, já lido) — onde `AccessManagementModal` é montado com `roleOptions=ORGANIZATION_ROLE_OPTIONS` (`admin`/`member`), `addMember={(userId, role) => addOrganizationMember(manageTarget.id, userId, role)}`. `manageTarget.id` é o `organization_id` a passar para a Edge Function.
- `src/features/navigation/ProjectsPage.tsx` (arquivo inteiro, já lido) — `orgId` vem de `useParams<{ orgId: string }>()` (linha 25), já disponível nesta página; `AccessManagementModal` é montado com `roleOptions=PROJECT_ROLE_OPTIONS` (`visualizador`/`editor`), `addMember={(userId, memberRole) => addProjectMember(manageTarget.id, userId, memberRole)}`. Para "criar novo usuário" aqui, a function precisa de `organization_id: orgId` **e** `project_id: manageTarget.id`/`project_role`.
- `src/lib/supabase/queries.ts` (arquivo inteiro, ~400 linhas, já lido) — padrão a seguir para a nova `createUserWithPassword`:
  - `requireClient()` (topo do arquivo) — sempre usar antes de qualquer chamada.
  - Chamar a Edge Function: `client.functions.invoke('admin-create-user', { body: {...} })` — o SDK já encaminha o JWT da sessão atual no header `Authorization` automaticamente.
  - `signInWithPassword`/`signUp` (topo do arquivo) — mesmo padrão de `try { ... } catch` a seguir; `signUp` fica sem uso na UI depois desta task (decidir se remove ou deixa, registrar a divergência se deixar).
  - `addOrganizationMember`/`addProjectMember` — já tratam `UNIQUE_VIOLATION` (código `23505`) com mensagem amigável; a Edge Function da TASK-025 deve devolver um erro igualmente claro para e-mail duplicado (409), e `createUserWithPassword` deve propagar isso do mesmo jeito.
- `src/features/auth/RequireAuth.tsx` (arquivo inteiro, 15 linhas, já lido) — guard atual só checa `session`/`loading`. Precisa adicionar a checagem de `session.user.user_metadata?.must_change_password` **antes** do `return <>{children}</>` final, renderizando `<ForcePasswordChangePage />` (novo componente) no lugar disso quando `true`.
- `src/features/auth/AuthContext.tsx` (arquivo inteiro, 44 linhas, já lido) — `onAuthStateChange((_event, newSession) => setSession(newSession))` já existe (linha 27) e **já cobre** a atualização automática da sessão depois de `supabase.auth.updateUser(...)` (evento `USER_UPDATED`) — não precisa mexer neste arquivo, só confiar que `RequireAuth` vai re-renderizar sozinho.
- `src/features/auth/LoginPage.tsx` (arquivo inteiro, já lido/reescrito na TASK-023) — tem hoje a alternância `mode: 'signIn' | 'signUp'`. Esta task reverte para só o formulário de entrar — mais simples reescrever o arquivo do zero a partir da versão anterior à TASK-023 (git log tem o diff exato: commit `76cd4d7`) do que tentar remover peça por peça.
- `src/features/navigation/OrganizationsPage.tsx` — o texto do estado vazio (adicionado na TASK-023, "peça a um administrador para liberar seu acesso... seu e-mail: ...") deve ser revisto: como não existe mais autocadastro público, esse texto só faz sentido se alguém **ainda** conseguir logar sem organização (ex.: se a Edge Function falhar antes de inserir o vínculo) — decidir na implementação se mantém como fallback ou remove.

## Restrições ativas

- `ADR-010`, RN-01: a `service_role key` só pode ser usada dentro da Edge Function, e só para `auth.admin.createUser` — toda checagem de "quem pode chamar" e toda inserção em `organization_members`/`project_members` deve rodar com o client do JWT de quem chamou (reaproveitando RLS já existente), nunca com a service role.
- `ADR-010`, RN-02: sem sessão válida ou sem ser admin da organização informada, a function rejeita **antes** de chamar a Admin API — nunca cria um usuário "no vácuo".
- `TASK-026`, RN-01: criar um usuário pelo modal de **projeto** sempre inclui o vínculo de organização (`member`, por padrão) — nunca cria alguém só com `project_members` sem jeito de navegar até lá (organizações só aparecem na lista de quem tem `organization_members`).
- `TASK-026`, RN-02: a senha temporária só é mostrada uma vez, na tela de sucesso do próprio fluxo — nunca persistida em estado que sobrevive ao fechar o modal.
- Constituição (`.agents/test-onboarding.md`): nenhum terceiro nível de permissão — a Edge Function só aceita `org_role: 'admin' | 'member'` e `project_role: 'visualizador' | 'editor'`, os mesmos valores já usados em todo o resto do sistema.
- `.claude/agents/supabase-multitenant.md`: papel com **poder de veto** sobre qualquer mudança que enfraqueça isolamento entre organizações — a Edge Function é exatamente o tipo de mudança que merece essa revisão antes de considerar a TASK-025 concluída (ela introduz o único código do projeto que roda com privilégio total sobre o banco).

## Próximo passo imediato

Criar `supabase/functions/admin-create-user/index.ts` (TASK-025) com a estrutura básica: parse do body, client com o JWT do header `Authorization` recebido, chamada a `is_org_admin`/`is_project_org_admin` via esse client. Só depois disso partir para o client de service role (`auth.admin.createUser`) — nessa ordem, para nunca ter o segundo client instanciado antes de confirmar que a chamada é legítima.

---
Para retomar: abra uma sessão nova e peça para ler este arquivo antes de continuar as tasks `TASK-025`/`TASK-026`.
