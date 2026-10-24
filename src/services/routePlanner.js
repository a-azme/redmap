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

/**
 * Plans fastest, safest and most-scientific routes for the same trip.
 * Returns { primary, alternatives } where `primary` is the mode chosen in settings and
 * `alternatives` maps every mode to its route (or { error } if that mode has no passable route).
 */
export async function planAllModes(start, end, settings) {
  if (!start || !end || start.id === end.id) return null
  const entries = await Promise.all(
    Object.keys(MODES).map(async (mode) => {
      try {
        return [mode, await planRouteAsync(start, end, { ...settings, mode })]
      } catch (e) {
        return [mode, { error: e.message }]
      }
    }),
  )
  const alternatives = Object.fromEntries(entries)
  const primary = alternatives[settings.mode]
  if (primary?.error) throw new RouteError('blocked', primary.error)
  return { primary, alternatives }
}
