import test from 'node:test'
import assert from 'node:assert/strict'
import { planRealRoute, gridSpec, buildGrid, bumpiness } from './realRoute.js'
import { haversineKm } from './routeAnalysis.js'

const NILI = { id: 'nili', name: 'Nili Fossae', lat: 21.0, lon: 74.5 }
const JEZERO = { id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527 }
const VALLES = { id: 'valles', name: 'Valles Marineris', lat: -13.9, lon: 301.0 }
const mid = { lat: (NILI.lat + JEZERO.lat) / 2, lon: (NILI.lon + JEZERO.lon) / 2 }
const KM = (Math.PI / 180) * 3389.5
const COS = Math.cos((mid.lat * Math.PI) / 180)
const settings = (o = {}) => ({ mode: 'fastest', maxSlopeDeg: 25, avoidRough: true, showScience: false, evaHoursPerSol: 6, ...o })
const terrainOf = (heightAt) => ({ prepareTerrain: async () => ({ heightAt, source: { real: true, name: 'test' } }) })

// local frame around the midpoint: `along` runs start -> destination, `across` is sideways (km)
const e = (JEZERO.lon - NILI.lon) * COS * KM, n = (JEZERO.lat - NILI.lat) * KM, L = Math.hypot(e, n)
const u = { e: e / L, n: n / L }
const frame = (lat, lon) => {
  const x = (lon - mid.lon) * COS * KM, y = (lat - mid.lat) * KM
  return { along: x * u.e + y * u.n, across: -x * u.n + y * u.e }
}
const distMid = (p) => haversineKm(p, mid)
const BUMPS = (lat, lon, A = 0.5, k = 0.45) => (A / 1.3) * (Math.sin(lat * KM * k) + Math.sin(lon * KM * COS * k))

// ---- bumpiness ----
test('bumpiness ignores a steady ramp but flags broken ground', () => {
  const spec = gridSpec(NILI, JEZERO)
  const ramp = buildGrid(spec, (lat) => -2 + (lat - 19) * 0.8) // steep but perfectly planar
  const rough = buildGrid(spec, (lat, lon) => -2 + BUMPS(lat, lon)) // ~14 km wavelength bumps
  const bRamp = bumpiness(ramp), bRough = bumpiness(rough)
  const rampMax = Math.max(...bRamp), roughMax = Math.max(...bRough)
  assert.ok(rampMax < 1, `ramp ${rampMax}`)
  assert.ok(roughMax > 7, `rough ${roughMax}`)
})

const bumpyPatch = (lat, lon) => {
  const d = distMid({ lat, lon })
  return -2 + (d < 25 ? BUMPS(lat, lon) : 0)
}

test('the safest route stays out of a field of bumpy ground', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(bumpyPatch))
  const closest = Math.min(...r.points.map(distMid))
  assert.ok(closest > 18, `route came within ${closest} km of the middle of the bumpy patch`)
  const through = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', keepOut: false }), terrainOf(() => -2))
  assert.ok(r.distanceKm >= through.distanceKm)
})

// ---- keep-out zones ----
// a deep trench across the way
const trench = (lat, lon, len = 60) => {
  const { along, across } = frame(lat, lon)
  return -2 - 7 * Math.exp(-(along * along) / (2 * 15 * 15)) * Math.exp(-(across * across) / (2 * len * len))
}
const pit = trench
const lowest = (r) => Math.min(...r.points.map((p) => p.elevKm))

test('keep-out zones are respected and reported', async () => {
  const hard = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', avoidLows: false, keepOut: true }), terrainOf(pit))
  assert.ok(lowest(hard) > -6, `with keep-out it stays out (${lowest(hard)})`)
  assert.equal(hard.why.keepOut.crossed, false)
  assert.equal(hard.why.keepOut.respected, true)
  assert.ok(hard.why.keepOut.areaPct > 0)
})

test('the bend around a no-go zone is explained as such, and only when the rule is on', async () => {
  const on = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', avoidLows: false }), terrainOf(pit))
  const why = on.why.reasons.find((x) => x.type === 'keep-out')
  assert.ok(why, JSON.stringify(on.why.reasons))
  assert.match(why.text, /no-go zone: deep pits/)
  const off = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', avoidLows: false, keepOut: false }), terrainOf(pit))
  assert.ok(!off.why.reasons.some((x) => x.type === 'keep-out'))
})

