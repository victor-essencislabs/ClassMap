// TASK-043 (ADR-011) — ciclo de "assentamento" (`settling`) do
// fitToScreen: liga ao chamar `fitToScreen`, desliga sozinho depois de
// ~150ms (ver "Estratégia de testes" da task), e qualquer interação do
// usuário durante a janela interrompe o assentamento sem erro (RN-01).
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasZoomPan } from './useCanvasZoomPan'

function makeContainerRef() {
  return { current: document.createElement('div') }
}

describe('useCanvasZoomPan — settling (TASK-043)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('começa desligado', () => {
    const { result } = renderHook(() => useCanvasZoomPan(makeContainerRef()))
    expect(result.current.settling).toBe(false)
  })

  it('liga ao chamar fitToScreen e desliga sozinho depois de ~150ms', () => {
    const { result } = renderHook(() => useCanvasZoomPan(makeContainerRef()))

    act(() => {
      result.current.fitToScreen(null)
    })
    expect(result.current.settling).toBe(true)

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current.settling).toBe(false)
  })

  it('uma segunda chamada de fitToScreen reinicia a janela de 150ms', () => {
    const { result } = renderHook(() => useCanvasZoomPan(makeContainerRef()))

    act(() => {
      result.current.fitToScreen(null)
    })
    act(() => {
      vi.advanceTimersByTime(100)
      result.current.fitToScreen(null)
    })
    expect(result.current.settling).toBe(true)

    // já teriam passado 150ms desde a 1ª chamada, mas só 100ms desde a 2ª.
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.settling).toBe(true)

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.settling).toBe(false)
  })

  it('RN-01: zoomIn/zoomOut por gesto do usuário interrompem o assentamento sem erro', () => {
    const { result } = renderHook(() => useCanvasZoomPan(makeContainerRef()))

    act(() => {
      result.current.fitToScreen(null)
    })
    expect(result.current.settling).toBe(true)

    act(() => {
      result.current.zoomIn()
    })
    expect(result.current.settling).toBe(false)

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(200)
      })
    }).not.toThrow()
    expect(result.current.settling).toBe(false)

    act(() => {
      result.current.fitToScreen(null)
      result.current.zoomOut()
    })
    expect(result.current.settling).toBe(false)
  })

  it('RN-01: iniciar um pan pelo fundo do canvas interrompe o assentamento', () => {
    const { result } = renderHook(() => useCanvasZoomPan(makeContainerRef()))

    act(() => {
      result.current.fitToScreen(null)
    })
    expect(result.current.settling).toBe(true)

    act(() => {
      result.current.onBackgroundPointerDown({
        clientX: 10,
        clientY: 10,
        currentTarget: {},
      } as unknown as Parameters<typeof result.current.onBackgroundPointerDown>[0])
    })
    expect(result.current.settling).toBe(false)
  })

  it('panToNode (salto da sidebar) também interrompe o assentamento — não é transicionado', () => {
    const { result } = renderHook(() => useCanvasZoomPan(makeContainerRef()))

    act(() => {
      result.current.fitToScreen(null)
    })
    expect(result.current.settling).toBe(true)

    act(() => {
      result.current.panToNode({ x: 0, y: 0, w: 10, h: 10 })
    })
    expect(result.current.settling).toBe(false)
  })
})
