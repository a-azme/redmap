// Refines each route mode against its own goal by trying blends between that mode's settings and the Safest ones.
import { MODERATE_RISK_MAX } from '../constants/config.js'

const criticals = (r) => r?.warnings?.filter((w) => w.severity === 'critical').length ?? 0
const byDistance = (a, b) => a.distanceKm - b.distanceKm || a.risk - b.risk

/**
 * What "better" means for each mode. `seeds` are the plain routes already planned; they set the bar.
 *  fastest    shortest route whose risk stays below Moderate
 *  safest     shortest route whose risk is within 2 points of the lowest risk found (no pointless detours)
 *  scientific most science stops, then shortest, with risk below Moderate
 */
export function goalFor(mode, seeds = []) {
  const real = seeds.filter((r) => r && !r.error)
  if (mode === 'safest') {
    const ref = real.filter((r) => r.mode === 'safest')[0] ?? real.slice().sort((a, b) => a.risk - b.risk)[0]
    return { from: 'fastest', accept: (r) => !!ref && r.risk <= ref.risk + 2 && criticals(r) <= criticals(ref), better: byDistance }
  }
  const ok = (r) => r.risk < MODERATE_RISK_MAX && criticals(r) === 0
  if (mode === 'scientific') {
    return { from: 'scientific', accept: ok, better: (a, b) => (b.stops?.length ?? 0) - (a.stops?.length ?? 0) || byDistance(a, b) }
  }
  return { from: 'fastest', accept: ok, better: byDistance }
}

/**
 * plan(t): Promise of a route for blend t (0 = the mode's own settings, 1 = the safest settings), or throws.
 * Binary search over t: if a route meets the goal, try something closer to the mode's own settings; if not,
 * play safer. Returns the best accepted route; if none is accepted, the lowest-risk route tried.
 */
export async function searchBlend(plan, { accept, better, steps = 3, seeds = [] }) {
  const tried = seeds.filter((r) => r && !r.error)
  let lo = 0, hi = 1
  for (let i = 0; i < steps; i++) {
    const t = (lo + hi) / 2
    let r
    try { r = await plan(t) } catch { r = null }
    if (!r) { lo = t; continue }
    r.blend = t
    tried.push(r)
    if (accept(r)) hi = t
    else lo = t
  }
  const ok = tried.filter(accept).sort(better)
  const best = ok[0] ?? tried.slice().sort((a, b) => a.risk - b.risk || a.distanceKm - b.distanceKm)[0] ?? null
  return { best, accepted: !!ok[0], tried: tried.length }
}

/** True when the plain route already meets the mode's goal and refining it cannot make it shorter. */
export function needsRefining(mode, plain, others = {}) {
  if (!plain) return false
  const g = goalFor(mode, [plain])
  if (mode === 'safest') {
    // only worth searching if the safest route is clearly longer than the fastest one
    const f = others.fastest
    return !f || plain.distanceKm > f.distanceKm * 1.05
  }
  return !g.accept(plain)
}
