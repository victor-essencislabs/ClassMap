// TASK-036 (ADR-011) — raise incorporado do desafiante descartado "Painel
// Catódico" (ver ADR-011): os 2 papéis de acesso (visualizador/editor,
// admin/member) sempre aparecem lado a lado — o concedido "carimbado"
// cheio (`--accent` sólido), o outro como marca fantasma não carimbada
// (contorno fraco) — nunca um rótulo isolado escondido atrás de um
// `<select>` fechado. Mesmo padrão visual de `EdgeTypeGrid`/`ClassColorGrid`
// (grade de opções clicáveis, `role="radiogroup"`), mas em linha (2
// opções, nunca mais — RN-02 do `AccessManagementModal`).
import type { AccessRoleOption } from './AccessManagementModal'

interface RolePickerProps<TRole extends string> {
  options: AccessRoleOption<TRole>[]
  value: TRole
  onChange: (value: TRole) => void
  disabled?: boolean
  ariaLabel: string
}

export function RolePicker<TRole extends string>({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
}: RolePickerProps<TRole>) {
  return (
    <div className="role-picker" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? 'role-picker-opt active' : 'role-picker-opt'}
          role="radio"
          aria-checked={opt.value === value}
          title={opt.description}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
