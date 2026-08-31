// TASK-006 — shell de 3 colunas compartilhado pelas telas de diagrama
// (Diagrama de Classes/Objetos, Visão do Sistema), fundação de ADR-002.
// Só a estrutura de grid (topbar/sidebar/canvas/inspector) + marca —
// nenhuma lógica de diagrama aqui, isso é TASK-007/008/009.
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { ThemeToggle } from '../theme/ThemeToggle'

export interface DiagramShellProps {
  /** Conteúdo entre a marca e as ações — ex. `.view-switch` ou um breadcrumb, decidido por quem consome o shell. */
  topbarCenter?: ReactNode
  /** Botões à direita da topbar (ex. Importar/Exportar/+Classe). */
  topbarActions?: ReactNode
  sidebar: ReactNode
  canvas: ReactNode
  inspector: ReactNode
  /** Props aplicadas diretamente na área `.diagram-shell-canvas` (ref,
   * classe extra, handlers de ponteiro) — o zoom/pan e o modo de conexão
   * do canvas (TASK-007) precisam do próprio elemento de grid-area, não
   * de um wrapper adicional por dentro dele (o `canvas` recebido aqui já
   * é só o CONTEÚDO da área, não a área em si — não reaplique a classe
   * `diagram-shell-canvas` em quem passa esse slot). */
  canvasProps?: ComponentPropsWithRef<'div'>
}

export function DiagramShell({
  topbarCenter,
  topbarActions,
  sidebar,
  canvas,
  inspector,
  canvasProps,
}: DiagramShellProps) {
  const { className: canvasClassName, ...restCanvasProps } = canvasProps ?? {}

  return (
    <div className="diagram-shell">
      <div className="diagram-shell-topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">ClassMap</span>
        </div>
        {topbarCenter ? (
          <>
            <span className="divider-v" aria-hidden="true" />
            {topbarCenter}
          </>
        ) : null}
        <div className="topbar-actions">{topbarActions}</div>
        {/* TASK-019 (ADR-007): fixo aqui (não via `topbarActions`) para
            cobrir Diagrama de Classes/Objetos de uma vez só, sem exigir
            que cada consumidor do shell se lembre de montá-lo. */}
        <ThemeToggle />
      </div>

      <div className="diagram-shell-sidebar">{sidebar}</div>

      <div
        className={`diagram-shell-canvas${canvasClassName ? ` ${canvasClassName}` : ''}`}
        {...restCanvasProps}
      >
        {canvas}
      </div>

      <div className="diagram-shell-inspector">{inspector}</div>
    </div>
  )
}
