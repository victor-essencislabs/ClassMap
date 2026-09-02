// TASK-047 — testa `useDiagramRemoteUpdate` com um canal Supabase falso
// (nunca abre WebSocket de verdade em teste). Confere: um UPDATE remoto
// com conteúdo IGUAL ao local (ex.: o eco do próprio autosave) nunca
// dispara o aviso; um UPDATE com conteúdo DIFERENTE dispara; `dismiss()`
// e a troca de `diagramId` desligam o aviso; o canal fecha ao desmontar.
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiagramRemoteUpdate } from './useDiagramRemoteUpdate'

const channelMock = vi.fn()

vi.mock('../../lib/supabase/client', () => ({
  supabase: { channel: (...args: unknown[]) => channelMock(...args) },
}))

function createFakeChannel() {
  let updateCallback: ((payload: { new: { content?: unknown } }) => void) | undefined
  const unsubscribe = vi.fn()

  const channel = {
    on: vi.fn((type: string, _filter: unknown, cb: typeof updateCallback) => {
      if (type === 'postgres_changes') updateCallback = cb
      return channel
    }),
    subscribe: vi.fn(() => channel),
    unsubscribe,
  }

  return {
    channel,
    unsubscribe,
    emitUpdate(content: unknown) {
      updateCallback?.({ new: { content } })
    },
  }
}

describe('useDiagramRemoteUpdate', () => {
  beforeEach(() => {
    channelMock.mockReset()
  })

  it('assina postgres_changes filtrado pelo id do diagrama', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    renderHook(() => useDiagramRemoteUpdate('diagram-1', { classes: [] }))

    expect(channelMock).toHaveBeenCalledWith('diagram-changes:diagram-1')
    expect(fake.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'diagrams', filter: 'id=eq.diagram-1' },
      expect.any(Function),
    )
  })

  it('UPDATE com conteúdo igual ao local (eco do próprio autosave) não dispara o aviso', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { result } = renderHook(() => useDiagramRemoteUpdate('diagram-1', { classes: ['A'] }))

    act(() => fake.emitUpdate({ classes: ['A'] }))
    expect(result.current.remoteUpdateAvailable).toBe(false)
  })

  it('UPDATE com conteúdo diferente do local dispara o aviso', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { result } = renderHook(() => useDiagramRemoteUpdate('diagram-1', { classes: ['A'] }))

    act(() => fake.emitUpdate({ classes: ['A', 'B'] }))
    expect(result.current.remoteUpdateAvailable).toBe(true)
  })

  it('compara sempre contra o conteúdo local mais recente, não o do primeiro render', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { result, rerender } = renderHook(
      ({ content }: { content: unknown }) => useDiagramRemoteUpdate('diagram-1', content),
      { initialProps: { content: { classes: ['A'] } } },
    )

    // a própria pessoa edita localmente (ainda não salvou) — o conteúdo local muda.
    rerender({ content: { classes: ['A', 'B'] } })
    // chega um UPDATE remoto que já reflete essa mesma edição (autosave desta aba).
    act(() => fake.emitUpdate({ classes: ['A', 'B'] }))
    expect(result.current.remoteUpdateAvailable).toBe(false)
  })

  it('dismiss() desliga o aviso', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { result } = renderHook(() => useDiagramRemoteUpdate('diagram-1', { classes: [] }))
    act(() => fake.emitUpdate({ classes: ['B'] }))
    expect(result.current.remoteUpdateAvailable).toBe(true)

    act(() => result.current.dismiss())
    expect(result.current.remoteUpdateAvailable).toBe(false)
  })

  it('trocar de diagramId desliga um aviso pendente', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { result, rerender } = renderHook(
      ({ diagramId }: { diagramId: string }) => useDiagramRemoteUpdate(diagramId, { classes: [] }),
      { initialProps: { diagramId: 'diagram-1' } },
    )
    act(() => fake.emitUpdate({ classes: ['B'] }))
    expect(result.current.remoteUpdateAvailable).toBe(true)

    rerender({ diagramId: 'diagram-2' })
    expect(result.current.remoteUpdateAvailable).toBe(false)
  })

  it('desfaz o canal ao desmontar', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const { unmount } = renderHook(() => useDiagramRemoteUpdate('diagram-1', { classes: [] }))
    unmount()

    expect(fake.unsubscribe).toHaveBeenCalled()
  })
})
