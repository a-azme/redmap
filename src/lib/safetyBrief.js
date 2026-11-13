// Aerospace Mission Flight Verdict (GO / CAUTION / NO-GO) for a planned Mars EVA.
// Pure maths, zero DOM dependencies, compatible with `node --test`.

import { EVA_ASSUMPTIONS, speedFactor } from './evaPlan.js'

export const SAFETY_LIMITS = {
  walkBackCaution: 0.75,  // caution once walk-back reaches 75% of the suit reserve
  slopeCaution: 0.8,      // caution once steepest grade reaches 80% of the slope limit
  sunsetCautionH: 1.0,    // caution when EVA finishes within 1.0 Earth hour of sunset
  coldC: -75,             // extreme cold suit heater threshold (°C)
}

/**
 * Hours needed to walk back to the nearest Sol camp or habitat along the route.
 */
export function walkBackProfile(points) {
  if (!points?.length) return [0]
  const hours = [0]
  for (let i = 1; i < points.length; i++) {
    const len = Math.max(0, points[i].km - points[i - 1].km)
    const slope = ((points[i].slopeDeg ?? 0) + (points[i - 1].slopeDeg ?? 0)) / 2
    hours.push(hours[i - 1] + len / (EVA_ASSUMPTIONS.footKmh * speedFactor(slope)))
  }
  return hours
}

/** km along the route where walking back to start first requires more than `reserveH`, or null if always within reserve. */
export function turnBackKm(points, hours, reserveH = EVA_ASSUMPTIONS.suitReserveH) {
  if (!points?.length || !hours?.length) return null
  for (let i = 1; i < points.length; i++) {
    if (hours[i] > reserveH) {
      const denom = hours[i] - hours[i - 1] || 1
      const f = (reserveH - hours[i - 1]) / denom
      return points[i - 1].km + Math.max(0, Math.min(1, f)) * (points[i].km - points[i - 1].km)
    }
  }
  return null
}

/** Stretches of the route steeper than `limit`: [{ from, to, max }] in km and degrees. */
export function steepRuns(points, limit) {
  const runs = []
  let cur = null
  for (const p of points || []) {
    if (p.slopeDeg > limit) {
      if (!cur) cur = { from: p.km, to: p.km, max: p.slopeDeg }
      cur.to = p.km
      cur.max = Math.max(cur.max, p.slopeDeg)
    } else if (cur) {
      runs.push(cur)
      cur = null
    }
  }
  if (cur) runs.push(cur)
  return runs
}

const RANK = { ok: 0, info: 0, caution: 1, stop: 2 }
const f1 = (n) => (Math.round(Number(n || 0) * 10) / 10).toString()

/**
 * Builds the comprehensive pre-sortie flight readiness verdict.
 */
