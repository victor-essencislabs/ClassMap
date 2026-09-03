// TASK-055 — testes do recorte de foco (ver "Estratégia de testes" da task).
// É aqui que mora a regra do que entra e do que não entra no recorte; o
// modal é casca.
import { describe, expect, it } from 'vitest'
import {
  buildFocusSubgraph,
  FOCUS_CARD_HEIGHT,
  focusSubgraphFor,
  focusSubgraphToContent,
  layoutFocusSubgraph,
  suggestedFocusDiagramName,
} from './focusSubgraph'
import { CLASS_CARD_WIDTH, estimateClassCardHeight, type ClassDiagramContent, type DiagramClass } from './types'

function cls(id: string, name = id): DiagramClass {
  return { id, name, attributes: [{ id: `${id}-a`, name: 'campo', type: 'string' }], x: 0, y: 0 }
}

/** Grafo base dos testes:
 *
 *     A ──▶ FOCO ──▶ B        (A entra por `incoming`, B por `outgoing`)
 *           FOCO ──▶ C        (C por `outgoing`)
 *           B ──▶ C           (relação ENTRE vizinhas — RN-02)
 *           D ──▶ E           (par isolado, nada a ver com o foco)
 */
function graph(): ClassDiagramContent {
  return {
    classes: [cls('foco', 'Foco'), cls('a', 'Alpha'), cls('b', 'Bravo'), cls('c', 'Charlie'), cls('d'), cls('e')],
    relationships: [
      { id: 'r1', from: 'a', to: 'foco', type: 'association', controlX: 999 },
      { id: 'r2', from: 'foco', to: 'b', type: 'composition', controlX: 999 },
      { id: 'r3', from: 'foco', to: 'c', type: 'inheritance', controlX: 999 },
      { id: 'r4', from: 'b', to: 'c', type: 'dependency', controlX: 999 },
      { id: 'r5', from: 'd', to: 'e', type: 'association', controlX: 999 },
    ],
  }
}

describe('buildFocusSubgraph', () => {
  it('inclui a classe focada e só as diretamente relacionadas (CA-01)', () => {
    const sub = buildFocusSubgraph(graph(), 'foco')!
    expect(sub.classes.map((c) => c.id).sort()).toEqual(['a', 'b', 'c', 'foco'])
  })

  it('inclui a relação entre duas vizinhas, não só as que tocam o foco (RN-02)', () => {
    const sub = buildFocusSubgraph(graph(), 'foco')!
    expect(sub.relationships.map((r) => r.id).sort()).toEqual(['r1', 'r2', 'r3', 'r4'])
  })

  it('exclui classes e relações fora do recorte', () => {
    const sub = buildFocusSubgraph(graph(), 'foco')!
    expect(sub.classes.map((c) => c.id)).not.toContain('d')
    expect(sub.relationships.map((r) => r.id)).not.toContain('r5')
  })

  it('classe sem nenhuma relação devolve só ela mesma (RN-07)', () => {
    const content: ClassDiagramContent = { classes: [cls('sozinha')], relationships: [] }
    const sub = buildFocusSubgraph(content, 'sozinha')!
    expect(sub.classes).toHaveLength(1)
    expect(sub.relationships).toHaveLength(0)
  })

  it('autorrelação não duplica o card da classe focada (RN-06)', () => {
    const content: ClassDiagramContent = {
      classes: [cls('foco')],
      relationships: [{ id: 'self', from: 'foco', to: 'foco', type: 'association', controlX: 0 }],
    }
    const sub = buildFocusSubgraph(content, 'foco')!
    expect(sub.classes).toHaveLength(1)
    expect(sub.relationships.map((r) => r.id)).toEqual(['self'])
  })

  it('devolve null quando a classe focada não existe', () => {
    expect(buildFocusSubgraph(graph(), 'fantasma')).toBeNull()
  })

  it('nunca inclui notas no recorte (ADR-013)', () => {
    const content: ClassDiagramContent = {
      ...graph(),
      notes: [{ id: 'n1', text: 'anotação', x: 0, y: 0 }],
    }
    const sub = buildFocusSubgraph(content, 'foco')!
    expect(sub).not.toHaveProperty('notes')
  })
})

