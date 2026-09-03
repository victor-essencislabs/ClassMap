// TASK-003/007 — testes de componente do canvas do Diagrama de Classes.
// Rodam em jsdom, sem depender de um projeto Supabase real (o
// componente só recebe `content`/`onChange` via props). Reescrito na
// TASK-007 para as novas interações (shell/inspector fixo/modo de
// conexão) — ver "Estratégia de testes" e CA-01..CA-07 da task.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ClassDiagramCanvas, isBackgroundTarget } from './ClassDiagramCanvas'
import { emptyClassDiagramContent, NOTE_CARD_WIDTH, NOTE_MIN_HEIGHT, NOTE_MIN_WIDTH, type ClassDiagramContent } from './types'

/** Wrapper com estado local, do jeito que `DiagramEditorPage` usa o canvas de verdade. */
function ControlledCanvas({
  initial = emptyClassDiagramContent(),
  readOnly = false,
  onCreateDerivedDiagram,
}: {
  initial?: ClassDiagramContent
  readOnly?: boolean
  /** TASK-056 — quem hospeda o canvas de verdade (`DiagramEditorPage`) é
   * que sabe criar diagrama no Supabase e navegar; aqui entra um duplo. */
  onCreateDerivedDiagram?: (name: string, content: ClassDiagramContent) => Promise<void>
}) {
  const [content, setContent] = useState(initial)
  return (
    <ClassDiagramCanvas
      content={content}
      readOnly={readOnly}
      onChange={setContent}
      onCreateDerivedDiagram={onCreateDerivedDiagram}
    />
  )
}

/** Cards do canvas REAL. O `:not(.focus-canvas)` não é detalhe: desde a
 * TASK-055 o modal de foco também carrega a classe `diagram-shell-canvas`
 * (é sob esse escopo que todo o CSS de card/conector está escrito), então
 * sem isto os cards do modal entrariam na contagem do canvas. */
function classCards() {
  return Array.from(document.querySelectorAll('.diagram-shell-canvas:not(.focus-canvas) .node-box'))
}

function noteCards() {
  return Array.from(document.querySelectorAll('.diagram-shell-canvas .note-card'))
}

function addClassButton() {
  return screen.getByRole('button', { name: '+ Classe' })
}

function addNoteButton() {
  return screen.getByRole('button', { name: '+ Nota' })
}

