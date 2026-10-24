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
  return -2 - 6 * Math.exp(-(along * along) / (2 * 12 * 12)) * Math.exp(-(across * across) / (2 * len * len))
}
const pit = trench
const lowest = (r) => Math.min(...r.points.map((p) => p.elevKm))

test('keep-out zones are respected and reported', async () => {
  const hard = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', avoidLows: false, keepOut: true }), terrainOf(pit))
  assert.ok(lowest(hard) > -4.5, `with keep-out it stays out (${lowest(hard)})`)
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

// ---- checkpoints and legs ----
test('no leg is longer than the leg limit', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ maxLegKm: 20 }), terrainOf(() => -2))
  assert.ok(r.legs.every((l) => l.km <= 20.5), JSON.stringify(r.legs.map((l) => l.km)))
  assert.equal(r.legs.length, r.waypoints.length + 1)
  assert.ok(Math.abs(r.legs.reduce((s, l) => s + l.km, 0) - r.distanceKm) < 1)
  assert.ok(r.waypoints.some((w) => w.kind === 'checkpoint'))
  assert.equal(r.legs[0].from, 'Nili Fossae')
  assert.equal(r.legs.at(-1).to, 'Jezero Crater')
})

test('a shorter leg limit means more checkpoints', async () => {
  const a = await planRealRoute(NILI, JEZERO, settings({ maxLegKm: 40 }), terrainOf(() => -2))
  const b = await planRealRoute(NILI, JEZERO, settings({ maxLegKm: 10 }), terrainOf(() => -2))
  const cps = (r) => r.waypoints.filter((w) => w.kind === 'checkpoint').length
  assert.ok(cps(b) > cps(a))
})

test('very long routes cap the number of checkpoints and say why', async () => {
  const r = await planRealRoute(VALLES, JEZERO, settings({ maxLegKm: 20 }), terrainOf(() => -2))
  assert.ok(r.waypoints.length <= 25, `${r.waypoints.length} waypoints`)
  assert.ok(r.warnings.some((w) => w.title === 'Long legs on a long route'))
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
  const r = await planRealRoute(NILI, JEZERO, settings(), terrainOf(() => -2))
  const text = evaPlanText(r, planEva(r, { startDate: new Date('2027-03-01T00:00:00Z') }))
  assert.match(text, /Leg in km/)
  assert.match(text, /Checkpoint 1/)
})
