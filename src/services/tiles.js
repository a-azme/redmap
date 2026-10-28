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

const EXT_CACHE = new Map()

export async function findExt(tpl, zooms, lon, lat) {
  const cacheKey = `${tpl}|${zooms.join(',')}|${lon}|${lat}`
  if (EXT_CACHE.has(cacheKey)) return EXT_CACHE.get(cacheKey)
  const pending = (async () => {
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
  })()
  EXT_CACHE.set(cacheKey, pending)
  return pending
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
const THERMAL_LUT = (() => {
  const lut = new Uint8Array(256 * 4)
  for (let v = 0; v < 256; v++) {
    const base = v * 4
    if (v < 8) {
      lut[base + 3] = 0
      continue
    }
    const p = (v / 255) * (RAMP.length - 1)
    const i = Math.min(RAMP.length - 2, Math.floor(p))
    const u = p - i
    const a = RAMP[i], b = RAMP[i + 1]
    lut[base] = Math.round(a[0] + (b[0] - a[0]) * u)
    lut[base + 1] = Math.round(a[1] + (b[1] - a[1]) * u)
    lut[base + 2] = Math.round(a[2] + (b[2] - a[2]) * u)
    lut[base + 3] = 255
  }
  return lut
})()

export function colorizeImage(img) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height)
  const data = d.data
  for (let i = 0; i < data.length; i += 4) {
    const lutIdx = data[i] * 4
    data[i] = THERMAL_LUT[lutIdx]
    data[i + 1] = THERMAL_LUT[lutIdx + 1]
    data[i + 2] = THERMAL_LUT[lutIdx + 2]
    data[i + 3] = THERMAL_LUT[lutIdx + 3]
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function colorizeToDataUrl(img) {
  return colorizeImage(img).toDataURL('image/png')
}

/**
 * Prevents Cesium "DeveloperError: Expected width to be greater than 0, actual value was 0"
 * when the browser window is minimized, backgrounded, or a flex/grid container transiently reports 0x0 size.
 */
export function guardCesiumViewer(viewer) {
  const widget = viewer.cesiumWidget
  const scene = viewer.scene
  const canvas = widget.canvas

  const canSafelyRender = () => {
    if (viewer.isDestroyed() || document.hidden || !canvas || !canvas.isConnected) return false
    if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return false
    const gl = scene?.context?._gl
    if (gl && (gl.isContextLost?.() || gl.drawingBufferWidth <= 0 || gl.drawingBufferHeight <= 0)) {
      return false
    }
    return true
  }

  const origResize = widget.resize.bind(widget)
  widget.resize = function () {
    if (viewer.isDestroyed() || !canvas || !canvas.isConnected) return
    if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) {
      widget._canRender = false
      return
    }
    origResize()
    const gl = scene?.context?._gl
    if (gl && (gl.drawingBufferWidth <= 0 || gl.drawingBufferHeight <= 0)) {
      widget._canRender = false
    }
  }

  const origRender = widget.render.bind(widget)
  widget.render = function () {
    if (!canSafelyRender()) return
    if (canvas.width <= 0 || canvas.height <= 0) {
      widget._forceResize = true
      widget.resize()
      if (!canSafelyRender() || canvas.width <= 0 || canvas.height <= 0) return
    }
    origRender()
  }

  const origPick = scene.pick.bind(scene)
  scene.pick = function (windowPosition, width, height) {
    if (!canSafelyRender() || canvas.width <= 0 || canvas.height <= 0) return undefined
    return origPick(windowPosition, width, height)
  }

  const handleRestore = () => {
    if (viewer.isDestroyed() || document.hidden) return
    requestAnimationFrame(() => {
      if (viewer.isDestroyed() || !canvas.isConnected) return
      if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        widget._forceResize = true
        widget.resize()
        scene.requestRender()
      }
    })
  }

  document.addEventListener('visibilitychange', handleRestore)
  window.addEventListener('focus', handleRestore)

  return () => {
    document.removeEventListener('visibilitychange', handleRestore)
    window.removeEventListener('focus', handleRestore)
  }
}

/**
 * Finds a working NASA tile source for a layer config and puts it on the viewer.
 * cb = { cancelled: () => bool, onStatus: (s) => void, onSource: (name) => void }
 */
