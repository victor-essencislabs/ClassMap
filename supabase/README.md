---
estado: real
fonte: TASK-001 (.agents/tasks/active/TASK-001-schema-rls-auth-supabase.md)
ultima-revisao: 2026-08-28
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
