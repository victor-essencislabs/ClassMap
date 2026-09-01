// TASK-041 — cobre a decisão de "a animação do conector nascendo
// terminou?" isolada do DOM. jsdom não implementa `AnimationEvent`, então
// `onAnimationEnd` do React nunca dispara de fato num `animationend`
// simulado em teste (confirmado ao investigar um teste de integração que
// falhava silenciosamente) — a lógica em si é testada aqui como função
// pura; a integração real é validada manualmente no navegador (ver
// "Estratégia de testes"/"Validação" da task).
import { describe, expect, it } from 'vitest'
import { isJustCreatedAnimationEnd } from './Connector'

describe('isJustCreatedAnimationEnd', () => {
  it('reconhece o fim da animação normal (símbolo com delay)', () => {
    expect(isJustCreatedAnimationEnd('connector-symbol-in')).toBe(true)
  })

  it('reconhece o fim da animação de prefers-reduced-motion (fade único)', () => {
    expect(isJustCreatedAnimationEnd('connector-fade-once')).toBe(true)
  })

  it('ignora o fim do traço se desenhando (connector-draw) — símbolo ainda não terminou', () => {
    expect(isJustCreatedAnimationEnd('connector-draw')).toBe(false)
  })

  it('ignora nomes de animação de qualquer outro efeito ou undefined', () => {
    expect(isJustCreatedAnimationEnd('ov-detail-in')).toBe(false)
    expect(isJustCreatedAnimationEnd(undefined)).toBe(false)
  })
})
