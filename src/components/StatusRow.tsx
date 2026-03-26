interface StatusRowProps {
  isOffline: boolean
  canShowIosHint: boolean
  installMessage: string
}

export function StatusRow({
  isOffline,
  canShowIosHint,
  installMessage,
}: StatusRowProps) {
  return (
    <section className="status-row">
      <p className={`status ${isOffline ? 'offline' : 'online'}`}>
        {isOffline ? 'Offline mode active' : 'Online mode active'}
      </p>
      {canShowIosHint ? (
        <p className="install-hint">iOS Safari: Share, then Add to Home Screen</p>
      ) : null}
      {installMessage ? <p className="install-note">{installMessage}</p> : null}
    </section>
  )
}
