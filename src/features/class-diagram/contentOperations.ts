// TASK-003 — lógica pura de edição do conteúdo do Diagrama de Classes,
// separada de `ClassDiagramCanvas.tsx` para poder ser testada sem
// renderizar componentes (ver "Estratégia de testes" da task: "lógica de
// serialização/desserialização do conteúdo do diagrama").
import type { ClassDiagramContent, DiagramClass, DiagramRelationship, RelationshipType } from './types'

export function newId(): string {
  return crypto.randomUUID()
}

export function addClass(content: ClassDiagramContent): ClassDiagramContent {
  const cls: DiagramClass = {
    id: newId(),
    name: 'NovaClasse',
    attributes: [
      { id: newId(), name: 'id', type: 'long' },
      { id: newId(), name: 'nome', type: 'string' },
    ],
    x: 40 + ((content.classes.length * 40) % 320),
    y: 40 + ((content.classes.length * 60) % 240),
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
