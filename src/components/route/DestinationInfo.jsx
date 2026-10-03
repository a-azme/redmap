import { useState } from 'react';

export default function DestinationInfo({ route, onDetails }) {
  const [imgOk, setImgOk] = useState(true);
  if (!route) return null;

  const loc = route.end;
  const last = route.points[route.points.length - 1];
  const rows = [
    ['Terrain Type', last.terrain],
    ['Elevation', `${loc.elevKm} km`],
    ['Avg. Slope', `${route.avgSlopeDeg}°`],
    ['Temperature (est.)', `${last.tempC}°C`],
  ];

  return (
    <section className="rm-card rm-dest">
      <div className="rm-dest__head">
        {imgOk && loc.image
          ? <img src={loc.image} alt="" onError={() => setImgOk(false)} />
          : <div className="rm-dest__ph" />}
        <div>
          <small className="rm-muted">Destination</small>
          <h3>{loc.name}</h3>
          <span className="rm-coord">
            {Math.abs(loc.lat).toFixed(3)}° {loc.lat >= 0 ? 'N' : 'S'}, {loc.lon.toFixed(3)}° E
          </span>
          <p>{loc.description}</p>
        </div>
      </div>

      <div className="rm-tags">
        {loc.tags.map((t) => <span key={t} className="rm-tag">{t}</span>)}
      </div>

      <h4>Terrain &amp; Conditions</h4>
      <dl className="rm-rows">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>

      <h4>Mission Information</h4>
      <div className="rm-mission">
        <span className="rm-mission__logo">NASA</span>
        <div>
          <strong>{loc.mission.name}</strong>
          <small>({loc.mission.years})</small>
        </div>
      </div>
      <p className="rm-muted">{loc.mission.note}</p>

      <button type="button" className="rm-details" onClick={onDetails}>
        View Detailed Information ↗
      </button>
    </section>
  );
}