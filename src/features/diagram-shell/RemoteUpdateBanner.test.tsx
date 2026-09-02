// TASK-047 — faixa de aviso de atualização remota: as 2 ações chamam
// o callback certo, nunca dispensa sozinha (ver `useDiagramRemoteUpdate`).
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RemoteUpdateBanner } from './RemoteUpdateBanner'

describe('RemoteUpdateBanner', () => {
  it('"Recarregar" chama onReload, "Ignorar por agora" chama onDismiss', () => {
    const onReload = vi.fn()
    const onDismiss = vi.fn()
    render(<RemoteUpdateBanner onReload={onReload} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(onReload).toHaveBeenCalledTimes(1)
    expect(onDismiss).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Ignorar por agora' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
