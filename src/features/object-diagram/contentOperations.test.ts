import { describe, expect, it } from 'vitest'
import type { DiagramClass } from '../class-diagram/types'
import { addObject, removeObject, updateObject, updateObjectValue } from './contentOperations'
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

describe('round-trip de serialização', () => {
  it('sobrevive a JSON.stringify/parse sem perder campos', () => {
    let content = addObject(emptyObjectDiagramContent(), pedidoClass)
    content = updateObject(content, content.objects[0].id, { instanceName: 'pedido1' })
    content = updateObjectValue(content, content.objects[0].id, 'attr-status', 'pago')

    const roundTripped = JSON.parse(JSON.stringify(content))
    expect(roundTripped).toEqual(content)
  })
})
