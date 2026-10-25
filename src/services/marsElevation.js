// Real Mars elevation for the route planner, sampled from NASA Mars Trek's
// MGS MOLA DEM tiles (the same WMTS server the map layers use).
//
// Tiles are 8-bit images, so we do not trust any assumed grey-to-metres scale.
// Instead we sample the tiles at well-known landing-site / landform heights,
// fit  elevation = a * grey + b,  and only use the data if the fit is good.
// If the tiles cannot be loaded or the fit fails, callers fall back to the
// simulated planner and the UI says so.

const TREK = 'https://trek.nasa.gov/tiles/Mars/EQ'
const DEFAULT_PRODUCT = 'Mars_MGS_MOLA_DEM_mosaic_global_463m_8'

// Override the tile template without touching code: VITE_MARS_DEM_URL in .env
// e.g. https://trek.nasa.gov/tiles/Mars/EQ/<product>/1.0.0/default/default028mm/{z}/{y}/{x}.{ext}
// A finer product can be swapped in the same way: set VITE_MARS_DEM_URL, VITE_MARS_DEM_MAXZOOM (deepest zoom
// the product has) and VITE_MARS_DEM_NAME. The grey-to-metres scale is re-fitted against known heights, and
// the data is rejected (and the simulated planner used) if it does not match.
const ENV = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {}
const ENV_URL = ENV.VITE_MARS_DEM_URL
export const DEM_SOURCE = {
  name: ENV.VITE_MARS_DEM_NAME || (ENV_URL ? 'NASA Mars Trek elevation (custom product)' : 'NASA MGS MOLA elevation (Mars Trek, 463 m)'),
  url: ENV_URL || `${TREK}/${DEFAULT_PRODUCT}/1.0.0/default/default028mm/{z}/{y}/{x}.{ext}`,
  maxZoom: Math.min(10, Math.max(1, Number(ENV.VITE_MARS_DEM_MAXZOOM) || 6)),
}

// Km per degree at the Mars surface, and the size of one tile pixel at zoom 0 (km)
const KM_PER_DEG = (3389.5 * Math.PI) / 180
const PIXEL_KM_Z0 = (180 / 256) * KM_PER_DEG
const MAX_TILES = 48

// Reference heights above the MOLA datum (km). lon is degrees east.
export const ANCHORS = [
  { name: 'Hellas Planitia floor', lat: -42.4, lon: 70.5, km: -8.2 },
  { name: 'Olympus Mons summit', lat: 18.65, lon: 226.2, km: 21.2 },
  { name: 'Jezero Crater / Perseverance', lat: 18.44, lon: 77.45, km: -2.6 },
  { name: 'Gale Crater / Curiosity', lat: -4.59, lon: 137.44, km: -4.4 },
  { name: 'Meridiani / Opportunity', lat: -1.95, lon: 354.47, km: -1.4 },
  { name: 'Gusev / Spirit', lat: -14.57, lon: 175.47, km: -1.9 },
  { name: 'Elysium Planitia / InSight', lat: 4.5, lon: 135.6, km: -2.6 },
  { name: 'Chryse / Viking 1', lat: 22.27, lon: 312.05, km: -3.6 },
  { name: 'Utopia / Viking 2', lat: 47.67, lon: 225.71, km: -4.5 },
  { name: 'Ares Vallis / Pathfinder', lat: 19.13, lon: 326.78, km: -2.7 },
  { name: 'Vastitas Borealis / Phoenix', lat: 68.22, lon: 234.3, km: -4.1 },
  { name: 'Isidis Planitia', lat: 12.9, lon: 87.0, km: -3.8 },
]
const CAL_ZOOM = 4
const CAL_MIN_R2 = 0.85
const CAL_MAX_RMSE_KM = 1.5

const wrapLon180 = (l) => ((((l + 180) % 360) + 360) % 360) - 180
const fill = (tpl, ext, z, x, y) =>
  tpl.replace('{ext}', ext).replace('{z}', z).replace('{y}', y).replace('{x}', x)

