// TASK-004 — lógica pura de edição do Diagrama de Objetos, testável sem
// renderizar componentes (mesmo padrão de `class-diagram/contentOperations.ts`).
import { NOTE_CARD_WIDTH, estimateNoteCardHeight, type DiagramClass, type DiagramNote } from '../class-diagram/types'
import type { BoundedNode } from '../diagram-shell/canvasTransform'
import { estimateObjectCardHeight, OBJECT_CARD_WIDTH } from './types'
import type { DiagramObject, ObjectAttributeValue, ObjectDiagramContent, ObjectLink } from './types'

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

  return { ...content, objects: [...content.objects, obj] }
}

export function updateObject(
  content: ObjectDiagramContent,
  id: string,
  patch: Partial<Pick<DiagramObject, 'instanceName' | 'x' | 'y'>>,
): ObjectDiagramContent {
  return { ...content, objects: content.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }
}

export function updateObjectValue(
  content: ObjectDiagramContent,
  objectId: string,
  attributeId: string,
  value: string,
): ObjectDiagramContent {
  return {
    ...content,
    objects: content.objects.map((o) =>
      o.id !== objectId
        ? o
        : { ...o, values: o.values.map((v) => (v.attributeId === attributeId ? { ...v, value } : v)) },
    ),
  }
}

/** Remove o objeto e, com ele, qualquer link que o referencie (RN-02 da
 * TASK-017) — mesmo precedente de `removeClass` em
 * `class-diagram/contentOperations.ts`: nunca deixa um link "solto"
 * apontando para um objeto inexistente. */
export function removeObject(content: ObjectDiagramContent, id: string): ObjectDiagramContent {
  return {
    ...content, // TASK-053: preserva `notes` (mesmo achado/correção já feita em `removeClass`, class-diagram/contentOperations.ts, TASK-051).
    objects: content.objects.filter((o) => o.id !== id),
    links: content.links.filter((l) => l.from !== id && l.to !== id),
  }
}

/** Cria um link simples entre dois objetos já existentes (TASK-017, ver
 * ADR-006). Retorna o content inalterado se `from`/`to` não existirem ou
 * forem o mesmo objeto (RN-01 — nunca um laço para si mesmo). */
export function addLink(content: ObjectDiagramContent, from: string, to: string): ObjectDiagramContent {
  if (!from || !to || from === to) return content
  const fromObj = content.objects.find((o) => o.id === from)
  const toObj = content.objects.find((o) => o.id === to)
  if (!fromObj || !toObj) return content

  const link: ObjectLink = {
    id: newId(),
    from,
    to,
    controlX: (fromObj.x + toObj.x) / 2 + 100,
  }
  return { ...content, links: [...content.links, link] }
}

export function updateLink(
  content: ObjectDiagramContent,
  id: string,
  patch: Partial<Pick<ObjectLink, 'label' | 'controlX'>>,
): ObjectDiagramContent {
  return { ...content, links: content.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }
}

export function removeLink(content: ObjectDiagramContent, id: string): ObjectDiagramContent {
  return { ...content, links: content.links.filter((l) => l.id !== id) }
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

// TASK-053 (ver ADR-013) — card de comentário: mesmo padrão de
// `addObject`/`updateObject`/`removeObject` acima, sem contraparte em
// `addLink` (uma nota nunca é origem/destino de link).

export function addNote(content: ObjectDiagramContent, origin?: { x: number; y: number }): ObjectDiagramContent {
  const notes = content.notes ?? []
  const note: DiagramNote = {
    id: newId(),
    text: '',
    x: origin ? origin.x : 40 + ((notes.length * 40) % 320),
    y: origin ? origin.y : 40 + ((notes.length * 60) % 240),
  }
  return { ...content, notes: [...notes, note] }
}

export function updateNote(
  content: ObjectDiagramContent,
  id: string,
  patch: Partial<DiagramNote>,
): ObjectDiagramContent {
  return {
    ...content,
    notes: (content.notes ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
  }
}

export function removeNote(content: ObjectDiagramContent, id: string): ObjectDiagramContent {
  return { ...content, notes: (content.notes ?? []).filter((n) => n.id !== id) }
}

/** Converte uma `DiagramNote` num `BoundedNode` genérico — mesmo papel de
 * `toBoundedNode` acima, para o card de comentário entrar no cálculo de
 * bounds do "ajustar à tela". */
export function noteToBoundedNode(note: DiagramNote): BoundedNode {
  return { x: note.x, y: note.y, w: note.width ?? NOTE_CARD_WIDTH, h: note.height ?? estimateNoteCardHeight(note) }
}
