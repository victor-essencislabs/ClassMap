// TASK-005 (lógica) / TASK-010 (modais, ADR-002) — os botões abrem
// modais em vez de baixar/abrir o seletor de arquivo direto; a validação
// (`classDiagramConversion.ts`) não muda, só onde o erro aparece.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { addClass } from '../class-diagram/contentOperations'
import { emptyClassDiagramContent, type ClassDiagramContent } from '../class-diagram/types'
import { classDiagramIO } from './classDiagramConversion'
import { ImportExportControls } from './ImportExportControls'

function ControlledControls() {
  const [content, setContent] = useState<ClassDiagramContent>(emptyClassDiagramContent())
  return (
    <>
      <ImportExportControls content={content} fileName="teste" canImport onImport={setContent} io={classDiagramIO} />
      <pre data-testid="content">{JSON.stringify(content)}</pre>
    </>
  )
}

function jsonFile(data: unknown): File {
  return new File([JSON.stringify(data)], 'diagrama.json', { type: 'application/json' })
}

function pasteImportJson(value: string) {
  fireEvent.change(screen.getByLabelText('JSON para importar'), { target: { value } })
}

describe('ImportExportControls — exportar', () => {
  it('CA-01: "Exportar JSON" abre um modal com o JSON preenchido numa textarea', () => {
    render(
      <ImportExportControls
        content={addClass(emptyClassDiagramContent())}
        fileName="teste"
        canImport
        onImport={() => {}}
        io={classDiagramIO}
      />,
    )

    fireEvent.click(screen.getByText('Exportar JSON'))

    expect(screen.getByText('Exportar diagrama (JSON)')).toBeInTheDocument()
    const textarea = screen.getByLabelText('JSON exportado') as HTMLTextAreaElement
    expect(textarea).toHaveAttribute('readonly')
    expect(JSON.parse(textarea.value).classes).toHaveLength(1)
  })

  // Pedido do usuário: quem não sabe o formato esperado deveria conseguir
  // baixar um prompt pronto para colar num agente de IA.
  it('oferece "Baixar prompt para IA (.md)" dentro do modal de exportar', () => {
    render(
      <ImportExportControls
        content={addClass(emptyClassDiagramContent())}
        fileName="teste"
        canImport
        onImport={() => {}}
        io={classDiagramIO}
      />,
    )

    fireEvent.click(screen.getByText('Exportar JSON'))

    expect(screen.getByText('Baixar prompt para IA (.md)')).toBeInTheDocument()
  })
})

describe('ImportExportControls — importar', () => {
  it('CA-02: cola um JSON válido e substitui o conteúdo atual', async () => {
    render(<ControlledControls />)

    fireEvent.click(screen.getByText('Importar JSON'))
    pasteImportJson(
      JSON.stringify({
        classes: [{ name: 'Pedido', attributes: [{ name: 'id', type: 'long' }] }],
        relationships: [],
      }),
    )
    fireEvent.click(screen.getByText('Importar e substituir diagrama'))

    await waitFor(() => expect(screen.getByTestId('content').textContent).toContain('Pedido'))
    // o modal fecha depois de importar
    expect(screen.queryByText('Importar diagrama (JSON)')).not.toBeInTheDocument()
  })

  it('CA-02: selecionar um arquivo só preenche a textarea — precisa confirmar para importar', async () => {
    render(<ControlledControls />)
    const before = screen.getByTestId('content').textContent

    fireEvent.click(screen.getByText('Importar JSON'))
    const file = jsonFile({ classes: [{ name: 'Pedido', attributes: [] }], relationships: [] })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })

    await waitFor(() =>
      expect((screen.getByLabelText('JSON para importar') as HTMLTextAreaElement).value).toContain('Pedido'),
    )
    expect(screen.getByTestId('content').textContent).toBe(before)

    fireEvent.click(screen.getByText('Importar e substituir diagrama'))
    await waitFor(() => expect(screen.getByTestId('content').textContent).toContain('Pedido'))
  })

  it('CA-03: mostra o erro dentro do modal e não altera o conteúdo quando o JSON é inválido', () => {
    render(<ControlledControls />)
    const before = screen.getByTestId('content').textContent

    fireEvent.click(screen.getByText('Importar JSON'))
    pasteImportJson(JSON.stringify({ classes: [{ name: '', attributes: [] }] }))
    fireEvent.click(screen.getByText('Importar e substituir diagrama'))

    expect(document.querySelector('.import-errors')).toBeInTheDocument()
    expect(screen.getByTestId('content').textContent).toBe(before)
    // erro aparece dentro do modal, que continua aberto
    expect(screen.getByText('Importar diagrama (JSON)')).toBeInTheDocument()
  })

  it('CA-03: mostra erro claro para um texto que não é JSON', () => {
    render(<ControlledControls />)

    fireEvent.click(screen.getByText('Importar JSON'))
    pasteImportJson('isto não é json {{{')
    fireEvent.click(screen.getByText('Importar e substituir diagrama'))

    expect(screen.getByText(/^JSON inválido:/)).toBeInTheDocument()
  })

  it('CA-03: pede para colar algo antes de importar com a textarea vazia', () => {
    render(<ControlledControls />)

    fireEvent.click(screen.getByText('Importar JSON'))
    fireEvent.click(screen.getByText('Importar e substituir diagrama'))

    expect(screen.getByText('Cole um JSON antes de importar.')).toBeInTheDocument()
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
        io={classDiagramIO}
      />,
    )
    expect(screen.queryByText('Importar JSON')).not.toBeInTheDocument()
    expect(screen.getByText('Exportar JSON')).toBeInTheDocument()
  })
})
