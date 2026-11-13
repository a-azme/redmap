// Turns a planned route into a day-by-day Marswalk (EVA) schedule with Spacesuit PLSS
// consumables telemetry (O2, sublimator cooling water, battery) and Space Weather radiation dose.
//
// All assumptions are explicit constants below so they can be tuned or shown in the UI.
// Times are local true solar time in Mars hours (a sol has 24 Mars hours, 24h 39m 35s on Earth).

import { MODES, estimateMarsThermal } from './routeAnalysis.js'
import { solarLongitude, seasonName, isDustSeason, daylight, fmtClock, MARS_HOUR_IN_EARTH_HOURS } from './marsTime.js'
import { commsDelay } from './commsDelay.js'
import { roverAnalysis, ROVER_DEFAULT } from './rover.js'

export const EVA_ASSUMPTIONS = {
  footKmh: 3.5,             // suited walking pace on level ground (unburdened baseline)
  suitLifeH: 8,             // nominal single-EVA PLSS maximum duration (Earth hours)
  daylightMarginH: 0.5,     // keep this long clear of sunrise and of sunset (Earth hours)
  stopFraction: 0.5,        // a science stop uses half of one sol's EVA budget (matches the "0.5 sol" rule in the UI)
  suitReserveH: 2,          // emergency consumables: hours of walking back the suit can still support
  radiationMsvPerSol: 0.64, // MSL RAD surface baseline (GCR)
  slopePenaltyDeg: 25,      // speed falls linearly to the minimum factor as slope approaches this
  minSpeedFactor: 0.25,
  autonomousDelayMin: 10,   // above this one-way delay, real-time voice support is impractical
  // Spacesuit Portable Life Support System (PLSS) & Martian 0.38g biomechanics
  o2KgPerHourBase: 0.084,   // metabolic O2 usage per astronaut at nominal EVA pace (kg/h)
  o2CapacityKg: 0.76,       // primary + reserve O2 tank capacity per sol (kg)
  waterLPerHourBase: 0.42,  // sublimator/LCVG cooling water usage per hour (L/h)
  waterCapacityL: 3.6,      // PLSS cooling feedwater capacity per sol (L)
  batteryWhPerHourBase: 68, // PLSS fan, pump, suit HUD, and radio draw (Wh/h)
  batteryCapacityWh: 620,   // PLSS high-density Li-ion battery pack per sol (Wh)
}

const A = EVA_ASSUMPTIONS
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const speedFactor = (slope) => clamp(1 - slope / A.slopePenaltyDeg, A.minSpeedFactor, 1)
const SOL_DAYS = 1.0274912517

/**
 * route: output of planRealRoute / planRoute
 * opts:  { date: Date, travel: 'rover' | 'foot', selectedStopIds: string[], spaceWeather?: object, roverConfig?: object }
 */
