import { describe, expect, it } from 'vitest'
import { addClass, addNote, addRelationship, updateClass, updateNote, updateRelationship } from '../class-diagram/contentOperations'
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

  it('TASK-051 CA: não inclui comentários, mesmo quando o diagrama tem cards de comentário (ver ADR-013, RN-01)', () => {
    let content = addClass(emptyClassDiagramContent())
    content = addNote(content)
    content = updateNote(content, content.notes![0].id, { text: 'Vermelho: excluir', color: '#ef4444' })

    const exported = exportClassDiagram(content)

    expect(exported).not.toHaveProperty('notes')
    expect(JSON.stringify(exported)).not.toContain('Vermelho')
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

  // TASK-048/ADR-012: antes desta task, o layout inicial de import usava
  // um número de colunas fixo (4), independente do tamanho do diagrama —
  // um JSON grande (dezenas de classes) virava uma faixa estreita e
  // altíssima (achado testando o diagrama real do ELIMS, 85 classes).
  function makeSyntheticClasses(n: number, attributesPerClass = 6) {
    return Array.from({ length: n }, (_, i) => ({
      name: `Classe${i}`,
      attributes: Array.from({ length: attributesPerClass }, (_, j) => ({ name: `attr${j}`, type: 'string' })),
    }))
  }

  it('TASK-048 CA-01/CA-03: diagrama grande usa mais de 4 colunas e nenhum card se sobrepõe', () => {
    const result = importClassDiagram({ classes: makeSyntheticClasses(85, 6) })
    expect(result.ok).toBe(true)

    const classes = result.content!.classes
    const distinctColumnsUsed = new Set(classes.map((c) => c.x)).size
    // antes da TASK-048 isto travava em 4 (IMPORT_GRID_COLUMNS fixo) —
    // 85 classes precisam de bem mais colunas para não virar uma faixa
    // estreita e altíssima.
    expect(distinctColumnsUsed).toBeGreaterThan(4)

    expect(hasOverlap(classes)).toBe(false)
  })

  it('TASK-048 CA-02: diagrama pequeno (5 classes) continua com layout razoável, sem regressão', () => {
    const result = importClassDiagram({ classes: makeSyntheticClasses(5, 6) })
    expect(result.ok).toBe(true)

    const classes = result.content!.classes
    expect(hasOverlap(classes)).toBe(false)
    // não deve "explodir" em mais colunas do que classes existem
    const distinctColumnsUsed = new Set(classes.map((c) => c.x)).size
    expect(distinctColumnsUsed).toBeLessThanOrEqual(5)
  })

  /** Verifica sobreposição real entre os cards (mesmo cálculo de altura
   * usado pelo próprio import, `estimateClassCardHeight`, replicado aqui
   * para não importar um símbolo interno) — CA-03 da TASK-005, nunca
   * testado explicitamente antes da TASK-048. */
  function hasOverlap(classes: { x: number; y: number; stereotype?: string; attributes: unknown[] }[]): boolean {
    const CARD_WIDTH = 200
    const heightOf = (c: { stereotype?: string; attributes: unknown[] }) =>
      (c.stereotype ? 52 : 36) + Math.max(c.attributes.length, 1) * 20

    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        const a = classes[i]
        const b = classes[j]
        const overlapsX = a.x < b.x + CARD_WIDTH && b.x < a.x + CARD_WIDTH
        const overlapsY = a.y < b.y + heightOf(b) && b.y < a.y + heightOf(a)
        if (overlapsX && overlapsY) return true
      }
    }
    return false
  }
})
