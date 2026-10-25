import { fmtClock } from '../../lib/marsTime';
import SourceChip from './SourceChip';
import RouteWaypoints from './RouteWaypoints';
import { evaPlanText, evaPlanJson, downloadText } from '../../lib/exportRoute';

const ICON = { critical: '⛔', caution: '⚠️', info: 'ℹ️' };

function SolBar({ s }) {
  const pct = (h) => `${(Math.max(0, Math.min(24, h)) / 24) * 100}%`;
  const day = s.polarDay ? [0, 24] : s.night ? [0, 0] : [s.sunriseMars, s.sunsetMars];
  return (
    <div className="rm-eva__bar" title={`Daylight ${s.sunrise ?? '–'}–${s.sunset ?? '–'} · EVA ${s.startClock}–${s.endClock} (local solar time)`}>
      <span className="rm-eva__day" style={{ left: pct(day[0]), width: `calc(${pct(day[1])} - ${pct(day[0])})` }} />
      <span className="rm-eva__walk" style={{ left: pct(s.startMars), width: `calc(${pct(s.endMars)} - ${pct(s.startMars)})` }} />
    </div>
  );
}

export default function EvaTimeline({ route, plan, date, onDate, travel, onTravel }) {
  if (!route || !plan) return null;
  const dl = plan.daylightStart;
  const dayText = dl.polarDay ? 'Polar day' : dl.polarNight ? 'Polar night' : `${fmtClock(dl.sunrise)} – ${fmtClock(dl.sunset)}`;
  const file = `redmap-eva-${route.start.id}-${route.end.id}`;

  return (
    <section className="rm-card rm-eva">
      <h3>EVA Timeline <span className="rm-count">{plan.totalSols} sols</span></h3>

      <div className="rm-eva__controls">
        <label className="rm-field">
          <span>Mission date (Earth)</span>
          <input type="date" value={date} onChange={(e) => onDate(e.target.value)} />
        </label>
        <div className="rm-modes">
          {[['rover', 'Rover'], ['foot', 'On foot']].map(([k, label]) => (
            <button key={k} type="button" className={`rm-chip ${travel === k ? 'is-active' : ''}`} onClick={() => onTravel(k)}>{label}</button>
          ))}
        </div>
      </div>

      <dl className="rm-stats rm-eva__env">
        <div><dt>Season<SourceChip id="MARS24" /></dt><dd>Ls {plan.ls}°</dd><small className="rm-muted">{plan.season}</small></div>
        <div><dt>Daylight<SourceChip id="MARS24" /></dt><dd>{dayText}</dd><small className="rm-muted">local solar time</small></div>
        <div><dt>Radio delay<SourceChip id="EPHEM" /></dt><dd>{plan.comms.oneWayMin} min</dd><small className="rm-muted">one way · {plan.comms.distanceAU} AU</small></div>
      </dl>

      {plan.warnings.length > 0 && (
        <ul className="rm-eva__warns">
          {plan.warnings.map((w) => (
            <li key={w.title} className={`rm-warn rm-warn--${w.severity}`}>
              <span>{ICON[w.severity]}</span>
              <div><strong>{w.title}</strong><p>{w.detail}</p></div>
            </li>
          ))}
        </ul>
      )}

      <ol className="rm-eva__sols">
        {plan.sols.map((s) => (
          <li key={s.sol}>
            <div className="rm-eva__row">
              <strong>Sol {s.sol}</strong>
              <span>km {Math.round(s.startKm)}–{Math.round(s.endKm)}</span>
              <span>{s.startClock}–{s.endClock}</span>
              <span>{s.evaHours} h</span>
            </div>
            <SolBar s={s} />
            {s.stops.length > 0 && <small className="rm-muted">Stop: {s.stops.join(', ')}</small>}
          </li>
        ))}
      </ol>
      <p className="rm-muted">Bars show a 24-hour Mars day: shaded = daylight, red = EVA. Assumes {plan.travel === 'foot' ? `${plan.assumptions.footKmh} km/h walking` : `${plan.baseKmh} km/h rover`}, slowed on slopes; stops use half a sol of EVA time.</p>

      <div className="rm-eva__export">
        <button type="button" className="rm-chip" onClick={() => downloadText(`${file}.txt`, evaPlanText(route, plan))}>Mission card (.txt)</button>
        <button type="button" className="rm-chip" onClick={() => downloadText(`${file}.json`, evaPlanJson(route, plan), 'application/json')}>Data (.json)</button>
      </div>
      <RouteWaypoints route={route} embedded />
    </section>
  );
}
