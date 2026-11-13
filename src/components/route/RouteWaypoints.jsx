import SourceChip from './SourceChip';

const Wrap = ({ embedded, children }) => (embedded ? <div className="rm-waypoints rm-waypoints--embedded">{children}</div> : <section className="rm-card rm-waypoints">{children}</section>);

/** Numbered navigation waypoints for the planned route: the list a crew would read out. */
export default function RouteWaypoints({ route, embedded = false }) {
  if (!route?.waypoints?.length) return null;
  const legs = route.legs ?? [];
  const legInfo = (i) => {
    const l = legs[i];
    return l ? ` · leg ${l.km.toFixed(0)} km${l.retraceable ? '' : ' · hard to retrace'}` : '';
  };
  const dot = (i) => (legs[i] ? <span className={`rm-dot rm-dot--${legs[i].level}`} title={`Next leg: ${legs[i].level} risk`} /> : null);
  const ns = (lat) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;

  return (
    <Wrap embedded={embedded}>
      <h3>Waypoints <span className="rm-count">{route.waypoints.length}</span> {route.dataSource?.real && <SourceChip id="MOLA" />}</h3>
      <ol>
        <li><span className="rm-wp__n rm-wp__n--start">S</span><div><strong>{dot(0)}{route.start.name}</strong><small>Start · {ns(route.start.lat)}, {route.start.lon.toFixed(2)}°E{legInfo(0)}</small></div></li>
        {route.waypoints.map((w, i) => (
          <li key={w.n}>
            <span className={`rm-wp__n`}>{w.n}</span>
            <div>
              <strong>{dot(i + 1)}{w.kind === 'stop' ? w.name : `Waypoint ${w.n}`}</strong>
              <small>km {w.km} · {ns(w.lat)}, {w.lon.toFixed(2)}°E{w.elevKm != null && ` · ${w.elevKm} km elev`}{w.kind === 'stop' ? ' · science stop' : ' · change of direction'}{legInfo(i + 1)}</small>
            </div>
          </li>
        ))}
        <li><span className="rm-wp__n rm-wp__n--end">E</span><div><strong>{route.end.name}</strong><small>Destination · km {route.distanceKm}</small></div></li>
      </ol>
    </Wrap>
  );
}
