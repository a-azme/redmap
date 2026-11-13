import { computeAbortTelemetry } from '../../lib/evaPlan'

export default function AbortProtocolCard({
  route,
  plan,
  spaceWeather,
  scrubPoint = null,
  onLocateShelter,
}) {
  if (!route || !plan) return null

  const abort = computeAbortTelemetry(route, plan, scrubPoint, spaceWeather)
  if (!abort) return null

  const shelter = route.shelterPoint
  const isScrubbing = Boolean(scrubPoint)

  return (
    <section className="rm-card rm-abort">
      <div className="rm-abort__head">
        <div>
          <h3>Emergency Abort &amp; Shelter</h3>
          <small className="rm-muted">
            {isScrubbing
              ? `Live telemetry at km ${abort.km} (Sol ${abort.sol})`
              : `Mid-route Point-of-No-Return check (km ${abort.km}, Sol ${abort.sol})`}
          </small>
        </div>
        <span className={`rm-pnr-badge rm-pnr-badge--${abort.pnrTone}`}>
          {abort.pnrStatus}
        </span>
      </div>

      <p className="rm-abort__reason">{abort.pnrReason}</p>

      <div className="rm-abort__grid">
        <div className="rm-abort__cell">
          <small>WALK-BACK TO CAMP</small>
          <strong>
            {abort.walkBackMin} min ({abort.nearestCampKm} km)
          </strong>
          <span>{abort.nearestCampLabel}</span>
        </div>

        <div className="rm-abort__cell">
          <small>POST-ABORT O₂ MARGIN</small>
          <strong>
            {abort.postAbortO2Pct}% ({Math.max(0, +(abort.remO2Kg - abort.walkBackO2Kg).toFixed(2))} kg)
          </strong>
          <span>Needs {abort.walkBackO2Kg} kg O₂ to return</span>
        </div>

        <div className="rm-abort__cell">
          <small>RADIATION SHELTER ETA</small>
          <strong>
            {abort.shelterEtaMin} min ({abort.shelterDistKm} km)
          </strong>
          <span>
            {shelter ? `-${shelter.shieldingPct}% dose (${plan.shieldedRadiationMsv} mSv)` : 'Local trough'}
          </span>
        </div>

        <div className="rm-abort__cell">
          <small>DONKI &amp; AUTONOMY</small>
          <strong>
            {spaceWeather?.alertLevel || 'NOMINAL'} · {plan.doseMsvPerSol} mSv/sol
          </strong>
          <span>{plan.comms.roundTripMin} min round-trip comms</span>
        </div>
      </div>

      {shelter && (
        <div className="rm-abort__shelter">
          <div>
            <strong>
              Shelter at km {shelter.km}: {shelter.feature}
            </strong>
            <small>
              {shelter.elevKm} km elev · {shelter.slopeDeg}° wall slope · cuts sky radiation exposure by{' '}
              {shelter.shieldingPct}%
            </small>
          </div>
          {onLocateShelter && (
            <button
              type="button"
              onClick={onLocateShelter}
              className="rm-chip rm-abort__btn"
            >
              Locate Shelter
            </button>
          )}
        </div>
      )}
    </section>
  )
}
