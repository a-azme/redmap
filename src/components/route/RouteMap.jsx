import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Plus, Minus, Crosshair, RotateCcw } from 'lucide-react'
import { TILE_LAYERS } from '../../services/layerService'
import { MARS, at, toLon, applyLayer, guardCesiumViewer } from '../../services/tiles'
import { LOCATIONS } from './routeUtils'
import { hazardRectangle, renderHazardCanvas } from '../../lib/hazardImage.js'

window.CESIUM_BASE_URL = '/cesium/'

const BLUE = Cesium.Color.fromCssColorString('#2bb5f5')
const ROUTE_LINE = Cesium.Color.fromCssColorString('#9fe0ff')
const ROUTE_GLOW = Cesium.Color.fromCssColorString('#2bb5f5').withAlpha(0.5)
const HOME = () => at(77, 18, 1.4e7)

// Rectangle (2D view) that puts the whole route in the open middle of the screen: side panels cover
// about a third of the width and the bottom cards about 40% of the height, so the route is fitted into the
// top-middle band instead of the centre of the screen.
function fitRect(route, viewer, focus = false) {
  let prev = null
  const lons = route.path.map((p) => {
    let l = toLon(p.lon)
    if (prev !== null) {
      while (l - prev > 180) l -= 360
      while (prev - l > 180) l += 360
    }
    prev = l
    return l
  })
  const lats = route.path.map((p) => p.lat)
  const w = Math.min(...lons), e = Math.max(...lons)
  const s = Math.min(...lats), n = Math.max(...lats)
  const cw = viewer?.canvas?.clientWidth || 1600, ch = viewer?.canvas?.clientHeight || 800
  const aspect = Math.max(0.8, cw / ch)
  const OPEN_W = focus ? 0.8 : 0.5, OPEN_H = focus ? 0.75 : 0.42 // share of the screen left open by the panels
  const needW = Math.max(e - w, 4) / OPEN_W
  const needH = Math.max(n - s, 3) / OPEN_H
  const viewH = Math.min(178, Math.max(needH, needW / aspect))
  const viewW = viewH * aspect
  if (viewW >= 350) {
    const top = Math.min(89, n + viewH * 0.12)
    return Cesium.Rectangle.fromDegrees(-180, Math.max(-89, top - viewH), 180, top)
  }
  const cx = (w + e) / 2
  const top = Math.min(89, n + viewH * 0.12)
  const nd = (d) => Cesium.Math.toDegrees(Cesium.Math.negativePiToPi(Cesium.Math.toRadians(d)))
  return Cesium.Rectangle.fromDegrees(nd(cx - viewW / 2), Math.max(-89, top - viewH), nd(cx + viewW / 2), top)
}

// 3D: oblique "Google Earth" look at the route. 2D: flat fit.
function fitView(viewer, route, duration = 1.8, focus = false) {
  if (!route || !viewer || viewer.isDestroyed()) return
  if (viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
    const sphere = Cesium.BoundingSphere.fromPoints(route.path.map((p) => at(p.lon, p.lat)))
    viewer.camera.flyToBoundingSphere(sphere, {
      duration,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-55),
        Math.min(4e7, Math.max(sphere.radius * 3.4, 4e4))
      ),
    })
  } else {
    viewer.camera.flyTo({ destination: fitRect(route, viewer, focus), duration })
  }
}

