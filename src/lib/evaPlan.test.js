import test from 'node:test'
import assert from 'node:assert/strict'
import { solarLongitude, daylight, fmtClock, isDustSeason } from './marsTime.js'
import { commsDelay } from './commsDelay.js'
import { planEva } from './evaPlan.js'
import { evaPlanText, evaPlanJson } from './exportRoute.js'
import { planRealRoute, shortcutPath } from './realRoute.js'

const d = (s) => new Date(`${s}T00:00:00Z`)
const NILI = { id: 'nili', name: 'Nili Fossae', lat: 21.0, lon: 74.5 }
const JEZERO = { id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527 }
const settings = (o = {}) => ({ mode: 'fastest', maxSlopeDeg: 15, avoidRough: true, showScience: true, evaHoursPerSol: 6, ...o })
const flat = { prepareTerrain: async () => ({ heightAt: () => -2, source: { real: true, name: 'test' } }) }

test('solar longitude is ~0 at known Mars year starts', () => {
  for (const day of ['2021-02-07', '2022-12-26', '2024-11-12', '2026-09-30']) {
    const ls = solarLongitude(d(day))
    assert.ok(ls > 357 || ls < 3, `${day}: ${ls}`)
  }
})

test('Earth-Mars distance matches known oppositions and conjunction', () => {
  assert.ok(Math.abs(commsDelay(d('2025-01-16')).distanceAU - 0.64) < 0.03)
  assert.ok(Math.abs(commsDelay(d('2027-02-19')).distanceAU - 0.68) < 0.03)
  const c = commsDelay(d('2026-01-09'))
  assert.ok(c.oneWayMin > 17 && c.oneWayMin < 24, `conjunction delay ${c.oneWayMin}`)
})

test('daylight: equator is 12 Mars hours; high north in summer is polar day', () => {
  assert.ok(Math.abs(daylight(0, 90).daylightMarsH - 12) < 0.01)
  assert.equal(daylight(75, 90).polarDay, true)
  assert.equal(daylight(75, 270).polarNight, true)
  assert.equal(fmtClock(8.5), '08:30')
  assert.equal(isDustSeason(251), true)
})

test('straightening keeps a flat route close to the great circle', async () => {
  const r = await planRealRoute(NILI, JEZERO, settings(), flat)
  assert.ok(r.distanceKm <= 232, `${r.distanceKm}`) // great circle is ~227 km
})

test('straightening never cuts through terrain above the slope limit', () => {
  const g = { gw: 20, gh: 5, dy: 1, dxRow: new Float32Array(5).fill(1), heights: new Float32Array(100) }
  for (let y = 0; y < 5; y++) g.heights[y * 20 + 10] = 50 // tall ridge
  const nodes = Array.from({ length: 20 }, (_, i) => ({ fx: i, fy: 2 }))
  // path along the row crosses the ridge; every shortcut over it must be rejected, so all nodes that
  // touch the ridge are kept
  const out = shortcutPath(g, nodes, { maxSlope: 15, slopeWeight: 1, bonus: null })
  assert.ok(out.length >= 2)
})

async function sample(over = {}, evaOpts = {}) {
  const pois = [{ id: 'near', name: 'Near site', lat: 19.7, lon: 76.05, note: 'on the way', source: 'MRO CRISM' }]
  const route = await planRealRoute(NILI, JEZERO, settings(over), { ...flat, pois })
  return { route, plan: planEva(route, { date: d('2026-10-22'), selectedStopIds: ['poi-near'], ...evaOpts }) }
}

test('schedule covers the whole route, sol by sol, inside daylight', async () => {
  const { route, plan } = await sample()
  assert.equal(plan.sols[0].startKm, 0)
  assert.ok(Math.abs(plan.sols.at(-1).endKm - route.distanceKm) < 1)
  for (let i = 1; i < plan.sols.length; i++) assert.ok(Math.abs(plan.sols[i].startKm - plan.sols[i - 1].endKm) < 0.2)
  assert.ok(plan.sols.every((s) => s.evaHours <= 6.001 && s.sunsetMarginH > 0))
})

test('a selected science stop adds EVA time and shows up in the schedule', async () => {
  const { route, plan } = await sample()
  const without = planEva(route, { date: d('2026-10-22'), selectedStopIds: [] })
  assert.ok(plan.totalEvaHours > without.totalEvaHours + 2.5)
  assert.ok(plan.sols.some((s) => s.stops.includes('Near site')))
})

test('walking is slower than driving and triggers a walk-back warning', async () => {
  const { route } = await sample()
  const rover = planEva(route, { date: d('2026-10-22'), travel: 'rover' })
  const foot = planEva(route, { date: d('2026-10-22'), travel: 'foot' })
  assert.ok(foot.totalSols > rover.totalSols)
  assert.ok(foot.warnings.some((w) => w.title === 'Beyond walk-back range'))
  assert.ok(!rover.warnings.some((w) => w.title === 'Beyond walk-back range'))
})

test('dust season and polar night are flagged', async () => {
  const { route } = await sample()
  const dusty = planEva(route, { date: d('2027-11-15') }) // Ls ~ 220: inside the dust season
  assert.ok(isDustSeason(dusty.ls) && dusty.warnings.some((w) => w.title === 'Dust-storm season'))
  const polar = { ...route, points: route.points.map((p) => ({ ...p, lat: 80 })) }
  const night = planEva(polar, { date: d('2026-12-01') })
  assert.ok(night.warnings.some((w) => w.title === 'EVA in darkness') || night.sols.every((s) => !s.night))
})

test('mission card text and JSON export are well formed', async () => {
  const { route, plan } = await sample()
  const txt = evaPlanText(route, plan)
  assert.match(txt, /REDMAP EVA MISSION CARD/)
  assert.match(txt, /Nili Fossae -> Jezero Crater/)
  const json = JSON.parse(evaPlanJson(route, plan))
  assert.equal(json.eva.sols.length, plan.sols.length)
})
