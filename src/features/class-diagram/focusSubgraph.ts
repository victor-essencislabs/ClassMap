// TASK-055 — recorte de foco: a classe selecionada, as classes
// diretamente relacionadas a ela, e as relações entre todas essas.
//
// Lógica pura, sem React (mesmo padrão de `contentOperations.ts`) por dois
// motivos: é onde mora a regra (o componente é casca), e a TASK-056
// (criar um diagrama novo com o mesmo recorte) precisa chamar isto fora de
// qualquer contexto de renderização. As duas tasks compartilham este
// módulo de propósito — se cada uma calculasse o recorte por conta
// própria, o `V` mostraria um conjunto e o `N` criaria outro.
import { CLASS_CARD_WIDTH, type ClassDiagramContent, type DiagramClass, type DiagramRelationship } from './types'

/** Altura fixa do card no modal de foco — o card lá é compacto
 * (`ClassCard compact`: cabeçalho + contagem de atributos), não a lista
 * inteira. Achado validando ao vivo contra o diagrama real do ELIMS: com
 * a altura estimada pelos atributos, uma classe de 97 atributos vira um
 * card de ~2000px, o enquadramento encolhe o recorte inteiro e nada fica
 * legível — o recorte deixava de responder a pergunta que ele existe para
 * responder. Card de altura fixa e pequena é o que faz 21 vizinhas
 * caberem lado a lado.
 *
 * `.node-box.compact` (`src/index.css`) fixa esta altura em CSS e esconde
 * o estereótipo, para o card compacto ter SEMPRE esta altura — assim um
 * único número serve para o empilhamento, para os bounds e para a âncora
 * do conector (`Connector cardHeight`), em vez de três estimativas que
 * podem divergir. É a mesma altura que `estimateClassCardHeight` daria a
 * um card de um atributo só, que é exatamente a forma dele. */
export const FOCUS_CARD_HEIGHT = 56

export interface FocusSubgraph {
  /** A classe focada e as diretamente relacionadas a ela. Posições ainda
   * são as do diagrama de origem — `layoutFocusSubgraph` reposiciona. */
  classes: DiagramClass[]
  relationships: DiagramRelationship[]
  focusClassId: string
}

/** De que lado do centro uma vizinha é desenhada. `outgoing` = a classe
 * focada aponta para ela (`from` = foco); `incoming` = ela aponta para a
 * focada (`to` = foco). Uma vizinha que é as duas coisas conta como
 * `outgoing` (RN-08) — um card por classe, nunca duplicado. */
type NeighborSide = 'incoming' | 'outgoing'

/** Monta o subgrafo INDUZIDO da classe focada: ela + as vizinhas diretas +
 * **todas** as relações cujas duas pontas estão nesse conjunto — inclusive
 * relações entre duas vizinhas (RN-02). Omitir essas últimas produziria um
 * desenho que mente sobre o modelo: duas classes lado a lado que na
 * verdade se relacionam apareceriam soltas.
 *
 * Retorna `null` quando a classe focada não existe no conteúdo (ex.: foi
 * excluída entre a seleção e a abertura do modal) — cabe ao chamador
 * decidir o que fazer, em vez de devolver um recorte vazio silencioso. */
export function buildFocusSubgraph(content: ClassDiagramContent, focusClassId: string): FocusSubgraph | null {
  const focusClass = content.classes.find((c) => c.id === focusClassId)
  if (!focusClass) return null

  const includedIds = new Set<string>([focusClassId])
  for (const rel of content.relationships) {
    // Autorrelação (`from === to === foco`) não acrescenta ninguém — o
    // `Set` já cuida disso, mas a relação em si entra normalmente abaixo
    // (as duas pontas estão no conjunto) e é desenhada como qualquer
    // outra (RN-06).
    if (rel.from === focusClassId) includedIds.add(rel.to)
    if (rel.to === focusClassId) includedIds.add(rel.from)
  }

  return {
    focusClassId,
    // Preserva a ordem original de `content.classes` — sem embaralhar o
    // que o usuário já conhece.
    classes: content.classes.filter((c) => includedIds.has(c.id)),
    relationships: content.relationships.filter((r) => includedIds.has(r.from) && includedIds.has(r.to)),
    // ...notas de propósito fora: uma nota é anotação livre no canvas, sem
    // vínculo com nenhuma classe (ADR-013) — não há critério para dizer
    // que ela pertence ao recorte.
  }
}

/** Espaço horizontal entre o fim de uma coluna e o começo da próxima. */
const COLUMN_GAP = 150
/** Espaço vertical entre dois cards da mesma coluna. */
const ROW_GAP = 26
/** Acima disto, o lado se quebra em mais de uma coluna. Uma coluna única
 * com as 21 vizinhas de uma classe central do ELIMS produz um recorte
 * altíssimo e estreito, que o enquadramento só resolve encolhendo tudo —
 * o mesmo problema de proporção que a ADR-012 resolveu no layout de
 * import, aqui na escala de um recorte. */
const MAX_ROWS_PER_COLUMN = 7
/** Teto de colunas por lado: passando disto, o recorte fica largo demais
 * para caber sem encolher, e o ganho vira perda. */
const MAX_COLUMNS_PER_SIDE = 3

function columnHeight(count: number): number {
  if (count === 0) return 0
  return count * FOCUS_CARD_HEIGHT + ROW_GAP * (count - 1)
}

/** Quebra um lado em colunas equilibradas (nunca uma coluna cheia e outra
 * com um card só) e devolve, para cada uma, a lista que ela recebe. */