function startConnectButton() {
  return screen.getByRole('button', { name: 'Relação' })
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

  it('TASK-014 CA-01: escolher uma cor no inspector aplica o acento no card imediatamente', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.pointerDown(classCards()[0])

    fireEvent.click(screen.getByRole('radio', { name: 'Vermelho' }))

    const [card] = classCards()
    expect(card).toHaveClass('has-color')
    expect((card as HTMLElement).style.getPropertyValue('--node-color')).toBe('#ef4444')
  })

  it('TASK-014 CA-04: sem cor escolhida, o card não ganha a classe/acento (aparência padrão preservada)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())

    const [card] = classCards()
    expect(card).not.toHaveClass('has-color')
    expect((card as HTMLElement).style.getPropertyValue('--node-color')).toBe('')
  })

  it('TASK-014: "×" (sem cor) no seletor limpa a cor já escolhida', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.pointerDown(classCards()[0])
    fireEvent.click(screen.getByRole('radio', { name: 'Vermelho' }))
    expect(classCards()[0]).toHaveClass('has-color')

    fireEvent.click(screen.getByRole('radio', { name: 'Sem cor (padrão)' }))

    expect(classCards()[0]).not.toHaveClass('has-color')
  })

  it('TASK-041 RN-01: criar uma relação nova marca o conector como "just-created", mas uma relação carregada de um diagrama existente nunca fica marcada', () => {
    // Diagrama já existente (como se tivesse acabado de ser aberto do
    // Supabase) — a relação pré-existente não deve nascer animada.
    const existing: ClassDiagramContent = {
      classes: [
        { id: 'c1', name: 'A', attributes: [], x: 0, y: 0 },
        { id: 'c2', name: 'B', attributes: [], x: 300, y: 0 },
      ],
      relationships: [{ id: 'r1', from: 'c1', to: 'c2', type: 'association', controlX: 150 }],
    }
    render(<ControlledCanvas initial={existing} />)
    expect(document.querySelector('.connectors-layer > g.just-created')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)

    // Agora cria uma relação de verdade nesta sessão — essa sim nasce animada.
    fireEvent.click(addClassButton())
    const cards = classCards()
    fireEvent.click(startConnectButton())
    fireEvent.pointerDown(cards[0]) // classe A (pré-existente)
    fireEvent.pointerDown(cards[cards.length - 1]) // classe nova

    const groups = document.querySelectorAll('.connectors-layer > g')
    expect(groups).toHaveLength(2)
    const justCreatedGroups = document.querySelectorAll('.connectors-layer > g.just-created')
    expect(justCreatedGroups).toHaveLength(1)
    // A limpeza do estado ao fim da animação (`onJustCreatedAnimationEnd`,
    // para o efeito não repetir em re-renders futuros) é coberta à parte
    // em `Connector.test.ts` (`isJustCreatedAnimationEnd`) — jsdom não
    // implementa `AnimationEvent`, então `onAnimationEnd` do React nunca
    // dispara de fato num evento `animationend` simulado aqui.
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

  it('TASK-049: selecionar uma classe destaca por sentido as relações que a tocam, e recua as demais', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    const [a, b] = classCards()

    // rel0: A -> B (A é `from` — deve ficar "outgoing" quando A for selecionada)
    fireEvent.click(startConnectButton())
    fireEvent.pointerDown(a)
    fireEvent.pointerDown(b)

    // rel1: C -> A (A é `to` — deve ficar "incoming" quando A for selecionada)
    fireEvent.click(startConnectButton())
    fireEvent.pointerDown(classCards()[2])
    fireEvent.pointerDown(classCards()[0])

    // rel2: B -> C (não toca A — deve recuar/"dimmed" quando A for selecionada)
    fireEvent.click(startConnectButton())
    fireEvent.pointerDown(classCards()[1])
    fireEvent.pointerDown(classCards()[2])

    fireEvent.pointerDown(classCards()[0]) // seleciona a classe A

    const groups = document.querySelectorAll('.connectors-layer > g')
    expect(groups).toHaveLength(3)
    const strokeOf = (g: Element) => g.querySelector('.connector-path')?.getAttribute('stroke')

    expect(strokeOf(groups[0])).toBe('var(--class-accent)')
    expect(groups[0]).not.toHaveClass('dimmed')

    expect(strokeOf(groups[1])).toBe('var(--rel-incoming)')
    expect(groups[1]).not.toHaveClass('dimmed')

    expect(groups[2]).toHaveClass('dimmed')
    expect(strokeOf(groups[2])).toBe('currentColor')

    // a lista "Relações" do inspector reflete o mesmo sentido, via a
    // bolinha colorida (mesma cor do conector correspondente no canvas).
    const chips = document.querySelectorAll('.rel-chip')
    expect(chips).toHaveLength(2) // só as relações que tocam A (rel0/rel1) aparecem aqui
    expect(chips[0].querySelector('.rel-dir-dot')).not.toHaveClass('incoming') // A -> B
    expect(chips[1].querySelector('.rel-dir-dot')).toHaveClass('incoming') // C -> A
  })

  it('TASK-049: selecionar uma relação diretamente continua marcando só ela (comportamento anterior, sem "dimmed" nas outras)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    const [a, b] = classCards()

    fireEvent.click(startConnectButton())
    fireEvent.pointerDown(a)
    fireEvent.pointerDown(b)

    fireEvent.click(startConnectButton())
    fireEvent.pointerDown(classCards()[1])
    fireEvent.pointerDown(classCards()[2])

    const groups = document.querySelectorAll('.connectors-layer > g')
    // seleciona a 1ª relação clicando na sua linha (path de área de clique)
    fireEvent.click(groups[0].querySelector('path')!)

    const strokeOf = (g: Element) => g.querySelector('.connector-path')?.getAttribute('stroke')
    expect(strokeOf(groups[0])).toBe('var(--class-accent)')
    expect(strokeOf(groups[1])).toBe('currentColor')
    expect(groups[1]).not.toHaveClass('dimmed') // só destaque de classe recua as outras — relação direta não
  })
})

