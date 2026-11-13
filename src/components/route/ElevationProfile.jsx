import { useMemo, useState } from 'react'
import { totalSols } from './routeUtils'
import { computeAbortTelemetry } from '../../lib/evaPlan'

const W = 720
const H = 132
const P = { l: 42, r: 16, t: 14, b: 22 }

function nearestStopKm(points, stop) {
  if (!points?.length) return 0
  let best = points[0]
  let bestD = Infinity
  for (const p of points) {
    const d = Math.hypot(p.lat - stop.lat, p.lon - stop.lon)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best.km
}

export default function ElevationProfile({
  route,
  plan = null,
  spaceWeather = null,
  selectedStopIds = [],
  scrubIndex = null,
  isPlaying = false,
  playSpeed = 1,
  onScrub,
  onTogglePlay,
  onChangeSpeed,
  onResetPlay,
  onSelectPoint,
}) {
  const [hoverIdx, setHoverIdx] = useState(null)

  const routePoints = route?.points
  const routeDistanceKm = route?.distanceKm
  const routeStops = route?.stops

  const g = useMemo(() => {
    if (!routePoints?.length || !routeDistanceKm) return null
    const els = routePoints.map((p) => p.elevKm)
    const lo = Math.min(...els)
    const hi = Math.max(...els)
    const pad = (hi - lo) * 0.16 || 0.5
    const y0 = lo - pad
    const y1 = hi + pad
    const maxKm = Math.max(0.001, routeDistanceKm)
    const x = (km) => P.l + (km / maxKm) * (W - P.l - P.r)
    const y = (e) => P.t + (1 - (e - y0) / (y1 - y0)) * (H - P.t - P.b)
    const line = routePoints
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.km).toFixed(1)},${y(p.elevKm).toFixed(1)}`)
      .join(' ')
    const area = `${line} L${x(routeDistanceKm)},${H - P.b} L${x(0)},${H - P.b} Z`
    const yTicks = [0, 1, 2].map((i) => y0 + ((y1 - y0) * i) / 2)
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * routeDistanceKm)

    const stopMarkers = (routeStops || []).slice(0, 6).map((s) => {
      const km = nearestStopKm(routePoints, s)
      const pt =
        routePoints.reduce(
          (best, cur) => (Math.abs(cur.km - km) < Math.abs(best.km - km) ? cur : best),
          routePoints[0]
        )
      return { id: s.id, title: s.title, km: pt.km, elevKm: pt.elevKm }
    })

    return { x, y, line, area, yTicks, xTicks, stopMarkers }
  }, [routePoints, routeDistanceKm, routeStops])

  if (!route || !g) {
    return (
      <section className="rm-card rm-profile">
        <h3>Route Summary &amp; Elevation Profile</h3>
        <p className="rm-muted">Choose a start and destination, then press Plan Route.</p>
      </section>
    )
  }

  const activeIdx =
    scrubIndex !== null && scrubIndex !== undefined ? scrubIndex : hoverIdx
  const activePt =
    activeIdx !== null && activeIdx !== undefined
      ? route.points[Math.min(route.points.length - 1, Math.max(0, activeIdx))]
      : null

  const indexFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const f = Math.min(
      1,
      Math.max(0, (((e.clientX - r.left) / r.width) * W - P.l) / (W - P.l - P.r))
    )
    return Math.round(f * (route.points.length - 1))
  }

  const onMove = (e) => {
    const idx = indexFromEvent(e)
    setHoverIdx(idx)
    if (!isPlaying) {
      onScrub?.(idx)
    }
  }

  const onLeave = (e) => {
    if (e.pointerType === 'mouse') {
      setHoverIdx(null)
      if (!isPlaying) {
        onScrub?.(null)
      }
    }
  }

  const onClickChart = (e) => {
    const idx = indexFromEvent(e)
    const pt = route.points[idx]
    onScrub?.(idx)
    if (pt) onSelectPoint?.(pt)
  }

  const abortInfo = activePt
    ? computeAbortTelemetry(route, plan, activePt, spaceWeather)
    : null

  const solsCount = plan ? plan.totalSols : totalSols(route, selectedStopIds)
  const radDose = plan ? plan.radiationMsv : route.radiationMsv
  const th = plan?.thermal

  return (
    <section className="rm-card rm-profile rm-bottom-unified">
      {/* Top Row: Route Title, Risk Badge, & Interactive EVA Simulation Controls */}
      <div className="rm-profile__head">
        <div className="rm-profile__titlegroup">
          <h3>
            {route.start.name} → {route.end.name}
          </h3>
          <span
            className={`rm-risk rm-risk--${route.riskLabel.toLowerCase()}${route.riskIsMinimum ? ' rm-risk--min' : ''}`}
            title={
              route.riskIsMinimum
                ? 'Overview only: hazards smaller than the grid are not counted, so real risk is at least this high.'
                : undefined
            }
          >
            {route.riskLabel} risk · {route.riskIsMinimum ? '≥ ' : ''}
            {route.risk}/100
          </span>
        </div>

        <div className="rm-profile__ctrl">
          <button
            type="button"
            className={`rm-chip rm-profile__play ${isPlaying ? 'is-active' : ''}`}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause route traverse' : 'Preview traverse along route'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Preview Traverse'}
          </button>
          <button
            type="button"
            className="rm-chip"
            onClick={onChangeSpeed}
            title="Toggle playback speed"
          >
            {playSpeed}×
          </button>
          {(scrubIndex !== null || isPlaying) && (
            <button
              type="button"
              className="rm-chip"
              onClick={onResetPlay}
              title="Reset playhead"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Unified 6-KPI Telemetry Strip */}
      <div className="rm-kpiribbon">
        <div className="rm-kpi">
          <small>DISTANCE</small>
          <strong>{route.distanceKm.toLocaleString()} km</strong>
        </div>
        <div className="rm-kpi">
          <small>DURATION</small>
          <strong>{solsCount} {solsCount === 1 ? 'sol' : 'sols'}</strong>
        </div>
        <div className="rm-kpi">
          <small>ELEV GAIN</small>
          <strong>+{route.elevationGainKm} km</strong>
        </div>
        <div className="rm-kpi">
          <small>MAX SLOPE</small>
          <strong>{route.maxSlopeDeg.toFixed(0)}°</strong>
        </div>
        <div
          className="rm-kpi"
          title={
            th
              ? `${th.instrument} seasonal model (Ls ${plan.ls}°): Daytime high ${th.dayMaxC}°C · EVA mean ${th.evaMeanC}°C · Night low ${th.nightMinC}°C`
              : undefined
          }
        >
          <small>{th ? 'DAY / NIGHT TEMP' : 'MIN TEMP'}</small>
          <strong>
            {th ? `${th.dayMaxC}° / ${th.nightMinC}°C` : `${route.minTempC}°C`}
          </strong>
        </div>
        <div className="rm-kpi">
          <small>RAD DOSE</small>
          <strong>≈ {radDose} mSv</strong>
        </div>
      </div>

      {/* Full-Width Interactive Elevation & Hazard SVG Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="rm-profile__svg"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={onClickChart}
      >
        {g.yTicks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={g.y(t)} y2={g.y(t)} className="rm-grid" />
            <text x={P.l - 6} y={g.y(t) + 3} textAnchor="end" className="rm-axis">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {g.xTicks.map((t) => (
          <text key={t} x={g.x(t)} y={H - 5} textAnchor="middle" className="rm-axis">
            {route.distanceKm < 25 ? t.toFixed(1) : Math.round(t)} km
          </text>
        ))}

        <path d={g.area} className="rm-profile__area" />
        <path d={g.line} className="rm-profile__line" />

        {/* Science Stop Markers (★) */}
        {g.stopMarkers.map((s) => (
          <g key={s.id}>
            <title>{`Science Stop: ${s.title} (km ${s.km.toFixed(1)})`}</title>
            <text
              x={g.x(s.km)}
              y={g.y(s.elevKm) - 5}
              textAnchor="middle"
              className="rm-mark rm-mark--stop"
            >
              ★
            </text>
          </g>
        ))}

        {/* Natural Radiation Shelter Marker */}
        {route.shelterPoint && (
          <g>
            <title>{`Radiation Shelter: km ${route.shelterPoint.km} (-${route.shelterPoint.shieldingPct}% dose)`}</title>
            <line
              x1={g.x(route.shelterPoint.km)}
              x2={g.x(route.shelterPoint.km)}
              y1={g.y(route.shelterPoint.elevKm)}
              y2={H - P.b}
              stroke="#38bdf8"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <circle
              cx={g.x(route.shelterPoint.km)}
              cy={g.y(route.shelterPoint.elevKm)}
              r="3.5"
              fill="#38bdf8"
            />
          </g>
        )}

        {/* Hazard Warning Markers (▲) */}
        {route.warnings
          .filter((w) => w.severity !== 'info')
          .map((w) => (
            <text
              key={w.id}
              x={g.x(w.fromKm)}
              y={H - P.b - 3}
              textAnchor="middle"
              className={`rm-mark rm-mark--${w.severity}`}
            >
              ▲
            </text>
          ))}

        {/* Active EVA Playhead / Hover Crosshair */}
        {activePt && (
          <g>
            <line
              x1={g.x(activePt.km)}
              x2={g.x(activePt.km)}
              y1={P.t}
              y2={H - P.b}
              className="rm-cursor"
            />
            <circle
              cx={g.x(activePt.km)}
              cy={g.y(activePt.elevKm)}
              r="5"
              className="rm-dot"
            />
          </g>
        )}
      </svg>

      <div className="rm-profile__read">
        {activePt ? (
          <span className="rm-profile__telemetry">
            <strong>km {activePt.km.toFixed(1)}</strong> · {activePt.elevKm.toFixed(2)} km · slope{' '}
            <b>{activePt.slopeDeg}°</b> ·{' '}
            {abortInfo?.thermal
              ? `${abortInfo.thermal.evaMeanC}°C (Day ${abortInfo.thermal.dayMaxC}° / Night ${abortInfo.thermal.nightMinC}°)`
              : `${activePt.tempC}°C`}
            {abortInfo && (
              <>
                {' '}
                · Rem: <b>{abortInfo.remO2Pct}% O₂</b> / <b>{abortInfo.remBatteryPct}% Bat</b> ·
                Shelter: <b>{abortInfo.shelterEtaMin}m</b> ·{' '}
                <span className={`rm-pnr-badge rm-pnr-badge--${abortInfo.pnrTone}`}>
                  {abortInfo.pnrStatus}
                </span>
              </>
            )}
          </span>
        ) : (
          <span className="rm-muted">
            Scrub profile for live PNR status, suit O₂/battery, and shelter ETA (★ = science, blue dot = shelter)
          </span>
        )}
      </div>
    </section>
  )
}