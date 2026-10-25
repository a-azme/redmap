// Runs the route planner off the main thread, so the page stays responsive while A* and the hazard layers are computed.
// Messages:  page -> worker  { id, start, end, settings }            plan a route
//            worker -> page  { type: 'plan', id, route | error }      its result
//            worker -> page  { type: 'need-terrain', reqId, spec }    "load the NASA tiles for this grid"
//            page -> worker  { type: 'terrain', reqId, snapshot, source | error }
import { createWorkerHandler } from './routeWorkerCore.js'
import sciencePOIs from '../data/sciencePOIs.json'

const pending = new Map()
let nextReq = 1
const requestTerrain = (spec) => new Promise((resolve, reject) => {
  const reqId = nextReq++
  pending.set(reqId, { resolve, reject })
  self.postMessage({ type: 'need-terrain', reqId, spec })
})

const handle = createWorkerHandler({ pois: sciencePOIs, requestTerrain })

self.onmessage = async ({ data }) => {
  if (data.type === 'terrain') {
    const p = pending.get(data.reqId)
    pending.delete(data.reqId)
    if (p) (data.error ? p.reject(new Error(data.error)) : p.resolve(data))
    return
  }
  self.postMessage({ type: 'plan', ...(await handle(data)) })
}
