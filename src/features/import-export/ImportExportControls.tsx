import { useRef, useState, type ChangeEvent } from 'react'
import { CheckGlyph } from '../diagram-shell/Icons'
import { Modal } from '../diagram-shell/Modal'
import type { DiagramFileIO } from './diagramFileIO'

interface ImportExportControlsProps<T> {
  content: T
  /** Nome de arquivo sugerido para o download (sem extensão). */
  fileName: string
  /** Importar escreve no diagrama — só faz sentido para quem tem papel editor. */
  canImport: boolean
  onImport: (content: T) => void
  /** TASK-058 — o que muda entre Diagrama de Classes e Visão do Sistema
   * (schema, conversão e os textos que dependem do tipo). O resto dos dois
   * modais é o mesmo, e continua num lugar só. */
  io: DiagramFileIO<T>
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
export function ImportExportControls<T>({ content, fileName, canImport, onImport, io }: ImportExportControlsProps<T>) {
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

  const exportJson = openModal === 'export' ? JSON.stringify(io.export(content), null, 2) : ''

  function handleDownload() {
    const blob = new Blob([exportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName || 'diagrama'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Pedido do usuário: quem não sabe qual é o formato de JSON esperado
  // deveria conseguir baixar um guia pronto para colar num agente de IA
  // (Claude Code/Codex) rodando no repositório do sistema a documentar,
  // pedindo pra ele gerar o diagrama a partir do código-fonte real —
  // independente do diagrama atual (o conteúdo não usa `content`/`exportJson`).
  function handleDownloadAgentPrompt() {
    if (!io.agentPrompt) return
    const blob = new Blob([io.agentPrompt()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = io.agentPromptFileName ?? 'classmap-prompt-ia.md'
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

    const result = io.import(parsed, content)
    if (!result.ok || !result.content) {
      setErrors(result.errors)
      return
    }
    onImport(result.content)
    closeModal()
  }

  return (
    <div className="import-export-controls">
      <button type="button" className="btn ghost" onClick={openExportModal}>
        Exportar JSON
      </button>
      {canImport && (
        <button type="button" className="btn ghost" onClick={openImportModal}>
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
            {/* TASK-036 (ADR-011) — "selo de validação no estado de
                sucesso": o botão ganha o check quando a cópia confirma.
                TASK-038 — o check em si ganha o efeito de carimbo
                ("seal-confirm") ao aparecer; span novo a cada cópia
                confirmada (React remonta), então o efeito sempre
                dispara na transição real, nunca em re-render à toa. */}
            <button
              type="button"
              className={copyLabel === 'Copiado!' ? 'btn primary stamped' : 'btn primary'}
              onClick={handleCopy}
            >
              {copyLabel === 'Copiado!' && (
                <span className="seal-confirm">
                  <CheckGlyph />
                </span>
              )}{' '}
              {copyLabel}
            </button>
            <button type="button" className="btn" onClick={handleDownload}>
              Baixar arquivo .json
            </button>
          </div>

          {io.agentPrompt && (
            <div className="import-export-guide">
              <p className="field-hint">
                Não sabe qual é o formato esperado? Baixe um prompt pronto para colar num agente de IA (Claude
                Code/Codex) rodando no repositório do sistema que você quer documentar — ele lê o código-fonte
                real e gera o JSON no modelo certo.
              </p>
              <button type="button" className="btn ghost small" onClick={handleDownloadAgentPrompt}>
                Baixar prompt para IA (.md)
              </button>
            </div>
          )}
        </Modal>
      )}

      {openModal === 'import' && canImport && (
        <Modal title="Importar diagrama (JSON)" onClose={closeModal}>
          <p>
            Cole aqui o JSON no mesmo formato do "Exportar JSON" — é o formato pensado para ser gerado
            automaticamente por um agente (Claude Code / Codex) a partir do código-fonte de um projeto, por
            exemplo depois de um merge na main. {io.importHint}
          </p>
          <textarea
            aria-label="JSON para importar"
            placeholder={io.importPlaceholder}
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
              {io.confirmImportLabel}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
