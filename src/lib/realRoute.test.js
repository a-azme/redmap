// Run with: npm test   (uses Node's built-in test runner, no extra dependencies)
import test from 'node:test'
import assert from 'node:assert/strict'
import { planRealRoute, gridSpec, RouteError } from './realRoute.js'
import { haversineKm } from './routeAnalysis.js'

const NILI = { id: 'nili', name: 'Nili Fossae', lat: 21.0, lon: 74.5 }
const JEZERO = { id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527 }
const VALLES = { id: 'valles', name: 'Valles Marineris', lat: -13.9, lon: 301.0 }

const settings = (over = {}) => ({
  mode: 'fastest', maxSlopeDeg: 15, avoidRough: true, showScience: true, evaHoursPerSol: 6, ...over,
})

// A tall Gaussian mountain sitting on the straight line between Nili and Jezero.
const mid = { lat: (NILI.lat + JEZERO.lat) / 2, lon: (NILI.lon + JEZERO.lon) / 2 }
const mountain = (lat, lon) => {
  const d = haversineKm({ lat, lon }, mid)
  return -2 + 7 * Math.exp(-(d * d) / (2 * 12 * 12))
}
const terrainOf = (heightAt) => ({ prepareTerrain: async () => ({ heightAt, source: { real: true, name: 'test' } }) })

test('flat terrain gives a near straight-line route', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings(), terrainOf(() => -2))
  const gc = haversineKm(NILI, JEZERO)
  assert.ok(r.distanceKm >= gc * 0.98 && r.distanceKm < gc * 1.12, `${r.distanceKm} vs great circle ${gc}`)
  assert.ok(r.maxSlopeDeg < 1)
  assert.equal(r.dataSource.real, true)
})

test('route detours around a mountain instead of climbing it', async () => {
  const flat = await planRealRoute(NILI, JEZERO, settings(), terrainOf(() => -2))
  const hill = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(mountain))
  assert.ok(hill.distanceKm > flat.distanceKm, 'should be longer than the flat route')
  const peak = Math.max(...hill.points.map((p) => p.elevKm))
  assert.ok(peak < 1.5, `route should skirt the summit, peak was ${peak} km`)
  assert.ok(hill.maxSlopeDeg <= 15 + 1)
})

test('safest mode never climbs more than fastest mode', async () => {
  const fast = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest' }), terrainOf(mountain))
  const safe = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest' }), terrainOf(mountain))
  assert.ok(safe.maxSlopeDeg <= fast.maxSlopeDeg + 0.5)
})

test('impassable terrain reports a clear error', async () => {
  const wall = (lat, lon) => (lon > mid.lon ? 8 : -2) // vertical cliff between start and goal
  await assert.rejects(
    planRealRoute(NILI, JEZERO, settings({ maxSlopeDeg: 5 }), terrainOf(wall)),
    (e) => e instanceof RouteError && e.code === 'blocked',
  )
})

test('science stops are only real catalogued sites near the path', async () => {
  const pois = [
    { id: 'near', name: 'Near site', lat: 19.7, lon: 76.0, note: 'on the way', source: 'MRO CRISM' },
    { id: 'far', name: 'Far site', lat: -4.6, lon: 137.4, note: 'other side of Mars' },
  ]
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'scientific' }), { ...terrainOf(() => -2), pois })
  assert.deepEqual(r.stops.map((s) => s.id), ['poi-near'])
  assert.equal(r.stops[0].source, 'MRO CRISM')
  const none = await planRealRoute(NILI, JEZERO, settings({ showScience: false }), { ...terrainOf(() => -2), pois })
  assert.equal(none.stops.length, 0)
})

test('long route across the 0/360 longitude seam works and stays monotonic', async () => {
  const a = { id: 'a', name: 'A', lat: -1.95, lon: 354.47 }
  const b = { id: 'b', name: 'B', lat: 4.5, lon: 20.0 }
  const r = await planRealRoute(a, b, settings(), terrainOf(() => 0))
  const gc = haversineKm(a, b)
  assert.ok(r.distanceKm >= gc * 0.97 && r.distanceKm < gc * 1.2, `${r.distanceKm} vs ${gc}`)
  for (let i = 1; i < r.points.length; i++) assert.ok(r.points[i].km >= r.points[i - 1].km)
  assert.ok(r.points.every((p) => p.lon >= 0 && p.lon < 360))
})

