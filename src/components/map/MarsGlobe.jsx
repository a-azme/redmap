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

export default function MarsGlobe({ locations, focus, onSelect, layer }) {
  const elRef = useRef(null)
  const viewerRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const locRef = useRef(locations)
  onSelectRef.current = onSelect
  locRef.current = locations

  const [status, setStatus] = useState('loading')
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
    ctrl.minimumZoomDistance = 3000
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
    const src = cfg.url ? cfg : TILE_LAYERS.terrain
    setStatus(cfg.url ? 'loading' : 'pending')

    let good = 0
    let bad = 0
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: src.url,
      tilingScheme: new Cesium.GeographicTilingScheme({ ellipsoid: MARS }),
      tileWidth: 256,
      tileHeight: 256,
      maximumLevel: src.maxNativeZoom,
      credit: 'NASA/JPL Trek, USGS, MGS MOLA',
    })
    provider.errorEvent.addEventListener((e) => {
      e.retry = false
    })

    // Kon tile sotti load holo ta gunbo
    const orig = provider.requestImage.bind(provider)
    provider.requestImage = (x, y, level, request) => {
      const p = orig(x, y, level, request)
      if (p && p.then && cfg.url) {
        p.then(
          () => {
            good++
            setStatus('ok')
          },
          () => {
            bad++
            if (good === 0 && bad >= 4) setStatus('error')
          }
        )
      }
      return p
    }

    viewer.imageryLayers.removeAll()
    viewer.imageryLayers.addImageryProvider(provider)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Location + rover marker
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.entities.removeAll()

    const add = (id, name, lon, lat, color, dy = 0) =>
      viewer.entities.add({
        id,
        position: at(lon, lat),
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

    locations.forEach((l) => add('loc-' + l.id, l.name, l.lon, l.lat, l.color))
    if (key === 'missions') {
      // Rover label ektu niche, jate Jezero label er sathe na mishe
      ROVERS.forEach((r) => add('rover-' + r.id, r.name, r.lon, r.lat, '#38bdf8', 16))
    }
  }, [locations, key])

  // Location e zoom
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !focus) return
    viewer.camera.flyTo({ destination: at(focus.lon, focus.lat, 600000), duration: 1.6 })
  }, [focus])

  const zoom = (dir) => {
    const cam = viewerRef.current?.camera
    if (!cam) return
    const h = cam.positionCartographic.height
    dir > 0 ? cam.zoomIn(h * 0.5) : cam.zoomOut(h * 0.7)
  }

  const msg = {
    loading: 'Loading NASA tiles...',
    ok: 'NASA Mars Trek data',
    pending: 'Source not set yet. Showing terrain instead.',
    error: 'Tiles failed to load. The product name in services/layerService.js is probably wrong.',
  }[status]

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md hover:bg-white/10'

  return (
    <div className="relative isolate h-full w-full">
      <div ref={elRef} className="h-full w-full" />

      <div className="absolute left-[330px] top-[110px] z-10 flex flex-col gap-2">
        <button className={btn} onClick={() => zoom(1)}><Plus size={18} /></button>
        <button className={btn} onClick={() => zoom(-1)}><Minus size={18} /></button>
      </div>

      {showCard && (
        <div className="absolute bottom-[132px] left-[330px] z-10 w-[330px] rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md">
          <div className="text-sm font-semibold">{cfg.title}</div>
          <div className="mt-1 text-xs text-gray-400">{cfg.note}</div>
          <div className="mt-2 text-xs text-gray-300">Source: {cfg.source}</div>
          <div
            className={`mt-2 border-t border-white/10 pt-2 text-xs ${
              status === 'error' ? 'text-red-400' : status === 'pending' ? 'text-amber-400' : 'text-gray-400'
            }`}
          >
            {msg}
          </div>
        </div>
      )}
    </div>
  )
}