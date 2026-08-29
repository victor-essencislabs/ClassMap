// TASK-006 — toast de feedback reutilizável (ex. "Exemplo carregado"),
// usado pelas próximas tasks de diagrama (TASK-007/008/009/010).
import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 2400

/** Estado + agendamento de auto-dispensa de um toast — um por tela. */
export function useToast(durationMs = DEFAULT_DURATION_MS) {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setMessage(null), durationMs)
    },
    [durationMs],
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { message, showToast }
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className={`toast${message ? ' show' : ''}`} role="status" aria-live="polite">
      {message ?? ''}
    </div>
  )
}
