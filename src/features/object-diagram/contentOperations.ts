// TASK-004 — lógica pura de edição do Diagrama de Objetos, testável sem
// renderizar componentes (mesmo padrão de `class-diagram/contentOperations.ts`).
import type { DiagramClass } from '../class-diagram/types'
import type { BoundedNode } from '../diagram-shell/canvasTransform'
import { estimateObjectCardHeight, OBJECT_CARD_WIDTH } from './types'
import type { DiagramObject, ObjectAttributeValue, ObjectDiagramContent } from './types'

export function newId(): string {
  return crypto.randomUUID()
}

/** Cria um objeto a partir de uma classe existente (RN-01): a lista de
 * atributos é copiada da classe, cada um começando com valor vazio.
 * `origin` (TASK-008, mesmo padrão de `class-diagram/contentOperations.ts`
 * `addClass`) centraliza o novo objeto no trecho visível do canvas — sem
 * ele, cai no espalhamento em cascata original. */
export function addObject(
  content: ObjectDiagramContent,
  sourceClass: DiagramClass,
  origin?: { x: number; y: number },
): ObjectDiagramContent {
  const values: ObjectAttributeValue[] = sourceClass.attributes.map((attr) => ({
    attributeId: attr.id,
    name: attr.name,
    type: attr.type,
    value: '',
  }))

  const obj: DiagramObject = {
    id: newId(),
    classId: sourceClass.id,
    className: sourceClass.name,
    values,
    x: origin ? origin.x : 40 + ((content.objects.length * 40) % 320),
    y: origin ? origin.y : 40 + ((content.objects.length * 60) % 240),
  }

  return { objects: [...content.objects, obj] }
}

export function updateObject(
  content: ObjectDiagramContent,
  id: string,
  patch: Partial<Pick<DiagramObject, 'instanceName' | 'x' | 'y'>>,
): ObjectDiagramContent {
  return { objects: content.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }
}

export function updateObjectValue(
  content: ObjectDiagramContent,
  objectId: string,
  attributeId: string,
  value: string,
): ObjectDiagramContent {
  return {
    objects: content.objects.map((o) =>
      o.id !== objectId
        ? o
        : { ...o, values: o.values.map((v) => (v.attributeId === attributeId ? { ...v, value } : v)) },
    ),
  }
}

export function removeObject(content: ObjectDiagramContent, id: string): ObjectDiagramContent {
  return { objects: content.objects.filter((o) => o.id !== id) }
}

/** Filtro da busca da sidebar (TASK-008, CA-02) — substring do nome da
 * instância OU do nome da classe, sem diferenciar maiúsculas/minúsculas. */
export function filterObjectsByQuery(objects: DiagramObject[], query: string): DiagramObject[] {
  const q = query.trim().toLowerCase()
  if (!q) return objects
  return objects.filter(
    (o) => (o.instanceName ?? '').toLowerCase().includes(q) || o.className.toLowerCase().includes(q),
  )
}

/** Converte um `DiagramObject` num `BoundedNode` genérico (para o
 * zoom/pan compartilhado em `diagram-shell/canvasTransform.ts`). */
export function toBoundedNode(obj: DiagramObject): BoundedNode {
  return { x: obj.x, y: obj.y, w: OBJECT_CARD_WIDTH, h: estimateObjectCardHeight(obj) }
}
