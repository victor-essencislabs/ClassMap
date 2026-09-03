// TASK-003 — testes unitários da lógica de edição do conteúdo do
// Diagrama de Classes (ver "Estratégia de testes" da task).
import { describe, expect, it } from 'vitest'
import {
  addClass,
  addNote,
  addRelationship,
  filterClassesByQuery,
  noteToBoundedNode,
  removeClass,
  removeNote,
  removeRelationship,
  toBoundedNode,
  updateClass,
  updateNote,
  updateRelationship,
} from './contentOperations'
import { emptyClassDiagramContent, type ClassDiagramContent } from './types'

function withTwoClasses(): ClassDiagramContent {
  let content = emptyClassDiagramContent()
  content = addClass(content)
  content = addClass(content)
  return content
}

describe('addClass', () => {
  it('adiciona uma classe com nome padrão e 2 atributos (CA-01)', () => {
    const content = addClass(emptyClassDiagramContent())
    expect(content.classes).toHaveLength(1)
    expect(content.classes[0].name).toBe('NovaClasse')
    expect(content.classes[0].attributes.length).toBeGreaterThanOrEqual(2)
  })

  it('gera ids únicos para classes e atributos', () => {
    let content = emptyClassDiagramContent()
    content = addClass(content)
    content = addClass(content)
    const [a, b] = content.classes
    expect(a.id).not.toBe(b.id)
  })
})

describe('removeClass', () => {
  it('remove também qualquer relação que referencie a classe removida', () => {
    let content = withTwoClasses()
    const [a, b] = content.classes
    content = addRelationship(content, a.id, b.id, 'association')
    expect(content.relationships).toHaveLength(1)

    content = removeClass(content, a.id)
    expect(content.classes).toHaveLength(1)
    expect(content.relationships).toHaveLength(0)
  })

  it('não afeta relações que não envolvem a classe removida', () => {
    let content = withTwoClasses()
    content = addClass(content)
    const [a, b, c] = content.classes
    content = addRelationship(content, a.id, b.id, 'association')

    content = removeClass(content, c.id)
    expect(content.relationships).toHaveLength(1)
  })

  it('TASK-051: preserva os comentários do diagrama (antes retornava um objeto sem spread, que os descartava)', () => {
    let content = withTwoClasses()
    content = addNote(content)
    const [a] = content.classes

    content = removeClass(content, a.id)

    expect(content.notes).toHaveLength(1)
  })
})

describe('addRelationship', () => {
  it('cria uma relação com from/to/type corretos', () => {
    let content = withTwoClasses()
    const [a, b] = content.classes
    content = addRelationship(content, a.id, b.id, 'inheritance')
    expect(content.relationships).toHaveLength(1)
    expect(content.relationships[0]).toMatchObject({ from: a.id, to: b.id, type: 'inheritance' })
  })

  it('ignora tentativa de relação de uma classe para si mesma', () => {
    let content = withTwoClasses()
    const [a] = content.classes
    const next = addRelationship(content, a.id, a.id, 'association')
    expect(next).toBe(content)
  })

  it('ignora referência a classe inexistente', () => {
    const content = withTwoClasses()
    const next = addRelationship(content, content.classes[0].id, 'id-que-nao-existe', 'association')
    expect(next).toBe(content)
  })

  it('suporta os 5 tipos de relação UML (RN-01 da TASK-003)', () => {
    let content = withTwoClasses()
    const [a, b] = content.classes
    const types = ['association', 'aggregation', 'composition', 'inheritance', 'dependency'] as const
    for (const type of types) {
      content = addRelationship(content, a.id, b.id, type)
    }
    expect(content.relationships.map((r) => r.type)).toEqual(types)
  })
})

describe('updateClass / updateRelationship', () => {
  it('atualiza só a classe/relação alvo, preservando as demais', () => {
    let content = withTwoClasses()
    const [a, b] = content.classes
    content = addRelationship(content, a.id, b.id, 'association')
    const relationshipId = content.relationships[0].id

    content = updateClass(content, a.id, { name: 'Pedido' })
    content = updateRelationship(content, relationshipId, { fromMultiplicity: '1', toMultiplicity: '0..*' })

    expect(content.classes.find((c) => c.id === a.id)?.name).toBe('Pedido')
    expect(content.classes.find((c) => c.id === b.id)?.name).toBe('NovaClasse')
    expect(content.relationships[0]).toMatchObject({ fromMultiplicity: '1', toMultiplicity: '0..*' })
  })
})

describe('cor do card de classe (TASK-014, ver ADR-005)', () => {
  it('addClass não define cor (padrão do design system, CA-04)', () => {
    const content = addClass(emptyClassDiagramContent())
    expect(content.classes[0].color).toBeUndefined()
  })

  it('updateClass grava a cor escolhida, sem afetar outros campos (CA-01)', () => {
    let content = withTwoClasses()
    const [a, b] = content.classes
    content = updateClass(content, a.id, { color: '#ef4444' })

    expect(content.classes.find((c) => c.id === a.id)?.color).toBe('#ef4444')
    expect(content.classes.find((c) => c.id === b.id)?.color).toBeUndefined()
  })

  it('updateClass com color: undefined volta ao padrão (limpar a cor)', () => {
    let content = withTwoClasses()
    const [a] = content.classes
    content = updateClass(content, a.id, { color: '#3b82f6' })
    content = updateClass(content, a.id, { color: undefined })

    expect(content.classes.find((c) => c.id === a.id)?.color).toBeUndefined()
  })

  it('sobrevive a JSON.stringify/JSON.parse (CA-02 — salvar/recarregar preserva a cor)', () => {
    let content = withTwoClasses()
    content = updateClass(content, content.classes[0].id, { color: '#10b981' })

    const roundTripped = JSON.parse(JSON.stringify(content)) as ClassDiagramContent
    expect(roundTripped.classes[0].color).toBe('#10b981')
    expect(roundTripped).toEqual(content)
  })
})

