// The message handling of the planning worker, kept free of `self` and JSON imports so tests can run it in node.
// The worker cannot download tiles itself (they are decoded with the page's canvas), so it asks the page for the
// terrain of each grid it needs: requestTerrain(spec) -> { snapshot, source }.
import { planRealRoute, planRealRouteHopped, RouteError } from '../lib/realRoute.js'
import { heightFromSnapshot } from '../services/marsElevation.js'

export function createWorkerHandler({ pois = [], requestTerrain }) {
  // one stable function for every trip, so planRealRoute's per-trip cache of grids and hazard layers keeps working
  const prepareTerrain = async (spec) => {
    const { snapshot, source } = await requestTerrain(spec)
    return { heightAt: heightFromSnapshot(snapshot), source }
  }
  return async function handle({ id, start, end, settings }) {
    try {
      const plan = settings.hops ? planRealRouteHopped : planRealRoute
      const route = await plan(start, end, settings, { prepareTerrain, pois })
      return { id, route }
    } catch (e) {
      return { id, error: { message: e.message, code: e instanceof RouteError ? e.code : undefined } }
    }
  }
}
