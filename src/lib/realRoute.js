// Route planning on a real elevation grid.
//
// Pure logic: the caller supplies `prepareTerrain(spec)` which returns
// `{ heightAt(lat, lon) -> km, source }`. In the app that is the NASA MOLA
// sampler (services/marsElevation.js); in tests it is a synthetic surface.

import { ROUTE_MODES, blendMode, POI_NEAR_KM, RETRACE_MAX_SLOPE } from '../constants/config.js'
import { findPath, cellGradient, crossSlopeDeg } from './pathfinding.js'
import { haversineKm, finalizeRoute, estimateTempC, MARS_RADIUS_KM } from './routeAnalysis.js'

const RAD = Math.PI / 180
const KM_PER_DEG = MARS_RADIUS_KM * RAD
const wrapLon = (d) => ((((d + 180) % 360) + 360) % 360) - 180
const to360 = (l) => ((l % 360) + 360) % 360
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const LOW_GROUND_KM = 0.4 // this far below the surrounding terrain counts as a pit / crater floor

export class RouteError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

/** Bounding box + grid size for a start/end pair. Longitudes are unwrapped around lonMid. */
export function gridSpec(start, end, { maxCells = 300, minCellKm = 0.5 } = {}) {
  const dLon = wrapLon(end.lon - start.lon)
  const lonMid = start.lon + dLon / 2
  const latMid = (start.lat + end.lat) / 2
  const cosM = Math.max(0.2, Math.cos(latMid * RAD))
  const spanLat = Math.abs(end.lat - start.lat)
  const spanLon = Math.abs(dLon)
  const pad = Math.max(0.3 * Math.max(spanLat, spanLon * cosM), 0.5) // degrees

  const latMin = Math.max(-89, Math.min(start.lat, end.lat) - pad)
  const latMax = Math.min(89, Math.max(start.lat, end.lat) + pad)
  const lonHalf = spanLon / 2 + pad / cosM
  if (lonHalf * 2 > 350) throw new RouteError('too_far', 'These two locations are too far apart to plan on one grid.')
  const lonMin = lonMid - lonHalf
  const lonMax = lonMid + lonHalf

  const widthKm = (lonMax - lonMin) * KM_PER_DEG * cosM
  const heightKm = (latMax - latMin) * KM_PER_DEG
  const cellKm = Math.max(minCellKm, Math.max(widthKm, heightKm) / maxCells)
  const gw = Math.max(8, Math.round(widthKm / cellKm) + 1)
  const gh = Math.max(8, Math.round(heightKm / cellKm) + 1)
  return { bounds: { lonMin, lonMax, latMin, latMax }, lonMid, gw, gh, cellKm }
}

function blur3(src, gw, gh) {
  const out = new Float32Array(src.length)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let s = 0, n = 0
      for (let oy = -1; oy <= 1; oy++) {
        const yy = y + oy
        if (yy < 0 || yy >= gh) continue
        for (let ox = -1; ox <= 1; ox++) {
          const xx = x + ox
          if (xx < 0 || xx >= gw) continue
          s += src[yy * gw + xx]; n++
        }
      }
      out[y * gw + x] = s / n
    }
  }
  return out
}

export function buildGrid(spec, heightAt) {
  const { bounds: b, gw, gh } = spec
  const lonSpan = b.lonMax - b.lonMin
  const latSpan = b.latMax - b.latMin
  let heights = new Float32Array(gw * gh)
  let bad = 0, sum = 0
  // Coarse cells (long trips) are much bigger than the DEM pixels, so one sample per cell would pick up
  // pixel-scale noise and make smooth ground look steep and bumpy. Average a few samples across each cell instead.
  const k = spec.cellKm > 3 ? clamp(Math.round(spec.cellKm / 3), 2, 4) : 1
  const dLat = latSpan / (gh - 1), dLon = lonSpan / (gw - 1)
  for (let y = 0; y < gh; y++) {
    const lat = b.latMax - (y / (gh - 1)) * latSpan
    for (let x = 0; x < gw; x++) {
      const lon0 = b.lonMin + (x / (gw - 1)) * lonSpan
      let h = 0, n = 0
      for (let sy = 0; sy < k; sy++) {
        for (let sx = 0; sx < k; sx++) {
          const v = k === 1 ? heightAt(lat, to360(lon0)) : heightAt(Math.max(-89.9, Math.min(89.9, lat + (((sy + 0.5) / k) - 0.5) * dLat)), to360(lon0 + (((sx + 0.5) / k) - 0.5) * dLon))
          if (Number.isFinite(v)) { h += v; n++ }
        }
      }
      if (n) { heights[y * gw + x] = h / n; sum += h / n } else { heights[y * gw + x] = NaN; bad++ }
    }
  }
  if (bad / heights.length > 0.05) throw new RouteError('no_data', 'Elevation data does not cover this area.')
  if (bad) {
    const mean = sum / (heights.length - bad)
    for (let i = 0; i < heights.length; i++) if (Number.isNaN(heights[i])) heights[i] = mean
  }
  // 8-bit DEM tiles quantise heights into steps; a light blur keeps those steps from looking like cliffs.
  if (spec.cellKm <= 1.5) heights = blur3(heights, gw, gh)

  const dxRow = new Float32Array(gh)
  for (let y = 0; y < gh; y++) {
    const lat = b.latMax - (y / (gh - 1)) * latSpan
    dxRow[y] = (lonSpan / (gw - 1)) * KM_PER_DEG * Math.max(0.05, Math.cos(lat * RAD))
  }
  const dy = (latSpan / (gh - 1)) * KM_PER_DEG
  return { gw, gh, heights, dxRow, dx: dxRow[gh >> 1], dy, bounds: b, lonMid: spec.lonMid }
}