describe('ClassDiagramCanvas — cards de comentário (TASK-051, ver ADR-013)', () => {
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
      target: { value: 'Vermelho: classes que precisam ser excluídas' },
    })

    expect(within(noteCards()[0] as HTMLElement).getByText('Vermelho: classes que precisam ser excluídas')).toBeInTheDocument()
  })

  it('inspector escolhe uma cor (mesma paleta do card de classe), aplicada imediatamente no card', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())

    fireEvent.click(screen.getByRole('radio', { name: 'Vermelho' }))

    const [card] = noteCards()
    expect(card).toHaveClass('has-color')
    expect((card as HTMLElement).style.getPropertyValue('--note-color')).toBe('#ef4444')
  })

  it('"Excluir comentário" remove só a nota, sem afetar classes', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addNoteButton())
    expect(noteCards()).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir comentário' }))

    expect(noteCards()).toHaveLength(0)
    expect(classCards()).toHaveLength(1)
  })

  it('zoom (+/−/ajustar à tela) não quebra o posicionamento absoluto do card de comentário (mesma garantia da TASK-007 CA-01 para classes)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    const [note] = noteCards()
    const originalLeft = (note as HTMLElement).style.left

    fireEvent.click(screen.getByTitle('Aproximar'))
    fireEvent.click(screen.getByTitle('Afastar'))
    fireEvent.click(screen.getByTitle('Ajustar à tela'))

    expect((noteCards()[0] as HTMLElement).style.left).toBe(originalLeft)
  })

  it('TASK-052: grip no canto redimensiona o card — encolhe até o mínimo, nunca menos', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    const handle = noteCards()[0].querySelector('.note-resize-handle') as HTMLElement
    expect(handle).toBeInTheDocument()

    // arrasto bem grande pra dentro — deve bater no piso (NOTE_MIN_WIDTH/HEIGHT)
    // independente do zoom exato do canvas neste ambiente de teste.
    fireEvent.pointerDown(handle, { clientX: 1000, clientY: 1000 })
    fireEvent.pointerMove(handle, { clientX: -9000, clientY: -9000 })
    fireEvent.pointerUp(handle)

    const resized = noteCards()[0] as HTMLElement
    expect(resized.style.width).toBe(`${NOTE_MIN_WIDTH}px`)
    expect(resized.style.height).toBe(`${NOTE_MIN_HEIGHT}px`)
  })

  it('TASK-052: grip no canto redimensiona o card — cresce além do padrão', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    const handle = noteCards()[0].querySelector('.note-resize-handle') as HTMLElement

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(handle, { clientX: 5000, clientY: 5000 })
    fireEvent.pointerUp(handle)

    const resized = noteCards()[0] as HTMLElement
    expect(parseFloat(resized.style.width)).toBeGreaterThan(NOTE_CARD_WIDTH)
    expect(resized.style.height).not.toBe('')
  })

  it('TASK-052: redimensionar não move o card (grip precisa de stopPropagation)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    const [note] = noteCards()
    const originalLeft = (note as HTMLElement).style.left
    const originalTop = (note as HTMLElement).style.top
    const handle = note.querySelector('.note-resize-handle') as HTMLElement

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(handle, { clientX: 80, clientY: 80 })
    fireEvent.pointerUp(handle)

    const resized = noteCards()[0] as HTMLElement
    expect(resized.style.left).toBe(originalLeft)
    expect(resized.style.top).toBe(originalTop)
  })
})

