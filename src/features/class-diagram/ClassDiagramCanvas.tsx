// TASK-003/007 — canvas do Diagrama de Classes: cards + conectores UML
// ortogonais (TASK-003), agora dentro do shell de 3 colunas da TASK-006
// com zoom/pan, modo de conexão (clicar origem→destino) e inspector fixo
// substituindo o antigo painel flutuante (ADR-002). Único ponto que sabe
// editar `ClassDiagramContent` — a página que hospeda este componente só
// carrega/salva via Supabase (ver `.claude/agents/frontend-diagramas.md`).
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { computeBounds } from '../diagram-shell/canvasTransform'
import { DiagramShell } from '../diagram-shell/DiagramShell'
import { FitToScreenGlyph, LinkGlyph } from '../diagram-shell/Icons'
import { InfoTooltip } from '../diagram-shell/InfoTooltip'
import { Toast, useToast } from '../diagram-shell/Toast'
import { useCanvasZoomPan } from '../diagram-shell/useCanvasZoomPan'
import { ClassCard } from './ClassCard'
import { ClassColorGrid } from './ClassColorGrid'
import { resolveConnectClick } from './connectMode'
import * as ops from './contentOperations'
import { EdgeTypeGrid } from './EdgeTypeGrid'
import { Connector } from './Connector'
import {
  CLASS_CARD_WIDTH,
  RELATIONSHIP_LABELS,
  type ClassDiagramContent,
  type DiagramClass,
  type DiagramRelationship,
} from './types'

interface ClassDiagramCanvasProps {
  content: ClassDiagramContent
  readOnly: boolean
  onChange: (content: ClassDiagramContent) => void
  /** Breadcrumb/título/indicador de salvamento da página (`DiagramEditorPage`) — vai entre a marca e os botões deste componente na topbar do shell. */
  topbarCenter?: ReactNode
  /** Controles extras da topbar, antes de "+ Classe" — hoje só `ImportExportControls` (TASK-005; o visual de modal é da TASK-010). */
  topbarActions?: ReactNode
}

type Selection = { type: 'class'; id: string } | { type: 'relationship'; id: string } | null

const CLICK_MOVE_THRESHOLD_PX = 4

/** Um clique conta como "no fundo do canvas" (pan/deselect) quando não
 * pousa dentro de um card — mesmo critério do artefato
 * (`ev.target.closest('.node-box')`) — nem dentro de um `<button>`
 * (zoom-controls, connect-banner, etc.): sem essa exclusão, o
 * `pointerdown` num botão flutuante borbulha até aqui,
 * `zoomPan.onBackgroundPointerDown` chama `setPointerCapture` no fundo
 * do canvas, e todo `pointerup`/`click` seguinte é redirecionado pro
 * fundo em vez do botão — o botão parece "não fazer nada". Achado em
 * produção, 2026-09-02 (relatado pelo usuário: +/−/ajustar à tela sem
 * efeito). */
export function isBackgroundTarget(target: EventTarget | null): boolean {
  return !(target instanceof Element) || !target.closest('.node-box, button')
}

