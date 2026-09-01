// TASK-010 — fecha por ×, clique fora (no overlay, não no conteúdo) e Esc.
// TASK-045 — fechar agora aguarda a transição de saída (`.closing`, ver
// `Modal.tsx`/`index.css`) antes de chamar `onClose` de fato, por isso os
// testes que fecham o modal esperam (`waitFor`) em vez de checar `onClose`
// na mesma sincronia do clique/tecla.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('fecha ao clicar no botão ×', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.click(screen.getByLabelText('Fechar'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('fecha ao clicar fora do modal (no overlay)', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.click(document.querySelector('.modal-overlay')!)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
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

  it('fecha ao pressionar Esc', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('marca .closing no overlay e no painel assim que o fechamento começa, antes de desmontar', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.click(screen.getByLabelText('Fechar'))
    // ainda montado e visível durante a transição de saída — não sumiu
    // de uma vez, e onClose (que desmontaria via o pai) ainda não rodou.
    expect(document.querySelector('.modal-overlay.closing')).toBeInTheDocument()
    expect(document.querySelector('.modal.closing')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('não dispara onClose duas vezes ao combinar Esc com clique fora antes da transição terminar', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="Exemplo" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('.modal-overlay')!)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
