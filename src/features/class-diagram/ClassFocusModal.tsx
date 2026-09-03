// TASK-055 — modal de foco (tecla `V`, ou o botão na seção "Relações" do
// inspector): renderiza SÓ a classe selecionada e as classes com que ela
// se relaciona. Num diagrama grande (o real do ELIMS tem 85 classes e 190
// relações), o destaque por sentido da TASK-049 pinta as relações certas,
// mas as classes relacionadas continuam espalhadas a telas de distância —
// aqui elas vêm todas para perto, num layout próprio.
//
// É uma janela de leitura: nada aqui edita, arrasta ou salva. O recorte é
// calculado em memória por `focusSubgraph.ts` (compartilhado com a
// TASK-056), sobre cópias — as posições reais do diagrama continuam
// intactas (RN-01).
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { computeBounds, cssTransform, fitToScreen } from '../diagram-shell/canvasTransform'
import { Modal } from '../diagram-shell/Modal'
import { ClassCard } from './ClassCard'
import { Connector, type ConnectorEmphasis } from './Connector'
import { FOCUS_CARD_HEIGHT, focusSubgraphFor } from './focusSubgraph'
import { CLASS_CARD_WIDTH, type ClassDiagramContent, type DiagramRelationship } from './types'

/** Usada enquanto o container ainda não foi medido (primeiro render) e em
 * ambiente sem layout real (jsdom nos testes, onde
 * `getBoundingClientRect` devolve zeros) — sem isto, `fitToScreen`
 * receberia um viewport 0×0 e cairia no zoom mínimo. */
const FALLBACK_VIEWPORT = { width: 900, height: 520 }

interface ClassFocusModalProps {
  content: ClassDiagramContent
  focusClassId: string
  onClose: () => void
  /** TASK-056 (RN-07) — quando presente, mostra o botão que transforma
   * este recorte num diagrama novo. Ausente para `visualizador` (não
   * cria diagrama) e onde o host não sabe criar. */
  onCreateDerivedDiagram?: () => void
}

export function ClassFocusModal({
  content,
  focusClassId,
  onClose,
  onCreateDerivedDiagram,
}: ClassFocusModalProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState(FALLBACK_VIEWPORT)

  const subgraph = useMemo(() => focusSubgraphFor(content, focusClassId), [content, focusClassId])

  // Mede a área do modal para enquadrar o recorte inteiro nela. O
  // `fitToScreen` puro de `canvasTransform` já faz essa conta (o mesmo
  // usado pelo botão "ajustar à tela" do canvas) — não há motivo para o
  // modal ter matemática de enquadramento própria, nem para arrastar o
  // `useCanvasZoomPan` (que carrega estado de pan/zoom interativo que
  // este modal não tem).
  useLayoutEffect(() => {
    function measure() {
      const rect = areaRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return
      setViewport({ width: rect.width, height: rect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const focusClass = subgraph?.classes.find((c) => c.id === focusClassId)
  // A classe pode ter sumido entre a seleção e a abertura (ex.: excluída
  // por outro caminho) — fecha em vez de renderizar um modal vazio.
  if (!subgraph || !focusClass) return null

  const neighborCount = subgraph.classes.length - 1
  // Bounds com a altura COMPACTA (`FOCUS_CARD_HEIGHT`), não a estimada
  // pelos atributos — `ops.toBoundedNode` daria a altura do card cheio, e
  // o enquadramento sobraria centenas de pixels vazios por card.
  const nodes = subgraph.classes.map((c) => ({ x: c.x, y: c.y, w: CLASS_CARD_WIDTH, h: FOCUS_CARD_HEIGHT }))
  const transform = cssTransform(fitToScreen(computeBounds(nodes), viewport))

  /** Mesma leitura por sentido da TASK-049, restrita ao recorte: o que
   * toca a classe focada ganha cor; relação entre duas vizinhas fica
   * `normal` (RN-02) — está ali para o desenho não mentir sobre o modelo,
   * não para competir com o foco. */
  function emphasisFor(rel: DiagramRelationship): ConnectorEmphasis {
    if (rel.from === focusClassId) return 'outgoing'
    if (rel.to === focusClassId) return 'incoming'
    return 'normal'
  }

  return (
    <Modal title={`Foco: ${focusClass.name}`} onClose={onClose} className="modal-wide">
      <div className="focus-summary">
        {neighborCount === 0 ? (
          <span>
            <b>{focusClass.name}</b> não se relaciona com nenhuma outra classe deste diagrama.
          </span>
        ) : (
          <>
            <span>
              {neighborCount} {neighborCount === 1 ? 'classe relacionada' : 'classes relacionadas'}
            </span>
            <span className="focus-legend">
              <span className="rel-dir-dot outgoing" aria-hidden="true" /> sai daqui
              <span className="rel-dir-dot incoming" aria-hidden="true" /> chega aqui
            </span>
          </>
        )}
        {onCreateDerivedDiagram && (
          <button type="button" className="btn ghost" onClick={onCreateDerivedDiagram}>
            Criar diagrama com este recorte <kbd>N</kbd>
          </button>
        )}
      </div>

      {/* `diagram-shell-canvas` não é decoração: é o escopo sob o qual
          todo o CSS de card/conector do Diagrama de Classes está escrito
          (ver `.focus-canvas` em `src/index.css`). */}
      <div className="diagram-shell-canvas focus-canvas" ref={areaRef}>
        <div className="focus-viewport" style={{ transformOrigin: '0 0', transform }}>
          <svg className="connectors-layer" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {subgraph.relationships.map((rel) => {
              const fromClass = subgraph.classes.find((c) => c.id === rel.from)
              const toClass = subgraph.classes.find((c) => c.id === rel.to)
              if (!fromClass || !toClass) return null
              return (
                <Connector
                  key={rel.id}
                  relationship={rel}
                  fromClass={fromClass}
                  toClass={toClass}
                  emphasis={emphasisFor(rel)}
                  // `readOnly` aqui não é sobre o papel do usuário (um
                  // `editor` também abre este modal) — é o que esconde o
                  // ponto de controle arrastável do conector, que não faz
                  // sentido numa janela de leitura.
                  readOnly
                  zoom={1}
                  cardHeight={FOCUS_CARD_HEIGHT}
                  onSelect={noop}
                  onDragControlPoint={noop}
                />
              )
            })}
          </svg>

          {subgraph.classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              selected={cls.id === focusClassId}
              readOnly
              zoom={1}
              connectMode={false}
              compact
              onSelect={noop}
              onMove={noop}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}

function noop() {}
