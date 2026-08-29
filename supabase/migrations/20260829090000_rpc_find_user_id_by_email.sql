-- TASK-012 (ADR-004) — RPC para resolver e-mail -> user_id na gestão de
-- acesso de usuários. Hoje não existe nenhuma forma segura pelo client de
-- descobrir o user_id de uma pessoa a partir do e-mail dela: `auth.users`
-- não tem política de SELECT exposta (nem deveria ter — é tabela do
-- Supabase Auth), e `profiles_select` só mostra o perfil de quem já
-- divide uma organização com o usuário atual, o que não ajuda a
-- encontrar alguém novo para vincular (ver ADR-004, "Contexto").
--
-- Esta função consulta `auth.users` internamente (SECURITY DEFINER) e
-- devolve só o `id` — nunca nenhum outro campo (e-mail confirmado,
-- criado em, etc.). Qualquer alteração futura que amplie o retorno é uma
-- mudança de superfície de segurança e precisa de revisão do papel
-- `supabase-multitenant` (RN-01 da task).
--
-- Mesmo padrão de `create_organization`
-- (20260828130500_rpc_create_organization.sql): language plpgsql,
-- security definer, search_path fixo, exige `auth.uid()` não nulo (só
-- checa que existe sessão — quem pode inserir o vínculo em
-- organization_members/project_members com o id retornado já é decidido
-- pelas políticas RLS dessas tabelas, não por esta função, que só lê).
--
-- RN-02 (ADR-004): não diferenciar "e-mail não existe" de "e-mail existe
-- mas a pessoa já está vinculada" — por isso a função apenas retorna
-- `null` quando não encontra, sem lançar exceção nesse caso.

create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select u.id
    into v_user_id
    from auth.users u
    where lower(u.email) = lower(p_email)
    limit 1;

  return v_user_id;
end;
$$;

grant execute on function public.find_user_id_by_email(text) to authenticated;
