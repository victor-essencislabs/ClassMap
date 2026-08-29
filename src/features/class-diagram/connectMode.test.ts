// TASK-007 — testes unitários da máquina de estado do modo de conexão
// (ver "Estratégia de testes" da task e RN-02).
import { describe, expect, it } from 'vitest'
import { resolveConnectClick } from './connectMode'

describe('resolveConnectClick', () => {
  it('sem origem ainda, o primeiro clique só registra a origem', () => {
    expect(resolveConnectClick(null, 'c1')).toEqual({ kind: 'started', from: 'c1' })
  })

  it('clicar de novo na mesma classe não completa a relação (RN-02: sem laço para si mesma)', () => {
    expect(resolveConnectClick('c1', 'c1')).toEqual({ kind: 'same-class' })
  })

  it('clicar numa classe diferente da origem completa a relação', () => {
    expect(resolveConnectClick('c1', 'c2')).toEqual({ kind: 'completed', from: 'c1', to: 'c2' })
  })
})
