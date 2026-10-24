// Tests the NASA tile sampler against a fake tile server (no network needed).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMarsTerrain, ANCHORS } from './marsElevation.js'
import { planRealRoute } from '../lib/realRoute.js'
import { haversineKm } from '../lib/routeAnalysis.js'

// Smooth fake planet: heights blend towards the nearest anchor's known height.
const trueElev = (lat, lon) => {
  let num = 0, den = 1e-9
  for (const a of ANCHORS) {
    const d = haversineKm({ lat, lon }, a)
    const w = Math.exp(-(d * d) / (2 * 400 * 400))
    num += w * a.km; den += w
  }
  return den > 1e-6 ? num / den : -2
}
// 8-bit encoding with an arbitrary stretch the code must discover on its own
const encode = (km) => Math.max(0, Math.min(255, Math.round(((km + 9.5) / 32) * 255)))

function fakeServer({ colorful = false, missing = () => false } = {}) {
  const calls = { n: 0 }
  const loadTile = async (z, x, y) => {
    calls.n++
    if (missing(z, x, y)) return null
    const cols = 2 ** (z + 1), rows = 2 ** z
    const gray = new Uint8Array(65536), alpha = new Uint8Array(65536).fill(255)
    for (let py = 0; py < 256; py++) {
      const lat = 90 - ((y * 256 + py + 0.5) / (rows * 256)) * 180
      for (let px = 0; px < 256; px++) {
        const lon = ((x * 256 + px + 0.5) / (cols * 256)) * 360 // 0..360 east
        gray[py * 256 + px] = encode(trueElev(lat, lon))
      }
    }
    return { gray, alpha, colorful }
  }
  return { loadTile, calls }
}

// The fake above indexes longitude 0..360; real tiles start at -180, so shift columns by half the world.
function fakeServerStd(opts) {
  const base = fakeServer(opts)
  const loadTile = async (z, x, y) => {
    const cols = 2 ** (z + 1)
    return base.loadTile(z, (x + cols / 2) % cols, y)
  }
  return { loadTile, calls: base.calls }
}

test('calibrates against known site heights and recovers elevations', async () => {
  const srv = fakeServerStd()
  const t = createMarsTerrain({ loadTile: srv.loadTile })
  const cal = await t.calibrate()
  assert.equal(cal.ok, true, cal.reason)
  assert.ok(cal.r2 > 0.95)
  const terrain = await t.prepareTerrain({
    bounds: { lonMin: 74, lonMax: 81, latMin: 16, latMax: 23 }, cellKm: 1,
  })
  assert.equal(terrain.source.real, true)
  const h = terrain.heightAt(18.44, 77.45)
  assert.ok(Math.abs(h - trueElev(18.44, 77.45)) < 0.4, `height ${h}`)
})

test('plans a full route on the fake NASA tiles', async () => {
  const t = createMarsTerrain({ loadTile: fakeServerStd().loadTile })
  const nili = { id: 'nili', name: 'Nili', lat: 21.0, lon: 74.5 }
  const jez = { id: 'jez', name: 'Jezero', lat: 18.435, lon: 77.527 }
  const r = await planRealRoute(nili, jez, { mode: 'fastest', maxSlopeDeg: 15, avoidRough: true, showScience: false, evaHoursPerSol: 6 }, { prepareTerrain: t.prepareTerrain })
  assert.equal(r.dataSource.real, true)
  assert.ok(r.points.every((p) => Number.isFinite(p.elevKm)))
})

test('rejects colour (non-elevation) tiles', async () => {
  const t = createMarsTerrain({ loadTile: fakeServerStd({ colorful: true }).loadTile })
  const cal = await t.calibrate()
  assert.equal(cal.ok, false)
  await assert.rejects(t.prepareTerrain({ bounds: { lonMin: 74, lonMax: 81, latMin: 16, latMax: 23 }, cellKm: 1 }))
})

test('rejects tiles that do not match known heights', async () => {
  const noise = async () => {
    const gray = new Uint8Array(65536).map(() => Math.floor(Math.random() * 256))
    return { gray, alpha: new Uint8Array(65536).fill(255), colorful: false }
  }
  const cal = await createMarsTerrain({ loadTile: noise }).calibrate()
  assert.equal(cal.ok, false)
})

test('fails cleanly when the tile server is unreachable', async () => {
  const t = createMarsTerrain({ loadTile: async () => null })
  const cal = await t.calibrate()
  assert.equal(cal.ok, false)
})

test('tiles are cached, so planning several routes loads each tile once', async () => {
  const srv = fakeServerStd()
  const t = createMarsTerrain({ loadTile: srv.loadTile })
  const b = { bounds: { lonMin: 74, lonMax: 81, latMin: 16, latMax: 23 }, cellKm: 1 }
  await t.prepareTerrain(b)
  const after1 = srv.calls.n
  await t.prepareTerrain(b)
  await t.prepareTerrain(b)
  assert.equal(srv.calls.n, after1)
})
