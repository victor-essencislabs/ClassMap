// TASK-008 — modal "escolher diagrama de origem + classe" para criar um
// objeto (CA-04), substituindo o formulário de 2 selects que ficava na
// toolbar antiga. Mesma lógica/validação de antes (inclusive a mensagem
// para "nenhum Diagrama de Classes no projeto ainda"), só o container
// visual muda — usa `Modal` (design system, TASK-006/010), como o
// artefato faz no `#class-picker-modal`. Migrado para `Modal` na
// TASK-010 (antes duplicava o markup do overlay sem fechar por clique
// fora/Esc).
import { useState } from 'react'
import type { DiagramClass } from '../class-diagram/types'
import { Modal } from '../diagram-shell/Modal'

export interface ClassDiagramOption {
  id: string
  name: string
}

interface ClassPickerModalProps {
  classDiagrams: ClassDiagramOption[]
  loadClasses: (diagramId: string) => Promise<DiagramClass[]>
  onClose: () => void
  onPick: (sourceClass: DiagramClass) => void
}

export function ClassPickerModal({ classDiagrams, loadClasses, onClose, onPick }: ClassPickerModalProps) {
  const [sourceDiagramId, setSourceDiagramId] = useState('')
  const [availableClasses, setAvailableClasses] = useState<DiagramClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSourceDiagramChange(diagramId: string) {
    setSourceDiagramId(diagramId)
    setSelectedClassId('')
    setAvailableClasses([])
    if (!diagramId) return
    setLoadingClasses(true)
    setError(null)
    try {
      setAvailableClasses(await loadClasses(diagramId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar classes.')
    } finally {
      setLoadingClasses(false)
    }
  }

  function handleSubmit() {
    const sourceClass = availableClasses.find((c) => c.id === selectedClassId)
    if (sourceClass) onPick(sourceClass)
  }

  return (
    <Modal title="Nova instância — escolha a classe" onClose={onClose}>
      {classDiagrams.length === 0 ? (
        <p>Crie um Diagrama de Classes neste projeto antes de adicionar objetos.</p>
      ) : (
        <>
          <p>
            Selecione o Diagrama de Classes de origem e depois a classe da qual este objeto será uma instância.
          </p>
          <div className="field">
            <label htmlFor="object-source-diagram">Diagrama de classes de origem</label>
            <select
              id="object-source-diagram"
              value={sourceDiagramId}
              onChange={(e) => handleSourceDiagramChange(e.target.value)}
            >
              <option value="">Diagrama de classes de origem…</option>
              {classDiagrams.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="object-source-class">Classe</label>
            <select
              id="object-source-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={!sourceDiagramId || loadingClasses}
            >
              <option value="">{loadingClasses ? 'Carregando…' : 'Classe…'}</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn primary" disabled={!selectedClassId} onClick={handleSubmit}>
              Adicionar objeto
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
