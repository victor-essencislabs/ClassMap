// TASK-047 — painel de avatares de presença: nada renderiza sem
// visitantes; iniciais corretas (1 e 2 palavras); "+N" a partir do 5º.
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PresenceAvatars } from './PresenceAvatars'
import type { DiagramViewer } from './useDiagramPresence'

describe('PresenceAvatars', () => {
  it('não renderiza nada sem ninguém vendo o diagrama', () => {
    const { container } = render(<PresenceAvatars viewers={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra as iniciais de cada pessoa (1 e 2 palavras)', () => {
    const viewers: DiagramViewer[] = [
      { id: 'u1', name: 'Ana' },
      { id: 'u2', name: 'Bruno Lima' },
    ]
    render(<PresenceAvatars viewers={viewers} />)
    expect(screen.getByText('AN')).toBeInTheDocument()
    expect(screen.getByText('BL')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '2 pessoas vendo este diagrama agora' })).toBeInTheDocument()
  })

  it('mostra só o singular quando é 1 pessoa', () => {
    render(<PresenceAvatars viewers={[{ id: 'u1', name: 'Ana' }]} />)
    expect(screen.getByRole('group', { name: '1 pessoa vendo este diagrama agora' })).toBeInTheDocument()
  })

  it('a partir da 5ª pessoa, agrupa em "+N"', () => {
    const viewers: DiagramViewer[] = Array.from({ length: 6 }, (_, i) => ({ id: `u${i}`, name: `Pessoa ${i}` }))
    render(<PresenceAvatars viewers={viewers} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})
