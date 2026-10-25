// The message handling of the planning worker, kept free of `self` and JSON imports so tests can run it in node.
import { planRealRoute, RouteError } from '../lib/realRoute.js'
import { heightFromSnapshot } from '../services/marsElevation.js'

export function createWorkerHandler(pois = []) {
  const trips = new Map() // tripKey -> prepareTerrain function (a stable identity keeps planRealRoute's per-trip cache working)
  return async function handle({ id, start, end, settings, tripKey, snapshot, source }) {
    try {
      if (snapshot) {
        const terrain = { heightAt: heightFromSnapshot(snapshot), source }
        trips.set(tripKey, async () => terrain)
        if (trips.size > 4) trips.delete(trips.keys().next().value)
      }
      const prepareTerrain = trips.get(tripKey)
      if (!prepareTerrain) return { id, error: { message: 'terrain not loaded in worker', code: 'need_terrain' } }
      const route = await planRealRoute(start, end, settings, { prepareTerrain, pois })
      return { id, route }
    } catch (e) {
      return { id, error: { message: e.message, code: e instanceof RouteError ? e.code : undefined } }
    }
  }
}
