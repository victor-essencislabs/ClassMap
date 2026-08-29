// TASK-003/007 — testes de componente do canvas do Diagrama de Classes.
// Rodam em jsdom, sem depender de um projeto Supabase real (o
// componente só recebe `content`/`onChange` via props). Reescrito na
// TASK-007 para as novas interações (shell/inspector fixo/modo de
// conexão) — ver "Estratégia de testes" e CA-01..CA-07 da task.
import { fireEvent, render, screen, within } from '@testing-library/react'
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

function classCards() {
  return Array.from(document.querySelectorAll('.diagram-shell-canvas .node-box'))
}

function addClassButton() {
  return screen.getByRole('button', { name: '+ Classe' })
}

function startConnectButton() {
  return screen.getByRole('button', { name: '🔗 Relação' })
}

describe('ClassDiagramCanvas — editor', () => {
  it('"+ Classe" cria um card com nome e atributos', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    const [card] = classCards()
    expect(within(card as HTMLElement).getByText('NovaClasse')).toBeInTheDocument()
    expect(within(card as HTMLElement).getByText(/id/)).toBeInTheDocument()
  })

  it('CA-02: criar uma relação clicando origem→destino no canvas produz um DiagramRelationship com from/to/type — mesmo resultado do formulário antigo', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())

    fireEvent.click(startConnectButton())
    expect(screen.getByText('Clique na classe de origem, depois na de destino')).toBeInTheDocument()

    const [from, to] = classCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)

    // relação criada com tipo padrão (association) => 1 grupo de conector no SVG
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)
    // o banner de conexão fecha depois de completar
    expect(screen.queryByText('Clique na classe de origem, depois na de destino')).not.toBeInTheDocument()
    // a relação recém-criada já fica selecionada — inspector mostra o título "Relação"
    expect(screen.getByText('Relação', { selector: '.insp-title' })).toBeInTheDocument()
  })

  it('RN-02: clicar duas vezes na mesma classe em modo de conexão não cria relação (e avisa)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    fireEvent.click(startConnectButton())

    const [from] = classCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(from)

    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
    expect(screen.getByText('Escolha uma classe diferente')).toBeInTheDocument()
  })

  it('RN-02: "Cancelar" no banner sai do modo de conexão sem criar relação parcial', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    fireEvent.click(startConnectButton())

    const [from] = classCards()
    fireEvent.pointerDown(from)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Clique na classe de origem, depois na de destino')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
  })

  it('CA-03: busca na sidebar filtra a lista por substring do nome (case-insensitive)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    const [card] = classCards()
    fireEvent.pointerDown(card)
    fireEvent.change(screen.getByLabelText('Nome da classe'), { target: { value: 'Usuario' } })

    const sideList = document.querySelector('.side-list') as HTMLElement
    fireEvent.change(screen.getByPlaceholderText('Buscar classe...'), { target: { value: 'usu' } })

    expect(within(sideList).getByText('Usuario')).toBeInTheDocument()
    expect(within(sideList).queryByText('NovaClasse')).not.toBeInTheDocument()
  })

  it('CA-04: inspector edita nome/estereótipo/atributos de uma classe (paridade com o painel antigo)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.pointerDown(classCards()[0])

    fireEvent.change(screen.getByLabelText('Nome da classe'), { target: { value: 'Pedido' } })
    fireEvent.change(screen.getByPlaceholderText('ex: entity, table'), { target: { value: 'entity' } })
    fireEvent.click(screen.getByRole('button', { name: '+ atributo' }))

    const [card] = classCards()
    expect(within(card as HTMLElement).getByText('Pedido')).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText('nome')).toHaveLength(3) // id, nome, novoAtributo
  })

  it('CA-04: inspector edita tipo/multiplicidade de uma relação (paridade com o painel antigo)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    fireEvent.click(startConnectButton())
    const [from, to] = classCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)

    fireEvent.click(screen.getByRole('radio', { name: 'Herança' }))
    const [fromMult, toMult] = screen.getAllByPlaceholderText(/ex: (1|n)/)
    fireEvent.change(fromMult, { target: { value: '1' } })
    fireEvent.change(toMult, { target: { value: '0..*' } })

    // os valores de multiplicidade aparecem no próprio conector (SVG), não só no formulário.
    expect(document.querySelector('.connectors-layer text')?.textContent).toBe('1')
    expect(screen.getByText('0..*')).toBeInTheDocument()
  })

  it('CA-01: zoom (+/−/ajustar à tela) não quebra o posicionamento absoluto dos cards', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    const [card] = classCards()
    const originalLeft = (card as HTMLElement).style.left

    fireEvent.click(screen.getByTitle('Aproximar'))
    fireEvent.click(screen.getByTitle('Afastar'))
    fireEvent.click(screen.getByTitle('Ajustar à tela'))

    // zoom/pan só afeta o `transform` do viewport — a posição do card (coordenadas do mundo) não muda.
    expect((classCards()[0] as HTMLElement).style.left).toBe(originalLeft)
  })

  it('exclui uma classe e a relação que a referenciava junto (reforça removeClass)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    fireEvent.click(startConnectButton())
    const [from, to] = classCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)

    fireEvent.pointerDown(classCards()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Excluir classe' }))

    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
  })
})

describe('ClassDiagramCanvas — visualizador (CA-05)', () => {
  it('não mostra nenhum controle de criação/edição — só navega/dá zoom/pan', () => {
    const content: ClassDiagramContent = {
      classes: [{ id: 'c1', name: 'Pedido', attributes: [{ id: 'a1', name: 'id', type: 'long' }], x: 0, y: 0 }],
      relationships: [],
    }
    render(<ControlledCanvas initial={content} readOnly />)

    expect(within(classCards()[0] as HTMLElement).getByText('Pedido')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Classe' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '🔗 Relação' })).not.toBeInTheDocument()

    fireEvent.pointerDown(classCards()[0])
    expect(screen.queryByRole('button', { name: 'Excluir classe' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nome da classe')).not.toBeInTheDocument()
    // zoom/pan continuam disponíveis
    expect(screen.getByTitle('Aproximar')).toBeInTheDocument()
  })
})