/** Browser tile loader: resolves { gray, alpha, colorful } or null when the tile is missing. */
export function browserTileLoader(template) {
  const loadImg = (url) =>
    new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    })
  return async (z, x, y) => {
    for (const ext of ['png', 'jpg']) {
      const img = await loadImg(fill(template, ext, z, x, y))
      if (!img) continue
      const c = document.createElement('canvas')
      c.width = 256; c.height = 256
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, 256, 256)
      const d = ctx.getImageData(0, 0, 256, 256).data
      const gray = new Uint8Array(65536), alpha = new Uint8Array(65536)
      let chroma = 0
      for (let i = 0; i < 65536; i++) {
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
        gray[i] = r; alpha[i] = d[i * 4 + 3]
        chroma += Math.abs(r - g) + Math.abs(g - b)
      }
      return { gray, alpha, colorful: chroma / 65536 > 6 }
    }
    return null
  }
}

class Mosaic {
  constructor(z, loadTile) {
    this.z = z
    this.loadTile = loadTile
    this.tiles = new Map()
    this.cols = 2 ** (z + 1)
    this.rows = 2 ** z
  }
  key(x, y) { return `${x}/${y}` }
  tileFor(lat, lon) {
    const px = ((wrapLon180(lon) + 180) / 360) * this.cols * 256
    const py = ((90 - lat) / 180) * this.rows * 256
    return { x: Math.min(this.cols - 1, Math.floor(px / 256)), y: Math.min(this.rows - 1, Math.max(0, Math.floor(py / 256))) }
  }
  async ensure(list) {
    const todo = list.filter((t) => !this.tiles.has(this.key(t.x, t.y)))
    await Promise.all(todo.map(async (t) => {
      this.tiles.set(this.key(t.x, t.y), (await this.loadTile(this.z, t.x, t.y)) || null)
    }))
  }
  px(ix, iy) {
    const x = ((ix % (this.cols * 256)) + this.cols * 256) % (this.cols * 256)
    const y = Math.min(this.rows * 256 - 1, Math.max(0, iy))
    const t = this.tiles.get(this.key(Math.floor(x / 256), Math.floor(y / 256)))
    if (!t) return NaN
    const i = (y % 256) * 256 + (x % 256)
    return t.alpha[i] < 128 ? NaN : t.gray[i]
  }
  /** Bilinear grey value (0-255) at lat/lon, NaN where there is no data. */
  gray(lat, lon) {
    const fx = ((wrapLon180(lon) + 180) / 360) * this.cols * 256 - 0.5
    const fy = ((90 - lat) / 180) * this.rows * 256 - 0.5
    const x0 = Math.floor(fx), y0 = Math.floor(fy)
    const u = fx - x0, v = fy - y0
    const a = this.px(x0, y0), b = this.px(x0 + 1, y0), c = this.px(x0, y0 + 1), d = this.px(x0 + 1, y0 + 1)
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
  }
  anyColorful() {
    for (const t of this.tiles.values()) if (t?.colorful) return true
    return false
  }
}

function fitLine(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let sxx = 0, sxy = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2
  }
  const a = sxy / sxx
  const b = my - a * mx
  let sse = 0
  for (let i = 0; i < n; i++) sse += (ys[i] - (a * xs[i] + b)) ** 2
  return { a, b, r2: syy ? 1 - sse / syy : 0, rmse: Math.sqrt(sse / n) }
}

