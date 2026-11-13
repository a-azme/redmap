import { useEffect, useMemo, useRef } from 'react'
import OpenSeadragon from 'openseadragon'
import { Plus, Minus, Crosshair, RotateCcw, MapPin } from 'lucide-react'
import { fmtCoord } from './routeUtils'
import { hazardRectangle, getHazardDataUrl } from '../../lib/hazardImage.js'

// Mars Equirectangular (EPSG:4326) world coordinate helpers for OpenSeadragon:
// Full globe width = 1.0 (-180°..+180°), height = 0.5 (+90°..-90°)
function toLon180(lon) {
  return ((((Number(lon) || 0) + 180) % 360) + 360) % 360 - 180
}

function lonToWorldX(lon) {
  return (toLon180(lon) + 180) / 360
}

function latToWorldY(lat) {
  const clamped = Math.max(-89.9, Math.min(89.9, Number(lat) || 0))
  return (90 - clamped) / 360
}

function worldXToLon(wx) {
  return wx * 360 - 180
}

function worldYToLat(wy) {
  return 90 - wy * 360
}

function bboxToWorldRect({ west, south, east, north }) {
  const x = lonToWorldX(west)
  const y = latToWorldY(north)
  const w = Math.max(0.0002, lonToWorldX(east) - x)
  const h = Math.max(0.0002, latToWorldY(south) - y)
  return new OpenSeadragon.Rect(x, y, w, h)
}

// Predefined bounded EVA operational sectors (100% contained inside the solid interior of each crater's CTX mosaic)
const EVA_SECTORS = {
  gale: {
    id: 'gale',
    label: 'Gale Crater',
    bbox: { west: 136.55, south: -5.65, east: 138.25, north: -4.05 },
    ctxBbox: { west: 135.1842593, south: -6.5732988, east: 139.2413012, north: -2.8077809 },
    defaultPreset: { startId: 'gediz', destId: 'boxwork' },
  },
  jezero: {
    id: 'jezero',
    label: 'Jezero Crater',
    bbox: { west: 76.65, south: 17.65, east: 78.25, north: 18.95 },
    ctxBbox: { west: 75.1537692, south: 15.9058484, east: 78.8717121, north: 19.4453003 },
    defaultPreset: { startId: 'butler', destId: 'neretva' },
  },
}

function computeSectorBounds(sectorKey) {
  return sectorKey === 'jezero' ? EVA_SECTORS.jezero : EVA_SECTORS.gale
}

// Keep OpenSeadragon's TileSource.minLevel = 0 so zoomed-out views never iterate over a huge
// level-6 tile matrix, while enforcing `minZoom` inside `tileExists(level, x, y)`.
function createMarsTileSource({ urlTemplate, maxLevel = 8, bbox = null, minZoom = 0 }) {
  const width = 512 * (1 << maxLevel)
  const height = 256 * (1 << maxLevel)

  return {
    width,
    height,
    tileWidth: 256,
    tileHeight: 256,
    minLevel: 0,
    maxLevel,
    getLevelScale(level) {
      return 1 / (1 << (maxLevel - level))
    },
    getNumTiles(level) {
      return new OpenSeadragon.Point(2 * (1 << level), 1 << level)
    },
    tileExists(level, x, y) {
      if (level < minZoom || level > maxLevel) return false
      const cols = 2 * (1 << level)
      const rows = 1 << level
      if (x < 0 || y < 0 || x >= cols || y >= rows) return false
      if (!bbox) return true
      const tileWest = (x / cols) * 360 - 180
      const tileEast = ((x + 1) / cols) * 360 - 180
      const tileNorth = 90 - (y / rows) * 180
      const tileSouth = 90 - ((y + 1) / rows) * 180
      return !(
        tileEast < bbox.west ||
        tileWest > bbox.east ||
        tileNorth < bbox.south ||
        tileSouth > bbox.north
      )
    },
    getTileUrl(level, x, y) {
      return urlTemplate
        .replace('{z}', String(level))
        .replace('{row}', String(y))
        .replace('{col}', String(x))
    },
  }
}

// Patch a TiledImage so out-of-bbox (`!tileExists`) tiles mark coverage as true,
// preventing OpenSeadragon from simultaneously walking and loading all lower pyramid levels.
function patchTiledImageCoverage(item) {
  if (!item || item._coveragePatched) return
  item._coveragePatched = true
  const origSetCoverage = item._setCoverage
  item._setCoverage = function (coverage, level, x, y, covers) {
    if (!covers && this.source && !this.source.tileExists(level, x, y)) {
      covers = true
    }
    return origSetCoverage.call(this, coverage, level, x, y, covers)
  }
}

