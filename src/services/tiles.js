import * as Cesium from 'cesium'

export const MARS = Cesium.Ellipsoid.MARS
Cesium.Ellipsoid.default = MARS

export const toLon = (lon) => (lon > 180 ? lon - 360 : lon)
export const at = (lon, lat, h = 0) => Cesium.Cartesian3.fromDegrees(toLon(lon), lat, h, MARS)

const tileXY = (lon, lat, z) => ({
  x: Math.floor(((lon + 180) / 360) * 2 ** (z + 1)),
  y: Math.floor(((90 - lat) / 180) * 2 ** z),
})
const fill = (tpl, ext, z, x, y) =>
  tpl.replace('{ext}', ext).replace('{z}', z).replace('{y}', y).replace('{x}', x)

const probe = (url) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })

async function findExt(tpl, zooms, lon, lat) {
  for (const z of zooms) {
    const { x, y } = tileXY(lon, lat, z)
    for (const ext of ['jpg', 'png']) {
      const url = fill(tpl, ext, z, x, y)
      const ok = await probe(url)
      console.info('[RedMap]', ok ? 'OK  ' : '404 ', url)
      if (ok) return ext
    }
  }
  return null
}

const makeProvider = (tpl, ext, opts) => {
  const p = new Cesium.UrlTemplateImageryProvider({
    url: tpl.replace('{ext}', ext),
    tilingScheme: new Cesium.GeographicTilingScheme({ ellipsoid: MARS }),
    tileWidth: 256,
    tileHeight: 256,
    credit: 'NASA/JPL Trek, USGS',
    ...opts,
  })
  p.errorEvent.addEventListener((e) => { e.retry = false })
  return p
}

const RAMP = [[25, 35, 130], [70, 50, 180], [180, 50, 140], [240, 100, 50], [255, 200, 70], [255, 248, 200]]
function rampColor(t) {
  const p = Math.min(1, Math.max(0, t)) * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(p))
  const u = p - i
  const a = RAMP[i], b = RAMP[i + 1]
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}
function colorizeImage(img) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height)
  for (let i = 0; i < d.data.length; i += 4) {
    const v = d.data[i]
    if (v < 8) { d.data[i + 3] = 0; continue }
    const [r, g, b] = rampColor(v / 255)
    d.data[i] = r; d.data[i + 1] = g; d.data[i + 2] = b; d.data[i + 3] = 255
  }
  ctx.putImageData(d, 0, 0)
  return c
}

/**
 * Finds a working NASA tile source for a layer config and puts it on the viewer.
 * cb = { cancelled: () => bool, onStatus: (s) => void, onSource: (name) => void }
 */
export async function applyLayer(viewer, cfg, key, cb) {
  let chosen = null
  let ext = null
  for (const s of cfg.sources) {
    ext = await findExt(s.url, [1], 77.5, 18.4)
    if (cb.cancelled() || viewer.isDestroyed()) return
    if (ext) { chosen = s; break }
  }
  if (!chosen) {
    console.warn('[RedMap] No working tile source for layer:', key)
    viewer.imageryLayers.removeAll()
    cb.onStatus('error')
    return
  }
  cb.onSource(chosen.name)

  const base = makeProvider(chosen.url, ext, { maximumLevel: chosen.maxNativeZoom })
  const orig = base.requestImage.bind(base)
  base.requestImage = (x, y, level, request) => {
    let p = orig(x, y, level, request)
    if (p && p.then && chosen.colorize) p = p.then(colorizeImage)
    if (p && p.then) p.then(() => { if (!cb.cancelled()) cb.onStatus('ok') }, () => {})
    return p
  }
  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.addImageryProvider(base)

  for (const o of cfg.overlays || []) {
    const [w, s, e, n] = o.rect
    const oext = await findExt(o.url, [8, 6], (w + e) / 2, (s + n) / 2)
    if (cb.cancelled() || viewer.isDestroyed()) return
    if (!oext) continue
    viewer.imageryLayers.addImageryProvider(
      makeProvider(o.url, oext, {
        maximumLevel: o.maxNativeZoom,
        rectangle: Cesium.Rectangle.fromDegrees(w, s, e, n),
      })
    )
  }
}