export function createMarsTerrain({ loadTile: rawLoadTile, anchors = ANCHORS, source = DEM_SOURCE } = {}) {
  // remember tiles (and in-flight requests) so planning several routes loads each tile only once
  const tileCache = new Map()
  const loadTile = (z, x, y) => {
    const k = `${z}/${x}/${y}`
    if (!tileCache.has(k)) {
      tileCache.set(k, Promise.resolve(rawLoadTile(z, x, y)).then((t) => { if (!t) tileCache.delete(k); return t }, (e) => { tileCache.delete(k); throw e }))
    }
    return tileCache.get(k)
  }
  let calibration = null // cached { ok, a, b, r2, rmse, reason, at }
  let zoomCap = source.maxZoom // the deepest zoom that really has tiles; lowered if the server turns out to have fewer levels

  async function calibrate() {
    if (calibration && (calibration.ok || Date.now() - calibration.at < 60_000)) return calibration
    const fail = (reason) => (calibration = { ok: false, reason, at: Date.now() })
    const m = new Mosaic(CAL_ZOOM, loadTile)
    await m.ensure(anchors.map((p) => m.tileFor(p.lat, p.lon)))
    if (m.anyColorful()) return fail('DEM tiles are colour images, not grey-scale elevation')
    const xs = [], ys = []
    for (const p of anchors) {
      const g = m.gray(p.lat, p.lon)
      if (Number.isFinite(g)) { xs.push(g); ys.push(p.km) }
    }
    if (xs.length < 6) return fail(`only ${xs.length} reference sites could be sampled`)
    const f = fitLine(xs, ys)
    if (!(f.a > 0) || f.r2 < CAL_MIN_R2 || f.rmse > CAL_MAX_RMSE_KM) {
      return fail(`DEM did not match known site heights (R²=${f.r2.toFixed(2)}, RMSE=${f.rmse.toFixed(2)} km)`)
    }
    console.info(`[RedMap] MOLA DEM calibrated: elev = ${f.a.toFixed(4)}*grey + ${f.b.toFixed(2)} km (R²=${f.r2.toFixed(3)}, RMSE=${f.rmse.toFixed(2)} km, ${xs.length} sites)`)
    return (calibration = { ok: true, ...f, at: Date.now() })
  }

  /** Called by the route planner with { bounds, cellKm }. Throws if real data is unavailable. */
  async function prepareTerrain({ bounds, cellKm }) {
    const cal = await calibrate()
    if (!cal.ok) throw new Error(cal.reason)

    // coarsest zoom whose pixels are no bigger than a grid cell, capped at the deepest zoom the server really has
    let z = Math.min(zoomCap, Math.max(0, Math.ceil(Math.log2(PIXEL_KM_Z0 / cellKm))))
    let mosaic, list
    for (;;) {
      mosaic = new Mosaic(z, loadTile)
      for (;;) {
        const seen = new Map()
        const step = 180 / mosaic.rows / 2 // half a tile in degrees
        for (let lat = bounds.latMin; lat <= bounds.latMax + step; lat += step) {
          for (let lon = bounds.lonMin; lon <= bounds.lonMax + step; lon += step) {
            const t = mosaic.tileFor(Math.min(bounds.latMax, lat), Math.min(bounds.lonMax, lon))
            seen.set(mosaic.key(t.x, t.y), t)
          }
        }
        list = [...seen.values()]
        if (list.length <= MAX_TILES || z === 0) break
        z--
        mosaic = new Mosaic(z, loadTile)
      }
      await mosaic.ensure(list)
      const missing = list.filter((t) => !mosaic.tiles.get(mosaic.key(t.x, t.y))).length
      if (missing / list.length <= 0.2) break
      if (z === 0) throw new Error(`${missing} of ${list.length} elevation tiles failed to load`)
      // this zoom level is probably not served: remember that and try the next one up
      console.info(`[RedMap] elevation zoom ${z} has no tiles (${missing} of ${list.length} missing), trying zoom ${z - 1}`)
      zoomCap = z - 1
      z--
    }

    return {
      heightAt: (lat, lon) => cal.a * mosaic.gray(lat, lon) + cal.b,
      source: {
        real: true,
        name: source.name,
        zoom: z,
        calibration: { r2: +cal.r2.toFixed(3), rmseKm: +cal.rmse.toFixed(2) },
      },
    }
  }

  return { prepareTerrain, calibrate }
}

export const marsTerrain = createMarsTerrain({ loadTile: browserTileLoader(DEM_SOURCE.url) })
