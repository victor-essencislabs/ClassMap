// TASK-003 — testes de componente do canvas do Diagrama de Classes.
// Rodam em jsdom, sem depender de um projeto Supabase real (o
// componente só recebe `content`/`onChange` via props) — cobrem CA-01,
// CA-02, CA-03 e CA-05 no nível de UI, complementando os testes de
// lógica pura em contentOperations.test.ts.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ClassDiagramCanvas } from './ClassDiagramCanvas'
import { emptyClassDiagramContent, type ClassDiagramContent } from './types'

/** Wrapper com estado local, do jeito que `DiagramEditorPage` usa o canvas de verdade. */
function ControlledCanvas({
  initial = emptyClassDiagramContent(),
  readOnly = false,
}: {
  initial?: ClassDiagramContent
  readOnly?: boolean
}) {
  const [content, setContent] = useState(initial)
  return <ClassDiagramCanvas content={content} readOnly={readOnly} onChange={setContent} />
}

describe('ClassDiagramCanvas — editor', () => {
  it('CA-01: "Adicionar classe" cria um card com nome e atributos', () => {
    render(<ControlledCanvas />)
    fireEvent.click(screen.getByText('+ Adicionar classe'))
    expect(screen.getByText('NovaClasse')).toBeInTheDocument()
    expect(screen.getByText(/id: long/)).toBeInTheDocument()
  })

  it('CA-02: cria uma relação de cada um dos 5 tipos entre duas classes', () => {
    render(<ControlledCanvas />)
    fireEvent.click(screen.getByText('+ Adicionar classe'))
    fireEvent.click(screen.getByText('+ Adicionar classe'))

    const types = ['Associação', 'Agregação', 'Composição', 'Herança', 'Dependência']
    for (const label of types) {
      const [fromSelect, typeSelect, toSelect] = screen.getAllByRole('combobox')
      fireEvent.change(fromSelect, { target: { value: (fromSelect as HTMLSelectElement).options[1].value } })
      // seleciona o tipo de relação pelo texto da option (mais estável que o value)
      fireEvent.change(typeSelect, {
        target: {
          value: Array.from((typeSelect as HTMLSelectElement).options).find((o) => o.text === label)!.value,
        },
      })
      fireEvent.change(toSelect, { target: { value: (toSelect as HTMLSelectElement).options[2].value } })
      fireEvent.click(screen.getByText('Criar relação'))
    }

    // 5 relações criadas => 5 grupos de conector no SVG
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(5)
  })

  it('CA-03: multiplicidade preenchida aparece nas duas pontas do conector', () => {
    render(<ControlledCanvas />)
    fireEvent.click(screen.getByText('+ Adicionar classe'))
    fireEvent.click(screen.getByText('+ Adicionar classe'))

    const [fromSelect, , toSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: (fromSelect as HTMLSelectElement).options[1].value } })
    fireEvent.change(toSelect, { target: { value: (toSelect as HTMLSelectElement).options[2].value } })
    fireEvent.click(screen.getByText('Criar relação'))
    // criar a relação já a seleciona automaticamente — o painel de edição já está aberto.

    const [fromMultiplicity, toMultiplicity] = screen.getAllByPlaceholderText('1, 0..*, n')
    fireEvent.change(fromMultiplicity, { target: { value: '1' } })
    fireEvent.change(toMultiplicity, { target: { value: '0..*' } })

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('0..*')).toBeInTheDocument()
  })

  it('exclui uma classe e a relação que a referenciava junto (reforça removeClass)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(screen.getByText('+ Adicionar classe'))
    fireEvent.click(screen.getByText('+ Adicionar classe'))
    const [fromSelect, , toSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: (fromSelect as HTMLSelectElement).options[1].value } })
    fireEvent.change(toSelect, { target: { value: (toSelect as HTMLSelectElement).options[2].value } })
    fireEvent.click(screen.getByText('Criar relação'))

    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)

    // clica no card em si (não no texto — "NovaClasse" também aparece nas <option>
    // dos selects "De…"/"Para…", já que as duas classes têm o mesmo nome).
    fireEvent.pointerDown(document.querySelectorAll('.class-card')[0])
    fireEvent.click(screen.getByText('Excluir classe'))

    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
  })
})

describe('ClassDiagramCanvas — visualizador (CA-05)', () => {
  it('não mostra nenhum controle de edição', () => {
    let content = emptyClassDiagramContent()
    content = {
      classes: [{ id: 'c1', name: 'Pedido', attributes: [{ id: 'a1', name: 'id', type: 'long' }], x: 0, y: 0 }],
      relationships: [],
    }
    render(<ControlledCanvas initial={content} readOnly />)

    expect(screen.getByText('Pedido')).toBeInTheDocument()
    expect(screen.queryByText('+ Adicionar classe')).not.toBeInTheDocument()
    expect(screen.queryByText('Criar relação')).not.toBeInTheDocument()
  })
})
