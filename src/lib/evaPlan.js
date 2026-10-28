// Turns a planned route into a day-by-day Marswalk (EVA) schedule.
//
// All assumptions are explicit constants below so they can be tuned or shown in the UI.
// Times are local true solar time in Mars hours (a sol has 24 Mars hours, 24h 39m 35s on Earth).

import { MODES } from './routeAnalysis.js'
import { solarLongitude, seasonName, isDustSeason, daylight, fmtClock, MARS_HOUR_IN_EARTH_HOURS } from './marsTime.js'
import { commsDelay } from './commsDelay.js'

export const EVA_ASSUMPTIONS = {
  footKmh: 3.5,            // suited walking pace on level ground
  daylightMarginH: 0.5,    // keep this long clear of sunrise and of sunset (Earth hours)
  stopFraction: 0.5,       // a science stop uses half of one sol's EVA budget (matches the "0.5 sol" rule in the UI)
  suitReserveH: 2,         // emergency consumables: hours of walking back the suit can still support
  radiationMsvPerSol: 0.64, // MSL RAD surface baseline
  slopePenaltyDeg: 25,     // speed falls linearly to the minimum factor as slope approaches this
  minSpeedFactor: 0.25,
  autonomousDelayMin: 10,  // above this one-way delay, real-time voice support is impractical
}

const A = EVA_ASSUMPTIONS
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const speedFactor = (slope) => clamp(1 - slope / A.slopePenaltyDeg, A.minSpeedFactor, 1)
const SOL_DAYS = 1.0274912517

/**
 * route: output of planRealRoute / planRoute
 * opts:  { date: Date, travel: 'rover' | 'foot', selectedStopIds: string[] }
 */
