import { describe, expect, it } from 'vitest'
import type { DiagramClass } from '../class-diagram/types'
import {
  addObject,
  filterObjectsByQuery,
  removeObject,
  toBoundedNode,
  updateObject,
  updateObjectValue,
} from './contentOperations'
import { emptyObjectDiagramContent } from './types'

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