const toCell = (g, lat, lon) => {
  const b = g.bounds
  const lonU = g.lonMid + wrapLon(lon - g.lonMid)
  return {
    x: ((lonU - b.lonMin) / (b.lonMax - b.lonMin)) * (g.gw - 1),
    y: ((b.latMax - lat) / (b.latMax - b.latMin)) * (g.gh - 1),
  }
}
const cellToLatLon = (g, fx, fy) => {
  const b = g.bounds
  return {
    lat: b.latMax - (fy / (g.gh - 1)) * (b.latMax - b.latMin),
    lon: to360(b.lonMin + (fx / (g.gw - 1)) * (b.lonMax - b.lonMin)),
  }
}
const inGrid = (g, c) => c.x >= 0 && c.x <= g.gw - 1 && c.y >= 0 && c.y <= g.gh - 1

function bilinear(g, fx, fy, arr = g.heights) {
  const x = clamp(fx, 0, g.gw - 1), y = clamp(fy, 0, g.gh - 1)
  const x0 = Math.min(g.gw - 2, Math.floor(x)), y0 = Math.min(g.gh - 2, Math.floor(y))
  const u = x - x0, v = y - y0
  const h = arr, w = g.gw
  const a = h[y0 * w + x0], b = h[y0 * w + x0 + 1], c = h[(y0 + 1) * w + x0], d = h[(y0 + 1) * w + x0 + 1]
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

/** Slope (degrees) of the surface at a fractional cell position. */
function slopeAt(g, fx, fy) {
  const row = clamp(Math.round(fy), 0, g.gh - 1)
  const dx = g.dxRow[row]
  const gx = (bilinear(g, fx + 0.5, fy) - bilinear(g, fx - 0.5, fy)) / dx
  const gy = (bilinear(g, fx, fy + 0.5) - bilinear(g, fx, fy - 0.5)) / g.dy
  return Math.atan(Math.hypot(gx, gy)) / RAD
}

const RIM_RISE_KM = 0.25, RIM_SLOPE_DEG = 6
function classify(slope, depthKm = 0, riseKm = 0) {
  if (riseKm >= RIM_RISE_KM && slope >= RIM_SLOPE_DEG) return 'Crater rim'
  if (depthKm >= LOW_GROUND_KM && slope < 6) return 'Low ground'
  if (slope < 2) return 'Smooth plain'
  if (slope < 6) return 'Undulating'
  if (slope < 12) return 'Rocky'
  return 'Rugged'
}

/**
 * Any-angle post-processing of the grid path ("string pulling"): replace a stretch of the staircase
 * path by a straight line when that line stays under the slope limit and costs no more.
 */
function makeStepCost(grid, { maxSlope, slopeWeight, bonus, climb = 0, blocked = null, crossWeight = 0 }) {
  const bonusAt = (fx, fy) => (bonus ? bonus[Math.round(fy) * grid.gw + Math.round(fx)] : 1)
  const grad = crossWeight ? cellGradient(grid) : null
  return (x0, y0, x1, y1) => {
    const ym = Math.round((y0 + y1) / 2)
    const ex = (x1 - x0) * grid.dxRow[ym], ey = (y1 - y0) * grid.dy
    const lenKm = Math.hypot(ex, ey)
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
    const d = lenKm / n
    let cost = 0
    let h0 = bilinear(grid, x0, y0)
    for (let k = 1; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n
      const h1 = bilinear(grid, x, y)
      const slope = (Math.atan(Math.abs(h1 - h0) / d) * 180) / Math.PI
      if (slope > maxSlope) return Infinity
      const ci = Math.round(y) * grid.gw + Math.round(x)
      if (blocked && blocked[ci]) return Infinity
      const side = grad ? crossWeight * (crossSlopeDeg(grad.gx[ci], grad.gy[ci], ex, ey) / 10) ** 2 : 0
      cost += d * (1 + slopeWeight * (slope / 10) ** 2 + side) * bonusAt(x, y) + climb * Math.max(0, h1 - h0)
      h0 = h1
    }
    return cost
  }
}

export function shortcutPath(grid, nodes, opts, pins = []) {
  const stepCost = makeStepCost(grid, opts)
  const isPin = (n) => pins.some((q) => Math.abs(q.x - n.fx) < 1e-6 && Math.abs(q.y - n.fy) < 1e-6)
  // first pass looks 80 nodes ahead (the staircase path is long); later passes see the whole, much shorter, list
  let cur = nodes
  for (let pass = 0; pass < 3; pass++) {
    const reach = pass === 0 ? 80 : cur.length
    const edge = cur.map((p, i) => (i ? stepCost(cur[i - 1].fx, cur[i - 1].fy, p.fx, p.fy) : 0))
    const out = [cur[0]]
    let i = 0
    while (i < cur.length - 1) {
      let best = i + 1
      let along = edge[i + 1]
      for (let j = i + 2; j < Math.min(cur.length, i + reach); j++) {
        if (isPin(cur[j - 1])) break // never jump over a science waypoint
        along += edge[j]
        const direct = stepCost(cur[i].fx, cur[i].fy, cur[j].fx, cur[j].fy)
        if (direct <= along * 1.0005) best = j
      }
      out.push(cur[best])
      i = best
    }
    if (out.length === cur.length) break
    cur = out
  }
  return cur
}

/** Splits long segments so the relaxation below has enough points to bend the route smoothly. */
export function subdividePath(nodes, maxCells = 6) {
  const out = [nodes[0]]
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1], b = nodes[i]
    const n = Math.ceil(Math.hypot(b.fx - a.fx, b.fy - a.fy) / maxCells)
    for (let k = 1; k < n; k++) out.push({ fx: a.fx + ((b.fx - a.fx) * k) / n, fy: a.fy + ((b.fy - a.fy) * k) / n })
    out.push(b)
  }
  return out
}

