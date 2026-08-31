---
id: TASK-025
title: Edge Function admin-create-user — admin cria conta com senha temporária
status: backlog
type: feature
owner: supabase-multitenant
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [supabase, auth]
related_use_cases: []
related_adrs: [ADR-010]
---

# TASK-025 — Edge Function `admin-create-user`

## Contexto
Decisão de arquitetura registrada em `ADR-010`: o autocadastro público (TASK-023, `ADR-009`, agora `superseded`) esbarrou no limite real de 2 e-mails/hora do serviço de e-mail padrão do Supabase (achado ao vivo, produção real, mesma sessão). Novo modelo: o admin cria a conta do usuário diretamente (e-mail + senha temporária), sem nenhum e-mail disparado. Isso só é possível pela Admin API do Supabase (`auth.admin.createUser`), que exige a `service_role key` — nunca pode chegar ao navegador. É o primeiro componente de backend próprio do ClassMap (uma Supabase Edge Function), decisão já tomada e justificada em `ADR-010`.

## Problema
Não existe, hoje, nenhuma forma de criar um usuário do ClassMap com e-mail já confirmado e senha definida por outra pessoa — só via Admin API, que não pode ser chamada do cliente (exigiria expor a `service_role key` no navegador, quebrando toda a RLS).

## Objetivo
Uma Edge Function (`admin-create-user`) que recebe e-mail/senha temporária/organização (e opcionalmente projeto+papel) de um admin autenticado, cria o usuário já confirmado via Admin API, e já vincula os acessos pedidos — reaproveitando a RLS existente para toda a autorização, sem duplicar regra de negócio nova.

## Fora de escopo
- UI de chamada da função (modal "Criar novo usuário") — `TASK-026`, `frontend-diagramas`.
- Tela/guard de troca obrigatória de senha no primeiro login — também `TASK-026` (é client-side, `auth.updateUser`, não precisa da function).
- Geração de senha temporária "forte" no lado do servidor — a senha vem pronta do cliente (que pode oferecer um botão "gerar senha aleatória" na UI, TASK-026); a function só aceita o que recebe.
- Qualquer mudança nas políticas RLS existentes — a function reaproveita `is_org_admin`/`organization_members_insert`/`project_members_insert`, já corretos desde a TASK-001/012.

## Comportamento atual
Não existe `supabase/functions/` no repositório — nenhuma Edge Function foi criada ainda em nenhuma task anterior.

## Comportamento esperado
Nova function em `supabase/functions/admin-create-user/index.ts` (Deno, runtime padrão do Supabase Edge Functions):

1. **Entrada**: `POST` com corpo `{ email: string, password: string, organization_id: string, org_role?: 'admin' | 'member', project_id?: string, project_role?: 'visualizador' | 'editor' }` (`org_role` default `'member'`). Chamada pelo cliente via `supabase.functions.invoke('admin-create-user', { body: {...} })` — o SDK já encaminha o JWT de quem está logado no header `Authorization`.
2. **Verificação de quem pode chamar** (sem duplicar regra de autorização nova): a function extrai o JWT do header `Authorization` e cria um client Supabase com esse token (`createClient(url, anonKey, { global: { headers: { Authorization } } })`) — as chamadas feitas com esse client respeitam RLS normalmente. Consulta `is_org_admin(organization_id)` (RPC já existente, `grant execute ... to authenticated`) — se `false`, responde `403`. Se `project_id` foi informado, confirma também que o projeto pertence a essa `organization_id` (`select organization_id from projects where id = project_id`, com esse mesmo client — RLS de `projects_select` já cobre isso para um admin da organização).
3. **Só agora usa a service role**: um segundo client Supabase, criado com `SUPABASE_SERVICE_ROLE_KEY` (env var injetada automaticamente pelo Supabase em toda Edge Function do projeto — não precisa configurar nada manualmente), chama `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true } })`. Se o e-mail já existir, a Admin API retorna erro — repassar como `409` para o cliente tratar (mensagem clara, ver TASK-026).
4. **Vínculos de organização/projeto**: de volta ao client com o JWT do admin (não a service role) — `insert into organization_members (organization_id, user_id, role)` com o `user_id` novo e `org_role`; se `project_id` foi informado, `insert into project_members (project_id, user_id, role)` com `project_role`. RLS já existente (`organization_members_insert`/`project_members_insert`, exige `is_org_admin`/`is_project_org_admin`) autoriza isso normalmente — nenhuma política nova.
5. **Resposta**: `{ user_id: string }` em caso de sucesso; erro com mensagem clara nos casos de: sem sessão, não é admin da organização, e-mail já cadastrado, projeto não pertence à organização informada.

