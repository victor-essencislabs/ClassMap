// TASK-004/008 — testes de componente do canvas do Diagrama de Objetos.
// Reescrito na TASK-008 para as novas interações (shell/inspector
// fixo/modal de criação) — ver "Estratégia de testes" e CA-01..CA-07.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { DiagramClass } from '../class-diagram/types'
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
})
