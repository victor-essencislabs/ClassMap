import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { DiagramClass } from '../class-diagram/types'
import { ObjectDiagramCanvas } from './ObjectDiagramCanvas'
import { emptyObjectDiagramContent, type ObjectDiagramContent } from './types'

const pedidoClass: DiagramClass = {
  id: 'class-pedido',
  name: 'Pedido',
  attributes: [{ id: 'a1', name: 'id', type: 'long' }],
  x: 0,
  y: 0,
}

function ControlledCanvas({ readOnly = false }: { readOnly?: boolean }) {
  const [content, setContent] = useState<ObjectDiagramContent>(emptyObjectDiagramContent())
  return (
    <ObjectDiagramCanvas
      content={content}
      readOnly={readOnly}
      onChange={setContent}
      classDiagrams={[{ id: 'diagram-classes-1', name: 'Diagrama de Classes' }]}
      loadClasses={async () => [pedidoClass]}
    />
  )
}

describe('ObjectDiagramCanvas', () => {
  it('CA-01: cria um objeto vinculado a uma classe existente, herdando seus atributos', async () => {
    render(<ControlledCanvas />)

    fireEvent.change(screen.getByDisplayValue('Diagrama de classes de origem…'), {
      target: { value: 'diagram-classes-1' },
    })

    await waitFor(() => expect(screen.getByText('Pedido')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('Classe…'), { target: { value: 'class-pedido' } })
    fireEvent.click(screen.getByText('+ Adicionar objeto'))

    expect(screen.getByText(/instância : Pedido/)).toBeInTheDocument()
    // atributo herdado aparece no card com valor vazio
    expect(screen.getByText(/id =/)).toBeInTheDocument()
  })

  it('CA-05: visualizador não vê nenhum controle de criação', () => {
    render(<ControlledCanvas readOnly />)
    expect(screen.queryByText('+ Adicionar objeto')).not.toBeInTheDocument()
    expect(screen.queryByText('Diagrama de classes de origem…')).not.toBeInTheDocument()
  })
})
