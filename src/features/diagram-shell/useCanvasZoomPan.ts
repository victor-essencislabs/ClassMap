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

export interface UseCanvasZoomPanResult {
  zoom: number
  pan: { x: number; y: number }
  /** Pronto para `style={{ transform }}` no elemento que deve mover/escalar com o canvas. */
  transform: string
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

  function viewport() {
    const rect = containerRef.current?.getBoundingClientRect()
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
  }

  const zoomIn = useCallback(() => setTransform((prev) => zoomByFactor(prev, BUTTON_ZOOM_IN_FACTOR)), [])
  const zoomOut = useCallback(() => setTransform((prev) => zoomByFactor(prev, BUTTON_ZOOM_OUT_FACTOR)), [])

  const fitToScreen = useCallback(
    (bounds: CanvasBounds | null) => setTransform(fitToScreenTransform(bounds, viewport())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const panToNode = useCallback(
    (node: BoundedNode) => setTransform((prev) => panToNodeTransform(node, prev.zoom, viewport())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
