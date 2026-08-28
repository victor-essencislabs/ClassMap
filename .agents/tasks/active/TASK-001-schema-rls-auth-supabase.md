---
id: TASK-001
title: Schema multi-tenant, RLS e autenticação no Supabase
status: active
type: feature
owner: supabase-multitenant
created_at: 2026-08-28
updated_at: 2026-08-28
affected_modules: [dados-multitenant]
related_use_cases: []
related_adrs: [ADR-001]
---

# TASK-001 — Schema multi-tenant, RLS e autenticação no Supabase

## Contexto
Primeira task do MVP de produção (ver ADR-001). Repositório greenfield — nenhum schema existe ainda. Esta task constrói a fundação de dados e segurança sobre a qual todo o resto do MVP depende, isolada de qualquer UI.

## Problema
Não existe hoje nenhuma forma de um usuário se autenticar, pertencer a uma organização, e ter acesso controlado a projetos/diagramas com o isolamento de dados que o produto promete ao gestor da Essencislabs.

## Objetivo
Ter, no Supabase, um schema completo da hierarquia Organização → Usuários → Projetos → Diagramas, com Row Level Security garantindo isolamento entre organizações, dois níveis de permissão (visualizador/editor) por vínculo usuário-projeto, e autenticação funcional — tudo validável via SQL/console, sem depender de nenhuma tela.

## Fora de escopo
- Qualquer UI (fica para TASK-002 em diante).
- Presença em tempo real e metadados de última atualização/autor (etapa "Colaboração" do roadmap, fora do MVP — ver `docs/roadmap/README.md`).
- Parser `.vpp` e geração de JSON por agentes de IA (avançam em paralelo, sem dependência desta task).

## Comportamento atual
Nenhum — não há projeto Supabase nem schema.

## Comportamento esperado
- Tabelas: organizações, usuários (perfil vinculado ao Supabase Auth), vínculo usuário-organização, projetos (pertencentes a uma organização), vínculo usuário-projeto com papel (`visualizador`/`editor`), diagramas (pertencentes a um projeto, com tipo — classes/objetos — e conteúdo em coluna JSON/JSONB).
- RLS habilitada em toda tabela multi-tenant, garantindo que uma query só retorna linhas da(s) organização(ões)/projeto(s) que o usuário autenticado tem acesso.
- Supabase Auth configurado (e-mail/senha, no mínimo).
- Todo o schema acima versionado como migrations em `supabase/migrations/`.

## Regras de negócio
- RN-01: Isolamento entre organizações é garantido por RLS no Postgres — nunca por filtro em código de aplicação (Constituição, item 1).
- RN-02: Apenas 2 níveis de permissão por vínculo usuário-projeto — visualizador e editor. Nenhum RBAC granular adicional sem ADR (Constituição/regras globais).
- RN-03: Um usuário administrador existe por organização e pode criar acessos de usuário e conceder/revogar visualizador/editor por projeto.
- RN-04: Toda mudança de schema é uma migration versionada — nunca alteração manual direta no schema de produção.

## Critérios de aceitação
- [x] CA-01: Migrations aplicam sem erro num projeto Supabase limpo e ficam commitadas em `supabase/migrations/`. Validado contra Postgres 16 limpo (ver "Validação").
- [x] CA-02: Um teste manual (queries autenticadas como dois usuários de duas organizações diferentes) confirma que o usuário A nunca vê linhas de dados da organização de B, em nenhuma das tabelas multi-tenant. Validado localmente (ver "Validação"); repetir contra o projeto Supabase real quando existir.
- [x] CA-03: Um usuário com papel `visualizador` num projeto consegue `SELECT` mas tem `INSERT`/`UPDATE`/`DELETE` de diagrama bloqueados por RLS (não só pela UI, que ainda não existe). Validado localmente.
- [x] CA-04: Um usuário com papel `editor` consegue `INSERT`/`UPDATE`/`DELETE` de diagrama dentro do seu projeto. Validado localmente.
- [ ] CA-05: Cadastro e login via Supabase Auth funcionam (validado via cliente de teste ou painel do Supabase). **Pendente** — exige um projeto Supabase real (nenhum provisionado neste ambiente); o trigger que cria `profiles` no cadastro foi validado localmente simulando `auth.users`, mas o serviço de Auth (GoTrue) em si ainda não foi exercitado.

