// TASK-004 — lógica pura de edição do Diagrama de Objetos, testável sem
// renderizar componentes (mesmo padrão de `class-diagram/contentOperations.ts`).
import type { DiagramClass } from '../class-diagram/types'
import type { DiagramObject, ObjectAttributeValue, ObjectDiagramContent } from './types'

export function newId(): string {
  return crypto.randomUUID()
}

/** Cria um objeto a partir de uma classe existente (RN-01): a lista de
 * atributos é copiada da classe, cada um começando com valor vazio. */
export function addObject(
  content: ObjectDiagramContent,
  sourceClass: DiagramClass,
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
    x: 40 + ((content.objects.length * 40) % 320),
    y: 40 + ((content.objects.length * 60) % 240),
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
