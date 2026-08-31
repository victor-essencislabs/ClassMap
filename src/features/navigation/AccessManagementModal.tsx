// TASK-013 (ADR-004) — modal genérico de gestão de acesso, reaproveitado
// por `OrganizationsPage` (papel admin/member) e `ProjectsPage` (papel
// visualizador/editor): lista membros atuais, vincula alguém novo por
// e-mail (via `findUserIdByEmail`, TASK-012) e permite mudar papel/revogar
// um membro existente. Nenhuma autorização nova aqui — só reforço de UI
// (RN-01 desta task); a garantia real é a RLS já existente de
// `organization_members`/`project_members` (TASK-001).
//
// TASK-026 (ADR-010): ganhou um segundo modo, "Criar conta nova" — cria a
// conta com senha temporária via a Edge Function `admin-create-user`
// (TASK-025), ao lado do modo já existente "Já tem conta" (por e-mail).
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
  /** Legenda curta do que o papel permite (TASK-026) — exibida ao lado do seletor. */
  description: string
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
  /** TASK-026: cria a conta (Edge Function `admin-create-user`) já vinculada com este papel. */
  createUser: (email: string, password: string, role: TRole) => Promise<{ user_id: string }>
  /** Texto de ajuda mostrado só no modo "Criar conta nova" (ex.: aviso de vínculo de organização também criado — RN-01 da TASK-026). */
  createUserHelpText?: string
  onClose: () => void
}

type AddMode = 'existing' | 'new'

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const TEMP_PASSWORD_LENGTH = 12

function generateTemporaryPassword(): string {
  let result = ''
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    result += TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)]
  }
  return result
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
  createUser,
  createUserHelpText,
  onClose,
}: AccessManagementModalProps<TRole>) {
  const [members, setMembers] = useState<AccessMember<TRole>[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

  const [addMode, setAddMode] = useState<AddMode>('existing')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TRole>(defaultRole)
  const [adding, setAdding] = useState(false)

  // Só usados no modo "new" (TASK-026).
  const [newPassword, setNewPassword] = useState('')
  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string } | null>(
    null,
  )

  const selectedRoleDescription = roleOptions.find((opt) => opt.value === role)?.description

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

  function switchAddMode(mode: AddMode) {
    setAddMode(mode)
    setError(null)
    setCreatedAccount(null)
  }

  async function handleAddExisting(e: FormEvent) {
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

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCreatedAccount(null)
    setAdding(true)
    try {
      await createUser(email.trim(), newPassword, role)
      // RN-02 da TASK-026: a senha só aparece aqui, uma vez — some ao
      // fechar o modal ou trocar de modo, nunca persistida além disso.
      setCreatedAccount({ email: email.trim(), password: newPassword })
      setEmail('')
      setNewPassword('')
      setRole(defaultRole)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário.')
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

      {createdAccount && (
        <p className="access-created-account" role="status">
          Conta criada. Repasse para {createdAccount.email}: senha{' '}
          <code>{createdAccount.password}</code> — ela vai precisar trocar no primeiro login.
        </p>
      )}

      <div className="access-add-mode-toggle">
        <button
          type="button"
          className={addMode === 'existing' ? 'btn ghost small active' : 'btn ghost small'}
          aria-pressed={addMode === 'existing'}
          onClick={() => switchAddMode('existing')}
        >
          Já tem conta
        </button>
        <button
          type="button"
          className={addMode === 'new' ? 'btn ghost small active' : 'btn ghost small'}
          aria-pressed={addMode === 'new'}
          onClick={() => switchAddMode('new')}
        >
          Criar conta nova
        </button>
      </div>

      {addMode === 'existing' ? (
        <form className="access-add-form" onSubmit={handleAddExisting}>
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
            {selectedRoleDescription && <p className="field-hint">{selectedRoleDescription}</p>}
          </div>
          <button type="submit" className="btn primary" disabled={adding || email.trim().length === 0}>
            {adding ? 'Adicionando…' : 'Adicionar'}
          </button>
        </form>
      ) : (
        <form className="access-add-form" onSubmit={handleCreateUser}>
          {createUserHelpText && <p className="field-hint">{createUserHelpText}</p>}
          <div className="field">
            <label htmlFor="new-user-email">E-mail</label>
            <input
              id="new-user-email"
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
            <label htmlFor="new-user-password">Senha temporária</label>
            <div className="field-with-action">
              <input
                id="new-user-password"
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Defina ou gere uma senha"
                autoComplete="off"
                disabled={adding}
              />
              <button
                type="button"
                className="btn ghost small"
                disabled={adding}
                onClick={() => setNewPassword(generateTemporaryPassword())}
              >
                Gerar senha
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="new-user-role">Papel</label>
            <select
              id="new-user-role"
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
            {selectedRoleDescription && <p className="field-hint">{selectedRoleDescription}</p>}
          </div>
          <button
            type="submit"
            className="btn primary"
            disabled={adding || email.trim().length === 0 || newPassword.length === 0}
          >
            {adding ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
      )}
    </Modal>
  )
}
