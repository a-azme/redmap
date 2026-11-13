// Turns the planner's hazard grids into a translucent heat-map image for the map.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const lerp = (a, b, t) => a + (b - a) * t
const mix = (c0, c1, t) => c0.map((v, i) => lerp(v, c1[i], t))

// [value, r, g, b, alpha]; values are in degrees (slope) or km (low ground)
const RAMPS = {
  slope: [[4, 255, 214, 10, 0], [6, 255, 214, 10, 0.35], [10, 255, 140, 20, 0.5], [14, 235, 50, 40, 0.62], [20, 160, 10, 60, 0.75]],
  bump: [[2, 255, 214, 10, 0], [3.5, 255, 214, 10, 0.35], [6, 255, 140, 20, 0.5], [9, 235, 50, 40, 0.62], [14, 160, 10, 60, 0.75]],
  low: [[0.15, 150, 170, 255, 0], [0.3, 150, 170, 255, 0.3], [0.7, 180, 90, 230, 0.5], [1.2, 230, 40, 170, 0.68]],
}

/** rgba (0-255, alpha 0-1) for a hazard value. kind: 'slope' (deg) | 'low' (km) | 'bump' (deg) */
export function hazardColor(kind, value) {
  const ramp = RAMPS[kind]
  if (value <= ramp[0][0]) return [ramp[0][1], ramp[0][2], ramp[0][3], 0]
  for (let i = 1; i < ramp.length; i++) {
    if (value <= ramp[i][0]) {
      const t = (value - ramp[i - 1][0]) / (ramp[i][0] - ramp[i - 1][0])
      const c = mix(ramp[i - 1].slice(1), ramp[i].slice(1), t)
      return [Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), c[3]]
    }
  }
  const last = ramp[ramp.length - 1]
  return [last[1], last[2], last[3], last[4]]
}

export const HAZARD_LEGENDS = {
  slope: { title: 'Slope risk', stops: ['< 6°', '10°', '14°', '20°+'], gradient: 'linear-gradient(to right, rgba(255,214,10,.35), rgb(255,140,20), rgb(235,50,40), rgb(160,10,60))' },
  bump: { title: 'Bumpiness', stops: ['< 3.5°', '6°', '9°', '14°+'], gradient: 'linear-gradient(to right, rgba(255,214,10,.35), rgb(255,140,20), rgb(235,50,40), rgb(160,10,60))' },
  keep: {
    title: 'No-go zones',
    swatches: [['rgba(245,165,36,.45)', 'Safety buffer'], ['rgba(235,50,40,.7)', 'Steep walls'], ['rgba(180,70,230,.7)', 'Deep pits'], ['rgba(255,140,20,.7)', 'Very bumpy ground']],
  },
  low: { title: 'Low ground', stops: ['0.3 km', '0.7 km', '1.2 km+'], gradient: 'linear-gradient(to right, rgba(150,170,255,.35), rgb(180,90,230), rgb(230,40,170))' },
}

// colour for each no-go code: 1 buffer, 2 steep walls, 3 deep pits, 4 very bumpy ground
const KEEP_COLORS = { 1: [245, 165, 36, 0.25], 2: [235, 50, 40, 0.65], 3: [180, 70, 230, 0.65], 4: [255, 140, 20, 0.65] }
export const keepColor = (code) => KEEP_COLORS[code] ?? [0, 0, 0, 0]

/** Degrees west/south/east/north for the grid, or null if it crosses the +-180 line (drawn only when it does not). */
export function hazardRectangle(h) {
  const wrap = (l) => ((((l + 180) % 360) + 360) % 360) - 180
  const west = wrap(h.bounds.lonMin)
  const east = west + (h.bounds.lonMax - h.bounds.lonMin)
  if (east > 180) return null
  return { west, east, south: h.bounds.latMin, north: h.bounds.latMax }
}

/** Browser only: a gw x gh canvas, north at the top, ready to use as an image. */
export function renderHazardCanvas(h, kind) {
  const c = document.createElement('canvas')
  c.width = h.gw; c.height = h.gh
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(h.gw, h.gh)
  const src = { slope: h.slope, low: h.low, bump: h.bump, keep: h.keep }[kind]
  const scale = { slope: 4, low: 100, bump: 16 }[kind]
  for (let i = 0; i < src.length; i++) {
    const [r, g, b, a] = kind === 'keep' ? keepColor(src[i]) : hazardColor(kind, src[i] / scale)
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b
    img.data[i * 4 + 3] = Math.round(clamp(a, 0, 1) * 255)
  }
  ctx.putImageData(img, 0, 0)
  return c
}
