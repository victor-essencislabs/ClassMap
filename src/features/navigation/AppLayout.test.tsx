// TASK-044 (ADR-011) — transição de profundidade na navegação
// Organizações→Projetos→Diagramas: `routeDepth` é a heurística pura de
// direção (mais segmentos = descendo/"forward", menos = subindo/"back"),
// testada isoladamente; o restante confirma que `AppLayout` aplica a
// classe certa ao remontar o wrapper de `children` por troca de rota.
import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout, routeDepth } from './AppLayout'

vi.mock('../../lib/supabase/queries', () => ({
  signOut: vi.fn(async () => undefined),
}))

describe('routeDepth', () => {
  it('conta segmentos não vazios do path', () => {
    expect(routeDepth('/')).toBe(0)
    expect(routeDepth('/orgs/org-1')).toBe(2)
    expect(routeDepth('/orgs/org-1/projects/project-1')).toBe(4)
  })
})

function Harness() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout>Nível 0</AppLayout>} />
      <Route path="/orgs/:orgId" element={<AppLayout>Nível 1</AppLayout>} />
      <Route
        path="/orgs/:orgId/projects/:projectId"
        element={<AppLayout>Nível 2</AppLayout>}
      />
    </Routes>
  )
}

function pageWrapper(): HTMLElement {
  return document.querySelector('main > div') as HTMLElement
}

describe('AppLayout — transição de profundidade', () => {
  it('CA-01/CA-02: descer um nível entra com a classe "forward"', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Link to="/orgs/org-1">descer</Link>
        <Harness />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('descer'))

    expect(screen.getByText('Nível 1')).toBeInTheDocument()
    expect(pageWrapper().className).toContain('app-page-transition-forward')
  })

  it('CA-02: subir um nível entra com a classe "back"', () => {
    render(
      <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1']}>
        <Link to="/orgs/org-1">subir</Link>
        <Harness />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('subir'))

    expect(screen.getByText('Nível 1')).toBeInTheDocument()
    expect(pageWrapper().className).toContain('app-page-transition-back')
  })
})
