// TASK-058 — adaptador que torna `ImportExportControls` reutilizável pelos
// dois tipos de diagrama que têm contrato JSON (Diagrama de Classes e Visão
// do Sistema), em vez de duplicar os dois modais.
//
// Só o que **de fato** difere entre os dois entra aqui; a estrutura dos
// modais, o download, a cópia, o seletor de arquivo e o tratamento de erro
// continuam num lugar só.
import type { DiagramFileType } from './fileType'

export interface DiagramImportResult<T> {
  ok: boolean
  content?: T
  errors: string[]
}

export interface DiagramFileIO<T> {
  fileType: DiagramFileType
  /** Modelo interno → objeto que vai ser serializado no arquivo. */
  export: (content: T) => unknown
  /** Arquivo → modelo interno. Recebe o conteúdo atual porque a Visão do
   * Sistema **mescla** por módulo em vez de substituir tudo (ADR-014,
   * decisão 7); o Diagrama de Classes ignora esse argumento. */
  import: (json: unknown, current: T) => DiagramImportResult<T>
  importPlaceholder: string
  /** O que o import faz com o conteúdo atual — dito na cara do usuário,
   * porque as duas telas fazem coisas diferentes. */
  importHint: string
  confirmImportLabel: string
  /** Markdown do "prompt para o agente", quando já existir para este tipo. */
  agentPrompt?: () => string
  agentPromptFileName?: string
}
