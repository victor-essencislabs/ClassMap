// Exibida quando VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não estão
// definidas — nenhum projeto Supabase real existe ainda (ver
// .agents/tasks/active/TASK-001-schema-rls-auth-supabase.md). Mantém o
// app buildável/rodável localmente sem credenciais.
export function NotConfiguredPage() {
  return (
    <main className="centered-page">
      <div className="card">
        <h1>ClassMap</h1>
        <p>
          O app ainda não está conectado a um projeto Supabase. Configure{' '}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> em um arquivo{' '}
          <code>.env.local</code> (ver <code>.env.example</code>) e reinicie o servidor de
          desenvolvimento.
        </p>
      </div>
    </main>
  )
}
