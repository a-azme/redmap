import { fmtClock } from '../../lib/marsTime';
import RouteWaypoints from './RouteWaypoints';
import { evaPlanText, evaPlanJson, downloadText } from '../../lib/exportRoute';

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

function barTone(pct) {
  if (pct >= 85) return '#ff4d4d';
  if (pct >= 65) return '#f5a524';
  return '#4be08a';
}

export default function EvaTimeline({
  route,
  plan,
  date,
  onDate,
  travel,
  onTravel,
}) {
  if (!route || !plan) return null;
  const dl = plan.daylightStart;
  const dayText = dl.polarDay ? 'Polar day' : dl.polarNight ? 'Polar night' : `${fmtClock(dl.sunrise)} – ${fmtClock(dl.sunset)}`;
  const file = `redmap-eva-${route.start.id}-${route.end.id}`;
  const st = plan.suitTelemetry;
  const rv = plan.roverTelemetry;

  const walkBackPct = st ? Math.min(100, Math.round((st.worstWalkBackH / st.suitReserveH) * 100)) : 0;
  const roverEnergyPct = rv ? Math.min(100, Math.round(rv.usableUsedPct)) : 0;
  const roverPowerPct = rv ? Math.min(100, Math.round((rv.peakKw / rv.rover.maxDriveKw) * 100)) : 0;

  return (
    <section className="rm-card rm-eva">
      <h3>
        EVA Schedule &amp; Suit Load <span className="rm-count">{plan.totalSols} {plan.totalSols === 1 ? 'sol' : 'sols'}</span>
      </h3>

      <div className="rm-eva__controls">
        <label className="rm-field">
          <span>Mission date (Earth)</span>
          <input type="date" value={date} onChange={(e) => onDate(e.target.value)} />
        </label>
        <div className="rm-modes">
          {[
            ['foot', 'On Foot'],
            ['rover', 'Pressurized Rover'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`rm-chip ${travel === k ? 'is-active' : ''}`}
              onClick={() => onTravel(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <dl className="rm-stats rm-eva__env">
        <div>
          <dt>Season</dt>
          <dd>Ls {plan.ls}°</dd>
          <small className="rm-muted">{plan.season}</small>
        </div>
        <div>
          <dt>Daylight</dt>
          <dd>{dayText}</dd>
          <small className="rm-muted">local solar time</small>
        </div>
        <div>
          <dt>Radio delay</dt>
          <dd>{plan.comms.oneWayMin} min</dd>
          <small className="rm-muted">one way · {plan.comms.distanceAU} AU</small>
        </div>
        {plan.thermal && (
          <div>
            <dt>Surface Temp</dt>
            <dd>
              {plan.thermal.dayMaxC}° / {plan.thermal.nightMinC}°C
            </dd>
            <small className="rm-muted">{plan.thermal.instrument} (Day/Night)</small>
          </div>
        )}
      </dl>

      {/* Newtonian Mars Rover Propulsion & Battery Telemetry (shown when Pressurized Rover is active) */}
      {travel === 'rover' && rv && (
        <div className="rm-plss rm-rover-box">
          <div className="rm-plss__head">
            <strong>Newtonian Rover Dynamics</strong>
            <small className="rm-muted">
              {rv.rover.massKg} kg · 3.71 m/s² · Crr {rv.rover.crr}
            </small>
          </div>

          <ul className="rm-plss__bars">
            <li>
              <div className="rm-plss__label">
                <span>Drive Energy (Usable)</span>
                <b>
                  {rv.totalKwh} / {rv.usableKwh} kWh ({Math.round(rv.usableUsedPct)}%)
                </b>
              </div>
              <div className="rm-riskbar">
                <i style={{ width: `${roverEnergyPct}%`, background: barTone(roverEnergyPct) }} />
              </div>
            </li>
            <li>
              <div className="rm-plss__label">
                <span>Peak Climb Power (km {rv.peakAtKm})</span>
                <b>
                  {rv.peakKw} / {rv.rover.maxDriveKw} kW ({roverPowerPct}%)
                </b>
              </div>
              <div className="rm-riskbar">
                <i style={{ width: `${roverPowerPct}%`, background: barTone(roverPowerPct) }} />
              </div>
            </li>
            <li>
              <div className="rm-plss__label">
                <span>Return Drive to Habitat</span>
                <b>
                  {rv.returnFromEndKwh} kWh · {rv.pnrKm === null ? 'Full Return Covered' : `PNR at km ${rv.pnrKm}`}
                </b>
              </div>
            </li>
          </ul>

          <details className="rm-rover__details">
            <summary>
              Vehicle Specs &amp; Safe Halt Stops ({rv.safeStops?.length || 0})
            </summary>
            <div className="rm-rover__meta">
              <span>Pack: {rv.rover.batteryKwh} kWh ({rv.rover.reservePct}% reserve)</span>
              <span>Drivetrain: {Math.round(rv.rover.drivetrainEff * 100)}% eff · {Math.round(rv.rover.regenEff * 100)}% regen</span>
              <span>Hotel load: {rv.rover.hotelW} W continuous</span>
            </div>
            {rv.safeStops?.length > 0 && (
              <ul className="rm-rover__stops">
                {rv.safeStops.map((stop, idx) => (
                  <li key={`${stop.label}-${idx}`}>
                    <strong>{stop.label}</strong>
                    <span>
                      km {stop.km} · {stop.slopeDeg}° · {stop.batteryLeftPct}% bat left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
      )}

      {/* Peak Sol Suit Consumables */}
      {st && (
        <div className="rm-plss">
          <div className="rm-plss__head">
            <strong>Peak Sol Suit Consumables</strong>
            <small className="rm-muted">
              {plan.payloadKg} kg gear · {plan.baseKmh} km/h pace
            </small>
          </div>

          <ul className="rm-plss__bars">
            <li>
              <div className="rm-plss__label">
                <span>Oxygen Supply</span>
                <b>{st.peakO2Kg} / {st.o2CapacityKg} kg ({st.peakO2Pct}%)</b>
              </div>
              <div className="rm-riskbar">
                <i style={{ width: `${st.peakO2Pct}%`, background: barTone(st.peakO2Pct) }} />
              </div>
            </li>
            <li>
              <div className="rm-plss__label">
                <span>Cooling Water</span>
                <b>{st.peakWaterL} / {st.waterCapacityL} L ({st.peakWaterPct}%)</b>
              </div>
              <div className="rm-riskbar">
                <i style={{ width: `${st.peakWaterPct}%`, background: barTone(st.peakWaterPct) }} />
              </div>
            </li>
            <li>
              <div className="rm-plss__label">
                <span>Suit Battery</span>
                <b>{st.peakBatteryWh} / {st.batteryCapacityWh} Wh ({st.peakBatteryPct}%)</b>
              </div>
              <div className="rm-riskbar">
                <i style={{ width: `${st.peakBatteryPct}%`, background: barTone(st.peakBatteryPct) }} />
              </div>
            </li>
            <li>
              <div className="rm-plss__label">
                <span>Walk-Back Reserve</span>
                <b>{st.worstWalkBackH} h / {st.suitReserveH} h limit</b>
              </div>
              <div className="rm-riskbar">
                <i style={{ width: `${walkBackPct}%`, background: barTone(walkBackPct) }} />
              </div>
            </li>
          </ul>
        </div>
      )}

      <ol className="rm-eva__sols">
        {plan.sols.map((s) => (
          <li key={s.sol}>
            <div className="rm-eva__row">
              <strong>Sol {s.sol}</strong>
              <span>km {s.startKm}–{s.endKm}</span>
              <span>{s.startClock}–{s.endClock}</span>
              <span>{s.evaHours} h</span>
            </div>
            <SolBar s={s} />
            {s.stops.length > 0 && <small className="rm-muted">Stop: {s.stops.join(', ')}</small>}
          </li>
        ))}
      </ol>

      <div className="rm-eva__export">
        <button type="button" className="rm-chip" onClick={() => downloadText(`${file}.txt`, evaPlanText(route, plan))}>Export (.txt)</button>
        <button type="button" className="rm-chip" onClick={() => downloadText(`${file}.json`, evaPlanJson(route, plan), 'application/json')}>Export (.json)</button>
      </div>
      <details className="rm-eva__wpdetails">
        <summary>Waypoints ({route.waypoints?.length || 0})</summary>
        <RouteWaypoints route={route} embedded />
      </details>
    </section>
  );
}
