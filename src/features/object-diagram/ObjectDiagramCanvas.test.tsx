// TASK-004/008 — testes de componente do canvas do Diagrama de Objetos.
// Reescrito na TASK-008 para as novas interações (shell/inspector
// fixo/modal de criação) — ver "Estratégia de testes" e CA-01..CA-07.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { NOTE_CARD_WIDTH, NOTE_MIN_HEIGHT, NOTE_MIN_WIDTH, type DiagramClass } from '../class-diagram/types'
import { isBackgroundTarget, ObjectDiagramCanvas } from './ObjectDiagramCanvas'
import { emptyObjectDiagramContent, type ObjectDiagramContent } from './types'

const pedidoClass: DiagramClass = {
  id: 'class-pedido',
  name: 'Pedido',
  attributes: [{ id: 'a1', name: 'id', type: 'long' }],
  x: 0,
  y: 0,
}

function ControlledCanvas({
  readOnly = false,
  classDiagrams = [{ id: 'diagram-classes-1', name: 'Diagrama de Classes' }],
}: {
  readOnly?: boolean
  classDiagrams?: { id: string; name: string }[]
}) {
  const [content, setContent] = useState<ObjectDiagramContent>(emptyObjectDiagramContent())
  return (
    <ObjectDiagramCanvas
      content={content}
      readOnly={readOnly}
      onChange={setContent}
      classDiagrams={classDiagrams}
      loadClasses={async () => [pedidoClass]}
    />
  )
}

function objectCards() {
  return Array.from(document.querySelectorAll('.diagram-shell-canvas .node-box'))
}

function noteCards() {
  return Array.from(document.querySelectorAll('.diagram-shell-canvas .note-card'))
}

function addNoteButton() {
  return screen.getByRole('button', { name: '+ Nota' })
}

/** TASK-042: simula o fim da animação CSS de destaque de herança.
 * jsdom não roda animações de verdade, e o React (via detecção de
 * propriedade de estilo com prefixo de fornecedor) registra o listener
 * nativo como `webkitanimationend` neste ambiente de teste em vez de
 * `animationend` puro — disparar os dois cobre a diferença sem acoplar
 * o teste a uma versão específica do jsdom. */
function fireInheritedFlashEnd(el: HTMLElement) {
  fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true, cancelable: true }))
  fireEvent.animationEnd(el)
}

function startLinkButton() {
  return screen.getByRole('button', { name: 'Link' })
}

async function createObjectViaModal() {
  fireEvent.click(screen.getByRole('button', { name: '+ Objeto' }))
  fireEvent.change(screen.getByDisplayValue('Diagrama de classes de origem…'), {
    target: { value: 'diagram-classes-1' },
  })
  await waitFor(() => expect(screen.getByText('Pedido')).toBeInTheDocument())
  fireEvent.change(screen.getByDisplayValue('Classe…'), { target: { value: 'class-pedido' } })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar objeto' }))
}

describe('ObjectDiagramCanvas', () => {
  it('CA-01/CA-04: "+ Objeto" abre o modal; escolher diagrama+classe cria um objeto herdando os atributos, dentro do shell (zoom/pan funcionam)', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()

    const [card] = objectCards()
    expect(within(card as HTMLElement).getByText(/instância : Pedido/)).toBeInTheDocument()
    expect(card.querySelector('.node-row')?.textContent).toMatch(/^id/)
    // o modal fecha depois de criar
    expect(screen.queryByText('Nova instância — escolha a classe')).not.toBeInTheDocument()

    // zoom/pan não quebra o posicionamento absoluto do card (CA-01)
    const originalLeft = (card as HTMLElement).style.left
    fireEvent.click(screen.getByTitle('Aproximar'))
    expect((objectCards()[0] as HTMLElement).style.left).toBe(originalLeft)
  })

  it('CA-04: sem nenhum Diagrama de Classes no projeto, o modal mostra o aviso em vez do formulário', () => {
    render(<ControlledCanvas classDiagrams={[]} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Objeto' }))
    expect(
      screen.getByText('Crie um Diagrama de Classes neste projeto antes de adicionar objetos.'),
    ).toBeInTheDocument()
  })

  it('CA-02: busca filtra a lista da sidebar por nome da instância ou da classe (case-insensitive)', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    fireEvent.pointerDown(objectCards()[0])
    fireEvent.change(screen.getByLabelText('Nome da instância (opcional)'), { target: { value: 'pedido1' } })

    const sideList = document.querySelector('.side-list') as HTMLElement
    fireEvent.change(screen.getByPlaceholderText('Buscar objeto ou classe...'), { target: { value: 'PED' } })
    expect(within(sideList).getByText('pedido1')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar objeto ou classe...'), { target: { value: 'zzz' } })
    expect(within(sideList).queryByText('pedido1')).not.toBeInTheDocument()
    expect(within(sideList).getByText('Nenhum objeto encontrado.')).toBeInTheDocument()
  })

  it('CA-03: inspector edita nome da instância e valores dos atributos (paridade com o painel antigo)', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    fireEvent.pointerDown(objectCards()[0])

    fireEvent.change(screen.getByLabelText('Nome da instância (opcional)'), { target: { value: 'pedido1' } })
    fireEvent.change(screen.getByLabelText('id (long)'), { target: { value: '42' } })

    const [card] = objectCards()
    expect(within(card as HTMLElement).getByText(/pedido1 : Pedido/)).toBeInTheDocument()
    expect(within(card as HTMLElement).getByText('42')).toBeInTheDocument()
  })

  it('exclui um objeto', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    fireEvent.pointerDown(objectCards()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Excluir objeto' }))
    expect(objectCards()).toHaveLength(0)
  })
})

