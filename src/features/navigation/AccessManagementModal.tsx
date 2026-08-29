// TASK-013 (ADR-004) — modal genérico de gestão de acesso, reaproveitado
// por `OrganizationsPage` (papel admin/member) e `ProjectsPage` (papel
// visualizador/editor): lista membros atuais, vincula alguém novo por
// e-mail (via `findUserIdByEmail`, TASK-012) e permite mudar papel/revogar
// um membro existente. Nenhuma autorização nova aqui — só reforço de UI
// (RN-01 desta task); a garantia real é a RLS já existente de
// `organization_members`/`project_members` (TASK-001).
import { useEffect, useState, type FormEvent } from 'react'
import { findUserIdByEmail } from '../../lib/supabase/queries'
import { Modal } from '../diagram-shell/Modal'

export interface AccessMember<TRole extends string> {
  id: string
  user_id: string
  role: TRole
  full_name: string | null
}

export interface AccessRoleOption<TRole extends string> {
  value: TRole
  label: string
}

interface AccessManagementModalProps<TRole extends string> {
  title: string
  /** Só 2 opções — organização (admin/member) ou projeto (visualizador/editor). Nunca um terceiro papel (RN-02). */
  roleOptions: AccessRoleOption<TRole>[]
  defaultRole: TRole
  currentUserId: string | null
  listMembers: () => Promise<AccessMember<TRole>[]>
  addMember: (userId: string, role: TRole) => Promise<void>
  updateMemberRole: (memberId: string, role: TRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  onClose: () => void
}

export function AccessManagementModal<TRole extends string>({
  title,
  roleOptions,
  defaultRole,
  currentUserId,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  onClose,
}: AccessManagementModalProps<TRole>) {
  const [members, setMembers] = useState<AccessMember<TRole>[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TRole>(defaultRole)
  const [adding, setAdding] = useState(false)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

  async function reload() {
    setError(null)
    try {
      setMembers(await listMembers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar membros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAdding(true)
    try {
      const userId = await findUserIdByEmail(email.trim())
      if (!userId) {
        setError(
          'Nenhum usuário encontrado com este e-mail — a pessoa precisa se cadastrar em /login antes.',
        )
        return
      }
      await addMember(userId, role)
      setEmail('')
      setRole(defaultRole)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar membro.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRoleChange(memberId: string, newRole: TRole) {
    setError(null)
    setBusyMemberId(memberId)
    try {
      await updateMemberRole(memberId, newRole)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao mudar papel.')
      setBusyMemberId(null)
    }
  }

  async function handleRemove(memberId: string) {
    setError(null)
    setBusyMemberId(memberId)
    try {
      await removeMember(memberId)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao revogar acesso.')
      setBusyMemberId(null)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {loading ? (
        <p>Carregando membros…</p>
      ) : members && members.length > 0 ? (
        <ul className="access-member-list">
          {members.map((member) => (
            <li key={member.id} className="access-member-row">
              <span className="access-member-name">
                {member.full_name ?? `Usuário ${member.user_id.slice(0, 8)}…`}
                {member.user_id === currentUserId ? ' (você)' : ''}
              </span>
              <select
                aria-label={`Papel de ${member.full_name ?? member.user_id}`}
                value={member.role}
                disabled={busyMemberId === member.id}
                onChange={(e) => handleRoleChange(member.id, e.target.value as TRole)}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn danger ghost small"
                disabled={busyMemberId === member.id}
                onClick={() => handleRemove(member.id)}
              >
                Revogar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum membro vinculado ainda.</p>
      )}

      {error && <p className="error">{error}</p>}

      <form className="access-add-form" onSubmit={handleAdd}>
        <div className="field">
          <label htmlFor="access-email">Adicionar por e-mail</label>
          <input
            id="access-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com"
            autoComplete="off"
            disabled={adding}
          />
        </div>
        <div className="field">
          <label htmlFor="access-role">Papel</label>
          <select
            id="access-role"
            value={role}
            onChange={(e) => setRole(e.target.value as TRole)}
            disabled={adding}
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn primary" disabled={adding || email.trim().length === 0}>
          {adding ? 'Adicionando…' : 'Adicionar'}
        </button>
      </form>
    </Modal>
  )
}