describe('layoutFocusSubgraph', () => {
  it('põe a classe focada no meio, incoming à esquerda e outgoing à direita', () => {
    const laid = focusSubgraphFor(graph(), 'foco')!
    const at = (id: string) => laid.classes.find((c) => c.id === id)!
    expect(at('a').x).toBeLessThan(at('foco').x)
    expect(at('b').x).toBeGreaterThan(at('foco').x)
    expect(at('c').x).toBe(at('b').x) // mesma coluna
  })

  it('não sobrepõe cards da mesma coluna', () => {
    const laid = focusSubgraphFor(graph(), 'foco')!
    const b = laid.classes.find((c) => c.id === 'b')!
    const c = laid.classes.find((c) => c.id === 'c')!
    const [top, bottom] = b.y <= c.y ? [b, c] : [c, b]
    expect(bottom.y).toBeGreaterThanOrEqual(top.y + FOCUS_CARD_HEIGHT)
  })

  // Achado validando ao vivo contra o ELIMS real: com a altura estimada
  // pelos atributos, uma classe de 97 atributos empurrava o resto do
  // recorte centenas de pixels para baixo e o enquadramento encolhia tudo
  // até ficar ilegível. O card do modal é compacto e de altura fixa.
  it('empilha por altura fixa — uma classe gigante não afasta as outras', () => {
    const gigante: DiagramClass = {
      ...cls('gigante'),
      attributes: Array.from({ length: 97 }, (_, i) => ({ id: `g${i}`, name: `campo${i}`, type: 'string' })),
    }
    const content: ClassDiagramContent = {
      classes: [cls('foco'), gigante, cls('b', 'Bravo')],
      relationships: [
        { id: 'r1', from: 'foco', to: 'gigante', type: 'association', controlX: 0 },
        { id: 'r2', from: 'foco', to: 'b', type: 'association', controlX: 0 },
      ],
    }
    const laid = focusSubgraphFor(content, 'foco')!
    const ys = laid.classes
      .filter((c) => c.id !== 'foco')
      .map((c) => c.y)
      .sort((a, b) => a - b)
    expect(ys[1] - ys[0]).toBeLessThan(estimateClassCardHeight(gigante))
    expect(ys[1] - ys[0]).toBeLessThan(FOCUS_CARD_HEIGHT * 2)
  })

  it('quebra um lado em mais de uma coluna quando há vizinhas demais', () => {
    // 21 vizinhas é o caso real que motivou isto (classe `Sample` do
    // ELIMS): numa coluna só, o recorte vira uma torre que só cabe na
    // tela encolhendo tudo.
    const vizinhas = Array.from({ length: 21 }, (_, i) => cls(`v${i}`, `Vizinha${String(i).padStart(2, '0')}`))
    const content: ClassDiagramContent = {
      classes: [cls('foco'), ...vizinhas],
      relationships: vizinhas.map((v, i) => ({
        id: `r${i}`,
        from: 'foco',
        to: v.id,
        type: 'association' as const,
        controlX: 0,
      })),
    }
    const laid = focusSubgraphFor(content, 'foco')!
    const focoX = laid.classes.find((c) => c.id === 'foco')!.x
    const colunasDireita = new Set(laid.classes.filter((c) => c.x > focoX).map((c) => c.x))
    expect(colunasDireita.size).toBeGreaterThan(1)
    expect(colunasDireita.size).toBeLessThanOrEqual(3)
  })

  it('ordena cada coluna por nome, não pela ordem de criação', () => {
    const content = graph()
    // "Bravo" e "Charlie" saem na ordem inversa da alfabética no conteúdo.
    content.classes = [content.classes[0], content.classes[1], content.classes[3], content.classes[2]]
    const laid = focusSubgraphFor(content, 'foco')!
    const b = laid.classes.find((c) => c.id === 'b')!
    const c = laid.classes.find((c) => c.id === 'c')!
    expect(b.y).toBeLessThan(c.y) // Bravo antes de Charlie
  })

  it('vizinha nos dois sentidos aparece uma vez só, do lado outgoing (RN-08)', () => {
    const content = graph()
    content.relationships.push({ id: 'r6', from: 'b', to: 'foco', type: 'association', controlX: 0 })
    const laid = focusSubgraphFor(content, 'foco')!
    const bs = laid.classes.filter((c) => c.id === 'b')
    expect(bs).toHaveLength(1)
    expect(bs[0].x).toBeGreaterThan(laid.classes.find((c) => c.id === 'foco')!.x)
  })

  it('recalcula o controlX de toda relação (RN-06)', () => {
    const laid = focusSubgraphFor(graph(), 'foco')!
    for (const rel of laid.relationships) {
      expect(rel.controlX).not.toBe(999)
    }
  })

  it('põe o cotovelo fora dos cards quando as duas pontas estão na mesma coluna', () => {
    const laid = focusSubgraphFor(graph(), 'foco')!
    const b = laid.classes.find((c) => c.id === 'b')!
    const entreVizinhas = laid.relationships.find((r) => r.id === 'r4')!
    expect(entreVizinhas.controlX).toBeGreaterThan(b.x + CLASS_CARD_WIDTH)
  })

  it('sem vizinhas à esquerda, a coluna do centro encosta na origem', () => {
    const content: ClassDiagramContent = {
      classes: [cls('foco'), cls('b')],
      relationships: [{ id: 'r', from: 'foco', to: 'b', type: 'association', controlX: 0 }],
    }
    const laid = focusSubgraphFor(content, 'foco')!
    expect(laid.classes.find((c) => c.id === 'foco')!.x).toBe(0)
  })

  it('não muta o conteúdo de origem — nem as posições, nem o controlX (RN-01)', () => {
    const content = graph()
    const snapshot = JSON.stringify(content)
    focusSubgraphFor(content, 'foco')
    expect(JSON.stringify(content)).toBe(snapshot)
  })

  it('preserva atributos, estereótipo e cor das classes copiadas', () => {
    const content: ClassDiagramContent = {
      classes: [{ ...cls('foco'), stereotype: 'entity', color: '#ef4444' }],
      relationships: [],
    }
    const laid = focusSubgraphFor(content, 'foco')!
    expect(laid.classes[0]).toMatchObject({ stereotype: 'entity', color: '#ef4444' })
    expect(laid.classes[0].attributes).toHaveLength(1)
  })

  it('devolve o subgrafo intacto quando o id focado sumiu do conjunto', () => {
    const sub = { focusClassId: 'fantasma', classes: [cls('a')], relationships: [] }
    expect(layoutFocusSubgraph(sub)).toBe(sub)
  })
})