export function planEva(route, { date = new Date(), travel = 'rover', selectedStopIds = [] } = {}) {
  if (!route?.points?.length) return null
  const { points, settings } = route
  const baseKmh = travel === 'foot' ? A.footKmh : (MODES[route.mode] ?? MODES.fastest).speedKmh
  const evaHours = settings.evaHoursPerSol

  // time (Earth hours) to travel each leg, slowed by slope
  const legs = []
  for (let i = 1; i < points.length; i++) {
    const len = points[i].km - points[i - 1].km
    const slope = (points[i].slopeDeg + points[i - 1].slopeDeg) / 2
    legs.push({ from: points[i - 1].km, to: points[i].km, len, slope, lat: points[i].lat, hours: len / (baseKmh * speedFactor(slope)) })
  }

  // science stops the crew chose, placed at their km mark
  const stops = (route.stops || [])
    .filter((s) => selectedStopIds.includes(s.id))
    .map((s) => ({ ...s, hours: evaHours * A.stopFraction }))
    .sort((a, b) => a.km - b.km)

  const warnings = []
  const sols = []
  let li = 0, legDone = 0 // progress within current leg (fraction of its hours consumed)
  let si = 0
  let stopLeft = 0, curStop = null
  let solIndex = 0

  while ((li < legs.length || curStop || si < stops.length) && solIndex < 400) {
    const startKm = li < legs.length ? legs[li].from + legs[li].len * legDone : points[points.length - 1].km
    const startLat = li < legs.length ? legs[li].lat : points[points.length - 1].lat
    const when = new Date(date.getTime() + solIndex * SOL_DAYS * 86400000)
    const ls = solarLongitude(when)
    const dl = daylight(startLat, ls)

    const usable = Math.max(0, dl.daylightEarthH - 2 * A.daylightMarginH)
    const night = dl.polarNight || usable < 1
    const budget = night ? evaHours : Math.min(evaHours, usable)
    const startClock = night ? 8 : dl.sunrise + A.daylightMarginH / MARS_HOUR_IN_EARTH_HOURS

    let left = budget, used = 0
    let maxSlope = 0
    const visited = []
    const sample = [{ km: startKm }]

    while (left > 1e-6) {
      if (curStop) {
        const t = Math.min(left, stopLeft)
        left -= t; used += t; stopLeft -= t
        if (stopLeft <= 1e-9) { visited.push(curStop); curStop = null }
        continue
      }
      // enter a stop once we've reached its km mark
      const here = li < legs.length ? legs[li].from + legs[li].len * legDone : points[points.length - 1].km
      if (si < stops.length && stops[si].km <= here + 1e-6) {
        curStop = stops[si++]; stopLeft = curStop.hours
        continue
      }
      if (li >= legs.length) break
      const leg = legs[li]
      const remaining = leg.hours * (1 - legDone)
      // don't overrun the next stop inside this leg
      let take = Math.min(left, remaining)
      if (si < stops.length) {
        const frac = (stops[si].km - (leg.from + leg.len * legDone)) / (leg.len * (1 - legDone) || 1)
        if (frac > 0 && frac < 1) take = Math.min(take, remaining * frac)
      }
      const frac = remaining > 0 ? take / remaining : 1
      legDone += (1 - legDone) * frac
      left -= take; used += take
      maxSlope = Math.max(maxSlope, leg.slope)
      sample.push({ km: leg.from + leg.len * legDone })
      if (legDone >= 1 - 1e-9) { li++; legDone = 0 }
    }

    const endKm = li < legs.length ? legs[li].from + legs[li].len * legDone : points[points.length - 1].km
    const endClock = startClock + used / MARS_HOUR_IN_EARTH_HOURS
    const sunsetMargin = night || dl.polarDay ? null : +((dl.sunset - endClock) * MARS_HOUR_IN_EARTH_HOURS).toFixed(1)

    // walk-back: how far the crew is from the nearest camp (start or end of sol) at the worst point
    const span = endKm - startKm
    const farthestKm = span / 2
    const walkBackH = +(farthestKm / A.footKmh).toFixed(1)

    sols.push({
      sol: solIndex + 1, startKm: +startKm.toFixed(1), endKm: +endKm.toFixed(1), distanceKm: +span.toFixed(1),
      evaHours: +used.toFixed(1), startClock: fmtClock(startClock), endClock: fmtClock(endClock),
      startMars: startClock, endMars: endClock,
      sunrise: dl.polarDay || dl.polarNight ? null : fmtClock(dl.sunrise),
      sunset: dl.polarDay || dl.polarNight ? null : fmtClock(dl.sunset),
      sunriseMars: dl.sunrise, sunsetMars: dl.sunset,
      polarDay: dl.polarDay, night, sunsetMarginH: sunsetMargin, maxSlopeDeg: +maxSlope.toFixed(1),
      stops: visited.map((s) => s.title), ls: +ls.toFixed(1), walkBackH,
    })
    solIndex++
    if (used < 1e-6 && li >= legs.length && !curStop && si >= stops.length) { sols.pop(); break }
  }

  // ---- environment and hazards for the whole trip ----
  const ls0 = solarLongitude(date)
  const comms = commsDelay(date)
  const mid = points[Math.floor(points.length / 2)]
  const dl0 = daylight(points[0].lat, ls0)
  const totalEva = sols.reduce((s, x) => s + x.evaHours, 0)

  if (sols.some((s) => s.night)) warnings.push({ severity: 'critical', title: 'EVA in darkness', detail: 'At least one sol has little or no daylight at this latitude and season. Choose another date or location.' })
  if (sols.some((s) => s.sunsetMarginH != null && s.sunsetMarginH < 0)) warnings.push({ severity: 'critical', title: 'Sunset overrun', detail: 'EVA runs past sunset on at least one sol. Shorten EVA hours or split the route.' })
  if (isDustSeason(ls0) || sols.some((s) => isDustSeason(s.ls))) warnings.push({ severity: 'caution', title: 'Dust-storm season', detail: `Ls ${ls0.toFixed(0)}° is in the Ls 180–360 dust season: expect lower solar power and visibility, and keep a contingency sol.` })
  if (comms.oneWayMin > A.autonomousDelayMin) warnings.push({ severity: 'info', title: 'Autonomous operations', detail: `One-way radio delay is ${comms.oneWayMin} min (round trip ${comms.roundTripMin} min). Mission control cannot give real-time help; pre-agree decisions for each leg.` })
  if (travel === 'foot') {
    const worst = sols.reduce((m, s) => Math.max(m, s.walkBackH), 0)
    if (worst > A.suitReserveH) warnings.push({ severity: 'critical', title: 'Beyond walk-back range', detail: `Up to ${worst} h from the nearest camp on foot, but the suit reserve covers about ${A.suitReserveH} h. Use shorter EVAs, relay camps, or a pressurised rover.` })
  }

  return {
    travel, baseKmh, assumptions: A,
    startDate: date, ls: +ls0.toFixed(1), season: seasonName(ls0, points[0].lat), dustSeason: isDustSeason(ls0),
    daylightStart: dl0, daylightMid: daylight(mid.lat, ls0),
    comms, sols, totalSols: sols.length, totalEvaHours: +totalEva.toFixed(1),
    radiationMsv: +(sols.length * A.radiationMsvPerSol).toFixed(1),
    warnings,
  }
}