function buildLayerStack(layerKey, sectorId) {
  const sector = sectorId === 'jezero' ? EVA_SECTORS.jezero : EVA_SECTORS.gale
  const sectorBbox = sector.ctxBbox

  switch (layerKey) {
    case 'elevation':
      return {
        base: createMarsTileSource({
          urlTemplate:
            'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{row}/{col}.jpg',
          maxLevel: 6,
          minZoom: 4,
          bbox: sectorBbox,
        }),
        overlays: [],
      }
    case 'geological':
      return {
        base: createMarsTileSource({
          urlTemplate:
            'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{row}/{col}.jpg',
          maxLevel: 7,
          minZoom: 4,
          bbox: sectorBbox,
        }),
        overlays: [],
      }
    case 'minerals':
      return {
        base: createMarsTileSource({
          urlTemplate:
            'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{row}/{col}.jpg',
          maxLevel: 7,
          minZoom: 4,
          bbox: sectorBbox,
        }),
        overlays: [
          {
            opacity: 0.68,
            source: createMarsTileSource({
              urlTemplate:
                'https://trek.nasa.gov/tiles/Mars/EQ/TES_Glass_Clay/1.0.0/default/default028mm/{z}/{row}/{col}.png',
              maxLevel: 3,
              bbox: sectorBbox,
            }),
          },
        ],
      }
    case 'temperature':
      return {
        base: createMarsTileSource({
          urlTemplate:
            'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{row}/{col}.png',
          maxLevel: 8,
          minZoom: 4,
          bbox: sectorBbox,
        }),
        overlays: [],
      }
    case 'atmosphere':
      return {
        base: createMarsTileSource({
          urlTemplate:
            'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{row}/{col}.jpg',
          maxLevel: 7,
          minZoom: 4,
          bbox: sectorBbox,
        }),
        overlays: [
          {
            opacity: 0.65,
            source: createMarsTileSource({
              urlTemplate:
                'https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/default/default028mm/{z}/{row}/{col}.png',
              maxLevel: 3,
              bbox: sectorBbox,
            }),
          },
        ],
      }
    case 'terrain':
    default: {
      // Strictly 2 nested layers per crater:
      // 1. Parent Base Layer: Regional CTX Block-Adjusted Mosaic (z = 5..12, covers 100% of sector viewport)
      // 2. Child Overlay Layer: High-Resolution HiRISE Ortho-Mosaic (z = 10..16, 100% contained inside parent CTX)
      if (sector.id === 'jezero') {
        return {
          base: createMarsTileSource({
            urlTemplate:
              'https://trek.nasa.gov/tiles/Mars/EQ/Jezero_CTX_BlockAdj_dd/1.0.0/default/default028mm/{z}/{row}/{col}.png',
            maxLevel: 12,
            minZoom: 5,
            bbox: EVA_SECTORS.jezero.ctxBbox,
          }),
          overlays: [
            {
              opacity: 1,
              source: createMarsTileSource({
                urlTemplate:
                  'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/{z}/{row}/{col}.png',
                maxLevel: 16,
                minZoom: 10,
                bbox: { west: 77.2229331, south: 18.3067994, east: 77.583964, north: 18.669315 },
              }),
            },
          ],
        }
      }

      return {
        base: createMarsTileSource({
          urlTemplate:
            'https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/default/default028mm/{z}/{row}/{col}.png',
          maxLevel: 12,
          minZoom: 5,
          bbox: EVA_SECTORS.gale.ctxBbox,
        }),
        overlays: [
          {
            opacity: 1,
            source: createMarsTileSource({
              urlTemplate:
                'https://trek.nasa.gov/tiles/Mars/EQ/curiosity_hirise_mosaic/1.0.0/default/default028mm/{z}/{row}/{col}.png',
              maxLevel: 16,
              minZoom: 10,
              bbox: { west: 137.1224669, south: -4.9254743, east: 137.7298129, north: -4.2489588 },
            }),
          },
        ],
      }
    }
  }
}

const MAX_ALLOWED_ZOOM = 28000

