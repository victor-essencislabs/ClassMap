// TASK-033/029 (ADR-011) — ícones desenhados em SVG, traço único, no
// lugar de emoji/glifo unicode (🔗/⤢) usados como ícone (ver
// reference/craft-floor.md do Impeccable). Compartilhados entre o
// Diagrama de Classes e o Diagrama de Objetos — os dois usam o mesmo
// vocabulário de "link"/"ajustar à tela", só a tinta (`currentColor`)
// muda por herdar `--class-accent`/`--object-accent` do contexto.
export function LinkGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M6.5 9.5 9.5 6.5" />
        <path d="M7 4.5 8.3 3.2a2.4 2.4 0 0 1 3.5 3.5L10.5 8" />
        <path d="M9 11.5 7.7 12.8a2.4 2.4 0 0 1-3.5-3.5L5.5 8" />
      </g>
    </svg>
  )
}

export function FitToScreenGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2H2v4" />
        <path d="M10 2h4v4" />
        <path d="M6 14H2v-4" />
        <path d="M10 14h4v-4" />
      </g>
    </svg>
  )
}

// TASK-046 — recolher/expandir sidebar/inspector: um chevron só, espelhado
// via `direction` (nunca dois SVGs quase idênticos para a mesma forma).
export function ChevronGlyph({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden="true"
      style={direction === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M10 3.5 5.5 8l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// TASK-046 — modo tela cheia do canvas (recolhe sidebar + inspector de
// uma vez): cantos abrindo para fora (entrar) / fechando para dentro
// (sair) — vocabulário distinto do `FitToScreenGlyph` (que ajusta o
// zoom do conteúdo, não a visibilidade dos painéis).
export function FullscreenEnterGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 5.5v-4h4" />
        <path d="M14.5 5.5v-4h-4" />
        <path d="M1.5 10.5v4h4" />
        <path d="M14.5 10.5v4h-4" />
      </g>
    </svg>
  )
}

export function FullscreenExitGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5 1.5v4h-4" />
        <path d="M10.5 1.5v4h4" />
        <path d="M5.5 14.5v-4h-4" />
        <path d="M10.5 14.5v-4h4" />
      </g>
    </svg>
  )
}

// TASK-036 (ADR-011) — "selo de validação no estado de sucesso": marca de
// confirmação usada onde uma ação acaba de ser validada (ex.: JSON
// copiado com sucesso em `ImportExportControls`).
export function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path
        d="M3 8.5 6.2 11.5 13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
