// Entry point used by the Route Planner UI.
//
// 1. Try to plan on real NASA MOLA elevation (A* over a DEM grid).
// 2. If the elevation tiles cannot be loaded, fall back to the old simulated
//    planner and flag the route (route.dataSource.real === false) so the UI is honest.
// Genuine planning outcomes (no passable route, points too close) are thrown, not hidden.

import sciencePOIs from '../data/sciencePOIs.json'
import { planRealRoute, planRealRouteHopped, RouteError, HOP_MIN_TRIP_KM } from '../lib/realRoute.js'
import { marsTerrain } from './marsElevation.js'
import { planRoute as planSimulated } from '../components/route/routeUtils'
import { MODES } from '../lib/routeAnalysis.js'
import { searchBlend, goalFor, needsRefining } from '../lib/balanced.js'

const PLANNING_ERRORS = new Set(['blocked', 'too_close'])

// ---- run the planner in a Web Worker when the browser has one, so the page never freezes while it works ----
// The worker asks this page for the NASA tiles it needs (only the page can decode images) and plans on them.
let worker = null
let workerBroken = false
let nextId = 1
const waiting = new Map()
let terrainSource = marsTerrain
const WORKER_TIMEOUT_MS = 40_000
const WORKER_TIMEOUT_HOPS_MS = 150_000 // hop planning re-plans a long trip in a dozen pieces

function getWorker() {
  if (workerBroken || typeof Worker === 'undefined') return null
  if (!worker) {
    try {
      const w = new Worker(new URL('../workers/routeWorker.js', import.meta.url), { type: 'module' })
      worker = w
      console.info('[RedMap] route planning runs in a Web Worker')
      w.onmessage = ({ data }) => {
        if (data.type === 'need-terrain') {
          Promise.resolve()
            .then(() => terrainSource.prepareTerrain(data.spec))
            .then(
              (t) => w.postMessage({ type: 'terrain', reqId: data.reqId, snapshot: t.snapshot, source: t.source }),
              (e) => w.postMessage({ type: 'terrain', reqId: data.reqId, error: e.message }),
            )
          return
        }
        const p = waiting.get(data.id)
        if (!p) return
        waiting.delete(data.id)
        if (data.error) p.reject(data.error.code ? new RouteError(data.error.code, data.error.message) : new Error(data.error.message))
        else p.resolve(data.route)
      }
      w.onmessageerror = () => { console.warn('[RedMap] planning worker sent data that could not be read') }
      w.onerror = (e) => {
        console.warn('[RedMap] planning worker failed, planning on the main thread instead:', e.message)
        workerBroken = true
        worker = null
        for (const p of waiting.values()) p.reject(new Error('worker failed'))
        waiting.clear()
      }
    } catch { workerBroken = true; worker = null }
  }
  return worker
}

function planInWorker(w, start, end, settings) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiting.delete(id)
      console.warn('[RedMap] planning worker did not answer in time, planning on the main thread instead')
      workerBroken = true
      try { worker?.terminate() } catch { /* already gone */ }
      worker = null
      reject(new Error('worker timeout'))
    }, settings.hops ? WORKER_TIMEOUT_HOPS_MS : WORKER_TIMEOUT_MS)
    waiting.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v) }, reject: (e) => { clearTimeout(timer); reject(e) } })
    w.postMessage({ id, start, end, settings })
  })
}

/** Lets tests swap the NASA tile source for fake tiles. */
export function useTerrainSource(t) { terrainSource = t ?? marsTerrain }

export async function planRouteAsync(start, end, settings) {
  if (!start || !end || start.id === end.id) return null
  try {
    const w = getWorker()
    if (w) {
      try {
        return await planInWorker(w, start, end, settings)
      } catch (e) {
        if (e instanceof RouteError) throw e // a real planning outcome
        if (!workerBroken) throw e // terrain unavailable etc.: handled below like before
        // the worker itself failed: plan on the main thread instead
      }
    }
    return await (settings.hops ? planRealRouteHopped : planRealRoute)(start, end, settings, {
      prepareTerrain: terrainSource.prepareTerrain,
      pois: sciencePOIs,
    })
  } catch (err) {
    if (err instanceof RouteError && PLANNING_ERRORS.has(err.code)) throw err
    console.warn('[RedMap] Real elevation unavailable, using simulated route:', err.message)
    const route = planSimulated(start, end, settings)
    if (route) route.dataSource = { real: false, reason: err.message }
    return route
  }
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms)) // let the page paint and respond between planning steps
const CACHE = new Map()
const MODE_CACHE = new Map()
const cacheKey = (start, end, s) =>
  [
    start.id,
    end.id,
    s.maxSlopeDeg,
    s.evaHoursPerSol,
    s.showScience,
    s.avoidRough,
    s.keepOut !== false,
    s.avoidLows !== false,
    (s.customWaypoints || []).map((w) => `${w.lat.toFixed(4)},${w.lon.toFixed(4)}`).join(';'),
  ].join('|')

