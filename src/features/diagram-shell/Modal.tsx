// TASK-010 — modal genérico do design system (`.modal-overlay`/`.modal`/
// `.modal-head`/`.modal-body`, tokens/CSS já existentes desde a TASK-006).
// Extraído aqui porque o primeiro uso real (`ClassPickerModal`, TASK-008)
// duplicava esse markup sem fechar por clique fora/Esc — os modais de
// Exportar/Importar (TASK-010) precisam disso, então este componente
// passa a ser a base compartilhada por todos (`ClassPickerModal` também
// migrou para ele, ver decisão na TASK-010).
//
// TASK-045 — abrir usa animação CSS pura (`@keyframes` em `index.css`, ver
// comentário lá): não depende de nenhum estado/classe daqui para chegar
// ao estado visível, então uma falha de script não deixa o modal preso
// invisível. Fechar é o único trecho que depende de JS: precisa manter o
// modal montado durante a transição de saída (mais rápida que a de
// entrada, RN-01) antes de avisar o dono via `onClose` — `closingRef`
// evita disparar esse timer duas vezes (ex.: Esc logo após clique fora).
// A lógica de QUANDO fechar (alvo do clique, tecla Esc) não mudou.
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

export interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

// Deve bater com a duração da animação `modal-*-out` em `index.css` (não
// precisa ser exata — só não pode ser menor, para não cortar a saída).
const CLOSE_TRANSITION_MS = 100

export function Modal({ title, onClose, children }: ModalProps) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)

  function requestClose() {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
  }

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(onClose, CLOSE_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    // só fecha quando o clique é no próprio overlay, não num filho
    // (`.modal`) borbulhando até aqui — clicar dentro do modal não fecha.
    if (e.target === e.currentTarget) requestClose()
  }

  return (
    <div
      className={`modal-overlay show${closing ? ' closing' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`modal${closing ? ' closing' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={requestClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
