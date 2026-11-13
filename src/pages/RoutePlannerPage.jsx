import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Compass,
  ShieldAlert,
  FlaskConical,
  Activity,
  Maximize2,
  Minimize2,
  Route as RouteIcon,
  Mountain,
  Eye,
  Layers,
  Globe,
  Thermometer,
  Wind,
  X,
} from 'lucide-react'
import RouteMap from '../components/route/RouteMap'
import RoutePanel from '../components/route/RoutePanel'
import ElevationProfile from '../components/route/ElevationProfile'
import RouteWarnings from '../components/route/RouteWarnings'
import ScienceStops from '../components/route/ScienceStops'
import AbortProtocolCard from '../components/route/AbortProtocolCard'
import EvaTimeline from '../components/route/EvaTimeline'
import VerdictCard from '../components/route/VerdictCard'
import RouteWhy from '../components/route/RouteWhy'
import StreetViewPovCard from '../components/route/StreetViewPovCard'
import PhotoSphereModal from '../components/route/PhotoSphereModal'
import LayerThumb from '../components/map/LayerThumb'
import { LAYER_CATALOG } from '../services/layerService'
import { planEva } from '../lib/evaPlan'
import { fetchNasaSpaceWeather, resolveSpaceWeather } from '../services/spaceWeatherService'
import { buildRouteReconStops } from '../services/surfacePovService'

const LAYER_ICONS = {
  terrain: Globe,
  elevation: Mountain,
  geological: Compass,
  minerals: FlaskConical,
  temperature: Thermometer,
  atmosphere: Wind,
}

const SECTORS = [
  { id: 'gale', label: 'Gale Crater', startId: 'gediz', destId: 'boxwork' },
  { id: 'jezero', label: 'Jezero Crater', startId: 'butler', destId: 'neretva' },
]

const DRAWER_TABS = [
  { id: 'eva', label: 'Suit & EVA', icon: Activity },
  { id: 'hazards', label: 'Terrain & Hazards', icon: ShieldAlert },
  { id: 'science', label: 'Abort & Science', icon: FlaskConical },
]

const MOBILE_SHEET_TABS = [
  { id: 'plan', label: 'Plan Route', icon: RouteIcon },
  { id: 'profile', label: 'Elevation & KPIs', icon: Mountain },
  { id: 'eva', label: 'Suit & EVA', icon: Activity },
  { id: 'hazards', label: 'Terrain & Hazards', icon: ShieldAlert },
  { id: 'science', label: 'Abort & Science', icon: FlaskConical },
]

const SHEET_HEIGHTS = {
  peek: 'h-[64px]',
  half: 'h-[52%]',
  full: 'h-[86%]',
}

function detectSectorForRoute(startId, endId, fallback = 'gale') {
  if (!startId && !endId) return fallback
  const jezIds = new Set(['jezero', 'butler', 'delta', 'neretva', 'nili'])
  if (jezIds.has(startId) || jezIds.has(endId)) return 'jezero'
  const galeIds = new Set(['gale', 'gediz', 'boxwork', 'bradbury', 'yellowknife', 'sulfate'])
  if (galeIds.has(startId) || galeIds.has(endId)) return 'gale'
  return fallback === 'jezero' ? 'jezero' : 'gale'
}

