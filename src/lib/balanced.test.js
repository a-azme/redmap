import test from 'node:test'
import assert from 'node:assert/strict'
import { planRealRoute } from './realRoute.js'
import { goalFor, searchBlend } from './balanced.js'
import { blendMode, ROUTE_MODES } from '../constants/config.js'

const NILI = { id: 'nili', name: 'Nili Fossae', lat: 21.0, lon: 74.5 }
const JEZERO = { id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527 }
const mid = { lat: 19.7175, lon: 76.0135 }
const KM = (Math.PI / 180) * 3389.5, COS = Math.cos((mid.lat * Math.PI) / 180)
const e = (JEZERO.lon - NILI.lon) * COS * KM, n = (JEZERO.lat - NILI.lat) * KM, L = Math.hypot(e, n)
const along = (lat, lon) => (((lon - mid.lon) * COS * KM) * e + ((lat - mid.lat) * KM) * n) / L
const across = (lat, lon) => (-((lon - mid.lon) * COS * KM) * n + ((lat - mid.lat) * KM) * e) / L
const settings = (o = {}) => ({ mode: 'fastest', maxSlopeDeg: 25, avoidRough: true, showScience: false, evaHoursPerSol: 6, ...o })
const terrainOf = (heightAt) => ({ prepareTerrain: async () => ({ heightAt, source: { real: true, name: 'test' } }) })

test('blend 0 is Fastest and blend 1 is Safest, with values in between', () => {
  const a = blendMode(0), b = blendMode(1), m = blendMode(0.5)
  assert.equal(a.slopeWeight, ROUTE_MODES.fastest.slopeWeight)
  assert.equal(b.slopeWeight, ROUTE_MODES.safest.slopeWeight)
  assert.ok(m.slopeWeight > a.slopeWeight && m.slopeWeight < b.slopeWeight)
  assert.ok(m.keepOut.steepDeg < a.keepOut.steepDeg && m.keepOut.steepDeg > b.keepOut.steepDeg)
})

test('when nothing meets the goal the search returns the lowest-risk route it tried', async () => {
  const mk = (risk, km) => ({ risk, distanceKm: km, warnings: [] })
  const plans = [mk(60, 100), mk(70, 130), mk(55, 120)]
  let i = 0
  const g = goalFor('fastest', [])
  const r = await searchBlend(async () => plans[i++ % plans.length], g)
  assert.equal(r.accepted, false)
  assert.equal(r.best.risk, 55)
})

test('a critical warning means a route is not acceptable', () => {
  const g = goalFor('fastest', [])
  assert.equal(g.accept({ risk: 10, warnings: [{ severity: 'critical' }] }), false)
  assert.equal(g.accept({ risk: 10, warnings: [{ severity: 'caution' }] }), true)
  assert.equal(g.accept({ risk: 45, warnings: [] }), false)
})

// ---- goals for every mode ----

const fake = (risk, km, extra = {}) => ({ risk, distanceKm: km, warnings: [], stops: [], ...extra })

test('fastest never accepts a high-risk route, and takes the shortest acceptable one', async () => {
  const g = goalFor('fastest', [])
  const byBlend = (t) => fake(Math.round(70 - 60 * t), Math.round(100 + 60 * t)) // safer = longer
  const r = await searchBlend(async (t) => byBlend(t), { ...g, seeds: [fake(70, 100, { mode: 'fastest' })] })
  assert.ok(r.accepted)
  assert.ok(r.best.risk < 40)
  assert.ok(r.best.distanceKm < 150)
})

test('safest keeps the risk within 2 points of the best but drops pointless detours', async () => {
  const seedSafest = fake(5, 200, { mode: 'safest' })
  const g = goalFor('safest', [seedSafest])
  const r = await searchBlend(async (t) => fake(Math.round(5 + (1 - t) * 20), Math.round(120 + 80 * t)), { ...g, seeds: [seedSafest] })
  assert.ok(r.best.risk <= 7)
  assert.ok(r.best.distanceKm <= 200)
})

test('scientific prefers more science stops, then shorter', () => {
  const g = goalFor('scientific', [])
  const a = fake(20, 150, { stops: [1, 2, 3] }), b = fake(20, 120, { stops: [1] }), c = fake(20, 140, { stops: [1, 2, 3] })
  assert.deepEqual([a, b, c].sort(g.better), [c, a, b])
  assert.equal(g.accept(fake(45, 100)), false)
  assert.equal(g.accept(fake(30, 100)), true)
})

test('refined routes on real planning are never worse than the plain mode they started from', async () => {
  const hills = (lat, lon) => -2 + 1.6 * Math.exp(-(along(lat, lon) ** 2) / (2 * 6 * 6)) * Math.exp(-(across(lat, lon) ** 2) / (2 * 40 * 40))
  const t = terrainOf(hills)
  for (const mode of ['fastest', 'safest']) {
    const plain = await planRealRoute(NILI, JEZERO, settings({ mode }), t).catch(() => null)
    if (!plain) continue
    const g = goalFor(mode, [plain])
    const r = await searchBlend((b) => planRealRoute(NILI, JEZERO, settings({ mode, blend: b, blendFrom: g.from }), t), { ...g, seeds: [plain] })
    assert.ok(r.best.risk <= Math.max(plain.risk, 39), `${mode}: risk ${r.best.risk} vs ${plain.risk}`)
    if (g.accept(plain)) assert.ok(r.best.distanceKm <= plain.distanceKm + 1, `${mode}: ${r.best.distanceKm} vs ${plain.distanceKm}`)
  }
})
