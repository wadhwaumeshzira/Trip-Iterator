export function LoadingState() {
  return (
    <div className="status-panel" role="status" aria-live="polite">
      <div className="loading-route" aria-hidden="true">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
      <p className="status-title">Charting the route</p>
      <p className="status-body">The model is putting your itinerary together. This usually takes a few seconds.</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="status-panel status-panel--error" role="alert">
      <p className="status-title">The itinerary didn't come through</p>
      <p className="status-body">{message || "The model returned something the app couldn't use."}</p>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="status-panel status-panel--empty">
      <p className="status-title">No trip yet</p>
      <p className="status-body">Describe a trip above and the itinerary will show up here, day by day.</p>
    </div>
  );
}
