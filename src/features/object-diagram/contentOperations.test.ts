import { describe, expect, it } from 'vitest'
import type { DiagramClass } from '../class-diagram/types'
import {
  addLink,
  addNote,
  addObject,
  filterObjectsByQuery,
  noteToBoundedNode,
  removeLink,
  removeNote,
  removeObject,
  toBoundedNode,
  updateLink,
  updateNote,
  updateObject,
  updateObjectValue,
} from './contentOperations'
import { emptyObjectDiagramContent, type ObjectDiagramContent } from './types'

const pedidoClass: DiagramClass = {
  id: 'class-pedido',
  name: 'Pedido',
  attributes: [
    { id: 'attr-id', name: 'id', type: 'long' },
    { id: 'attr-status', name: 'status', type: 'string' },
  ],
  x: 0,
  y: 0,
}

describe('addObject', () => {
  it('herda automaticamente os atributos da classe (RN-01)', () => {
    const content = addObject(emptyObjectDiagramContent(), pedidoClass)
    expect(content.objects).toHaveLength(1)
    expect(content.objects[0].className).toBe('Pedido')
    expect(content.objects[0].values).toEqual([
      { attributeId: 'attr-id', name: 'id', type: 'long', value: '' },
      { attributeId: 'attr-status', name: 'status', type: 'string', value: '' },
    ])
  })

  it('nunca cria um objeto sem classe correspondente — classId sempre aponta para a classe de origem', () => {
    const content = addObject(emptyObjectDiagramContent(), pedidoClass)
    expect(content.objects[0].classId).toBe('class-pedido')
  })
})

describe('updateObjectValue', () => {
  it('atualiza só o valor do atributo indicado, no objeto indicado', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addObject(content, pedidoClass)
    const [first, second] = content.objects

    content = updateObjectValue(content, first.id, 'attr-status', 'pago')

    expect(content.objects.find((o) => o.id === first.id)?.values).toEqual([
      { attributeId: 'attr-id', name: 'id', type: 'long', value: '' },
      { attributeId: 'attr-status', name: 'status', type: 'string', value: 'pago' },
    ])
    expect(content.objects.find((o) => o.id === second.id)?.values.every((v) => v.value === '')).toBe(
      true,
    )
  })
})

describe('updateObject / removeObject', () => {
  it('atualiza o nome da instância sem afetar os valores', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    const id = content.objects[0].id
    content = updateObject(content, id, { instanceName: 'pedido1' })
    expect(content.objects[0].instanceName).toBe('pedido1')
    expect(content.objects[0].values).toHaveLength(2)
  })

  it('remove só o objeto indicado', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addObject(content, pedidoClass)
    const [first, second] = content.objects
    content = removeObject(content, first.id)
    expect(content.objects).toEqual([second])
  })

  it('TASK-053: preserva os comentários do diagrama (antes retornava um objeto sem spread, que os descartava)', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addNote(content)
    const [obj] = content.objects

    content = removeObject(content, obj.id)

    expect(content.notes).toHaveLength(1)
  })
})

describe('filterObjectsByQuery (TASK-008, CA-02)', () => {
  it('substring do nome da instância, sem diferenciar maiúsculas/minúsculas', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = updateObject(content, content.objects[0].id, { instanceName: 'pedido1' })
    expect(filterObjectsByQuery(content.objects, 'PEDIDO1')).toEqual(content.objects)
    expect(filterObjectsByQuery(content.objects, 'não existe')).toEqual([])
  })

  it('também casa pelo nome da classe de origem', () => {
    const content = addObject(emptyObjectDiagramContent(), pedidoClass)
    expect(filterObjectsByQuery(content.objects, 'ped')).toEqual(content.objects)
  })

  it('query vazia devolve todos os objetos', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addObject(content, pedidoClass)
    expect(filterObjectsByQuery(content.objects, '')).toEqual(content.objects)
  })
})

