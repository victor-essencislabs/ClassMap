// TASK-005 — conversão entre o modelo interno do Diagrama de Classes
// (`class-diagram/types.ts`, referências por id, com posição/layout) e o
// schema JSON público de import/export (`schema.ts`, referências por
// nome, sem layout). Objetos (`objects`) ficam fora do escopo desta
// primeira implementação — os critérios de aceitação da TASK-005 cobrem
// só o Diagrama de Classes (CA-01/02/03); import/export do Diagrama de
// Objetos fica para uma iteração futura, quando fizer sentido resolver
// o cruzamento "objeto referencia classe de outro arquivo/diagrama".
import {
  CLASS_CARD_WIDTH,
  estimateClassCardHeight,
  type ClassDiagramContent,
  type DiagramClass,
  type DiagramRelationship,
  type RelationshipType,
} from '../class-diagram/types'
import { newId } from '../class-diagram/contentOperations'
import { parseDiagramExport, validateReferentialIntegrity, type DiagramExportFile } from './schema'

export function exportClassDiagram(content: ClassDiagramContent): DiagramExportFile {
  const nameOf = new Map(content.classes.map((c) => [c.id, c.name]))

  return {
    classes: content.classes.map((c) => ({
      name: c.name,
      stereotype: c.stereotype,
      attributes: c.attributes.map((a) => ({ name: a.name, type: a.type })),
    })),
    relationships: content.relationships.map((r) => ({
      from: nameOf.get(r.from) ?? r.from,
      to: nameOf.get(r.to) ?? r.to,
      type: r.type,
      fromMultiplicity: r.fromMultiplicity,
      toMultiplicity: r.toMultiplicity,
    })),
    objects: [],
  }
}

const IMPORT_GRID_COLUMNS = 4
const IMPORT_GRID_GAP_X = 60
const IMPORT_GRID_GAP_Y = 40
const IMPORT_GRID_MARGIN = 40

export interface ImportResult {
  ok: boolean
  content?: ClassDiagramContent
  errors: string[]
}

/** Importa um arquivo de diagrama (JSON) para o modelo interno. Nunca
 * lança — retorna `ok`/`errors`, e não altera o diagrama atual quando
 * `ok` é `false` (CA-03 da TASK-005: rejeitar sem corromper). */
export function importClassDiagram(json: unknown): ImportResult {
  const parsed = parseDiagramExport(json)
  if (!parsed.ok || !parsed.data) {
    return { ok: false, errors: parsed.errors }
  }

  const referentialErrors = validateReferentialIntegrity(parsed.data)
  if (referentialErrors.length > 0) {
    return { ok: false, errors: referentialErrors }
  }

  // Empacotamento tipo masonry (colunas de altura independente), não uma
  // grade de linhas de altura fixa: um JSON importado costuma ter classes
  // com contagens de atributos bem diferentes (ex.: uma entidade de
  // detalhe com 30+ campos ao lado de uma tabela de lookup com 2), e uma
  // grade de altura fixa faz o card mais alto invadir a linha seguinte —
  // cards "colados"/sobrepostos, o bug relatado. Cada classe entra na
  // coluna mais curta no momento (mesma estimativa de altura usada para
  // ancorar conectores, `estimateClassCardHeight`), então nenhum card
  // sobrepõe outro. O layout continua 100% livre depois — o usuário
  // arrasta os cards à vontade; isto só evita a sobreposição inicial.
  const idByName = new Map<string, string>()
  const columnHeights = new Array(IMPORT_GRID_COLUMNS).fill(IMPORT_GRID_MARGIN)
  const classes: DiagramClass[] = parsed.data.classes.map((c) => {
    const id = newId()
    idByName.set(c.name, id)

    let col = 0
    for (let i = 1; i < IMPORT_GRID_COLUMNS; i++) {
      if (columnHeights[i] < columnHeights[col]) col = i
    }

    const cls: DiagramClass = {
      id,
      name: c.name,
      stereotype: c.stereotype,
      attributes: c.attributes.map((a) => ({ id: newId(), name: a.name, type: a.type })),
      x: IMPORT_GRID_MARGIN + col * (CLASS_CARD_WIDTH + IMPORT_GRID_GAP_X),
      y: columnHeights[col],
    }
    columnHeights[col] += estimateClassCardHeight(cls) + IMPORT_GRID_GAP_Y
    return cls
  })
  const classById = new Map(classes.map((c) => [c.id, c]))

  const relationships: DiagramRelationship[] = parsed.data.relationships.map((r) => {
    const fromId = idByName.get(r.from)!
    const toId = idByName.get(r.to)!
    const fromClass = classById.get(fromId)!
    const toClass = classById.get(toId)!
    return {
      id: newId(),
      from: fromId,
      to: toId,
      type: r.type as RelationshipType,
      fromMultiplicity: r.fromMultiplicity,
      toMultiplicity: r.toMultiplicity,
      controlX: (fromClass.x + toClass.x) / 2 + 100,
    }
  })

  return { ok: true, content: { classes, relationships }, errors: [] }
}
