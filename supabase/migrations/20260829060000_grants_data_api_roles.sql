-- TASK-001 (correção pós-deploy) — Concede o GRANT de tabela básico que
-- faltava para os roles do Data API (`anon`/`authenticated`).
--
-- RLS (20260828130300_rls_policies.sql) governa o acesso por LINHA, mas o
-- Postgres exige, independentemente disso, um GRANT de PRIVILÉGIO por
-- TABELA para o role sequer tentar a query — sem ele, toda requisição é
-- rejeitada com "permission denied for table X" antes do RLS ser avaliado.
-- Um projeto Supabase novo concede isso automaticamente para tabelas
-- criadas quando "Automatically expose new tables" está habilitado; este
-- projeto foi criado com essa opção desabilitada (recomendação padrão do
-- próprio Supabase) e nenhuma migration anterior compensou com um GRANT
-- explícito — bug descoberto ao validar o primeiro login real (TASK-001/
-- TASK-002, CA-02).
--
-- Seguro por padrão: cada tabela abaixo já tem RLS habilitada com
-- políticas restritivas (RN-01) — este GRANT só abre a possibilidade de
-- tentar a query; o RLS continua sendo a única fonte real de isolamento.

grant select, insert, update, delete
  on public.organizations,
     public.profiles,
     public.organization_members,
     public.projects,
     public.project_members,
     public.diagrams
  to anon, authenticated;
