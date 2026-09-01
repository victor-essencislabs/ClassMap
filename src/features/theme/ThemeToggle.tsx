// TASK-019 (ADR-007) — botão de ícone único, montado nas 3 superfícies de
// topbar da aplicação autenticada (`AppLayout`, `DiagramShell`,
// `SystemViewPage`). Usa só os tokens já existentes do design system —
// nenhuma cor nova. Ícones desenhados em SVG (ADR-011/TASK-032) — emoji
// não é sistema de ícone (ver reference/craft-floor.md).
import { useTheme } from './theme'

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <circle cx="10" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M10 1.5v2.25M10 16.25v2.25M18.5 10h-2.25M3.75 10H1.5" />
        <path d="M15.66 4.34l-1.59 1.59M5.93 14.07l-1.59 1.59M15.66 15.66l-1.59-1.59M5.93 5.93L4.34 4.34" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path
        d="M17 12.4A7.5 7.5 0 1 1 7.6 3a6 6 0 0 0 9.4 9.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={isDark ? 'Tema escuro' : 'Tema claro'}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}
