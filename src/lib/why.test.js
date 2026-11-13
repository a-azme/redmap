import test from 'node:test'
import assert from 'node:assert/strict'
import { planRealRoute, sourceKey } from './realRoute.js'
import { hazardColor, hazardRectangle } from './hazardImage.js'
import { haversineKm } from './routeAnalysis.js'

const NILI = { id: 'nili', name: 'Nili Fossae', lat: 21.0, lon: 74.5 }
const JEZERO = { id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527 }
const mid = { lat: (NILI.lat + JEZERO.lat) / 2, lon: (NILI.lon + JEZERO.lon) / 2 }
const settings = (o = {}) => ({ mode: 'fastest', maxSlopeDeg: 25, avoidRough: true, showScience: true, evaHoursPerSol: 6, ...o })
const terrainOf = (heightAt) => ({ prepareTerrain: async () => ({ heightAt, source: { real: true, name: 'test' } }) })

const crater = (lat, lon) => -2 - 1.5 * Math.exp(-(haversineKm({ lat, lon }, mid) ** 2) / (2 * 14 * 14))

test('a bend around a crater is explained as avoiding a low spot, with the real depth', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ showScience: false }), terrainOf(crater))
  const turn = r.why.reasons.find((x) => x.type === 'low-ground')
  assert.ok(turn, JSON.stringify(r.why.reasons))
  assert.equal(turn.source, 'MOLA')
  assert.ok(turn.value > 0.4 && turn.value < 1.6, `depth ${turn.value}`)
  assert.match(turn.text, /low spot/)
  assert.ok(turn.n >= 1 && r.waypoints.some((w) => w.n === turn.n))
})

test('the direct line is shown to be worse than the chosen route', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ showScience: false }), terrainOf(crater))
  assert.ok(r.why.direct.maxDepthKm > r.why.actual.maxDepthKm + 0.4)
  assert.ok(r.why.direct.minElevKm < r.why.actual.minElevKm)
  assert.ok(r.why.extraKm >= 0 && r.why.extraKm < 20)
  assert.equal(typeof r.why.cost.climbKmPerKm, 'number')
})

test('science stops are explained with their catalogue source', async () => {
  const pois = [{ id: 'clay', name: 'Clay Outcrop', lat: 19.7, lon: 76.05, note: 'Clay minerals', source: 'MRO CRISM' }]
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'scientific' }), { ...terrainOf(() => -2), pois })
  const sci = r.why.reasons.find((x) => x.type === 'science')
  assert.equal(sci.source, 'CRISM')
  assert.match(sci.text, /Clay Outcrop/)
})

test('flat ground has nothing to explain', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ showScience: false }), terrainOf(() => -2))
  assert.equal(r.why.reasons.length, 0)
  assert.equal(r.why.extraKm < 3, true)
})

test('hazard grids are packed for the map and cover the route area', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings(), terrainOf(crater))
  const h = r.hazard
  assert.equal(h.slope.length, h.gw * h.gh)
  assert.equal(h.low.length, h.gw * h.gh)
  assert.ok(Math.max(...h.low) >= 85, 'the crater should show up as ~0.9 km of low ground')
  assert.ok(Math.max(...h.slope) > 0)
})

test('heat-map colours: transparent when safe, opaque and redder as it gets worse', () => {
  assert.equal(hazardColor('slope', 2)[3], 0)
  const a = hazardColor('slope', 8), b = hazardColor('slope', 18)
  assert.ok(b[3] > a[3] && b[1] < a[1])
  assert.equal(hazardColor('low', 0.05)[3], 0)
  assert.ok(hazardColor('low', 1.5)[3] > hazardColor('low', 0.4)[3])
})

test('heat-map rectangle handles longitudes above 180 and refuses to straddle the +-180 line', () => {
  const ok = hazardRectangle({ bounds: { lonMin: 306, lonMax: 312, latMin: -20, latMax: -10 } })
  assert.deepEqual([ok.west, ok.east], [-54, -48])
  assert.equal(hazardRectangle({ bounds: { lonMin: 176, lonMax: 184, latMin: 0, latMax: 5 } }), null)
})

test('chip keys map catalogue sources honestly', () => {
  assert.equal(sourceKey('MRO CRISM'), 'CRISM')
  assert.equal(sourceKey('MRO HiRISE / Perseverance Mastcam-Z'), 'HiRISE')
  assert.equal(sourceKey('Curiosity REMS'), 'ROVER')
  assert.equal(sourceKey(''), 'NASA')
})
