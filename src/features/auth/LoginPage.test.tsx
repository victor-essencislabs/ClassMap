// TASK-023 (ADR-009) — autocadastro na tela de login: alternância
// Entrar/Criar conta, mensagem de confirmação de e-mail, erro de
// cadastro exibido sem quebrar a tela.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const signInWithPassword = vi.fn(async () => undefined)
const signUp = vi.fn(async () => undefined)

vi.mock('../../lib/supabase/queries', () => ({
  signInWithPassword: (...args: Parameters<typeof signInWithPassword>) => signInWithPassword(...args),
  signUp: (...args: Parameters<typeof signUp>) => signUp(...args),
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

describe('LoginPage — TASK-023 autocadastro', () => {
  beforeEach(() => {
    signInWithPassword.mockClear()
    signUp.mockClear()
  })

  it('CA-01: alternar para "Criar conta" e submeter chama signUp e mostra a mensagem de confirmação', async () => {
    renderPage()

    fireEvent.click(screen.getByText('Não tem conta? Criar conta'))
    fillForm('nova.pessoa@essencislabs.com', 'senha-forte-123')
    fireEvent.click(screen.getByText('Criar conta'))

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith('nova.pessoa@essencislabs.com', 'senha-forte-123'),
    )
    expect(
      await screen.findByText('Conta criada. Verifique seu e-mail para confirmar antes de entrar.'),
    ).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('CA-02: erro de cadastro (e-mail já em uso) aparece sem quebrar a tela', async () => {
    signUp.mockRejectedValueOnce(new Error('User already registered'))
    renderPage()

    fireEvent.click(screen.getByText('Não tem conta? Criar conta'))
    fillForm('ja.existe@essencislabs.com', 'senha-forte-123')
    fireEvent.click(screen.getByText('Criar conta'))

    expect(await screen.findByText('User already registered')).toBeInTheDocument()
  })

  it('modo padrão continua sendo "Entrar" (signInWithPassword)', async () => {
    renderPage()

    fillForm('ja.tenho@essencislabs.com', 'senha-forte-123')
    fireEvent.click(screen.getByText('Entrar'))

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith('ja.tenho@essencislabs.com', 'senha-forte-123'),
    )
    expect(signUp).not.toHaveBeenCalled()
  })
})
