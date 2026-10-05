import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Plus, Minus } from 'lucide-react'
import { TILE_LAYERS, ROVERS } from '../../services/layerService'

window.CESIUM_BASE_URL = '/cesium/'

const MARS = Cesium.Ellipsoid.MARS
Cesium.Ellipsoid.default = MARS

const toLon = (lon) => (lon > 180 ? lon - 360 : lon)
const at = (lon, lat, h = 0) => Cesium.Cartesian3.fromDegrees(toLon(lon), lat, h, MARS)

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

// Kon zoom + kon extension (jpg/png) e tile ache ta khuje ber kore
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
  p.errorEvent.addEventListener((e) => {
    e.retry = false
  })
  return p
}

// Grayscale THEMIS ke false-color kore (neel = thanda, holud = gorom)
const RAMP = [
  [25, 35, 130], [70, 50, 180], [180, 50, 140],
  [240, 100, 50], [255, 200, 70], [255, 248, 200],
]
function rampColor(t) {
  const p = Math.min(1, Math.max(0, t)) * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(p))
  const u = p - i
  const a = RAMP[i]
  const b = RAMP[i + 1]
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}
function colorizeImage(img) {
  const w = img.width
  const h = img.height
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < d.data.length; i += 4) {
    const v = d.data[i]
    if (v < 8) {
      d.data[i + 3] = 0 // no-data
      continue
    }
    const [r, g, b] = rampColor(v / 255)
    d.data[i] = r
    d.data[i + 1] = g
    d.data[i + 2] = b
    d.data[i + 3] = 255
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export default function MarsGlobe({ locations, focus, onSelect, layer }) {
  const elRef = useRef(null)
  const viewerRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const locRef = useRef(locations)
  onSelectRef.current = onSelect
  locRef.current = locations

  const [status, setStatus] = useState('loading')
  const [used, setUsed] = useState('')
  const showCard = layer !== undefined
  const key = layer || 'terrain'
  const cfg = TILE_LAYERS[key] || TILE_LAYERS.terrain

  // Globe ekbar toiri
  useEffect(() => {
    const viewer = new Cesium.Viewer(elRef.current, {
      baseLayer: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyBox: false,
      skyAtmosphere: false,
    })
    const scene = viewer.scene
    scene.backgroundColor = Cesium.Color.fromCssColorString('#07090d')
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#2a1208')
    scene.globe.showGroundAtmosphere = false
    scene.globe.enableLighting = false
    if (scene.sun) scene.sun.show = false
    if (scene.moon) scene.moon.show = false

    const ctrl = scene.screenSpaceCameraController
    ctrl.minimumZoomDistance = 500
    ctrl.maximumZoomDistance = 4e7

    viewer.camera.setView({ destination: at(77, 18, 1.2e7) })

    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
    handler.setInputAction((e) => {
      const picked = scene.pick(e.position)
      const id = picked && picked.id && picked.id.id
      if (typeof id === 'string' && id.startsWith('loc-')) {
        const loc = locRef.current.find((l) => 'loc-' + l.id === id)
        if (loc) onSelectRef.current?.(loc)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    viewerRef.current = viewer
    return () => {
      handler.destroy()
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  // Layer change hole NASA tile change
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    let cancelled = false
    setStatus('loading')
    setUsed('')

    ;(async () => {
      // Source gulo ekta ekta kore try
      let chosen = null
      let ext = null
      for (const s of cfg.sources) {
        ext = await findExt(s.url, [1], 77.5, 18.4)
        if (cancelled || viewer.isDestroyed()) return
        if (ext) {
          chosen = s
          break
        }
      }
      if (!chosen) {
        console.warn('[RedMap] No working tile source for layer:', key)
        viewer.imageryLayers.removeAll()
        setStatus('error')
        return
      }
      setUsed(chosen.name)

      const base = makeProvider(chosen.url, ext, { maximumLevel: chosen.maxNativeZoom })
      const orig = base.requestImage.bind(base)
      base.requestImage = (x, y, level, request) => {
        let p = orig(x, y, level, request)
        if (p && p.then && chosen.colorize) p = p.then(colorizeImage)
        if (p && p.then) {
          p.then(() => {
            if (!cancelled) setStatus('ok')
          }, () => {})
        }
        return p
      }

      viewer.imageryLayers.removeAll()
      viewer.imageryLayers.addImageryProvider(base)

      // Jezero er sharp overlay (CTX, HiRISE)
      for (const o of cfg.overlays || []) {
        const [w, s, e, n] = o.rect
        const oext = await findExt(o.url, [8, 6], (w + e) / 2, (s + n) / 2)
        if (cancelled || viewer.isDestroyed()) return
        if (!oext) continue
        viewer.imageryLayers.addImageryProvider(
          makeProvider(o.url, oext, {
            maximumLevel: o.maxNativeZoom,
            rectangle: Cesium.Rectangle.fromDegrees(w, s, e, n),
          })
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Location + rover marker
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.entities.removeAll()
    const tracked = []

    const add = (id, name, lon, lat, color, dy = 0) => {
      const position = at(lon, lat)
      const ent = viewer.entities.add({
        id,
        position,
        point: {
          pixelSize: 11,
          color: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: name,
          font: '13px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(14, dy),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
      tracked.push({ ent, position })
    }

    locations.forEach((l) => add('loc-' + l.id, l.name, l.lon, l.lat, l.color))
    if (key === 'missions') {
      ROVERS.forEach((r) => add('rover-' + r.id, r.name, r.lon, r.lat, '#38bdf8', 16))
    }

    // Globe er opor pashe thaka marker lukiye rakhi
    const occluder = new Cesium.EllipsoidalOccluder(MARS, viewer.camera.positionWC)
    const onPreRender = () => {
      occluder.cameraPosition = viewer.camera.positionWC
      tracked.forEach(({ ent, position }) => {
        ent.show = occluder.isPointVisible(position)
      })
    }
    viewer.scene.preRender.addEventListener(onPreRender)

    return () => {
      if (!viewer.isDestroyed()) viewer.scene.preRender.removeEventListener(onPreRender)
    }
  }, [locations, key])

  // Location e zoom
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !focus) return
    viewer.camera.flyTo({ destination: at(focus.lon, focus.lat, 150000), duration: 1.6 })
  }, [focus])

  const zoom = (dir) => {
    const cam = viewerRef.current?.camera
    if (!cam) return
    const h = cam.positionCartographic.height
    dir > 0 ? cam.zoomIn(h * 0.5) : cam.zoomOut(h * 0.7)
  }

  const msg = {
    loading: 'Checking NASA tile sources...',
    ok: 'NASA Mars Trek data',
    error: 'No tile source worked for this layer. Open F12 → Console and look for the [RedMap] lines.',
  }[status]

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md hover:bg-white/10'

  return (
    <div className="relative isolate h-full w-full">
      <div ref={elRef} className="h-full w-full" />

      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2 xl:left-[330px] xl:right-auto xl:top-[110px]">
        <button className={btn} onClick={() => zoom(1)}><Plus size={18} /></button>
        <button className={btn} onClick={() => zoom(-1)}><Minus size={18} /></button>
      </div>

      {showCard && (
        <div className="absolute bottom-[136px] left-2 right-2 z-10 rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-md sm:right-auto sm:w-[330px] xl:bottom-[132px] xl:left-[330px] xl:p-4">
          <div className="text-sm font-semibold">{cfg.title}</div>
          <div className="mt-1 hidden text-xs text-gray-400 sm:block">{cfg.note}</div>
          {used && <div className="mt-2 text-xs text-gray-300">Source: {used}</div>}
                    {cfg.legend && (
            <div className="mt-3">
              <div className="h-3 rounded-full" style={{ background: cfg.legend.bar }} />
              <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                {cfg.legend.labels.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )}
          <div
            className={`mt-2 border-t border-white/10 pt-2 text-xs ${
              status === 'error' ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            {msg}
          </div>
        </div>
      )}
    </div>
  )
}