describe('cards de comentário (TASK-051, ver ADR-013)', () => {
  it('addNote cria um comentário com texto vazio e sem cor', () => {
    const content = addNote(emptyClassDiagramContent())
    expect(content.notes).toHaveLength(1)
    expect(content.notes![0].text).toBe('')
    expect(content.notes![0].color).toBeUndefined()
  })

  it('gera ids únicos entre comentários', () => {
    let content = addNote(emptyClassDiagramContent())
    content = addNote(content)
    const [a, b] = content.notes!
    expect(a.id).not.toBe(b.id)
  })

  it('funciona mesmo quando `notes` nunca existiu no conteúdo (diagrama salvo antes da ADR-013)', () => {
    const legacyContent = { classes: [], relationships: [] } as ClassDiagramContent // sem `notes`
    const content = addNote(legacyContent)
    expect(content.notes).toHaveLength(1)
  })

  it('updateNote atualiza texto/cor só do comentário alvo, preservando os demais', () => {
    let content = addNote(emptyClassDiagramContent())
    content = addNote(content)
    const [a, b] = content.notes!

    content = updateNote(content, a.id, { text: 'Vermelho: excluir', color: '#ef4444' })

    expect(content.notes!.find((n) => n.id === a.id)).toMatchObject({ text: 'Vermelho: excluir', color: '#ef4444' })
    expect(content.notes!.find((n) => n.id === b.id)?.text).toBe('')
  })

  it('removeNote remove só o comentário indicado, sem afetar classes/relações', () => {
    let content = withTwoClasses()
    content = addNote(content)
    content = addNote(content)
    const [a] = content.notes!

    content = removeNote(content, a.id)

    expect(content.notes).toHaveLength(1)
    expect(content.classes).toHaveLength(2)
  })

  it('noteToBoundedNode usa a largura fixa do card e estima a altura pelo texto', () => {
    const content = addNote(emptyClassDiagramContent())
    const note = updateNote(content, content.notes![0].id, { text: 'um comentário razoavelmente longo' }).notes![0]
    const node = noteToBoundedNode(note)
    expect(node).toMatchObject({ x: note.x, y: note.y })
    expect(node.w).toBeGreaterThan(0)
    expect(node.h).toBeGreaterThan(0)
  })

  it('sobrevive a JSON.stringify/JSON.parse (mesma garantia de persistência de classe/cor)', () => {
    let content = addNote(emptyClassDiagramContent())
    content = updateNote(content, content.notes![0].id, { text: 'Amarelo: precisa de ajuste', color: '#eab308' })

    const roundTripped = JSON.parse(JSON.stringify(content)) as ClassDiagramContent
    expect(roundTripped).toEqual(content)
  })
})

describe('removeRelationship', () => {
  it('remove só a relação indicada', () => {
    let content = withTwoClasses()
    const [a, b] = content.classes
    content = addRelationship(content, a.id, b.id, 'association')
    content = addRelationship(content, b.id, a.id, 'dependency')
    const [first, second] = content.relationships

    content = removeRelationship(content, first.id)
    expect(content.relationships).toEqual([second])
  })
})

describe('filterClassesByQuery (TASK-007, CA-03)', () => {
  it('substring do nome, sem diferenciar maiúsculas/minúsculas', () => {
    let content = withTwoClasses()
    content = updateClass(content, content.classes[0].id, { name: 'Usuario' })
    content = updateClass(content, content.classes[1].id, { name: 'Pedido' })

    expect(filterClassesByQuery(content.classes, 'usu').map((c) => c.name)).toEqual(['Usuario'])
    expect(filterClassesByQuery(content.classes, 'USUARIO').map((c) => c.name)).toEqual(['Usuario'])
  })

  it('query vazia devolve todas as classes', () => {
    const content = withTwoClasses()
    expect(filterClassesByQuery(content.classes, '')).toEqual(content.classes)
    expect(filterClassesByQuery(content.classes, '   ')).toEqual(content.classes)
  })

  it('sem nenhuma classe correspondente, devolve lista vazia', () => {
    const content = withTwoClasses()
    expect(filterClassesByQuery(content.classes, 'não existe')).toEqual([])
  })
})

describe('toBoundedNode', () => {
  it('usa a largura fixa do card e estima a altura pelos atributos', () => {
    const content = addClass(emptyClassDiagramContent())
    const node = toBoundedNode(content.classes[0])
    expect(node).toMatchObject({ x: content.classes[0].x, y: content.classes[0].y })
    expect(node.w).toBeGreaterThan(0)
    expect(node.h).toBeGreaterThan(0)
  })
})

describe('round-trip de serialização (CA-04 — salvar/recarregar preserva o estado)', () => {
  it('sobrevive a JSON.stringify/JSON.parse sem perder nenhum campo', () => {
    let content = withTwoClasses()
    const [a, b] = content.classes
    content = addRelationship(content, a.id, b.id, 'composition')
    content = updateRelationship(content, content.relationships[0].id, {
      fromMultiplicity: '1',
      toMultiplicity: '0..*',
    })
    content = updateClass(content, a.id, { stereotype: 'entity' })

    const roundTripped = JSON.parse(JSON.stringify(content)) as ClassDiagramContent
    expect(roundTripped).toEqual(content)
  })
})
