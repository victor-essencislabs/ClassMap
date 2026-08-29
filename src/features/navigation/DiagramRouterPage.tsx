import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DiagramEditorPage } from '../class-diagram/DiagramEditorPage'
import { ObjectDiagramPage } from '../object-diagram/ObjectDiagramPage'
import { SystemViewPage } from '../system-view/SystemViewPage'
import { getDiagram } from '../../lib/supabase/queries'
import type { DiagramType } from '../../lib/supabase/types'
import { AppLayout } from './AppLayout'

/** Roteia `/orgs/:orgId/projects/:projectId/diagrams/:diagramId` para a
 * tela certa conforme `diagram.type` — cada tela abaixo carrega o
 * diagrama de novo por `diagramId` (pequena leitura redundante, aceitável
 * neste estágio; simplifica não ter que repassar o diagrama já carregado
 * por props/contexto entre um roteador genérico e telas bem distintas).
 *
 * TASK-007/008/009/ADR-002: as 3 visualizações de diagrama já têm chrome
 * próprio de página inteira (Diagrama de Classes/Objetos usam o shell de
 * 3 colunas `DiagramShell`, TASK-006; Visão do Sistema usa seu próprio
 * shell de topbar+nav+detalhe, TASK-009) — por isso nenhuma é envolvida
 * em `AppLayout` aqui (esse wrapping saiu de `App.tsx` para cá,
 * condicionado ao tipo, só para os estados de loading/erro abaixo). */
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

  if (error)
    return (
      <AppLayout>
        <p className="error">{error}</p>
      </AppLayout>
    )
  if (!type)
    return (
      <AppLayout>
        <p>Carregando diagrama…</p>
      </AppLayout>
    )

  if (type === 'classes') return <DiagramEditorPage />
  if (type === 'objects') return <ObjectDiagramPage />

  return <SystemViewPage />
}