## Regras de negócio
- RN-01: a `service_role key` é usada **só** para `auth.admin.createUser` — todo o resto (checagem de admin, inserção de vínculos) roda com o JWT de quem chamou, respeitando RLS normalmente. Nunca usar a service role para nada que a RLS já resolveria sozinha.
- RN-02: sem sessão válida ou sem ser `admin` da `organization_id` informada, a function rejeita antes de chamar a Admin API — nunca cria um usuário "no vácuo" sem vínculo nenhum.

## Critérios de aceitação
- [ ] CA-01: um admin de organização chamando a function com e-mail/senha novos recebe `user_id`, e esse usuário já existe em `auth.users` com `email_confirmed_at` preenchido (sem clicar em nenhum link) e `user_metadata.must_change_password = true`.
- [ ] CA-02: o mesmo usuário já aparece em `organization_members` (e em `project_members`, se `project_id` foi informado) com os papéis pedidos, sem nenhuma chamada adicional do cliente.
- [ ] CA-03: um usuário que **não** é admin da organização informada, chamando a function, recebe erro (403) e nenhum usuário é criado.
- [ ] CA-04: chamar com um e-mail já cadastrado recebe um erro claro (409), sem criar duplicata nem vínculo.
- [ ] CA-05: `npm run build`/`lint`/`test` continuam limpos (a function não faz parte do bundle do frontend, mas não pode quebrar nada existente).

## Impacto técnico
### Backend
Novo: `supabase/functions/admin-create-user/index.ts` (primeira Edge Function do projeto).
### Frontend
Nenhum nesta task — só a chamada via `supabase.functions.invoke` fica para a `TASK-026`.
### Banco de dados
Nenhuma migration nova — reaproveita `is_org_admin`, `organization_members_insert`, `project_members_insert`, todos já existentes.
### Integrações
Admin API do Supabase (`auth.admin.createUser`) — só dentro da function, nunca do cliente.
### Segurança
`service_role key` isolada na function (secret automático do Supabase, nunca em `.env`/`.env.example`/client). Ponto de maior atenção para revisão do papel `supabase-multitenant` (poder de veto) antes de considerar esta task concluída.

## Plano de implementação
- [ ] `supabase/functions/admin-create-user/index.ts` — estrutura básica da function (CORS, parse do body, extração do JWT).
- [ ] Client com JWT do chamador + checagem `is_org_admin`/pertencimento do projeto.
- [ ] Client com service role + `auth.admin.createUser`.
- [ ] Inserção dos vínculos (`organization_members`/`project_members`) de volta com o client do chamador.
- [ ] Atualizar `supabase/README.md` com uma seção nova ("Provisionamento de usuário pelo admin — `admin-create-user`", mesmo padrão da seção já existente sobre `find_user_id_by_email`) e o comando de deploy (`supabase functions deploy admin-create-user`).
- [ ] Atualizar `AGENTS.md`/`.claude/rules/global.md` — a frase "a única API é o SDK do Supabase" deixa de ser exata a partir desta task; registrar a Edge Function como exceção pontual e documentada (não uma guinada para "ter backend próprio" em geral).