describe('ObjectDiagramCanvas — link entre objetos (TASK-017, ver ADR-006)', () => {
  it('CA-01/CA-06: modo de conexão clicando origem→destino cria um link e a sidebar reflete a contagem real', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    await createObjectViaModal()

    fireEvent.click(startLinkButton())
    expect(screen.getByText('Clique no objeto de origem, depois no de destino')).toBeInTheDocument()

    const [from, to] = objectCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)

    // link criado => 1 grupo de conector no SVG
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)
    // o banner de conexão fecha depois de completar
    expect(screen.queryByText('Clique no objeto de origem, depois no de destino')).not.toBeInTheDocument()
    // a contagem "Relações" da sidebar passa a refletir o link real (CA-06)
    const relStat = screen.getByText('Relações').previousElementSibling
    expect(relStat?.textContent).toBe('1')
  })

  it('CA-02: clicar duas vezes no mesmo objeto em modo de conexão não cria link (e avisa)', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    await createObjectViaModal()
    fireEvent.click(startLinkButton())

    const [from] = objectCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(from)

    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
    expect(screen.getByText('Escolha um objeto diferente')).toBeInTheDocument()
  })

  it('RN-02: "Cancelar" no banner sai do modo de conexão sem criar link parcial', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    await createObjectViaModal()
    fireEvent.click(startLinkButton())

    const [from] = objectCards()
    fireEvent.pointerDown(from)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Clique no objeto de origem, depois no de destino')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
  })

  it('CA-03: selecionar o link permite editar o rótulo opcional e excluí-lo pelo inspector', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    await createObjectViaModal()
    fireEvent.click(startLinkButton())
    const [from, to] = objectCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)

    // a relação recém-criada já fica selecionada — inspector mostra o título "Link"
    expect(screen.getByText('Link', { selector: '.insp-title' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Rótulo (opcional)'), { target: { value: 'referencia' } })
    expect(document.querySelector('.connectors-layer text')?.textContent).toBe('referencia')

    fireEvent.click(screen.getByRole('button', { name: 'Excluir link' }))
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
  })

  it('CA-04: excluir um objeto remove todos os links que o referenciavam, sem link órfão', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    await createObjectViaModal()
    fireEvent.click(startLinkButton())
    const [from, to] = objectCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)

    fireEvent.pointerDown(from)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir objeto' }))

    expect(objectCards()).toHaveLength(1)
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
    const relStat = screen.getByText('Relações').previousElementSibling
    expect(relStat?.textContent).toBe('0')
  })

  it('"Link" fica desabilitado com menos de 2 objetos', async () => {
    render(<ControlledCanvas />)
    expect(startLinkButton()).toBeDisabled()
    await createObjectViaModal()
    expect(startLinkButton()).toBeDisabled()
    await createObjectViaModal()
    expect(startLinkButton()).not.toBeDisabled()
  })
})

