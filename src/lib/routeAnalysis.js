
// Pure route maths shared by the real (DEM based) planner and the legacy
// simulated planner. No DOM, no JSON imports, so it can run under `node --test`.

export const MARS_RADIUS_KM = 3389.5

// above this length one grid cannot show hazards smaller than a few km
export const LONG_TRIP_KM = 2500
export const SAFE_TRIP_KM = 1000

export const MODES = {
  fastest:    { label: 'Fastest Route', detour: 1.08, roughness: 1.0,  speedKmh: 10 },
  safest:     { label: 'Safest Route',  detour: 1.25, roughness: 0.55, speedKmh: 8  },
  scientific: { label: 'Most Science',  detour: 1.18, roughness: 0.8,  speedKmh: 8  },
}

// Colours used to tell the three route modes apart on the map and in the comparison card
export const MODE_COLORS = { fastest: '#f5a524', safest: '#4be08a', scientific: '#b26bff' }

const rad = (d) => (d * Math.PI) / 180

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * MARS_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Rough surface temperature estimate (deg C). Colder towards the poles and with altitude.
export const estimateTempC = (latDeg, elevKm) =>
  Math.round(-45 - Math.abs(latDeg) * 0.6 - elevKm * 1.5)

/**
 * Turns a list of route points into the full route object the UI consumes
 * (stats, hazard warnings, risk score).
 *
 * points: [{ km, lat, lon, elevKm, terrain, slopeDeg, tempC }]
 * stops:  [{ id, title, source, detail, km, lat, lon, elevKm }]
 * dataSource: { real: boolean, name?, resolutionKm?, note? }
 */
