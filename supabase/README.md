---
estado: real
fonte: TASK-001 (.agents/tasks/active/TASK-001-schema-rls-auth-supabase.md)
ultima-revisao: 2026-08-31 (TASK-025 — Edge Function admin-create-user)
---

# Supabase — schema, RLS e autenticação (TASK-001)

Migrations em [`migrations/`](./migrations) implementam a hierarquia
**Organização → Usuários → Projetos → Diagramas** com Row Level Security
como única fonte de isolamento multi-tenant (ver `.claude/rules/global.md`).

## Ordem das migrations

1. `20260828130000_extensions.sql` — `pgcrypto` (`gen_random_uuid()`).
2. `20260828130100_schema_tables.sql` — tabelas `organizations`, `profiles`,
   `organization_members`, `projects`, `project_members`, `diagrams`.
3. `20260828130200_auth_helpers.sql` — funções `SECURITY DEFINER`
   (`is_org_member`, `is_org_admin`, `is_project_member`, `project_role`,
   `is_project_org_admin`) usadas pelas políticas RLS, evitando recursão.
4. `20260828130300_rls_policies.sql` — habilita RLS e cria as políticas em
   todas as 6 tabelas.
5. `20260828130400_profile_on_signup.sql` — trigger em `auth.users` que cria
   a linha correspondente em `public.profiles` no cadastro.
6. `20260828130500_rpc_create_organization.sql` — RPC
   `create_organization(p_name text)` que cria a organização **e** já
   vincula quem chamou como `admin`, atomicamente (única forma de popular
   `organizations`/`organization_members` para um usuário comum — não há
   política de `INSERT` direta para esse caso).
7. `20260829090000_rpc_find_user_id_by_email.sql` (TASK-012, ADR-004) — RPC
   `find_user_id_by_email(p_email text) returns uuid`, ver seção "Gestão
   de acesso de usuários — `find_user_id_by_email`" abaixo.

(Duas migrations de correção pós-deploy, `20260829060000_grants_data_api_roles.sql`
e `20260829080000_rpc_create_project.sql`, já existem no repositório e
foram aplicadas em produção antes desta lista ter sido atualizada — não
tocadas por esta task, ver conteúdo de cada arquivo para o motivo.)

## Modelo de permissão

- **Papel de organização** (`organization_members.role`): `admin` ou
  `member`. Só `admin` cria/gerencia projetos e concede/revoga acesso
  (RN-03 da TASK-001).
- **Papel de projeto** (`project_members.role`): `visualizador` (só leitura
  de diagramas) ou `editor` (cria/edita/exclui diagramas). Único nível de
  permissão granular do produto — não introduzir um terceiro sem ADR
  (RN-02 da TASK-001 / `.claude/rules/global.md`).
- Ver diagramas de um projeto exige estar em `project_members` daquele
  projeto — um admin de organização vê e gerencia a lista de projetos e
  membros, mas só lê o **conteúdo** de um diagrama se também for
  `project_members` dele. Decisão deliberada de menor privilégio; revisar
  via ADR se o produto quiser o inverso (admin com leitura automática de
  todo conteúdo da organização).

## Como aplicar num projeto Supabase real

Nenhum projeto Supabase de produção foi provisionado ainda (sem
credenciais neste ambiente de execução). Ao provisionar:

```bash
supabase link --project-ref <project-ref>
supabase db push   # aplica migrations/ na ordem acima
```

Alternativa sem CLI: colar o conteúdo de cada arquivo, nesta ordem, no
SQL Editor do painel Supabase.

Auth: habilitar o provedor **Email** (usuário/senha) em
Authentication → Providers — nenhuma migration configura isso, é
configuração de projeto.

## Gestão de acesso de usuários — `find_user_id_by_email` (TASK-012, ADR-004)

Função `SECURITY DEFINER` que resolve e-mail → `user_id`, para a UI de
gestão de acesso (TASK-013) vincular alguém já cadastrado a uma
organização/projeto. Segue o mesmo padrão de `create_organization`
(`language plpgsql`, `security definer`, `set search_path = public`,
`auth.uid() is null` no início, `grant execute ... to authenticated`).

```sql
select public.find_user_id_by_email('alguem@empresa.com');
```