describe('ClassDiagramCanvas — excluir com Delete/Backspace (TASK-052)', () => {
  it('Delete exclui a classe selecionada', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.pointerDown(classCards()[0])

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(classCards()).toHaveLength(0)
  })

  it('Backspace exclui o comentário selecionado', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addNoteButton())
    expect(noteCards()).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'Backspace' })

    expect(noteCards()).toHaveLength(0)
  })

  it('Delete exclui a relação selecionada', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.click(addClassButton())
    fireEvent.click(startConnectButton())
    const [from, to] = classCards()
    fireEvent.pointerDown(from)
    fireEvent.pointerDown(to)
    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(document.querySelectorAll('.connectors-layer > g')).toHaveLength(0)
    // exclui só a relação — as 2 classes continuam
    expect(classCards()).toHaveLength(2)
  })

  it('nunca dispara com o foco num campo de texto (não apaga o card ao editar o nome)', () => {
    render(<ControlledCanvas />)
    fireEvent.click(addClassButton())
    fireEvent.pointerDown(classCards()[0])

    const nameInput = screen.getByLabelText('Nome da classe')
    nameInput.focus()
    fireEvent.keyDown(nameInput, { key: 'Delete' })

    expect(classCards()).toHaveLength(1)
  })

  it('sem nenhuma seleção, não faz nada', () => {
    // "+ Classe" já deixa a classe recém-criada selecionada (mesmo
    // comportamento de sempre) — para testar "nada selecionado" de
    // verdade, carrega um diagrama já existente sem nunca clicar nele.
    const content: ClassDiagramContent = {
      classes: [{ id: 'c1', name: 'Pedido', attributes: [], x: 0, y: 0 }],
      relationships: [],
    }
    render(<ControlledCanvas initial={content} />)

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(classCards()).toHaveLength(1)
  })

  it('visualizador: Delete não exclui nada (RN-03 — só editor)', () => {
    const content: ClassDiagramContent = {
      classes: [{ id: 'c1', name: 'Pedido', attributes: [{ id: 'a1', name: 'id', type: 'long' }], x: 0, y: 0 }],
      relationships: [],
    }
    render(<ControlledCanvas initial={content} readOnly />)
    fireEvent.pointerDown(classCards()[0])

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(classCards()).toHaveLength(1)
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
    expect(screen.queryByRole('button', { name: 'Relação' })).not.toBeInTheDocument()

    fireEvent.pointerDown(classCards()[0])
    expect(screen.queryByRole('button', { name: 'Excluir classe' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nome da classe')).not.toBeInTheDocument()
    // TASK-014 RN-02: só editor escolhe a cor — visualizador não vê o seletor.
    expect(screen.queryByRole('radiogroup', { name: 'Cor do card' })).not.toBeInTheDocument()
    // zoom/pan continuam disponíveis
    expect(screen.getByTitle('Aproximar')).toBeInTheDocument()
  })
})

describe('isBackgroundTarget', () => {
  // Regressão (2026-09-02, achada em produção pelo usuário): um clique
  // num botão flutuante sobre o canvas (zoom-controls, connect-banner)
  // contava como "fundo do canvas", disparando `onBackgroundPointerDown`
  // → `setPointerCapture` no fundo → todo `pointerup`/`click` seguinte
  // era redirecionado pro fundo em vez do botão, que parecia "não fazer
  // nada" (+/−/ajustar à tela sem efeito nenhum).
  it('não conta um <button> (ex.: zoom-controls) como fundo do canvas', () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    expect(isBackgroundTarget(button)).toBe(false)
    document.body.removeChild(button)
  })

  it('conta um elemento comum do fundo (ex.: o próprio SVG) como fundo do canvas', () => {
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.appendChild(bg)
    expect(isBackgroundTarget(bg)).toBe(true)
    document.body.removeChild(bg)
  })

  it('continua contando um elemento dentro de um card (.node-box) como não-fundo', () => {
    const card = document.createElement('div')
    card.className = 'node-box'
    const child = document.createElement('span')
    card.appendChild(child)
    document.body.appendChild(card)
    expect(isBackgroundTarget(child)).toBe(false)
    document.body.removeChild(card)
  })

  it('TASK-051: conta um elemento dentro de um card de comentário (.note-card) como não-fundo', () => {
    const card = document.createElement('div')
    card.className = 'note-card'
    const child = document.createElement('span')
    card.appendChild(child)
    document.body.appendChild(card)
    expect(isBackgroundTarget(child)).toBe(false)
    document.body.removeChild(card)
  })

  it('trata null (fora de um Element, ex. document) como fundo', () => {
    expect(isBackgroundTarget(null)).toBe(true)
  })
})

