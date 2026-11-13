// Newtonian Mars Rover mechanical & electrical energy model.
// Pure maths, zero DOM dependencies, compatible with `node --test`.

export const MARS_G = 3.71 // m/s^2 Martian surface gravity

export const ROVER_DEFAULT = {
  name: '2-Crew Utility Rover',
  massKg: 1200,         // vehicle + 2 suited crew baseline mass (kg)
  batteryKwh: 15,       // nominal high-density Li-ion pack capacity (kWh)
  reservePct: 25,       // mandatory contingency reserve (%)
  maxDriveKw: 4.0,      // peak traction motor electrical rating (kW)
  slopeLimitDeg: 15,    // nominal operational grade limit (deg)
  speedKmh: 10,         // level-ground cruising speed (km/h)
  hotelW: 300,          // continuous avionics, thermal & comms load (W)
  crr: 0.15,            // wheel rolling resistance on loose Martian regolith
  drivetrainEff: 0.65,  // battery-to-wheel mechanical efficiency
  regenEff: 0.30,       // downhill regenerative braking recovery share
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const rad = (d) => (d * Math.PI) / 180

/** Driving speed (km/h): top speed on flat ground, falling linearly with grade, never below 30%. */
export function roverSpeedKmh(rover, slopeDeg) {
  return rover.speedKmh * clamp(1 - Math.abs(slopeDeg) / (2 * rover.slopeLimitDeg), 0.3, 1)
}

/** Electrical energy (Wh), time (h), and peak traction power (W) for one segment. gradeDeg > 0 is uphill. */
export function stretchCost(rover, lenKm, gradeDeg) {
  const g = rad(gradeDeg)
  const v = roverSpeedKmh(rover, gradeDeg) // km/h
  const hours = lenKm / v
  const force = rover.massKg * MARS_G * (rover.crr * Math.cos(g) + Math.sin(g)) // Newtons
  const mechWh = (force * lenKm * 1000) / 3600
  const driveWh = mechWh >= 0 ? mechWh / rover.drivetrainEff : mechWh * rover.regenEff
  const peakW = force > 0 ? (force * (v / 3.6)) / rover.drivetrainEff : 0
  return { wh: driveWh + rover.hotelW * hours, hours, peakW }
}

/** Signed grade (degrees) of each step between route points, from their km marks and elevations (km). */
function steps(points) {
  const out = []
  for (let i = 1; i < points.length; i++) {
    const len = points[i].km - points[i - 1].km
    if (!(len > 0)) {
      out.push({ len: 0, grade: 0 })
      continue
    }
    const dh = (points[i].elevKm ?? 0) - (points[i - 1].elevKm ?? 0)
    out.push({ len, grade: (Math.atan2(dh, len) * 180) / Math.PI })
  }
  return out
}

/** First km where remaining battery is no longer sufficient to drive back to the habitat, or null if full return is covered. */
export function pointOfNoReturnKm(points, analysis) {
  if (!analysis || !points?.length) return null
  for (let i = 1; i < points.length; i++) {
    if (analysis.batteryWh - analysis.cumWh[i] < analysis.backWh[i]) {
      const a = analysis.batteryWh - analysis.cumWh[i - 1] - analysis.backWh[i - 1]
      const b = analysis.batteryWh - analysis.cumWh[i] - analysis.backWh[i]
      const f = a / (a - b || 1)
      return +(points[i - 1].km + clamp(f, 0, 1) * (points[i].km - points[i - 1].km)).toFixed(1)
    }
  }
  return null
}

/**
 * Safe halt stops: flat ground spaced along the route where the crew can park, wait out a fault, or turn back.
 */
export function safeStops(points, analysis, { maxSlopeDeg = 5, spacingKm } = {}) {
  if (!analysis || !points?.length) return []
  const total = points[points.length - 1].km
  const gap = spacingKm ?? clamp(total / 4, 0.5, 5)
  const batteryWh = analysis.batteryWh
  const mk = (i, label) => {
    const left = batteryWh - analysis.cumWh[i]
    return {
      label,
      km: +points[i].km.toFixed(1),
      lat: points[i].lat,
      lon: points[i].lon,
      elevKm: points[i].elevKm,
      slopeDeg: points[i].slopeDeg,
      batteryLeftPct: clamp(Math.round((100 * left) / batteryWh), 0, 100),
      backWh: Math.round(analysis.backWh[i]),
      canDriveHome: left >= analysis.backWh[i],
    }
  }
  const stops = [mk(0, 'Habitat (start)')]
  for (let from = gap; from < total - gap * 0.4; from += gap) {
    let best = -1
    points.forEach((p, i) => {
      if (p.km < from - gap / 2 || p.km >= from + gap / 2 || i === 0 || i === points.length - 1) return
      const near = Math.max(points[i - 1]?.slopeDeg ?? 0, p.slopeDeg, points[i + 1]?.slopeDeg ?? 0)
      if (near > maxSlopeDeg) return
      if (
        best < 0 ||
        near < Math.max(points[best - 1]?.slopeDeg ?? 0, points[best].slopeDeg, points[best + 1]?.slopeDeg ?? 0)
      ) {
        best = i
      }
    })
    if (best > 0) stops.push(mk(best, `Safe stop ${stops.length}`))
  }
  stops.push(mk(points.length - 1, 'Destination'))
  return stops
}

/**
 * Energy, time, and peak power for driving a route and returning from every point.
 * points: [{ km, elevKm, slopeDeg }].
 */
export function roverAnalysis(points, roverOverrides = {}) {
  if (!points || points.length < 2) return null
  const rover = { ...ROVER_DEFAULT, ...roverOverrides }
  const st = steps(points)
  const out = [0]
  const back = [0]
  const time = [0]
  let peakW = 0
  let peakAtKm = 0

  st.forEach((s, i) => {
    if (!(s.len > 0)) {
      out.push(out[i])
      back.push(back[i])
      time.push(time[i])
      return
    }
    const fwd = stretchCost(rover, s.len, s.grade)
    const rev = stretchCost(rover, s.len, -s.grade)
    out.push(out[i] + fwd.wh)
    back.push(back[i] + rev.wh)
    time.push(time[i] + fwd.hours)
    if (fwd.peakW > peakW) {
      peakW = fwd.peakW
      peakAtKm = points[i].km
    }
  })

  const totalWh = Math.max(0, out[out.length - 1])
  const batteryWh = rover.batteryKwh * 1000
  const usableWh = batteryWh * (1 - rover.reservePct / 100)
  const returnFromEndWh = Math.max(0, back[back.length - 1])

  const baseResult = {
    rover,
    totalWh: Math.round(totalWh),
    totalKwh: +(totalWh / 1000).toFixed(2),
    driveHours: +time[time.length - 1].toFixed(2),
    usableWh: Math.round(usableWh),
    usableKwh: +(usableWh / 1000).toFixed(2),
    batteryWh: Math.round(batteryWh),
    batteryKwh: +rover.batteryKwh.toFixed(1),
    batteryUsedPct: clamp(+((100 * totalWh) / batteryWh).toFixed(1), 0, 999),
    usableUsedPct: clamp(+((100 * totalWh) / Math.max(1, usableWh)).toFixed(1), 0, 999),
    peakKw: +(peakW / 1000).toFixed(2),
    peakAtKm: +peakAtKm.toFixed(1),
    cumWh: out,
    backWh: back,
    cumHours: time,
    returnFromEndWh: Math.round(returnFromEndWh),
    returnFromEndKwh: +(returnFromEndWh / 1000).toFixed(2),
  }

  baseResult.pnrKm = pointOfNoReturnKm(points, baseResult)
  baseResult.safeStops = safeStops(points, baseResult)
  return baseResult
}
