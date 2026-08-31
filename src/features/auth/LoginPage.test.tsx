// TASK-026 (ADR-010) — reverte a alternância pública de autocadastro da
// TASK-023: só o formulário de entrar, sem opção de criar conta.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const signInWithPassword = vi.fn(async () => undefined)

vi.mock('../../lib/supabase/queries', () => ({
  signInWithPassword: (...args: Parameters<typeof signInWithPassword>) => signInWithPassword(...args),
}))

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ session: null, loading: false }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: password } })
}

describe('LoginPage — TASK-026', () => {
  beforeEach(() => {
    signInWithPassword.mockClear()
  })

  it('CA-05: não existe mais nenhuma opção de autocadastro público', () => {
    renderPage()
    expect(screen.queryByText(/criar conta/i)).not.toBeInTheDocument()
  })

  it('submeter o formulário chama signInWithPassword', async () => {
    renderPage()

    fillForm('ja.tenho@essencislabs.com', 'senha-forte-123')
    fireEvent.click(screen.getByText('Entrar'))

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith('ja.tenho@essencislabs.com', 'senha-forte-123'),
    )
  })

  it('erro ao entrar aparece sem quebrar a tela', async () => {
    signInWithPassword.mockRejectedValueOnce(new Error('Invalid login credentials'))
    renderPage()

    fillForm('ja.tenho@essencislabs.com', 'senha-errada')
    fireEvent.click(screen.getByText('Entrar'))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
  })
})