// TASK-056 — o recorte virando conteúdo de um diagrama novo.
describe('focusSubgraphToContent', () => {
  it('leva a classe focada, as relacionadas e as relações entre elas (CA-02)', () => {
    const derived = focusSubgraphToContent(focusSubgraphFor(graph(), 'foco')!)
    expect(derived.classes.map((c) => c.id).sort()).toEqual(['a', 'b', 'c', 'foco'])
    expect(derived.relationships.map((r) => r.id).sort()).toEqual(['r1', 'r2', 'r3', 'r4'])
  })

  it('nasce sem notas, mesmo se o diagrama de origem tiver (ADR-013)', () => {
    const content: ClassDiagramContent = { ...graph(), notes: [{ id: 'n1', text: 'oi', x: 0, y: 0 }] }
    const derived = focusSubgraphToContent(focusSubgraphFor(content, 'foco')!)
    expect(derived.notes).toBeUndefined()
  })

  it('reaproveita os ids, mantendo from/to válidos sem remapeamento (RN-05)', () => {
    const derived = focusSubgraphToContent(focusSubgraphFor(graph(), 'foco')!)
    const ids = new Set(derived.classes.map((c) => c.id))
    for (const rel of derived.relationships) {
      expect(ids.has(rel.from)).toBe(true)
      expect(ids.has(rel.to)).toBe(true)
    }
    expect(ids.has('foco')).toBe(true)
  })

  it('CA-04: preserva atributos, estereótipo e cor', () => {
    const content: ClassDiagramContent = {
      classes: [{ ...cls('foco'), stereotype: 'entity', color: '#3b82f6' }],
      relationships: [],
    }
    const derived = focusSubgraphToContent(focusSubgraphFor(content, 'foco')!)
    expect(derived.classes[0]).toMatchObject({ stereotype: 'entity', color: '#3b82f6' })
    expect(derived.classes[0].attributes).toHaveLength(1)
  })

  it('CA-03: leva posições novas e controlX recalculado, não os do diagrama de origem (RN-06)', () => {
    const derived = focusSubgraphToContent(focusSubgraphFor(graph(), 'foco')!)
    for (const rel of derived.relationships) expect(rel.controlX).not.toBe(999)
    const xs = new Set(derived.classes.map((c) => c.x))
    expect(xs.size).toBeGreaterThan(1) // não ficaram todas empilhadas em x=0
  })

  it('CA-05: é uma cópia — mexer no derivado não altera o conteúdo de origem', () => {
    const content = graph()
    const snapshot = JSON.stringify(content)
    const derived = focusSubgraphToContent(focusSubgraphFor(content, 'foco')!)
    derived.classes[0].name = 'Renomeada'
    derived.classes[0].x = 12345
    expect(JSON.stringify(content)).toBe(snapshot)
  })

  it('CA-10 (RN-10): classe sem relação nenhuma gera um diagrama de uma classe só, sem erro', () => {
    const content: ClassDiagramContent = { classes: [cls('sozinha')], relationships: [] }
    const derived = focusSubgraphToContent(focusSubgraphFor(content, 'sozinha')!)
    expect(derived.classes).toHaveLength(1)
    expect(derived.relationships).toHaveLength(0)
  })
})

