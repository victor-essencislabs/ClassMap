// TASK-058 (ADR-014, decisão 6) — discriminador de tipo do arquivo de
// import/export. Até aqui existia um contrato só (Diagrama de Classes) e o
// import aceitava qualquer JSON que tivesse `classes`; com dois contratos
// isso importaria silenciosamente o arquivo errado — um arquivo de Visão do
// Sistema colado na tela de classes passaria pelo schema (todos os campos
// de `DiagramExportSchema` têm default `[]`) e produziria um diagrama vazio.
//
// A leitura é tolerante de propósito (RN-04): arquivo **sem** `type` é
// tratado como Diagrama de Classes, porque os JSONs já gerados pelo
// `classmap-keeper` do E-LIMS não têm esse campo e não podem parar de
// importar.
export const CLASS_DIAGRAM_FILE_TYPE = 'class-diagram'
export const SYSTEM_VIEW_FILE_TYPE = 'system-view'

export type DiagramFileType = typeof CLASS_DIAGRAM_FILE_TYPE | typeof SYSTEM_VIEW_FILE_TYPE

/** Lê o `type` declarado num JSON arbitrário. `undefined` quando o campo não
 * existe, não é string, ou o valor nem é objeto. */
export function declaredFileType(json: unknown): string | undefined {
  if (typeof json !== 'object' || json === null) return undefined
  const value = (json as { type?: unknown }).type
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

const TYPE_LABELS: Record<string, string> = {
  [CLASS_DIAGRAM_FILE_TYPE]: 'Diagrama de Classes',
  [SYSTEM_VIEW_FILE_TYPE]: 'Visão do Sistema',
}

export function fileTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

/** Mensagem de recusa por tipo errado — mesma redação nas duas telas, para
 * o usuário reconhecer o erro independente de onde errou (CA-03/CA-04). */
export function wrongFileTypeError(declared: string | undefined, expected: DiagramFileType): string {
  const expectedLabel = fileTypeLabel(expected)
  if (!declared) {
    return `Este arquivo não declara "type": "${expected}". Ele não parece ser um arquivo de ${expectedLabel} — confira se você não exportou de outra tela.`
  }
  return `Este arquivo é de ${fileTypeLabel(declared)} ("type": "${declared}"), não de ${expectedLabel}. Importe-o pela tela correspondente.`
}