test('if no route avoids the no-go zone, it still plans one and says so loudly', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', avoidLows: false }), terrainOf((lat, lon) => trench(lat, lon, 1e6)))
  assert.equal(r.why.keepOut.respected, false)
  assert.equal(r.why.keepOut.crossed, true)
  const w = r.warnings.find((x) => x.title === 'Crosses a no-go zone')
  assert.ok(w && w.severity === 'critical')
})

test('the start and destination are exempt, so a route can begin or end in rough ground', async () => {
  const rough = (lat, lon) => {
    const d = Math.min(haversineKm({ lat, lon }, NILI), haversineKm({ lat, lon }, JEZERO))
    return -2 + (d < 3 ? BUMPS(lat, lon) : 0)
  }
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(rough))
  assert.ok(r.distanceKm > 100)
  assert.equal(r.why.keepOut.crossed, false)
})

test('keep-out can be switched off', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', avoidLows: false, keepOut: false }), terrainOf(pit))
  assert.equal(r.why.keepOut.on, false)
  assert.ok(!r.warnings.some((w) => w.title === 'Crosses a no-go zone'))
})

// ---- legs ----
test('legs run between consecutive waypoints and add up to the route length', async () => {
  const ridge = (lat, lon) => -2 + 0.9 * Math.exp(-(frame(lat, lon).along ** 2) / (2 * 6 * 6)) * Math.exp(-(frame(lat, lon).across ** 2) / (2 * 30 * 30))
  const r = await planRealRoute(NILI, JEZERO, settings(), terrainOf(ridge))
  assert.equal(r.legs.length, r.waypoints.length + 1)
  assert.ok(Math.abs(r.legs.reduce((s, l) => s + l.km, 0) - r.distanceKm) < 1)
  assert.equal(r.legs[0].from, 'Nili Fossae')
  assert.equal(r.legs.at(-1).to, 'Jezero Crater')
})

// ---- retraceable legs ----
test('a leg over a steep ridge is flagged as hard to retrace; flat ground has none', async () => {
  const ridge = (lat, lon) => {
    const { along } = frame(lat, lon)
    return -2 + 2.5 * Math.exp(-(along * along) / (2 * 5 * 5))
  }
  const fast = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', keepOut: false }), terrainOf(ridge))
  assert.ok(fast.legs.some((l) => !l.retraceable), JSON.stringify(fast.legs.map((l) => l.maxSlopeDeg)))
  assert.ok(fast.warnings.some((w) => w.title === 'Hard-to-retrace leg'))
  const flat = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(() => -2))
  assert.ok(flat.legs.every((l) => l.retraceable))
  assert.ok(!flat.warnings.some((w) => w.title === 'Hard-to-retrace leg'))
})

test('hazard grids for the map include bumpiness and keep-out codes', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest' }), terrainOf(pit))
  assert.equal(r.hazard.bump.length, r.hazard.gw * r.hazard.gh)
  assert.equal(r.hazard.keep.length, r.hazard.gw * r.hazard.gh)
  assert.ok(Math.max(...r.hazard.keep) <= 4)
  assert.ok(r.hazard.keep.some((v) => v >= 2), 'the pit should be marked as a no-go zone')
  assert.ok(r.hazard.keep.some((v) => v === 1), 'with a safety buffer around it')
})

// ---- heat-map colours and export ----
import { hazardColor, keepColor, HAZARD_LEGENDS } from './hazardImage.js'
import { evaPlanText } from './exportRoute.js'
import { planEva } from './evaPlan.js'

test('bumpiness and no-go colours', () => {
  assert.equal(hazardColor('bump', 1)[3], 0)
  assert.ok(hazardColor('bump', 10)[3] > 0.5)
  assert.equal(keepColor(0)[3], 0)
  assert.ok(keepColor(2)[3] > keepColor(1)[3])
  assert.ok(HAZARD_LEGENDS.bump.gradient && HAZARD_LEGENDS.keep.swatches.length === 4)
})

