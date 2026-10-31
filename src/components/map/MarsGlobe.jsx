import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Plus, Minus, Crosshair, RotateCcw, X } from 'lucide-react'
import { TILE_LAYERS, ROVERS } from '../../services/layerService'
import { MARS, at, applyLayer, guardCesiumViewer } from '../../services/tiles'
import { MARS_LOCATIONS, getIdealFlyHeightMeters } from '../../services/marsLocations'

window.CESIUM_BASE_URL = '/cesium/'

const ORBIT_HEIGHT = 8.0e6
const FULL_NAME_MAX_HEIGHT = 6.0e6
const ABBREV_MAX_HEIGHT = 1.1e7

function getAbbrev(name) {
  if (!name) return ''
  const cleaned = name
    .replace(/\([^)]*\)/g, '')
    .replace(/\b[A-Z]\.\s*/g, '')
    .trim()
  const words = cleaned.split(/[\s-]+/).filter(Boolean)
  if (words.length === 0) return name.slice(0, 3).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words.map((w) => w[0]?.toUpperCase() || '').join('')
}

function getCameraZoomHeight(viewer) {
  if (!viewer || viewer.isDestroyed()) return ORBIT_HEIGHT
  if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
    const f = viewer.camera.frustum
    if (f && typeof f.top === 'number' && typeof f.bottom === 'number') {
      return Math.abs(f.top - f.bottom)
    }
    return viewer.camera.getMagnitude()
  }
  return viewer.camera.positionCartographic?.height ?? ORBIT_HEIGHT
}

