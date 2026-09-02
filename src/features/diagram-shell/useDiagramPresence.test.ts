// TASK-047 — testa `useDiagramPresence` com um canal Supabase falso
// (nunca abre WebSocket de verdade em teste, ver `vi.mock` abaixo).
// Confere: nenhum canal é aberto sem `diagramId`/`me`; ao assinar,
// `track()` é chamado com os dados da própria pessoa; o evento
// `presence sync` atualiza a lista (uma entrada por chave, mesmo com 2
// abas da mesma pessoa); o canal é desfeito ao desmontar.
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { meFromSession, useDiagramPresence, type DiagramViewer } from './useDiagramPresence'
import type { Session } from '@supabase/supabase-js'

const channelMock = vi.fn()

vi.mock('../../lib/supabase/client', () => ({
  supabase: { channel: (...args: unknown[]) => channelMock(...args) },
}))

function createFakeChannel() {
  let syncCallback: (() => void) | undefined
  let presenceState: Record<string, DiagramViewer[]> = {}
  const track = vi.fn()
  const unsubscribe = vi.fn()

  const channel = {
    on: vi.fn((type: string, filter: { event: string }, cb: () => void) => {
      if (type === 'presence' && filter.event === 'sync') syncCallback = cb
      return channel
    }),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      cb?.('SUBSCRIBED')
      return channel
    }),
    track,
    unsubscribe,
    presenceState: () => presenceState,
  }

  return {
    channel,
    track,
    unsubscribe,
    setPresenceState(next: Record<string, DiagramViewer[]>) {
      presenceState = next
      syncCallback?.()
    },
  }
}

const me: DiagramViewer = { id: 'user-1', name: 'Ana Souza' }

describe('useDiagramPresence', () => {
  beforeEach(() => {
    channelMock.mockReset()
  })

  it('não abre canal nenhum sem diagramId ou sem `me`', () => {
    const { result, rerender } = renderHook<
      DiagramViewer[],
      { diagramId: string | undefined; viewer: DiagramViewer | null }
    >(({ diagramId, viewer }) => useDiagramPresence(diagramId, viewer), {
      initialProps: { diagramId: undefined, viewer: me },
    })
    expect(result.current).toEqual([])
    expect(channelMock).not.toHaveBeenCalled()

    rerender({ diagramId: 'diagram-1', viewer: null })
    expect(result.current).toEqual([])
    expect(channelMock).not.toHaveBeenCalled()
  })

  it('assina o canal do diagrama e faz track() da própria pessoa ao conectar', async () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    renderHook(() => useDiagramPresence('diagram-1', me))

    expect(channelMock).toHaveBeenCalledWith('presence:diagram:diagram-1', {
      config: { presence: { key: 'user-1' } },
    })
    await waitFor(() => expect(fake.track).toHaveBeenCalledWith(me))
  })

  it('o evento de sync reflete o presenceState — uma entrada por chave', async () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { result } = renderHook(() => useDiagramPresence('diagram-1', me))

    fake.setPresenceState({
      'user-1': [{ id: 'user-1', name: 'Ana Souza' }],
      // 2 abas da mesma pessoa — só 1 entrada deve aparecer.
      'user-2': [
        { id: 'user-2', name: 'Bruno Lima' },
        { id: 'user-2', name: 'Bruno Lima' },
      ],
    })

    await waitFor(() =>
      expect(result.current).toEqual([
        { id: 'user-1', name: 'Ana Souza' },
        { id: 'user-2', name: 'Bruno Lima' },
      ]),
    )
  })

  it('desfaz o canal ao desmontar', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { unmount } = renderHook(() => useDiagramPresence('diagram-1', me))
    unmount()

    expect(fake.unsubscribe).toHaveBeenCalled()
  })
})

describe('meFromSession', () => {
  it('retorna null sem sessão', () => {
    expect(meFromSession(null)).toBeNull()
  })

  it('usa full_name do user_metadata quando disponível', () => {
    const session = {
      user: { id: 'user-1', email: 'ana@essencislabs.com', user_metadata: { full_name: 'Ana Souza' } },
    } as unknown as Session
    expect(meFromSession(session)).toEqual({ id: 'user-1', name: 'Ana Souza' })
  })

  it('cai pro e-mail quando não há full_name', () => {
    const session = {
      user: { id: 'user-1', email: 'ana@essencislabs.com', user_metadata: {} },
    } as unknown as Session
    expect(meFromSession(session)).toEqual({ id: 'user-1', name: 'ana@essencislabs.com' })
  })
})
