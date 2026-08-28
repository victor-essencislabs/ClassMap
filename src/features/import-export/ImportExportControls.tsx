import { useRef, useState, type ChangeEvent } from 'react'
import type { ClassDiagramContent } from '../class-diagram/types'
import { exportClassDiagram, importClassDiagram } from './classDiagramConversion'

interface ImportExportControlsProps {
  content: ClassDiagramContent
  /** Nome de arquivo sugerido para o download (sem extensão). */
  fileName: string
  /** Importar sobrescreve o diagrama atual — só faz sentido para quem tem papel editor. */
  canImport: boolean
  onImport: (content: ClassDiagramContent) => void
}

/** Botões "Exportar JSON"/"Importar JSON" do Diagrama de Classes
 * (TASK-005). Exportar está sempre disponível a quem vê o diagrama —
 * não é uma escrita. Importar sobrescreve o conteúdo atual, então só
 * aparece para `editor` (mesmo reforço de UI das demais telas; a
 * garantia real de escrita continua sendo RLS). */
export function ImportExportControls({ content, fileName, canImport, onImport }: ImportExportControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string[] | null>(null)

  function handleExport() {
    const json = JSON.stringify(exportClassDiagram(content), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName || 'diagrama'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reimportar o mesmo arquivo em seguida
    if (!file) return

    setError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setError(['O arquivo não é um JSON válido.'])
      return
    }

    const result = importClassDiagram(parsed)
    if (!result.ok || !result.content) {
      setError(result.errors)
      return
    }
    onImport(result.content)
  }

  return (
    <div className="import-export-controls">
      <button type="button" onClick={handleExport}>
        Exportar JSON
      </button>
      {canImport && (
        <>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Importar JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleFileSelected}
          />
        </>
      )}
      {error && (
        <ul className="error import-errors">
          {error.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
