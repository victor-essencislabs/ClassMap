// TASK-047 — testa `useDiagramRemoteUpdate` com um canal Supabase falso
// (nunca abre WebSocket de verdade em teste). Confere: um UPDATE remoto
// com conteúdo IGUAL ao local (ex.: o eco do próprio autosave) nunca
// dispara o aviso; um UPDATE com conteúdo DIFERENTE dispara; `dismiss()`
// e a troca de `diagramId` desligam o aviso; o canal fecha ao desmontar.
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stableStringify, useDiagramRemoteUpdate } from './useDiagramRemoteUpdate'

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

  // Regressão (2026-09-02, achado real do usuário): editando sozinho —
  // criar uma classe e movê-la — o aviso disparava mesmo sem ninguém
  // mais mexendo no diagrama. Causa raiz: o `jsonb` do Postgres reordena
  // as chaves de um objeto (confirmado ao vivo contra produção real —
  // `{"z":1,"a":2}` volta como `{"a":2,"z":1}`), então o eco do próprio
  // autosave nunca tinha a mesma ordem de chaves do objeto local, e a
  // comparação por `JSON.stringify` cru (sensível à ordem) reportava
  // "diferente" mesmo sendo o mesmo conteúdo.
  it('UPDATE com o mesmo conteúdo em ordem de chaves diferente (jsonb reordenado) não dispara o aviso', () => {
    const fake = createFakeChannel()
    channelMock.mockReturnValue(fake.channel)

    const local = { classes: [{ id: 'c1', name: 'Pedido', x: 10, y: 20 }], relationships: [] }
    // mesmo conteúdo, chaves em outra ordem — como o jsonb devolveria.
    const echoedFromJsonb = { relationships: [], classes: [{ y: 20, x: 10, name: 'Pedido', id: 'c1' }] }

    const { result } = renderHook(() => useDiagramRemoteUpdate('diagram-1', local))
    act(() => fake.emitUpdate(echoedFromJsonb))

    expect(result.current.remoteUpdateAvailable).toBe(false)
  })
})

describe('stableStringify', () => {
  it('ignora a ordem das chaves de um objeto', () => {
    expect(stableStringify({ z: 1, a: 2 })).toBe(stableStringify({ a: 2, z: 1 }))
  })

  it('ignora a ordem das chaves em objetos aninhados', () => {
    expect(stableStringify({ m: { y: 1, b: 2 } })).toBe(stableStringify({ m: { b: 2, y: 1 } }))
  })

  it('continua sensível à ordem dos elementos de um array (significativa)', () => {
    expect(stableStringify({ classes: ['A', 'B'] })).not.toBe(stableStringify({ classes: ['B', 'A'] }))
  })

  it('continua detectando uma diferença real de valor', () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }))
  })
})
