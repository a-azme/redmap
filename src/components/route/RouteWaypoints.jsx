import SourceChip from './SourceChip';

/** Numbered navigation waypoints for the planned route: the list a crew would read out. */
export default function RouteWaypoints({ route }) {
  if (!route?.waypoints?.length) return null;
  const legs = route.legs ?? [];
  const legInfo = (i) => {
    const l = legs[i];
    return l ? ` · leg ${l.km.toFixed(0)} km${l.retraceable ? '' : ' · hard to retrace'}` : '';
  };
  const ns = (lat) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;

  return (
    <section className="rm-card rm-waypoints">
      <h3>Waypoints <span className="rm-count">{route.waypoints.length}</span> {route.dataSource?.real && <SourceChip id="MOLA" />}</h3>
      <ol>
        <li><span className="rm-wp__n rm-wp__n--start">S</span><div><strong>{route.start.name}</strong><small>Start · {ns(route.start.lat)}, {route.start.lon.toFixed(2)}°E{legInfo(0)}</small></div></li>
        {route.waypoints.map((w, i) => (
          <li key={w.n}>
            <span className={`rm-wp__n ${w.kind === 'checkpoint' ? 'rm-wp__n--cp' : ''}`}>{w.n}</span>
            <div>
              <strong>{w.kind === 'stop' ? w.name : w.kind === 'checkpoint' ? `Checkpoint ${w.n}` : `Waypoint ${w.n}`}</strong>
              <small>km {w.km} · {ns(w.lat)}, {w.lon.toFixed(2)}°E{w.elevKm != null && ` · ${w.elevKm} km elev`}{w.kind === 'stop' ? ' · science stop' : w.kind === 'checkpoint' ? ' · regular check-in' : ' · change of direction'}{legInfo(i + 1)}</small>
            </div>
          </li>
        ))}
        <li><span className="rm-wp__n rm-wp__n--end">E</span><div><strong>{route.end.name}</strong><small>Destination · km {route.distanceKm}</small></div></li>
      </ol>
    </section>
  );
}
