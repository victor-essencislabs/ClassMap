// TASK-014 — seletor visual de cor do card de classe no inspector
// (ver ADR-005), mesmo padrão visual de `EdgeTypeGrid` (TASK-007):
// grade de opções clicáveis com `role="radiogroup"`/`role="radio"`,
// suporte a teclado (Enter/Espaço) e destaque da opção ativa via
// classe `.active`. Aqui cada opção é um swatch de cor (não um ícone
// de tipo de relação) — o valor salvo é sempre um hex de `CLASS_COLORS`
// (paleta fechada, nunca RGB/hex arbitrário, ver `types.ts`).
import type { CSSProperties } from 'react'
import { CLASS_COLORS } from './types'

interface ClassColorGridProps {
  /** Hex atualmente escolhido, ou `undefined` para "sem cor" (aparência
   * padrão do design system, CA-04). */
  value: string | undefined
  onChange: (color: string | undefined) => void
}

export function ClassColorGrid({ value, onChange }: ClassColorGridProps) {
  return (
    <div className="class-color-grid" role="radiogroup" aria-label="Cor do card">
      <div
        className={`class-color-opt none${!value ? ' active' : ''}`}
        role="radio"
        aria-checked={!value}
        aria-label="Sem cor (padrão)"
        title="Sem cor (padrão)"
        tabIndex={0}
        onClick={() => onChange(undefined)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onChange(undefined)
        }}
      >
        ×
      </div>
      {CLASS_COLORS.map((color) => (
        <div
          key={color.id}
          className={`class-color-opt${value === color.hex ? ' active' : ''}`}
          style={{ '--swatch': color.hex } as CSSProperties}
          role="radio"
          aria-checked={value === color.hex}
          aria-label={color.label}
          title={color.label}
          tabIndex={0}
          onClick={() => onChange(color.hex)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onChange(color.hex)
          }}
        />
      ))}
    </div>
  )
}
