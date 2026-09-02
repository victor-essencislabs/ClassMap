// TASK-047 — faixa de aviso "atualizado por outra pessoa" (ver
// `useDiagramRemoteUpdate`). Nunca auto-dispensa (diferente do
// `Toast`) — fica até a pessoa decidir recarregar ou ignorar, porque
// é uma decisão dela, não um feedback passageiro.
export function RemoteUpdateBanner({ onReload, onDismiss }: { onReload: () => void; onDismiss: () => void }) {
  return (
    <div className="remote-update-banner" role="status">
      <span>Este diagrama foi atualizado por outra pessoa.</span>
      <div className="remote-update-banner-actions">
        <button type="button" className="btn primary" onClick={onReload}>
          Recarregar
        </button>
        <button type="button" className="link-button" onClick={onDismiss}>
          Ignorar por agora
        </button>
      </div>
    </div>
  )
}