/**
 * Pulls the route taut (an "elastic band"): each point is moved towards the middle of its neighbours whenever that
 * makes the path cheaper and keeps it inside the slope limit and out of no-go zones. Removes the wobble that is left
 * over from the grid, so the route gets shorter and smoother. Science waypoints (pins) stay where they are.
 */
export function relaxPath(grid, nodes, opts, pins = [], iterations = 12) {
  if (nodes.length < 3) return nodes
  const stepCost = makeStepCost(grid, opts)
  const pinned = nodes.map((n, i) => i === 0 || i === nodes.length - 1 || pins.some((q) => Math.hypot(q.x - n.fx, q.y - n.fy) < 2))
  const cur = nodes.map((n) => ({ ...n }))
  const seg = (a, b) => stepCost(a.fx, a.fy, b.fx, b.fy)
  for (let it = 0; it < iterations; it++) {
    let moved = 0
    for (let i = 1; i < cur.length - 1; i++) {
      if (pinned[i]) continue
      const p = cur[i - 1], c = cur[i], n = cur[i + 1]
      const now = seg(p, c) + seg(c, n)
      const mx = (p.fx + n.fx) / 2, my = (p.fy + n.fy) / 2
      for (const w of [1, 0.5, 0.25]) {
        const cand = { fx: c.fx + (mx - c.fx) * w, fy: c.fy + (my - c.fy) * w }
        const cost = seg(p, cand) + seg(cand, n)
        if (Number.isFinite(cost) && cost < now - 1e-6) { cur[i] = cand; moved++; break }
      }
    }
    if (!moved) break
  }
  return cur
}

/**
 * Rounds the corners of the route (corner cutting, two passes). A corner is only rounded when both new
 * segments are still allowed (slope limit, no-go zones) and the rounded path is not more than 3% costlier,
 * so the line looks like a real track without ever leaving safe ground.
 */
export function smoothPath(grid, nodes, opts, passes = 2, pins = []) {
  const stepCost = makeStepCost(grid, opts)
  const seg = (a, b) => stepCost(a.fx, a.fy, b.fx, b.fy)
  let cur = nodes
  for (let pass = 0; pass < passes; pass++) {
    if (cur.length < 3) break
    const out = [cur[0]]
    for (let i = 1; i < cur.length - 1; i++) {
      const p = cur[i - 1], c = cur[i], n = cur[i + 1]
      // never move the route off a science waypoint it was asked to pass through
      if (pins.some((q) => Math.hypot(q.x - c.fx, q.y - c.fy) < 2)) { out.push(c); continue }
      const q = { fx: c.fx + (p.fx - c.fx) * 0.25, fy: c.fy + (p.fy - c.fy) * 0.25 }
      const r = { fx: c.fx + (n.fx - c.fx) * 0.25, fy: c.fy + (n.fy - c.fy) * 0.25 }
      const before = seg(q, c) + seg(c, r)
      const after = seg(q, r)
      const ends = seg(out[out.length - 1], q) + seg(r, n)
      if (Number.isFinite(after) && Number.isFinite(ends) && after <= before * 1.03) out.push(q, r)
      else out.push(c)
    }
    out.push(cur[cur.length - 1])
    cur = out
  }
  return cur
}

/** Nearest distance (km) from a site to the route polyline, and how far along the route that is. */
function nearestOnRoute(p, ll, cum) {
  const cosL = Math.cos(p.lat * RAD)
  let best = Infinity, along = 0
  for (let i = 0; i < ll.length - 1; i++) {
    const ax = wrapLon(ll[i].lon - p.lon) * cosL * KM_PER_DEG, ay = (ll[i].lat - p.lat) * KM_PER_DEG
    const bx = wrapLon(ll[i + 1].lon - p.lon) * cosL * KM_PER_DEG, by = (ll[i + 1].lat - p.lat) * KM_PER_DEG
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy
    const t = l2 ? clamp(-(ax * dx + ay * dy) / l2, 0, 1) : 0
    const d = Math.hypot(ax + t * dx, ay + t * dy)
    if (d < best) { best = d; along = cum[i] + t * (cum[i + 1] - cum[i]) }
  }
  return { dist: best, along }
}

/**
 * How far each cell sits below the average height of the terrain around it (km, never negative).
 * Craters floors, pits and troughs show up here even when their slopes are gentle.
 * Uses a summed-area table so any window size costs the same.
 */
export function lowGround(g, radiusKm, mode = 'low') {
  const w = g.gw, h = g.gh
  const S = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += g.heights[y * w + x]
      S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + row
    }
  }
  const out = new Float32Array(w * h)
  const ry = clamp(Math.round(radiusKm / g.dy), 2, 120)
  for (let y = 0; y < h; y++) {
    const rx = clamp(Math.round(radiusKm / g.dxRow[y]), 2, 120)
    const y0 = Math.max(0, y - ry), y1 = Math.min(h - 1, y + ry)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - rx), x1 = Math.min(w - 1, x + rx)
      const sum = S[(y1 + 1) * (w + 1) + x1 + 1] - S[y0 * (w + 1) + x1 + 1] - S[(y1 + 1) * (w + 1) + x0] + S[y0 * (w + 1) + x0]
      const mean = sum / ((x1 - x0 + 1) * (y1 - y0 + 1))
      const dh = mode === 'high' ? g.heights[y * w + x] - mean : mean - g.heights[y * w + x]
      out[y * w + x] = Math.max(0, dh)
    }
  }
  return out
}