export function ClassDiagramCanvas({
  content,
  readOnly,
  onChange,
  topbarCenter,
  topbarActions,
}: ClassDiagramCanvasProps) {
  const [selection, setSelection] = useState<Selection>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  // TASK-041 — id da relação recém-criada NESTA sessão do componente,
  // só para disparar o efeito de "conector nascendo" (RN-01: começa
  // null e só é setado no próprio handler de criação abaixo — nunca ao
  // carregar um diagrama existente). `Connector` limpa isto sozinho
  // quando a animação termina (`onJustCreatedAnimationEnd`).
  const [justCreatedRelationshipId, setJustCreatedRelationshipId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const zoomPan = useCanvasZoomPan(canvasRef)
  const { message, showToast } = useToast()
  const didInitialFit = useRef(false)
  const clickStart = useRef<{ x: number; y: number } | null>(null)

  // Ajusta zoom/pan para caber o diagrama carregado assim que ele chega
  // (equivalente ao `fitToScreen()` do artefato ao restaurar do
  // localStorage) — só uma vez, não a cada alteração de conteúdo.
  useEffect(() => {
    if (didInitialFit.current) return
    didInitialFit.current = true
    zoomPan.fitToScreen(computeBounds(content.classes.map(ops.toBoundedNode)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedClass =
    selection?.type === 'class' ? content.classes.find((c) => c.id === selection.id) : undefined
  const selectedRelationship =
    selection?.type === 'relationship' ? content.relationships.find((r) => r.id === selection.id) : undefined

  function handleAddClass() {
    const rect = canvasRef.current?.getBoundingClientRect()
    const origin = rect
      ? {
          x: (rect.width / 2 - zoomPan.pan.x) / zoomPan.zoom - CLASS_CARD_WIDTH / 2,
          y: (rect.height / 2 - zoomPan.pan.y) / zoomPan.zoom - 40,
        }
      : undefined
    const next = ops.addClass(content, origin)
    onChange(next)
    setSelection({ type: 'class', id: next.classes[next.classes.length - 1].id })
  }

  function updateClass(id: string, patch: Partial<DiagramClass>) {
    onChange(ops.updateClass(content, id, patch))
  }

  function removeClass(id: string) {
    onChange(ops.removeClass(content, id))
    setSelection(null)
  }

  function updateRelationship(id: string, patch: Partial<DiagramRelationship>) {
    onChange(ops.updateRelationship(content, id, patch))
  }

  function removeRelationship(id: string) {
    onChange(ops.removeRelationship(content, id))
    setSelection(null)
  }

  function startConnectMode(fromId?: string) {
    setConnectMode(true)
    setConnectFrom(fromId ?? null)
  }

  function endConnectMode() {
    setConnectMode(false)
    setConnectFrom(null)
  }

  function handleCardClick(id: string) {
    if (!connectMode) {
      setSelection({ type: 'class', id })
      return
    }
    const result = resolveConnectClick(connectFrom, id)
    if (result.kind === 'started') {
      setConnectFrom(result.from)
      return
    }
    if (result.kind === 'same-class') {
      showToast('Escolha uma classe diferente')
      return
    }
    const next = ops.addRelationship(content, result.from, result.to, 'association')
    const createdId = next.relationships[next.relationships.length - 1].id
    onChange(next)
    endConnectMode()
    setSelection({ type: 'relationship', id: createdId })
    setJustCreatedRelationshipId(createdId)
    showToast('Relação criada — escolha o tipo (associação, herança…) no inspector')
  }

  function handleSidebarSelect(cls: DiagramClass) {
    setSelection({ type: 'class', id: cls.id })
    zoomPan.panToNode(ops.toBoundedNode(cls))
  }

  function handleBackgroundPointerDown(e: ReactPointerEvent) {
    if (!isBackgroundTarget(e.target)) return
    clickStart.current = { x: e.clientX, y: e.clientY }
    zoomPan.onBackgroundPointerDown(e)
  }

  function handleBackgroundPointerUp(e: ReactPointerEvent) {
    zoomPan.onBackgroundPointerUp(e)
    const start = clickStart.current
    clickStart.current = null
    if (!start) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    if (moved < CLICK_MOVE_THRESHOLD_PX) {
      setSelection(null)
      if (connectMode) endConnectMode()
    }
  }

  const filteredClasses = ops
    .filterClassesByQuery(content.classes, searchQuery)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <DiagramShell
        topbarCenter={topbarCenter}
        topbarActions={
          <>
            {topbarActions}
            {!readOnly && (
              <button
                type="button"
                className={connectMode ? 'btn ghost active' : 'btn ghost'}
                disabled={content.classes.length < 2}
                onClick={() => (connectMode ? endConnectMode() : startConnectMode())}
              >
                <LinkGlyph /> Relação
              </button>
            )}
            {!readOnly && (
              <button type="button" className="btn primary" onClick={handleAddClass}>
                + Classe
              </button>
            )}
          </>
        }
        sidebar={
          <Sidebar
            classes={content.classes}
            filteredClasses={filteredClasses}
            relationshipCount={content.relationships.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedId={selectedClass?.id}
            onSelect={handleSidebarSelect}
          />
        }
        canvasProps={{
          ref: canvasRef,
          className: connectMode ? 'connect-mode' : undefined,
          onPointerDown: handleBackgroundPointerDown,
          onPointerMove: zoomPan.onBackgroundPointerMove,
          onPointerUp: handleBackgroundPointerUp,
        }}
        canvas={
          <>
            {connectMode && (
              <div className="connect-banner show">
                <span>Clique na classe de origem, depois na de destino</span>
                <button type="button" onClick={endConnectMode}>
                  Cancelar
                </button>
              </div>
            )}

            <div
              className={`canvas-viewport${zoomPan.settling ? ' settling' : ''}`}
              style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: zoomPan.transform }}
            >
              <svg className="connectors-layer" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                {content.relationships.map((rel) => {
                  const fromClass = content.classes.find((c) => c.id === rel.from)
                  const toClass = content.classes.find((c) => c.id === rel.to)
                  if (!fromClass || !toClass) return null
                  return (
                    <Connector
                      key={rel.id}
                      relationship={rel}
                      fromClass={fromClass}
                      toClass={toClass}
                      selected={selection?.type === 'relationship' && selection.id === rel.id}
                      readOnly={readOnly}
                      zoom={zoomPan.zoom}
                      justCreated={rel.id === justCreatedRelationshipId}
                      onJustCreatedAnimationEnd={() =>
                        setJustCreatedRelationshipId((current) => (current === rel.id ? null : current))
                      }
                      onSelect={(id) => setSelection({ type: 'relationship', id })}
                      onDragControlPoint={(id, controlX) => updateRelationship(id, { controlX })}
                    />
                  )
                })}
              </svg>

              {content.classes.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  selected={selection?.type === 'class' && selection.id === cls.id}
                  readOnly={readOnly}
                  zoom={zoomPan.zoom}
                  connectMode={connectMode}
                  onSelect={handleCardClick}
                  onMove={(id, x, y) => updateClass(id, { x, y })}
                />
              ))}
            </div>

            {content.classes.length === 0 && (
              <div className="empty-hint">
                <div className="empty-hint-card">
                  <h3>Nenhuma classe ainda</h3>
                  <p>
                    Clique em <b>+ Classe</b> para modelar do zero.
                  </p>
                </div>
              </div>
            )}

            <div className="zoom-controls">
              <button type="button" title="Aproximar" aria-label="Aproximar" onClick={zoomPan.zoomIn}>
                +
              </button>
              <button
                type="button"
                title="Ajustar à tela"
                aria-label="Ajustar à tela"
                onClick={() => zoomPan.fitToScreen(computeBounds(content.classes.map(ops.toBoundedNode)))}
              >
                <FitToScreenGlyph />
              </button>
              <button type="button" title="Afastar" aria-label="Afastar" onClick={zoomPan.zoomOut}>
                −
              </button>
            </div>
          </>
        }
        inspector={
          !selection ? (
            <div className="insp-empty">Selecione uma classe ou relação no diagrama para editar seus detalhes aqui.</div>
          ) : selectedClass ? (
            <ClassInspector
              cls={selectedClass}
              relationships={content.relationships.filter(
                (r) => r.from === selectedClass.id || r.to === selectedClass.id,
              )}
              classesById={content.classes}
              readOnly={readOnly}
              selectedRelationshipId={selectedRelationship?.id}
              onChange={(patch) => updateClass(selectedClass.id, patch)}
              onDelete={() => removeClass(selectedClass.id)}
              onSelectRelationship={(id) => setSelection({ type: 'relationship', id })}
              onStartConnect={() => startConnectMode(selectedClass.id)}
            />
          ) : selectedRelationship ? (
            <RelationshipInspector
              relationship={selectedRelationship}
              fromName={content.classes.find((c) => c.id === selectedRelationship.from)?.name ?? '?'}
              toName={content.classes.find((c) => c.id === selectedRelationship.to)?.name ?? '?'}
              readOnly={readOnly}
              onChange={(patch) => updateRelationship(selectedRelationship.id, patch)}
              onDelete={() => removeRelationship(selectedRelationship.id)}
            />
          ) : (
            <div className="insp-empty">Selecione uma classe ou relação no diagrama para editar seus detalhes aqui.</div>
          )
        }
      />
      <Toast message={message} />
    </>
  )
}

function Sidebar({
  classes,
  filteredClasses,
  relationshipCount,
  searchQuery,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  classes: DiagramClass[]
  filteredClasses: DiagramClass[]
  relationshipCount: number
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedId: string | undefined
  onSelect: (cls: DiagramClass) => void
}) {
  return (
    <>
      <div className="side-section">
        <input
          className="side-search"
          placeholder="Buscar classe..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="stat-row">
        <div className="stat">
          <b>{classes.length}</b>
          <span>Classes</span>
        </div>
        <div className="stat">
          <b>{relationshipCount}</b>
          <span>Relações</span>
        </div>
        <div className="stat">
          <b>0</b>
          <span>Objetos</span>
        </div>
      </div>
      <div className="side-list">
        {classes.length === 0 ? (
          <div className="side-empty">Nenhuma classe ainda. Use "+ Classe" para criar a primeira.</div>
        ) : filteredClasses.length === 0 ? (
          <div className="side-empty">Nenhuma classe encontrada.</div>
        ) : (
          filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className={`side-item${cls.id === selectedId ? ' selected' : ''}`}
              onClick={() => onSelect(cls)}
              role="button"
              tabIndex={0}
            >
              <span className="dot" aria-hidden="true" style={cls.color ? { background: cls.color } : undefined} />
              {/* TASK-015: classe `.name` para truncar com reticências em vez
                  de vazar sob a borda da sidebar quando o nome é longo —
                  mesmo ajuste do Diagrama de Objetos, CSS compartilhado
                  em `.diagram-shell-sidebar .side-item .name`. */}
              <span className="name">{cls.name}</span>
              <span className="count">{cls.attributes.length} attrs</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function ClassInspector({
  cls,
  relationships,
  classesById,
  readOnly,
  selectedRelationshipId,
  onChange,
  onDelete,
  onSelectRelationship,
  onStartConnect,
}: {
  cls: DiagramClass
  relationships: DiagramRelationship[]
  classesById: DiagramClass[]
  readOnly: boolean
  selectedRelationshipId: string | undefined
  onChange: (patch: Partial<DiagramClass>) => void
  onDelete: () => void
  onSelectRelationship: (id: string) => void
  onStartConnect: () => void
}) {
  function updateAttribute(id: string, patch: Partial<DiagramClass['attributes'][number]>) {
    onChange({ attributes: cls.attributes.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
  }

  function addAttribute() {
    onChange({ attributes: [...cls.attributes, { id: ops.newId(), name: 'novoAtributo', type: '' }] })
  }

  function removeAttribute(id: string) {
    onChange({ attributes: cls.attributes.filter((a) => a.id !== id) })
  }

  function otherClassName(rel: DiagramRelationship): string {
    const otherId = rel.from === cls.id ? rel.to : rel.from
    return classesById.find((c) => c.id === otherId)?.name ?? '?'
  }

  return (
    <>
      <div className="insp-title">Classe</div>
      <div className="field">
        <label htmlFor="class-name-input">Nome da classe</label>
        {readOnly ? (
          <div className="mono">{cls.name}</div>
        ) : (
          <input id="class-name-input" value={cls.name} onChange={(e) => onChange({ name: e.target.value })} />
        )}
      </div>
      <div className="field">
        <label htmlFor="class-stereotype-input">
          Estereótipo (opcional)
          <InfoTooltip text="Classificação UML opcional para a classe (ex.: «entity», «table», «interface», «enumeration») — indica o papel dela no sistema modelado, não é um dado do domínio." />
        </label>
        {readOnly ? (
          <div className="mono">{cls.stereotype || '—'}</div>
        ) : (
          <input
            id="class-stereotype-input"
            placeholder="ex: entity, table"
            value={cls.stereotype ?? ''}
            onChange={(e) => onChange({ stereotype: e.target.value || undefined })}
          />
        )}
      </div>

      <div className="insp-title">Cor do card (opcional)</div>
      {readOnly ? (
        <div className="mono" style={{ marginBottom: 14 }}>
          {cls.color ?? 'Padrão'}
        </div>
      ) : (
        <ClassColorGrid value={cls.color} onChange={(color) => onChange({ color })} />
      )}

      <div className="insp-title" style={{ marginTop: 16 }}>
        Atributos
      </div>
      {cls.attributes.map((attr) =>
        readOnly ? (
          <div className="attr-row" key={attr.id}>
            <span className="mono">
              {attr.name}
              {attr.type ? `: ${attr.type}` : ''}
            </span>
          </div>
        ) : (
          <div className="attr-row" key={attr.id}>
            <input
              placeholder="nome"
              value={attr.name}
              onChange={(e) => updateAttribute(attr.id, { name: e.target.value })}
            />
            <input
              placeholder="tipo"
              className="val"
              value={attr.type}
              onChange={(e) => updateAttribute(attr.id, { type: e.target.value })}
            />
            <button type="button" onClick={() => removeAttribute(attr.id)} aria-label="Remover atributo">
              ×
            </button>
          </div>
        ),
      )}
      {!readOnly && (
        <button type="button" className="add-row-btn" onClick={addAttribute}>
          + atributo
        </button>
      )}

      <div className="insp-section">
        <div className="insp-title">Relações</div>
        <div className="rel-list">
          {relationships.length === 0 ? (
            <div className="side-empty">Sem relações.</div>
          ) : (
            relationships.map((rel) => (
              <div
                key={rel.id}
                className={`rel-chip${rel.id === selectedRelationshipId ? ' selected' : ''}`}
                onClick={() => onSelectRelationship(rel.id)}
                role="button"
                tabIndex={0}
              >
                {rel.from === cls.id ? (
                  <span>
                    <b>{cls.name}</b> <span className="arrow">→</span> {otherClassName(rel)}
                  </span>
                ) : (
                  <span>
                    {otherClassName(rel)} <span className="arrow">→</span> <b>{cls.name}</b>
                  </span>
                )}
                <span className="rel-kind">{RELATIONSHIP_LABELS[rel.type]}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="insp-actions">
          <button type="button" className="btn" onClick={onStartConnect}>
            <LinkGlyph /> Ligar a outra classe
          </button>
          <button type="button" className="btn danger" onClick={onDelete}>
            Excluir classe
          </button>
        </div>
      )}
    </>
  )
}

function RelationshipInspector({
  relationship,
  fromName,
  toName,
  readOnly,
  onChange,
  onDelete,
}: {
  relationship: DiagramRelationship
  fromName: string
  toName: string
  readOnly: boolean
  onChange: (patch: Partial<DiagramRelationship>) => void
  onDelete: () => void
}) {
  return (
    <>
      <div className="insp-title">Relação</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
        {fromName} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>→</span> {toName}
      </div>

      <div className="insp-title">Tipo de relação</div>
      {readOnly ? (
        <div className="mono" style={{ marginBottom: 14 }}>
          {RELATIONSHIP_LABELS[relationship.type]}
        </div>
      ) : (
        <EdgeTypeGrid value={relationship.type} onChange={(type) => onChange({ type })} />
      )}
      <div className="endpoint-note">
        O símbolo geométrico (losango, triângulo, seta) aparece do lado da classe de origem ou destino conforme a
        notação UML de cada tipo.
      </div>

      <div className="insp-title">Multiplicidade (opcional)</div>
      <div className="mult-row">
        <div className="field">
          <label>{fromName}</label>
          {readOnly ? (
            <div className="mono">{relationship.fromMultiplicity || '—'}</div>
          ) : (
            <input
              placeholder="ex: 1"
              value={relationship.fromMultiplicity ?? ''}
              onChange={(e) => onChange({ fromMultiplicity: e.target.value || undefined })}
            />
          )}
        </div>
        <div className="field">
          <label>{toName}</label>
          {readOnly ? (
            <div className="mono">{relationship.toMultiplicity || '—'}</div>
          ) : (
            <input
              placeholder="ex: n"
              value={relationship.toMultiplicity ?? ''}
              onChange={(e) => onChange({ toMultiplicity: e.target.value || undefined })}
            />
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="insp-actions">
          <button type="button" className="btn danger" onClick={onDelete}>
            Excluir relação
          </button>
        </div>
      )}
    </>
  )
}