test('very long route (Valles to Jezero) uses a coarse grid and says so', async () => {
  const spec = gridSpec(VALLES, JEZERO)
  assert.ok(spec.cellKm > 10)
  const r = await planRealRoute(VALLES, JEZERO, settings(), terrainOf(() => -2))
  assert.ok(r.warnings.some((w) => w.title === 'Coarse terrain model'))
})

test('route object has every field the UI reads', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings(), terrainOf(mountain))
  for (const k of ['distanceKm', 'sols', 'elevationGainKm', 'maxSlopeDeg', 'minTempC', 'radiationMsv', 'risk', 'riskLabel', 'points', 'path', 'warnings', 'stops', 'start', 'end']) {
    assert.ok(k in r, `missing ${k}`)
  }
  const p = r.points[0]
  for (const k of ['km', 'lat', 'lon', 'elevKm', 'slopeDeg', 'terrain', 'tempC']) assert.ok(k in p, `point missing ${k}`)
  assert.equal(r.points[r.points.length - 1].km, r.distanceKm)
})

// ---- the three modes must actually behave differently ----
const KM = (Math.PI / 180) * 3389.5
const dir = { // unit vector start->end in local km (east, north) and its perpendicular
  e: (JEZERO.lon - NILI.lon) * Math.cos(mid.lat * Math.PI / 180) * KM,
  n: (JEZERO.lat - NILI.lat) * KM,
}
const len = Math.hypot(dir.e, dir.n)
const u = { e: dir.e / len, n: dir.n / len }
// a 2 km high ridge across the corridor: ~17 deg slopes, impassable only for strict slope limits, 40 km wide
const ridge = (lat, lon) => {
  const e = (lon - mid.lon) * Math.cos(mid.lat * Math.PI / 180) * KM
  const n = (lat - mid.lat) * KM
  const along = e * u.e + n * u.n
  const across = -e * u.n + n * u.e
  return -2 + 2 * Math.exp(-(along * along) / (2 * 4 * 4)) * Math.exp(-(across * across) / (2 * 40 * 40))
}
const withPois = (extra = {}) => ({ ...terrainOf(ridge), pois: [
  { id: 'a', name: 'Site A', lat: 20.0, lon: 75.3, note: 'a', source: 'MRO CRISM' },
  { id: 'b', name: 'Site B', lat: 19.2, lon: 76.6, note: 'b', source: 'MRO HiRISE' },
], ...extra })

test('safest goes around a ridge that fastest crosses', async () => {
  const fast = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', maxSlopeDeg: 25 }), withPois())
  const safe = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest', maxSlopeDeg: 25 }), withPois())
  assert.ok(safe.maxSlopeDeg < fast.maxSlopeDeg, `safe ${safe.maxSlopeDeg} vs fast ${fast.maxSlopeDeg}`)
  assert.ok(safe.maxSlopeDeg <= 10.5, `safest should respect its own 10 deg limit: ${safe.maxSlopeDeg}`)
  assert.ok(safe.distanceKm > fast.distanceKm, 'going around is longer')
  assert.ok(safe.elevationGainKm < fast.elevationGainKm, 'and climbs less')
})

test('scientific mode passes through catalogued sites within its detour budget', async () => {
  const fast = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', maxSlopeDeg: 25 }), withPois())
  const sci = await planRealRoute(NILI, JEZERO, settings({ mode: 'scientific', maxSlopeDeg: 25 }), withPois())
  assert.ok(sci.stops.length > fast.stops.length || sci.stops.length === 2, `stops ${sci.stops.length}`)
  assert.ok(sci.stops.every((s) => s.offRouteKm < 3), 'it should actually go through them')
  assert.ok(sci.distanceKm <= fast.distanceKm * 1.4)
})

test('the three modes give three different paths', async () => {
  const paths = {}
  for (const mode of ['fastest', 'safest', 'scientific']) {
    paths[mode] = (await planRealRoute(NILI, JEZERO, settings({ mode, maxSlopeDeg: 25 }), withPois())).points
  }
  const maxGap = (p, q) => Math.max(...p.map((a) => Math.min(...q.map((b) => haversineKm(a, b)))))
  assert.ok(maxGap(paths.safest, paths.fastest) > 4, 'safest vs fastest')
  assert.ok(maxGap(paths.scientific, paths.fastest) > 2, 'scientific vs fastest')
})