export default function RoutePlannerPage() {
  const [route, setRoute] = useState(null)
  const [preferredSector, setPreferredSector] = useState('gale')
  const [sectorPreset, setSectorPreset] = useState(null)
  const [selected, setSelected] = useState([])
  const [hazard, setHazard] = useState('off') // 'off' | 'slope' | 'low' | 'keep'
  const [layer, setLayer] = useState('terrain')
  const [layersOpen, setLayersOpen] = useState(false)
  const [focus, setFocus] = useState(false)

  // Desktop slide-over right sidebar state (matches ExplorePage & MissionsPage)
  const [drawerTab, setDrawerTab] = useState('eva') // 'eva' | 'hazards' | 'science'
  const [desktopDrawerOpen, setDesktopDrawerOpen] = useState(true)

  // Mobile expandable 3-snap bottom sheet state (matches ExplorePage & MissionsPage)
  const [sheetSnap, setSheetSnap] = useState('peek') // 'peek' | 'half' | 'full'
  const [mobileTab, setMobileTab] = useState('plan') // 'plan' | 'profile' | 'eva' | 'hazards' | 'science'

  // Track desktop (>= 1280px xl breakpoint) so mobile and desktop never double-mount RoutePanel or heavy drawers
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(min-width: 1280px)').matches
      : true
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia('(min-width: 1280px)')
    const onChange = (e) => setIsDesktop(e.matches)
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])

  const [photoSphereState, setPhotoSphereState] = useState({ open: false, visor: false })
  const [evaDate, setEvaDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [travel, setTravel] = useState('foot')
  const [liveWeather, setLiveWeather] = useState(null)
  const [reconIndex, setReconIndex] = useState(0)
  const [flyTarget, setFlyTarget] = useState(null)
  const [scrubIndex, setScrubIndex] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [customWaypoints, setCustomWaypoints] = useState([])
  const [addWaypointMode, setAddWaypointMode] = useState(false)

  const seqRef = useRef(0)
  const desktopScrollRef = useRef(null)
  const mobileScrollRef = useRef(null)
  const touchStartYRef = useRef(null)

  const routeStartId = route?.start?.id
  const routeEndId = route?.end?.id
  const routePoints = route?.points
  const routeStart = route?.start
  const routeEnd = route?.end
  const routeStops = route?.stops
  const routeShelterPoint = route?.shelterPoint
  const routeDistanceKm = route?.distanceKm

  const sectorKey = useMemo(
    () => detectSectorForRoute(routeStartId, routeEndId, preferredSector),
    [routeStartId, routeEndId, preferredSector]
  )

  useEffect(() => {
    let cancelled = false
    fetchNasaSpaceWeather().then((res) => {
      if (!cancelled) setLiveWeather(res)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Allow Escape key to close 360° modal, Layers popover, exit detour waypoint mode, exit full-map focus, or collapse desktop right sidebar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (photoSphereState.open) {
          setPhotoSphereState({ open: false, visor: false })
        } else if (layersOpen) {
          setLayersOpen(false)
        } else if (addWaypointMode) {
          setAddWaypointMode(false)
        } else if (focus) {
          setFocus(false)
        } else if (desktopDrawerOpen) {
          setDesktopDrawerOpen(false)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, photoSphereState.open, layersOpen, addWaypointMode, desktopDrawerOpen])

  const spaceWeather = useMemo(
    () => resolveSpaceWeather('live', liveWeather),
    [liveWeather]
  )

  const plan = useMemo(() => {
    if (!route) return null
    const d = new Date(`${evaDate}T00:00:00Z`)
    return planEva(route, {
      date: Number.isNaN(d.getTime()) ? new Date() : d,
      travel,
      selectedStopIds: selected,
      spaceWeather,
    })
  }, [route, evaDate, travel, selected, spaceWeather])

  const reconStops = useMemo(
    () =>
      routeStart && routePoints?.length
        ? buildRouteReconStops({
            points: routePoints,
            start: routeStart,
            end: routeEnd,
            stops: routeStops,
            shelterPoint: routeShelterPoint,
            distanceKm: routeDistanceKm,
          })
        : [],
    [routePoints, routeStart, routeEnd, routeStops, routeShelterPoint, routeDistanceKm]
  )

  // Advance EVA playback timer along route.points and sync Surface POV stations
  useEffect(() => {
    if (!isPlaying || !routePoints?.length) return
    const totalPts = routePoints.length
    const intervalMs = playSpeed === 2 ? 70 : 140
    const timer = setInterval(() => {
      setScrubIndex((prev) => {
        const cur = prev === null || prev >= totalPts - 1 ? 0 : prev + 1
        const pt = routePoints[cur]
        if (pt && reconStops.length > 0) {
          let bestIdx = 0
          let bestKmDiff = Infinity
          reconStops.forEach((s, idx) => {
            const diff = Math.abs(s.km - pt.km)
            if (diff < bestKmDiff) {
              bestKmDiff = diff
              bestIdx = idx
            }
          })
          setReconIndex(bestIdx)
        }
        if (cur >= totalPts - 1) {
          setIsPlaying(false)
        }
        return cur
      })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [isPlaying, playSpeed, routePoints, reconStops])

  const scrubPoint = useMemo(() => {
    if (scrubIndex === null || !routePoints?.length) return null
    return routePoints[Math.min(routePoints.length - 1, Math.max(0, scrubIndex))]
  }, [routePoints, scrubIndex])

  const handleTogglePlay = () => {
    if (!route?.points?.length) return
    setIsPlaying((prev) => {
      const next = !prev
      if (next && (scrubIndex === null || scrubIndex >= route.points.length - 1)) {
        setScrubIndex(0)
        setReconIndex(0)
      }
      return next
    })
  }

  const handleSelectReconIndex = (nextIdx) => {
    if (!reconStops.length) return
    const clamped = Math.min(reconStops.length - 1, Math.max(0, nextIdx))
    setReconIndex(clamped)
    const target = reconStops[clamped]
    if (target) {
      seqRef.current += 1
      setFlyTarget({ lat: target.lat, lon: target.lon, seq: seqRef.current })
    }
  }

  const handleElevationPointSelect = (pt) => {
    if (!pt) return
    seqRef.current += 1
    setFlyTarget({ lat: pt.lat, lon: pt.lon, seq: seqRef.current })
    if (reconStops.length > 0) {
      let bestIdx = 0
      let bestDiff = Infinity
      reconStops.forEach((s, idx) => {
        const diff = Math.abs(s.km - pt.km)
        if (diff < bestDiff) {
          bestDiff = diff
          bestIdx = idx
        }
      })
      setReconIndex(bestIdx)
    }
  }

  const handleMapPointClick = (entId) => {
    if (!reconStops.length) return
    let idx = -1
    if (entId === 'start') idx = 0
    else if (entId === 'end') idx = reconStops.length - 1
    else if (entId === 'shelter') idx = reconStops.findIndex((s) => s.kind === 'shelter')
    else if (entId.startsWith('s-')) {
      const stopId = entId.slice(2)
      idx = reconStops.findIndex((s) => s.id === stopId)
    } else if (entId.startsWith('wp-')) {
      const n = Number(entId.slice(3))
      const wp = route?.waypoints?.find((w) => w.n === n)
      if (wp) {
        idx = reconStops.findIndex(
          (s) => Math.abs(s.lat - wp.lat) < 0.05 && Math.abs(s.lon - wp.lon) < 0.05
        )
        if (idx === -1) {
          seqRef.current += 1
          setFlyTarget({ lat: wp.lat, lon: wp.lon, seq: seqRef.current })
          return
        }
      }
    }
    if (idx !== -1) {
      handleSelectReconIndex(idx)
    }
  }

  const handleSectorSwitch = (sec) => {
    setPreferredSector(sec.id)
    setCustomWaypoints([])
    setAddWaypointMode(false)
    seqRef.current += 1
    setSectorPreset({
      startId: sec.startId,
      destId: sec.destId,
      mode: 'safe',
      payloadKg: 20,
      seq: seqRef.current,
    })
  }

  const handleAddCustomWaypoint = ({ lat, lon }) => {
    setCustomWaypoints((prev) => {
      if (prev.length >= 4) return prev
      const idx = prev.length + 1
      return [
        ...prev,
        {
          id: `cwp-${Date.now()}-${idx}`,
          name: `Detour WP ${idx}`,
          lat: +lat.toFixed(4),
          lon: +((lon % 360 + 360) % 360).toFixed(4),
        },
      ]
    })
  }

  const handleRemoveCustomWaypoint = (id) => {
    setCustomWaypoints((prev) =>
      prev
        .filter((w) => w.id !== id)
        .map((w, idx) => ({ ...w, name: `Detour WP ${idx + 1}` }))
    )
  }

  const handleClearCustomWaypoints = () => {
    setCustomWaypoints([])
    setAddWaypointMode(false)
  }

  const handleLocateStop = (stop) => {
    if (!stop) return
    seqRef.current += 1
    setFlyTarget({ lat: stop.lat, lon: stop.lon, seq: seqRef.current })
  }

  const handleRouteChange = (r, _alts, meta) => {
    if (meta?.settingsPatch) {
      setRoute((cur) =>
        cur
          ? {
              ...cur,
              settings: { ...cur.settings, ...meta.settingsPatch },
            }
          : cur
      )
      return
    }
    if (meta?.update) {
      if (r) {
        setRoute((cur) => {
          if (
            !cur ||
            cur.mode !== r.mode ||
            cur.start.id !== r.start.id ||
            cur.end.id !== r.end.id
          ) {
            return cur
          }
          // Skip state update if the primary route geometry & risk did not change during background mode refinement
          if (cur.points === r.points && cur.distanceKm === r.distanceKm && cur.risk === r.risk) {
            return cur
          }
          return { ...r, settings: { ...r.settings, ...cur.settings } }
        })
      }
      return
    }
    setRoute(r)
    setFlyTarget(null)
    setIsPlaying(false)
    setScrubIndex(null)
    const stopsList = buildRouteReconStops(r)
    setReconIndex(Math.max(0, stopsList.length - 1))
    if (r?.stops?.length && r.distanceKm < 35) {
      setSelected(r.stops.slice(0, 2).map((s) => s.id))
    } else {
      setSelected([])
    }
  }

  const toggleStop = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // Mobile Bottom Sheet touch/click handlers (matches ExplorePage & MissionsPage)
  const toggleSheetSnap = () => {
    setSheetSnap((prev) => (prev === 'peek' ? 'half' : 'peek'))
  }

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e) => {
    if (touchStartYRef.current === null || !e.changedTouches?.[0]) return
    const dy = touchStartYRef.current - e.changedTouches[0].clientY
    touchStartYRef.current = null
    if (Math.abs(dy) < 28) return
    if (dy > 0) {
      setSheetSnap((prev) => (prev === 'peek' ? 'half' : 'full'))
    } else {
      setSheetSnap((prev) => (prev === 'full' ? 'half' : 'peek'))
    }
  }

  const handleSelectMobileTab = (tabId) => {
    setMobileTab(tabId)
    if (sheetSnap === 'peek') {
      setSheetSnap('half')
    }
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeDesktopTabLabel =
    DRAWER_TABS.find((t) => t.id === drawerTab)?.label || 'Route Details'

  return (
    <div
      className={`rm-page relative h-full w-full overflow-hidden bg-[#07090c] text-white${
        focus ? ' is-focus' : ''
      }${!desktopDrawerOpen ? ' is-drawer-collapsed' : ''}`}
    >
      {/* Full-Viewport 2D Deep-Zoom Map on both Mobile and Desktop */}
      <div className="rm-mapwrap absolute inset-0">
        <RouteMap
          route={route}
          sectorKey={sectorKey}
          hazard={hazard}
          layer={layer}
          selectedStopIds={selected}
          focus={focus}
          activePoint={flyTarget}
          scrubPoint={scrubPoint}
          onSelectPoint={handleMapPointClick}
          addWaypointMode={addWaypointMode}
          onToggleAddWaypointMode={() => setAddWaypointMode((m) => !m)}
          onMapAddWaypoint={handleAddCustomWaypoint}
        />
      </div>

      {/* ================= TOP-LEFT LAYERS BUTTON & POPOVER ================= */}
      <div
        className={`absolute left-2.5 top-2.5 z-30 flex items-center gap-1.5 transition-all duration-300 ease-out ${
          focus ? 'xl:left-4 xl:top-3.5' : 'xl:left-[328px] xl:top-3.5'
        }`}
      >
        <button
          type="button"
          onClick={() => setLayersOpen((prev) => !prev)}
          title="Map Layers"
          aria-label="Map Layers"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-xl backdrop-blur-md transition ${
            layersOpen || layer !== 'terrain'
              ? 'border-red-500/60 bg-red-500/20 text-red-300'
              : 'border-white/12 bg-black/75 text-gray-200 hover:border-white/25 hover:bg-black/90 hover:text-white'
          }`}
        >
          <Layers size={16} className="text-red-400" />
        </button>

        <button
          type="button"
          onClick={() => setFocus((f) => !f)}
          title={focus ? 'Return to Planner Console (Esc)' : 'Expand 2D map to full screen'}
          className={`hidden xl:inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition ${
            focus
              ? 'border-red-500/60 bg-red-500/25 text-white'
              : 'border-white/12 bg-black/75 text-gray-300 hover:border-white/25 hover:bg-black/90 hover:text-white'
          }`}
        >
          {focus ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{focus ? 'Exit Map' : 'Full Map'}</span>
        </button>
      </div>

      {layersOpen && (
        <div
          className={`absolute left-2.5 top-[48px] z-30 w-[280px] rounded-2xl border border-white/12 bg-black/85 p-3 shadow-2xl backdrop-blur-xl sm:w-[300px] ${
            focus ? 'xl:left-4 xl:top-[52px]' : 'xl:left-[328px] xl:top-[52px]'
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/90">
                NASA Data Layers
              </h3>
              <p className="text-[11px] text-gray-400">Multi-mission planetary datasets</p>
            </div>
            <button
              type="button"
              onClick={() => setLayersOpen(false)}
              aria-label="Close Map Layers"
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {LAYER_CATALOG.map((l) => {
              const LIcon = LAYER_ICONS[l.id] || Globe
              const isSelected = layer === l.id
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setLayer(l.id)
                    setLayersOpen(false)
                  }}
                  className={`group overflow-hidden rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/40'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                  }`}
                >
                  <LayerThumb layerId={l.id} grad={l.grad} className="h-[44px]" />
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium">
                    <LIcon
                      size={13}
                      className={isSelected ? 'shrink-0 text-red-400' : 'shrink-0 text-white/60'}
                    />
                    <span className="truncate">{l.short}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ================= COMPACT TOP-MIDDLE SECTOR SWITCHER ================= */}
      <div
        className="absolute left-1/2 top-2.5 z-20 -translate-x-1/2 xl:top-3.5"
        title="Switch Sector"
      >
        <div className="inline-flex items-center rounded-xl border border-white/12 bg-black/75 p-0.5 shadow-xl backdrop-blur-md">
          {SECTORS.map((sec) => {
            const active = sectorKey === sec.id
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSectorSwitch(sec)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                  active
                    ? 'bg-[#e23b2e] text-white shadow-sm'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Compass size={12} className={active ? 'text-white' : 'text-gray-400'} />
                <span>{sec.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ================= DESKTOP PERSISTENT LEFT SIDEBAR + RIGHT DRAWER + BOTTOM DOCK ================= */}
      {isDesktop && (
        <>
          <div className="rm-leftstack hidden xl:flex">
            <RoutePanel
              sectorKey={sectorKey}
              externalPreset={sectorPreset}
              onRouteChange={handleRouteChange}
              customWaypoints={customWaypoints}
              addWaypointMode={addWaypointMode}
              onToggleAddWaypointMode={() => setAddWaypointMode((m) => !m)}
              onRemoveCustomWaypoint={handleRemoveCustomWaypoint}
              onClearCustomWaypoints={handleClearCustomWaypoints}
            />

            <StreetViewPovCard
              reconStops={reconStops}
              activeIndex={reconIndex}
              onSelectIndex={handleSelectReconIndex}
              onOpenStreetView={() => setPhotoSphereState({ open: true, visor: false })}
            />
          </div>

          <button
            type="button"
            onClick={() => setDesktopDrawerOpen(true)}
            title="Open Route Details sidebar"
            aria-label="Open Route Details sidebar"
            className={`hidden xl:flex absolute right-0 top-1/2 z-20 -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-white/15 bg-black/75 py-3 pl-3 pr-2.5 text-xs font-semibold text-gray-200 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out hover:border-red-500/40 hover:bg-black/90 hover:pl-4 hover:text-white ${
              desktopDrawerOpen || focus
                ? 'pointer-events-none translate-x-full opacity-0'
                : 'translate-x-0 opacity-100'
            }`}
          >
            <ChevronLeft size={16} className="text-red-400" />
            <Activity size={14} className="text-red-400" />
            <span className="max-w-[160px] truncate tracking-wide">{activeDesktopTabLabel}</span>
          </button>

          <aside
            className={`hidden xl:flex xl:flex-col xl:absolute xl:right-4 xl:top-4 xl:bottom-auto xl:z-30 xl:w-[356px] xl:h-auto xl:max-h-[calc(100%-3.75rem)] overflow-hidden rounded-2xl border border-white/10 bg-black/75 p-2.5 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out ${
              desktopDrawerOpen && !focus
                ? 'xl:translate-x-0 xl:opacity-100'
                : 'xl:pointer-events-none xl:translate-x-[calc(100%+2rem)] xl:opacity-0'
            }`}
          >
            <div className="rm-drawer__bar shrink-0">
              <div className="rm-drawer__tabs">
                {DRAWER_TABS.map((t) => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`rm-drawer__tab${drawerTab === t.id ? ' is-active' : ''}`}
                      onClick={() => {
                        setDrawerTab(t.id)
                        desktopScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <Icon size={13} />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setDesktopDrawerOpen(false)}
                title="Collapse sidebar (Esc)"
                aria-label="Collapse Route Details sidebar"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div ref={desktopScrollRef} className="rm-drawer__body min-h-0 flex-1 overflow-y-auto">
              {drawerTab === 'eva' && (
                <>
                  <VerdictCard route={route} plan={plan} spaceWeather={spaceWeather} />
                  <EvaTimeline
                    route={route}
                    plan={plan}
                    date={evaDate}
                    onDate={setEvaDate}
                    travel={travel}
                    onTravel={setTravel}
                  />
                </>
              )}

              {drawerTab === 'hazards' && (
                <>
                  <RouteWhy route={route} hazard={hazard} onHazard={setHazard} />
                  <RouteWarnings route={route} />
                </>
              )}

              {drawerTab === 'science' && (
                <>
                  <AbortProtocolCard
                    route={route}
                    plan={plan}
                    spaceWeather={spaceWeather}
                    scrubPoint={scrubPoint}
                    onLocateShelter={() => handleMapPointClick('shelter')}
                  />
                  <ScienceStops
                    route={route}
                    selectedIds={selected}
                    onToggle={toggleStop}
                    onLocateStop={handleLocateStop}
                  />
                </>
              )}
            </div>
          </aside>

          <div className="rm-bottom hidden xl:block">
            <ElevationProfile
              route={route}
              plan={plan}
              spaceWeather={spaceWeather}
              selectedStopIds={selected}
              scrubIndex={scrubIndex}
              isPlaying={isPlaying}
              playSpeed={playSpeed}
              onScrub={setScrubIndex}
              onTogglePlay={handleTogglePlay}
              onChangeSpeed={() => setPlaySpeed((s) => (s === 1 ? 2 : 1))}
              onResetPlay={() => {
                setIsPlaying(false)
                setScrubIndex(null)
              }}
              onSelectPoint={handleElevationPointSelect}
            />
          </div>
        </>
      )}

      {focus && route && (
        <div className="rm-focuschip">
          <strong>
            {route.start.name} → {route.end.name}
          </strong>
          <span>
            {route.distanceKm.toLocaleString()} km · {plan ? plan.totalSols : route.sols} sols ·{' '}
            {route.riskLabel} risk {route.riskIsMinimum ? '≥ ' : ''}
            {route.risk}
          </span>
        </div>
      )}

      {/* ================= MOBILE BOTTOM-LEFT 360° SURFACE VIEW BUTTON & BOTTOM SHEET ================= */}
      {!isDesktop && (
        <>
          {reconStops.length > 0 && !focus && (
            <button
              type="button"
              onClick={() => setPhotoSphereState({ open: true, visor: false })}
              className="absolute bottom-[74px] left-2.5 z-20 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md transition hover:border-red-500/50 hover:bg-black/95 xl:hidden"
            >
              <Eye size={14} className="text-red-400" />
              <span>360° Surface View</span>
            </button>
          )}

          <aside
            className={`absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-3xl border-t border-white/15 bg-black/85 shadow-2xl backdrop-blur-xl transition-[height] duration-300 ease-out xl:hidden ${
              SHEET_HEIGHTS[sheetSnap]
            }`}
          >
            {/* Mobile Drag Handle Bar */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                if (sheetSnap === 'peek') setSheetSnap('half')
              }}
              className="flex shrink-0 cursor-pointer select-none flex-col items-center px-4 pb-2 pt-2"
            >
              <div className="mb-1.5 h-1.5 w-10 rounded-full bg-white/25" />
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-bold text-white">
                    {route ? `${route.start.name} → ${route.end.name}` : 'Route Planner'}
                  </span>
                  {route && (
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] text-gray-300">
                      {route.distanceKm} km · {plan ? plan.totalSols : route.sols} sols
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSheetSnap()
                  }}
                  aria-label={sheetSnap === 'peek' ? 'Expand bottom sheet' : 'Collapse bottom sheet'}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  {sheetSnap === 'peek' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {/* Mobile Bottom Sheet Section Tabs */}
            <div className="flex shrink-0 overflow-x-auto border-b border-white/10 px-3 [scrollbar-width:none]">
              {MOBILE_SHEET_TABS.map((t) => {
                const Icon = t.icon
                const active = mobileTab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectMobileTab(t.id)}
                    className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition ${
                      active
                        ? 'border-red-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Scrollable Mobile Sheet Body */}
            <div
              ref={mobileScrollRef}
              className="rm-mobile-sheet-body min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-6 pt-3"
            >
              <div className={mobileTab === 'plan' ? 'space-y-3' : 'hidden'}>
                <RoutePanel
                  sectorKey={sectorKey}
                  externalPreset={sectorPreset}
                  onRouteChange={handleRouteChange}
                  customWaypoints={customWaypoints}
                  addWaypointMode={addWaypointMode}
                  onToggleAddWaypointMode={() => setAddWaypointMode((m) => !m)}
                  onRemoveCustomWaypoint={handleRemoveCustomWaypoint}
                  onClearCustomWaypoints={handleClearCustomWaypoints}
                  onPlanSuccess={() => {
                    setMobileTab('profile')
                    mobileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
              </div>

              {mobileTab === 'profile' && (
                <ElevationProfile
                  route={route}
                  plan={plan}
                  spaceWeather={spaceWeather}
                  selectedStopIds={selected}
                  scrubIndex={scrubIndex}
                  isPlaying={isPlaying}
                  playSpeed={playSpeed}
                  onScrub={setScrubIndex}
                  onTogglePlay={handleTogglePlay}
                  onChangeSpeed={() => setPlaySpeed((s) => (s === 1 ? 2 : 1))}
                  onResetPlay={() => {
                    setIsPlaying(false)
                    setScrubIndex(null)
                  }}
                  onSelectPoint={handleElevationPointSelect}
                />
              )}

              {mobileTab === 'eva' && (
                <div className="space-y-3">
                  <VerdictCard route={route} plan={plan} spaceWeather={spaceWeather} />
                  <EvaTimeline
                    route={route}
                    plan={plan}
                    date={evaDate}
                    onDate={setEvaDate}
                    travel={travel}
                    onTravel={setTravel}
                  />
                </div>
              )}

              {mobileTab === 'hazards' && (
                <div className="space-y-3">
                  <RouteWhy route={route} hazard={hazard} onHazard={setHazard} />
                  <RouteWarnings route={route} />
                </div>
              )}

              {mobileTab === 'science' && (
                <div className="space-y-3">
                  <AbortProtocolCard
                    route={route}
                    plan={plan}
                    spaceWeather={spaceWeather}
                    scrubPoint={scrubPoint}
                    onLocateShelter={() => handleMapPointClick('shelter')}
                  />
                  <ScienceStops
                    route={route}
                    selectedIds={selected}
                    onToggle={toggleStop}
                    onLocateStop={handleLocateStop}
                  />
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Full-Viewport Interactive 360° Panorama Modal + Optional Spacesuit Visor HUD */}
      <PhotoSphereModal
        open={photoSphereState.open}
        visorActive={photoSphereState.visor}
        onToggleVisor={() =>
          setPhotoSphereState((s) => ({ ...s, visor: !s.visor }))
        }
        onClose={() => setPhotoSphereState({ open: false, visor: false })}
        route={route}
        plan={plan}
        spaceWeather={spaceWeather}
        reconStops={reconStops}
        activeIndex={reconIndex}
        scrubPoint={scrubPoint}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSelectIndex={handleSelectReconIndex}
      />
    </div>
  )
}