// TASK-055 — modal de foco (tecla `V` / botão no inspector). O que entra
// no recorte é testado em `focusSubgraph.test.ts` (lógica pura); aqui só
// o que é responsabilidade do componente: quando abre, quando NÃO abre, e
// que abrir/fechar não altera o diagrama.
describe('ClassDiagramCanvas — modal de foco (TASK-055)', () => {
  /** Foco ── Pedido; Cliente ──▶ Foco; Avulsa sem relação nenhuma. */
  function graph(): ClassDiagramContent {
    return {
      classes: [
        { id: 'foco', name: 'Pedido', attributes: [], x: 0, y: 0 },
        { id: 'item', name: 'ItemPedido', attributes: [], x: 400, y: 0 },
        { id: 'cliente', name: 'Cliente', attributes: [], x: 0, y: 300 },
        { id: 'avulsa', name: 'Avulsa', attributes: [], x: 800, y: 800 },
      ],
      relationships: [
        { id: 'r1', from: 'foco', to: 'item', type: 'composition', controlX: 300 },
        { id: 'r2', from: 'cliente', to: 'foco', type: 'association', controlX: 150 },
      ],
    }
  }

  function focusCards() {
    return Array.from(document.querySelectorAll('.focus-canvas .node-box'))
  }

  function selectFocusClass() {
    fireEvent.pointerDown(classCards()[0]) // "Pedido" é a primeira do content
  }

  it('CA-01: V abre o modal com a classe focada e só as relacionadas', () => {
    render(<ControlledCanvas initial={graph()} />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'v' })

    expect(screen.getByText('Foco: Pedido')).toBeInTheDocument()
    const names = focusCards().map((c) => c.textContent)
    expect(names).toHaveLength(3)
    expect(names.join(' ')).toContain('ItemPedido')
    expect(names.join(' ')).toContain('Cliente')
    expect(names.join(' ')).not.toContain('Avulsa')
  })

  it('desenha um conector para cada relação do recorte', () => {
    render(<ControlledCanvas initial={graph()} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'V' })

    expect(document.querySelectorAll('.focus-canvas .connectors-layer > g')).toHaveLength(2)
  })

  it('CA-08: classe sem nenhuma relação abre o modal com o aviso, não em branco (RN-07)', () => {
    render(<ControlledCanvas initial={graph()} />)
    fireEvent.pointerDown(classCards()[3]) // "Avulsa"

    fireEvent.keyDown(window, { key: 'v' })

    expect(screen.getByText(/não se relaciona com nenhuma outra classe/)).toBeInTheDocument()
    expect(focusCards()).toHaveLength(1)
  })

  it('CA-06: sem seleção, V não abre nada', () => {
    render(<ControlledCanvas initial={graph()} />)

    fireEvent.keyDown(window, { key: 'v' })

    expect(screen.queryByText(/^Foco: /)).not.toBeInTheDocument()
  })

  it('CA-06: com uma relação selecionada, V não abre nada', () => {
    render(<ControlledCanvas initial={graph()} />)
    fireEvent.click(document.querySelectorAll('.connectors-layer > g')[0])

    fireEvent.keyDown(window, { key: 'v' })

    expect(screen.queryByText(/^Foco: /)).not.toBeInTheDocument()
  })

  it('CA-05: com o foco num campo de texto, V digita a letra e não abre o modal (RN-04)', () => {
    render(<ControlledCanvas initial={graph()} />)
    selectFocusClass()

    const nameInput = screen.getByLabelText('Nome da classe')
    nameInput.focus()
    fireEvent.keyDown(nameInput, { key: 'v' })

    expect(screen.queryByText(/^Foco: /)).not.toBeInTheDocument()
  })

  it('Ctrl+V (colar) não abre o modal', () => {
    render(<ControlledCanvas initial={graph()} />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'v', ctrlKey: true })

    expect(screen.queryByText(/^Foco: /)).not.toBeInTheDocument()
  })

  it('CA-07: visualizador consegue abrir o modal (RN-03 — é leitura, não edição)', () => {
    render(<ControlledCanvas initial={graph()} readOnly />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'v' })

    expect(screen.getByText('Foco: Pedido')).toBeInTheDocument()
  })

  it('CA-11: o botão do inspector abre o mesmo modal que o atalho (RN-09)', () => {
    render(<ControlledCanvas initial={graph()} />)
    selectFocusClass()

    fireEvent.click(screen.getByRole('button', { name: /Ver só as relacionadas/ }))

    expect(screen.getByText('Foco: Pedido')).toBeInTheDocument()
    expect(focusCards()).toHaveLength(3)
  })

  it('CA-04: abrir e fechar nunca altera o conteúdo do diagrama (RN-01)', async () => {
    const onChange = vi.fn()
    render(<ClassDiagramCanvas content={graph()} readOnly={false} onChange={onChange} />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'v' })
    expect(screen.getByText('Foco: Pedido')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Foco: Pedido')).not.toBeInTheDocument())

    expect(onChange).not.toHaveBeenCalled()
  })

  it('com o modal aberto, Delete não exclui a classe atrás dele', () => {
    render(<ControlledCanvas initial={graph()} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'v' })

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(classCards()).toHaveLength(4)
  })
})

