// TASK-011 (ADR-003) — confirmação por nome antes de excluir organização
// ou projeto (hard delete, irreversível). Reaproveita o `Modal` genérico
// (TASK-010) em vez de duplicar overlay/fechar por Esc/clique fora.
// Compartilhado por `OrganizationsPage`/`ProjectsPage` — mesmo mecanismo
// para os dois, só muda o texto e o que `onConfirm` chama.
import { useState, type FormEvent } from 'react'
import { Modal } from '../diagram-shell/Modal'

interface DeleteConfirmModalProps {
  title: string
  /** Nome exato que precisa ser digitado para habilitar a exclusão (case-sensitive, CA-03 da TASK-011). */
  name: string
  /** Mensagem de aviso específica (o que será perdido por cascata). */
  warning: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function DeleteConfirmModal({ title, name, warning, onConfirm, onClose }: DeleteConfirmModalProps) {
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const matches = typed === name

  async function handleConfirm(e?: FormEvent) {
    e?.preventDefault()
    if (!matches || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await onConfirm()
      // sucesso: quem chama fecha o modal (normalmente depois de recarregar a lista) —
      // não fechamos aqui para não perder a mensagem de erro em caso de falha.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
      setDeleting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="error">{warning}</p>
      <form onSubmit={handleConfirm}>
        <div className="field">
          <label htmlFor="delete-confirm-name">
            Digite <strong>{name}</strong> para confirmar
          </label>
          <input
            id="delete-confirm-name"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoFocus
            disabled={deleting}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="submit" className="btn danger" disabled={!matches || deleting}>
            {deleting ? 'Excluindo…' : 'Excluir definitivamente'}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} disabled={deleting}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
