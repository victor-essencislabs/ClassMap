// Botão "i" de ajuda contextual — informa o que um termo/campo significa
// ao passar o mouse (tooltip nativa do navegador via `title`, sem
// depender de nenhuma lib nova). Primeiro uso: explicar "estereótipo"
// UML ao lado do campo, no inspector do Diagrama de Classes.
export function InfoTooltip({ text }: { text: string }) {
  return (
    <button type="button" className="info-tooltip" title={text} aria-label={text} tabIndex={0}>
      i
    </button>
  )
}
