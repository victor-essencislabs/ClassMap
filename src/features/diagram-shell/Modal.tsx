// TASK-010 — modal genérico do design system (`.modal-overlay`/`.modal`/
// `.modal-head`/`.modal-body`, tokens/CSS já existentes desde a TASK-006).
// Extraído aqui porque o primeiro uso real (`ClassPickerModal`, TASK-008)
// duplicava esse markup sem fechar por clique fora/Esc — os modais de
// Exportar/Importar (TASK-010) precisam disso, então este componente
// passa a ser a base compartilhada por todos (`ClassPickerModal` também
// migrou para ele, ver decisão na TASK-010).
import { useEffect, type MouseEvent, type ReactNode } from 'react'

export interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    // só fecha quando o clique é no próprio overlay, não num filho
    // (`.modal`) borbulhando até aqui — clicar dentro do modal não fecha.
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay show" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