describe('ObjectDiagramCanvas — destaque de herança na criação (TASK-042, ADR-011)', () => {
  it('CA-02: criar um objeto a partir de uma classe com atributos marca `.node-row` com `inherited-flash`', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()

    const [card] = objectCards()
    const row = card.querySelector('.node-row')
    expect(row).not.toBeNull()
    expect(row).toHaveClass('inherited-flash')
  })

  it('CA-03: reabrir um diagrama com objetos existentes NÃO marca `.node-row` com `inherited-flash`', () => {
    const existing: ObjectDiagramContent = {
      objects: [
        {
          id: 'existing-1',
          classId: 'class-pedido',
          className: 'Pedido',
          values: [{ attributeId: 'a1', name: 'id', type: 'long', value: '1' }],
          x: 0,
          y: 0,
        },
      ],
      links: [],
    }

    function PreloadedCanvas() {
      const [content, setContent] = useState<ObjectDiagramContent>(existing)
      return (
        <ObjectDiagramCanvas
          content={content}
          readOnly={false}
          onChange={setContent}
          classDiagrams={[{ id: 'diagram-classes-1', name: 'Diagrama de Classes' }]}
          loadClasses={async () => [pedidoClass]}
        />
      )
    }

    render(<PreloadedCanvas />)
    const [card] = objectCards()
    const row = card.querySelector('.node-row')
    expect(row).not.toBeNull()
    expect(row).not.toHaveClass('inherited-flash')
  })

  it('CA-04: `onAnimationEnd` limpa o destaque, e editar um valor manualmente depois não o reativa', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()

    const [card] = objectCards()
    let row = card.querySelector('.node-row') as HTMLElement
    expect(row).toHaveClass('inherited-flash')

    fireInheritedFlashEnd(card.querySelector('.node-body') as HTMLElement)
    row = card.querySelector('.node-row') as HTMLElement
    expect(row).not.toHaveClass('inherited-flash')

    // editar o valor manualmente depois não reativa o destaque (RN-01/CA-04)
    fireEvent.pointerDown(card)
    fireEvent.change(screen.getByLabelText('id (long)'), { target: { value: '99' } })
    row = card.querySelector('.node-row') as HTMLElement
    expect(row).not.toHaveClass('inherited-flash')
  })
})

describe('ObjectDiagramCanvas — visualizador (CA-05)', () => {
  it('não mostra nenhum controle de criação/edição — só navega/dá zoom/pan', () => {
    render(<ControlledCanvas readOnly />)
    expect(screen.queryByRole('button', { name: '+ Objeto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Link' })).not.toBeInTheDocument()
    expect(screen.getByTitle('Aproximar')).toBeInTheDocument()
  })
})

describe('ObjectDiagramCanvas — cards de comentário (TASK-053, ver ADR-013)', () => {
  it('"+ Nota" cria um card de comentário vazio, já selecionado', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())

    expect(noteCards()).toHaveLength(1)
    expect(screen.getByText('Comentário', { selector: '.insp-title' })).toBeInTheDocument()
  })

  it('inspector edita o texto do comentário, refletido no card', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())

    fireEvent.change(screen.getByLabelText('Texto'), {
      target: { value: 'Objetos de exemplo — não usar em produção' },
    })

    expect(
      within(noteCards()[0] as HTMLElement).getByText('Objetos de exemplo — não usar em produção'),
    ).toBeInTheDocument()
  })

  it('inspector escolhe uma cor (mesma paleta do card de classe), aplicada imediatamente no card', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())

    fireEvent.click(screen.getByRole('radio', { name: 'Vermelho' }))

    const [card] = noteCards()
    expect(card).toHaveClass('has-color')
    expect((card as HTMLElement).style.getPropertyValue('--note-color')).toBe('#ef4444')
  })

  it('"Excluir comentário" remove só a nota, sem afetar objetos', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    fireEvent.click(addNoteButton())
    expect(noteCards()).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir comentário' }))

    expect(noteCards()).toHaveLength(0)
    expect(objectCards()).toHaveLength(1)
  })

  it('grip no canto redimensiona o card — encolhe até o mínimo, nunca menos', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    const handle = noteCards()[0].querySelector('.note-resize-handle') as HTMLElement
    expect(handle).toBeInTheDocument()

    fireEvent.pointerDown(handle, { clientX: 1000, clientY: 1000 })
    fireEvent.pointerMove(handle, { clientX: -9000, clientY: -9000 })
    fireEvent.pointerUp(handle)

    const resized = noteCards()[0] as HTMLElement
    expect(resized.style.width).toBe(`${NOTE_MIN_WIDTH}px`)
    expect(resized.style.height).toBe(`${NOTE_MIN_HEIGHT}px`)
  })

  it('grip no canto redimensiona o card — cresce além do padrão, sem mover a posição', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    const [note] = noteCards()
    const originalLeft = (note as HTMLElement).style.left
    const originalTop = (note as HTMLElement).style.top
    const handle = note.querySelector('.note-resize-handle') as HTMLElement

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(handle, { clientX: 5000, clientY: 5000 })
    fireEvent.pointerUp(handle)

    const resized = noteCards()[0] as HTMLElement
    expect(parseFloat(resized.style.width)).toBeGreaterThan(NOTE_CARD_WIDTH)
    expect(resized.style.left).toBe(originalLeft)
    expect(resized.style.top).toBe(originalTop)
  })

  it('"ajustar à tela" não quebra o posicionamento absoluto do card de comentário', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    const originalLeft = (noteCards()[0] as HTMLElement).style.left

    fireEvent.click(screen.getByTitle('Aproximar'))
    fireEvent.click(screen.getByTitle('Ajustar à tela'))

    expect((noteCards()[0] as HTMLElement).style.left).toBe(originalLeft)
  })
})

