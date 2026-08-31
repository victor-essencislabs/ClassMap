// TASK-019 (ADR-007) — lógica pura de leitura/escrita de `localStorage`
// e o hook `useTheme`, sem depender de nenhum componente montado.
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyStoredThemeOnBoot, applyTheme, getStoredTheme, THEME_STORAGE_KEY, useTheme } from './theme'

/** `matchesDark` simula `prefers-color-scheme: dark` do sistema
 * operacional — jsdom não implementa `matchMedia` de verdade. */
function mockMatchMedia(matchesDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && matchesDark,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  mockMatchMedia(false) // padrão dos testes: sistema em modo claro
})

describe('getStoredTheme', () => {
  it('retorna null quando não há nada salvo', () => {
    expect(getStoredTheme()).toBeNull()
  })

  it('retorna o valor salvo quando válido', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('ignora um valor inválido salvo (corrompido ou de outra versão)', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'blue')
    expect(getStoredTheme()).toBeNull()
  })
})

describe('applyTheme', () => {
  it('define data-theme quando recebe um tema', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('remove data-theme quando recebe null', () => {
    document.documentElement.dataset.theme = 'dark'
    applyTheme(null)
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})

describe('applyStoredThemeOnBoot — RN-02', () => {
  it('sem preferência salva, não define data-theme (segue prefers-color-scheme via CSS)', () => {
    applyStoredThemeOnBoot()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('com preferência salva, aplica antes do primeiro paint', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    applyStoredThemeOnBoot()
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})

describe('useTheme', () => {
  it('CA-03: sem preferência salva, segue o tema do sistema', () => {
    mockMatchMedia(true) // sistema em modo escuro
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('CA-01/CA-02: alternar grava a escolha e atualiza data-theme imediatamente', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')

    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('alternar duas vezes volta ao tema original', () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.toggleTheme())
    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe('light')
    expect(getStoredTheme()).toBe('light')
  })
})
