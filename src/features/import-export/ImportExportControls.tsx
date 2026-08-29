import { useRef, useState, type ChangeEvent } from 'react'
import type { ClassDiagramContent } from '../class-diagram/types'
import { Modal } from '../diagram-shell/Modal'
import { exportClassDiagram, importClassDiagram } from './classDiagramConversion'

const IMPORT_PLACEHOLDER =
  '{"classes":[{"name":"User","attributes":[{"name":"id","type":"long"}]}],"relationships":[{"from":"User","to":"Log","type":"association"}]}'

interface ImportExportControlsProps {
  content: ClassDiagramContent
  /** Nome de arquivo sugerido para o download (sem extensão). */
  fileName: string
  /** Importar sobrescreve o diagrama atual — só faz sentido para quem tem papel editor. */
  canImport: boolean
  onImport: (content: ClassDiagramContent) => void
}

/** Botões "Exportar JSON"/"Importar JSON" do Diagrama de Classes
 * (TASK-005), reestilizados como modais na TASK-010 (paridade com
 * `#export-modal`/`#import-modal` do artefato) — o JSON fica visível
 * numa textarea (exportar) ou colável (importar), em vez do fluxo
 * anterior de download direto + seletor de arquivo do SO. A lógica de
 * conversão/validação (`classDiagramConversion.ts`) não muda, só como o
 * JSON chega até o usuário. Exportar está sempre disponível a quem vê o
 * diagrama — não é uma escrita. Importar sobrescreve o conteúdo atual,
 * então só aparece para `editor` (mesmo reforço de UI das demais telas;
 * a garantia real de escrita continua sendo RLS). */
export function ImportExportControls({ content, fileName, canImport, onImport }: ImportExportControlsProps) {
  const [openModal, setOpenModal] = useState<'export' | 'import' | null>(null)
  const [importText, setImportText] = useState('')
  const [errors, setErrors] = useState<string[] | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copiar')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openExportModal() {
    setCopyLabel('Copiar')
    setOpenModal('export')
  }

  function openImportModal() {
    setImportText('')
    setErrors(null)
    setOpenModal('import')
  }

  function closeModal() {
    setOpenModal(null)
  }

  const exportJson = openModal === 'export' ? JSON.stringify(exportClassDiagram(content), null, 2) : ''

  function handleDownload() {
    const blob = new Blob([exportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName || 'diagrama'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportJson)
      setCopyLabel('Copiado!')
    } catch {
      // Clipboard API pode não estar disponível (permissão negada, contexto
      // não seguro) — a textarea continua selecionável/copiável manualmente,
      // então uma falha aqui não é um erro para o usuário reportar.
    }
  }

  // Selecionar um arquivo só preenche a textarea — a confirmação de
  // importar continua sendo um passo explícito (botão "Importar e
  // substituir diagrama"), único caminho de validação, em vez de duas
  // lógicas de import separadas (colar vs. anexar arquivo).
  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite selecionar o mesmo arquivo de novo em seguida
    if (!file) return
    setErrors(null)
    setImportText(await file.text())
  }

  function handleConfirmImport() {
    const raw = importText.trim()
    if (!raw) {
      setErrors(['Cole um JSON antes de importar.'])
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      setErrors([`JSON inválido: ${err instanceof Error ? err.message : 'formato inesperado.'}`])
      return
    }

    const result = importClassDiagram(parsed)
    if (!result.ok || !result.content) {
      setErrors(result.errors)
      return
    }
    onImport(result.content)
    closeModal()
  }

  return (
    <div className="import-export-controls">
      <button type="button" className="btn ghost small" onClick={openExportModal}>
        Exportar JSON
      </button>
      {canImport && (
        <button type="button" className="btn ghost small" onClick={openImportModal}>
          Importar JSON
        </button>
      )}

      {openModal === 'export' && (
        <Modal title="Exportar diagrama (JSON)" onClose={closeModal}>
          <p>
            Copie o conteúdo abaixo — este formato simples é o que uma futura versão do sistema usaria para
            salvar, versionar e importar diagramas entre projetos.
          </p>
          <textarea
            readOnly
            value={exportJson}
            aria-label="JSON exportado"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="modal-actions">
            <button type="button" className="btn primary" onClick={handleCopy}>
              {copyLabel}
            </button>
            <button type="button" className="btn" onClick={handleDownload}>
              Baixar arquivo .json
            </button>
          </div>
        </Modal>
      )}

      {openModal === 'import' && canImport && (
        <Modal title="Importar diagrama (JSON)" onClose={closeModal}>
          <p>
            Cole aqui o JSON no mesmo formato do "Exportar JSON" — é o formato pensado para ser gerado
            automaticamente por um agente (Claude Code / Codex) a partir do código-fonte de um projeto, por
            exemplo depois de um merge na main. Isso substitui o diagrama atual.
          </p>
          <textarea
            aria-label="JSON para importar"
            placeholder={IMPORT_PLACEHOLDER}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button
            type="button"
            className="btn ghost small"
            style={{ marginTop: 8 }}
            onClick={() => fileInputRef.current?.click()}
          >
            ou selecione um arquivo…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleFileSelected}
          />
          {errors && (
            <ul className="error import-errors">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <div className="modal-actions">
            <button type="button" className="btn primary" onClick={handleConfirmImport}>
              Importar e substituir diagrama
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
