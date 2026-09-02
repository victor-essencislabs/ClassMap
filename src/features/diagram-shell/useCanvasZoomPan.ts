// TASK-007 — hook de zoom/pan do canvas, compartilhável entre as
// visualizações que usam o canvas transformável (Diagrama de Classes
// agora, Diagrama de Objetos na TASK-008 — ver decisão na task). Só
// liga a matemática pura de `canvasTransform.ts` a estado React e aos
// eventos de ponteiro/roda do mouse.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import {
  cssTransform,
  fitToScreen as fitToScreenTransform,
  panToNode as panToNodeTransform,
  zoomAtPoint,
  zoomByFactor,
  type BoundedNode,
  type CanvasBounds,
  type CanvasTransform,
} from './canvasTransform'

const DEFAULT_TRANSFORM: CanvasTransform = { zoom: 1, pan: { x: 40, y: 40 } }
const WHEEL_ZOOM_IN_FACTOR = 1.08
const WHEEL_ZOOM_OUT_FACTOR = 0.93
const BUTTON_ZOOM_IN_FACTOR = 1.2
const BUTTON_ZOOM_OUT_FACTOR = 0.8
// TASK-043 (ADR-011) — janela de "assentamento" do fitToScreen, espelha
// a duração da transição CSS aplicada pelo consumidor (`.settling`,
// ver `src/index.css`). Mudar aqui exige mudar lá também.
const SETTLE_DURATION_MS = 150

export interface UseCanvasZoomPanResult {
  zoom: number
  pan: { x: number; y: number }
  /** Pronto para `style={{ transform }}` no elemento que deve mover/escalar com o canvas. */
  transform: string
  /** TASK-043 — `true` por ~150ms depois de `fitToScreen`, para o
   * consumidor (`ClassDiagramCanvas`/`ObjectDiagramCanvas`) ligar uma
   * transição CSS só nesse gesto pontual. Nunca fica `true` durante
   * pan/zoom contínuo por gesto do usuário (RN-01: qualquer interação
   * durante o assentamento o interrompe sem erro). */
  settling: boolean
  zoomIn: () => void
  zoomOut: () => void
  fitToScreen: (bounds: CanvasBounds | null) => void
  panToNode: (node: BoundedNode) => void
  /** Converte um delta de tela (ex.: pointermove) no delta equivalente em coordenadas do mundo. */
  screenDeltaToWorld: (dx: number, dy: number) => { x: number; y: number }
  /** Handlers do arraste do FUNDO do canvas (pan) — não usar em cima de um card. */
  onBackgroundPointerDown: (e: ReactPointerEvent) => void
  onBackgroundPointerMove: (e: ReactPointerEvent) => void
  onBackgroundPointerUp: (e: ReactPointerEvent) => void
}

/** `containerRef` deve apontar para o elemento cujo `getBoundingClientRect()`
 * representa o viewport visível do canvas (o wrapper com `overflow:hidden`,
 * não o elemento transformado por dentro dele). */
