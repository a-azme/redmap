import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Plus, Minus, Crosshair, RotateCcw, X } from 'lucide-react'
import { TILE_LAYERS, ROVERS } from '../../services/layerService'
import { MARS, at, applyLayer, guardCesiumViewer } from '../../services/tiles'
import {
  MARS_LOCATIONS,
  getIdealFlyHeightMeters,
  getLocationAbbrev,
} from '../../services/marsLocations'

window.CESIUM_BASE_URL = '/cesium/'

const MIN_ZOOM_METERS = 50_000 // 50 km
const MAX_ZOOM_METERS = 330_000_000 // 330,000 km
const ORBIT_HEIGHT = 8_000_000 // 8,000 km initial height
const ABBREV_START_KM = 7000
const HIDE_ALL_ALT_KM = 24000

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
  ctrl.minimumZoomDistance = MIN_ZOOM_METERS
  ctrl.maximumZoomDistance = MAX_ZOOM_METERS

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
    onHoverCoord: null,
    enableCrosshair: false,
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

  const scratchClientPos = new Cesium.Cartesian2()
  const scratchHoverCarto = new Cesium.Cartographic()
  let isPointerDown = false
  let moveRaf = 0
  let latestEndPos = null
  let lastPickTime = 0
  let lastIsPin = false
  let lastHoverLat = null
  let lastHoverLon = null

  const isClientPosOnGlobe = (clientX, clientY) => {
    if (viewer.isDestroyed() || scene.mode !== Cesium.SceneMode.SCENE3D) return true
    const rect = scene.canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    scratchClientPos.x = clientX - rect.left
    scratchClientPos.y = clientY - rect.top
    return Boolean(viewer.camera.pickEllipsoid(scratchClientPos, MARS))
  }

  container.addEventListener(
    'pointerdown',
    (e) => {
      isPointerDown = true
      if (isClientPosOnGlobe(e.clientX, e.clientY)) state.stopSpin()
    },
    { passive: true }
  )
  window.addEventListener(
    'pointerup',
    () => {
      isPointerDown = false
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
  container.addEventListener(
    'pointerleave',
    () => {
      isPointerDown = false
      if (!viewer.isDestroyed() && scene.canvas) {
        scene.canvas.style.cursor = 'default'
      }
      lastHoverLat = null
      lastHoverLon = null
      state.onHoverCoord?.(null)
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

  handler.setInputAction((movement) => {
    if (viewer.isDestroyed() || !movement?.endPosition) return
    latestEndPos = movement.endPosition
    if (moveRaf) return
    moveRaf = requestAnimationFrame((now) => {
      moveRaf = 0
      if (viewer.isDestroyed() || !latestEndPos) return

      // Avoid expensive gl.readPixels scene.pick while dragging or more than ~16 times/sec
      if (!isPointerDown && now - lastPickTime >= 60) {
        lastPickTime = now
        const picked = scene.pick(latestEndPos)
        const id = picked && picked.id && picked.id.id
        lastIsPin = typeof id === 'string' && id.startsWith('loc-')
      }

      const cartesian = viewer.camera.pickEllipsoid(latestEndPos, MARS)
      if (cartesian) {
        if (state.onHoverCoord) {
          const carto = MARS.cartesianToCartographic(cartesian, scratchHoverCarto)
          if (carto) {
            const lat = Math.round(Cesium.Math.toDegrees(carto.latitude) * 100) / 100
            const lon = Math.round(Cesium.Math.toDegrees(carto.longitude) * 100) / 100
            if (lat !== lastHoverLat || lon !== lastHoverLon) {
              lastHoverLat = lat
              lastHoverLon = lon
              state.onHoverCoord({ lat, lon })
            }
          }
        }
        scene.canvas.style.cursor = lastIsPin
          ? 'pointer'
          : state.enableCrosshair
          ? 'crosshair'
          : 'grab'
      } else {
        if (lastHoverLat !== null || lastHoverLon !== null) {
          lastHoverLat = null
          lastHoverLon = null
          state.onHoverCoord?.(null)
        }
        scene.canvas.style.cursor = lastIsPin ? 'pointer' : 'default'
      }
    })
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  sharedGlobe = state
  return sharedGlobe
}

export default function MarsGlobe({
  locations = MARS_LOCATIONS,
  focus,
  onSelect,
  onHoverCoord,
  enableCrosshair = false,
  layer,
  mode = '3D',
  onCenter,
  onReset,
  onCameraChange,
  controlsClassName,
  legendClassName,
  showCompass = false,
  compassClassName,
}) {
  const elRef = useRef(null)
  const viewerRef = useRef(null)
  const compassDialRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const onHoverCoordRef = useRef(onHoverCoord)
  const enableCrosshairRef = useRef(enableCrosshair)
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

  // Keep singleton click & hover handlers synced with the currently mounted page
  useEffect(() => {
    onSelectRef.current = onSelect
    onHoverCoordRef.current = onHoverCoord
    enableCrosshairRef.current = enableCrosshair
    locRef.current = locations
    if (sharedGlobe) {
      sharedGlobe.locations = locations
      sharedGlobe.onSelect = onSelect
      sharedGlobe.onHoverCoord = onHoverCoord
      sharedGlobe.enableCrosshair = enableCrosshair
    }
  }, [locations, onSelect, onHoverCoord, enableCrosshair])

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
    shared.onHoverCoord = (coord) => onHoverCoordRef.current?.(coord)
    shared.enableCrosshair = enableCrosshairRef.current

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
      ctrl.minimumZoomDistance = MIN_ZOOM_METERS
      ctrl.maximumZoomDistance = MAX_ZOOM_METERS
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
      ctrl.minimumZoomDistance = MIN_ZOOM_METERS
      ctrl.maximumZoomDistance = MAX_ZOOM_METERS
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

  const showRovers = key === 'missions'

  // Location, region, and rover markers with per-item [min_alt_km, max_alt_km] zoom visibility & overlap avoidance
  useEffect(() => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer || viewer.isDestroyed()) return
    viewer.entities.removeAll()
    viewer.entities.suspendEvents()
    const tracked = []

    const add = (item, dy = 0) => {
      const id = item.entityId || 'loc-' + item.id
      const name = item.name
      const lon = item.lon
      const lat = item.lat
      const color = item.color || '#ef4444'
      const position = at(lon, lat)
      const abbrev = item.abbrev || getLocationAbbrev(item.rawName || name, item.category)
      const hasAltBounds =
        typeof item.min_alt_km === 'number' && typeof item.max_alt_km === 'number'
      const isLevel1Region = item.level === 1
      const level = item.level || 2
      // Allow Level 3 surface features to stay visible down to the 50 km minimum zoom limit
      const minAltKm = hasAltBounds
        ? level === 3 && item.min_alt_km <= 100
          ? 50
          : item.min_alt_km
        : 50
      const maxAltKm = hasAltBounds ? item.max_alt_km : 8000

      const isMissionHub = item.category === 'NASA_MISSION_HUB'
      const isNasa = Boolean(item.is_nasa)

      // Concise, symmetrically round pointer dot (omitted for Level 1 regional areas)
      const pixelSize = isMissionHub ? 8 : 6
      const baseColor = Cesium.Color.fromCssColorString(color)

      const ent = viewer.entities.add({
        id,
        position,
        show: false,
        point: isLevel1Region
          ? undefined
          : {
              pixelSize,
              color: baseColor,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1.5,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
        label: {
          text: name,
          show: true,
          font: '500 11.5px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: false,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: isLevel1Region
            ? Cesium.VerticalOrigin.CENTER
            : Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, isLevel1Region ? dy : 6 + dy),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })

      tracked.push({
        ent,
        rawId: item.id,
        position,
        fullName: name,
        abbrev,
        hasAltBounds,
        minAltKm,
        maxAltKm,
        level,
        isLevel1Region,
        isNasa,
        diameter: Number(item.diameter) || 0,
        dy,
        lastText: name,
        lastLabelShow: true,
        boxLeft: 0,
        boxRight: 0,
        boxTop: 0,
        boxBottom: 0,
      })
    }

    locations.forEach((l) => add(l))
    if (showRovers) {
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
          18
        )
      )
    }
    viewer.entities.resumeEvents()

    // Deterministic priority order so higher-importance labels win when two labels overlap
    tracked.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      if (a.isNasa !== b.isNasa) return a.isNasa ? -1 : 1
      return b.diameter - a.diameter
    })

    let lastReportedAlt = -1
    const occluder = new Cesium.EllipsoidalOccluder(MARS, viewer.camera.positionWC)
    const scratchWin = new Cesium.Cartesian2()
    const placedBoxes = []

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

      if (compassDialRef.current) {
        const cam = viewer.camera
        const rx = cam.rightWC.z
        const ry = cam.upWC.z
        const angleRad =
          rx * rx + ry * ry > 1e-6 ? Math.atan2(rx, ry) : -(cam.heading || 0)
        const angleDeg = Cesium.Math.toDegrees(angleRad)
        compassDialRef.current.style.transform = `rotate(${angleDeg.toFixed(2)}deg)`
      }

      let dirty = false

      // >= 24,000 km: hide all points and location names
      if (altKm >= HIDE_ALL_ALT_KM) {
        for (let i = 0; i < tracked.length; i++) {
          if (tracked[i].ent.show) {
            tracked[i].ent.show = false
            dirty = true
          }
        }
        if (dirty) viewer.dataSourceDisplay?.update(viewer.clock.currentTime)
        return
      }

      occluder.cameraPosition = viewer.camera.positionWC
      const focusedId = focusIdRef.current
      placedBoxes.length = 0

      const evaluateItem = (item, isFocused) => {
        const { ent, position } = item

        // 1. Check altitude visibility window [min_alt_km, max_alt_km]
        let inAltRange = false
        let useAbbrev = false

        if (item.hasAltBounds) {
          if (isFocused) {
            inAltRange = true
            useAbbrev = altKm > ABBREV_START_KM
          } else if (altKm >= item.minAltKm && altKm <= item.maxAltKm) {
            inAltRange = true
            useAbbrev = altKm > ABBREV_START_KM
          } else if (item.level === 1 && altKm > item.maxAltKm && altKm < HIDE_ALL_ALT_KM) {
            // Level 1's 24 locations stay visible as abbreviations up to 24,000 km
            inAltRange = true
            useAbbrev = true
          }
        } else {
          inAltRange = true
          useAbbrev = altKm > ABBREV_START_KM
        }

        if (!inAltRange) {
          if (ent.show) {
            ent.show = false
            dirty = true
          }
          return
        }

        // 2. Check front-hemisphere horizon occlusion in 3D
        const onFrontHemisphere = !is3D || occluder.isPointVisible(position)
        if (!onFrontHemisphere) {
          if (ent.show) {
            ent.show = false
            dirty = true
          }
          return
        }

        const nextText = useAbbrev ? item.abbrev : item.fullName
        if (item.lastText !== nextText) {
          ent.label.text = nextText
          item.lastText = nextText
          dirty = true
        }

        // 3. Check 2D screen-space label collision so overlapping name texts hide one of them
        let showLabel = true
        const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(
          viewer.scene,
          position,
          scratchWin
        )
        if (!winPos || !Number.isFinite(winPos.x) || !Number.isFinite(winPos.y)) {
          showLabel = false
        } else {
          const halfW = (nextText.length * 6.8 + 4) * 0.5
          const left = winPos.x - halfW - 2
          const right = winPos.x + halfW + 2
          const top = item.isLevel1Region ? winPos.y + item.dy - 9 : winPos.y - 3
          const bottom = item.isLevel1Region ? winPos.y + item.dy + 9 : winPos.y + 6 + item.dy + 18

          if (!isFocused) {
            for (let j = 0; j < placedBoxes.length; j++) {
              const b = placedBoxes[j]
              if (!(right < b.boxLeft || left > b.boxRight || bottom < b.boxTop || top > b.boxBottom)) {
                showLabel = false
                break
              }
            }
          }

          if (showLabel) {
            item.boxLeft = left
            item.boxRight = right
            item.boxTop = top
            item.boxBottom = bottom
            placedBoxes.push(item)
          }
        }

        // Level 1 has no point marker, so if its label is hidden from overlap, hide the entity
        if (item.isLevel1Region && !showLabel) {
          if (ent.show) {
            ent.show = false
            dirty = true
          }
          return
        }

        if (!ent.show) {
          ent.show = true
          dirty = true
        }
        if (item.lastLabelShow !== showLabel) {
          ent.label.show = showLabel
          item.lastLabelShow = showLabel
          dirty = true
        }
      }

      // Evaluate focused item first so its label always wins against neighbors
      let focusedIndex = -1
      if (focusedId) {
        for (let i = 0; i < tracked.length; i++) {
          if (tracked[i].rawId === focusedId) {
            focusedIndex = i
            evaluateItem(tracked[i], true)
            break
          }
        }
      }

      for (let i = 0; i < tracked.length; i++) {
        if (i === focusedIndex) continue
        evaluateItem(tracked[i], false)
      }

      if (dirty) {
        viewer.dataSourceDisplay?.update(viewer.clock.currentTime)
      }
    }
    viewer.scene.preRender.addEventListener(onPreRender)
    viewer.scene.requestRender()

    return () => {
      if (!viewer.isDestroyed()) viewer.scene.preRender.removeEventListener(onPreRender)
    }
  }, [locations, showRovers])

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
    if (dir > 0) {
      if (h <= MIN_ZOOM_METERS) return
      const step = Math.min(h * 0.45, h - MIN_ZOOM_METERS)
      if (step > 0) cam.zoomIn(step)
    } else {
      if (h >= MAX_ZOOM_METERS) return
      const step = Math.min(h * 0.6, MAX_ZOOM_METERS - h)
      if (step > 0) cam.zoomOut(step)
    }
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
    onReset?.()
    if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
      viewer.camera.flyTo({
        destination: get2DFillRect(viewer, 77),
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

  const handleNorthUp = () => {
    const viewer = viewerRef.current || sharedGlobe?.viewer
    if (!viewer || viewer.isDestroyed()) return
    sharedGlobe?.stopSpin()
    const cam = viewer.camera
    if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
      cam.flyTo({
        destination: cam.positionWC,
        orientation: {
          heading: 0,
          pitch: cam.pitch,
          roll: 0,
        },
        duration: 0.55,
      })
    } else {
      const carto = cam.positionCartographic
      const lon = Cesium.Math.toDegrees(carto.longitude)
      const lat = Cesium.Math.toDegrees(carto.latitude)
      const height = carto.height
      cam.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, height, MARS),
        orientation: {
          heading: 0,
          pitch: -Cesium.Math.PI_OVER_TWO,
          roll: 0,
        },
        duration: 0.55,
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

      {/* Live Direction Compass (North-Up on tap without changing altitude/zoom) */}
      {showCompass && (
        <button
          type="button"
          onClick={handleNorthUp}
          title="Orient North up"
          aria-label="Orient North up"
          className={`group absolute z-20 h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/70 shadow-xl backdrop-blur-md transition hover:border-red-500/40 hover:bg-black/85 active:scale-95 ${
            compassClassName || 'bottom-9 left-8 hidden xl:flex'
          }`}
        >
          <div
            ref={compassDialRef}
            className="relative flex h-full w-full items-center justify-center will-change-transform"
          >
            {/* Cardinal Labels */}
            <span className="absolute top-1 text-[8px] font-extrabold leading-none tracking-tighter text-red-400">
              N
            </span>
            <span className="absolute bottom-1 text-[7.5px] font-semibold leading-none text-white/45">
              S
            </span>
            <span className="absolute left-1.5 text-[7.5px] font-semibold leading-none text-white/45">
              W
            </span>
            <span className="absolute right-1.5 text-[7.5px] font-semibold leading-none text-white/45">
              E
            </span>

            {/* Precision Dual-Tone Needle */}
            <svg viewBox="0 0 32 32" className="h-6 w-6 drop-shadow">
              {/* North Pointer (Red) */}
              <polygon points="16,4 19,16 16,14.5 13,16" fill="#ef4444" />
              {/* South Pointer (Muted Silver) */}
              <polygon points="16,28 19,16 16,17.5 13,16" fill="rgba(255,255,255,0.35)" />
              {/* Center Pivot Cap */}
              <circle cx="16" cy="16" r="2" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
            </svg>
          </div>
        </button>
      )}

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