## Impacto técnico
### Backend
Não aplicável — sem camada de backend própria (ver `.claude/rules/global.md`, seção Propósito).
### Frontend
Nenhum nesta task.
### Banco de dados
Schema completo descrito em "Comportamento esperado", em `supabase/migrations/`.
### Integrações
Configuração do projeto Supabase (Auth + Postgres).
### Segurança
Toda a superfície de risco desta task — RLS é a única garantia de isolamento multi-tenant (ver `docs/security/README.md`, item 1). Revisão obrigatória pelo papel `supabase-multitenant` antes de considerar concluída.

## Plano de implementação
- [ ] Criar/configurar o projeto Supabase (dentro do teto de R$ 50/mês — plano gratuito nesta fase). **Pendente** — nenhum projeto Supabase real provisionado neste ambiente (sem credenciais).
- [x] Desenhar e escrever a primeira migration: tabelas de organização, usuário, vínculo usuário-organização, projeto, vínculo usuário-projeto (com papel), diagrama.
- [x] Escrever as políticas RLS para cada tabela multi-tenant.
- [ ] Configurar Supabase Auth. **Pendente** — depende do projeto real existir; habilitar provedor Email/senha no painel (nenhuma migration configura isso).
- [x] Popular dados de teste (2 organizações fictícias, usuários com papéis diferentes) para validar isolamento.
- [x] Rodar e documentar os testes manuais de isolamento (CA-02 a CA-04).

## Estratégia de testes
- [ ] Unitários: não aplicável a SQL puro nesta fase; considerar testes automatizados de RLS (ex.: via `pgTAP` ou script de teste) se o tempo permitir — não bloqueante para o MVP.
- [x] Manual: queries autenticadas como usuários de teste distintos, validando os critérios de aceitação.
- [ ] Integração: adiada para TASK-002/003, quando o frontend consumir o schema real.
- [ ] E2E: adiada para TASK-005.

## Riscos e rollback
Se o schema desenhado aqui precisar mudar depois que TASK-002 já tiver começado a consumi-lo, há retrabalho no frontend (risco já registrado em ADR-001). Rollback: como é a primeira migration de um projeto novo, reverter significa recriar o projeto Supabase ou rodar uma migration de downgrade — sem dado de produção em risco nesta fase.

## Registro de execução
### Alterações realizadas
Schema completo da hierarquia Organização → Usuários → Projetos →
Diagramas implementado em 6 migrations versionadas, com RLS habilitada e
testada em todas as tabelas multi-tenant, funções auxiliares
`SECURITY DEFINER` para evitar recursão nas políticas, trigger de criação
automática de `profiles` no cadastro, e RPC `create_organization` para
bootstrap self-serve de organização (única forma de popular
`organizations`/`organization_members` fora de acesso administrativo
direto).

### Arquivos principais
- `supabase/migrations/20260828130000_extensions.sql`
- `supabase/migrations/20260828130100_schema_tables.sql`
- `supabase/migrations/20260828130200_auth_helpers.sql`
- `supabase/migrations/20260828130300_rls_policies.sql`
- `supabase/migrations/20260828130400_profile_on_signup.sql`
- `supabase/migrations/20260828130500_rpc_create_organization.sql`
- `supabase/README.md` — documentação de aplicação/validação.

### Decisões
- **Papel de organização (`admin`/`member`) é distinto do papel de
  projeto (`visualizador`/`editor`)** — a Constituição fala em "2 níveis
  de permissão" para o vínculo usuário-**projeto** (RN-02); o papel de
  organização é necessário à parte para viabilizar RN-03 (quem pode
  conceder/revogar acesso) e não conta como um terceiro nível de
  permissão de projeto.
