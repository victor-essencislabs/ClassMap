// TASK-007 — matemática pura de zoom/pan do canvas de diagrama,
// extraída para `diagram-shell` por ser compartilhável entre as
// visualizações que usam o canvas (Diagrama de Classes agora,
// Diagrama de Objetos na TASK-008 — ver decisão registrada na task).
// Espelha fielmente as funções equivalentes do artefato-protótipo
// (`applyTransform`/`fitToScreen`/`panToNode`/o handler de `wheel`,
// ver ADR-002) — só a forma de aplicar o resultado muda (aqui vira um
// `transform` CSS lido por `useCanvasZoomPan`, lá era um atributo SVG).

export interface CanvasTransform {
  zoom: number
  pan: { x: number; y: number }
}

export interface CanvasBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface Viewport {
  width: number
  height: number
}

/** Um nó qualquer do diagrama (classe, objeto...) com posição/tamanho —
 * o suficiente para calcular bounds/enquadramento, sem acoplar a um tipo
 * de conteúdo específico. */
export interface BoundedNode {
  x: number
  y: number
  w: number
  h: number
}

export const MIN_ZOOM = 0.08
export const MAX_ZOOM = 2.5

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function cssTransform({ zoom, pan }: CanvasTransform): string {
  return `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
}

/** Zoom por um fator (>1 aproxima, <1 afasta) mantendo o ponto do
 * cursor (coordenadas relativas ao container do canvas) fixo na tela —
 * mesma lógica do handler de `wheel` do artefato. */
export function zoomAtPoint(current: CanvasTransform, factor: number, pointerX: number, pointerY: number): CanvasTransform {
  const nextZoom = clampZoom(current.zoom * factor)
  const worldX = (pointerX - current.pan.x) / current.zoom
  const worldY = (pointerY - current.pan.y) / current.zoom
  return {
    zoom: nextZoom,
    pan: { x: pointerX - worldX * nextZoom, y: pointerY - worldY * nextZoom },
  }
}

/** Botões +/− do `.zoom-controls`: aplica o fator no centro do
 * viewport (o artefato aplica sem mover o pan — só a escala muda). */
export function zoomByFactor(current: CanvasTransform, factor: number): CanvasTransform {
  return { zoom: clampZoom(current.zoom * factor), pan: current.pan }
}

/** Calcula o bounding box (em coordenadas do mundo) de uma lista de
 * nós — `null` se não houver nenhum, para o chamador decidir o
 * enquadramento padrão. */
export function computeBounds(nodes: BoundedNode[]): CanvasBounds | null {
  if (nodes.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.w)
    maxY = Math.max(maxY, n.y + n.h)
  }
  return { minX, minY, maxX, maxY }
}

/** "Ajustar à tela" (botão ⤢) — replica `fitToScreen` do artefato:
 * sem nós, volta ao zoom/pan padrão; com nós, calcula a escala que cabe
 * tudo no viewport (com uma margem de 40px por lado, zoom entre
 * MIN_ZOOM e 1.15). */
export function fitToScreen(bounds: CanvasBounds | null, viewport: Viewport): CanvasTransform {
  if (!bounds) return { zoom: 1, pan: { x: 40, y: 40 } }

  const w = bounds.maxX - bounds.minX + 80
  const h = bounds.maxY - bounds.minY + 80
  const scale = Math.min(viewport.width / w, viewport.height / h, 1.15)
  const zoom = Math.max(scale, 0.12)

  return {
    zoom,
    pan: {
      x: viewport.width / 2 - (bounds.minX + w / 2 - 40) * zoom,
      y: viewport.height / 2 - (bounds.minY + h / 2 - 40) * zoom,
    },
  }
}

/** Centraliza um nó no viewport, no zoom atual — usado ao clicar num
 * item da lista da sidebar (`panToNode` no artefato). */
export function panToNode(node: BoundedNode, zoom: number, viewport: Viewport): CanvasTransform {
  return {
    zoom,
    pan: {
      x: viewport.width / 2 - (node.x + node.w / 2) * zoom,
      y: viewport.height / 2 - (node.y + node.h / 2) * zoom,
    },
  }
}

/** Converte um delta em pixels de tela (ex.: movimento do ponteiro) no
 * delta equivalente em coordenadas do mundo — necessário para arrastar
 * um card ou o ponto de controle de um conector corretamente quando o
 * canvas está com zoom aplicado (a divisão por `zoom` é o que o
 * artefato faz em `dxp = (ev.clientX-startX)/state.zoom`). */
export function screenDeltaToWorld(dx: number, dy: number, zoom: number): { x: number; y: number } {
  return { x: dx / zoom, y: dy / zoom }
}
