// TASK-022 (ADR-008) — a rota `/orgs/:orgId/projects/:projectId/diagrams/:diagramId`
// agora atende dois casos com o mesmo formato de caminho: `:diagramId`
// pode ser um dos 3 slugs de tipo conhecidos (`classes`/`objects`/
// `system-view`, vindo de um card em `DiagramsPage`) ou um UUID de
// diagrama de verdade (vindo de um item em `DiagramTypeListPage`).
// React Router não decide isso por duas rotas registradas com o mesmo
// formato — quem decide é este componente, pelo valor do parâmetro,
// antes de delegar para a página certa. Mesmo padrão de despacho por
// valor que `DiagramRouterPage` já usa (lá, por `diagram.type` depois de
// buscar o diagrama; aqui, por `diagramId` antes de buscar qualquer
// coisa).
import { useParams } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DiagramTypeListPage } from './DiagramTypeListPage'
import { DiagramRouterPage } from './DiagramRouterPage'
import { isDiagramType } from './diagramTypeLabels'

export function DiagramsRouteDispatcher() {
  const { diagramId } = useParams<{ diagramId: string }>()

  if (diagramId && isDiagramType(diagramId)) {
    // Lista por tipo é uma tela de navegação como as demais
    // (Organizações/Projetos/Diagramas) — usa `AppLayout`, diferente das
    // 3 telas de diagrama (full-bleed, ver `DiagramRouterPage`).
    return (
      <AppLayout>
        <DiagramTypeListPage type={diagramId} />
      </AppLayout>
    )
  }

  return <DiagramRouterPage />
}
