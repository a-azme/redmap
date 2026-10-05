import { useMemo, useState } from 'react';

const W = 560, H = 160, P = { l: 42, r: 12, t: 12, b: 24 };

export default function ElevationProfile({ route }) {
  const [hover, setHover] = useState(null);

  const g = useMemo(() => {
    if (!route) return null;
    const els = route.points.map((p) => p.elevKm);
    const lo = Math.min(...els), hi = Math.max(...els);
    const pad = (hi - lo) * 0.15 || 0.5;
    const y0 = lo - pad, y1 = hi + pad;
    const x = (km) => P.l + (km / route.distanceKm) * (W - P.l - P.r);
    const y = (e) => P.t + (1 - (e - y0) / (y1 - y0)) * (H - P.t - P.b);
    const line = route.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.km).toFixed(1)},${y(p.elevKm).toFixed(1)}`).join(' ');
    const area = `${line} L${x(route.distanceKm)},${H - P.b} L${x(0)},${H - P.b} Z`;
    const yTicks = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * route.distanceKm);
    return { x, y, line, area, yTicks, xTicks };
  }, [route]);

  if (!route) {
    return (
      <section className="rm-card rm-profile">
        <h3>Elevation Profile</h3>
        <p className="rm-muted">Plan a route to see the terrain along the way.</p>
      </section>
    );
  }

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, ((e.clientX - r.left) / r.width * W - P.l) / (W - P.l - P.r)));
    setHover(route.points[Math.round(f * (route.points.length - 1))]);
  };

  return (
    <section className="rm-card rm-profile">
      <h3>Elevation Profile</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="rm-profile__svg"
        onPointerMove={onMove} onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}>
        {g.yTicks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={g.y(t)} y2={g.y(t)} className="rm-grid" />
            <text x={P.l - 6} y={g.y(t) + 3} textAnchor="end" className="rm-axis">{t.toFixed(1)}</text>
          </g>
        ))}
        {g.xTicks.map((t) => (
          <text key={t} x={g.x(t)} y={H - 6} textAnchor="middle" className="rm-axis">{Math.round(t)} km</text>
        ))}

        <path d={g.area} className="rm-profile__area" />
        <path d={g.line} className="rm-profile__line" />

        {route.warnings.filter((w) => w.severity !== 'info').map((w) => (
          <text key={w.id} x={g.x(w.fromKm)} y={H - P.b - 4} textAnchor="middle"
            className={`rm-mark rm-mark--${w.severity}`}>▲</text>
        ))}

        {hover && (
          <g>
            <line x1={g.x(hover.km)} x2={g.x(hover.km)} y1={P.t} y2={H - P.b} className="rm-cursor" />
            <circle cx={g.x(hover.km)} cy={g.y(hover.elevKm)} r="4" className="rm-dot" />
          </g>
        )}
      </svg>
      <div className="rm-profile__read">
        {hover
          ? <>km {Math.round(hover.km)} · {hover.elevKm.toFixed(2)} km · slope {hover.slopeDeg}° · {hover.terrain} · {hover.tempC}°C</>
          : <span className="rm-muted">Hover the chart to inspect terrain (elevation in km)</span>}
      </div>
    </section>
  );
}