// Computes a 2D Rectangle whose aspect ratio is narrower than or equal to the canvas aspect ratio
// so Cesium fits the vertical latitude span to 100% of the viewport height (covering the background).
function get2DFillRect(viewer, centerLon = 77) {
  const cw = viewer?.canvas?.clientWidth || 1200
  const ch = viewer?.canvas?.clientHeight || 800
  const aspect = Math.max(0.4, Math.min(2.4, cw / ch))
  const latHalf = 68
  const lonHalf = Math.min(95, latHalf * aspect * 0.92)
  const normLon = (((centerLon + 180) % 360) + 360) % 360 - 180
  const clampedCenter = Math.max(-180 + lonHalf, Math.min(180 - lonHalf, normLon))
  return Cesium.Rectangle.fromDegrees(
    clampedCenter - lonHalf,
    -latHalf,
    clampedCenter + lonHalf,
    latHalf
  )
}

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
    orderIndependentTranslucency: false,
    mapProjection: new Cesium.GeographicProjection(MARS),
    mapMode2D: Cesium.MapMode2D.INFINITE_SCROLL,
    contextOptions: {
      webgl: {
        alpha: true,
      },
    },
  })

  // Phone / retina screen e blur na hoy: device er asol pixel density use kori
  viewer.useBrowserRecommendedResolution = false
  viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2)

  const scene = viewer.scene
  scene.backgroundColor = Cesium.Color.TRANSPARENT
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

  viewer.camera.setView({ destination: at(77, 18, ORBIT_HEIGHT) })

  let spinRaf = 0
  let lastSpinTime = 0

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
    spinning: false,
    startSpin: null,
    stopSpin: null,
  }

  const spinStep = (now) => {
    if (!state.spinning || viewer.isDestroyed()) {
      spinRaf = 0
      return
    }
    const dt = lastSpinTime ? Math.min(0.1, (now - lastSpinTime) / 1000) : 0
    lastSpinTime = now
    if (dt > 0 && !document.hidden && container.isConnected && scene.mode === Cesium.SceneMode.SCENE3D) {
      viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.11 * dt)
      scene.requestRender()
    }
    spinRaf = requestAnimationFrame(spinStep)
  }

  state.startSpin = () => {
    if (state.spinning && spinRaf) return
    state.spinning = true
    lastSpinTime = 0
    spinRaf = requestAnimationFrame(spinStep)
  }

  state.stopSpin = () => {
    state.spinning = false
    if (spinRaf) {
      cancelAnimationFrame(spinRaf)
      spinRaf = 0
    }
  }

  const isClientPosOnGlobe = (clientX, clientY) => {
    if (viewer.isDestroyed() || scene.mode !== Cesium.SceneMode.SCENE3D) return true
    const rect = scene.canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    const pos = new Cesium.Cartesian2(clientX - rect.left, clientY - rect.top)
    return Boolean(viewer.camera.pickEllipsoid(pos, MARS))
  }

  container.addEventListener(
    'pointerdown',
    (e) => {
      if (isClientPosOnGlobe(e.clientX, e.clientY)) state.stopSpin()
    },
    { passive: true }
  )
  container.addEventListener(
    'wheel',
    (e) => {
      if (isClientPosOnGlobe(e.clientX, e.clientY)) state.stopSpin()
    },
    { passive: true }
  )
  container.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches && e.touches[0]
      if ((e.touches && e.touches.length > 1) || (t && isClientPosOnGlobe(t.clientX, t.clientY))) {
        state.stopSpin()
      }
    },
    { passive: true }
  )

  state.startSpin()

  const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
  handler.setInputAction((e) => {
    const picked = scene.pick(e.position)
    const id = picked && picked.id && picked.id.id
    if (typeof id === 'string' && id.startsWith('loc-')) {
      const loc = state.locations.find((l) => 'loc-' + l.id === id)
      if (loc) {
        state.stopSpin()
        state.onSelect?.(loc)
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  sharedGlobe = state
  return sharedGlobe
}

export default function MarsGlobe({
  locations = MARS_LOCATIONS,
  focus,
  onSelect,
  layer,
  mode = '3D',
  onCenter,
  onCameraChange,
  controlsClassName,
  legendClassName,
}) {
  const elRef = useRef(null)
  const viewerRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const onCameraChangeRef = useRef(onCameraChange)
  const locRef = useRef(locations)
  const prevFocusRef = useRef(focus)
  const focusIdRef = useRef(focus?.id)

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

  useEffect(() => {
    focusIdRef.current = focus?.id
  }, [focus?.id])

  useEffect(() => {
    onCameraChangeRef.current = onCameraChange
  }, [onCameraChange])

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

  // Switch between 3D Globe and 2D Map View cleanly without intermediate morph crash
  useEffect(() => {
    const shared = getSharedGlobe()
    const viewer = shared.viewer
    if (!viewer || viewer.isDestroyed()) return
    const scene = viewer.scene
    const ctrl = scene.screenSpaceCameraController
    const want = mode === '2D' ? Cesium.SceneMode.SCENE2D : Cesium.SceneMode.SCENE3D
    if (scene.mode === want) return

    shared.stopSpin()
    viewer.camera.cancelFlight()

    if (mode === '2D') {
      scene.backgroundColor = Cesium.Color.fromCssColorString('#2a1208')
      scene.morphTo2D(1.0)
      scene.completeMorph()
      ctrl.maximumZoomDistance = 1.6e7
      const targetRect = get2DFillRect(viewer, focus?.lon ?? 77)
      viewer.camera.setView({
        destination: Cesium.Rectangle.fromDegrees(-180, -82, 180, 82),
      })
      viewer.camera.flyTo({
        destination: targetRect,
        duration: 0.65,
      })
    } else {
      scene.backgroundColor = Cesium.Color.TRANSPARENT
      scene.morphTo3D(1.0)
      scene.completeMorph()
      ctrl.maximumZoomDistance = 4e7
      const lon = focus?.lon ?? 77
      const lat = focus?.lat ?? 18
      viewer.camera.setView({
        destination: at(lon, lat, ORBIT_HEIGHT * 1.25),
      })
      viewer.camera.flyTo({
        destination: at(lon, lat, ORBIT_HEIGHT),
        duration: 0.65,
        complete: () => sharedGlobe?.startSpin(),
      })
    }
    scene.requestRender()
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

  // Location, region, and rover markers with per-item [min_alt_km, max_alt_km] zoom visibility
  useEffect(() => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer || viewer.isDestroyed()) return
    viewer.entities.removeAll()
    const tracked = []

    const add = (item, dy = 0) => {
      const id = item.entityId || 'loc-' + item.id
      const name = item.name
      const lon = item.lon
      const lat = item.lat
      const color = item.color || '#ef4444'
      const position = at(lon, lat)
      const abbrev = getAbbrev(name)
      const hasAltBounds =
        typeof item.min_alt_km === 'number' && typeof item.max_alt_km === 'number'
      const minAltKm = hasAltBounds ? item.min_alt_km : 0
      // Add +50 km buffer at 8000 km so initial ORBIT_HEIGHT (8000 km) never flickers from float drift
      const maxAltKm = hasAltBounds
        ? item.max_alt_km >= 8000
          ? 8050
          : item.max_alt_km
        : 8050
      const abbrevThresholdKm = hasAltBounds
        ? minAltKm + (maxAltKm - minAltKm) * 0.78
        : FULL_NAME_MAX_HEIGHT / 1000

      const isRegion = Boolean(item.isRegion || (item.category && item.category.startsWith('REGION_')))
      const isMissionHub = item.category === 'NASA_MISSION_HUB'
      const isNasa = Boolean(item.is_nasa)

      const pixelSize = isMissionHub ? 11 : isRegion ? 8 : isNasa ? 9.5 : 7
      const baseColor = Cesium.Color.fromCssColorString(color)

      const ent = viewer.entities.add({
        id,
        position,
        show: false,
        point: {
          pixelSize,
          color: isRegion ? baseColor.withAlpha(0.45) : baseColor,
          outlineColor: isRegion ? baseColor : Cesium.Color.WHITE,
          outlineWidth: isMissionHub ? 2.5 : isRegion ? 2 : isNasa ? 2 : 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: isRegion ? name.toUpperCase() : name,
          show: true,
          font: isRegion
            ? '700 12px Inter, sans-serif'
            : isNasa || isMissionHub
            ? '600 13px Inter, sans-serif'
            : '500 12px Inter, sans-serif',
          fillColor: isRegion ? Cesium.Color.fromCssColorString('#fde68a') : Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#0b0f17').withAlpha(isRegion ? 0.65 : 0.75),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(12, dy),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })

      tracked.push({
        ent,
        rawId: item.id,
        position,
        fullName: isRegion ? name.toUpperCase() : name,
        abbrev,
        hasAltBounds,
        minAltKm,
        maxAltKm,
        abbrevThresholdKm,
        level: item.level || 1,
        isRegion,
        lastText: isRegion ? name.toUpperCase() : name,
        lastLabelShow: true,
      })
    }

    locations.forEach((l) => add(l))
    if (key === 'missions') {
      ROVERS.forEach((r) =>
        add(
          {
            ...r,
            entityId: 'rover-' + r.id,
            color: '#38bdf8',
            category: 'NASA_MISSION_HUB',
            is_nasa: true,
            min_alt_km: 50,
            max_alt_km: 8000,
          },
          16
        )
      )
    }

    let lastReportedAlt = -1
    const occluder = new Cesium.EllipsoidalOccluder(MARS, viewer.camera.positionWC)
    const onPreRender = () => {
      if (viewer.isDestroyed()) return
      const sceneMode = viewer.scene.mode
      if (sceneMode === Cesium.SceneMode.MORPHING) return

      const is3D = sceneMode === Cesium.SceneMode.SCENE3D
      const camHeight = getCameraZoomHeight(viewer)
      const altKm = camHeight / 1000

      if (onCameraChangeRef.current && Math.abs(altKm - lastReportedAlt) >= 15) {
        lastReportedAlt = altKm
        const activeLevel = altKm > 3200 ? 1 : altKm > 1100 ? 2 : 3
        onCameraChangeRef.current(Math.round(altKm), activeLevel)
      }

      occluder.cameraPosition = viewer.camera.positionWC
      const focusedId = focusIdRef.current

      for (let i = 0; i < tracked.length; i++) {
        const item = tracked[i]
        const { ent, position } = item
        const isFocused = focusedId && item.rawId === focusedId

        // 1. Check altitude visibility window [min_alt_km, max_alt_km]
        let inAltRange = false
        let showLabel = true
        let useAbbrev = false

        if (item.hasAltBounds) {
          if (isFocused) {
            inAltRange = true
            showLabel = true
            useAbbrev = false
          } else if (altKm >= item.minAltKm && altKm <= item.maxAltKm) {
            inAltRange = true
            showLabel = true
            useAbbrev = altKm > item.abbrevThresholdKm
          } else if (item.level === 1 && altKm > item.maxAltKm) {
            // Keep Level 1 major region pointers visible when zoomed far out (> 8000 km), with abbreviations up to 11,000 km
            inAltRange = true
            if (altKm <= ABBREV_MAX_HEIGHT / 1000) {
              showLabel = true
              useAbbrev = true
            } else {
              showLabel = false
            }
          }
        } else {
          inAltRange = true
          if (camHeight <= FULL_NAME_MAX_HEIGHT) {
            showLabel = true
            useAbbrev = false
          } else if (camHeight <= ABBREV_MAX_HEIGHT) {
            showLabel = true
            useAbbrev = true
          } else {
            showLabel = false
          }
        }

        if (!inAltRange) {
          if (ent.show) ent.show = false
          continue
        }

        // 2. Check front-hemisphere horizon occlusion in 3D
        const onFrontHemisphere = !is3D || occluder.isPointVisible(position)
        if (!onFrontHemisphere) {
          if (ent.show) ent.show = false
          continue
        }

        if (!ent.show) ent.show = true
        if (item.lastLabelShow !== showLabel) {
          ent.label.show = showLabel
          item.lastLabelShow = showLabel
        }
        if (showLabel) {
          const nextText = useAbbrev ? item.abbrev : item.fullName
          if (item.lastText !== nextText) {
            ent.label.text = nextText
            item.lastText = nextText
          }
        }
      }
    }
    viewer.scene.preRender.addEventListener(onPreRender)
    viewer.scene.requestRender()

    return () => {
      if (!viewer.isDestroyed()) viewer.scene.preRender.removeEventListener(onPreRender)
    }
  }, [locations, key])

  // Fly to focused location only when the user explicitly selects/changes a location after mount
  useEffect(() => {
    if (prevFocusRef.current === focus) return
    prevFocusRef.current = focus
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer || viewer.isDestroyed() || !focus) return
    sharedGlobe?.stopSpin()
    const targetHeight = getIdealFlyHeightMeters(focus)
    viewer.camera.flyTo({ destination: at(focus.lon, focus.lat, targetHeight), duration: 1.6 })
    viewer.scene.requestRender()
  }, [focus])

  const zoom = (dir) => {
    sharedGlobe?.stopSpin()
    const viewer = viewerRef.current || sharedGlobe?.viewer
    const cam = viewer?.camera
    if (!cam) return
    const h = getCameraZoomHeight(viewer)
    if (viewer.scene.mode === Cesium.SceneMode.SCENE2D && dir < 0 && h >= 1.1e7) {
      return
    }
    dir > 0 ? cam.zoomIn(h * 0.45) : cam.zoomOut(h * 0.6)
    viewer.scene.requestRender()
  }

  const handleCenter = () => {
    sharedGlobe?.stopSpin()
    if (onCenter) {
      onCenter()
    } else if (focus) {
      const viewer = viewerRef.current || sharedGlobe?.viewer
      const targetHeight = getIdealFlyHeightMeters(focus)
      viewer?.camera.flyTo({ destination: at(focus.lon, focus.lat, targetHeight), duration: 1.6 })
      viewer?.scene.requestRender()
    }
  }

  const handleReset = () => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer) return
    sharedGlobe?.stopSpin()
    if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
      viewer.camera.flyTo({
        destination: get2DFillRect(viewer, focus?.lon ?? 77),
        duration: 1.2,
      })
    } else {
      viewer.camera.flyTo({
        destination: at(77, 18, ORBIT_HEIGHT),
        duration: 1.6,
        complete: () => sharedGlobe?.startSpin(),
      })
    }
    viewer.scene.requestRender()
  }

  const msg = {
    loading: 'Checking NASA tile sources...',
    ok: 'NASA Mars Trek data',
    error: 'No tile source worked for this layer. Open F12 → Console and look for the [RedMap] lines.',
  }[status]

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md hover:bg-white/10'

  return (
    <div
      className="relative isolate h-full w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundColor: '#1a0d07',
        backgroundImage: mode === '2D' ? 'none' : "url('/assets/deep_space.png')",
      }}
    >
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
          className={`absolute z-20 w-[240px] rounded-xl border border-white/10 bg-black/80 px-2.5 py-2 shadow-xl backdrop-blur-md transition-all duration-300 sm:w-[260px] ${
            legendClassName || 'bottom-32 left-1/2 -translate-x-1/2 xl:bottom-36'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold leading-tight text-white">{cfg.title}</span>
            <button
              onClick={() => setCardVisible(false)}
              className="rounded p-0.5 text-gray-400 hover:bg-white/10 hover:text-white"
              title="Close description"
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>
          <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-gray-300">
            {cfg.note}
          </div>
          {cfg.legend && (
            <div className="mt-1.5">
              <div className="h-1.5 rounded-full" style={{ background: cfg.legend.bar }} />
              <div className="mt-0.5 flex justify-between text-[9.5px] text-gray-400">
                {cfg.legend.labels.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )}
          {used && (
            <div className="mt-1 truncate text-[9.5px] text-gray-400">
              Source: {used}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-1 border-t border-white/10 pt-1 text-[9.5px] text-red-400">
              {msg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}