- Retorna o `uuid` de `auth.users.id` se o e-mail existir (comparação
  case-insensitive, `lower(email) = lower(p_email)`); `null` se não
  existir — sem lançar exceção nesse caso (RN-02 da TASK-012: não
  diferenciar "e-mail não existe" de "e-mail existe mas já está
  vinculado", para não ampliar enumeração de e-mail além do necessário).
- Exige sessão autenticada (`auth.uid() is null` → `raise exception`);
  chamar sem sessão sempre falha, independentemente do e-mail buscado.
- Nunca expõe nenhum outro campo de `auth.users` — o corpo da função só
  faz `select u.id ... into v_user_id`, nunca `select *` (confirmado por
  inspeção de `pg_proc.prosrc`, ver "Validação já executada nesta
  sessão" abaixo). Qualquer mudança que amplie o retorno exige revisão
  do papel `supabase-multitenant` (poder de veto).
- Não altera nenhuma política RLS existente: `organization_members_insert`/
  `project_members_insert` já permitiam um `admin` inserir qualquer
  `user_id` antes desta task — só faltava a forma de descobrir qual.

## Como validar isolamento (CA-02 a CA-04)

Com dois usuários de teste cadastrados via Supabase Auth em organizações
diferentes (criar a primeira organização de cada um via
`select * from create_organization('Nome da Org');`, autenticado como esse
usuário):

1. Autenticar como usuário da Org A → confirmar que `select * from
   organizations/projects/diagrams/organization_members` nunca retorna
   linha de outra organização.
2. Adicionar um segundo usuário a um projeto da Org A como `visualizador`
   (`insert into project_members ...`, autenticado como `admin` da Org A)
   → autenticado como esse usuário, confirmar `SELECT` funciona em
   `diagrams` e `INSERT`/`UPDATE`/`DELETE` são rejeitados
   (`new row violates row-level security policy`).
3. Adicionar um usuário como `editor` no mesmo projeto → confirmar que
   `INSERT`/`UPDATE`/`DELETE` em `diagrams` funcionam.

## Validação já executada nesta sessão

Sem projeto Supabase real disponível neste ambiente, os 6 arquivos de
migration foram validados end-to-end contra um Postgres local (16),
simulando o mínimo que o Supabase gerenciado fornece por padrão: schema
`auth` com `auth.users` e `auth.uid()` (mesma assinatura/semântica —
lê o claim `sub` do JWT via `current_setting('request.jwt.claim.sub')`),
roles `anon`/`authenticated` e os `GRANT`s padrão de um projeto novo.

Resultado:

- Migrations aplicam sem erro, na ordem, em um banco limpo (**CA-01**).
- Dois usuários de duas organizações de teste distintas nunca leram linha
  um do outro em `organizations`, `projects`, `diagrams` ou
  `organization_members` (**CA-02**).
- Um `visualizador` fez `SELECT` em `diagrams` normalmente; `INSERT` e
  `UPDATE` foram rejeitados pela política RLS (**CA-03**).
- Um `editor` fez `INSERT`/`UPDATE`/`DELETE` em `diagrams` dentro do seu
  projeto (**CA-04**).
- Inserir `auth.users` disparou o trigger e criou a linha correspondente
  em `public.profiles` automaticamente.
- `create_organization(...)` criou a organização e o vínculo `admin` do
  chamador na mesma transação.

**Pendente (CA-05):** cadastro/login via Supabase Auth em si (o serviço
GoTrue e a emissão real de JWT) não foram exercidos — exigem um projeto
Supabase real. Validar assim que o projeto for provisionado.

### TASK-012 — `find_user_id_by_email` (2026-08-29)

Validado contra um Postgres 16 local novo (container Docker efêmero),
com o mesmo mock de `auth` desta sessão (schema `auth`, tabela
`auth.users` com `id`/`email`/`raw_user_meta_data`, `auth.uid()` lendo
`current_setting('request.jwt.claim.sub', true)`, roles `anon`/
`authenticated`). Todas as 10 migrations de `supabase/migrations/`
(incluindo a nova, `20260829090000_rpc_find_user_id_by_email.sql`)
aplicaram sem erro, em ordem, num banco limpo (**CA-04**).

- Autenticado (`request.jwt.claim.sub` setado para um `user_id` de
  teste), `find_user_id_by_email('EXISTE@empresa.com')` (caixa
  diferente do cadastro) retornou o `user_id` correto — confirma
  comparação case-insensitive (**CA-01**).
- No mesmo contexto autenticado, `find_user_id_by_email('naoexiste@empresa.com')`
  retornou `null`, sem erro (**CA-02**).
- Sem sessão (`request.jwt.claim.sub` vazio, papel `anon`), a chamada
  lançou `authentication required` (comportamento de `auth.uid() is
  null`, mesmo padrão de `create_organization`).
- Corpo da função inspecionado via `select prosrc from pg_proc where
  proname = 'find_user_id_by_email'` — só contém `select u.id ... into
  v_user_id`, nenhum outro campo de `auth.users` é lido ou retornado
  (**CA-03**).

Não aplicado contra o projeto Supabase real de produção (`classmap`)
nesta task — decisão explícita, ver task. Repetir esta mesma validação
lá antes de a TASK-013 depender da função em produção.

**Atualização 2026-08-31 (TASK-025/026, achado ao vivo em produção)**: essa
pendência ficou esquecida — a migration nunca foi de fato aplicada ao
projeto real, e isso só quebrou na prática quando existiu, pela primeira
vez, um segundo usuário real para testar "Adicionar por e-mail" contra
produção (`404`/`PGRST202`, função não encontrada no schema cache).
Aplicada agora via SQL Editor do painel (mesmo método usado para as
migrations originais). Lição: `supabase_migrations.schema_migrations`
nem existe neste projeto — todas as migrations até aqui foram aplicadas
colando SQL no editor, nunca via `supabase db push`, então não há
tabela de controle para conferir automaticamente o que já rodou contra
produção. Ver ADR a considerar: adotar `supabase db push`/CLI como
único caminho de aplicar migration daqui para frente, para este tipo de
gap não se repetir silenciosamente.

## Gestão de acesso com e-mail visível — `list_*_members_with_email` (TASK-027)

Duas funções `SECURITY DEFINER` (`20260831140000_rpc_list_members_with_email.sql`),
mesmo padrão de `find_user_id_by_email`: `list_organization_members_with_email(p_organization_id)`
e `list_project_members_with_email(p_project_id)` — juntam
`organization_members`/`project_members` com `auth.users` para devolver
o e-mail de cada membro. Antes disso a lista de membros só mostrava
`full_name`/id truncado (decisão original da TASK-012/ADR-004, para não
duplicar dado de `auth.users` em `profiles`) — inviável na prática assim
que existiu um segundo usuário real sem perfil preenchido.

- Autorização: quem chama precisa já poder ver aquela linha pela RLS
  existente (`is_org_member` para organização; `is_project_member` ou
  `is_project_org_admin` para projeto) — a função só acrescenta o e-mail
  a uma linha que o chamador já enxergaria via `select` direto na
  tabela, nunca amplia quem vê quais linhas.
- Usadas por `listOrganizationMembers`/`listProjectMembers`
  (`src/lib/supabase/queries.ts`), no lugar do `select` direto anterior.

## Provisionamento de usuário pelo admin — `admin-create-user` (TASK-025, ADR-010)

Primeira **Supabase Edge Function** do projeto (`supabase/functions/admin-create-user/index.ts`,
Deno) — substitui o autocadastro público (TASK-023/`ADR-009`, superseded)
depois de esbarrar no limite de 2 e-mails/hora do serviço de e-mail
padrão do Supabase. O admin cria a conta do colega diretamente (e-mail +
senha temporária), sem nenhum e-mail disparado.

```ts
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: {
    email: 'colega@empresa.com',
    password: 'senha-temporaria',
    organization_id: '...',
    org_role: 'member', // opcional, default 'member'
    project_id: '...', // opcional
    project_role: 'editor', // obrigatório se project_id for informado
  },
})
```

- Exige sessão autenticada (o SDK já encaminha o JWT no header
  `Authorization`) e que quem chama seja `admin` da `organization_id`
  informada (`is_org_admin`, RPC já existente) — rejeita com `403`
  (`not_org_admin`) antes de qualquer chamada de Admin API. Sem
  `Authorization` ou sem sessão válida: `401`.
- Se `project_id` for informado, confirma que o projeto pertence a essa
  organização (`select organization_id from projects`, com o client do
  chamador — a política `projects_select` já cobre um admin de
  organização) — caso contrário `400` (`project_not_in_organization`).
- **Só a criação do usuário em si roda com a `service_role key`**
  (`auth.admin.createUser({ email, password, email_confirm: true,
  user_metadata: { must_change_password: true } })`) — usuário nasce já
  confirmado, com a flag que força troca de senha no primeiro login
  (`TASK-026`, `RequireAuth`). E-mail já cadastrado: `409`
  (`email_already_registered`), sem criar duplicata.
- Os vínculos (`organization_members`/`project_members`) são inseridos
  de volta com o client do chamador — autorizados pela RLS já existente
  (`organization_members_insert`/`project_members_insert`, exigem
  `is_org_admin`/`is_project_org_admin`), **nenhuma política nova**.
- Resposta de sucesso: `{ user_id: string }`.
- A `SUPABASE_SERVICE_ROLE_KEY` é injetada automaticamente pelo Supabase
  como secret de toda Edge Function do projeto — nunca configurada
  manualmente, nunca em `.env`/`.env.example`/código do client.

### Deploy

```bash
supabase link --project-ref <project-ref>   # se ainda não estiver linkado
supabase functions deploy admin-create-user
```

Alternativa sem CLI: colar o conteúdo de `index.ts` diretamente no editor
de Edge Functions do painel Supabase (Edge Functions → New function).

### Validação

Manual, contra produção real (mesmo padrão das tasks anteriores) — não
há como escrever teste automatizado de Edge Function no Vitest atual
(roda em Deno, fora do bundle Vite):

1. Admin de uma organização chama a function com e-mail/senha novos →
   `auth.users` ganha a linha com `email_confirmed_at` preenchido (sem
   clicar em link nenhum) e `user_metadata.must_change_password = true`;
   `organization_members` (e `project_members`, se `project_id` foi
   informado) ganham o vínculo, sem chamada adicional do cliente.
2. Um usuário que não é admin da organização informada recebe `403` —
   nenhum usuário é criado.
3. Chamar com um e-mail já cadastrado recebe `409` — sem duplicata nem
   vínculo novo.
