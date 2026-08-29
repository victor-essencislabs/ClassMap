// TASK-006 — toast aparece com a mensagem e some sozinho após o timeout.
import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toast, useToast } from './Toast'

describe('Toast', () => {
  it('sem mensagem, fica sem a classe "show"', () => {
    render(<Toast message={null} />)
    expect(screen.getByRole('status')).not.toHaveClass('show')
  })

  it('com mensagem, mostra o texto e a classe "show"', () => {
    render(<Toast message="Exemplo carregado" />)
    const toast = screen.getByRole('status')
    expect(toast).toHaveClass('show')
    expect(toast).toHaveTextContent('Exemplo carregado')
  })
})

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra a mensagem e a esconde sozinha após o timeout', () => {
    const { result } = renderHook(() => useToast(1000))

    expect(result.current.message).toBeNull()

    act(() => {
      result.current.showToast('Exemplo carregado')
    })
    expect(result.current.message).toBe('Exemplo carregado')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.message).toBeNull()
  })

  it('uma segunda chamada reinicia o timeout da primeira', () => {
    const { result } = renderHook(() => useToast(1000))

    act(() => {
      result.current.showToast('Primeira')
    })
    act(() => {
      vi.advanceTimersByTime(600)
      result.current.showToast('Segunda')
    })
    expect(result.current.message).toBe('Segunda')

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(result.current.message).toBe('Segunda')

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.message).toBeNull()
  })
})
