// TASK-025 (ADR-010) — admin cria usuário com senha temporária, sem
// depender de e-mail. Primeira Edge Function do ClassMap e único código
// do projeto que usa a service_role key.
//
// RN-01: a service_role key é usada só para `auth.admin.createUser`.
// Toda checagem de "quem pode chamar" e toda inserção em
// organization_members/project_members roda com o client construído a
// partir do JWT de quem chamou — respeitando a RLS já existente
// (is_org_admin, organization_members_insert, project_members_insert),
// nunca duplicando regra de autorização aqui.
//
// RN-02: sem sessão válida ou sem ser admin da organização informada, a
// função rejeita antes de chamar a Admin API — nunca cria usuário "no
// vácuo" sem vínculo nenhum.
//
// Deploy: `supabase functions deploy admin-create-user`
// (ver supabase/README.md, seção "Provisionamento de usuário pelo
// admin — admin-create-user").

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type OrgRole = 'admin' | 'member'
type ProjectRole = 'visualizador' | 'editor'

interface RequestBody {
  email?: string
  password?: string
  organization_id?: string
  org_role?: OrgRole
  project_id?: string
  project_role?: ProjectRole
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'missing_authorization' }, 401)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const email = body.email?.trim()
  const password = body.password
  const organizationId = body.organization_id
  const orgRole: OrgRole = body.org_role ?? 'member'
  const projectId = body.project_id
  const projectRole = body.project_role

  if (!email || !password || !organizationId) {
    return jsonResponse({ error: 'missing_fields' }, 400)
  }
  if (orgRole !== 'admin' && orgRole !== 'member') {
    return jsonResponse({ error: 'invalid_org_role' }, 400)
  }
  if (projectId && projectRole !== 'visualizador' && projectRole !== 'editor') {
    return jsonResponse({ error: 'invalid_project_role' }, 400)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Client com o JWT de quem chamou — todas as chamadas abaixo respeitam
  // RLS normalmente, exatamente como se viessem do navegador dessa pessoa.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()
  if (!caller) {
    return jsonResponse({ error: 'unauthenticated' }, 401)
  }

  const { data: isAdmin, error: isAdminError } = await callerClient.rpc('is_org_admin', {
    p_organization_id: organizationId,
  })
  if (isAdminError) {
    return jsonResponse({ error: 'authorization_check_failed' }, 500)
  }
  if (!isAdmin) {
    return jsonResponse({ error: 'not_org_admin' }, 403)
  }

  if (projectId) {
    const { data: project, error: projectError } = await callerClient
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle()
    if (projectError) {
      return jsonResponse({ error: 'project_lookup_failed' }, 500)
    }
    if (!project || project.organization_id !== organizationId) {
      return jsonResponse({ error: 'project_not_in_organization' }, 400)
    }
  }

  // Só a partir daqui a service role é usada — só para criar o usuário
  // em si. Nenhuma outra operação nesta função usa este client.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  })

  if (createError || !created?.user) {
    const message = createError?.message ?? ''
    const isDuplicate =
      createError?.status === 422 ||
      createError?.code === 'email_exists' ||
      /already been registered|already exists/i.test(message)
    return jsonResponse(
      { error: isDuplicate ? 'email_already_registered' : 'create_user_failed' },
      isDuplicate ? 409 : 500,
    )
  }

  const newUserId = created.user.id

  // Vínculos de organização/projeto — de volta com o client do chamador,
  // autorizado pela RLS já existente (organization_members_insert exige
  // is_org_admin; project_members_insert exige is_project_org_admin).
  const { error: orgMemberError } = await callerClient
    .from('organization_members')
    .insert({ organization_id: organizationId, user_id: newUserId, role: orgRole })
  if (orgMemberError) {
    return jsonResponse(
      { error: 'organization_member_insert_failed', user_id: newUserId },
      500,
    )
  }

  if (projectId && projectRole) {
    const { error: projectMemberError } = await callerClient
      .from('project_members')
      .insert({ project_id: projectId, user_id: newUserId, role: projectRole })
    if (projectMemberError) {
      return jsonResponse(
        { error: 'project_member_insert_failed', user_id: newUserId },
        500,
      )
    }
  }

  return jsonResponse({ user_id: newUserId }, 200)
})