export function finalizeRoute({ start, end, settings, points, distanceKm, stops = [], waypoints = [], why = null, hazard = null, legs = [], dataSource }) {
  const mode = MODES[settings.mode] ?? MODES.fastest

  let gain = 0, loss = 0
  for (let i = 1; i < points.length; i++) {
    const d = points[i].elevKm - points[i - 1].elevKm
    if (d > 0) gain += d; else loss -= d
  }
  const avgSlopeDeg = +(points.reduce((s, p) => s + p.slopeDeg, 0) / points.length).toFixed(1)
  const maxSlopeDeg = Math.max(...points.map((p) => p.slopeDeg))
  const minTempC = Math.min(...points.map((p) => p.tempC))

  const kmPerSol = mode.speedKmh * settings.evaHoursPerSol
  const sols = Math.max(1, Math.ceil(distanceKm / kmPerSol))
  // Surface radiation measured by Curiosity's RAD is roughly 0.64 mSv per sol
  const radiationMsv = +(sols * 0.64).toFixed(1)

  // ---- warnings: merge consecutive bad points into one warning ----
  const warnings = []
  const addRuns = (test, make) => {
    let s = null
    points.forEach((p, i) => {
      const hit = test(p)
      if (hit && s === null) s = i
      if ((!hit || i === points.length - 1) && s !== null) {
        const e = hit ? i : i - 1
        warnings.push({ ...make(points.slice(s, e + 1)), fromKm: points[s].km, toKm: points[e].km })
        s = null
      }
    })
  }
  addRuns((p) => p.slopeDeg > settings.maxSlopeDeg, (seg) => ({
    severity: 'critical', title: 'Steep Slope',
    detail: `Up to ${Math.max(...seg.map((p) => p.slopeDeg)).toFixed(0)}° – exceeds your ${settings.maxSlopeDeg}° limit. Find a detour.`,
  }))
  addRuns((p) => p.terrain === 'Rough / boulders', () => ({
    severity: 'caution', title: 'Rough Terrain', detail: 'Boulder field – reduce speed, risk to wheels and suit abrasion.',
  }))
  addRuns((p) => p.terrain === 'Rugged', () => ({
    severity: 'caution', title: 'Rugged Terrain',
    detail: 'Steep, broken ground in the elevation model – reduce speed and scout on foot.',
  }))
  addRuns((p) => p.terrain === 'Low ground', () => ({
    severity: 'caution', title: 'Low Ground',
    detail: 'Crater floor or pit: loose sand, cold air pooling and weaker radio line of sight. Prefer higher ground if a safe way round exists.',
  }))
  addRuns((p) => p.terrain === 'Crater rim', () => ({
    severity: 'caution', title: 'Crater Rim', detail: 'Steep, loose material on the rim. Scout on foot first.',
  }))
  if (minTempC < -75) warnings.push({ severity: 'caution', title: 'Extreme Cold', detail: `Estimated down to ${minTempC}°C – check suit heating margins.`, fromKm: 0, toKm: distanceKm })
  if (sols > 30) warnings.push({ severity: 'caution', title: 'Dust-Storm Exposure', detail: `${sols} sols on the surface – likely to overlap a regional dust storm (solar power and visibility drop).`, fromKm: 0, toKm: distanceKm })
  if (Math.max(Math.abs(start.lat), Math.abs(end.lat)) > 60) warnings.push({ severity: 'info', title: 'Comms Gaps', detail: 'High latitude – fewer orbiter relay passes.', fromKm: 0, toKm: distanceKm })

  if (why?.keepOut?.on && why.keepOut.crossed) {
    warnings.push({ severity: 'critical', title: 'Crosses a no-go zone', detail: `No route avoids ${why.keepOut.crossedKind ?? 'the no-go zone'}. Scout this stretch on foot first, pick another mode, or choose a different destination.`, fromKm: 0, toKm: distanceKm })
  }
  const hard = legs.filter((l) => !l.retraceable)
  if (hard.length) {
    const l = hard[0]
    warnings.push({ severity: 'caution', title: 'Hard-to-retrace leg', detail: `${l.from} → ${l.to} reaches ${l.maxSlopeDeg.toFixed(0)}°, too steep to climb back out easily${hard.length > 1 ? ` (${hard.length} legs like this)` : ''}. Keep a safe fall-back plan for the crew.`, fromKm: l.fromKm, toKm: l.toKm })
  }

  if (dataSource && !dataSource.real) {
    warnings.push({ severity: 'info', title: 'Simulated terrain', detail: 'NASA elevation data could not be loaded, so slopes and terrain on this route are illustrative only.', fromKm: 0, toKm: distanceKm })
  } else if (dataSource?.resolutionKm > 5 || distanceKm > LONG_TRIP_KM) {
    warnings.push({ severity: 'caution', title: 'Overview route only', detail: `${distanceKm > LONG_TRIP_KM ? `At ${Math.round(distanceKm).toLocaleString()} km this is too long to plan reliably. ` : ''}Terrain is sampled every ~${(dataSource.resolutionKm ?? 0).toFixed(0)} km on a trip this long, so craters, rims and ridges smaller than ~${Math.round((dataSource.resolutionKm ?? 0) * 3)} km cannot be seen and the line may cross them. The risk score is a minimum, not an estimate. Use this to compare places, then plan shorter hops (under ~${SAFE_TRIP_KM.toLocaleString()} km) for a route you would drive.`, fromKm: 0, toKm: distanceKm })
  } else if (dataSource?.resolutionKm > 1.5) {
    warnings.push({ severity: 'info', title: 'Coarse terrain model', detail: `Elevation sampled every ~${dataSource.resolutionKm.toFixed(1)} km. Slopes and boulders smaller than that are not resolved – check HiRISE/CTX imagery before committing to a leg.`, fromKm: 0, toKm: distanceKm })
  }

  warnings.sort((a, b) => a.fromKm - b.fromKm)
  warnings.forEach((w, i) => {
    w.id = `w${i}`
    const p = points.reduce((a, b) => (Math.abs(b.km - w.fromKm) < Math.abs(a.km - w.fromKm) ? b : a))
    w.lat = p.lat; w.lon = p.lon
  })

  // ---- risk score 0–100 ----
  const steepShare = points.filter((p) => p.slopeDeg > settings.maxSlopeDeg).length / points.length
  const critical = warnings.filter((w) => w.severity === 'critical').length
  const parts = [
    { key: 'steep', label: 'Slopes over your limit', points: steepShare * 120, detail: `${Math.round(steepShare * 100)}% of the route is steeper than ${settings.maxSlopeDeg}°`, tip: 'Lower the max slope, or pick Safest mode.' },
    { key: 'critical', label: 'Critical warnings', points: critical * 8, detail: `${critical} critical warning${critical === 1 ? '' : 's'}`, tip: 'Open the warnings list and fix the red ones first (a different mode or destination often clears them).' },
    { key: 'time', label: 'Time on the surface', points: Math.min(sols, 60) * 0.5, detail: `${sols} sol${sols === 1 ? '' : 's'} outside`, tip: 'Raise EVA hours per sol or choose a closer destination.' },
    { key: 'cold', label: 'Extreme cold', points: minTempC < -75 ? 8 : 0, detail: minTempC < -75 ? `down to ${minTempC}°C` : 'within suit limits', tip: 'Travel at lower latitude or elevation, or in the warm part of the sol.' },
  ]
  const rawRisk = parts.reduce((s, x) => s + x.points, 0)
  const risk = Math.min(100, Math.round(rawRisk))
  const riskParts = parts.map((x) => ({ ...x, points: +x.points.toFixed(1) })).sort((a, b) => b.points - a.points)

  // per-leg risk: steepness against your limit, rough or low ground, no way back, a no-go zone
  const legsOut = legs.map((l) => {
    const inside = points.filter((p) => p.km >= l.fromKm - 1e-6 && p.km <= l.toKm + 1e-6)
    const bad = inside.length ? inside.filter((p) => p.terrain === 'Low ground' || p.terrain === 'Rugged' || p.terrain === 'Rough / boulders' || p.terrain === 'Crater rim').length / inside.length : 0
    const score = Math.round(Math.min(1.3, l.maxSlopeDeg / Math.max(1, settings.maxSlopeDeg)) * 40 + bad * 30 + (l.retraceable ? 0 : 20) + warnings.some((w) => w.severity === 'critical' && w.fromKm < l.toKm && w.toKm > l.fromKm) * 20)
    return { ...l, risk: score, level: score < 30 ? 'low' : score < 60 ? 'moderate' : 'high' }
  })

  // how much the numbers can be trusted: the grid decides what hazards the planner could see
  const res = dataSource?.resolutionKm ?? 0
  const reliability = !dataSource?.real ? 'simulated' : res > 5 || distanceKm > LONG_TRIP_KM ? 'overview' : res > 1.5 ? 'coarse' : 'detailed'

  return {
    start, end, settings, mode: settings.mode, distanceKm, sols, reliability, riskIsMinimum: reliability === 'overview',
    elevationGainKm: +gain.toFixed(2), elevationLossKm: +loss.toFixed(2),
    avgSlopeDeg, maxSlopeDeg, minTempC, radiationMsv, risk, riskParts,
    riskLabel: risk < 25 ? 'Low' : risk < 55 ? 'Moderate' : 'High',
    points, path: points.map((p) => ({ lat: p.lat, lon: p.lon })), warnings, stops, waypoints, why, hazard, legs: legsOut,
    dataSource: dataSource ?? { real: false },
  }
}
