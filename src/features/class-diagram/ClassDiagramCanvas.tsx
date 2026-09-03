// TASK-003/007 — canvas do Diagrama de Classes: cards + conectores UML
// ortogonais (TASK-003), agora dentro do shell de 3 colunas da TASK-006
// com zoom/pan, modo de conexão (clicar origem→destino) e inspector fixo
// substituindo o antigo painel flutuante (ADR-002). Único ponto que sabe
// editar `ClassDiagramContent` — a página que hospeda este componente só
// carrega/salva via Supabase (ver `.claude/agents/frontend-diagramas.md`).
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { computeBounds } from '../diagram-shell/canvasTransform'
import { DiagramShell } from '../diagram-shell/DiagramShell'
import { ChevronGlyph, FitToScreenGlyph, LinkGlyph } from '../diagram-shell/Icons'
import { InfoTooltip } from '../diagram-shell/InfoTooltip'
import { Toast, useToast } from '../diagram-shell/Toast'
import { useCanvasZoomPan } from '../diagram-shell/useCanvasZoomPan'
import { ClassCard } from './ClassCard'
import { ClassColorGrid } from './ClassColorGrid'
import { ClassFocusModal } from './ClassFocusModal'
import { resolveConnectClick } from './connectMode'
import * as ops from './contentOperations'
import { EdgeTypeGrid } from './EdgeTypeGrid'
import { Connector, type ConnectorEmphasis } from './Connector'
import { focusSubgraphFor, focusSubgraphToContent, suggestedFocusDiagramName } from './focusSubgraph'
import { Modal } from '../diagram-shell/Modal'
import { NoteCard } from './NoteCard'
import { NoteInspector } from './NoteInspector'
import {
  CLASS_CARD_WIDTH,
  NOTE_CARD_WIDTH,
  RELATIONSHIP_LABELS,
  type ClassDiagramContent,
  type DiagramClass,
  type DiagramNote,
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
  /** TASK-047 — conteúdo extra sobreposto ao canvas (ex.: `RemoteUpdateBanner`), no mesmo nível do `connect-banner`/`zoom-controls`. */
  canvasOverlay?: ReactNode
  /** TASK-056 — cria um diagrama novo com o recorte da classe focada
   * (tecla `N`). Este componente monta o "o quê" (o conteúdo do recorte);
   * quem sabe o "onde" (projeto, rota, Supabase) é a página que o
   * hospeda — o canvas nunca falou com o Supabase e continua não falando.
   * Ausente (ex.: em teste, ou num host que não suporte criar diagrama) =
   * o atalho e o botão simplesmente não existem. */
  onCreateDerivedDiagram?: (name: string, content: ClassDiagramContent) => Promise<void>
}

type Selection =
  | { type: 'class'; id: string }
  | { type: 'relationship'; id: string }
  | { type: 'note'; id: string } // TASK-051
  | null

const CLICK_MOVE_THRESHOLD_PX = 4

/** Um clique conta como "no fundo do canvas" (pan/deselect) quando não
 * pousa dentro de um card — mesmo critério do artefato
 * (`ev.target.closest('.node-box')`) — nem dentro de um `<button>`
 * (zoom-controls, connect-banner, etc.), nem dentro de um card de
 * comentário (`.note-card`, TASK-051): sem essa exclusão, o
 * `pointerdown` num botão flutuante borbulha até aqui,
 * `zoomPan.onBackgroundPointerDown` chama `setPointerCapture` no fundo
 * do canvas, e todo `pointerup`/`click` seguinte é redirecionado pro
 * fundo em vez do botão — o botão parece "não fazer nada". Achado em
 * produção, 2026-09-02 (relatado pelo usuário: +/−/ajustar à tela sem
 * efeito). */
export function isBackgroundTarget(target: EventTarget | null): boolean {
  return !(target instanceof Element) || !target.closest('.node-box, .note-card, button')
}

