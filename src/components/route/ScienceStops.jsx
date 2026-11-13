export default function ScienceStops({ route, selectedIds = [], onToggle }) {
  if (!route) return null;

  return (
    <section className="rm-card rm-science">
      <h3>Science Stops <span className="rm-count">{route.stops.length}</span></h3>
      {route.stops.length === 0 && <p className="rm-muted">Science stops are turned off in Route Settings.</p>}
      <ul>
        {route.stops.map((s) => {
          const on = selectedIds.includes(s.id);
          return (
            <li key={s.id} className={`rm-stop ${on ? 'is-on' : ''}`}>
              <label>
                <input type="checkbox" checked={on} onChange={() => onToggle?.(s.id)} />
                <div>
                  <strong>{s.title}</strong>
                  <small>km {s.km} · {s.elevKm.toFixed(1)} km elev · {s.lat.toFixed(2)}°, {s.lon.toFixed(1)}°E</small>
                  <p>{s.detail}</p>
                  <span className="rm-src">Data: {s.source}</span>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      {route.stops.length > 0 && <p className="rm-muted">Each selected stop adds ~0.5 sol.</p>}
    </section>
  );
}