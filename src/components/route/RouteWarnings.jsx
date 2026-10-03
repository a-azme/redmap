const ICON = { critical: '⛔', caution: '⚠️', info: 'ℹ️' };

export default function RouteWarnings({ route }) {
  if (!route) return null;
  const { warnings } = route;

  return (
    <section className="rm-card rm-warnings">
      <h3>Hazards &amp; Conditions <span className="rm-count">{warnings.length}</span></h3>
      {warnings.length === 0 && <p className="rm-muted">No hazards detected with current limits.</p>}
      <ul>
        {warnings.map((w) => (
          <li key={w.id} className={`rm-warn rm-warn--${w.severity}`}>
            <span>{ICON[w.severity]}</span>
            <div>
              <strong>{w.title}</strong>
              <small>
                {w.toKm - w.fromKm >= route.distanceKm - 1
                  ? 'Entire route'
                  : `km ${Math.round(w.fromKm)}–${Math.round(w.toKm)}`}
              </small>
              <p>{w.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}