export default function RouteMap({
  route,
  pendingEndpoints = null,
  sectorKey = 'gale',
  hazard = 'off',
  layer = 'terrain',
  selectedStopIds = [],
  focus = false,
  activePoint = null,
  scrubPoint = null,
  onSelectPoint,
  customWaypoints = [],
  mapPickMode = null,
  onExitPickMode,
  onMapPickPoint,
}) {
  const containerRef = useRef(null)
  const osdRef = useRef(null)
  const viewerRef = useRef(null)
  const lastFitKeyRef = useRef('')
  const sectorRectRef = useRef(null)
  const clampRectRef = useRef(null)
  const activeSectorRef = useRef(null)
  const routeRef = useRef(route)
  const focusRef = useRef(focus)
  const mapPickModeRef = useRef(mapPickMode)
  const onMapPickPointRef = useRef(onMapPickPoint)
  const syncOverlayRef = useRef(null)
  const overlayItemsRef = useRef(null)
  const playheadWorldRef = useRef(null)

  useEffect(() => {
    routeRef.current = route
    focusRef.current = focus
  }, [route, focus])

  useEffect(() => {
    mapPickModeRef.current = mapPickMode
    onMapPickPointRef.current = onMapPickPoint
  }, [mapPickMode, onMapPickPoint])

  // Direct DOM refs for synchronous, zero-lag overlay updates during map pan/zoom
  const hazardImgRef = useRef(null)
  const svgGlowRef = useRef(null)
  const svgLineRef = useRef(null)
  const markerRefs = useRef(new Map())
  const playheadRef = useRef(null)
  const playheadTagRef = useRef(null)
  const scaleLabelRef = useRef(null)
  const scaleBarRef = useRef(null)
  const hoverCoordRef = useRef(null)

  const activeSector = useMemo(() => computeSectorBounds(sectorKey), [sectorKey])
  const layerStack = useMemo(
    () => buildLayerStack(layer, activeSector.id),
    [layer, activeSector.id]
  )

  useEffect(() => {
    activeSectorRef.current = activeSector
    sectorRectRef.current = bboxToWorldRect(activeSector.bbox)
    clampRectRef.current = bboxToWorldRect(activeSector.ctxBbox)
  }, [activeSector])

  const computeRouteWorldRect = (
    r,
    isFocus = focus,
    sec = activeSector
  ) => {
    const sb = sec.bbox
    const cb = sec.ctxBbox
    if (!r?.path?.length) {
      return bboxToWorldRect(sb)
    }
    const lons = r.path.map((p) => toLon180(p.lon))
    const lats = r.path.map((p) => p.lat)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    // Guard against routes belonging to a different crater sector
    if (maxLon < cb.west || minLon > cb.east || maxLat < cb.south || minLat > cb.north) {
      return bboxToWorldRect(sb)
    }

    const spanLon = Math.max(0.06, maxLon - minLon)
    const spanLat = Math.max(0.05, maxLat - minLat)
    const padLon = spanLon * (isFocus ? 0.35 : 0.7)
    const padLat = spanLat * (isFocus ? 0.35 : 0.68)

    const lonShift = isFocus ? 0 : spanLon * 0.02
    const latShift = isFocus ? 0 : -spanLat * 0.12

    const west = Math.max(sb.west, minLon - padLon + lonShift)
    const east = Math.min(sb.east, maxLon + padLon + lonShift)
    const south = Math.max(sb.south, minLat - padLat + latShift)
    const north = Math.min(sb.north, maxLat + padLat + latShift)

    if (east <= west || north <= south) {
      return bboxToWorldRect(sb)
    }

    return bboxToWorldRect({ west, east, south, north })
  }

  const routeHazard = route?.hazard
  const hazardOverlay = useMemo(() => {
    if (hazard === 'off' || !routeHazard) return null
    const r = hazardRectangle(routeHazard)
    if (!r) return null
    const dataUrl = getHazardDataUrl(routeHazard, hazard)
    if (!dataUrl) return null
    return {
      rect: r,
      wx1: lonToWorldX(r.west),
      wy1: latToWorldY(r.north),
      wx2: lonToWorldX(r.east),
      wy2: latToWorldY(r.south),
      dataUrl,
    }
  }, [routeHazard, hazard])

  const routePath = route?.path
  const routeWarnings = route?.warnings
  const routeStops = route?.stops
  const routeCustomWaypoints = route?.customWaypoints
  const routeShelter = route?.shelterPoint
  const routeStart = route?.start
  const routeEnd = route?.end
  const routeDistanceKm = route?.distanceKm

  const isPointInSector = (pt, sector) => {
    if (!pt || typeof pt.lat !== 'number' || typeof pt.lon !== 'number') return false
    const lon = toLon180(pt.lon)
    const cb = sector.ctxBbox
    return lon >= cb.west && lon <= cb.east && pt.lat >= cb.south && pt.lat <= cb.north
  }

  const validPendingStart = isPointInSector(pendingEndpoints?.start, activeSector) ? pendingEndpoints.start : null
  const validPendingEnd = isPointInSector(pendingEndpoints?.end, activeSector) ? pendingEndpoints.end : null
  const effectiveStart = validPendingStart || (isPointInSector(routeStart, activeSector) ? routeStart : null)
  const effectiveEnd = validPendingEnd || (isPointInSector(routeEnd, activeSector) ? routeEnd : null)

  // Precompute world coordinates (wx, wy) strictly for spots belonging to the currently planned path
  const overlayItems = useMemo(() => {
    const checkSector = (pt) => {
      if (!pt || typeof pt.lat !== 'number' || typeof pt.lon !== 'number') return false
      const lon = toLon180(pt.lon)
      const cb = activeSector.ctxBbox
      return lon >= cb.west && lon <= cb.east && pt.lat >= cb.south && pt.lat <= cb.north
    }

    const pathWorld = (routePath || []).map((p) => ({
      wx: lonToWorldX(p.lon),
      wy: latToWorldY(p.lat),
    }))

    const markers = []
    if (routeStart && routeEnd) {
      ;(routeWarnings || [])
        .filter((w) => w.severity !== 'info' && w.toKm - w.fromKm < (routeDistanceKm || 0) - 1)
        .forEach((w) => {
          markers.push({
            id: 'w-' + w.id,
            kind: 'warning',
            badge: '▲',
            label: w.title,
            tooltip: w.title,
            color: w.severity === 'critical' ? '#ff4d4d' : '#f5a524',
            wx: lonToWorldX(w.lon),
            wy: latToWorldY(w.lat),
            priority: 5,
            maxMPerPx: 0, // hover only
          })
        })

      // Strictly include only science stops that lie on the planned route path
      const plannedStops = [...(routeStops || [])].sort((a, b) => a.km - b.km)

      plannedStops.forEach((s, idx) => {
        const on = selectedStopIds.includes(s.id)
        markers.push({
          id: 's-' + s.id,
          kind: 'stop',
          badge: String(idx + 1),
          label: s.title,
          tooltip: `${s.title} (km ${s.km}, ${fmtCoord(s.lat, s.lon)})`,
          color: on ? '#4be08a' : '#f5c518',
          wx: lonToWorldX(s.lon),
          wy: latToWorldY(s.lat),
          priority: 3,
          maxMPerPx: 145,
        })
      })

      if (routeShelter) {
        markers.push({
          id: 'shelter',
          kind: 'shelter',
          badge: 'SH',
          label: 'Radiation Shelter',
          tooltip: `Radiation Shelter (km ${routeShelter.km}, -${routeShelter.shieldingPct}% dose)`,
          color: '#38bdf8',
          wx: lonToWorldX(routeShelter.lon),
          wy: latToWorldY(routeShelter.lat),
          priority: 3,
          maxMPerPx: 130,
        })
      }
    }

    if (effectiveStart) {
      markers.push({
        id: 'start',
        kind: 'start',
        badge: 'S',
        label: effectiveStart.name,
        tooltip: `Start: ${effectiveStart.name} (${fmtCoord(effectiveStart.lat, effectiveStart.lon)})`,
        color: '#2ecc71',
        wx: lonToWorldX(effectiveStart.lon),
        wy: latToWorldY(effectiveStart.lat),
        priority: 1,
        maxMPerPx: 420,
      })
    }

    if (effectiveEnd) {
      markers.push({
        id: 'end',
        kind: 'end',
        badge: 'D',
        label: effectiveEnd.name,
        tooltip: `Destination: ${effectiveEnd.name} (${fmtCoord(effectiveEnd.lat, effectiveEnd.lon)})`,
        color: '#e5322d',
        wx: lonToWorldX(effectiveEnd.lon),
        wy: latToWorldY(effectiveEnd.lat),
        priority: 1,
        maxMPerPx: 420,
      })
    }

    // Custom detour stops placed by the user (snapped to the planned path once routed)
    if (customWaypoints?.length) {
      const routedCustom = routeCustomWaypoints || []
      customWaypoints.forEach((cw, idx) => {
        if (!checkSector(cw)) return
        const matched = routedCustom.find((rc) => rc.id === cw.id) || cw
        const cleanLabel = cw.name || `Detour Stop ${idx + 1}`
        markers.push({
          id: cw.id || `cwp-${idx + 1}`,
          kind: 'custom',
          badge: `D${idx + 1}`,
          label: cleanLabel,
          tooltip: `${cleanLabel} (${fmtCoord(matched.lat, matched.lon)})`,
          color: '#38bdf8',
          wx: lonToWorldX(matched.lon),
          wy: latToWorldY(matched.lat),
          priority: 2,
          maxMPerPx: 240,
        })
      })
    }

    return {
      pathWorld,
      hazardOverlay,
      markers,
    }
  }, [
    routePath,
    routeWarnings,
    routeStops,
    routeCustomWaypoints,
    routeShelter,
    routeStart,
    routeEnd,
    effectiveStart,
    effectiveEnd,
    routeDistanceKm,
    selectedStopIds,
    activeSector,
    hazardOverlay,
    customWaypoints,
  ])

  // Keep ref in sync and immediately project whenever overlayItems changes
  useEffect(() => {
    overlayItemsRef.current = overlayItems
    syncOverlayRef.current?.()
  }, [overlayItems])

  // Synchronously update playhead DOM node when scrubPoint changes without re-rendering markers
  useEffect(() => {
    const el = playheadRef.current
    const tag = playheadTagRef.current
    if (!scrubPoint) {
      playheadWorldRef.current = null
      if (el) el.style.display = 'none'
      return
    }
    const pw = {
      wx: lonToWorldX(scrubPoint.lon),
      wy: latToWorldY(scrubPoint.lat),
      label: `km ${scrubPoint.km.toFixed(1)} · ${scrubPoint.slopeDeg}°`,
    }
    playheadWorldRef.current = pw
    if (tag) tag.textContent = pw.label
    if (el) el.style.display = 'block'

    const vp = viewerRef.current?.viewport
    const container = containerRef.current
    if (vp && container && el) {
      const bounds = vp.getBounds(true)
      const cw = container.clientWidth || 1280
      const ch = container.clientHeight || 720
      if (bounds.width && bounds.height) {
        const x = (((pw.wx - bounds.x) / bounds.width) * cw).toFixed(1)
        const y = (((pw.wy - bounds.y) / bounds.height) * ch).toFixed(1)
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      }
    }
  }, [scrubPoint])

  // 1. Initialize OpenSeadragon 2D Deep-Zoom Viewer once
  useEffect(() => {
    if (!osdRef.current) return

    const viewer = OpenSeadragon({
      element: osdRef.current,
      crossOriginPolicy: 'Anonymous',
      showNavigationControl: false,
      showNavigator: false,
      visibilityRatio: 0,
      constrainDuringPan: false,
      defaultZoomLevel: 1,
      minZoomLevel: 1,
      maxZoomLevel: 65536,
      animationTime: 0.55,
      blendTime: 0.15,
      immediateRender: false,
      imageLoaderLimit: 6,
      maxImageCacheCount: 160,
      timeout: 30000,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        scrollToZoom: true,
        pinchToZoom: true,
        flickEnabled: false,
      },
    })

    // Ensure every TiledImage has coverage patched immediately when added to world (before first draw)
    viewer.world.addHandler('add-item', (event) => {
      patchTiledImageCoverage(event.item)
    })

    // Keep the viewport inside the CTX mosaic boundary (cRect) so the user never sees black void
    // while allowing smooth zoom-out (-) and sector reposition (RotateCcw) without spring stutter.
    const clampToSector = () => {
      const cRect = clampRectRef.current || sectorRectRef.current
      const vp = viewer.viewport
      if (!cRect || !vp) return

      const aspect = Math.max(0.25, vp.getAspectRatio())
      const minAllowedZoom = Math.max(1 / cRect.width, 1 / (cRect.height * aspect))
      const maxAllowedZoom = MAX_ALLOWED_ZOOM

      if (vp.zoomSpring.target.value < minAllowedZoom) {
        vp.zoomSpring.target.value = minAllowedZoom
      } else if (vp.zoomSpring.target.value > maxAllowedZoom) {
        vp.zoomSpring.target.value = maxAllowedZoom
      }

      if (vp.zoomSpring.current.value < minAllowedZoom) {
        vp.zoomSpring.current.value = minAllowedZoom
      } else if (vp.zoomSpring.current.value > maxAllowedZoom) {
        vp.zoomSpring.current.value = maxAllowedZoom
      }

      const clampCenterForZoom = (zoomVal, cx, cy) => {
        const z = Math.max(minAllowedZoom, Math.min(maxAllowedZoom, zoomVal))
        const viewW = 1 / z
        const viewH = viewW / aspect
        const halfW = Math.min(cRect.width * 0.5, viewW * 0.5)
        const halfH = Math.min(cRect.height * 0.5, viewH * 0.5)
        const minX = cRect.x + halfW
        const maxX = cRect.x + cRect.width - halfW
        const minY = cRect.y + halfH
        const maxY = cRect.y + cRect.height - halfH
        return {
          x: minX <= maxX ? Math.max(minX, Math.min(maxX, cx)) : cRect.x + cRect.width * 0.5,
          y: minY <= maxY ? Math.max(minY, Math.min(maxY, cy)) : cRect.y + cRect.height * 0.5,
        }
      }

      const clampedTarget = clampCenterForZoom(
        vp.zoomSpring.target.value,
        vp.centerSpringX.target.value,
        vp.centerSpringY.target.value
      )
      vp.centerSpringX.target.value = clampedTarget.x
      vp.centerSpringY.target.value = clampedTarget.y

      // Only clamp current center if it actually crosses the outer CTX boundary
      const curX = vp.centerSpringX.current.value
      const curY = vp.centerSpringY.current.value
      const clampedCurrent = clampCenterForZoom(vp.zoomSpring.current.value, curX, curY)
      if (Math.abs(clampedCurrent.x - curX) > 1e-6) {
        vp.centerSpringX.current.value = clampedCurrent.x
      }
      if (Math.abs(clampedCurrent.y - curY) > 1e-6) {
        vp.centerSpringY.current.value = clampedCurrent.y
      }
    }

    // Synchronously project all vectors and pins in the exact same paint frame as OpenSeadragon
    const syncOverlay = () => {
      const vp = viewer.viewport
      const container = containerRef.current
      if (!vp || !container) return

      clampToSector()

      const bounds = vp.getBounds(true)
      const center = vp.getCenter(true)
      const cw = container.clientWidth || 1280
      const ch = container.clientHeight || 720
      if (!bounds.width || !bounds.height) return

      const degSpanLon = bounds.width * 360
      const centerLat = worldYToLat(center.y)
      const cosLat = Math.max(0.25, Math.cos((centerLat * Math.PI) / 180))
      const metersAcross = degSpanLon * 59289 * cosLat
      const mPerPx = metersAcross / cw

      // Update Explore-style scale bar synchronously via DOM refs
      const targetM = mPerPx * 76
      const niceSteps = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
      let niceM = niceSteps[0]
      for (let i = 0; i < niceSteps.length; i++) {
        if (niceSteps[i] <= targetM) niceM = niceSteps[i]
        else break
      }
      const barPx = Math.round(Math.max(42, Math.min(96, niceM / Math.max(0.05, mPerPx))))
      const scaleLabel =
        niceM >= 1000 ? `${(niceM / 1000).toLocaleString()} km` : `${Math.round(niceM)} m`

      if (scaleLabelRef.current) {
        scaleLabelRef.current.textContent = scaleLabel
      }
      if (scaleBarRef.current) {
        scaleBarRef.current.style.width = `${barPx}px`
      }

      const items = overlayItemsRef.current
      if (!items) return

      const toPxX = (wx) => ((wx - bounds.x) / bounds.width) * cw
      const toPxY = (wy) => ((wy - bounds.y) / bounds.height) * ch

      // 1. Update SVG route polyline synchronously
      if (svgGlowRef.current && svgLineRef.current) {
        if (items.pathWorld.length > 0) {
          let pts = ''
          for (let i = 0; i < items.pathWorld.length; i++) {
            const p = items.pathWorld[i]
            const x = toPxX(p.wx).toFixed(1)
            const y = toPxY(p.wy).toFixed(1)
            pts += (i === 0 ? '' : ' ') + `${x},${y}`
          }
          svgGlowRef.current.setAttribute('points', pts)
          svgLineRef.current.setAttribute('points', pts)
        } else {
          svgGlowRef.current.setAttribute('points', '')
          svgLineRef.current.setAttribute('points', '')
        }
      }

      // 2. Update hazard image overlay synchronously
      if (hazardImgRef.current && items.hazardOverlay) {
        const x1 = toPxX(items.hazardOverlay.wx1)
        const y1 = toPxY(items.hazardOverlay.wy1)
        const x2 = toPxX(items.hazardOverlay.wx2)
        const y2 = toPxY(items.hazardOverlay.wy2)
        const left = Math.min(x1, x2)
        const top = Math.min(y1, y2)
        const width = Math.abs(x2 - x1)
        const height = Math.abs(y2 - y1)
        hazardImgRef.current.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`
        hazardImgRef.current.style.width = `${width.toFixed(1)}px`
        hazardImgRef.current.style.height = `${height.toFixed(1)}px`
      }

      // 3 & 4. Position route markers and context pins centered strictly on their dots,
      // and apply zoom-adaptive + collision-free label visibility so labels never overlap or hide the route
      const placedBoxes = []
      const markerEntries = []

      for (let i = 0; i < items.markers.length; i++) {
        const m = items.markers[i]
        const el = markerRefs.current.get(m.id)
        if (!el) continue
        const x = toPxX(m.wx)
        const y = toPxY(m.wy)
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
        // Reserve the circular dot box itself so subsequent labels don't cover route dots
        placedBoxes.push({
          left: x - 11,
          right: x + 11,
          top: y - 11,
          bottom: y + 11,
        })
        markerEntries.push({ m, el, x, y })
      }

      // Sort route markers by priority (1: Start/End -> 2: Custom Detour -> 3: Stop/Shelter -> 4: Waypoint)
      markerEntries.sort((a, b) => (a.m.priority || 9) - (b.m.priority || 9))

      const tryPlaceLabelBox = (x, y, text, dotRadius = 14) => {
        const w = Math.min(165, (text?.length || 6) * 6.2 + 14)
        const left = x + dotRadius
        const right = left + w
        const top = y - 10
        const bottom = y + 10
        for (let j = 0; j < placedBoxes.length; j++) {
          const b = placedBoxes[j]
          if (!(right < b.left || left > b.right || bottom < b.top || top > b.bottom)) {
            return false
          }
        }
        placedBoxes.push({ left, right, top, bottom })
        return true
      }

      for (let i = 0; i < markerEntries.length; i++) {
        const { m, el, x, y } = markerEntries[i]
        const withinZoom = mPerPx <= (m.maxMPerPx ?? 0)
        const canShow = withinZoom && tryPlaceLabelBox(x, y, m.label, 14)
        if (canShow) {
          el.classList.add('is-always')
        } else {
          el.classList.remove('is-always')
        }
      }

      // 4. Update playhead synchronously
      const pw = playheadWorldRef.current
      if (playheadRef.current && pw) {
        const x = toPxX(pw.wx).toFixed(1)
        const y = toPxY(pw.wy).toFixed(1)
        playheadRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      }
    }

    syncOverlayRef.current = syncOverlay

    viewer.addHandler('open', () => {
      const curRoute = routeRef.current
      const curSec = activeSectorRef.current || activeSector
      const targetRect = curRoute
        ? computeRouteWorldRect(curRoute, focusRef.current, curSec)
        : bboxToWorldRect(curSec.bbox)
      viewer.viewport.fitBounds(targetRect, true)
      syncOverlay()
    })
    viewer.addHandler('canvas-click', (event) => {
      if (!mapPickModeRef.current || !event.quick || !viewer.viewport) return
      const vpPoint = viewer.viewport.pointFromPixel(event.position)
      const sec = activeSectorRef.current || EVA_SECTORS.gale
      const rawLat = worldYToLat(vpPoint.y)
      const rawLon = ((worldXToLon(vpPoint.x) % 360) + 360) % 360
      const clampedLat = Math.max(sec.bbox.south + 0.02, Math.min(sec.bbox.north - 0.02, rawLat))
      const clampedLon = Math.max(sec.bbox.west + 0.02, Math.min(sec.bbox.east - 0.02, rawLon))
      onMapPickPointRef.current?.({ lat: clampedLat, lon: clampedLon })
    })
    viewer.addHandler('animation-start', syncOverlay)
    viewer.addHandler('animation', syncOverlay)
    viewer.addHandler('animation-finish', syncOverlay)
    viewer.addHandler('update-viewport', syncOverlay)
    viewer.addHandler('pan', syncOverlay)
    viewer.addHandler('zoom', syncOverlay)
    viewer.addHandler('resize', syncOverlay)

    viewerRef.current = viewer
    return () => {
      syncOverlayRef.current = null
      viewer.destroy()
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Load multi-resolution tile pyramid in deterministic order whenever `layerStack` changes
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    let cancelled = false
    const prevSectorId = viewer._lastSectorId
    const sameSector = prevSectorId === activeSector.id
    const prevBounds =
      sameSector && viewer.viewport && viewer.world.getItemCount() > 0
        ? viewer.viewport.getBounds(true)
        : null
    viewer._lastSectorId = activeSector.id

    // Synchronously update sector clamp refs and position viewport before adding new tiles
    activeSectorRef.current = activeSector
    sectorRectRef.current = bboxToWorldRect(activeSector.bbox)
    clampRectRef.current = bboxToWorldRect(activeSector.ctxBbox)

    if (!sameSector && viewer.viewport) {
      lastFitKeyRef.current = ''
      const initialRect = routeRef.current
        ? computeRouteWorldRect(routeRef.current, focusRef.current, activeSector)
        : bboxToWorldRect(activeSector.bbox)
      viewer.viewport.fitBounds(initialRect, true)
    }

    viewer.world.removeAll()

    const addOverlayAt = (idx) => {
      if (cancelled || idx >= layerStack.overlays.length) {
        syncOverlayRef.current?.()
        return
      }
      const ov = layerStack.overlays[idx]
      viewer.addTiledImage({
        tileSource: ov.source,
        x: 0,
        y: 0,
        width: 1,
        opacity: ov.opacity ?? 1,
        success: (event) => {
          patchTiledImageCoverage(event.item)
          addOverlayAt(idx + 1)
        },
        error: () => addOverlayAt(idx + 1),
      })
    }

    viewer.addTiledImage({
      tileSource: layerStack.base,
      x: 0,
      y: 0,
      width: 1,
      opacity: 1,
      success: (event) => {
        patchTiledImageCoverage(event.item)
        if (cancelled) return
        if (prevBounds) {
          viewer.viewport.fitBounds(prevBounds, true)
        } else {
          const latestRoute = routeRef.current
          const targetRect = latestRoute
            ? computeRouteWorldRect(latestRoute, focusRef.current, activeSector)
            : bboxToWorldRect(activeSector.bbox)
          viewer.viewport.fitBounds(targetRect, true)
          if (latestRoute) {
            lastFitKeyRef.current = `${latestRoute.start?.id}:${latestRoute.end?.id}:${latestRoute.mode}:${latestRoute.distanceKm}:${focusRef.current ? 1 : 0}:${activeSector.id}`
          }
        }
        syncOverlayRef.current?.()
        addOverlayAt(0)
      },
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerStack])

  // 3. Re-frame bounded sector only when route geometry/endpoints, focus, or sectorKey changes (not on slider settings patches)
  const routeFitKey = route
    ? `${route.start?.id}:${route.end?.id}:${route.mode}:${route.distanceKm}:${focus ? 1 : 0}:${sectorKey}`
    : `none:${focus ? 1 : 0}:${sectorKey}`

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !viewer.viewport) return
    if (lastFitKeyRef.current === routeFitKey) return
    lastFitKeyRef.current = routeFitKey
    if (route) {
      const rect = computeRouteWorldRect(route, focus, activeSector)
      viewer.viewport.fitBounds(rect, false)
      syncOverlayRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeFitKey])

  // 4. Pan/zoom smoothly to activePoint when stepping through 360° Surface POV stations or clicking Elevation chart
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !viewer.viewport || !activePoint) return
    const { lat, lon } = activePoint
    if (typeof lat !== 'number' || typeof lon !== 'number') return

    const d = route && route.distanceKm < 35 ? 0.025 : 0.14
    const targetRect = bboxToWorldRect({
      west: lon - d,
      east: lon + d,
      south: lat - d * 0.75,
      north: lat + d * 0.75,
    })
    viewer.viewport.fitBounds(targetRect, false)
    syncOverlayRef.current?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoint])

  const handleZoom = (factor, e) => {
    e?.currentTarget?.blur()
    const viewer = viewerRef.current
    const vp = viewer?.viewport
    const cRect = clampRectRef.current || sectorRectRef.current
    if (!vp || !cRect) return
    const aspect = Math.max(0.25, vp.getAspectRatio())
    const minZ = Math.max(1 / cRect.width, 1 / (cRect.height * aspect))
    const maxZ = MAX_ALLOWED_ZOOM
    const nextZ = Math.max(minZ, Math.min(maxZ, vp.zoomSpring.target.value * factor))
    vp.zoomTo(nextZ, null, false)
    syncOverlayRef.current?.()
  }

  const handleFitRoute = (e) => {
    e?.currentTarget?.blur()
    const viewer = viewerRef.current
    if (!viewer?.viewport) return
    const rect = route?.path?.length
      ? computeRouteWorldRect(route, focus, activeSector)
      : bboxToWorldRect(activeSector.bbox)
    viewer.viewport.fitBounds(rect, false)
    syncOverlayRef.current?.()
  }

  const handleFitSector = (e) => {
    e?.currentTarget?.blur()
    const viewer = viewerRef.current
    if (!viewer?.viewport) return
    viewer.viewport.fitBounds(bboxToWorldRect(activeSector.bbox), false)
    syncOverlayRef.current?.()
  }

  const handleExitPicker = (e) => {
    e?.currentTarget?.blur()
    onExitPickMode?.()
  }

  const handleMouseMove = (e) => {
    const viewer = viewerRef.current
    const el = hoverCoordRef.current
    if (!viewer?.viewport || !containerRef.current || !el) return
    const rect = containerRef.current.getBoundingClientRect()
    const webPoint = new OpenSeadragon.Point(e.clientX - rect.left, e.clientY - rect.top)
    const vpPoint = viewer.viewport.viewerElementToViewportCoordinates(webPoint)
    el.textContent = fmtCoord(worldYToLat(vpPoint.y), worldXToLon(vpPoint.x))
    el.style.display = ''
  }

  const handleMouseLeave = () => {
    if (hoverCoordRef.current) {
      hoverCoordRef.current.style.display = 'none'
    }
  }

  const pickerBannerText =
    mapPickMode === 'start'
      ? 'Tap map to set Start'
      : mapPickMode === 'dest'
      ? 'Tap map to set Destination'
      : mapPickMode === 'detour'
      ? `Tap map to add stops (${customWaypoints.length}/4)`
      : ''

  return (
    <div
      ref={containerRef}
      className={`rm-map rm-osd-map${focus ? ' rm-map--focus' : ''}${
        mapPickMode ? ' is-adding-wp' : ''
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* OpenSeadragon 2D Deep-Zoom Canvas */}
      <div ref={osdRef} className="rm-osd-canvas" />

      {mapPickMode && (
        <div className="rm-map-addwp-banner">
          <MapPin size={13} className="text-red-400 shrink-0" />
          <span>{pickerBannerText}</span>
          <button type="button" onClick={handleExitPicker}>
            {mapPickMode === 'detour' ? 'Done' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Synchronized Geographic Vector + Hazard Overlay (updated synchronously on every viewport tick) */}
      <div className="rm-osd-overlay">
        {hazardOverlay && (
          <img
            ref={hazardImgRef}
            src={hazardOverlay.dataUrl}
            alt="Terrain hazard overlay"
            className="rm-osd-hazard"
            style={{ left: 0, top: 0 }}
          />
        )}

        <svg className="rm-osd-svg">
          <polyline ref={svgGlowRef} points="" className="rm-osd-route-glow" />
          <polyline ref={svgLineRef} points="" className="rm-osd-route-line" />
        </svg>

        {overlayItems.markers.map((m) => (
          <button
            key={m.id}
            ref={(el) => {
              if (el) markerRefs.current.set(m.id, el)
              else markerRefs.current.delete(m.id)
            }}
            type="button"
            className={`rm-osd-marker rm-osd-marker--${m.kind}`}
            style={{ left: 0, top: 0 }}
            onClick={(e) => {
              e.stopPropagation()
              e.currentTarget.blur()
              onSelectPoint?.(m.id)
            }}
            title={`${m.tooltip || m.label} — Click to centre map & view surface panorama`}
          >
            <span className="rm-osd-marker__dot" style={{ background: m.color }}>
              {m.badge || ''}
            </span>
            <span className="rm-osd-marker__label">{m.label}</span>
          </button>
        ))}

        <div
          ref={playheadRef}
          className="rm-osd-playhead"
          style={{ left: 0, top: 0, display: 'none' }}
        >
          <span className="rm-osd-playhead__pulse" />
          <span className="rm-osd-playhead__dot" />
          <span ref={playheadTagRef} className="rm-osd-playhead__tag" />
        </div>
      </div>

      {/* Map Navigation Controls (+, -, Crosshair, Reposition) — active on press only */}
      <div className="rm-ctrls">
        <button
          type="button"
          onClick={(e) => handleZoom(1.85, e)}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={(e) => handleZoom(1 / 1.85, e)}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={handleFitRoute}
          aria-label="Fit active route"
          title="Center and fit active route"
        >
          <Crosshair size={18} />
        </button>
        <button
          type="button"
          onClick={handleFitSector}
          aria-label="Reposition sector view"
          title={`Reposition to ${activeSector.label} sector overview`}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Bottom-right distance metric scale & coordinate readout (matches ExplorePage) */}
      <div className="pointer-events-none absolute bottom-[74px] right-3 z-20 flex items-center gap-2.5 font-mono text-[11px] tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-all duration-300 ease-out sm:text-xs xl:bottom-4 xl:right-4">
        <span
          ref={hoverCoordRef}
          style={{ display: 'none' }}
          className="hidden rounded-lg border border-white/10 bg-black/65 px-2.5 py-1 text-[11px] text-gray-200 backdrop-blur-md sm:inline-block"
        />
        <div className="flex items-center gap-2">
          <span ref={scaleLabelRef} className="text-[11px] font-medium text-white/90 sm:text-xs">
            2 km
          </span>
          <div
            ref={scaleBarRef}
            className="h-1.5 border-b border-x border-white/90 transition-[width] duration-150"
            style={{ width: '72px' }}
          />
        </div>
      </div>
    </div>
  )
}