describe('suggestedFocusDiagramName', () => {
  it('sugere um nome a partir da classe focada', () => {
    expect(suggestedFocusDiagramName('Sample')).toBe('Foco — Sample')
  })
})

// Achado na validação ao vivo da TASK-056: o mesmo recorte é desenhado com
// cards compactos (modal) e com cards inteiros (diagrama criado). Um
// layout só, com a altura errada, faz o diagrama nascer com os cards
// sobrepostos.
describe('layoutFocusSubgraph — modo full (diagrama criado)', () => {
  function comAtributos(id: string, n: number): DiagramClass {
    return {
      id,
      name: id,
      x: 0,
      y: 0,
      attributes: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i}`, name: `c${i}`, type: 'string' })),
    }
  }

  const content: ClassDiagramContent = {
    classes: [comAtributos('foco', 3), comAtributos('gorda', 40), comAtributos('magra', 2)],
    relationships: [
      { id: 'r1', from: 'foco', to: 'gorda', type: 'association', controlX: 0 },
      { id: 'r2', from: 'foco', to: 'magra', type: 'association', controlX: 0 },
    ],
  }

  it('CA-03: no modo full, dois cards da mesma coluna nunca se sobrepõem', () => {
    const laid = focusSubgraphFor(content, 'foco', 'full')!
    const gorda = laid.classes.find((c) => c.id === 'gorda')!
    const magra = laid.classes.find((c) => c.id === 'magra')!
    expect(gorda.x).toBe(magra.x) // mesma coluna
    const [top, bottom] = gorda.y <= magra.y ? [gorda, magra] : [magra, gorda]
    expect(bottom.y).toBeGreaterThanOrEqual(top.y + estimateClassCardHeight(top))
  })

  it('no modo compact os mesmos cards ficam bem mais perto (é o ponto do modal)', () => {
    const full = focusSubgraphFor(content, 'foco', 'full')!
    const compact = focusSubgraphFor(content, 'foco', 'compact')!
    const distancia = (s: typeof full) => {
      const ys = s.classes.filter((c) => c.id !== 'foco').map((c) => c.y)
      return Math.abs(ys[0] - ys[1])
    }
    expect(distancia(compact)).toBeLessThan(distancia(full))
  })

  it('compact continua sendo o padrão (o modal é o consumidor mais antigo)', () => {
    const semModo = focusSubgraphFor(content, 'foco')!
    const compact = focusSubgraphFor(content, 'foco', 'compact')!
    expect(semModo.classes.map((c) => c.y)).toEqual(compact.classes.map((c) => c.y))
  })
})