export function buildSafetyBrief(route, plan, spaceWeather = null) {
  if (!route?.points?.length || !plan) return null
  const L = SAFETY_LIMITS
  const A = EVA_ASSUMPTIONS
  const rover = plan.travel === 'rover' ? plan.roverTelemetry : null
  const checks = []
  const add = (id, status, title, detail, chip) => checks.push({ id, status, title, detail, chip })

  // 1. Elevation & Imagery Resolution Check
  const res = route.dataSource?.resolutionKm
  const resM = res ? Math.round(res * 1000) : 150
  if (route.reliability === 'simulated' || route.dataSource?.real === false) {
    add(
      'data',
      'stop',
      'Simulated terrain fallback',
      'NASA MOLA elevation tiles could not be loaded; slopes are illustrative only. Do not commit an EVA on simulated data.',
      'Data: Sim'
    )
  } else if (route.reliability === 'overview' || route.reliability === 'hopped') {
    add(
      'data',
      'stop',
      'Terrain grid too coarse for EVA',
      `Elevation is sampled every ~${resM} m over this long distance. Plan localized legs inside Gale or Jezero Crater.`,
      `Grid ${resM} m`
    )
  } else {
    add(
      'data',
      'ok',
      'NASA MOLA DEM + HiRISE 25 cm/px coverage',
      `Elevation sampled every ~${resM} m on NASA MOLA DEM, nested inside 5 m/px CTX and 25 cm/px HiRISE ortho-mosaics for boulder-level visual scouting.`,
      `DEM ${resM} m`
    )
  }

  // 2. Walk-Back Reserve & Emergency Return Check
  const hours = walkBackProfile(route.points)
  const maxBack = plan.suitTelemetry?.worstWalkBackH ?? hours[hours.length - 1]
  const tb = turnBackKm(route.points, hours)
  const reserve = A.suitReserveH

  if (plan.travel === 'rover') {
    if (tb !== null) {
      add(
        'walkback',
        'caution',
        'Beyond unassisted walk-back if rover fails',
        `Farthest point requires ${f1(maxBack)} h on foot against a ${reserve} h PLSS reserve (unassisted walk-back limit at km ${f1(tb)}). Pressurized rover provides primary life support; keep portable emergency O₂ cache.`,
        `Walk-back ${f1(maxBack)} h`
      )
    } else {
      add(
        'walkback',
        'ok',
        'Within walk-back reserve along entire drive',
        `Crew remains within ${f1(maxBack)} h walking time of camp (${reserve} h PLSS suit reserve) even in a total vehicle fault.`,
        `Walk-back ${f1(maxBack)} h`
      )
    }
  } else {
    if (maxBack > reserve) {
      add(
        'walkback',
        'stop',
        'Exceeds 2.0 h PLSS walk-back reserve',
        `Worst-case walk back to camp requires ${f1(maxBack)} h on foot, exceeding the ${reserve} h emergency suit reserve${tb !== null ? ` past km ${f1(tb)}` : ''}. Shorten EVA hours/sol or switch to Pressurized Rover.`,
        `Walk-back ${f1(maxBack)} h`
      )
    } else if (maxBack > reserve * L.walkBackCaution) {
      add(
        'walkback',
        'caution',
        'Walk-back reserve margin is tight',
        `Farthest point reaches ${f1(maxBack)} h of the ${reserve} h suit reserve. Minimal margin for regolith slip or suit fault.`,
        `Walk-back ${f1(maxBack)} h`
      )
    } else {
      add(
        'walkback',
        'ok',
        'Within 2.0 h walk-back reserve',
        `Farthest excursion point is ${f1(maxBack)} h on foot from nearest Sol camp (suit reserve ${reserve} h).`,
        `Walk-back ${f1(maxBack)} h`
      )
    }
  }

  // 3. Terrain Slopes & No-Go Zones
  const limit = route.settings?.maxSlopeDeg ?? 15
  const criticalWarns = (route.warnings ?? []).filter((w) => w.severity === 'critical')
  if (route.maxSlopeDeg > limit || criticalWarns.length > 0) {
    const runs = steepRuns(route.points, limit)
    const where = runs
      .slice(0, 2)
      .map((r) => `km ${f1(r.from)}–${f1(r.to)} (${Math.round(r.max)}°)`)
      .join('; ')
    add(
      'terrain',
      'stop',
      rover ? 'Grade exceeds rover stability limit' : 'Slope exceeds crew safety limit',
      `${where ? `Segments ${where} exceed` : `Peak slope ${Math.round(route.maxSlopeDeg)}° exceeds`} the ${limit}° maximum limit. Increase max slope allowance or pick Safest mode.`,
      `Slope ${Math.round(route.maxSlopeDeg)}°`
    )
  } else if (route.maxSlopeDeg >= limit * L.slopeCaution) {
    add(
      'terrain',
      'caution',
      'Steep grade near operational limit',
      `Peak grade reaches ${Math.round(route.maxSlopeDeg)}° against your ${limit}° limit. Center-of-gravity shift from ${plan.payloadKg} kg payload increases slip risk.`,
      `Slope ${Math.round(route.maxSlopeDeg)}°`
    )
  } else {
    add(
      'terrain',
      'ok',
      'Slopes within operational envelope',
      `Peak grade is ${Math.round(route.maxSlopeDeg)}°, well inside your ${limit}° limit.`,
      `Slope ${Math.round(route.maxSlopeDeg)}°`
    )
  }

  const hardLegs = (route.legs ?? []).filter((l) => !l.retraceable)
  if (hardLegs.length > 0) {
    add(
      'retrace',
      'caution',
      'Steep leg to retrace uphill',
      `${hardLegs.length} leg${hardLegs.length === 1 ? '' : 's'} exceed comfortable uphill retreat angle. Confirm footing before descent.`,
      `Retrace (${hardLegs.length})`
    )
  }

  // 4. Newtonian Rover Energy & Motor Power (when in Pressurized Rover mode)
  if (rover) {
    const used = rover.totalWh
    const usable = rover.usableWh
    if (used > usable) {
      add(
        'energy',
        'stop',
        'Rover battery reserve exceeded',
        `Traverse requires ${rover.totalKwh} kWh (${rover.rover.massKg} kg at 3.71 m/s², Crr=${rover.rover.crr}), exceeding ${rover.usableKwh} kWh usable (${rover.rover.batteryKwh} kWh pack minus ${rover.rover.reservePct}% reserve).`,
        `Rover ${rover.totalKwh} kWh`
      )
    } else if (used > usable * 0.8) {
      add(
        'energy',
        'caution',
        'Rover battery margin thin',
        `Traverse consumes ${rover.totalKwh} kWh of ${rover.usableKwh} kWh usable (${rover.usableUsedPct}% of usable budget).`,
        `Rover ${rover.totalKwh} kWh`
      )
    } else {
      add(
        'energy',
        'ok',
        'Newtonian rover energy nominal',
        `Traverse consumes ${rover.totalKwh} kWh of ${rover.usableKwh} kWh usable (${rover.batteryUsedPct}% of total ${rover.rover.batteryKwh} kWh pack; peak ${rover.peakKw} kW at km ${rover.peakAtKm}).`,
        `Rover ${rover.totalKwh} kWh`
      )
    }

    if (rover.peakKw > rover.rover.maxDriveKw) {
      add(
        'power',
        'stop',
        'Climb exceeds peak traction motor rating',
        `Steepest grade near km ${rover.peakAtKm} demands ${rover.peakKw} kW, exceeding the ${rover.rover.maxDriveKw} kW motor rating.`,
        `Peak ${rover.peakKw} kW`
      )
    }
    if (used <= usable && rover.returnFromEndWh > rover.batteryWh - used) {
      add(
        'return',
        'caution',
        'Round-trip return requires recharge',
        `Driving back from destination requires ${rover.returnFromEndKwh} kWh, exceeding uncharged remainder (${f1((rover.batteryWh - used) / 1000)} kWh).`,
        `Return ${rover.returnFromEndKwh} kWh`
      )
    }
  }

  // 5. Spacesuit PLSS Consumables Load
  const st = plan.suitTelemetry
  if (st) {
    const maxPct = Math.max(st.peakO2Pct, st.peakWaterPct, st.peakBatteryPct)
    if (maxPct >= 98) {
      add(
        'suit',
        'stop',
        'PLSS single-sol consumables saturated',
        `Peak sol draw reaches ${maxPct}% capacity (${st.peakO2Kg}/${st.o2CapacityKg} kg O₂, ${st.peakWaterL}/${st.waterCapacityL} L H₂O). Reduce EVA hours/sol or equipment mass.`,
        `PLSS ${maxPct}%`
      )
    } else if (maxPct > 85) {
      add(
        'suit',
        'caution',
        'High PLSS consumables utilization',
        `Peak sol draw reaches ${maxPct}% (${st.peakO2Kg} kg O₂, ${st.peakWaterL} L cooling H₂O, ${st.peakBatteryWh} Wh battery).`,
        `PLSS ${maxPct}%`
      )
    } else {
      add(
        'suit',
        'ok',
        'PLSS consumables within nominal margin',
        `Peak sol uses ${st.peakO2Pct}% O₂ (${st.peakO2Kg} kg), ${st.peakWaterPct}% cooling H₂O (${st.peakWaterL} L), and ${st.peakBatteryPct}% suit battery.`,
        `PLSS ${maxPct}%`
      )
    }
  }

  // 6. Daylight & Sunset Window
  const margins = plan.sols.filter((s) => s.sunsetMarginH != null).map((s) => s.sunsetMarginH)
  const worstMargin = margins.length ? Math.min(...margins) : null
  if (plan.sols.some((s) => s.night)) {
    add('light', 'stop', 'Insufficient daylight', 'At least one sol lacks daylight at this latitude and season.', 'Darkness')
  } else if (worstMargin !== null && worstMargin < 0) {
    add(
      'light',
      'stop',
      'EVA overruns local sunset',
      `Schedule runs ${f1(-worstMargin)} h past local sunset. Reduce EVA hours per sol.`,
      `Sunset -${f1(-worstMargin)}h`
    )
  } else if (worstMargin !== null && worstMargin < L.sunsetCautionH) {
    add(
      'light',
      'caution',
      'Tight twilight margin before sunset',
      `Only ${f1(worstMargin)} h buffer before sunset on the longest sol.`,
      `Light +${f1(worstMargin)}h`
    )
  } else {
    add(
      'light',
      'ok',
      'Daylight window nominal',
      worstMargin === null ? 'Continuous polar daylight.' : `At least ${f1(worstMargin)} h of daylight buffer remains before sunset.`,
      worstMargin === null ? 'Polar day' : `Light +${f1(worstMargin)}h`
    )
  }

  // 7. Seasonal Dust & Diurnal Surface Temperature
  if (plan.dustSeason) {
    add(
      'dust',
      'caution',
      `Perihelion dust season (Ls ${plan.ls}°)`,
      'Ls 180°–360° is the Martian global dust storm season: expect higher atmospheric optical depth (τ) and reduced solar array output.',
      'Dust season'
    )
  } else {
    add(
      'dust',
      'ok',
      `Aphelion clear season (Ls ${plan.ls}°)`,
      `${plan.season} (Ls ${plan.ls}°) lies outside the primary global dust storm window.`,
      `Ls ${plan.ls}°`
    )
  }

  const nightLowC = plan.thermal?.nightMinC ?? route.minTempC
  const dayHighC = plan.thermal?.dayMaxC ?? route.minTempC + 45
  const inst = plan.thermal?.instrument ?? 'REMS/MEDA'
  if (nightLowC < L.coldC) {
    add(
      'cold',
      'caution',
      `Extreme diurnal cold (${nightLowC}°C night low)`,
      `${inst} model projects ${dayHighC}°C daytime peak and ${nightLowC}°C pre-dawn low. Complete EVA before dusk thermal drop.`,
      `${dayHighC}°/${nightLowC}°C`
    )
  } else {
    add(
      'cold',
      'ok',
      `Thermal envelope nominal (${dayHighC}° / ${nightLowC}°C)`,
      `${inst} diurnal range stays within standard LCVG/heater limits.`,
      `${dayHighC}°/${nightLowC}°C`
    )
  }

  // 8. Live NASA DONKI Space Weather & Topographic Radiation Shielding
  const alertLevel = spaceWeather?.alertLevel || 'NOMINAL'
  const shelter = route.shelterPoint
  if (alertLevel === 'STORM ALERT') {
    add(
      'radiation',
      'stop',
      'Solar Particle Event (SPE) Storm Alert',
      `NASA DONKI reports active SEP/CME storm (${plan.doseMsvPerSol} mSv/sol). Halt exposed traverse and shelter at km ${shelter?.km ?? 0} (${shelter?.feature ?? 'alcove'}, -${shelter?.shieldingPct ?? 25}% dose).`,
      'SPE STORM'
    )
  } else if (alertLevel === 'ELEVATED') {
    add(
      'radiation',
      'caution',
      'Elevated Space Weather (CME Watch)',
      `NASA DONKI tracks solar activity (${plan.doseMsvPerSol} mSv/sol; ~${plan.radiationMsv} mSv total, ${plan.shieldedRadiationMsv} mSv sheltered). Keep within 45 min of km ${shelter?.km ?? 0} shelter.`,
      `CME Watch · ${plan.radiationMsv} mSv`
    )
  } else {
    add(
      'radiation',
      'ok',
      'Space Weather Nominal (MSL RAD Baseline)',
      `Total mission dose ~${plan.radiationMsv} mSv (${plan.doseMsvPerSol} mSv/sol; ${plan.shieldedRadiationMsv} mSv using natural topographic shelter at km ${shelter?.km ?? 0}).`,
      `Rad ${plan.radiationMsv} mSv`
    )
  }

  // 9. Earth-Mars Light-Time Comms Latency
  if (plan.comms.oneWayMin > A.autonomousDelayMin) {
    add(
      'comms',
      'info',
      'Autonomous crew execution required',
      `One-way light time is ${plan.comms.oneWayMin} min (${plan.comms.roundTripMin} min round-trip at ${plan.comms.distanceAU} AU). Real-time Earth flight control voice loop is unavailable.`,
      `Comms ${plan.comms.oneWayMin}m`
    )
  } else {
    add(
      'comms',
      'ok',
      'Earth relay latency low',
      `One-way delay is ${plan.comms.oneWayMin} min (${plan.comms.distanceAU} AU).`,
      `Comms ${plan.comms.oneWayMin}m`
    )
  }

  const worst = checks.reduce((m, c) => Math.max(m, RANK[c.status] ?? 0), 0)
  const verdict = worst === 2 ? 'NO-GO' : worst === 1 ? 'CAUTION' : 'GO'
  const firstStop = checks.find((c) => c.status === 'stop')
  const cautionCount = checks.filter((c) => c.status === 'caution').length

  const summary =
    verdict === 'NO-GO'
      ? `Hold EVA launch: ${firstStop?.title.toLowerCase()}.`
      : verdict === 'CAUTION'
      ? `Flight cleared with ${cautionCount} operational caution${cautionCount === 1 ? '' : 's'} to verify.`
      : 'All pre-sortie flight safety checks nominal.'

  checks.sort((a, b) => (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0))

  return {
    verdict,
    summary,
    checks,
    maxWalkBackH: +maxBack.toFixed(1),
    turnBackKm: tb === null ? null : +tb.toFixed(1),
    suitReserveH: reserve,
  }
}