test('the exported plan lists each waypoint with its leg and retrace flag', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings(), terrainOf((lat, lon) => -2 - 1.5 * Math.exp(-(distMid({ lat, lon }) ** 2) / (2 * 14 * 14))))
  assert.ok(r.waypoints.length > 0)
  const text = evaPlanText(r, planEva(r, { startDate: new Date('2027-03-01T00:00:00Z') }))
  assert.match(text, /Leg in km/)
  assert.match(text, /WAYPOINTS/)
})

// ---- side slopes and smoothing ----
import { smoothPath, shortcutPath } from './realRoute.js'
import { crossSlopeDeg, findPath } from './pathfinding.js'

test('side slope is 0 going straight up a slope and large going across it', () => {
  const g = 0.2 // 11 degree slope rising along x
  assert.ok(crossSlopeDeg(g, 0, 1, 0) < 0.01)
  assert.ok(crossSlopeDeg(g, 0, 0, 1) > 10)
})

test('a route prefers going up a hillside to cutting across it', () => {
  // a long ridge-side slope: height rises along y; going along x is a pure side slope
  const spec = gridSpec({ lat: 10, lon: 10 }, { lat: 10.8, lon: 12.5 })
  const grid = buildGrid(spec, (lat) => -2 + (lat - 10) * 2.2)
  const base = { maxSlope: 40, slopeWeight: 0.1, climb: 0 }
  const a = { x: 2, y: Math.round(grid.gh * 0.5) }, b = { x: grid.gw - 3, y: Math.round(grid.gh * 0.5) }
  const flat = findPath(grid, a, b, { ...base, crossWeight: 0 })
  const side = findPath(grid, a, b, { ...base, crossWeight: 6 })
  const swing = (p) => Math.max(...p.map((c) => Math.abs(c.y - a.y)))
  assert.ok(flat && side)
  assert.ok(swing(side) >= swing(flat), 'crossWeight should not make the route hug the hillside more')
})

test('smoothing rounds corners but keeps the route out of no-go ground', () => {
  const spec = gridSpec(NILI, JEZERO)
  const grid = buildGrid(spec, () => -2)
  const blocked = new Uint8Array(grid.gw * grid.gh)
  const nodes = [{ fx: 10, fy: 10 }, { fx: 100, fy: 10 }, { fx: 100, fy: 100 }]
  const sm = smoothPath(grid, nodes, { maxSlope: 30, slopeWeight: 1, bonus: null, blocked })
  assert.ok(sm.length > nodes.length)
  assert.deepEqual(sm[0], nodes[0]); assert.deepEqual(sm.at(-1), nodes.at(-1))
  // block the rounded corner: the sharp corner must be kept
  for (let y = 0; y < grid.gh; y++) for (let x = 0; x < grid.gw; x++) if (x > 88 && x < 96 && y > 18 && y < 28) blocked[y * grid.gw + x] = 1
  const kept = smoothPath(grid, nodes, { maxSlope: 30, slopeWeight: 1, bonus: null, blocked }, 1)
  assert.ok(kept.some((p) => p.fx === 100 && p.fy === 10))
})

test('the planned route has no sharp kinks', async () => {
  const ridge = (lat, lon) => {
    const { along, across } = frame(lat, lon)
    return -2 + 1.2 * Math.exp(-(across * across) / (2 * 15 * 15)) * Math.exp(-(along * along) / (2 * 40 * 40))
  }
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(ridge))
  const P = r.points
  let worst = 0
  for (let i = 2; i < P.length; i++) {
    const b1 = Math.atan2(P[i - 1].lon - P[i - 2].lon, P[i - 1].lat - P[i - 2].lat)
    const b2 = Math.atan2(P[i].lon - P[i - 1].lon, P[i].lat - P[i - 1].lat)
    let d = Math.abs(b2 - b1) * 180 / Math.PI; if (d > 180) d = 360 - d
    worst = Math.max(worst, d)
  }
  assert.ok(worst < 60, `sharpest turn ${worst}`)
})