export function useCanvasZoomPan(containerRef: RefObject<HTMLElement | null>): UseCanvasZoomPanResult {
  const [transform, setTransform] = useState<CanvasTransform>(DEFAULT_TRANSFORM)
  const panDrag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // TASK-043 — sinalizador de "assentamento" (ver `settling` na
  // interface acima) e o timeout que o desliga sozinho depois de
  // SETTLE_DURATION_MS.
  const [settling, setSettling] = useState(false)
  const settlingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSettling = useCallback(() => {
    if (settlingTimeoutRef.current !== null) {
      clearTimeout(settlingTimeoutRef.current)
      settlingTimeoutRef.current = null
    }
    setSettling(false)
  }, [])

  // RN-01: nenhum timeout pendente sobrevive ao desmonte do componente.
  //
  // Precisa passar por `clearSettling()` (que também reseta `settling`
  // para `false`), não só `clearTimeout` cru — do contrário, em dev com
  // `<StrictMode>` (`main.tsx`), o ciclo sintético de desmontagem/
  // remontagem que o React roda uma vez por montagem cancela o timeout
  // agendado pelo `fitToScreen` inicial sem nunca zerar o estado
  // `settling`, e o efeito-guarda de "só ajustar uma vez"
  // (`didInitialFit` em `ClassDiagramCanvas`/`ObjectDiagramCanvas`)
  // impede a remontagem seguinte de re-agendar — `.canvas-viewport`
  // fica com `settling`/a transição de 150ms grudada indefinidamente
  // até a primeira interação do usuário (zoom/pan) chamar
  // `clearSettling()` por outro caminho. Achado por validação visual
  // manual em 2026-09-01 (rodada de animação, TASK-043) — não pego
  // pelos testes automatizados porque `renderHook` não reproduz o
  // ciclo duplo do `StrictMode`.
  useEffect(() => {
    return () => {
      clearSettling()
    }
  }, [clearSettling])

  function viewport() {
    const rect = containerRef.current?.getBoundingClientRect()
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
  }

  const zoomIn = useCallback(() => {
    clearSettling()
    setTransform((prev) => zoomByFactor(prev, BUTTON_ZOOM_IN_FACTOR))
  }, [clearSettling])
  const zoomOut = useCallback(() => {
    clearSettling()
    setTransform((prev) => zoomByFactor(prev, BUTTON_ZOOM_OUT_FACTOR))
  }, [clearSettling])

  const fitToScreen = useCallback(
    (bounds: CanvasBounds | null) => {
      setTransform(fitToScreenTransform(bounds, viewport()))
      setSettling(true)
      if (settlingTimeoutRef.current !== null) clearTimeout(settlingTimeoutRef.current)
      settlingTimeoutRef.current = setTimeout(() => {
        settlingTimeoutRef.current = null
        setSettling(false)
      }, SETTLE_DURATION_MS)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const panToNode = useCallback(
    (node: BoundedNode) => {
      clearSettling()
      setTransform((prev) => panToNodeTransform(node, prev.zoom, viewport()))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearSettling],
  )

  const screenDeltaToWorld = useCallback(
    (dx: number, dy: number) => ({ x: dx / transform.zoom, y: dy / transform.zoom }),
    [transform.zoom],
  )

  // Roda do mouse: listener nativo (não `onWheel` do React) para poder
  // chamar `preventDefault` de forma confiável — o mesmo cuidado do
  // `{passive:false}` do artefato.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function handleWheel(ev: WheelEvent) {
      ev.preventDefault()
      clearSettling()
      const rect = el!.getBoundingClientRect()
      const pointerX = ev.clientX - rect.left
      const pointerY = ev.clientY - rect.top
      const factor = ev.deltaY < 0 ? WHEEL_ZOOM_IN_FACTOR : WHEEL_ZOOM_OUT_FACTOR
      setTransform((prev) => zoomAtPoint(prev, factor, pointerX, pointerY))
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
    // `containerRef` é estável (não recria o elemento durante a vida do
    // componente) — não precisa entrar nas deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onBackgroundPointerDown(e: ReactPointerEvent) {
    clearSettling()
    panDrag.current = { startX: e.clientX, startY: e.clientY, origX: transform.pan.x, origY: transform.pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onBackgroundPointerMove(e: ReactPointerEvent) {
    const drag = panDrag.current
    if (!drag) return
    setTransform((prev) => ({
      zoom: prev.zoom,
      pan: { x: drag.origX + (e.clientX - drag.startX), y: drag.origY + (e.clientY - drag.startY) },
    }))
  }

  function onBackgroundPointerUp() {
    panDrag.current = null
  }

  return {
    zoom: transform.zoom,
    pan: transform.pan,
    transform: cssTransform(transform),
    settling,
    zoomIn,
    zoomOut,
    fitToScreen,
    panToNode,
    screenDeltaToWorld,
    onBackgroundPointerDown,
    onBackgroundPointerMove,
    onBackgroundPointerUp,
  }
}
