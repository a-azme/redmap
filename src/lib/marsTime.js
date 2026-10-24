// Mars calendar and sunlight maths (Allison & McEwen 2000, "Mars24" algorithm, without the small planetary perturbation terms).
// Pure functions, no dependencies.

const RAD = Math.PI / 180
export const SOL_SECONDS = 88775.244
export const SOL_EARTH_HOURS = SOL_SECONDS / 3600 // 24.66 h
export const MARS_HOUR_IN_EARTH_HOURS = SOL_EARTH_HOURS / 24 // 1 Mars hour = 1/24 sol
export const OBLIQUITY_DEG = 25.19

export const julianDay = (date) => date.getTime() / 86400000 + 2440587.5
const norm360 = (d) => ((d % 360) + 360) % 360

/** Areocentric solar longitude Ls (0-360 deg) for an Earth date. 0 = northern spring equinox. */
export function solarLongitude(date) {
  const dt = julianDay(date) - 2451545.0
  const M = norm360(19.3871 + 0.52402075 * dt)
  const alphaFMS = 270.3863 + 0.5240384 * dt
  const m = M * RAD
  const eoc =
    (10.691 + 3.0e-7 * dt) * Math.sin(m) + 0.623 * Math.sin(2 * m) + 0.05 * Math.sin(3 * m) +
    0.005 * Math.sin(4 * m) + 0.0005 * Math.sin(5 * m)
  return norm360(alphaFMS + eoc)
}

export function seasonName(ls, lat = 0) {
  const north = ['Northern spring', 'Northern summer', 'Northern autumn', 'Northern winter']
  const south = ['Southern autumn', 'Southern winter', 'Southern spring', 'Southern summer']
  const i = Math.floor(norm360(ls) / 90)
  return (lat >= 0 ? north : south)[i]
}

/** Dust-storm season on Mars runs from roughly Ls 180 to Ls 360 (perihelion is near Ls 251). */
export const isDustSeason = (ls) => ls >= 180 && ls < 360

export const solarDeclinationDeg = (ls) =>
  Math.asin(Math.sin(OBLIQUITY_DEG * RAD) * Math.sin(ls * RAD)) / RAD

/**
 * Daylight at a latitude. Times are local true solar time in Mars hours (0-24, noon = 12).
 * Returns { polarDay, polarNight, sunrise, sunset, daylightMarsH, daylightEarthH }.
 */
export function daylight(latDeg, ls) {
  const dec = solarDeclinationDeg(ls) * RAD
  const x = -Math.tan(latDeg * RAD) * Math.tan(dec)
  if (x <= -1) return { polarDay: true, polarNight: false, sunrise: 0, sunset: 24, daylightMarsH: 24, daylightEarthH: 24 * MARS_HOUR_IN_EARTH_HOURS }
  if (x >= 1) return { polarDay: false, polarNight: true, sunrise: 12, sunset: 12, daylightMarsH: 0, daylightEarthH: 0 }
  const h0 = Math.acos(x) / RAD // hour angle in degrees; 15 deg per Mars hour
  const half = h0 / 15
  return {
    polarDay: false, polarNight: false,
    sunrise: 12 - half, sunset: 12 + half,
    daylightMarsH: 2 * half, daylightEarthH: 2 * half * MARS_HOUR_IN_EARTH_HOURS,
  }
}

/** 8.5 -> "08:30" (Mars clock, wraps at 24) */
export function fmtClock(marsHours) {
  const h = ((marsHours % 24) + 24) % 24
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60)
  if (mm === 60) { hh = (hh + 1) % 24; mm = 0 }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