function splitIntoColumns(classes: DiagramClass[]): DiagramClass[][] {
  if (classes.length === 0) return []
  const count = Math.min(MAX_COLUMNS_PER_SIDE, Math.max(1, Math.ceil(classes.length / MAX_ROWS_PER_COLUMN)))
  const perColumn = Math.ceil(classes.length / count)
  const columns: DiagramClass[][] = []
  for (let i = 0; i < classes.length; i += perColumn) {
    columns.push(classes.slice(i, i + perColumn))
  }
  return columns
}

/** Empilha uma coluna verticalmente, centrada na altura total do recorte. */
function stackColumn(classes: DiagramClass[], x: number, totalHeight: number): DiagramClass[] {
  let y = (totalHeight - columnHeight(classes.length)) / 2
  return classes.map((cls) => {
    const positioned = { ...cls, x, y }
    y += FOCUS_CARD_HEIGHT + ROW_GAP
    return positioned
  })
}

/** Reposiciona o recorte num layout próprio, legível sem pan: classe
 * focada ao centro, quem aponta para ela à esquerda, para quem ela aponta
 * à direita. Origem em (0,0) — quem renderiza calcula os bounds e a
 * escala.
 *
 * **Nunca muta a entrada** (RN-01): devolve cópias das classes com `x`/`y`
 * novos. As posições reais do diagrama de origem continuam intactas.
 *
 * `controlX` de cada relação também é recalculado (RN-06) — reaproveitar o
 * `controlX` do diagrama de origem com posições novas põe o cotovelo do
 * conector em lugar absurdo. */
export function layoutFocusSubgraph(subgraph: FocusSubgraph): FocusSubgraph {
  const { focusClassId } = subgraph
  const focusClass = subgraph.classes.find((c) => c.id === focusClassId)
  if (!focusClass) return subgraph

  const sideById = new Map<string, NeighborSide>()
  for (const rel of subgraph.relationships) {
    // Só relações que TOCAM a classe focada definem lado. Uma relação
    // entre duas vizinhas não diz nada sobre de que lado do foco elas
    // ficam.
    if (rel.from === focusClassId && rel.to !== focusClassId) {
      sideById.set(rel.to, 'outgoing') // vence sobre 'incoming' já anotado (RN-08)
    } else if (rel.to === focusClassId && rel.from !== focusClassId) {
      if (!sideById.has(rel.from)) sideById.set(rel.from, 'incoming')
    }
  }

  // Ordem alfabética dentro de cada coluna: previsível para quem lê e
  // estável entre aberturas do modal (a ordem de `content.classes` segue a
  // ordem de criação, que não diz nada para quem está olhando).
  const byName = (a: DiagramClass, b: DiagramClass) => a.name.localeCompare(b.name)
  const incoming = subgraph.classes.filter((c) => sideById.get(c.id) === 'incoming').sort(byName)
  const outgoing = subgraph.classes.filter((c) => sideById.get(c.id) === 'outgoing').sort(byName)

  const columnStep = CLASS_CARD_WIDTH + COLUMN_GAP
  const leftColumns = splitIntoColumns(incoming)
  const rightColumns = splitIntoColumns(outgoing)

  // Sem vizinhas à esquerda, a coluna do centro encosta na origem — não
  // deixa uma faixa vazia do lado esquerdo do modal.
  const centerX = leftColumns.length * columnStep

  const totalHeight = Math.max(
    ...leftColumns.map((c) => columnHeight(c.length)),
    ...rightColumns.map((c) => columnHeight(c.length)),
    FOCUS_CARD_HEIGHT,
  )

  const positioned = [
    // A coluna mais próxima do centro é a primeira do lado esquerdo, para
    // as vizinhas ficarem "lendo" na direção do foco.
    ...leftColumns.flatMap((column, i) => stackColumn(column, (leftColumns.length - 1 - i) * columnStep, totalHeight)),
    ...stackColumn([focusClass], centerX, totalHeight),
    ...rightColumns.flatMap((column, i) => stackColumn(column, centerX + (i + 1) * columnStep, totalHeight)),
  ]
  const positionById = new Map(positioned.map((c) => [c.id, c]))

  return {
    focusClassId,
    // Preserva a ordem de entrada; só as posições mudam.
    classes: subgraph.classes.map((c) => positionById.get(c.id) ?? c),
    relationships: subgraph.relationships.map((rel) => {
      const from = positionById.get(rel.from)
      const to = positionById.get(rel.to)
      if (!from || !to) return rel
      return { ...rel, controlX: controlXBetween(from, to) }
    }),
  }
}

/** x do segmento vertical do conector ortogonal. Entre colunas
 * diferentes, o meio do vão. Na mesma coluna (duas vizinhas do mesmo lado,
 * ou uma autorrelação), o meio cairia dentro dos próprios cards — o
 * cotovelo vai para fora, à direita da coluna. */
function controlXBetween(from: DiagramClass, to: DiagramClass): number {
  if (Math.abs(from.x - to.x) < 1) return from.x + CLASS_CARD_WIDTH + COLUMN_GAP / 3
  return (from.x + to.x) / 2 + CLASS_CARD_WIDTH / 2
}

/** Conveniência para os dois consumidores (modal da TASK-055, criação de
 * diagrama da TASK-056): monta e posiciona de uma vez. */
export function focusSubgraphFor(content: ClassDiagramContent, focusClassId: string): FocusSubgraph | null {
  const subgraph = buildFocusSubgraph(content, focusClassId)
  return subgraph ? layoutFocusSubgraph(subgraph) : null
}