// TASK-056 — criar um diagrama novo com o recorte (tecla `N`). O conteúdo
// gerado é testado em `focusSubgraph.test.ts`; aqui, o que é do
// componente: quando o fluxo dispara, quando NÃO dispara, e o que ele
// entrega ao host.
describe('ClassDiagramCanvas — novo diagrama com o recorte (TASK-056)', () => {
  function graph(): ClassDiagramContent {
    return {
      classes: [
        { id: 'foco', name: 'Pedido', attributes: [], x: 0, y: 0 },
        { id: 'item', name: 'ItemPedido', attributes: [], x: 400, y: 0 },
        { id: 'avulsa', name: 'Avulsa', attributes: [], x: 800, y: 800 },
      ],
      relationships: [{ id: 'r1', from: 'foco', to: 'item', type: 'composition', controlX: 300 }],
    }
  }

  function selectFocusClass() {
    fireEvent.pointerDown(classCards()[0])
  }

  function nameModalOpen() {
    return screen.queryByLabelText('Nome do novo diagrama')
  }

  it('CA-01: N abre o modal de nome pré-preenchido com a classe focada', () => {
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={vi.fn()} />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'n' })

    expect(nameModalOpen()).toHaveValue('Foco — Pedido')
  })

  it('CA-01/CA-02: confirmar entrega ao host o nome e o conteúdo do recorte', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={onCreate} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'N' })

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    const [name, derived] = onCreate.mock.calls[0]
    expect(name).toBe('Foco — Pedido')
    expect(derived.classes.map((c: { id: string }) => c.id).sort()).toEqual(['foco', 'item'])
    expect(derived.relationships).toHaveLength(1)
  })

  it('nome apagado cai na sugestão — `diagrams.name` é not null', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={onCreate} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'n' })

    fireEvent.change(nameModalOpen()!, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalled())
    expect(onCreate.mock.calls[0][0]).toBe('Foco — Pedido')
  })

  it('CA-09: visualizador não tem o caminho — N não faz nada (RN-01)', () => {
    const onCreate = vi.fn()
    render(<ControlledCanvas initial={graph()} readOnly onCreateDerivedDiagram={onCreate} />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'n' })

    expect(nameModalOpen()).not.toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('CA-08: sem seleção, ou com uma relação selecionada, N não faz nada (RN-03)', () => {
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={vi.fn()} />)
    fireEvent.keyDown(window, { key: 'n' })
    expect(nameModalOpen()).not.toBeInTheDocument()

    fireEvent.click(document.querySelectorAll('.connectors-layer > g')[0])
    fireEvent.keyDown(window, { key: 'n' })
    expect(nameModalOpen()).not.toBeInTheDocument()
  })

  it('CA-07: com o foco num campo de texto, N digita a letra e não cria nada (RN-02)', () => {
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={vi.fn()} />)
    selectFocusClass()

    const nameInput = screen.getByLabelText('Nome da classe')
    nameInput.focus()
    fireEvent.keyDown(nameInput, { key: 'n' })

    expect(nameModalOpen()).not.toBeInTheDocument()
  })

  it('Ctrl+N (nova janela do navegador) não dispara o fluxo', () => {
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={vi.fn()} />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })

    expect(nameModalOpen()).not.toBeInTheDocument()
  })

  it('CA-11: falha ao criar mostra o erro e mantém o modal aberto, sem quebrar o diagrama', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('RLS: not authorized'))
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={onCreate} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'n' })

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(screen.getByText('RLS: not authorized')).toBeInTheDocument())
    expect(nameModalOpen()).toBeInTheDocument()
    expect(classCards()).toHaveLength(3)
  })

  it('CA-12: o botão dentro do modal de foco dispara o mesmo fluxo (RN-07)', () => {
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={vi.fn()} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'v' })

    fireEvent.click(screen.getByRole('button', { name: /Criar diagrama com este recorte/ }))

    expect(nameModalOpen()).toHaveValue('Foco — Pedido')
  })

  it('visualizador não vê o botão dentro do modal de foco (RN-07)', () => {
    render(<ControlledCanvas initial={graph()} readOnly onCreateDerivedDiagram={vi.fn()} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'v' })

    expect(screen.getByText('Foco: Pedido')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Criar diagrama com este recorte/ })).not.toBeInTheDocument()
  })

  it('sem host que saiba criar diagrama, o atalho simplesmente não existe', () => {
    render(<ControlledCanvas initial={graph()} />)
    selectFocusClass()

    fireEvent.keyDown(window, { key: 'n' })

    expect(nameModalOpen()).not.toBeInTheDocument()
  })

  it('com o modal de nome aberto, Delete não exclui a classe atrás dele', () => {
    render(<ControlledCanvas initial={graph()} onCreateDerivedDiagram={vi.fn()} />)
    selectFocusClass()
    fireEvent.keyDown(window, { key: 'n' })

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(classCards()).toHaveLength(3)
  })
})

