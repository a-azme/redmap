import { totalSols } from './routeUtils';

export default function RouteOverview({ route, selectedStopIds = [] }) {
  if (!route) {
    return (
      <section className="rm-card">
        <h3>Route Overview</h3>
        <p className="rm-muted">Choose a start and destination, then press Plan Route.</p>
      </section>
    );
  }

  const stats = [
    ['Total Distance', `~ ${route.distanceKm.toLocaleString()} km`],
    ['Estimated Time', `~ ${totalSols(route, selectedStopIds)} sols`],
    ['Elevation Gain', `+${route.elevationGainKm} km`],
    ['Max Slope', `${route.maxSlopeDeg.toFixed(0)}°`],
    ['Coldest (est.)', `${route.minTempC}°C`],
    ['Radiation dose', `≈ ${route.radiationMsv} mSv`],
  ];

  return (
    <section className="rm-card rm-overview">
      {route.end.image && (
        <img
          className="rm-overview__img"
          src={route.end.image}
          alt=""
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="rm-overview__main">
        <div className="rm-overview__head">
          <h3>Route Overview</h3>
          <span className={`rm-risk rm-risk--${route.riskLabel.toLowerCase()}`}>
            {route.riskLabel} risk · {route.risk}/100
          </span>
        </div>
        <p className="rm-muted">{route.start.name} → {route.end.name}</p>
        <dl className="rm-stats">
          {stats.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  );
}