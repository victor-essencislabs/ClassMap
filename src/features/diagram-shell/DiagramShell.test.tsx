// TASK-006 — CA-02: o shell renderiza as 4 áreas do grid corretamente,
// sem depender de nenhum dado de diagrama real (página de teste mínima).
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DiagramShell } from './DiagramShell'

function renderShell() {
  return render(
    <DiagramShell
      sidebar={<p>conteúdo da sidebar</p>}
      canvas={<p>conteúdo do canvas</p>}
      inspector={<p>conteúdo do inspector</p>}
    />,
  )
}

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

// TASK-046 — recolher/expandir sidebar e inspector independentemente, e
// um atalho de "tela cheia" que recolhe os dois juntos. Achado de
// produção (2026-09-02): o usuário pediu essa funcionalidade depois de
// notar que não havia como ver só o diagrama.
describe('DiagramShell — recolher/expandir painéis', () => {
  it('recolhe e expande a sidebar de volta, sem afetar o inspector', () => {
    renderShell()
    const toggle = screen.getByRole('button', { name: 'Recolher barra lateral' })

    fireEvent.click(toggle)
    expect(document.querySelector('.diagram-shell')).toHaveClass('sidebar-collapsed')
    expect(document.querySelector('.diagram-shell')).not.toHaveClass('inspector-collapsed')
    // o conteúdo continua montado (só a coluna encolhe) — inspector nunca some.
    expect(screen.getByText('conteúdo da sidebar')).toBeInTheDocument()
    expect(screen.getByText('conteúdo do inspector')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expandir barra lateral' }))
    expect(document.querySelector('.diagram-shell')).not.toHaveClass('sidebar-collapsed')
  })

  it('recolhe e expande o inspector de volta, sem afetar a sidebar', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Recolher inspector' }))
    expect(document.querySelector('.diagram-shell')).toHaveClass('inspector-collapsed')
    expect(document.querySelector('.diagram-shell')).not.toHaveClass('sidebar-collapsed')

    fireEvent.click(screen.getByRole('button', { name: 'Expandir inspector' }))
    expect(document.querySelector('.diagram-shell')).not.toHaveClass('inspector-collapsed')
  })

  it('modo tela cheia recolhe os dois painéis juntos, e o botão sozinho os expande de volta', () => {
    renderShell()
    const fullscreen = screen.getByRole('button', { name: 'Modo tela cheia (só o diagrama)' })

    fireEvent.click(fullscreen)
    const shell = document.querySelector('.diagram-shell')
    expect(shell).toHaveClass('sidebar-collapsed')
    expect(shell).toHaveClass('inspector-collapsed')

    fireEvent.click(screen.getByRole('button', { name: 'Sair da tela cheia' }))
    expect(shell).not.toHaveClass('sidebar-collapsed')
    expect(shell).not.toHaveClass('inspector-collapsed')
  })

  it('tela cheia parte de qualquer combinação — só considera "cheio" quando os dois já estão recolhidos', () => {
    renderShell()
    // recolhe só a sidebar primeiro
    fireEvent.click(screen.getByRole('button', { name: 'Recolher barra lateral' }))
    // o botão de tela cheia, com só 1 painel recolhido, ainda oferece "entrar" (recolhe o resto)
    fireEvent.click(screen.getByRole('button', { name: 'Modo tela cheia (só o diagrama)' }))
    const shell = document.querySelector('.diagram-shell')
    expect(shell).toHaveClass('sidebar-collapsed')
    expect(shell).toHaveClass('inspector-collapsed')
  })
})