/** Steepest slope (deg) between each cell and its 8 neighbours: a cheap "rugged ground" map. */
function ruggedness(g) {
  const out = new Float32Array(g.gw * g.gh)
  for (let y = 0; y < g.gh; y++) {
    for (let x = 0; x < g.gw; x++) {
      const h = g.heights[y * g.gw + x]
      let m = 0
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue
          const xx = x + ox, yy = y + oy
          if (xx < 0 || yy < 0 || xx >= g.gw || yy >= g.gh) continue
          const d = Math.hypot(ox * g.dxRow[y], oy * g.dy)
          m = Math.max(m, Math.atan(Math.abs(g.heights[yy * g.gw + xx] - h) / d) / RAD)
        }
      }
      out[y * g.gw + x] = m
    }
  }
  return out
}

/**
 * Multi-scale bumpiness (degrees): how sharply the ground bends at 1.5, 4 and 10 km scales.
 * A steady ramp scores 0 however steep it is; pits, mounds and broken ground score high.
 * (second difference over a step of s km, turned into an angle: atan(|h(-s) + h(+s) - 2h| / 2s))
 */
export function bumpiness(g, scalesKm = [1.5, 4, 10]) {
  const w = g.gw, h = g.gh
  const out = new Float32Array(w * h)
  const seen = new Set()
  for (const s of scalesKm) {
    const ry = Math.max(1, Math.round(s / g.dy))
    // grids with big cells cannot tell the scales apart: measure each distinct step once
    const sig = `${ry}`
    if (seen.has(sig)) continue
    seen.add(sig)
    for (let y = ry; y < h - ry; y++) {
      const rx = Math.max(1, Math.round(s / g.dxRow[y]))
      const stepX = rx * g.dxRow[y], stepY = ry * g.dy // the real distance between the three samples, in km
      for (let x = rx; x < w - rx; x++) {
        const c = g.heights[y * w + x]
        const lx = g.heights[y * w + x - rx] + g.heights[y * w + x + rx] - 2 * c
        const ly = g.heights[(y - ry) * w + x] + g.heights[(y + ry) * w + x] - 2 * c
        const ang = Math.atan(Math.abs(lx) / (2 * stepX) + Math.abs(ly) / (2 * stepY)) / RAD
        if (ang > out[y * w + x]) out[y * w + x] = ang
      }
    }
  }
  return out
}

export const KEEP_CODES = { 1: 'buffer', 2: 'steep walls', 3: 'deep pits', 4: 'very bumpy ground' }

/**
 * No-go zones. `raw` codes every cell (0 clear, 1 safety buffer, 2 steep, 3 low, 4 bumpy) for the map;
 * `blocked` is what the planner may not enter: the zones minus small exemptions around the places
 * the route has to reach (start, destination, science waypoints).
 */
export function keepOutMask(g, { rough, depth, bump }, limits, exemptCells, exemptKm, bufferCells) {
  const n = g.gw * g.gh
  const raw = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (rough[i] > limits.steepDeg) raw[i] = 2
    else if (depth[i] > limits.lowKm) raw[i] = 3
    else if (bump[i] > limits.bumpDeg) raw[i] = 4
  }
  // safety buffer: clear cells right next to a zone (two separable max passes)
  const hit = new Uint8Array(n)
  for (let i = 0; i < n; i++) hit[i] = raw[i] ? 1 : 0
  const tmp = new Uint8Array(n)
  for (let y = 0; y < g.gh; y++) for (let x = 0; x < g.gw; x++) {
    let m = 0
    for (let k = -bufferCells; k <= bufferCells && !m; k++) { const xx = x + k; if (xx >= 0 && xx < g.gw && hit[y * g.gw + xx]) m = 1 }
    tmp[y * g.gw + x] = m
  }
  for (let y = 0; y < g.gh; y++) for (let x = 0; x < g.gw; x++) {
    if (raw[y * g.gw + x]) continue
    let m = 0
    for (let k = -bufferCells; k <= bufferCells && !m; k++) { const yy = y + k; if (yy >= 0 && yy < g.gh && tmp[yy * g.gw + x]) m = 1 }
    if (m) raw[y * g.gw + x] = 1
  }
  const blocked = new Uint8Array(n)
  for (let i = 0; i < n; i++) blocked[i] = raw[i] >= 2 ? 1 : 0
  for (const c of exemptCells) {
    for (let y = 0; y < g.gh; y++) {
      for (let x = 0; x < g.gw; x++) {
        if (Math.hypot((x - c.x) * g.dxRow[y], (y - c.y) * g.dy) <= exemptKm) blocked[y * g.gw + x] = 0
      }
    }
  }
  return { raw, blocked }
}

/** Science sites worth visiting on the way: close to the direct line, in order along it, within a detour budget. */
export function pickWaypoints(a, b, pois, maxDetour) {
  const gc = haversineKm(a, b)
  const cand = pois
    .map((p) => {
      const da = haversineKm(a, p), db = haversineKm(p, b)
      return { p, detour: da + db - gc, t: da / (da + db || 1) }
    })
    .filter((c) => c.detour <= Math.max(0.2 * gc, 10))
    .sort((x, y) => x.t - y.t)
  const chosen = []
  let prev = a, len = 0
  for (const c of cand) {
    const seg = haversineKm(prev, c.p)
    if (len + seg + haversineKm(c.p, b) <= (1 + maxDetour) * gc) { chosen.push(c.p); len += seg; prev = c.p }
  }
  return chosen
}

/** A* (then straightening) leg by leg through the given cells. Returns null if any leg is impassable. */
function routeThrough(grid, cells, cost, minMult) {
  const clean = cells.filter((c, i) => i === 0 || c.x !== cells[i - 1].x || c.y !== cells[i - 1].y)
  if (clean.length < 2) return null
  const nodes = []
  for (let i = 0; i < clean.length - 1; i++) {
    const p = findPath(grid, clean[i], clean[i + 1], { ...cost, minMult })
    if (!p || p.length < 2) return null
    const leg = shortcutPath(grid, p.map((c) => ({ fx: c.x, fy: c.y })), cost)
    nodes.push(...(i ? leg.slice(1) : leg))
  }
  return nodes
}