/**
 * Plans fastest, safest and most-scientific routes for the same trip, each refined against its own goal.
 * Results arrive in steps so the page can show a route straight away:
 *   onUpdate({ primary, alternatives, done })  after the selected mode, then after the others, then after refining.
 * Resolves with { primary, alternatives }. `cancelled()` stops the work early when a newer request replaces this one.
 */
export async function planAllModes(start, end, settings, { onUpdate, cancelled = () => false } = {}) {
  if (!start || !end || start.id === end.id) return null
  const activeMode = MODES[settings.mode] ? settings.mode : 'scientific'
  const key = cacheKey(start, end, settings)
  if (CACHE.has(key)) {
    const hit = CACHE.get(key)
    const primary = hit.alternatives[activeMode] || Object.values(hit.alternatives)[0]
    if (primary && !primary.error) {
      const result = { primary, alternatives: hit.alternatives }
      onUpdate?.({ ...result, done: true })
      return result
    }
  }
  const modes = Object.keys(MODES)
  const t0 = Date.now()
  const order = [activeMode, ...modes.filter((m) => m !== activeMode)]
  const alternatives = {}
  const plan = async (mode) => {
    const mKey = `${key}|${mode}`
    if (MODE_CACHE.has(mKey)) {
      alternatives[mode] = MODE_CACHE.get(mKey)
      return
    }
    try {
      const r = await planRouteAsync(start, end, { ...settings, mode })
      alternatives[mode] = r
      if (r && !r.error && r.dataSource?.real !== false) {
        MODE_CACHE.set(mKey, r)
        if (MODE_CACHE.size > 24) MODE_CACHE.delete(MODE_CACHE.keys().next().value)
      }
    } catch (e) {
      alternatives[mode] = { error: e.message }
    }
  }
  const push = (done = false) =>
    onUpdate?.({ primary: alternatives[activeMode], alternatives: { ...alternatives }, done })

  // 1. the selected mode first, so something appears right away
  await plan(activeMode)
  console.info(`[RedMap] first route on screen after ${Date.now() - t0} ms`)
  if (alternatives[activeMode]?.error) throw new RouteError('blocked', alternatives[activeMode].error)
  if (cancelled()) return null
  push()

  // Yield briefly so OpenSeadragon can smoothly pan/zoom and paint sector tiles before background modes run
  await tick(50)
  if (cancelled()) return null

  // 2. the other modes
  for (const m of order.slice(1)) {
    await tick(16)
    if (cancelled()) return null
    await plan(m)
  }
  push()

  // 3. refine each mode against its own goal (see lib/balanced.js), only where it can help on regional routes
  const good = (m) => (alternatives[m] && !alternatives[m].error && alternatives[m].dataSource?.real !== false ? alternatives[m] : null)
  const planAt = (mode, from) => (t) => planRouteAsync(start, end, { ...settings, mode, blend: t, blendFrom: from })
  const plain = { fastest: good('fastest'), safest: good('safest'), scientific: good('scientific') }
  const seedsFor = { fastest: [plain.fastest], safest: [plain.safest, plain.fastest], scientific: [plain.scientific] }
  for (const mode of order) {
    if (!plain[mode] || plain[mode].distanceKm < 35) continue
    await tick(16)
    if (cancelled()) return null
    // a long trip: re-plan the active selected mode in hops on fine grids, so craters and rims the overview grid cannot see are avoided
    if (plain[mode] && plain[mode].distanceKm > HOP_MIN_TRIP_KM) {
      if (mode !== activeMode) continue
      try {
        const hopped = await planRouteAsync(start, end, { ...settings, mode, hops: true })
        if (cancelled()) return null
        if (hopped && !hopped.error && hopped.dataSource?.hops > 1) { alternatives[mode] = hopped; push() }
      } catch { /* keep the overview route */ }
      continue
    }
    if (!needsRefining(mode, plain[mode], plain)) continue
    try {
      const seeds = seedsFor[mode].filter(Boolean)
      const g = goalFor(mode, seeds)
      const { best, accepted } = await searchBlend(planAt(mode, g.from), { ...g, seeds, steps: 2 })
      if (!best || best === plain[mode]) continue
      // a seed from another mode won: plan it again under this mode so its speed and labels are consistent
      const final = best.mode === mode ? best : await planAt(mode, g.from)(best.mode === 'safest' ? 1 : 0)
      final.refined = { accepted, blend: final.blend ?? 0 }
      alternatives[mode] = final
      push()
    } catch { /* keep the plain route */ }
  }

  const result = { primary: alternatives[activeMode], alternatives }
  if (result.primary?.dataSource?.real !== false) {
    CACHE.set(key, { alternatives })
    if (CACHE.size > 12) CACHE.delete(CACHE.keys().next().value)
  }
  console.info(`[RedMap] all modes planned in ${Date.now() - t0} ms`)
  push(true)
  return result
}