export default function RouteMap({ route, hazard = 'off', layer = 'terrain', mode = '3D', selectedStopIds = [], focus = false }) {
  const elRef = useRef(null)
  const viewerRef = useRef(null)
  const routeRef = useRef(route)
  const lastRoute = useRef(null)
  const hoverOnly = useRef(new Set())
  const markerTimer = useRef(null)
  const [status, setStatus] = useState('loading')
  const [used, setUsed] = useState('')

  routeRef.current = route
  const focusRef = useRef(focus)
  focusRef.current = focus
  const cfg = TILE_LAYERS[layer] || TILE_LAYERS.terrain

  /* ---- 1. viewer (once) ---- */
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
      mapProjection: new Cesium.GeographicProjection(MARS), // so 2D uses Mars, not Earth
      mapMode2D: Cesium.MapMode2D.INFINITE_SCROLL,          // viewer option (scene.mapMode2D is read-only)
    })
    const scene = viewer.scene
    scene.backgroundColor = Cesium.Color.fromCssColorString('#07090d')
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#2a1208')
    scene.globe.showGroundAtmosphere = false
    scene.globe.enableLighting = false
    if (scene.sun) scene.sun.show = false
    if (scene.moon) scene.moon.show = false
    // draw only when something changes (camera moves, layers load) instead of 60 times a second: smoother dragging, much less battery
    scene.requestRenderMode = true
    scene.maximumRenderTimeChange = Infinity
    if ('msaaSamples' in scene) scene.msaaSamples = 1 // no multisampling; the route line is smooth enough
    scene.globe.maximumScreenSpaceError = 3

    const unguard = guardCesiumViewer(viewer)

    const ctrl = scene.screenSpaceCameraController
    ctrl.minimumZoomDistance = 500
    ctrl.maximumZoomDistance = 4e7
    ctrl.enableTilt = true // 3D: right-drag / Ctrl+drag / middle-drag tilts like Google Earth

    viewer.camera.setView({ destination: HOME() })

    // hover labels for hazards / stops / context locations
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
    let hovered = null
    handler.setInputAction((m) => {
      const p = scene.pick(m.endPosition)
      const ent = p && p.id && p.id.label ? p.id : null
      if (hovered && hovered !== ent && hoverOnly.current.has(hovered.id)) hovered.label.show = false
      if (ent && hoverOnly.current.has(ent.id)) ent.label.show = true
      scene.canvas.style.cursor = ent ? 'pointer' : 'grab'
      hovered = ent
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    viewerRef.current = viewer
    return () => {
      unguard()
      handler.destroy()
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  /* ---- 2. base texture (terrain / satellite / elevation) ---- */
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    let cancelled = false
    setStatus('loading')
    setUsed('')
    const dispose = applyLayer(viewer, cfg, layer, {
      cancelled: () => cancelled,
      onStatus: (s) => !cancelled && setStatus(s),
      onSource: (n) => !cancelled && setUsed(n),
    })
    return () => {
      cancelled = true
      if (typeof dispose === 'function') dispose()
    }
  }, [layer]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- 3. route + markers ---- */
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.entities.removeAll()
    hoverOnly.current = new Set()
    const tracked = []

    const addPoint = ({ id, name, lon, lat, color, size = 11, label = true, always = false, dy = 0, maxDist }) => {
      const position = at(lon, lat)
      if (!always) hoverOnly.current.add(id)
      const ent = viewer.entities.add({
        id,
        position,
        point: {
          pixelSize: size,
          color: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: label && {
          text: name,
          show: always,
          font: '13px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(14, dy),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: maxDist ? new Cesium.DistanceDisplayCondition(0, maxDist) : undefined,
        },
      })
      tracked.push({ ent, position })
    }

    // other known locations from locations.json (context)
    LOCATIONS.forEach((l) => {
      if (route && (l.id === route.start.id || l.id === route.end.id)) return
      addPoint({ id: 'ctx-' + l.id, name: l.name, lon: l.lon, lat: l.lat, color: l.color, size: 8, maxDist: 8e6 })
    })

    if (route) {
      // hazard heat-map (slope risk or low ground) under the route line
      if (hazard !== 'off' && route.hazard) {
        const r = hazardRectangle(route.hazard)
        if (r) {
          viewer.entities.add({
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(r.west, r.south, r.east, r.north),
              height: 100,
              material: new Cesium.ImageMaterialProperty({ image: renderHazardCanvas(route.hazard, hazard), transparent: true }),
            },
          })
        }
      }

      const pos = route.path.map((p) => at(p.lon, p.lat, 300))

      // glow + solid light-blue line that follows the planned path
      viewer.entities.add({
        polyline: {
          positions: pos,
          width: 10,
          arcType: Cesium.ArcType.GEODESIC,
          material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.18, color: ROUTE_GLOW }),
        },
      })
      viewer.entities.add({
        polyline: {
          positions: pos,
          width: 4.5,
          arcType: Cesium.ArcType.GEODESIC,
          material: ROUTE_LINE,
        },
      })

      route.warnings
        .filter((w) => w.severity !== 'info' && w.toKm - w.fromKm < route.distanceKm - 1)
        .forEach((w) =>
          addPoint({
            id: 'w-' + w.id, name: '▲ ' + w.title, lon: w.lon, lat: w.lat, size: 9,
            color: w.severity === 'critical' ? '#ff4d4d' : '#f5a524',
          }))

      if (route.waypoints?.length) {
        // numbered navigation waypoints: "1. Jezero Crater", "Waypoint 2 (15.4°N, 83.6°E)"
        route.waypoints.forEach((w) => {
          const on = w.kind === 'stop' && selectedStopIds.includes(w.id)
          const label = w.kind === 'stop'
            ? `${w.n}. ${w.name}`
            : `Waypoint ${w.n} (${Math.abs(w.lat).toFixed(1)}°${w.lat >= 0 ? 'N' : 'S'}, ${w.lon.toFixed(1)}°E)`
          addPoint({ id: 'wp-' + w.n, name: label, lon: w.lon, lat: w.lat, color: on ? '#4be08a' : '#f5c518', size: 11, always: true })
        })
      } else {
        route.stops.forEach((s) => {
          const on = selectedStopIds.includes(s.id)
          addPoint({
            id: 's-' + s.id, name: s.title, lon: s.lon, lat: s.lat,
            color: on ? '#4be08a' : '#f5c518', size: on ? 13 : 10, always: on,
          })
        })
      }

      addPoint({ id: 'start', name: `Start: ${route.start.name}`, lon: route.start.lon, lat: route.start.lat, color: '#2ecc71', size: 14, always: true })
      addPoint({ id: 'end', name: `Destination: ${route.end.name}`, lon: route.end.lon, lat: route.end.lat, color: '#e5322d', size: 14, always: true, dy: 16 })

      // rover marker travelling along the route
      // (updated ~8 times a second and only then redrawn: a per-frame animation would keep the GPU busy and make dragging choppy)
      const t0 = performance.now()
      const markerAt = () => {
        const f = (((performance.now() - t0) / 1000) * 0.05) % 1
        const x = f * (pos.length - 1), i = Math.floor(x)
        return Cesium.Cartesian3.lerp(pos[i], pos[Math.min(i + 1, pos.length - 1)], x - i, new Cesium.Cartesian3())
      }
      const marker = viewer.entities.add({
        position: markerAt(),
        point: {
          pixelSize: 9, color: Cesium.Color.WHITE, outlineColor: BLUE, outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
      clearInterval(markerTimer.current)
      markerTimer.current = setInterval(() => {
        if (viewer.isDestroyed() || document.hidden) return
        marker.position = markerAt()
        viewer.scene.requestRender()
      }, 125)

      // frame the route only when a NEW route is planned
      if (lastRoute.current !== route) {
        lastRoute.current = route
        fitView(viewer, route)
      }
    }

    // hide markers on the far side of the planet (3D only)
    const occluder = new Cesium.EllipsoidalOccluder(MARS, viewer.camera.positionWC)
    const onPreRender = () => {
      const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D
      occluder.cameraPosition = viewer.camera.positionWC
      tracked.forEach(({ ent, position }) => { ent.show = !is3D || occluder.isPointVisible(position) })
    }
    viewer.scene.preRender.addEventListener(onPreRender)
    return () => { clearInterval(markerTimer.current); if (!viewer.isDestroyed()) viewer.scene.preRender.removeEventListener(onPreRender) }
  }, [route, hazard, selectedStopIds])

  /* ---- 4. 3D <-> 2D ---- */
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const scene = viewer.scene
    const want = mode === '2D' ? Cesium.SceneMode.SCENE2D : Cesium.SceneMode.SCENE3D
    if (scene.mode === want) return
    const done = () => {
      scene.morphComplete.removeEventListener(done)
      fitView(viewer, routeRef.current, 1.2)
    }
    scene.morphComplete.addEventListener(done)
    if (mode === '2D') scene.morphTo2D(1.2)
    else scene.morphTo3D(1.2)
  }, [mode])

  const zoom = (dir) => {
    const cam = viewerRef.current?.camera
    if (!cam) return
    const h = cam.positionCartographic.height
    dir > 0 ? cam.zoomIn(h * 0.5) : cam.zoomOut(h * 0.7)
  }
  const recenter = () => fitView(viewerRef.current, routeRef.current, 1.8, focusRef.current)
  // entering or leaving the full-screen map view: re-frame the route for the space that is now free
  const firstFocus = useRef(true)
  useEffect(() => {
    if (firstFocus.current) { firstFocus.current = false; return }
    const v = viewerRef.current
    if (v && routeRef.current) fitView(v, routeRef.current, 1.2, focus)
  }, [focus])
  const reset = () => {
    const v = viewerRef.current
    if (!v) return
    if (v.scene.mode === Cesium.SceneMode.SCENE3D) v.camera.flyTo({ destination: HOME(), duration: 1.5 })
    else v.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(-180, -89, 180, 89), duration: 1.5 })
  }

  return (
    <div className={`rm-map${focus ? ' rm-map--focus' : ''}`}>
      <div ref={elRef} style={{ width: '100%', height: '100%' }} />

      <div className="rm-ctrls">
        <button type="button" onClick={() => zoom(1)} title="Zoom in"><Plus size={18} /></button>
        <button type="button" onClick={() => zoom(-1)} title="Zoom out"><Minus size={18} /></button>
        <button type="button" onClick={recenter} title="Centre on route"><Crosshair size={18} /></button>
        <button type="button" onClick={reset} title="Whole planet"><RotateCcw size={18} /></button>
      </div>

      <div className="rm-status">
        <b>{cfg.title || layer}</b>
        {cfg.legend && (
          <div className="rm-legend">
            <div style={{ height: 8, borderRadius: 99, background: cfg.legend.bar }} />
            <div className="rm-legend__labels">{cfg.legend.labels.map((l) => <span key={l}>{l}</span>)}</div>
          </div>
        )}
        <div className={status === 'error' ? 'rm-status__err' : 'rm-status__src'}>
          {status === 'error'
            ? 'No tile source worked for this layer. Open F12 → Console and look for the [RedMap] lines.'
            : used ? `NASA Mars Trek · ${used}` : 'Checking NASA tile sources…'}
        </div>
      </div>
    </div>
  )
}