describe('ObjectDiagramCanvas — excluir com Delete/Backspace (TASK-053)', () => {
  it('Delete exclui o objeto selecionado', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    fireEvent.pointerDown(objectCards()[0])

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(objectCards()).toHaveLength(0)
  })

  it('Backspace exclui o comentário selecionado', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    expect(noteCards()).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'Backspace' })

    expect(noteCards()).toHaveLength(0)
  })

  it('Delete exclui o link selecionado, sem afetar os objetos', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    await createObjectViaModal()
    fireEvent.click(startLinkButton())
    const [from, to] = objectCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
    expect(objectCards()).toHaveLength(2)
  })

  it('nunca dispara com o foco num campo de texto (não apaga o card ao editar o nome da instância)', async () => {
    render(<ControlledCanvas />)
    await createObjectViaModal()
    fireEvent.pointerDown(objectCards()[0])

    const nameInput = screen.getByLabelText('Nome da instância (opcional)')
    nameInput.focus()
    fireEvent.keyDown(nameInput, { key: 'Delete' })

    expect(objectCards()).toHaveLength(1)
  })

  it('sem nenhuma seleção, não faz nada', async () => {
    // "+ Objeto" já deixa o objeto recém-criado selecionado — pra testar
    // "nada selecionado" de verdade, carrega um diagrama já existente sem
    // nunca clicar nele (mesmo padrão do teste equivalente no Diagrama de
    // Classes, TASK-052).
    const existing: ObjectDiagramContent = {
      objects: [
        {
          id: 'existing-1',
          classId: 'class-pedido',
          className: 'Pedido',
          values: [{ attributeId: 'a1', name: 'id', type: 'long', value: '1' }],
          x: 0,
          y: 0,
        },
      ],
      links: [],
    }
    function PreloadedCanvas() {
      const [content, setContent] = useState<ObjectDiagramContent>(existing)
      return (
        <ObjectDiagramCanvas
          content={content}
          readOnly={false}
          onChange={setContent}
          classDiagrams={[{ id: 'diagram-classes-1', name: 'Diagrama de Classes' }]}
          loadClasses={async () => [pedidoClass]}
        />
      )
    }
    render(<PreloadedCanvas />)

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(objectCards()).toHaveLength(1)
  })

  it('visualizador: Delete não exclui nada (RN-02 — só editor)', () => {
    const existing: ObjectDiagramContent = {
      objects: [
        {
          id: 'existing-1',
          classId: 'class-pedido',
          className: 'Pedido',
          values: [{ attributeId: 'a1', name: 'id', type: 'long', value: '1' }],
          x: 0,
          y: 0,
        },
      ],
      links: [],
    }
    render(
      <ObjectDiagramCanvas
        content={existing}
        readOnly
        onChange={() => {}}
        classDiagrams={[]}
        loadClasses={async () => []}
      />,
    )
    fireEvent.pointerDown(objectCards()[0])

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(objectCards()).toHaveLength(1)
  })
})

describe('isBackgroundTarget', () => {
  // Regressão (2026-09-02) — mesmo bug/correção do `ClassDiagramCanvas`
  // (ver o teste equivalente lá para a explicação completa): um clique
  // num botão flutuante (zoom-controls) não pode contar como "fundo do
  // canvas", ou `setPointerCapture` no fundo hijacka o `click` do botão.
  it('não conta um <button> (ex.: zoom-controls) como fundo do canvas', () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    expect(isBackgroundTarget(button)).toBe(false)
    document.body.removeChild(button)
  })

  it('continua contando um elemento dentro de um card (.node-box) como não-fundo', () => {
    const card = document.createElement('div')
    card.className = 'node-box object'
    const child = document.createElement('span')
    card.appendChild(child)
    document.body.appendChild(card)
    expect(isBackgroundTarget(child)).toBe(false)
    document.body.removeChild(card)
  })

  it('TASK-053: conta um elemento dentro de um card de comentário (.note-card) como não-fundo', () => {
    const card = document.createElement('div')
    card.className = 'note-card'
    const child = document.createElement('span')
    card.appendChild(child)
    document.body.appendChild(card)
    expect(isBackgroundTarget(child)).toBe(false)
    document.body.removeChild(card)
  })
})
