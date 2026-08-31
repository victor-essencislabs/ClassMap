// TASK-019 (ADR-007) — CA-01/CA-04: clicar no controle alterna o tema e
// persiste, num dos pontos de montagem (o componente é o mesmo nos 3).
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { getStoredTheme } from './theme'

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('ThemeToggle', () => {
  it('CA-01: clicar alterna data-theme e persiste a escolha', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button'))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('CA-01: clicar de novo volta para claro', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')

    fireEvent.click(button)
    fireEvent.click(button)

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(getStoredTheme()).toBe('light')
  })
})
