// TASK-003/007 — testes de componente do canvas do Diagrama de Classes.
// Rodam em jsdom, sem depender de um projeto Supabase real (o
// componente só recebe `content`/`onChange` via props). Reescrito na
// TASK-007 para as novas interações (shell/inspector fixo/modo de
// conexão) — ver "Estratégia de testes" e CA-01..CA-07 da task.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ClassDiagramCanvas, isBackgroundTarget } from './ClassDiagramCanvas'
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
