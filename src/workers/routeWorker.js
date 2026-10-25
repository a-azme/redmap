// Runs the route planner off the main thread, so the page stays responsive while A* and the hazard layers are computed.
// The main thread loads the NASA tiles and sends their pixels once per trip; every plan after that sends only the settings.
import { createWorkerHandler } from './routeWorkerCore.js'
import sciencePOIs from '../data/sciencePOIs.json'

const handle = createWorkerHandler(sciencePOIs)
self.onmessage = async ({ data }) => { self.postMessage(await handle(data)) }