// Achado na validação ao vivo da TASK-056 (não estava previsto nas CAs):
// navegar para o diagrama novo troca só o parâmetro da rota, então o
// canvas NÃO é remontado — sem fechar o modal de foco explicitamente, ele
// ficava aberto por cima do diagrama recém-criado.
describe('ClassDiagramCanvas — TASK-056, estado dos modais após criar', () => {
  it('criar com sucesso fecha o modal de nome E o modal de foco', async () => {
    const content: ClassDiagramContent = {
      classes: [
        { id: 'foco', name: 'Pedido', attributes: [], x: 0, y: 0 },
        { id: 'item', name: 'ItemPedido', attributes: [], x: 400, y: 0 },
      ],
      relationships: [{ id: 'r1', from: 'foco', to: 'item', type: 'association', controlX: 200 }],
    }
    render(<ControlledCanvas initial={content} onCreateDerivedDiagram={vi.fn().mockResolvedValue(undefined)} />)
    fireEvent.pointerDown(classCards()[0])
    fireEvent.keyDown(window, { key: 'v' })
    fireEvent.keyDown(window, { key: 'n' })
    expect(screen.getByText('Foco: Pedido')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(screen.queryByLabelText('Nome do novo diagrama')).not.toBeInTheDocument())
    expect(screen.queryByText('Foco: Pedido')).not.toBeInTheDocument()
  })

  it('falhar mantém os dois abertos, para a pessoa não perder o contexto', async () => {
    const content: ClassDiagramContent = {
      classes: [{ id: 'foco', name: 'Pedido', attributes: [], x: 0, y: 0 }],
      relationships: [],
    }
    const onCreate = vi.fn().mockRejectedValue(new Error('sem rede'))
    render(<ControlledCanvas initial={content} onCreateDerivedDiagram={onCreate} />)
    fireEvent.pointerDown(classCards()[0])
    fireEvent.keyDown(window, { key: 'v' })
    fireEvent.keyDown(window, { key: 'n' })

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(screen.getByText('sem rede')).toBeInTheDocument())
    expect(screen.getByText('Foco: Pedido')).toBeInTheDocument()
  })
})