export function planEva(route, { date = new Date(), travel = 'rover', selectedStopIds = [], spaceWeather = null, roverConfig = null } = {}) {
  if (!route?.points?.length) return null
  const { points, settings } = route

  // Payload mass penalty in 0.38g Martian gravity (only applied when payloadKg is explicitly set in settings)
  const hasPayloadSetting = typeof settings?.payloadKg === 'number'
  const payloadKg = hasPayloadSetting ? clamp(settings.payloadKg, 0, 35) : 0
  const crewSize = Number(settings?.crewSize) || 2
  const payloadSpeedMult = travel === 'foot' && hasPayloadSetting ? clamp(1 - payloadKg * 0.0085, 0.7, 1) : 1

  const rawBaseKmh = travel === 'foot' ? A.footKmh * payloadSpeedMult : (MODES[route.mode] ?? MODES.fastest).speedKmh
  const baseKmh = +rawBaseKmh.toFixed(2)
  const evaHours = settings.evaHoursPerSol

  // Newtonian Mars Rover vehicle mechanical & electrical analysis over the route profile
  const roverTelemetry = roverAnalysis(points, {
    ...ROVER_DEFAULT,
    massKg: ROVER_DEFAULT.massKg + payloadKg,
    slopeLimitDeg: settings?.maxSlopeDeg ?? ROVER_DEFAULT.slopeLimitDeg,
    speedKmh: (MODES[route.mode] ?? MODES.fastest).speedKmh,
    ...(roverConfig || {}),
  })

  // time (Earth hours) to travel each leg, slowed by slope
  const legs = []
  for (let i = 1; i < points.length; i++) {
    const len = Math.max(0, points[i].km - points[i - 1].km)
    const slope = (points[i].slopeDeg + points[i - 1].slopeDeg) / 2
    const elevKm = (points[i].elevKm + points[i - 1].elevKm) / 2
    legs.push({ from: points[i - 1].km, to: points[i].km, len, slope, elevKm, lat: points[i].lat, hours: len / (rawBaseKmh * speedFactor(slope)) })
  }

  // science stops the crew chose, placed at their km mark
  const stopPool = route.corridorStops?.length ? route.corridorStops : (route.stops || [])
  const stops = stopPool
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
    const startElevKm = li < legs.length ? legs[li].elevKm : points[points.length - 1].elevKm
    const when = new Date(date.getTime() + solIndex * SOL_DAYS * 86400000)
    const ls = solarLongitude(when)
    const dl = daylight(startLat, ls)
    const solThermal = estimateMarsThermal(startLat, startElevKm, ls)

    const usable = Math.max(0, dl.daylightEarthH - 2 * A.daylightMarginH)
    const night = dl.polarNight || usable < 1
    const budget = night ? evaHours : Math.min(evaHours, usable)
    const startClock = night ? 8 : dl.sunrise + A.daylightMarginH / MARS_HOUR_IN_EARTH_HOURS

    let left = budget, used = 0
    let maxSlope = 0
    let slopeHoursAccum = 0
    const visited = []
    const sample = [{ km: startKm }]

    let innerSteps = 0
    while (left > 1e-6 && innerSteps++ < 2000) {
      if (curStop) {
        const t = Math.min(left, stopLeft)
        left -= t; used += t; stopLeft -= t
        // Field science sampling (drilling/spectrometry) has moderate metabolic load (~4 deg eq slope)
        slopeHoursAccum += t * 4
        if (stopLeft <= 1e-9 || t <= 1e-9) { visited.push(curStop); curStop = null }
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
      if (remaining <= 1e-9) {
        li++; legDone = 0
        continue
      }
      // don't overrun the next stop inside this leg
      let take = Math.min(left, remaining)
      if (si < stops.length) {
        const frac = (stops[si].km - (leg.from + leg.len * legDone)) / (leg.len * (1 - legDone) || 1)
        if (frac > 1e-6 && frac < 1) take = Math.min(take, remaining * frac)
      }
      const frac = remaining > 0 ? take / remaining : 1
      legDone += (1 - legDone) * frac
      left -= take; used += take
      maxSlope = Math.max(maxSlope, leg.slope)
      slopeHoursAccum += take * leg.slope
      sample.push({ km: leg.from + leg.len * legDone })
      if (legDone >= 1 - 1e-9) { li++; legDone = 0 }
    }

    const endKm = li < legs.length ? legs[li].from + legs[li].len * legDone : points[points.length - 1].km
    const endClock = startClock + used / MARS_HOUR_IN_EARTH_HOURS
    const sunsetMargin = night || dl.polarDay ? null : +((dl.sunset - endClock) * MARS_HOUR_IN_EARTH_HOURS).toFixed(1)

    // walk-back: how far the crew is from the nearest camp (start or end of sol) at the worst point
    const span = endKm - startKm
    const farthestKm = span / 2
    const walkBackH = +(farthestKm / rawBaseKmh).toFixed(1)

    // Spacesuit PLSS consumables for this sol per astronaut (driven by slope, payload, and seasonal thermal load)
    const avgSlope = used > 0 ? slopeHoursAccum / used : 0
    const modeExertion = travel === 'foot' ? 1.0 + (avgSlope / 18) * 0.35 + (payloadKg / 30) * 0.22 : 0.62 + (payloadKg / 30) * 0.08
    const coldHeaterBoost = clamp(1.0 + Math.max(0, (-45 - solThermal.evaMeanC) * 0.008), 1.0, 1.24)
    const o2Kg = +(used * A.o2KgPerHourBase * modeExertion).toFixed(2)
    const waterL = +(used * A.waterLPerHourBase * modeExertion).toFixed(2)
    const batteryWh = Math.round(used * A.batteryWhPerHourBase * coldHeaterBoost * (0.85 + 0.15 * modeExertion))
    const o2Pct = Math.min(100, Math.round((o2Kg / A.o2CapacityKg) * 100))
    const waterPct = Math.min(100, Math.round((waterL / A.waterCapacityL) * 100))
    const batteryPct = Math.min(100, Math.round((batteryWh / A.batteryCapacityWh) * 100))

    sols.push({
      sol: solIndex + 1, startKm: +startKm.toFixed(1), endKm: +endKm.toFixed(1), distanceKm: +span.toFixed(1),
      evaHours: +used.toFixed(1), startClock: fmtClock(startClock), endClock: fmtClock(endClock),
      startMars: startClock, endMars: endClock,
      sunrise: dl.polarDay || dl.polarNight ? null : fmtClock(dl.sunrise),
      sunset: dl.polarDay || dl.polarNight ? null : fmtClock(dl.sunset),
      sunriseMars: dl.sunrise, sunsetMars: dl.sunset,
      polarDay: dl.polarDay, night, sunsetMarginH: sunsetMargin, maxSlopeDeg: +maxSlope.toFixed(1),
      stops: visited.map((s) => s.title), ls: +ls.toFixed(1), walkBackH,
      thermal: solThermal,
      plss: { o2Kg, o2Pct, waterL, waterPct, batteryWh, batteryPct },
    })
    solIndex++
    if (used < 1e-6 && li >= legs.length && !curStop && si >= stops.length) { sols.pop(); break }
  }

  // ---- environment, PLSS telemetry, and hazards for the whole trip ----
  const ls0 = solarLongitude(date)
  const comms = commsDelay(date)
  const mid = points[Math.floor(points.length / 2)]
  const dl0 = daylight(points[0].lat, ls0)
  const thermal = estimateMarsThermal(mid.lat, mid.elevKm, ls0)
  const totalEva = sols.reduce((s, x) => s + x.evaHours, 0)

  const peakO2Pct = sols.length ? Math.max(...sols.map((s) => s.plss.o2Pct)) : 0
  const peakWaterPct = sols.length ? Math.max(...sols.map((s) => s.plss.waterPct)) : 0
  const peakBatteryPct = sols.length ? Math.max(...sols.map((s) => s.plss.batteryPct)) : 0
  const peakO2Kg = sols.length ? Math.max(...sols.map((s) => s.plss.o2Kg)) : 0
  const peakWaterL = sols.length ? Math.max(...sols.map((s) => s.plss.waterL)) : 0
  const peakBatteryWh = sols.length ? Math.max(...sols.map((s) => s.plss.batteryWh)) : 0
  const worstWalkBackH = sols.reduce((m, s) => Math.max(m, s.walkBackH), 0)

  const dosePerSol = spaceWeather?.doseMsvPerSol ?? A.radiationMsvPerSol
  const radiationMsv = +(sols.length * dosePerSol).toFixed(2)
  const shieldPct = route.shelterPoint?.shieldingPct ?? 24
  const shieldedRadiationMsv = +(radiationMsv * (1 - shieldPct / 100)).toFixed(2)

  if (sols.some((s) => s.night)) warnings.push({ severity: 'critical', title: 'EVA in darkness', detail: 'At least one sol has little or no daylight at this latitude and season. Choose another date or location.' })
  if (sols.some((s) => s.sunsetMarginH != null && s.sunsetMarginH < 0)) warnings.push({ severity: 'critical', title: 'Sunset overrun', detail: 'EVA runs past sunset on at least one sol. Shorten EVA hours or split the route.' })
  if (isDustSeason(ls0) || sols.some((s) => isDustSeason(s.ls))) warnings.push({ severity: 'caution', title: 'Dust-storm season', detail: `Ls ${ls0.toFixed(0)}° is in the Ls 180–360 dust season: expect lower solar power and visibility, and keep a contingency sol.` })
  if (comms.oneWayMin > A.autonomousDelayMin) warnings.push({ severity: 'info', title: 'Autonomous operations', detail: `One-way radio delay is ${comms.oneWayMin} min (round trip ${comms.roundTripMin} min). Mission control cannot give real-time help; pre-agree decisions for each leg.` })
  if (travel === 'foot') {
    if (worstWalkBackH > A.suitReserveH) warnings.push({ severity: 'critical', title: 'Beyond walk-back range', detail: `Up to ${worstWalkBackH} h from the nearest camp on foot, but the suit reserve covers about ${A.suitReserveH} h. Use shorter EVAs, relay camps, or a pressurised rover.` })
  }
  if (peakO2Pct > 85 || peakWaterPct > 85 || peakBatteryPct > 85) {
    warnings.push({
      severity: peakO2Pct >= 98 || peakWaterPct >= 98 ? 'critical' : 'caution',
      title: 'High PLSS suit consumables draw',
      detail: `Peak single-sol suit load reaches ${Math.max(peakO2Pct, peakWaterPct, peakBatteryPct)}% capacity (${peakO2Kg} kg O₂, ${peakWaterL} L cooling H₂O) with ${payloadKg} kg science payload. Reduce EVA hours/sol or lighten equipment.`,
    })
  }
  if (spaceWeather?.alertLevel === 'STORM ALERT') {
    warnings.push({
      severity: 'critical',
      title: 'Solar Particle Event (SPE) Storm Alert',
      detail: `Surface dose rate elevated to ${dosePerSol} mSv/sol. Abort exposed ridge traverse and shelter at km ${route.shelterPoint?.km ?? 0} (${route.shelterPoint?.feature ?? 'local trough'}, -${shieldPct}% dose).`,
    })
  } else if (spaceWeather?.alertLevel === 'ELEVATED') {
    warnings.push({
      severity: 'caution',
      title: 'Elevated Space Weather (CME Watch)',
      detail: `Coronal Mass Ejection transit raises dose to ${dosePerSol} mSv/sol. Keep within 45 min of ${route.shelterPoint?.feature ?? 'topographic shelter'} at km ${route.shelterPoint?.km ?? 0}.`,
    })
  }

  if (travel === 'rover' && roverTelemetry) {
    if (roverTelemetry.totalWh > roverTelemetry.usableWh) {
      warnings.push({
        severity: 'critical',
        title: 'Rover battery usable reserve exceeded',
        detail: `Newtonian drive model requires ${roverTelemetry.totalKwh} kWh (${roverTelemetry.rover.massKg} kg at 3.71 m/s²), exceeding ${roverTelemetry.usableKwh} kWh usable capacity (${roverTelemetry.rover.batteryKwh} kWh pack minus ${roverTelemetry.rover.reservePct}% reserve).`,
      })
    }
    if (roverTelemetry.peakKw > roverTelemetry.rover.maxDriveKw) {
      warnings.push({
        severity: 'caution',
        title: 'Peak climb exceeds nominal motor rating',
        detail: `Climb near km ${roverTelemetry.peakAtKm} draws ${roverTelemetry.peakKw} kW against ${roverTelemetry.rover.maxDriveKw} kW continuous traction motor rating.`,
      })
    }
  }

  return {
    travel, baseKmh, assumptions: A,
    payloadKg, crewSize,
    thermal,
    roverTelemetry,
    suitTelemetry: {
      peakO2Kg, peakO2Pct, o2CapacityKg: A.o2CapacityKg,
      peakWaterL, peakWaterPct, waterCapacityL: A.waterCapacityL,
      peakBatteryWh, peakBatteryPct, batteryCapacityWh: A.batteryCapacityWh,
      worstWalkBackH, suitReserveH: A.suitReserveH,
    },
    startDate: date, ls: +ls0.toFixed(1), season: seasonName(ls0, points[0].lat), dustSeason: isDustSeason(ls0),
    daylightStart: dl0, daylightMid: daylight(mid.lat, ls0),
    comms, sols, totalSols: sols.length, totalEvaHours: +totalEva.toFixed(1),
    radiationMsv: +radiationMsv.toFixed(1),
    radiationExactMsv: radiationMsv,
    shieldedRadiationMsv,
    doseMsvPerSol: dosePerSol,
    warnings,
  }
}