export function applyLayer(viewer, cfg, key, cb) {
  let disposed = false
  const isCancelled = () => disposed || cb.cancelled() || viewer.isDestroyed()

  const overlayLayers = []
  const FADE_FULL = 3e5
  const FADE_ZERO = 9e5
  const fadeOverlays = () => {
    if (viewer.isDestroyed() || overlayLayers.length === 0) return
    const h = viewer.camera.positionCartographic.height
    const a = Math.min(1, Math.max(0, (FADE_ZERO - h) / (FADE_ZERO - FADE_FULL)))
    overlayLayers.forEach((l) => {
      l.alpha = a
      l.show = a > 0
    })
  }
  viewer.scene.preRender.addEventListener(fadeOverlays)

  ;(async () => {
    let mainReady = false
    if (viewer.imageryLayers.length === 0) {
      Cesium.SingleTileImageryProvider.fromUrl('/textures/mars.jpg', {
        rectangle: Cesium.Rectangle.MAX_VALUE,
        ellipsoid: MARS,
      })
        .then((lowRes) => {
          if (!isCancelled() && !mainReady && viewer.imageryLayers.length === 0) {
            viewer.imageryLayers.addImageryProvider(lowRes)
            viewer.scene.requestRender()
          }
        })
        .catch(() => {})
    }

    let chosen = null
    let ext = null
    for (const s of cfg.sources) {
      ext = await findExt(s.url, [1], 77.5, 18.4)
      if (isCancelled()) return
      if (ext) { chosen = s; break }
    }
    mainReady = true

    if (!chosen) {
      console.warn('[RedMap] No working tile source for layer:', key, '– using local texture fallback')
      try {
        const fallback = await Cesium.SingleTileImageryProvider.fromUrl('/textures/8k_mars.jpg', {
          rectangle: Cesium.Rectangle.MAX_VALUE,
          ellipsoid: MARS,
        }).catch(() =>
          Cesium.SingleTileImageryProvider.fromUrl('/textures/mars.jpg', {
            rectangle: Cesium.Rectangle.MAX_VALUE,
            ellipsoid: MARS,
          })
        )
        if (!isCancelled() && fallback) {
          viewer.imageryLayers.removeAll()
          viewer.imageryLayers.addImageryProvider(fallback)
          viewer.scene.requestRender()
          cb.onSource('Local 8K Mars Texture')
          cb.onStatus('ok')
          return
        }
      } catch {
        // ignore
      }
      if (!isCancelled()) {
        viewer.imageryLayers.removeAll()
        viewer.scene.requestRender()
        cb.onStatus('error')
      }
      return
    }
    cb.onSource(chosen.name)

    const base = makeProvider(chosen.url, ext, { maximumLevel: chosen.maxNativeZoom })
    const orig = base.requestImage.bind(base)
    base.requestImage = (x, y, level, request) => {
      let p = orig(x, y, level, request)
      if (p && p.then && chosen.colorize) p = p.then(colorizeImage)
      if (p && p.then) {
        p.then(() => {
          if (!isCancelled()) {
            cb.onStatus('ok')
            viewer.scene.requestRender()
          }
        }, () => {})
      }
      return p
    }
    viewer.imageryLayers.removeAll()
    viewer.imageryLayers.addImageryProvider(base)
    viewer.scene.requestRender()

    for (const o of cfg.overlays || []) {
      const [w, s, e, n] = o.rect
      const oext = await findExt(o.url, [8, 6], (w + e) / 2, (s + n) / 2)
      if (isCancelled()) return
      if (!oext) continue
      const layerObj = viewer.imageryLayers.addImageryProvider(
        makeProvider(o.url, oext, {
          maximumLevel: o.maxNativeZoom,
          rectangle: Cesium.Rectangle.fromDegrees(w, s, e, n),
        })
      )
      overlayLayers.push(layerObj)
      fadeOverlays()
      viewer.scene.requestRender()
    }
  })()

  return () => {
    disposed = true
    if (!viewer.isDestroyed()) {
      viewer.scene.preRender.removeEventListener(fadeOverlays)
    }
  }
}