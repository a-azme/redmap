import SourceChip from './SourceChip';
import { HAZARD_LEGENDS } from '../../lib/hazardImage';

const HAZARDS = [['off', 'Off'], ['slope', 'Slope risk'], ['low', 'Low ground'], ['keep', 'No-go zones']];

/** Explains the route: what a straight line would have met, why each bend exists, how the mode weighs terrain. */
export default function RouteWhy({ route, hazard, onHazard, plan }) {
  const why = route?.why;
  if (!why) return null;
  const { direct, actual, reasons, cost } = why;
  const rows = [
    ['Steepest slope', `${direct.maxSlopeDeg}°`, `${actual.maxSlopeDeg}°`],
    ['Lowest dip', `${direct.maxDepthKm} km`, `${actual.maxDepthKm} km`],
    ['Climbing', `${direct.climbKm} km`, `${actual.climbKm} km`],
    ['Distance', `${direct.km.toFixed(0)} km`, `${route.distanceKm} km`],
  ];
  const legend = HAZARD_LEGENDS[hazard];
  const parts = route.riskParts?.filter((p) => p.points > 0.4) ?? [];
  const maxPart = Math.max(...parts.map((p) => p.points), 1);
  const weak = (route.legs ?? []).filter((l) => l.level !== 'low').sort((a, b) => b.risk - a.risk).slice(0, 4);
  const schedule = (plan?.warnings ?? []).filter((w) => /dust|sunset|dark|night|light/i.test(`${w.title} ${w.detail}`));

  return (
    <section className="rm-card rm-why">
      <h3>Why this route <SourceChip id="MOLA" /></h3>

      <table className="rm-why__table">
        <thead><tr><th /><th>Straight line</th><th>This route</th></tr></thead>
        <tbody>
          {rows.map(([k, a, b]) => (
            <tr key={k}><td>{k}</td><td>{a}</td><td><strong>{b}</strong></td></tr>
          ))}
        </tbody>
      </table>
      <h4>Risk <span className={`rm-risk rm-risk--${route.riskLabel.toLowerCase()}`}>{route.riskLabel} · {route.riskIsMinimum ? '≥ ' : ''}{route.risk}/100</span></h4>
      {parts.length === 0 ? (
        <p className="rm-muted">Nothing is pushing the score up on this route.</p>
      ) : (
        <ul className="rm-riskbars">
          {parts.map((p) => (
            <li key={p.key}>
              <div><strong>{p.label}</strong><small>{p.detail}</small></div>
              <span className="rm-riskbar"><i style={{ width: `${(p.points / maxPart) * 100}%` }} /></span>
              <b>+{Math.round(p.points)}</b>
            </li>
          ))}
        </ul>
      )}
      {parts[0] && <p className="rm-muted"><strong>Biggest lever:</strong> {parts[0].tip}</p>}
      {weak.length > 0 && (
        <>
          <h4>Weakest legs</h4>
          <ul className="rm-legrisk">
            {weak.map((l) => (
              <li key={`${l.fromKm}-${l.toKm}`}>
                <span className={`rm-dot rm-dot--${l.level}`} />
                {l.from} → {l.to} <small>km {l.fromKm}–{l.toKm} · up to {l.maxSlopeDeg.toFixed(0)}°{l.retraceable ? '' : ' · hard to retrace'}</small>
              </li>
            ))}
          </ul>
          <p className="rm-muted">Scout these on HiRISE or CTX imagery before committing, and keep a fall-back plan for the crew.</p>
        </>
      )}
      {schedule.length > 0 && (
        <p className="rm-muted"><strong>Schedule:</strong> {schedule.map((w) => w.title).join(', ')} (see the EVA timeline).</p>
      )}

      <p className="rm-muted">
        {why.extraKm > 0.5
          ? `The detour adds ${why.extraKm} km (${((why.extraKm / Math.max(1, direct.km)) * 100).toFixed(1)}%) to avoid the hazards the straight line meets.`
          : 'The terrain here is easy enough that a near-straight path is also the safest.'}
      </p>

      {reasons.length > 0 && (
        <ol className="rm-why__list">
          {reasons.map((r) => (
            <li key={r.n}>
              <span className="rm-wp__n">{r.n}</span>
              <div>
                {r.text} <SourceChip id={r.source} />
                {r.extraKm > 0 && r.type !== 'science' && <small> +{r.extraKm} km</small>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {why.keepOut?.on && (
        <p className={`rm-muted ${why.keepOut.crossed ? 'rm-why__alert' : ''}`}>
          No-go zones cover {why.keepOut.areaPct}% of the map ({why.keepOut.limits.steepDeg}° walls, pits over {why.keepOut.limits.lowKm} km deep, {why.keepOut.limits.bumpDeg}° local bumps).{' '}
          {why.keepOut.crossed
            ? `No way round ${why.keepOut.crossedKind ?? 'them'} was found, so this route crosses one.`
            : 'This route stays out of all of them.'}
        </p>
      )}
      <p className="rm-muted">
        <strong>{route.settings.mode}</strong> mode: hard limit {cost.maxSlope}° · slope penalty ×{cost.slopeWeight} · rugged ground ×{cost.roughWeight ?? 0} · low spots {cost.lowGroundOn ? `×${cost.lowWeight}` : 'ignored'} · each 1 km of climbing costs {cost.climbKmPerKm} km.
      </p>

      {route.hazard && (
        <div className="rm-why__layers">
          <span className="rm-muted">Show on map</span>
          <div className="rm-modes">
            {HAZARDS.map(([k, label]) => (
              <button key={k} type="button" className={`rm-chip ${hazard === k ? 'is-active' : ''}`} onClick={() => onHazard(k)}>{label}</button>
            ))}
          </div>
          {legend?.gradient && (
            <div className="rm-legend">
              <div className="rm-legend__bar" style={{ background: legend.gradient }} />
              <div className="rm-legend__labels">{legend.stops.map((s) => <span key={s}>{s}</span>)}</div>
            </div>
          )}
          {legend?.swatches && (
            <ul className="rm-swatches">
              {legend.swatches.map(([c, label]) => <li key={label}><i style={{ background: c }} />{label}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
