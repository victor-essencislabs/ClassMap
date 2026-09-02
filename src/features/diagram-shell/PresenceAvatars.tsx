// TASK-047 — painel de avatares de "quem está vendo este diagrama
// agora" (ver `useDiagramPresence`). Só iniciais num círculo — sem
// foto/avatar_url (a tabela `profiles` não tem essa coluna).
import type { DiagramViewer } from './useDiagramPresence'

const MAX_SHOWN = 4

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function PresenceAvatars({ viewers }: { viewers: DiagramViewer[] }) {
  if (viewers.length === 0) return null

  const shown = viewers.slice(0, MAX_SHOWN)
  const extra = viewers.length - shown.length

  return (
    <div
      className="presence-avatars"
      role="group"
      aria-label={`${viewers.length} pessoa${viewers.length === 1 ? '' : 's'} vendo este diagrama agora`}
    >
      {shown.map((v) => (
        <span key={v.id} className="presence-avatar" title={v.name}>
          {initials(v.name)}
        </span>
      ))}
      {extra > 0 && (
        <span className="presence-avatar presence-avatar-more" title={viewers.slice(MAX_SHOWN).map((v) => v.name).join(', ')}>
          +{extra}
        </span>
      )}
    </div>
  )
}
