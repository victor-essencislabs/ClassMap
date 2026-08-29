import { describe, expect, it } from 'vitest'
import { addClass, addRelationship, updateClass, updateRelationship } from '../class-diagram/contentOperations'
import { emptyClassDiagramContent } from '../class-diagram/types'
import { exportClassDiagram, importClassDiagram } from './classDiagramConversion'

describe('exportClassDiagram', () => {
  it('CA-01: gera um JSON com classes/atributos/relações por nome (não por id)', () => {
    let content = addClass(emptyClassDiagramContent())
    content = addClass(content)
    content = updateClass(content, content.classes[0].id, { name: 'Pedido', stereotype: 'entity' })
    content = updateClass(content, content.classes[1].id, { name: 'Cliente' })
    content = addRelationship(content, content.classes[0].id, content.classes[1].id, 'association')
    content = updateRelationship(content, content.relationships[0].id, {
      fromMultiplicity: '0..*',
      toMultiplicity: '1',
    })

    const exported = exportClassDiagram(content)

    expect(exported.classes).toEqual([
      { name: 'Pedido', stereotype: 'entity', attributes: [{ name: 'id', type: 'long' }, { name: 'nome', type: 'string' }] },
      { name: 'Cliente', stereotype: undefined, attributes: [{ name: 'id', type: 'long' }, { name: 'nome', type: 'string' }] },
    ])
    expect(exported.relationships).toEqual([
      { from: 'Pedido', to: 'Cliente', type: 'association', fromMultiplicity: '0..*', toMultiplicity: '1' },
    ])
    expect(exported.objects).toEqual([])
  })

  it('TASK-014 CA-03: não inclui o campo `color`, mesmo quando a classe tem cor escolhida (ver ADR-005, RN-01)', () => {
    let content = addClass(emptyClassDiagramContent())
    content = updateClass(content, content.classes[0].id, { name: 'Pedido', color: '#ef4444' })

    const exported = exportClassDiagram(content)

    expect(exported.classes).toHaveLength(1)
    expect(exported.classes[0]).not.toHaveProperty('color')
    expect(JSON.stringify(exported)).not.toContain('color')
  })
})

describe('importClassDiagram', () => {
  it('CA-02: recria exatamente as classes e relações de um export (round-trip)', () => {
    let content = addClass(emptyClassDiagramContent())
    content = addClass(content)
    content = updateClass(content, content.classes[0].id, { name: 'Pedido' })
    content = updateClass(content, content.classes[1].id, { name: 'Cliente' })
    content = addRelationship(content, content.classes[0].id, content.classes[1].id, 'composition')

    const exported = exportClassDiagram(content)
    const imported = importClassDiagram(exported)

    expect(imported.ok).toBe(true)
    expect(imported.content!.classes.map((c) => ({ name: c.name, attributes: c.attributes.map((a) => ({ name: a.name, type: a.type })) }))).toEqual(
      content.classes.map((c) => ({ name: c.name, attributes: c.attributes.map((a) => ({ name: a.name, type: a.type })) })),
    )

    const importedRel = imported.content!.relationships[0]
    const importedFromClass = imported.content!.classes.find((c) => c.id === importedRel.from)!
    const importedToClass = imported.content!.classes.find((c) => c.id === importedRel.to)!
    expect(importedFromClass.name).toBe('Pedido')
    expect(importedToClass.name).toBe('Cliente')
    expect(importedRel.type).toBe('composition')

    // reexportar o resultado importado deve dar o MESMO JSON (round-trip completo)
    expect(exportClassDiagram(imported.content!)).toEqual(exported)
  })

  it('CA-03: rejeita JSON malformado com mensagem clara, sem lançar', () => {
    const result = importClassDiagram({ classes: [{ name: 'Pedido', attributes: [{ name: 'id' }] }] })
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.content).toBeUndefined()
  })

  it('CA-03: rejeita tipo de relação inválido', () => {
    const result = importClassDiagram({
      classes: [{ name: 'A', attributes: [] }, { name: 'B', attributes: [] }],
      relationships: [{ from: 'A', to: 'B', type: 'invalido' }],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/type/)
  })

  it('rejeita relação que referencia uma classe não declarada', () => {
    const result = importClassDiagram({
      classes: [{ name: 'A', attributes: [] }],
      relationships: [{ from: 'A', to: 'Inexistente', type: 'association' }],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('Inexistente')
  })

  it('rejeita entrada que não é um objeto (ex.: array, string)', () => {
    expect(importClassDiagram([1, 2, 3]).ok).toBe(false)
    expect(importClassDiagram('não é json de diagrama').ok).toBe(false)
    expect(importClassDiagram(null).ok).toBe(false)
  })
})
