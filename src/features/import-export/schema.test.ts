// TASK-017 (ver ADR-006, RN-04) — confirma explicitamente que `links`
// (novo em `ObjectDiagramContent`, TASK-017) nunca é incluído no schema
// Zod de import/export: nem como campo aceito em `objects`, nem
// sobrevivendo à validação se alguém tentar colar um JSON com `links`
// dentro de um objeto exportado. Guarda contra uma regressão silenciosa
// da decisão da ADR-006 (Alternativa C, rejeitada por ora).
import { describe, expect, it } from 'vitest'
import { DiagramExportSchema, parseDiagramExport } from './schema'

describe('DiagramExportSchema — RN-04/CA-07 da TASK-017 (ver ADR-006)', () => {
  it('o schema de objeto exportado não declara nenhum campo "links"', () => {
    const objectShape = DiagramExportSchema.shape.objects.unwrap().element.shape
    expect(Object.keys(objectShape)).not.toContain('links')
  })

  it('um JSON importado com "links" dentro de um objeto tem esse campo descartado na validação (zod strip)', () => {
    const result = parseDiagramExport({
      classes: [{ name: 'Pedido', attributes: [{ name: 'id', type: 'long' }] }],
      relationships: [],
      objects: [
        {
          name: 'pedido1',
          class: 'Pedido',
          values: {},
          links: [{ id: 'l1', from: 'pedido1', to: 'pedido2' }],
        },
      ],
    })

    expect(result.ok).toBe(true)
    expect(result.data?.objects[0]).not.toHaveProperty('links')
  })
})
