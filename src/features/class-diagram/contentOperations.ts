// TASK-003 — lógica pura de edição do conteúdo do Diagrama de Classes,
// separada de `ClassDiagramCanvas.tsx` para poder ser testada sem
// renderizar componentes (ver "Estratégia de testes" da task: "lógica de
// serialização/desserialização do conteúdo do diagrama").
import type { BoundedNode } from '../diagram-shell/canvasTransform'
import { CLASS_CARD_WIDTH, estimateClassCardHeight, NOTE_CARD_WIDTH, estimateNoteCardHeight } from './types'
import type { ClassDiagramContent, DiagramClass, DiagramNote, DiagramRelationship, RelationshipType } from './types'

export function newId(): string {
  return crypto.randomUUID()
}

/** `origin` (TASK-007) centraliza a nova classe no trecho do canvas que
 * está visível no momento (zoom/pan atuais) — sem ele, cai no
 * espalhamento em cascata original (usado pelos testes existentes e
 * por quem chama sem um canvas por perto). */
export function addClass(content: ClassDiagramContent, origin?: { x: number; y: number }): ClassDiagramContent {
  const cls: DiagramClass = {
    id: newId(),
    name: 'NovaClasse',
    attributes: [
      { id: newId(), name: 'id', type: 'long' },
      { id: newId(), name: 'nome', type: 'string' },
    ],
    x: origin ? origin.x : 40 + ((content.classes.length * 40) % 320),
    y: origin ? origin.y : 40 + ((content.classes.length * 60) % 240),
  }
  return { ...content, classes: [...content.classes, cls] }
}

export function updateClass(
  content: ClassDiagramContent,
  id: string,
  patch: Partial<DiagramClass>,
): ClassDiagramContent {
  return {
    ...content,
    classes: content.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }
}

/** Remove a classe e, com ela, qualquer relação que a referencie — nunca
 * deixa uma relação "solta" apontando para uma classe inexistente. */
export function removeClass(content: ClassDiagramContent, id: string): ClassDiagramContent {
  return {
    ...content, // TASK-051: preserva `notes` — antes retornava um objeto literal sem spread, o que descartaria qualquer campo além de classes/relationships (inofensivo até aqui, mas apagaria notas silenciosamente).
    classes: content.classes.filter((c) => c.id !== id),
    relationships: content.relationships.filter((r) => r.from !== id && r.to !== id),
  }
}

/** Cria uma relação entre duas classes já existentes. Retorna o content
 * inalterado se `from`/`to` não existirem ou forem a mesma classe
 * (nenhum laço para si mesma). */
export function addRelationship(
  content: ClassDiagramContent,
  from: string,
  to: string,
  type: RelationshipType,
): ClassDiagramContent {
  if (!from || !to || from === to) return content
  const fromCls = content.classes.find((c) => c.id === from)
  const toCls = content.classes.find((c) => c.id === to)
  if (!fromCls || !toCls) return content

  const relationship: DiagramRelationship = {
    id: newId(),
    from,
    to,
    type,
    controlX: (fromCls.x + toCls.x) / 2 + 100,
  }
  return { ...content, relationships: [...content.relationships, relationship] }
}

export function updateRelationship(
  content: ClassDiagramContent,
  id: string,
  patch: Partial<DiagramRelationship>,
): ClassDiagramContent {
  return {
    ...content,
    relationships: content.relationships.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }
}

export function removeRelationship(content: ClassDiagramContent, id: string): ClassDiagramContent {
  return { ...content, relationships: content.relationships.filter((r) => r.id !== id) }
}

/** Filtro da busca da sidebar (TASK-007, CA-03) — substring do nome,
 * sem diferenciar maiúsculas/minúsculas. Query vazia devolve tudo. */
export function filterClassesByQuery(classes: DiagramClass[], query: string): DiagramClass[] {
  const q = query.trim().toLowerCase()
  if (!q) return classes
  return classes.filter((c) => c.name.toLowerCase().includes(q))
}

/** Converte uma `DiagramClass` num `BoundedNode` genérico (para o
 * zoom/pan compartilhado em `diagram-shell/canvasTransform.ts`, que não
 * conhece o tipo de conteúdo específico do Diagrama de Classes). */
export function toBoundedNode(cls: DiagramClass): BoundedNode {
  return { x: cls.x, y: cls.y, w: CLASS_CARD_WIDTH, h: estimateClassCardHeight(cls) }
}

// TASK-051 (ver ADR-013) — card de comentário: anotação livre, sem
// relação com nenhuma classe. Mesmo padrão de `addClass`/`updateClass`/
// `removeClass` acima; sem contraparte em `addRelationship` (uma nota
// nunca é origem/destino de conector).

export function addNote(content: ClassDiagramContent, origin?: { x: number; y: number }): ClassDiagramContent {
  const notes = content.notes ?? []
  const note: DiagramNote = {
    id: newId(),
    text: '',
    x: origin ? origin.x : 40 + ((notes.length * 40) % 320),
    y: origin ? origin.y : 40 + ((notes.length * 60) % 240),
  }
  return { ...content, notes: [...notes, note] }
}

export function updateNote(content: ClassDiagramContent, id: string, patch: Partial<DiagramNote>): ClassDiagramContent {
  return {
    ...content,
    notes: (content.notes ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
  }
}

export function removeNote(content: ClassDiagramContent, id: string): ClassDiagramContent {
  return { ...content, notes: (content.notes ?? []).filter((n) => n.id !== id) }
}

/** Converte uma `DiagramNote` num `BoundedNode` genérico — mesmo papel de
 * `toBoundedNode` acima, para o card de comentário entrar no cálculo de
 * bounds do "ajustar à tela". */
export function noteToBoundedNode(note: DiagramNote): BoundedNode {
  return { x: note.x, y: note.y, w: NOTE_CARD_WIDTH, h: estimateNoteCardHeight(note) }
}