/**
 * Computes real-time Point-of-No-Return (PNR), Remaining Suit Consumables, Walk-Back time,
 * and Emergency Radiation Shelter ETA at any point along the route (or worst-case midpoint).
 */
export function computeAbortTelemetry(route, plan, activePoint = null, spaceWeather = null) {
  if (!route?.points?.length || !plan?.sols?.length) return null

  const pt =
    activePoint ||
    route.points[Math.floor(route.points.length * 0.5)] ||
    route.points[0]
  const km = pt.km ?? 0

  // Find the Sol containing this km mark
  const solObj =
    plan.sols.find((s) => km >= s.startKm - 1e-4 && km <= s.endKm + 1e-4) ||
    plan.sols[plan.sols.length - 1]

  const solSpanKm = Math.max(0.05, solObj.endKm - solObj.startKm)
  const solProgress = clamp((km - solObj.startKm) / solSpanKm, 0, 1)

  // Consumables used so far in the current Sol & remaining in the tank
  const usedO2Kg = +(solObj.plss.o2Kg * solProgress).toFixed(2)
  const remO2Kg = +Math.max(0, A.o2CapacityKg - usedO2Kg).toFixed(2)
  const remO2Pct = clamp(Math.round((remO2Kg / A.o2CapacityKg) * 100), 0, 100)

  const usedWaterL = +(solObj.plss.waterL * solProgress).toFixed(2)
  const remWaterL = +Math.max(0, A.waterCapacityL - usedWaterL).toFixed(2)
  const remWaterPct = clamp(Math.round((remWaterL / A.waterCapacityL) * 100), 0, 100)

  const usedBatteryWh = Math.round(solObj.plss.batteryWh * solProgress)
  const remBatteryWh = Math.max(0, A.batteryCapacityWh - usedBatteryWh)
  const remBatteryPct = clamp(Math.round((remBatteryWh / A.batteryCapacityWh) * 100), 0, 100)

  // Distance & emergency walk-back time to nearest Sol camp (Habitat / Relay Rover)
  const distToStartCampKm = Math.max(0, km - solObj.startKm)
  const distToEndCampKm = Math.max(0, solObj.endKm - km)
  const nearestCampKm = +Math.min(distToStartCampKm, distToEndCampKm).toFixed(2)
  const nearestCampLabel =
    distToStartCampKm <= distToEndCampKm
      ? solObj.sol === 1
        ? route.start.name
        : `Sol ${solObj.sol} Start Camp`
      : solObj.sol === plan.sols.length
      ? route.end.name
      : `Sol ${solObj.sol} End Camp`

  const localSlope = pt.slopeDeg ?? 4
  const effSpeedKmh = Math.max(1.1, plan.baseKmh * speedFactor(localSlope * 0.7))
  const walkBackHours = +(nearestCampKm / effSpeedKmh).toFixed(2)
  const walkBackMin = Math.round(walkBackHours * 60)
  const walkBackO2Kg = +(walkBackHours * A.o2KgPerHourBase * 1.15).toFixed(2)
  const postAbortO2Pct = clamp(Math.round(((remO2Kg - walkBackO2Kg) / A.o2CapacityKg) * 100), 0, 100)

  // Distance & ETA to the route's natural topographic radiation shelter
  const shelter = route.shelterPoint
  const shelterDistKm = shelter ? +Math.abs(km - shelter.km).toFixed(2) : 0
  const shelterEtaMin = shelter ? Math.max(1, Math.round((shelterDistKm / effSpeedKmh) * 60)) : 0

  // Point-of-No-Return (PNR) safety status
  const isStorm = spaceWeather?.alertLevel === 'STORM ALERT'
  const isElevated = spaceWeather?.alertLevel === 'ELEVATED'
  let pnrStatus = 'GO'
  let pnrTone = 'ok'
  let pnrReason = 'Within 2.0 h walk-back reserve & nominal PLSS O₂ margin.'

  if (
    (plan.travel === 'foot' && walkBackHours > A.suitReserveH) ||
    remO2Kg < walkBackO2Kg + 0.05 ||
    (isStorm && shelterEtaMin > 30)
  ) {
    pnrStatus = 'NO-GO · ABORT'
    pnrTone = 'crit'
    pnrReason =
      isStorm && shelterEtaMin > 30
        ? `SPE Storm active and shelter is ${shelterEtaMin} min away (>30 min limit).`
        : walkBackHours > A.suitReserveH
        ? `Walk-back to ${nearestCampLabel} requires ${walkBackHours} h (exceeds ${A.suitReserveH} h suit reserve).`
        : `Remaining O₂ (${remO2Kg} kg) below safe walk-back requirement (${walkBackO2Kg} kg).`
  } else if (
    (plan.travel === 'foot' && walkBackHours > A.suitReserveH * 0.72) ||
    postAbortO2Pct < 20 ||
    isStorm ||
    (isElevated && shelterEtaMin > 45)
  ) {
    pnrStatus = 'CAUTION · PNR NEAR'
    pnrTone = 'warn'
    pnrReason = isStorm
      ? `SPE Storm Alert: proceed to ${shelter?.feature || 'shelter'} (${shelterEtaMin} min away).`
      : `Approaching walk-back reserve limit (${walkBackHours} h / ${A.suitReserveH} h max).`
  }

  const ptThermal = estimateMarsThermal(pt.lat ?? route.start.lat, pt.elevKm ?? -4.0, plan.ls)

  return {
    km: +km.toFixed(1),
    sol: solObj.sol,
    remO2Kg,
    remO2Pct,
    remWaterL,
    remWaterPct,
    remBatteryWh,
    remBatteryPct,
    nearestCampKm,
    nearestCampLabel,
    walkBackHours,
    walkBackMin,
    walkBackO2Kg,
    postAbortO2Pct,
    shelterDistKm,
    shelterEtaMin,
    pnrStatus,
    pnrTone,
    pnrReason,
    thermal: ptThermal,
  }
}