- **Admin de organização não lê automaticamente o `content` de diagramas
  de projetos onde não é `project_members`** — só gerencia
  criação/exclusão de projeto e concessão de papel. Decisão de menor
  privilégio; se o produto quiser o inverso (admin com leitura irrestrita
  de todo diagrama da própria organização), registrar via ADR antes de
  mudar a política `diagrams_select`.
- **Criação de organização só via RPC `create_organization`**
  (`SECURITY DEFINER`) — evita política de `INSERT` direta em
  `organizations`/`organization_members` para o caso "primeiro membro
  admin", que teria o problema do ovo-e-galinha sob RLS.
- **Sem `FORCE ROW LEVEL SECURITY`** — desnecessário porque o
  `service_role` do Supabase já tem `bypassrls`; `ENABLE ROW LEVEL
  SECURITY` é suficiente e é o padrão recomendado pelo Supabase.

### Divergências
Nenhuma do plano original.

### Pendências
- Provisionar o projeto Supabase real (nenhuma credencial disponível
  neste ambiente de execução) e aplicar as migrations nele
  (`supabase db push` ou SQL Editor, na ordem listada em
  `supabase/README.md`).
- Habilitar o provedor Email/senha em Authentication → Providers no
  painel do projeto real.
- Repetir a validação de isolamento (CA-02 a CA-04) e validar CA-05
  (cadastro/login reais) contra esse projeto — o que foi feito nesta
  sessão foi contra um Postgres local simulando `auth.users`/`auth.uid()`
  (ver "Validação" abaixo), não o Supabase gerenciado.

**Autorização registrada**: em 2026-08-28, o usuário (victor.sena@essencislabs.com,
pelo celular, sem acesso a computador no momento) pediu para adiantar
tudo o que fosse possível sem integração externa e autorizou
explicitamente que a integração real com o Supabase (provisionar o
projeto, aplicar as migrations, configurar Auth, preencher
`.env.local`/variáveis da Vercel) seja feita assim que houver acesso a
computador — nesta sessão ou em outra. Nenhuma dessas ações foi
executada aqui por falta de credenciais, não por falta de autorização.

## Validação
Nenhum comando de projeto (`package.json`/build/test) existe ainda neste
repositório — a validação desta task é puramente SQL.

Sem projeto Supabase real disponível neste ambiente, a suíte de
validação rodou contra um Postgres 16 local, simulando o mínimo que o
Supabase gerenciado fornece por padrão (schema `auth` com `auth.users` e
`auth.uid()` com a mesma assinatura real — lê `request.jwt.claim.sub` —,
roles `anon`/`authenticated`, e os `GRANT`s padrão de um projeto novo):

1. Aplicação das 6 migrations, em ordem, num banco recém-criado — sem
   erro (CA-01).
2. Seed de 2 organizações fictícias, 5 usuários de teste, 2 projetos e 2
   diagramas.
3. Autenticado como admin de uma organização: `SELECT` em
   `organizations`/`projects`/`diagrams`/`organization_members` só
   retornou linhas da própria organização (CA-02); repetido autenticado
   como `editor` da outra organização, com o mesmo resultado invertido.
4. Autenticado como `visualizador` de um projeto: `SELECT` em `diagrams`
   funcionou; `INSERT` foi rejeitado com
   `new row violates row-level security policy`; `UPDATE` afetou 0 linhas
   (CA-03).
5. Autenticado como `editor` do mesmo projeto: `INSERT`, `UPDATE` e
   `DELETE` em `diagrams` funcionaram (CA-04).
6. `INSERT` em `auth.users` disparou o trigger `on_auth_user_created` e
   criou a linha correspondente em `public.profiles`.
7. `create_organization('Nova Org via RPC')`, autenticado, criou a
   organização e o vínculo `admin` do chamador na mesma transação.

Todos os passos e resultados detalhados estão reproduzidos em
`supabase/README.md`, seção "Validação já executada nesta sessão".

## Handoff
Nenhum ainda — próxima sessão deve: (1) provisionar o projeto Supabase
real e aplicar as migrations, (2) validar CA-05 (Auth real) e repetir
CA-02/03/04 contra ele, (3) só então mover esta task para `completed/`.
Ver seção "Pendências" acima.
