// Entry point used by the Route Planner UI.
//
// 1. Try to plan on real NASA MOLA elevation (A* over a DEM grid).
// 2. If the elevation tiles cannot be loaded, fall back to the old simulated
//    planner and flag the route (route.dataSource.real === false) so the UI is honest.
// Genuine planning outcomes (no passable route, points too close) are thrown, not hidden.

import sciencePOIs from '../data/sciencePOIs.json'
import { planRealRoute, RouteError } from '../lib/realRoute.js'
import { marsTerrain } from './marsElevation.js'
import { planRoute as planSimulated } from '../components/route/routeUtils'
import { MODES } from '../lib/routeAnalysis.js'
import { searchBlend, goalFor, needsRefining } from '../lib/balanced.js'

const PLANNING_ERRORS = new Set(['blocked', 'too_close'])

export async function planRouteAsync(start, end, settings) {
  if (!start || !end || start.id === end.id) return null
  try {
    return await planRealRoute(start, end, settings, {
      prepareTerrain: marsTerrain.prepareTerrain,
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

const tick = () => new Promise((r) => setTimeout(r, 0)) // let the page paint and respond between planning steps
const CACHE = new Map()
const cacheKey = (start, end, s) => [start.id, end.id, s.maxSlopeDeg, s.evaHoursPerSol, s.showScience, s.avoidRough].join('|')

/**
 * Plans fastest, safest and most-scientific routes for the same trip, each refined against its own goal.
 * Results arrive in steps so the page can show a route straight away:
 *   onUpdate({ primary, alternatives, done })  after the selected mode, then after the others, then after refining.
 * Resolves with { primary, alternatives }. `cancelled()` stops the work early when a newer request replaces this one.
 */
export async function planAllModes(start, end, settings, { onUpdate, cancelled = () => false } = {}) {
  if (!start || !end || start.id === end.id) return null
  const key = cacheKey(start, end, settings)
  if (CACHE.has(key)) {
    const hit = CACHE.get(key)
    const result = { primary: hit.alternatives[settings.mode], alternatives: hit.alternatives }
    onUpdate?.({ ...result, done: true })
    return result
  }
  const modes = Object.keys(MODES)
  const t0 = Date.now()
  const order = [settings.mode, ...modes.filter((m) => m !== settings.mode)]
  const alternatives = {}
  const plan = async (mode) => {
    try { alternatives[mode] = await planRouteAsync(start, end, { ...settings, mode }) } catch (e) { alternatives[mode] = { error: e.message } }
  }
  const push = (done = false) => onUpdate?.({ primary: alternatives[settings.mode], alternatives: { ...alternatives }, done })

  // 1. the selected mode first, so something appears right away
  await plan(settings.mode)
  console.info(`[RedMap] first route on screen after ${Date.now() - t0} ms`)
  if (alternatives[settings.mode]?.error) throw new RouteError('blocked', alternatives[settings.mode].error)
  if (cancelled()) return null
  push()

  // 2. the other modes
  for (const m of order.slice(1)) {
    await tick()
    if (cancelled()) return null
    await plan(m)
  }
  push()

  // 3. refine each mode against its own goal (see lib/balanced.js), only where it can help
  const good = (m) => (alternatives[m] && !alternatives[m].error && alternatives[m].dataSource?.real !== false ? alternatives[m] : null)
  const planAt = (mode, from) => (t) => planRouteAsync(start, end, { ...settings, mode, blend: t, blendFrom: from })
  const plain = { fastest: good('fastest'), safest: good('safest'), scientific: good('scientific') }
  const seedsFor = { fastest: [plain.fastest], safest: [plain.safest, plain.fastest], scientific: [plain.scientific] }
  for (const mode of order) {
    await tick()
    if (cancelled()) return null
    if (!plain[mode] || !needsRefining(mode, plain[mode], plain)) continue
    try {
      const seeds = seedsFor[mode].filter(Boolean)
      const g = goalFor(mode, seeds)
      const { best, accepted } = await searchBlend(planAt(mode, g.from), { ...g, seeds, steps: 3 })
      if (!best || best === plain[mode]) continue
      // a seed from another mode won: plan it again under this mode so its speed and labels are consistent
      const final = best.mode === mode ? best : await planAt(mode, g.from)(best.mode === 'safest' ? 1 : 0)
      final.refined = { accepted, blend: final.blend ?? 0 }
      alternatives[mode] = final
      push()
    } catch { /* keep the plain route */ }
  }

  const result = { primary: alternatives[settings.mode], alternatives }
  if (result.primary?.dataSource?.real !== false) {
    CACHE.set(key, { alternatives })
    if (CACHE.size > 8) CACHE.delete(CACHE.keys().next().value)
  }
  console.info(`[RedMap] all modes planned in ${Date.now() - t0} ms`)
  push(true)
  return result
}
