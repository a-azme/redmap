import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Plus, Minus, Crosshair, RotateCcw, X } from 'lucide-react'
import { TILE_LAYERS, ROVERS } from '../../services/layerService'
import { MARS, at, applyLayer, guardCesiumViewer } from '../../services/tiles'

window.CESIUM_BASE_URL = '/cesium/'

// Persistent singleton Cesium.Viewer so switching between Explore, Layers, and Missions
// re-parents the existing WebGL canvas instead of destroying and recreating the context.
let sharedGlobe = null

function getSharedGlobe() {
  if (sharedGlobe && !sharedGlobe.viewer.isDestroyed()) return sharedGlobe

  const container = document.createElement('div')
  container.className = 'h-full w-full'

  const viewer = new Cesium.Viewer(container, {
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
    mapProjection: new Cesium.GeographicProjection(MARS),
    mapMode2D: Cesium.MapMode2D.INFINITE_SCROLL,
  })

  // Phone / retina screen e blur na hoy: device er asol pixel density use kori
  viewer.useBrowserRecommendedResolution = false
  viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2)

  const scene = viewer.scene
  scene.backgroundColor = Cesium.Color.fromCssColorString('#07090d')
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#2a1208')
  scene.globe.showGroundAtmosphere = false
  scene.globe.enableLighting = false
  if (scene.sun) scene.sun.show = false
  if (scene.moon) scene.moon.show = false

  // Render on demand instead of continuous 60 FPS loop when idle
  scene.requestRenderMode = true
  scene.maximumRenderTimeChange = Infinity
  if ('msaaSamples' in scene) scene.msaaSamples = 1

  guardCesiumViewer(viewer)

  const ctrl = scene.screenSpaceCameraController
  ctrl.minimumZoomDistance = 500
  ctrl.maximumZoomDistance = 4e7

  viewer.camera.setView({ destination: at(77, 18, 1.2e7) })

  const state = {
    container,
    viewer,
    appliedKey: null,
    disposeLayer: null,
    status: 'loading',
    used: '',
    locations: [],
    onSelect: null,
    onLayerState: null,
  }

  const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
  handler.setInputAction((e) => {
    const picked = scene.pick(e.position)
    const id = picked && picked.id && picked.id.id
    if (typeof id === 'string' && id.startsWith('loc-')) {
      const loc = state.locations.find((l) => 'loc-' + l.id === id)
      if (loc) state.onSelect?.(loc)
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  sharedGlobe = state
  return sharedGlobe
}

export default function MarsGlobe({
  locations,
  focus,
  onSelect,
  layer,
  mode = '3D',
  onCenter,
  onReset,
  controlsClassName,
  legendClassName,
}) {
  const elRef = useRef(null)
  const viewerRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const locRef = useRef(locations)

  const showCard = layer !== undefined
  const key = layer || 'terrain'
  const cfg = TILE_LAYERS[key] || TILE_LAYERS.terrain

  const [status, setStatus] = useState(() =>
    sharedGlobe && sharedGlobe.appliedKey === key ? sharedGlobe.status : 'loading'
  )
  const [used, setUsed] = useState(() =>
    sharedGlobe && sharedGlobe.appliedKey === key ? sharedGlobe.used : ''
  )
  const [cardVisible, setCardVisible] = useState(true)

  // Keep singleton click handler synced with the currently mounted page
  useEffect(() => {
    onSelectRef.current = onSelect
    locRef.current = locations
    if (sharedGlobe) {
      sharedGlobe.locations = locations
      sharedGlobe.onSelect = onSelect
    }
  }, [locations, onSelect])

  // Show concise description card on layer change and auto-hide after 5s
  useEffect(() => {
    if (layer === undefined) return
    const showTimer = setTimeout(() => setCardVisible(true), 0)
    const hideTimer = setTimeout(() => {
      setCardVisible(false)
    }, 5000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [layer])

  // Attach persistent singleton viewer DOM node into this page's mount point
  useEffect(() => {
    const host = elRef.current
    if (!host) return
    const shared = getSharedGlobe()
    shared.locations = locRef.current
    shared.onSelect = (loc) => onSelectRef.current?.(loc)

    host.appendChild(shared.container)
    viewerRef.current = shared.viewer
    if (host.clientWidth > 0 && host.clientHeight > 0) {
      shared.viewer.resize()
      shared.viewer.scene.requestRender()
    }

    const ro = new ResizeObserver(() => {
      if (!shared.viewer.isDestroyed() && host.clientWidth > 0 && host.clientHeight > 0) {
        shared.viewer.resize()
        shared.viewer.scene.requestRender()
      }
    })
    ro.observe(host)

    return () => {
      ro.disconnect()
      if (shared.container.parentNode === host) {
        host.removeChild(shared.container)
      }
      viewerRef.current = null
    }
  }, [])

  // Switch between 3D Globe and 2D Map View
  useEffect(() => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer || viewer.isDestroyed()) return
    const scene = viewer.scene
    const want = mode === '2D' ? Cesium.SceneMode.SCENE2D : Cesium.SceneMode.SCENE3D
    if (scene.mode === want) return
    const onMorphComplete = () => {
      scene.morphComplete.removeEventListener(onMorphComplete)
      if (focus) {
        viewer.camera.flyTo({
          destination: at(focus.lon, focus.lat, mode === '2D' ? 6e6 : 150000),
          duration: 1.0,
        })
      }
      scene.requestRender()
    }
    scene.morphComplete.addEventListener(onMorphComplete)
    if (mode === '2D') scene.morphTo2D(1.0)
    else scene.morphTo3D(1.0)
    scene.requestRender()
    return () => {
      if (!viewer.isDestroyed()) scene.morphComplete.removeEventListener(onMorphComplete)
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load NASA Trek layer with local texture fallback (reuses existing imagery if layer key is unchanged)
  useEffect(() => {
    const shared = getSharedGlobe()
    const viewer = shared.viewer
    if (!viewer || viewer.isDestroyed()) return

    let unmounted = false
    shared.onLayerState = (nextStatus, nextUsed) => {
      if (unmounted) return
      if (nextStatus !== undefined) setStatus(nextStatus)
      if (nextUsed !== undefined) setUsed(nextUsed)
    }

    if (shared.appliedKey === key && viewer.imageryLayers.length > 0) {
      Promise.resolve().then(() => {
        if (!unmounted) {
          setStatus(shared.status)
          setUsed(shared.used)
        }
      })
      viewer.scene.requestRender()
      return () => {
        unmounted = true
      }
    }

    if (typeof shared.disposeLayer === 'function') {
      shared.disposeLayer()
      shared.disposeLayer = null
    }

    let cancelled = false
    shared.appliedKey = key
    shared.status = 'loading'
    shared.used = ''
    Promise.resolve().then(() => {
      if (!unmounted) {
        setStatus('loading')
        setUsed('')
      }
    })

    const dispose = applyLayer(viewer, cfg, key, {
      cancelled: () => cancelled,
      onStatus: (s) => {
        if (!cancelled) {
          shared.status = s
          shared.onLayerState?.(s, undefined)
          if (s === 'ok' || s === 'error') {
            window.dispatchEvent(new Event('rm:ready'))
          }
        }
      },
      onSource: (n) => {
        if (!cancelled) {
          shared.used = n
          shared.onLayerState?.(undefined, n)
        }
      },
    })

    shared.disposeLayer = () => {
      cancelled = true
      if (typeof dispose === 'function') dispose()
    }

    return () => {
      unmounted = true
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Location + rover markers
  useEffect(() => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer || viewer.isDestroyed()) return
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
          font: '600 14px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#0b0f17').withAlpha(0.7),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(14, dy),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          // Dure gele label chhoto + halka hoye jabe, bhir kombe
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 1.5e7, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(2e6, 1.0, 2e7, 0.0),
        },
      })
      tracked.push({ ent, position })
    }

    locations.forEach((l) => add('loc-' + l.id, l.name, l.lon, l.lat, l.color))
    if (key === 'missions') {
      ROVERS.forEach((r) => add('rover-' + r.id, r.name, r.lon, r.lat, '#38bdf8', 16))
    }

    // Hide far-side markers in 3D, show all in 2D
    const occluder = new Cesium.EllipsoidalOccluder(MARS, viewer.camera.positionWC)
    const onPreRender = () => {
      const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D
      occluder.cameraPosition = viewer.camera.positionWC
      tracked.forEach(({ ent, position }) => {
        const visible = !is3D || occluder.isPointVisible(position)
        if (ent.show !== visible) ent.show = visible
      })
    }
    viewer.scene.preRender.addEventListener(onPreRender)
    viewer.scene.requestRender()

    return () => {
      if (!viewer.isDestroyed()) viewer.scene.preRender.removeEventListener(onPreRender)
    }
  }, [locations, key])

  // Fly to focused location
  useEffect(() => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer || viewer.isDestroyed() || !focus) return
    viewer.camera.flyTo({ destination: at(focus.lon, focus.lat, 150000), duration: 1.6 })
    viewer.scene.requestRender()
  }, [focus])

  const zoom = (dir) => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    const cam = viewer?.camera
    if (!cam) return
    const h = cam.positionCartographic.height
    dir > 0 ? cam.zoomIn(h * 0.5) : cam.zoomOut(h * 0.7)
    viewer.scene.requestRender()
  }

  const handleCenter = () => {
    if (onCenter) {
      onCenter()
    } else if (focus) {
      const viewer = viewerRef.current || sharedGlobe?.viewer
      viewer?.camera.flyTo({ destination: at(focus.lon, focus.lat, 150000), duration: 1.6 })
      viewer?.scene.requestRender()
    }
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      const viewer = viewerRef.current || sharedGlobe?.viewer
      if (!viewer) return
      if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
        viewer.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(-180, -85, 180, 85), duration: 1.6 })
      } else {
        viewer.camera.flyTo({ destination: at(77, 18, 1.2e7), duration: 1.6 })
      }
      viewer.scene.requestRender()
    }
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

      {/* Zoom in, Zoom out, Center on location, Reset buttons on the right top side */}
      <div className={`absolute z-20 flex flex-col gap-2 ${controlsClassName || 'right-3 top-3 sm:right-4 sm:top-4'}`}>
        <button className={btn} onClick={() => zoom(1)} title="Zoom in" aria-label="Zoom in">
          <Plus size={18} />
        </button>
        <button className={btn} onClick={() => zoom(-1)} title="Zoom out" aria-label="Zoom out">
          <Minus size={18} />
        </button>
        <button className={btn} onClick={handleCenter} title="Center on location" aria-label="Center on location">
          <Crosshair size={18} />
        </button>
        <button className={btn} onClick={handleReset} title="Reset view" aria-label="Reset view">
          <RotateCcw size={18} />
        </button>
      </div>

      {showCard && cardVisible && (
        <div
          className={`absolute z-20 rounded-2xl border border-white/10 bg-black/80 p-3 backdrop-blur-md shadow-xl transition-all duration-300 w-[260px] sm:w-[280px] ${
            legendClassName || 'bottom-28 left-1/2 -translate-x-1/2'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">{cfg.title}</span>
            <button
              onClick={() => setCardVisible(false)}
              className="rounded p-0.5 text-gray-400 hover:bg-white/10 hover:text-white"
              title="Close description"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-300">
            {cfg.note}
          </div>
          {cfg.legend && (
            <div className="mt-2">
              <div className="h-2 rounded-full" style={{ background: cfg.legend.bar }} />
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                {cfg.legend.labels.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )}
          {used && (
            <div className="mt-1.5 truncate text-[10px] text-gray-400">
              Source: {used}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-1 border-t border-white/10 pt-1 text-[10px] text-red-400">
              {msg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}