/**
 * Numbered navigation waypoints: the science stops on the route plus the main turning points
 * (where the straightened path changes direction), in travel order.
 */
export function buildWaypoints(ll, cum, total, distanceKm, stops, { maxTurns = 6, minTurnDeg = 12 } = {}) {
  const km = (c) => (c / total) * distanceKm
  const bearing = (a, b) => {
    const e = wrapLon(b.lon - a.lon) * Math.cos(((a.lat + b.lat) / 2) * RAD)
    return Math.atan2(e, b.lat - a.lat) / RAD
  }
  // A turn is how much the heading changes over a stretch of route (not just between two neighbouring points), so a
  // smooth bend counts as one turn instead of many tiny ones. Only the sharpest point of each bend is kept.
  const span = Math.max(6, distanceKm * 0.04) * (total / distanceKm)
  const windowed = ll.map((_, i) => {
    if (i === 0 || i === ll.length - 1) return 0
    let a = i - 1, b = i + 1
    while (a > 0 && cum[i] - cum[a] < span) a--
    while (b < ll.length - 1 && cum[b] - cum[i] < span) b++
    return Math.abs(wrapLon(bearing(ll[i], ll[b]) - bearing(ll[a], ll[i])))
  })
  const turns = []
  for (let i = 1; i < ll.length - 1; i++) {
    const t = windowed[i]
    if (t < minTurnDeg) continue
    let isPeak = true
    for (let k = i - 1; k >= 1 && cum[i] - cum[k] < span; k--) if (windowed[k] > t) isPeak = false
    for (let k = i + 1; k < ll.length - 1 && cum[k] - cum[i] < span; k++) if (windowed[k] >= t) isPeak = false
    if (isPeak) turns.push({ kind: 'turn', turnDeg: t, idx: i, km: km(cum[i]), lat: ll[i].lat, lon: ll[i].lon })
  }
  const gap = Math.max(5, distanceKm * 0.06) // keep waypoints from piling up
  const picked = stops.map((s) => ({ kind: 'stop', id: s.id, name: s.title, note: s.detail, source: s.source, km: s.km, lat: s.lat, lon: s.lon, elevKm: s.elevKm }))
  for (const t of turns.sort((a, b) => b.turnDeg - a.turnDeg)) {
    if (picked.filter((w) => w.kind === 'turn').length >= maxTurns) break
    if (t.km < gap || t.km > distanceKm - gap) continue
    if (picked.some((w) => Math.abs(w.km - t.km) < gap)) continue
    picked.push(t)
  }
  return picked
    .sort((a, b) => a.km - b.km)
    .map((w, i) => ({
      ...w,
      n: i + 1,
      lon: to360(w.lon),
      name: w.kind === 'stop' ? w.name : `Waypoint ${i + 1}`,
      km: Math.round(w.km),
    }))
}

/**
 * Slope, low ground, bumpiness, keep-out hits and climbing met along a run of cells.
 * layers: { depth, bump, keep } (keep = effective no-go mask). Used to compare "what a bend avoids".
 */
function measureLine(grid, layers, pts) {
  let maxSlope = 0, maxDepth = 0, maxBump = 0, climb = 0, minElev = Infinity, km = 0, keepHits = 0, keepCode = 0
  let prev = null
  for (let i = 0; i < pts.length - 1; i++) {
    const { fx: x0, fy: y0 } = pts[i], { fx: x1, fy: y1 } = pts[i + 1]
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
    const ym = Math.round((y0 + y1) / 2)
    const step = Math.hypot((x1 - x0) * grid.dxRow[ym], (y1 - y0) * grid.dy) / n
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n
      const h = bilinear(grid, x, y)
      minElev = Math.min(minElev, h)
      maxDepth = Math.max(maxDepth, bilinear(grid, x, y, layers.depth))
      maxBump = Math.max(maxBump, bilinear(grid, x, y, layers.bump))
      const cell = Math.round(y) * grid.gw + Math.round(x)
      if (layers.keep && layers.keep[cell]) { keepHits++; keepCode = keepCode || layers.keepRaw[cell] }
      if (prev !== null && step > 0) {
        maxSlope = Math.max(maxSlope, Math.atan(Math.abs(h - prev) / step) / RAD)
        climb += Math.max(0, h - prev)
        km += step
      }
      prev = h
    }
  }
  return {
    maxSlopeDeg: +maxSlope.toFixed(1), maxDepthKm: +maxDepth.toFixed(2), maxBumpDeg: +maxBump.toFixed(1),
    climbKm: +climb.toFixed(2), minElevKm: +minElev.toFixed(2), km: +km.toFixed(1), keepHits, keepCode,
  }
}

/** Map a catalogue source string ("MRO CRISM", "Curiosity REMS"...) to a short chip key. */
export function sourceKey(src = '') {
  if (/CRISM/i.test(src)) return 'CRISM'
  if (/HiRISE/i.test(src)) return 'HiRISE'
  if (/CTX/i.test(src)) return 'CTX'
  if (/SuperCam|Mastcam|REMS|CheMin|SAM|Perseverance|Curiosity/i.test(src)) return 'ROVER'
  return 'NASA'
}

/**
 * Plain-language reasons for each waypoint, from what the planner measured:
 * for a bend, compare the straight chord across it with the path actually taken.
 */
