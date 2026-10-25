import { totalSols } from './routeUtils';
import LocationThumb from '../map/LocationThumb'
import SourceChip from './SourceChip'

export default function RouteOverview({ route, plan = null, selectedStopIds = [] }) {
  if (!route) {
    return (
      <section className="rm-card">
        <h3>Route Overview</h3>
        <p className="rm-muted">Choose a start and destination, then press Plan Route.</p>
      </section>
    );
  }

  // chip = where the number comes from; simulated terrain is a model, not a measurement
  const real = route.dataSource?.real;
  const stats = [
    ['Total Distance', `~ ${route.distanceKm.toLocaleString()} km`, real ? 'MOLA' : 'MODEL'],
    ['Estimated Time', `~ ${plan ? plan.totalSols : totalSols(route, selectedStopIds)} sols`, 'MODEL'],
    ['Elevation Gain', `+${route.elevationGainKm} km`, real ? 'MOLA' : 'MODEL'],
    ['Max Slope', `${route.maxSlopeDeg.toFixed(0)}°`, real ? 'MOLA' : 'MODEL'],
    ['Coldest (est.)', `${route.minTempC}°C`, 'MODEL'],
    ['Radiation dose', `≈ ${plan ? plan.radiationMsv : route.radiationMsv} mSv`, 'MSL RAD'],
  ];
  const src = route.dataSource;

  return (
    <section className="rm-card rm-overview">
      <LocationThumb loc={route.end} className="h-[90px] w-[110px] shrink-0 rounded-lg" />
      <div className="rm-overview__main">
        <div className="rm-overview__head">
          <h3>Route Overview</h3>
          <span
            className={`rm-risk rm-risk--${route.riskLabel.toLowerCase()}${route.riskIsMinimum ? ' rm-risk--min' : ''}`}
            title={route.riskIsMinimum ? 'Overview only: hazards smaller than the grid are not counted, so real risk is at least this high.' : undefined}
          >
            {route.riskLabel} risk · {route.riskIsMinimum ? '≥ ' : ''}{route.risk}/100
          </span>
        </div>
        <p className="rm-muted">{route.start.name} → {route.end.name}</p>
        <dl className="rm-stats">
          {stats.map(([k, v, src]) => (
            <div key={k}><dt>{k}<SourceChip id={src} /></dt><dd>{v}</dd></div>
          ))}
        </dl>
        {route.riskIsMinimum && (
          <p className="rm-overview__banner" role="note">
            <strong>Overview only.</strong> {route.distanceKm.toLocaleString()} km is too long to plan reliably: the {src?.resolutionKm} km grid hides craters, rims and steep walls, so slope and risk are minimums. Pick closer sites or plan in hops under ~1,000 km.
          </p>
        )}
        {src && (
          <p
            className={`rm-source ${src.real ? 'rm-source--real' : 'rm-source--sim'}`}
            title={src.real && src.calibration ? `Calibrated to known site heights: R²=${src.calibration.r2}, RMSE=${src.calibration.rmseKm} km` : src.reason}
          >
            {src.real
              ? `● ${src.name} · ~${src.resolutionKm} km grid`
              : '● Simulated terrain – NASA elevation unavailable'}
          </p>
        )}
      </div>
    </section>
  );
}
