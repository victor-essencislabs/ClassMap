import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { addClass } from '../class-diagram/contentOperations'
import { emptyClassDiagramContent, type ClassDiagramContent } from '../class-diagram/types'
import { ImportExportControls } from './ImportExportControls'

function ControlledControls() {
  const [content, setContent] = useState<ClassDiagramContent>(emptyClassDiagramContent())
  return (
    <>
      <ImportExportControls content={content} fileName="teste" canImport onImport={setContent} />
      <pre data-testid="content">{JSON.stringify(content)}</pre>
    </>
  )
}

function jsonFile(data: unknown): File {
  return new File([JSON.stringify(data)], 'diagrama.json', { type: 'application/json' })
}

describe('ImportExportControls — importar', () => {
  it('CA-02: importa um JSON válido e substitui o conteúdo atual', async () => {
    render(<ControlledControls />)

    const file = jsonFile({
      classes: [{ name: 'Pedido', attributes: [{ name: 'id', type: 'long' }] }],
      relationships: [],
    })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })

    await waitFor(() => expect(screen.getByTestId('content').textContent).toContain('Pedido'))
  })

  it('CA-03: mostra os erros e não altera o conteúdo quando o JSON é inválido', async () => {
    render(<ControlledControls />)
    const before = screen.getByTestId('content').textContent

    const file = jsonFile({ classes: [{ name: '', attributes: [] }] })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })

    await waitFor(() => expect(document.querySelector('.import-errors')).toBeInTheDocument())
    expect(screen.getByTestId('content').textContent).toBe(before)
  })

  it('CA-03: mostra erro claro para um arquivo que não é JSON', async () => {
    render(<ControlledControls />)
    const file = new File(['isto não é json {{{'], 'diagrama.json', { type: 'application/json' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })

    await waitFor(() =>
      expect(screen.getByText('O arquivo não é um JSON válido.')).toBeInTheDocument(),
    )
  })
})

describe('ImportExportControls — permissão', () => {
  it('não mostra "Importar JSON" quando canImport é false', () => {
    render(
      <ImportExportControls
        content={addClass(emptyClassDiagramContent())}
        fileName="teste"
        canImport={false}
        onImport={() => {}}
      />,
    )
    expect(screen.queryByText('Importar JSON')).not.toBeInTheDocument()
    expect(screen.getByText('Exportar JSON')).toBeInTheDocument()
  })
})
