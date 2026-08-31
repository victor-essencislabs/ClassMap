// TASK-019 (ADR-007) — alternância manual de tema claro/escuro,
// persistida só em `localStorage` (RN-01), por navegador. Os dois
// conjuntos de tokens já existem em `src/index.css` desde o
// ADR-002/TASK-006 (incluindo o hook `[data-theme='dark'|'light']`,
// deixado de propósito sem uso até esta task) — este módulo só liga esse
// hook a uma escolha real do usuário.
import { useState } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'classmap-theme'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/**
 * Lê a preferência salva, ou `null` se não houver nenhuma — nesse caso
 * (RN-02) a aplicação segue `prefers-color-scheme`, sem escrever
 * `data-theme`, exatamente como antes desta task. `localStorage` pode
 * não estar disponível (modo privado restrito, etc.) — degrada para
 * "sem preferência salva" em vez de quebrar a aplicação.
 */
export function getStoredTheme(): Theme | null {
  try {
    // `window.localStorage` explícito, não o global `localStorage` bare —
    // Node 22+ registra um `globalThis.localStorage` experimental próprio
    // (por trás da flag `--localstorage-file`) que sombreia o do jsdom
    // dentro do Vitest, quebrando os testes se referenciado sem `window.`.
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // mesmo racional de `getStoredTheme` — falha em silêncio, a escolha
    // só não persiste entre reloads, não é um erro fatal de UI.
  }
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Aplica (ou remove) `data-theme` em `<html>`. `null` remove o atributo,
 * devolvendo o controle para `prefers-color-scheme` (CSS já trata os
 * dois casos, ver `src/index.css`).
 */
export function applyTheme(theme: Theme | null): void {
  if (typeof document === 'undefined') return
  if (theme) {
    document.documentElement.dataset.theme = theme
  } else {
    delete document.documentElement.dataset.theme
  }
}

/**
 * Chamado o mais cedo possível no boot (`main.tsx`, antes de
 * `createRoot`) para aplicar uma preferência já salva antes do primeiro
 * paint — evita o flash do tema errado (CA-02). Sem preferência salva,
 * não faz nada (RN-02).
 */
export function applyStoredThemeOnBoot(): void {
  const stored = getStoredTheme()
  if (stored) applyTheme(stored)
}

/**
 * Hook usado pelo `ThemeToggle` — deriva o tema efetivo (a escolha salva,
 * ou o do sistema operacional na ausência de uma) e expõe a alternância.
 * Sem `useEffect`: o estado só existe para re-renderizar ao alternar: a
 * leitura inicial já reflete o que `applyStoredThemeOnBoot` aplicou no
 * `<html>` antes do primeiro render.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [stored, setStored] = useState<Theme | null>(() => getStoredTheme())
  const theme = stored ?? getSystemTheme()

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    storeTheme(next)
    applyTheme(next)
    setStored(next)
  }

  return { theme, toggleTheme }
}
