import { HAZARD_LEGENDS } from '../../lib/hazardImage';

const HAZARDS = [
  ['off', 'Off'],
  ['slope', 'Slope Risk'],
  ['low', 'Low Ground'],
  ['keep', 'No-Go Zones'],
];

/** Explains the route: interactive hazard overlay, straight-line comparison, and detour rationale. */
export default function RouteWhy({ route, hazard, onHazard }) {
  const why = route?.why;
  if (!why) return null;
  const { direct, actual, reasons } = why;
  const rows = [
    ['Steepest slope', `${direct.maxSlopeDeg}°`, `${actual.maxSlopeDeg}°`],
    ['Lowest dip', `${direct.maxDepthKm} km`, `${actual.maxDepthKm} km`],
    ['Climbing', `${direct.climbKm} km`, `${actual.climbKm} km`],
    ['Distance', `${direct.km.toFixed(1)} km`, `${route.distanceKm} km`],
  ];
  const legend = HAZARD_LEGENDS[hazard];
  const terrainReasons = (reasons || []).filter((r) => r.type !== 'science');

  return (
    <section className="rm-card rm-why">
      {/* Pinned Top Control: Interactive Terrain Hazard Overlay */}
      {route.hazard && (
        <div className="rm-why__layers rm-why__layers--top">
          <div className="rm-why__layerhead">
            <strong>Terrain Hazard Overlay</strong>
          </div>
          <div className="rm-modes">
            {HAZARDS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`rm-chip ${hazard === k ? 'is-active' : ''}`}
                onClick={() => onHazard(k)}
              >
                {label}
              </button>
            ))}
          </div>
          {legend?.gradient && (
            <div className="rm-legend">
              <div className="rm-legend__bar" style={{ background: legend.gradient }} />
              <div className="rm-legend__labels">
                {legend.stops.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {legend?.swatches && (
            <ul className="rm-swatches">
              {legend.swatches.map(([c, label]) => (
                <li key={label}>
                  <i style={{ background: c }} />
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h3>Why This Route</h3>

      <table className="rm-why__table">
        <thead>
          <tr>
            <th />
            <th>Straight line</th>
            <th>Planned route</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, a, b]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{a}</td>
              <td>
                <strong>{b}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {terrainReasons.length > 0 && (
        <ol className="rm-why__list">
          {terrainReasons.map((r) => (
            <li key={r.n}>
              <span className="rm-wp__n">{r.n}</span>
              <div>
                {r.text}
                {r.extraKm > 0 && <small> +{r.extraKm} km</small>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