export function explainRoute(grid, layers, nodes, cum, total, waypoints, direct, actual, limits) {
  const reasons = []
  // the bend that sits furthest from the straight line is the one that gets the credit for dodging a no-go zone
  // the straight line crosses (a smooth arc may have no local chord that touches the zone)
  const A = nodes[0], Z = nodes[nodes.length - 1]
  const kmXY = (n) => [n.fx * grid.dxRow[Math.round(n.fy)], n.fy * grid.dy]
  const [ax, ay] = kmXY(A), [zx, zy] = kmXY(Z)
  const lineLen = Math.hypot(zx - ax, zy - ay) || 1
  let biggestN = null, biggestOff = -1
  for (const w of waypoints) {
    if (w.kind === 'stop') continue
    const [px, py] = kmXY(nodes[w.idx])
    const off = Math.abs((zx - ax) * (ay - py) - (ax - px) * (zy - ay)) / lineLen
    if (off > biggestOff) { biggestOff = off; biggestN = w.n }
  }
  for (const w of waypoints) {
    if (w.kind === 'stop') {
      reasons.push({ n: w.n, type: 'science', source: sourceKey(w.source), text: `Passes ${w.name}${w.note ? ` – ${w.note}` : ''}` })
      continue
    }
    const here = cum[w.idx]
    let j0 = w.idx, j1 = w.idx
    while (j0 > 0 && cum[j0] > here - 0.15 * total) j0--
    while (j1 < nodes.length - 1 && cum[j1] < here + 0.15 * total) j1++
    const chord = measureLine(grid, layers, [nodes[j0], nodes[j1]])
    const real = measureLine(grid, layers, nodes.slice(j0, j1 + 1))
    // name the most specific cause first: a no-go zone, a low spot, steep ground, bumpy ground, then plain climbing
    const dDepth = chord.maxDepthKm - real.maxDepthKm
    const dSlope = chord.maxSlopeDeg - real.maxSlopeDeg
    const dBump = chord.maxBumpDeg - real.maxBumpDeg
    const dClimb = chord.climbKm - real.climbKm
    const extraKm = +(real.km - chord.km).toFixed(1)
    const why = (type, value, text) => reasons.push({ n: w.n, type, source: 'MOLA', value, extraKm, text })
    const globalKeep = w.n === biggestN && direct.keepHits > 0 && actual.keepHits === 0
    if ((chord.keepHits > 0 || globalKeep) && real.keepHits === 0) {
      const code = chord.keepCode || direct.keepCode
      const lim = code === 2 ? `over ${limits.steepDeg}°` : code === 3 ? `over ${limits.lowKm} km below surroundings` : `over ${limits.bumpDeg}° local relief`
      why('keep-out', code, `Keeps out of a no-go zone: ${KEEP_CODES[code]} (${lim})`)
    } else if (dDepth >= 0.3) {
      why('low-ground', chord.maxDepthKm, `Avoids a low spot ${chord.maxDepthKm.toFixed(1)} km below its surroundings (crater floor or pit)`)
    } else if (dSlope >= 4) {
      why('steep', chord.maxSlopeDeg, `Avoids slopes up to ${chord.maxSlopeDeg.toFixed(0)}°`)
    } else if (dBump >= 2.5) {
      why('bumpy', chord.maxBumpDeg, `Avoids bumpy ground (up to ${chord.maxBumpDeg.toFixed(0)}° of local relief)`)
    } else if (dClimb >= 0.3) {
      why('climb', chord.climbKm, `Avoids a ${chord.climbKm.toFixed(1)} km climb`)
    } else {
      reasons.push({ n: w.n, type: 'effort', source: 'MOLA', extraKm, text: 'Follows easier ground around local terrain' })
    }
  }
  return { reasons, direct, actual }
}

/** Compact byte grids for the map heat-maps: slope in quarter-degrees, low ground in 10 m, bumpiness in 1/16 degree, keep-out codes. */
function packHazard(grid, rough, depth, bump, keep) {
  const slope = new Uint8Array(rough.length), low = new Uint8Array(rough.length), bumpy = new Uint8Array(rough.length)
  for (let i = 0; i < rough.length; i++) {
    slope[i] = Math.min(255, Math.round(rough[i] * 4))
    low[i] = Math.min(255, Math.round(depth[i] * 100))
    bumpy[i] = Math.min(255, Math.round(bump[i] * 16))
  }
  return { bounds: grid.bounds, lonMid: grid.lonMid, gw: grid.gw, gh: grid.gh, slope, low, bump: bumpy, keep }
}

// Last few trips, per terrain source: grid, ruggedness, low ground and bumpiness are the same for every mode.
const TRIPS = new WeakMap()
async function getTrip(start, end, prepareTerrain) {
  let byKey = TRIPS.get(prepareTerrain)
  if (!byKey) TRIPS.set(prepareTerrain, (byKey = new Map()))
  const key = `${start.lat},${start.lon}>${end.lat},${end.lon}`
  if (!byKey.has(key)) {
    const build = (async () => {
      const spec = gridSpec(start, end)
      const t0 = Date.now()
      const terrain = await prepareTerrain({ bounds: spec.bounds, cellKm: spec.cellKm, gw: spec.gw, gh: spec.gh })
      const t1 = Date.now()
      const grid = buildGrid(spec, terrain.heightAt)
      const rough = ruggedness(grid)
      // the comparison window scales with the trip so both small pits and big basins register
      const lowR = clamp(0.12 * haversineKm(start, end), 6, 40)
      const depth = lowGround(grid, lowR)
      const rise = lowGround(grid, lowR, 'high') // how far a cell stands above its surroundings: crater rims, ridges, mounds
      const bump = bumpiness(grid)
      if (typeof console !== 'undefined') console.info(`[RedMap] terrain ready: NASA tiles ${t1 - t0} ms, grid and hazard layers ${Date.now() - t1} ms (${spec.gw}x${spec.gh} cells)`)
      return { spec, terrain, grid, rough, depth, rise, bump }
    })()
    byKey.set(key, build)
    build.catch(() => byKey.delete(key)) // do not remember failures
    if (byKey.size > 4) byKey.delete(byKey.keys().next().value)
  }
  return byKey.get(key)
}