describe('addLink / removeLink / updateLink (TASK-017, ver ADR-006)', () => {
  it('cria um link entre dois objetos existentes', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addObject(content, pedidoClass)
    const [first, second] = content.objects

    content = addLink(content, first.id, second.id)

    expect(content.links).toHaveLength(1)
    expect(content.links[0]).toMatchObject({ from: first.id, to: second.id })
  })

  it('RN-01: nunca cria um link de um objeto para ele mesmo', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    const id = content.objects[0].id
    content = addLink(content, id, id)
    expect(content.links).toHaveLength(0)
  })

  it('não cria link para um id de objeto inexistente', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    const id = content.objects[0].id
    content = addLink(content, id, 'nao-existe')
    expect(content.links).toHaveLength(0)
  })

  it('updateLink edita o rótulo (opcional) sem afetar from/to', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addObject(content, pedidoClass)
    const [first, second] = content.objects
    content = addLink(content, first.id, second.id)
    const linkId = content.links[0].id

    content = updateLink(content, linkId, { label: 'referencia' })

    expect(content.links[0]).toMatchObject({ from: first.id, to: second.id, label: 'referencia' })
  })

  it('removeLink remove só o link indicado', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addObject(content, pedidoClass)
    content = addObject(content, pedidoClass)
    const [first, second, third] = content.objects
    content = addLink(content, first.id, second.id)
    content = addLink(content, second.id, third.id)
    const [linkA, linkB] = content.links

    content = removeLink(content, linkA.id)

    expect(content.links).toEqual([linkB])
  })

  it('RN-02: excluir um objeto remove em cascata todos os links que o referenciam (origem ou destino)', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addObject(content, pedidoClass)
    content = addObject(content, pedidoClass)
    const [first, second, third] = content.objects
    content = addLink(content, first.id, second.id) // referencia `second` como destino
    content = addLink(content, third.id, second.id) // referencia `second` como destino, de outro lado
    content = addLink(content, first.id, third.id) // não referencia `second`

    content = removeObject(content, second.id)

    expect(content.objects).toEqual([first, third])
    expect(content.links).toHaveLength(1)
    expect(content.links[0]).toMatchObject({ from: first.id, to: third.id })
  })
})

describe('cards de comentário (TASK-053, ver ADR-013)', () => {
  it('addNote cria um comentário com texto vazio e sem cor', () => {
    const content = addNote(emptyObjectDiagramContent())
    expect(content.notes).toHaveLength(1)
    expect(content.notes![0].text).toBe('')
    expect(content.notes![0].color).toBeUndefined()
  })

  it('gera ids únicos entre comentários', () => {
    let content = addNote(emptyObjectDiagramContent())
    content = addNote(content)
    const [a, b] = content.notes!
    expect(a.id).not.toBe(b.id)
  })

  it('funciona mesmo quando `notes` nunca existiu no conteúdo (diagrama salvo antes da TASK-053)', () => {
    const legacyContent = { objects: [], links: [] } as ObjectDiagramContent // sem `notes`
    const content = addNote(legacyContent)
    expect(content.notes).toHaveLength(1)
  })

  it('updateNote atualiza texto/cor só do comentário alvo, preservando os demais', () => {
    let content = addNote(emptyObjectDiagramContent())
    content = addNote(content)
    const [a, b] = content.notes!

    content = updateNote(content, a.id, { text: 'Objetos de teste', color: '#ef4444' })

    expect(content.notes!.find((n) => n.id === a.id)).toMatchObject({ text: 'Objetos de teste', color: '#ef4444' })
    expect(content.notes!.find((n) => n.id === b.id)?.text).toBe('')
  })

  it('removeNote remove só o comentário indicado, sem afetar objetos/links', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = addNote(content)
    content = addNote(content)
    const [a] = content.notes!

    content = removeNote(content, a.id)

    expect(content.notes).toHaveLength(1)
    expect(content.objects).toHaveLength(1)
  })

  it('noteToBoundedNode usa a largura fixa do card e estima a altura pelo texto', () => {
    const content = addNote(emptyObjectDiagramContent())
    const note = updateNote(content, content.notes![0].id, { text: 'um comentário razoavelmente longo' }).notes![0]
    const node = noteToBoundedNode(note)
    expect(node).toMatchObject({ x: note.x, y: note.y })
    expect(node.w).toBeGreaterThan(0)
    expect(node.h).toBeGreaterThan(0)
  })

  it('noteToBoundedNode usa o tamanho manual quando definido (grip arrastado)', () => {
    const content = addNote(emptyObjectDiagramContent())
    const note = updateNote(content, content.notes![0].id, { width: 400, height: 300 }).notes![0]
    const node = noteToBoundedNode(note)
    expect(node).toMatchObject({ w: 400, h: 300 })
  })

  it('sobrevive a JSON.stringify/JSON.parse', () => {
    let content = addNote(emptyObjectDiagramContent())
    content = updateNote(content, content.notes![0].id, { text: 'Amarelo: precisa de ajuste', color: '#eab308' })

    const roundTripped = JSON.parse(JSON.stringify(content)) as ObjectDiagramContent
    expect(roundTripped).toEqual(content)
  })
})

describe('toBoundedNode', () => {
  it('usa a largura fixa do card e estima a altura pelos valores', () => {
    const content = addObject(emptyObjectDiagramContent(), pedidoClass)
    const node = toBoundedNode(content.objects[0])
    expect(node).toMatchObject({ x: content.objects[0].x, y: content.objects[0].y })
    expect(node.w).toBeGreaterThan(0)
    expect(node.h).toBeGreaterThan(0)
  })
})

describe('round-trip de serialização', () => {
  it('sobrevive a JSON.stringify/parse sem perder campos', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = updateObject(content, content.objects[0].id, { instanceName: 'pedido1' })
    content = updateObjectValue(content, content.objects[0].id, 'attr-status', 'pago')

    const roundTripped = JSON.parse(JSON.stringify(content))
    expect(roundTripped).toEqual(content)
  })
})
