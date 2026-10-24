// Earth-Mars distance and radio delay for a given date, from approximate Keplerian elements
// (JPL "Approximate Positions of the Planets", valid 1800-2050, accuracy of a few 0.001 AU).

import { julianDay } from './marsTime.js'

const RAD = Math.PI / 180
const AU_KM = 149597870.7
const C_KM_S = 299792.458

// [value at J2000, rate per Julian century]
const ELEMENTS = {
  earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], O: [0, 0] },
  mars:  { a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882],   I: [1.84969142, -0.00813131],  L: [-4.55343205, 19140.30268499], w: [-23.94362959, 0.44441088], O: [49.55953891, -0.29257343] },
}

function heliocentric(el, T) {
  const v = (k) => el[k][0] + el[k][1] * T
  const a = v('a'), e = v('e'), I = v('I') * RAD
  const w = v('w'), O = v('O')
  const M = (((v('L') - w) % 360) + 360) % 360 * RAD
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const om = (w - O) * RAD, Om = O * RAD
  const cw = Math.cos(om), sw = Math.sin(om), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I)
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ]
}

export function earthMarsDistanceAU(date) {
  const T = (julianDay(date) - 2451545.0) / 36525
  const e = heliocentric(ELEMENTS.earth, T)
  const m = heliocentric(ELEMENTS.mars, T)
  return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2])
}

export function commsDelay(date) {
  const au = earthMarsDistanceAU(date)
  const km = au * AU_KM
  const oneWayMin = km / C_KM_S / 60
  return {
    distanceAU: +au.toFixed(3),
    distanceMkm: +(km / 1e6).toFixed(1),
    oneWayMin: +oneWayMin.toFixed(1),
    roundTripMin: +(oneWayMin * 2).toFixed(1),
  }
}
