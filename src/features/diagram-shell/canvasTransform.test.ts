// TASK-007 — testes unitários da matemática de zoom/pan (ver
// "Estratégia de testes" da task: "zoom/pan (matemática de
// transformação)").
import { describe, expect, it } from 'vitest'
import {
  clampZoom,
  computeBounds,
  cssTransform,
  fitToScreen,
  panToNode,
  screenDeltaToWorld,
  zoomAtPoint,
  zoomByFactor,
} from './canvasTransform'

describe('clampZoom', () => {
  it('nunca deixa passar de MAX_ZOOM nem de MIN_ZOOM', () => {
    expect(clampZoom(10)).toBe(2.5)
    expect(clampZoom(0.0001)).toBe(0.08)
    expect(clampZoom(1)).toBe(1)
  })
})

describe('cssTransform', () => {
  it('gera translate(...) scale(...) na ordem esperada pelo CSS', () => {
    expect(cssTransform({ zoom: 1.5, pan: { x: 10, y: -4 } })).toBe('translate(10px, -4px) scale(1.5)')
  })
})

describe('zoomAtPoint', () => {
  it('mantém o ponto do cursor fixo na tela ao aproximar', () => {
    const current = { zoom: 1, pan: { x: 0, y: 0 } }
    const next = zoomAtPoint(current, 2, 100, 50)
    // o ponto-mundo sob o cursor antes do zoom...
    const worldBefore = { x: (100 - current.pan.x) / current.zoom, y: (50 - current.pan.y) / current.zoom }
    // ...tem que mapear para o mesmo ponto de tela depois do zoom.
    const screenAfter = {
      x: worldBefore.x * next.zoom + next.pan.x,
      y: worldBefore.y * next.zoom + next.pan.y,
    }
    expect(screenAfter.x).toBeCloseTo(100)
    expect(screenAfter.y).toBeCloseTo(50)
    expect(next.zoom).toBe(2)
  })

  it('respeita o clamp de zoom mesmo com fator agressivo', () => {
    const next = zoomAtPoint({ zoom: 2, pan: { x: 0, y: 0 } }, 10, 0, 0)
    expect(next.zoom).toBe(2.5)
  })
})

describe('zoomByFactor', () => {
  it('muda só o zoom, preserva o pan', () => {
    const next = zoomByFactor({ zoom: 1, pan: { x: 12, y: 34 } }, 1.2)
    expect(next.zoom).toBeCloseTo(1.2)
    expect(next.pan).toEqual({ x: 12, y: 34 })
  })
})

describe('computeBounds', () => {
  it('retorna null para lista vazia', () => {
    expect(computeBounds([])).toBeNull()
  })

  it('calcula o bounding box exato de vários nós', () => {
    const bounds = computeBounds([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 200, y: -20, w: 100, h: 50 },
    ])
    expect(bounds).toEqual({ minX: 0, minY: -20, maxX: 300, maxY: 50 })
  })
})

describe('fitToScreen', () => {
  it('sem bounds, volta ao zoom 1 e pan padrão (40,40)', () => {
    expect(fitToScreen(null, { width: 800, height: 600 })).toEqual({ zoom: 1, pan: { x: 40, y: 40 } })
  })

  it('com bounds, calcula um zoom que cabe tudo no viewport', () => {
    const bounds = { minX: 0, minY: 0, maxX: 2000, maxY: 100 }
    const result = fitToScreen(bounds, { width: 800, height: 600 })
    // largura do conteúdo (2000+80=2080) não cabe em 800px sem reduzir o zoom
    expect(result.zoom).toBeLessThan(1)
    expect(result.zoom).toBeGreaterThanOrEqual(0.12)
  })

  it('nunca deixa o zoom passar de 1.15 mesmo com bounds minúsculos', () => {
    const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    const result = fitToScreen(bounds, { width: 800, height: 600 })
    expect(result.zoom).toBeLessThanOrEqual(1.15)
  })
})

describe('panToNode', () => {
  it('centraliza o nó no viewport, mantendo o zoom recebido', () => {
    const result = panToNode({ x: 100, y: 100, w: 200, h: 100 }, 1, { width: 800, height: 600 })
    expect(result.zoom).toBe(1)
    // centro do nó (200,150) deve mapear para o centro do viewport (400,300)
    expect(result.pan.x + 200 * 1).toBeCloseTo(400)
    expect(result.pan.y + 150 * 1).toBeCloseTo(300)
  })
})

describe('screenDeltaToWorld', () => {
  it('divide o delta de tela pelo zoom atual', () => {
    expect(screenDeltaToWorld(100, 50, 2)).toEqual({ x: 50, y: 25 })
    expect(screenDeltaToWorld(100, 50, 1)).toEqual({ x: 100, y: 50 })
  })
})