test('a strict slope slider still blocks everything with a clear error', async () => {
  await assert.rejects(
    planRealRoute(NILI, JEZERO, settings({ mode: 'safest', maxSlopeDeg: 5 }), terrainOf((lat, lon) => (lon > mid.lon ? 8 : -2))),
    (e) => e.code === 'blocked',
  )
})

// ---- numbered waypoints ----
test('detour routes get numbered turning waypoints in travel order', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest', maxSlopeDeg: 25 }), withPois())
  assert.ok(r.waypoints.some((w) => w.kind === 'turn'), 'a detour must have at least one turn')
  r.waypoints.forEach((w, i) => assert.equal(w.n, i + 1))
  for (let i = 1; i < r.waypoints.length; i++) assert.ok(r.waypoints[i].km >= r.waypoints[i - 1].km)
  assert.ok(r.waypoints.every((w) => w.km > 0 && w.km < r.distanceKm))
  assert.ok(r.waypoints.every((w) => w.lon >= 0 && w.lon < 360 && Number.isFinite(w.elevKm) || w.kind === 'stop'))
})

test('science stops are waypoints too, with their names', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ mode: 'scientific', maxSlopeDeg: 25 }), withPois())
  const names = r.waypoints.filter((w) => w.kind === 'stop').map((w) => w.name)
  assert.deepEqual(names.sort(), ['Site A', 'Site B'])
  assert.ok(r.waypoints.filter((w) => w.kind !== 'checkpoint').length <= 8)
})

test('a straight route over flat ground has no turning waypoints', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings({ showScience: false }), terrainOf(() => -2))
  assert.equal(r.waypoints.filter((w) => w.kind === 'turn').length, 0)
})

// ---- low-ground avoidance ----
// a wide, shallow crater (gentle ~4 deg walls) sitting right on the straight line
const crater = (lat, lon) => {
  const d = haversineKm({ lat, lon }, mid)
  return -2 - 1.5 * Math.exp(-(d * d) / (2 * 14 * 14))
}
const minElev = (r) => Math.min(...r.points.map((p) => p.elevKm))
const maxGap = (p, q) => Math.max(...p.map((a) => Math.min(...q.map((b) => haversineKm(a, b)))))

test('routes go around a crater whose walls are gentle', async () => {
  const through = await planRealRoute(NILI, JEZERO, settings({ avoidLows: false, showScience: false }), terrainOf(crater))
  const around = await planRealRoute(NILI, JEZERO, settings({ showScience: false }), terrainOf(crater))
  assert.ok(minElev(through) < -3, `without avoidance it should enter the pit (${minElev(through)})`)
  assert.ok(minElev(around) > minElev(through) + 0.5, `with avoidance it stays higher (${minElev(around)})`)
  assert.ok(maxGap(around.points, through.points) > 8, 'and it is visibly a different, bent path')
  assert.ok(around.distanceKm < through.distanceKm * 1.4)
})

test('safest avoids low ground more strongly than fastest', async () => {
  const fast = await planRealRoute(NILI, JEZERO, settings({ mode: 'fastest', showScience: false }), terrainOf(crater))
  const safe = await planRealRoute(NILI, JEZERO, settings({ mode: 'safest', showScience: false }), terrainOf(crater))
  assert.ok(minElev(safe) >= minElev(fast) - 0.01)
})

test('a destination inside a pit is flagged as low ground', async () => {
  // gentle bowl centred on the destination: unavoidable, so the route must say so
  const bowl = (lat, lon) => -2 - 1.2 * Math.exp(-(haversineKm({ lat, lon }, JEZERO) ** 2) / (2 * 12 * 12))
  const r = await planRealRoute(NILI, JEZERO, settings({ showScience: false }), terrainOf(bowl))
  assert.ok(r.points.some((p) => p.terrain === 'Low ground'))
  assert.ok(r.warnings.some((w) => w.title === 'Low Ground'))
})
