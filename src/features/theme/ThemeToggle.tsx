// TASK-019 (ADR-007) — botão de ícone único, montado nas 3 superfícies de
// topbar da aplicação autenticada (`AppLayout`, `DiagramShell`,
// `SystemViewPage`). Usa só os tokens já existentes do design system —
// nenhuma cor nova.
import { useTheme } from './theme'

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
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
