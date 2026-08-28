-- TASK-001 — Schema multi-tenant, RLS e autenticação no Supabase
-- Extensões necessárias.

-- gen_random_uuid(): já disponível por padrão em projetos Supabase (pgcrypto),
-- garantida aqui de forma explícita para qualquer ambiente Postgres limpo.
create extension if not exists pgcrypto;
