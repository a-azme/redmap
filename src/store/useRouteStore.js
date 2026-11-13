import { create } from 'zustand'
import locations from '../data/locations.json'
import pois from '../data/sciencePOIs.json'
import { getTerrainGrid } from '../services/elevationService'
import { findPath } from '../lib/pathfinding'
import { analyzeRoute } from '../lib/routeCost'
import { wrapLon } from '../lib/geo'
import { ROUTE_MODES, GRID_W, GRID_H, POI_NEAR_KM, MAX_SPAN_DEG } from '../constants/config'

export const useRouteStore = create((set, get) => ({
  startId: 'nili',
  destId: 'jezero',
  mode: 'fastest',
  result: null,
  error: null,

  setStartId: (startId) => set({ startId }),
  setDestId: (destId) => set({ destId }),
  setMode: (mode) => {
    set({ mode })
    get().planRoute()
  },

  planRoute: () => {
    const { startId, destId, mode } = get()
    if (startId === destId) {
      set({ result: null, error: 'Start ar Destination alada hote hobe.' })
      return
    }
    const s = locations.find((l) => l.id === startId)
    const d = locations.find((l) => l.id === destId)

    const dLon = wrapLon(d.lon - s.lon)
    const lonMid = s.lon + dLon / 2
    const latMid = (s.lat + d.lat) / 2
    const w = Math.max(Math.abs(dLon) * 2.2, Math.abs(d.lat - s.lat) * 2.2 * (GRID_W / GRID_H), 4)
    if (w > MAX_SPAN_DEG) {
      set({
        result: null,
        error: 'Ei duita location onek dur. Kachakachi duita location select koro (jemon Nili Fossae, Jezero, Isidis).',
      })
      return
    }
    const h = (w * GRID_H) / GRID_W
    const bounds = {
      lonMin: lonMid - w / 2,
      lonMax: lonMid + w / 2,
      latMin: latMid - h / 2,
      latMax: latMid + h / 2,
    }

    const grid = getTerrainGrid(bounds, GRID_W, GRID_H)

    const toCell = (lat, lon) => {
      const lonU = lonMid + wrapLon(lon - lonMid)
      return {
        x: Math.round(((lonU - bounds.lonMin) / w) * (GRID_W - 1)),
        y: Math.round(((bounds.latMax - lat) / h) * (GRID_H - 1)),
      }
    }
    const inGrid = (c) => c.x >= 0 && c.x < GRID_W && c.y >= 0 && c.y < GRID_H

    const a = toCell(s.lat, s.lon)
    const b = toCell(d.lat, d.lon)
    const poiCells = pois
      .map((p) => ({ ...p, ...toCell(p.lat, p.lon) }))
      .filter(inGrid)

    const cfg = ROUTE_MODES[mode]
    let bonus = null
    let minMult = 1
    if (cfg.sciBonus) {
      minMult = 1 - cfg.sciBonus
      bonus = new Float32Array(GRID_W * GRID_H).fill(1)
      const r = cfg.sciRadiusKm
      for (const p of poiCells) {
        for (let y = 0; y < GRID_H; y++) {
          for (let x = 0; x < GRID_W; x++) {
            const km = Math.hypot((x - p.x) * grid.dx, (y - p.y) * grid.dy)
            if (km > r * 3) continue
            const m = 1 - cfg.sciBonus * Math.exp(-(km * km) / (r * r))
            const i = y * GRID_W + x
            if (m < bonus[i]) bonus[i] = m
          }
        }
      }
    }

    const path = findPath(grid, a, b, {
      maxSlope: cfg.maxSlope,
      slopeWeight: cfg.slopeWeight,
      bonus,
      minMult,
    })
    if (!path) {
      set({ result: null, error: 'Ei mode e route pawa jay nai (slope onek beshi). Onno mode try koro.' })
      return
    }

    const analysis = analyzeRoute(grid, path)

    const nearPois = poiCells
      .map((p) => {
        let best = Infinity
        for (const q of path) {
          const km = Math.hypot((p.x - q.x) * grid.dx, (p.y - q.y) * grid.dy)
          if (km < best) best = km
        }
        return { ...p, distKm: best }
      })
      .filter((p) => p.distKm <= POI_NEAR_KM)
      .sort((x, y) => x.distKm - y.distKm)

    set({
      error: null,
      result: {
        grid, path, analysis, mode,
        start: a, dest: b,
        startLoc: s, destLoc: d,
        pois: poiCells, nearPois,
      },
    })
  },
}))