export async function planRealRoute(start, end, settings, { prepareTerrain, pois = [] }) {
  if (!start || !end || start.id === end.id) return null

  // the terrain and the layers computed from it do not depend on the mode, so they are built once per trip
  const { spec, terrain, grid, rough, depth, rise, bump } = await getTrip(start, end, prepareTerrain)

  const a = toCell(grid, start.lat, start.lon)
  const b = toCell(grid, end.lat, end.lon)
  const sCell = { x: Math.round(a.x), y: Math.round(a.y) }
  const gCell = { x: Math.round(b.x), y: Math.round(b.y) }
  if (sCell.x === gCell.x && sCell.y === gCell.y) {
    throw new RouteError('too_close', 'Start and destination are closer than the terrain resolution.')
  }

  const cfg = typeof settings.blend === 'number' ? blendMode(settings.blend, settings.blendFrom ?? (settings.mode === 'scientific' ? 'scientific' : 'fastest')) : (ROUTE_MODES[settings.mode] ?? ROUTE_MODES.fastest)
  const poiCells = pois.map((p) => ({ ...p, ...toCell(grid, p.lat, p.lon) })).filter((p) => inGrid(grid, p))

  // Per-cell cost multiplier: rugged ground costs more (>1), cells near science sites cost less (<1)
  const cellMult = new Float32Array(grid.gw * grid.gh).fill(1)
  if (cfg.roughWeight) {
    for (let i = 0; i < cellMult.length; i++) cellMult[i] *= 1 + cfg.roughWeight * (rough[i] / 10) ** 2
  }
  // Low ground (crater floors, pits): costly to enter and leave, collects dust and cold air, poor radio line of sight.
  // The comparison window scales with the trip so both small pits and big basins register.
  const lowW = settings.avoidLows === false ? 0 : (cfg.lowWeight ?? 0)
  if (lowW) {
    for (let i = 0; i < cellMult.length; i++) cellMult[i] *= 1 + (lowW * Math.min(depth[i], 1.5)) / 0.3
  }
  // Crater rims and ridge crests: steep ground that also stands well above its surroundings. Crossing one is slow and
  // risky, so cost it, and prefer a gap or a way round.
  if (cfg.rimWeight) {
    for (let i = 0; i < cellMult.length; i++) {
      if (rise[i] >= RIM_RISE_KM && rough[i] >= RIM_SLOPE_DEG) cellMult[i] *= 1 + cfg.rimWeight * (Math.min(rise[i], 1.5) / 0.6) ** 2
    }
  }
  // Bumpy ground at several scales (pits, mounds, broken terrain) that slope between neighbours misses
  if (cfg.bumpWeight) {
    for (let i = 0; i < cellMult.length; i++) cellMult[i] *= 1 + cfg.bumpWeight * (bump[i] / 5) ** 2
  }
  let minMult = 1
  if (cfg.sciBonus && poiCells.length) {
    minMult = 1 - cfg.sciBonus
    const r = cfg.sciRadiusKm
    for (const p of poiCells) {
      for (let y = 0; y < grid.gh; y++) {
        const dxr = grid.dxRow[y]
        for (let x = 0; x < grid.gw; x++) {
          const km = Math.hypot((x - p.x) * dxr, (y - p.y) * grid.dy)
          if (km > r * 3) continue
          cellMult[y * grid.gw + x] *= 1 - cfg.sciBonus * Math.exp(-(km * km) / (r * r))
        }
      }
    }
  }

  const slopeWeight = cfg.slopeWeight * (settings.avoidRough ? 1.5 : 1)
  const costFor = (maxSlope) => ({ maxSlope, slopeWeight, bonus: cellMult, climb: cfg.climbKmPerKm ?? 0, crossWeight: cfg.crossWeight ?? 0 })
  const cellOf = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) })
  const waypoints = cfg.maxDetour && settings.showScience !== false ? pickWaypoints(start, end, poiCells, cfg.maxDetour) : []

  // No-go zones: steep walls, deep pits, very bumpy ground. Small areas around the start, the destination and
  // science waypoints stay open, because the route has to get there.
  const keepOn = settings.keepOut !== false
  const limits = cfg.keepOut ?? { steepDeg: 20, lowKm: 1.6, bumpDeg: 12 }
  const exemptKm = clamp(3 * spec.cellKm, 4, 15)
  const exempt = [sCell, gCell, ...waypoints.map(cellOf)]
  const keep = keepOutMask(grid, { rough, depth, bump }, limits, exempt, exemptKm, clamp(Math.round(0.6 / spec.cellKm), 1, 3))
  // keepEff = zones the route is actually not allowed to enter (exemptions removed), for explanations and warnings
  const keepEff = keep.blocked

  // Cells next to a no-go zone also cost a little more, so the route keeps a margin
  const cellMultKeep = cellMult.slice()
  for (let i = 0; i < cellMultKeep.length; i++) if (keep.raw[i] === 1) cellMultKeep[i] *= 1.6

  // Try the mode's own slope limit first (your slider can only make it stricter), then your plain limit.
  // For each limit: first respecting the no-go zones, then, only if no such route exists, crossing them.
  let nodes = null
  let respectedKeepOut = false
  let usedCost = null
  for (const limit of [Math.min(settings.maxSlopeDeg, cfg.maxSlope ?? 90), settings.maxSlopeDeg]) {
    for (const strict of keepOn ? [true, false] : [false]) {
      const cost = { ...costFor(limit), bonus: strict ? cellMultKeep : cellMult, blocked: strict ? keepEff : null }
      if (waypoints.length) nodes = routeThrough(grid, [sCell, ...waypoints.map(cellOf), gCell], cost, minMult)
      if (!nodes) nodes = routeThrough(grid, [sCell, gCell], cost, minMult)
      if (nodes) { respectedKeepOut = strict; usedCost = cost; break }
    }
    if (nodes) break
  }
  if (!nodes) {
    throw new RouteError('blocked', `No route found within your ${settings.maxSlopeDeg}° slope limit. Raise the limit or pick another mode.`)
  }

  // round the corners where that is still allowed, so the line looks like a real track
  const pins = waypoints.map(cellOf)
  nodes = relaxPath(grid, subdividePath(nodes), usedCost, pins)
  nodes = shortcutPath(grid, nodes, usedCost, pins)
  nodes = smoothPath(grid, nodes, usedCost, 2, pins)

  // ---- measure the straightened path ----
  nodes[0] = { fx: a.x, fy: a.y }
  nodes[nodes.length - 1] = { fx: b.x, fy: b.y }
  const ll = nodes.map((n) => cellToLatLon(grid, n.fx, n.fy))
  const cum = [0]
  for (let i = 1; i < nodes.length; i++) cum.push(cum[i - 1] + haversineKm(ll[i - 1], ll[i]))
  const total = cum[cum.length - 1]
  const distanceKm = Math.max(1, Math.round(total))

  // ---- resample at even spacing for the chart, map and hazard checks ----
  const N = clamp(Math.round(total / Math.max(1, grid.dy)), 30, 120)
  const points = []
  let seg = 0
  for (let i = 0; i <= N; i++) {
    const target = (i / N) * total
    while (seg < cum.length - 2 && cum[seg + 1] < target) seg++
    const span = cum[seg + 1] - cum[seg] || 1
    const t = clamp((target - cum[seg]) / span, 0, 1)
    const fx = nodes[seg].fx + (nodes[seg + 1].fx - nodes[seg].fx) * t
    const fy = nodes[seg].fy + (nodes[seg + 1].fy - nodes[seg].fy) * t
    const { lat, lon } = cellToLatLon(grid, fx, fy)
    const elevKm = bilinear(grid, fx, fy)
    const slope = slopeAt(grid, fx, fy)
    const depthKm = bilinear(grid, fx, fy, depth)
    const riseKm = bilinear(grid, fx, fy, rise)
    points.push({
      km: +((i / N) * distanceKm).toFixed(1), lat, lon,
      elevKm: +elevKm.toFixed(3), slopeDeg: +slope.toFixed(1), depthKm: +depthKm.toFixed(2),
      terrain: classify(slope, depthKm, riseKm), tempC: estimateTempC(lat, elevKm),
    })
  }

  // ---- science stops: catalogued sites that lie close to the path ----
  const reach = Math.max(POI_NEAR_KM, grid.dy * 0.75)
  const stops = []
  if (settings.showScience) {
    for (const p of poiCells) {
      const near = nearestOnRoute(p, ll, cum)
      if (near.dist <= reach) {
        stops.push({
          id: `poi-${p.id}`, title: p.name, source: p.source || 'NASA orbital data', detail: p.note,
          km: Math.round((near.along / total) * distanceKm), lat: p.lat, lon: to360(p.lon),
          elevKm: +bilinear(grid, p.x, p.y).toFixed(2), offRouteKm: +near.dist.toFixed(1),
        })
      }
    }
    stops.sort((x, y) => x.km - y.km)
  }

  const keptStops = stops.slice(0, 8)
  const navPoints = buildWaypoints(ll, cum, total, distanceKm, keptStops)
  for (const w of navPoints) {
    if (w.kind === 'stop') continue
    const c = toCell(grid, w.lat, w.lon)
    w.elevKm = +bilinear(grid, c.x, c.y).toFixed(2)
  }

  // legs between consecutive waypoints: length, steepest ground, and whether the crew could climb back out
  const retraceLimit = Math.min(RETRACE_MAX_SLOPE, settings.maxSlopeDeg)
  const label = (w) => (w.kind === 'stop' ? w.name : `Waypoint ${w.n}`)
  const marks = [{ km: 0, label: start.name }, ...navPoints.map((w) => ({ km: w.km, label: label(w) })), { km: distanceKm, label: end.name }]
  const legs = []
  for (let i = 0; i < marks.length - 1; i++) {
    const a0 = marks[i].km, b0 = marks[i + 1].km
    const inside = points.filter((p) => p.km >= a0 - 1e-6 && p.km <= b0 + 1e-6)
    const maxSlopeDeg = inside.length ? Math.max(...inside.map((p) => p.slopeDeg)) : 0
    legs.push({ from: marks[i].label, to: marks[i + 1].label, fromKm: a0, toKm: b0, km: b0 - a0, maxSlopeDeg, retraceable: maxSlopeDeg <= retraceLimit })
  }

  const layers = { depth, bump, keep: keepOn ? keepEff : null, keepRaw: keep.raw }
  const direct = measureLine(grid, layers, [nodes[0], nodes[nodes.length - 1]])
  const actual = measureLine(grid, layers, nodes)
  const why = {
    ...explainRoute(grid, layers, nodes, cum, total, navPoints, direct, actual, limits),
    extraKm: +(total - haversineKm(start, end)).toFixed(1),
    cost: { ...cfg, maxSlope: Math.min(settings.maxSlopeDeg, cfg.maxSlope ?? 90), lowGroundOn: lowW > 0 },
    keepOut: {
      on: keepOn,
      limits,
      areaPct: +((100 * keepEff.reduce((n, v) => n + v, 0)) / keepEff.length).toFixed(1),
      respected: respectedKeepOut,
      crossed: actual.keepHits > 0,
      crossedKind: actual.keepCode ? KEEP_CODES[actual.keepCode] : null,
    },
  }

  return finalizeRoute({
    start, end, settings, points, distanceKm, stops: keptStops, waypoints: navPoints, why, legs,
    hazard: packHazard(grid, rough, depth, bump, keep.raw),
    dataSource: { ...terrain.source, resolutionKm: +spec.cellKm.toFixed(2) },
  })
}