## Estratégia de testes
- [ ] Manual, contra produção real (mesmo padrão desta sessão): deploy da function, chamada via `supabase.functions.invoke` (pode ser via um script/console temporário antes da UI da TASK-026 existir), confirmar CA-01..04 direto no painel do Supabase (`Authentication → Users`, `organization_members`/`project_members` via SQL Editor).
- [ ] Não há como escrever teste automatizado de Edge Function no Vitest atual (roda em Deno, fora do bundle Vite) — validação é manual, documentada aqui, mesmo padrão já usado para migrations (`supabase/README.md`, seção "Como validar isolamento").

## Riscos e rollback
Risco médio — é a primeira vez que o projeto expõe a `service_role key` para qualquer código, mesmo isolado numa function. Mitigado por: escopo mínimo (só uma chamada de Admin API), reaproveitamento de RLS já auditada para toda a autorização, e revisão obrigatória do papel `supabase-multitenant` antes de concluir. Rollback: `supabase functions delete admin-create-user` — nenhuma migration, nenhuma política RLS nova para reverter.

## Registro de execução
### Alterações realizadas
Edge Function `admin-create-user` criada seguindo exatamente o fluxo do ADR-010/desta task: client com o JWT do chamador para `is_org_admin` + pertencimento do projeto (`projects.organization_id`), só depois client com `service_role` para `auth.admin.createUser`, vínculos de volta com o client do chamador. Documentação atualizada (`supabase/README.md` — nova seção; `.claude/rules/global.md` — frase "única API é o SDK do Supabase" registrada como exceção pontual; `docs/architecture/components.md` — entrada nova em "Camada de dados/autorização").

### Arquivos principais
- `supabase/functions/admin-create-user/index.ts` (novo)
- `supabase/README.md` (seção "Provisionamento de usuário pelo admin — `admin-create-user`")
- `.claude/rules/global.md` (propósito — exceção documentada)
- `docs/architecture/components.md` (entrada nova)

### Decisões
- Import de `@supabase/supabase-js` via `npm:@supabase/supabase-js@2` (especificador `npm:`, padrão atual recomendado pela documentação do Supabase para Edge Functions em Deno) — não `https://esm.sh/...` (formato antigo) nem `jsr:` (o pacote não é publicado no JSR).
- Detecção de e-mail duplicado (`409`) checa `status === 422`, `code === 'email_exists'` e uma regex na mensagem (`already been registered|already exists`) — a Admin API do GoTrue não garante um único campo estável entre versões para esse caso; a combinação cobre tanto a resposta atual quanto variações razoáveis.
- CORS liberado (`Access-Control-Allow-Origin: '*'`) — mesma exposição de qualquer Edge Function pública do Supabase; a autorização real está no JWT exigido, não na origem.

### Divergências
Nenhuma — comportamento esperado implementado como descrito na task.

### Pendências
- **Deploy em produção não executado nesta sessão**: `supabase functions deploy admin-create-user` exige `supabase login` (fluxo interativo/OAuth) ou `SUPABASE_ACCESS_TOKEN`, nenhum dos dois disponível neste ambiente de execução (confirmado: `npx supabase projects list` retorna `LegacyPlatformAuthRequiredError`). Alternativa sem CLI (colar `index.ts` no editor de Edge Functions do painel Supabase, pelo navegador desta sessão que já está autenticado) fica para quando o usuário confirmar que quer prosseguir com o deploy.
- CA-01 a CA-04 (validação contra produção real) dependem do deploy acima — não executados ainda.

## Validação
- `npm run build` — limpo (`supabase/functions/` fora do `include` do `tsconfig.app.json`, não entra no `tsc -b`; build Vite não afetado).
- `npm run lint`/`npm test` — a rodar (ver validação consolidada da TASK-025+026 ao final da sessão).
- Validação manual contra produção (CA-01..04): **pendente do deploy**, ver "Pendências".

## Handoff
Código pronto para revisão do papel `supabase-multitenant` (poder de veto sobre este tipo de mudança, conforme `ADR-010`/snapshot). Falta: (1) decisão do usuário sobre como fazer o deploy (CLI local com `supabase login`, ou colar no painel via este navegador); (2) validação manual dos CA-01..04 depois do deploy.
