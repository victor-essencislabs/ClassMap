// TASK-026 (ADR-010) — guard de troca obrigatória de senha: uma sessão
// com `must_change_password` nunca vê `children`, só
// `ForcePasswordChangePage`; trocar a senha libera a navegação sem
// reload manual (a própria `AuthContext` atualiza a sessão via
// `USER_UPDATED`, aqui simulado via `rerender`).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { RequireAuth } from './RequireAuth'

const updatePassword = vi.fn(async () => undefined)
vi.mock('../../lib/supabase/queries', () => ({
  updatePassword: (...args: Parameters<typeof updatePassword>) => updatePassword(...args),
}))

let mockSession: Session | null = null
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ session: mockSession, loading: false }),
}))

function sessionWith(mustChangePassword: boolean): Session {
  return {
    user: { id: 'user-1', user_metadata: { must_change_password: mustChangePassword } },
  } as unknown as Session
}

function renderGuard() {
  return render(
    <MemoryRouter>
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    </MemoryRouter>,
  )
}

describe('RequireAuth — TASK-026', () => {
  it('CA-03: must_change_password=true mostra a tela de troca, não os children', () => {
    mockSession = sessionWith(true)
    renderGuard()

    expect(screen.getByText('Troque sua senha')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('must_change_password=false libera os children normalmente', () => {
    mockSession = sessionWith(false)
    renderGuard()

    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('CA-03: trocar a senha chama updatePassword e libera a navegação quando a sessão atualiza', async () => {
    mockSession = sessionWith(true)
    const { rerender } = renderGuard()

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'nova-senha-123' } })
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
      target: { value: 'nova-senha-123' },
    })
    fireEvent.click(screen.getByText('Trocar senha'))

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('nova-senha-123'))

    // Simula o listener de `USER_UPDATED` do AuthContext atualizando a sessão.
    mockSession = sessionWith(false)
    rerender(
      <MemoryRouter>
        <RequireAuth>
          <p>Conteúdo protegido</p>
        </RequireAuth>
      </MemoryRouter>,
    )

    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('senhas diferentes mostram erro e não chamam updatePassword', async () => {
    mockSession = sessionWith(true)
    renderGuard()
    updatePassword.mockClear()

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-a-123' } })
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: 'senha-b-123' } })
    fireEvent.click(screen.getByText('Trocar senha'))

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(updatePassword).not.toHaveBeenCalled()
  })
})
