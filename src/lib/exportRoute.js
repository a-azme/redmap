// Export a planned route + EVA schedule as a printable mission card (text) or JSON.

const pad = (s, n) => String(s).padEnd(n)

export function evaPlanText(route, plan) {
  if (!route || !plan) return ''
  const L = []
  L.push('REDMAP EVA MISSION CARD')
  L.push('='.repeat(60))
  L.push(`Route:      ${route.start.name} -> ${route.end.name}`)
  L.push(`Mode:       ${route.settings.mode} / ${plan.travel === 'foot' ? 'on foot' : 'pressurised rover'}`)
  L.push(`Distance:   ${route.distanceKm} km   Sols: ${plan.totalSols}   EVA hours: ${plan.totalEvaHours}`)
  L.push(`Max slope:  ${route.maxSlopeDeg.toFixed(0)} deg   Elevation gain: +${route.elevationGainKm} km`)
  L.push(`Date:       ${plan.startDate.toISOString().slice(0, 10)}   Ls ${plan.ls} deg (${plan.season})`)
  L.push(`Comms:      one-way ${plan.comms.oneWayMin} min, round trip ${plan.comms.roundTripMin} min (${plan.comms.distanceAU} AU)`)
  L.push(`Radiation:  ~${plan.radiationMsv} mSv (0.64 mSv/sol baseline)`)
  L.push(`Terrain:    ${route.dataSource?.real ? route.dataSource.name : 'SIMULATED (NASA elevation unavailable)'}`)
  L.push('')
  L.push(`${pad('Sol', 5)}${pad('Km', 14)}${pad('EVA window (LTST)', 20)}${pad('Hours', 7)}Notes`)
  L.push('-'.repeat(60))
  for (const s of plan.sols) {
    const notes = []
    if (s.sunset) notes.push(`sunset ${s.sunset}`)
    if (s.stops.length) notes.push(`stops: ${s.stops.join(', ')}`)
    if (s.night) notes.push('LOW LIGHT')
    L.push(`${pad(s.sol, 5)}${pad(`${s.startKm}-${s.endKm}`, 14)}${pad(`${s.startClock}-${s.endClock}`, 20)}${pad(s.evaHours, 7)}${notes.join('; ')}`)
  }
  if (route.waypoints?.length) {
    const fmt = (lat, lon) => `${Math.abs(lat).toFixed(2)}${lat >= 0 ? 'N' : 'S'} ${lon.toFixed(2)}E`
    L.push('', 'WAYPOINTS')
    L.push(`${pad('#', 4)}${pad('Name', 30)}${pad('Km', 7)}${pad('Leg in km', 10)}${pad('Retrace', 9)}Position`)
    const legs = route.legs ?? []
    route.waypoints.forEach((w, i) => {
      // legs[i] ends at waypoint i, so the leg that arrives here is legs[i]
      const l = legs[i]
      L.push(`${pad(w.n, 4)}${pad(w.name, 30)}${pad(w.km, 7)}${pad(l ? l.km.toFixed(0) : '-', 10)}${pad(l ? (l.retraceable ? 'ok' : 'HARD') : '-', 9)}${fmt(w.lat, w.lon)}`)
    })
  }
  const all = [...route.warnings, ...plan.warnings]
  if (all.length) {
    L.push('', 'HAZARDS AND CONDITIONS')
    for (const w of all) L.push(`- [${w.severity.toUpperCase()}] ${w.title}: ${w.detail}`)
  }
  L.push('', 'Assumptions: ' + Object.entries(plan.assumptions).map(([k, v]) => `${k}=${v}`).join(', '))
  L.push('Data: NASA MGS MOLA elevation, MSL RAD radiation baseline; temperatures are estimates.')
  return L.join('\n')
}

export function evaPlanJson(route, plan) {
  return JSON.stringify({
    route: { start: route.start.name, end: route.end.name, distanceKm: route.distanceKm, mode: route.settings.mode, dataSource: route.dataSource, points: route.points },
    eva: { ...plan, startDate: plan.startDate.toISOString() },
  }, null, 2)
}

/** Browser download helper (no-op outside the browser). */
export function downloadText(filename, text, type = 'text/plain') {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
