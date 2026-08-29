// TASK-006 — CA-02: o shell renderiza as 4 áreas do grid corretamente,
// sem depender de nenhum dado de diagrama real (página de teste mínima).
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DiagramShell } from './DiagramShell'

describe('DiagramShell', () => {
  it('CA-02: renderiza topbar (marca + centro + ações), sidebar, canvas e inspector', () => {
    render(
      <DiagramShell
        topbarCenter={<span>Diagrama de Classes</span>}
        topbarActions={<button type="button">+ Classe</button>}
        sidebar={<p>conteúdo da sidebar</p>}
        canvas={<p>conteúdo do canvas</p>}
        inspector={<p>conteúdo do inspector</p>}
      />,
    )

    expect(screen.getByText('ClassMap')).toBeInTheDocument()
    expect(screen.getByText('Diagrama de Classes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Classe' })).toBeInTheDocument()
    expect(screen.getByText('conteúdo da sidebar')).toBeInTheDocument()
    expect(screen.getByText('conteúdo do canvas')).toBeInTheDocument()
    expect(screen.getByText('conteúdo do inspector')).toBeInTheDocument()
  })

  it('sem topbarCenter, não renderiza o divisor nem quebra a topbar', () => {
    render(
      <DiagramShell
        sidebar={<p>sidebar</p>}
        canvas={<p>canvas</p>}
        inspector={<p>inspector</p>}
      />,
    )

    expect(screen.getByText('ClassMap')).toBeInTheDocument()
    expect(document.querySelector('.divider-v')).not.toBeInTheDocument()
  })
})