export function ClassDiagramCanvas({
  content,
  readOnly,
  onChange,
  topbarCenter,
  topbarActions,
  canvasOverlay,
  onCreateDerivedDiagram,
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
  // TASK-055 — id da classe cujo recorte está aberto no modal de foco
  // (`null` = modal fechado). Separado de `selection` de propósito: fechar
  // o modal não pode mexer na seleção do canvas (CA-04).
  const [focusClassId, setFocusClassId] = useState<string | null>(null)
  // TASK-056 — id da classe cujo recorte vai virar diagrama novo (`null` =
  // nenhum modal de nome aberto). Nada é criado enquanto este modal não
  // for confirmado: é a rede de segurança do atalho de uma tecla só.
  const [derivingClassId, setDerivingClassId] = useState<string | null>(null)
  const [derivedName, setDerivedName] = useState('')
  const [creatingDerived, setCreatingDerived] = useState(false)
  const [derivedError, setDerivedError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const zoomPan = useCanvasZoomPan(canvasRef)
  const { message, showToast } = useToast()
  const didInitialFit = useRef(false)
  const clickStart = useRef<{ x: number; y: number } | null>(null)

  // Ajusta zoom/pan para caber o diagrama carregado assim que ele chega
  // (equivalente ao `fitToScreen()` do artefato ao restaurar do
  // localStorage) — só uma vez, não a cada alteração de conteúdo.
  // TASK-051 — cards de comentário entram no bounds do "ajustar à tela"
  // junto com as classes, senão uma nota fora da área das classes fica
  // cortada de fora da vista ao ajustar.
  function allBoundedNodes() {
    return [...content.classes.map(ops.toBoundedNode), ...(content.notes ?? []).map(ops.noteToBoundedNode)]
  }

  useEffect(() => {
    if (didInitialFit.current) return
    didInitialFit.current = true
    zoomPan.fitToScreen(computeBounds(allBoundedNodes()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedClass =
    selection?.type === 'class' ? content.classes.find((c) => c.id === selection.id) : undefined
  const selectedRelationship =
    selection?.type === 'relationship' ? content.relationships.find((r) => r.id === selection.id) : undefined
  const selectedNote =
    selection?.type === 'note' ? (content.notes ?? []).find((n) => n.id === selection.id) : undefined

  /** TASK-049 — estado visual de cada conector a partir da seleção atual.
   * Clicar numa relação (comportamento já existente) continua marcando só
   * ela como `'selected'`. Clicar num CARD passa a destacar por sentido
   * todas as relações que tocam aquela classe (`'outgoing'` quando a
   * classe é `from`, `'incoming'` quando é `to` — desempate para
   * `outgoing` numa auto-relação, caso raro) e recuar as demais
   * (`'dimmed'`) — ver discussão de por que é por sentido cru da seta, não
   * por semântica de posse, no comentário de `ConnectorEmphasis` em
   * `Connector.tsx`. */
  function connectorEmphasis(rel: DiagramRelationship): ConnectorEmphasis {
    if (selection?.type === 'relationship' && selection.id === rel.id) return 'selected'
    if (selectedClass) {
      if (rel.from === selectedClass.id) return 'outgoing'
      if (rel.to === selectedClass.id) return 'incoming'
      return 'dimmed'
    }
    return 'normal'
  }

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

  // TASK-051 — mesmo padrão de handleAddClass/updateClass/removeClass,
  // sem a parte de conector (uma nota nunca é origem/destino de relação).
  function handleAddNote() {
    const rect = canvasRef.current?.getBoundingClientRect()
    const origin = rect
      ? {
          x: (rect.width / 2 - zoomPan.pan.x) / zoomPan.zoom - NOTE_CARD_WIDTH / 2,
          y: (rect.height / 2 - zoomPan.pan.y) / zoomPan.zoom - 40,
        }
      : undefined
    const next = ops.addNote(content, origin)
    onChange(next)
    const notes = next.notes ?? []
    setSelection({ type: 'note', id: notes[notes.length - 1].id })
  }

  function updateNote(id: string, patch: Partial<DiagramNote>) {
    onChange(ops.updateNote(content, id, patch))
  }

  function removeNote(id: string) {
    onChange(ops.removeNote(content, id))
    setSelection(null)
  }

  function updateRelationship(id: string, patch: Partial<DiagramRelationship>) {
    onChange(ops.updateRelationship(content, id, patch))
  }

  function removeRelationship(id: string) {
    onChange(ops.removeRelationship(content, id))
    setSelection(null)
  }

  // TASK-052 — Delete/Backspace exclui o que estiver selecionado (classe,
  // relação ou nota), sem precisar abrir o inspector e clicar em
  // "Excluir...". Nunca dispara com foco num campo de texto (nome da
  // classe, atributo, multiplicidade, texto do comentário, busca da
  // sidebar, nome do diagrama na topbar) — senão apagar um caractere
  // digitado apagaria o card inteiro junto.
  // TASK-055/056 — `focusClassId`/`derivingClassId` entram na guarda: com
  // um modal aberto, `Delete` apagaria a classe atrás dele, sem o usuário
  // estar vendo o canvas nem ter como perceber o que sumiu.
  useEffect(() => {
    if (readOnly || !selection || focusClassId || derivingClassId) return
    const current = selection // capturado aqui para o narrowing sobreviver dentro do closure abaixo
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      if (current.type === 'class') removeClass(current.id)
      else if (current.type === 'relationship') removeRelationship(current.id)
      else if (current.type === 'note') removeNote(current.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, readOnly, content, focusClassId, derivingClassId])

  // TASK-055 — `V` abre o modal de foco da classe selecionada. Duas
  // diferenças deliberadas em relação ao atalho de excluir acima:
  // 1. Sem guarda de `readOnly` — é visualização, não edição: um
  //    `visualizador` precisa disso tanto quanto um `editor` (RN-03).
  // 2. Ignora combinações com modificador — `Ctrl+V`/`Cmd+V` é colar em
  //    qualquer aplicação; abrir um modal em cima disso seria hostil.
  // A guarda de campo de texto é a mesma da TASK-052 (RN-04): sem ela,
  // digitar a letra "v" no nome de uma classe abriria o modal.
  useEffect(() => {
    if (selection?.type !== 'class') return
    const classId = selection.id
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'v' && e.key !== 'V') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      setFocusClassId(classId)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selection])

  // TASK-056 — `N` propõe criar um diagrama novo com o recorte da classe
  // selecionada. Guardas a mais em relação ao `V`, porque isto ESCREVE no
  // banco: exige `editor` (RN-01) e um host que saiba criar diagrama. A
  // guarda de campo de texto (RN-02) é mais crítica aqui do que no `V` ou
  // no `Delete`: o efeito colateral de digitar "n" no lugar errado seria
  // uma linha nova no banco, não uma janela que fecha com `Esc`.
  useEffect(() => {
    if (readOnly || !onCreateDerivedDiagram) return
    if (selection?.type !== 'class') return
    const classId = selection.id
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      openDerivedModal(classId)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, readOnly, onCreateDerivedDiagram, content])

  function openDerivedModal(classId: string) {
    const cls = content.classes.find((c) => c.id === classId)
    if (!cls) return
    setDerivedName(suggestedFocusDiagramName(cls.name))
    setDerivedError(null)
    setDerivingClassId(classId)
  }

  async function confirmDerivedDiagram() {
    if (!derivingClassId || !onCreateDerivedDiagram) return
    // `'full'`: o diagrama criado renderiza cards inteiros (lista de
    // atributos), não os compactos do modal — posicionar com a altura
    // compacta faria os cards nascerem sobrepostos (RN-06/CA-03).
    const subgraph = focusSubgraphFor(content, derivingClassId, 'full')
    const cls = content.classes.find((c) => c.id === derivingClassId)
    if (!subgraph || !cls) return
    setCreatingDerived(true)
    setDerivedError(null)
    try {
      // Nome vazio cai na sugestão — `diagrams.name` é `not null`, mesmo
      // tratamento que `DiagramTypeListPage` dá desde a TASK-016.
      await onCreateDerivedDiagram(
        derivedName.trim() || suggestedFocusDiagramName(cls.name),
        focusSubgraphToContent(subgraph),
      )
      setDerivingClassId(null)
      // Fecha também o modal de foco: navegar para o diagrama novo troca
      // só o parâmetro da rota, então este componente NÃO é remontado e o
      // modal de foco do diagrama anterior ficaria aberto por cima do
      // recém-criado. Achado na validação ao vivo.
      setFocusClassId(null)
    } catch (err) {
      // Falhou: nada de navegar. O modal continua aberto com o erro, e o
      // diagrama de origem segue intacto atrás dele (CA-11).
      setDerivedError(err instanceof Error ? err.message : 'Erro ao criar o diagrama.')
    } finally {
      setCreatingDerived(false)
    }
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
              <button type="button" className="btn ghost" onClick={handleAddNote}>
                + Nota
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
            {canvasOverlay}

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
                      emphasis={connectorEmphasis(rel)}
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

              {/* TASK-051 — depois das classes, para um comentário
                  sobreposto a uma classe (raro, mas possível) ficar
                  visualmente por cima, mais fácil de notar. */}
              {(content.notes ?? []).map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  selected={selection?.type === 'note' && selection.id === note.id}
                  readOnly={readOnly}
                  zoom={zoomPan.zoom}
                  connectMode={connectMode}
                  onSelect={(id) => setSelection({ type: 'note', id })}
                  onMove={(id, x, y) => updateNote(id, { x, y })}
                  onResize={(id, width, height) => updateNote(id, { width, height })}
                />
              ))}
            </div>

            {/* TASK-051: achado ao vivo — sem checar `notes`, este aviso
                (centralizado, mesma posição padrão de card novo) cobria
                visualmente o primeiro comentário criado num diagrama
                ainda sem nenhuma classe. */}
            {content.classes.length === 0 && (content.notes ?? []).length === 0 && (
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
                onClick={() => zoomPan.fitToScreen(computeBounds(allBoundedNodes()))}
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
              onOpenFocus={() => setFocusClassId(selectedClass.id)}
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
          ) : selectedNote ? (
            <NoteInspector
              note={selectedNote}
              readOnly={readOnly}
              onChange={(patch) => updateNote(selectedNote.id, patch)}
              onDelete={() => removeNote(selectedNote.id)}
            />
          ) : (
            <div className="insp-empty">Selecione uma classe ou relação no diagrama para editar seus detalhes aqui.</div>
          )
        }
      />
      <Toast message={message} />
      {/* TASK-055 — fora do `DiagramShell`: é uma janela sobre o app
          inteiro, não um painel do shell. Fechar não toca em `selection`
          (CA-04). */}
      {focusClassId && (
        <ClassFocusModal
          content={content}
          focusClassId={focusClassId}
          onClose={() => setFocusClassId(null)}
          // TASK-056 (RN-07) — o lugar mais honesto para oferecer isto: o
          // que está na tela é exatamente o recorte que vai virar
          // diagrama. Só para `editor`, e só se o host souber criar.
          onCreateDerivedDiagram={
            !readOnly && onCreateDerivedDiagram ? () => openDerivedModal(focusClassId) : undefined
          }
        />
      )}

      {/* TASK-056 — nada é criado até confirmar aqui. Além de deixar o
          usuário nomear (precedente da TASK-016: diagrama criado sem nome
          próprio já foi reclamação dele), este passo é o que separa um
          atalho útil de "criar diagrama sem querer ao digitar". */}
      {derivingClassId && (
        <Modal title="Novo diagrama com o recorte" onClose={() => setDerivingClassId(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              confirmDerivedDiagram()
            }}
          >
            <p>{describeDerivedDiagram(content, derivingClassId)}</p>
            <div className="field">
              <label htmlFor="derived-diagram-name-input">Nome do novo diagrama</label>
              <input
                id="derived-diagram-name-input"
                type="text"
                value={derivedName}
                onChange={(e) => setDerivedName(e.target.value)}
                autoFocus
              />
            </div>
            {derivedError && <p className="error">{derivedError}</p>}
            <div className="modal-actions">
              <button type="submit" className="btn primary" disabled={creatingDerived}>
                {creatingDerived ? 'Criando…' : 'Criar e abrir'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

/** Texto de apoio do modal: diz exatamente o que vai ser criado, para a
 * confirmação não ser às cegas. */
function describeDerivedDiagram(content: ClassDiagramContent, focusClassId: string): string {
  const subgraph = focusSubgraphFor(content, focusClassId)
  const cls = content.classes.find((c) => c.id === focusClassId)
  if (!subgraph || !cls) return ''
  const outras = subgraph.classes.length - 1
  const relacoes = subgraph.relationships.length
  const listaClasses = outras === 1 ? '1 classe relacionada' : `${outras} classes relacionadas`
  const listaRelacoes = relacoes === 1 ? '1 relação' : `${relacoes} relações`
  return `Cria um Diagrama de Classes novo neste projeto com ${cls.name} + ${listaClasses} (${listaRelacoes}). É uma cópia independente — editar o novo não altera este diagrama.`
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

/** TASK-054 — cabeçalho de seção recolhível do inspector, reaproveitado
 * por "Classe", "Cor do card", "Atributos" e "Relações": um `insp-title`
 * a mais não justifica quatro botões quase idênticos. */
function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  style,
}: {
  label: string
  count?: number
  collapsed: boolean
  onToggle: () => void
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      className="insp-title insp-title-collapsible"
      style={style}
      onClick={onToggle}
      aria-expanded={!collapsed}
    >
      {/* Mesmo chevron do recolher/expandir sidebar/inspector
          (`ChevronGlyph`, TASK-046/ADR-011) — girado -90° para apontar
          pra baixo quando expandido, em vez de um segundo ícone quase
          idêntico só para essa direção. */}
      <span className={`insp-chevron${collapsed ? '' : ' expanded'}`}>
        <ChevronGlyph direction="right" />
      </span>
      {label}
      {count !== undefined && <span className="count">{count}</span>}
    </button>
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
  onOpenFocus,
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
  /** TASK-055 — abre o modal de foco desta classe. Mesmo caminho do
   * atalho `V` (o botão não tem comportamento próprio, RN-09). */
  onOpenFocus: () => void
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

  // "Classe" e "Cor do card" começam sempre abertas (são o ponto de
  // entrada da edição); "Atributos" e "Relações" recolhem sozinhas
  // quando a lista já vem grande — evita que o inspector abra exigindo
  // scroll pra chegar nas seções seguintes. Reavaliado a cada troca de
  // classe selecionada (não é um "lembrete" por classe, só um ponto de
  // partida razoável).
  const [classCollapsed, setClassCollapsed] = useState(false)
  const [colorCollapsed, setColorCollapsed] = useState(false)
  const [attributesCollapsed, setAttributesCollapsed] = useState(cls.attributes.length > 6)
  const [relationsCollapsed, setRelationsCollapsed] = useState(relationships.length > 6)
  useEffect(() => {
    setClassCollapsed(false)
    setColorCollapsed(false)
    setAttributesCollapsed(cls.attributes.length > 6)
    setRelationsCollapsed(relationships.length > 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.id])

  return (
    <>
      <SectionHeader label="Classe" collapsed={classCollapsed} onToggle={() => setClassCollapsed((v) => !v)} />
      {!classCollapsed && (
        <>
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
        </>
      )}

      <SectionHeader
        label="Cor do card (opcional)"
        collapsed={colorCollapsed}
        onToggle={() => setColorCollapsed((v) => !v)}
        style={{ marginTop: 16 }}
      />
      {!colorCollapsed &&
        (readOnly ? (
          <div className="mono" style={{ marginBottom: 14 }}>
            {cls.color ?? 'Padrão'}
          </div>
        ) : (
          <ClassColorGrid value={cls.color} onChange={(color) => onChange({ color })} />
        ))}

      <SectionHeader
        label="Atributos"
        count={cls.attributes.length}
        collapsed={attributesCollapsed}
        onToggle={() => setAttributesCollapsed((v) => !v)}
        style={{ marginTop: 16 }}
      />
      {!attributesCollapsed && (
        <>
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
        </>
      )}

      <div className="insp-section">
        <SectionHeader
          label="Relações"
          count={relationships.length}
          collapsed={relationsCollapsed}
          onToggle={() => setRelationsCollapsed((v) => !v)}
        />
        {/* TASK-055 (RN-09) — fora do `!relationsCollapsed`, de
            propósito: a seção se recolhe sozinha quando a classe tem mais
            de 6 relações, que é exatamente o caso em que ver o recorte
            isolado mais ajuda. Escondido junto, o caminho descoberto
            sumiria justo na hora em que é mais necessário. Visível
            também para `visualizador` — é leitura, não edição. */}
        <button type="button" className="btn ghost focus-open-btn" onClick={onOpenFocus}>
          Ver só as relacionadas <kbd>V</kbd>
        </button>
        {!relationsCollapsed && (
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
                  {/* TASK-049 — mesma cor do conector destacado no canvas
                      quando esta classe está selecionada (ver
                      `connectorEmphasis` em ClassDiagramCanvas.tsx): a
                      bolinha funciona como legenda das cores, sem precisar
                      de um elemento novo no canvas. */}
                  <span className={`rel-dir-dot${rel.from === cls.id ? '' : ' incoming'}`} aria-hidden="true" />
                  {rel.from === cls.id ? (
                    <span className="rel-chip-label">
                      <b>{cls.name}</b> <span className="arrow">→</span> {otherClassName(rel)}
                    </span>
                  ) : (
                    <span className="rel-chip-label">
                      {otherClassName(rel)} <span className="arrow">→</span> <b>{cls.name}</b>
                    </span>
                  )}
                  <span className="rel-kind">{RELATIONSHIP_LABELS[rel.type]}</span>
                </div>
              ))
            )}
          </div>
        )}
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

