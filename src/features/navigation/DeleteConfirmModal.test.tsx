// TASK-011 — botão de confirmar só habilita quando o nome digitado bate
// exatamente (CA-03), e a exclusão só é chamada depois de confirmar.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeleteConfirmModal } from './DeleteConfirmModal'

function renderModal(onConfirm = vi.fn(async () => undefined), onClose = vi.fn()) {
  render(
    <DeleteConfirmModal
      title="Excluir organização"
      name="Essencislabs"
      warning="Isto vai excluir tudo."
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  )
  return { onConfirm, onClose }
}

describe('DeleteConfirmModal', () => {
  it('CA-03: o botão de confirmar começa desabilitado', () => {
    renderModal()
    expect(screen.getByText('Excluir definitivamente')).toBeDisabled()
  })

  it('CA-03: continua desabilitado com um texto parcial ou de outro case', () => {
    renderModal()
    const input = screen.getByLabelText(/Digite/)
    fireEvent.change(input, { target: { value: 'essencislabs' } })
    expect(screen.getByText('Excluir definitivamente')).toBeDisabled()
    fireEvent.change(input, { target: { value: 'Essencislab' } })
    expect(screen.getByText('Excluir definitivamente')).toBeDisabled()
  })

  it('CA-03: habilita só quando o nome digitado bate exatamente', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/Digite/), { target: { value: 'Essencislabs' } })
    expect(screen.getByText('Excluir definitivamente')).not.toBeDisabled()
  })

  it('não chama onConfirm enquanto o nome não bate', () => {
    const { onConfirm } = renderModal()
    fireEvent.click(screen.getByText('Excluir definitivamente'))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('chama onConfirm só depois de digitar o nome exato e clicar em confirmar', async () => {
    const { onConfirm } = renderModal()
    fireEvent.change(screen.getByLabelText(/Digite/), { target: { value: 'Essencislabs' } })
    fireEvent.click(screen.getByText('Excluir definitivamente'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('mostra a mensagem de erro e reabilita o botão quando onConfirm falha', async () => {
    const onConfirm = vi.fn(async () => {
      throw new Error('RLS bloqueou a exclusão.')
    })
    renderModal(onConfirm)
    fireEvent.change(screen.getByLabelText(/Digite/), { target: { value: 'Essencislabs' } })
    fireEvent.click(screen.getByText('Excluir definitivamente'))

    await waitFor(() => expect(screen.getByText('RLS bloqueou a exclusão.')).toBeInTheDocument())
    expect(screen.getByText('Excluir definitivamente')).not.toBeDisabled()
  })

  it('chama onClose ao clicar em Cancelar', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