// ---- risk breakdown ----
test('the risk breakdown adds up to the score and legs get a risk level', async () => {
  const ridge = (lat, lon) => -2 + 2.5 * Math.exp(-(frame(lat, lon).along ** 2) / (2 * 5 * 5))
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', keepOut: false }), terrainOf(ridge))
  const sum = r.riskParts.reduce((s, p) => s + p.points, 0)
  assert.ok(Math.abs(Math.min(100, Math.round(sum)) - r.risk) <= 1)
  assert.ok(r.riskParts.every((p) => p.label && p.tip))
  assert.ok(r.legs.every((l) => ['low', 'moderate', 'high'].includes(l.level)))
  const flat = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(() => -2))
  assert.ok(flat.legs.every((l) => l.level === 'low'))
  assert.ok(Math.max(...r.legs.map((l) => l.risk)) > Math.max(...flat.legs.map((l) => l.risk)))
})

// ---- coarse grids on long trips ----
test('fine-scale ripples are averaged out on a long trip instead of walling the route in', async () => {
  const GALE = { id: 'gale', name: 'Gale Crater', lat: -5.4, lon: 137.8 }
  const OLY = { id: 'olympus', name: 'Olympus Mons Base', lat: 18.65, lon: 226.2 }
  // 3-5 km ripples with 0.4 km relief on top of a gentle regional slope: far finer than the grid cells of a 2000 km trip
  const ripples = (lat, lon) => -2 + 0.4 * Math.sin(lat * KM * 1.7) * Math.sin(lon * KM * 1.3) + 0.002 * (lon - 137) * 10
  const r = await planRealRoute(GALE, OLY, settings({ mode: 'safest' }), terrainOf(ripples))
  const direct = haversineKm(GALE, OLY)
  assert.ok(r.distanceKm < direct * 1.15, `${r.distanceKm} km for a ${Math.round(direct)} km trip`)
  assert.ok(r.why.keepOut.areaPct < 10, `no-go area ${r.why.keepOut.areaPct}%`)
})

test('bumpiness is measured over the real step between cells', () => {
  const spec = gridSpec({ lat: 0, lon: 100 }, { lat: 10, lon: 120 }) // coarse cells
  const g = buildGrid(spec, (lat, lon) => -2 + 0.3 * Math.sin(lat * 40) * Math.sin(lon * 40))
  const b = bumpiness(g)
  assert.ok(Math.max(...b) < 3, `max ${Math.max(...b)}`)
})

// ---- crater rims ----
test('a crater rim is labelled, and the safe modes go through a gap or round it', async () => {
  // a ring-shaped rim, 0.9 km high, with a flat floor inside and one low gap on the side facing the start
  const ringAt = (lat, lon) => {
    const d = distMid({ lat, lon })
    const { along } = frame(lat, lon)
    const rim = 0.9 * Math.exp(-((d - 22) ** 2) / (2 * 3.5 * 3.5))
    const gap = along < -10 && Math.abs(frame(lat, lon).across) < 5 ? 0.85 : 1
    return -2 + rim * gap - 0.7 * Math.exp(-(d * d) / (2 * 14 * 14))
  }
  const fast = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', keepOut: false }), terrainOf(ringAt))
  const safe = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(ringAt))
  const rimPts = (r) => r.points.filter((p) => p.terrain === 'Crater rim').length
  assert.ok(rimPts(safe) <= rimPts(fast), `safest ${rimPts(safe)} vs fastest ${rimPts(fast)} rim points`)
  assert.ok(safe.maxSlopeDeg <= fast.maxSlopeDeg + 0.5)
  // the label itself works wherever a route does cross a rim
  const hill = (lat, lon) => -2 + 1.2 * Math.exp(-(frame(lat, lon).along ** 2) / (2 * 3 * 3)) * Math.exp(-(frame(lat, lon).across ** 2) / (2 * 60 * 60))
  const over = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', keepOut: false }), terrainOf(hill))
  assert.ok(rimPts(over) > 0, 'crossing a steep crest is labelled as a rim')
  assert.ok(over.warnings.some((w) => w.title === 'Crater Rim'))
})
