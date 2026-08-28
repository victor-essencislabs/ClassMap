import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DiagramEditorPage } from '../class-diagram/DiagramEditorPage'
import { ObjectDiagramPage } from '../object-diagram/ObjectDiagramPage'
import { SystemViewPage } from '../system-view/SystemViewPage'
import { getDiagram } from '../../lib/supabase/queries'
import type { DiagramType } from '../../lib/supabase/types'

/** Roteia `/orgs/:orgId/projects/:projectId/diagrams/:diagramId` para a
 * tela certa conforme `diagram.type` — cada tela abaixo carrega o
 * diagrama de novo por `diagramId` (pequena leitura redundante, aceitável
 * neste estágio; simplifica não ter que repassar o diagrama já carregado
 * por props/contexto entre um roteador genérico e telas bem distintas). */
export function DiagramRouterPage() {
  const { diagramId } = useParams<{ diagramId: string }>()
  const [type, setType] = useState<DiagramType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!diagramId) return
    getDiagram(diagramId)
      .then((d) => setType(d.type))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar diagrama.'))
  }, [diagramId])

  if (error) return <p className="error">{error}</p>
  if (!type) return <p>Carregando diagrama…</p>

  switch (type) {
    case 'classes':
      return <DiagramEditorPage />
    case 'objects':
      return <ObjectDiagramPage />
    case 'system-view':
      return <SystemViewPage />
  }
}
