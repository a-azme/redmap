import { MODES, MODE_COLORS } from '../../lib/routeAnalysis.js';

const ROWS = [
  ['Distance', (r) => `${r.distanceKm} km`],
  ['Time', (r) => `${r.sols} sols`],
  ['Max slope', (r) => `${r.maxSlopeDeg.toFixed(0)}°`],
  ['Climb', (r) => `+${r.elevationGainKm} km`],
  ['Risk', (r) => `${r.riskLabel} · ${r.riskIsMinimum ? '≥ ' : ''}${r.risk}`],
  ['Science sites', (r) => r.stops.length],
];

/** Fastest / safest / most-scientific side by side. Click a column to make it the active route. */
export default function RouteCompare({ routes, current, onSelect }) {
  if (!routes || !current) return null;
  const modes = Object.keys(MODES);

  return (
    <section className="rm-card rm-compare">
      <h3>Compare Routes</h3>
      <table>
        <thead>
          <tr>
            <th />
            {modes.map((m) => (
              <th key={m}>
                <button
                  type="button"
                  disabled={!routes[m] || !!routes[m]?.error}
                  className={`rm-compare__mode ${current.mode === m ? 'is-active' : ''}`}
                  onClick={() => onSelect(routes[m])}
                >
                  <i style={{ background: MODE_COLORS[m] }} />
                  {MODES[m].label.replace(' Route', '')}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, fmt]) => (
            <tr key={label}>
              <td>{label}</td>
              {modes.map((m) => (
                <td key={m} className={current.mode === m ? 'is-active' : ''}>
                  {!routes[m] ? '…' : routes[m].error ? '–' : fmt(routes[m])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {modes.some((m) => routes[m]?.error) && (
        <p className="rm-muted">
          {modes.filter((m) => routes[m]?.error).map((m) => `${MODES[m].label}: ${routes[m].error}`).join(' ')}
        </p>
      )}
      {modes.some((m) => !routes[m]) && <p className="rm-muted">Planning the other modes…</p>}
      <p className="rm-muted">The map shows the selected route. Click a column to switch.</p>
    </section>
  );
}
