// TASK-010 — fecha por ×, clique fora (no overlay, não no conteúdo) e Esc.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('mostra o título e o conteúdo', () => {
    render(
      <Modal title="Exemplo" onClose={() => {}}>
        <p>Conteúdo do modal</p>
      </Modal>,
    )
    expect(screen.getByText('Exemplo')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument()
  })

  it('fecha ao clicar no botão ×', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao clicar fora do modal (no overlay)', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.click(document.querySelector('.modal-overlay')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('não fecha ao clicar dentro do conteúdo do modal', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.click(screen.getByText('Conteúdo'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('fecha ao pressionar Esc', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
