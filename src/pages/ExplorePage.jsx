import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Globe,
  Map,
  MapPin,
  Maximize2,
  Mountain,
  Thermometer,
  Truck,
  Bookmark,
} from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
import LocationThumb from '../components/map/LocationThumb'
import {
  useMarsLocations,
  DEFAULT_LOCATION,
} from '../services/marsLocations'
import { useMapStore } from '../store/useMapStore'

const panel = 'rounded-2xl border border-white/10 bg-black/65 backdrop-blur-md'

const menu = [
  { label: '3D Globe', icon: Globe },
  { label: 'Map View', icon: Map },
  { label: 'Locations', icon: MapPin },
  { label: 'Rover Tracks', icon: Truck },
  { label: 'Bookmarks', icon: Bookmark },
]

const tabs = ['Popular Locations', 'Regions', 'Landforms', 'Features']

const fmtLat = (lat) => `${Math.abs(Number(lat) || 0).toFixed(2)}° ${(Number(lat) || 0) >= 0 ? 'N' : 'S'}`
const fmtLon = (lon) => `${Math.abs(Number(lon) || 0).toFixed(2)}° ${(Number(lon) || 0) >= 0 ? 'E' : 'W'}`

const SHEET_HEIGHTS = {
  peek: 'h-[64px]',
  half: 'h-[50%]',
  full: 'h-[85%]',
}

const SCALE_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

function getMapScale(altKm) {
  const safeAlt = Math.max(0.5, Number(altKm) || 8000)
  // Approximate ground span for a ~72px scale bar at current camera altitude
  const rawKm = safeAlt * 0.125
  let step = SCALE_STEPS[0]
  for (let i = 0; i < SCALE_STEPS.length; i++) {
    if (SCALE_STEPS[i] <= rawKm) {
      step = SCALE_STEPS[i]
    } else {
      break
    }
  }
  const widthPx = Math.round(Math.max(42, Math.min(96, (step / rawKm) * 76)))
  const label = step < 1 ? `${Math.round(step * 1000)} m` : `${step.toLocaleString()} km`
  return { label, widthPx }
}

export default function ExplorePage() {
  const locations = useMarsLocations()
  const storeSelected = useMapStore((s) => s.selected)
  const detailsOpen = useMapStore((s) => s.detailsOpen)
  const sheetSnap = useMapStore((s) => s.sheetSnap)
  const setSelected = useMapStore((s) => s.setSelected)
  const setDetailsOpen = useMapStore((s) => s.setDetailsOpen)
  const setSheetSnap = useMapStore((s) => s.setSheetSnap)
  const selectWithDetails = useMapStore((s) => s.selectWithDetails)

  const [view, setView] = useState('3D Globe')
  const [mapMode, setMapMode] = useState('3D')
  const [tab, setTab] = useState('Popular Locations')
  const [camState, setCamState] = useState({ altKm: 8000, level: 1 })
  const [hoverCoord, setHoverCoord] = useState(null)

  const scrollBodyRef = useRef(null)
  const touchStartYRef = useRef(null)

  const selected = useMemo(() => {
    const found = storeSelected && locations.find((l) => l.id === storeSelected.id)
    return { ...(found || storeSelected || DEFAULT_LOCATION) }
  }, [locations, storeSelected])

  // Scroll sheet/panel back to top whenever a new location's details are opened
  useEffect(() => {
    if (detailsOpen) {
      scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [detailsOpen, selected.id])

  const handleMenuClick = (label) => {
    setView(label)
    if (label === '3D Globe') setMapMode('3D')
    else if (label === 'Map View') setMapMode('2D')
    else if (label === 'Locations') {
      setDetailsOpen(false)
      setSheetSnap((prev) => (prev === 'peek' ? 'half' : prev))
    }
  }

  const handleSelectLocation = useCallback(
    (loc) => {
      if (!loc) return
      selectWithDetails(loc)
    },
    [selectWithDetails]
  )

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

  const filteredList = useMemo(() => {
    if (tab === 'Regions') return locations.filter((l) => l.level === 1)
    if (tab === 'Landforms') return locations.filter((l) => l.level === 2)
    if (tab === 'Features') return locations.filter((l) => l.level === 3)
    const priorityOrder = [
      'jezero',
      'olympus',
      'valles',
      'hellas',
      'gale',
      'gusev',
      'nili',
      'isidis',
      'tyrrhena',
      'syrtis',
    ]
    return locations
      .filter((l) => l.is_nasa || priorityOrder.includes(l.id))
      .sort((a, b) => {
        const ia = priorityOrder.indexOf(a.id)
        const ib = priorityOrder.indexOf(b.id)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return (b.diameter || 0) - (a.diameter || 0)
      })
  }, [locations, tab])

  const activeLat = hoverCoord ? hoverCoord.lat : selected.lat
  const activeLon = hoverCoord ? hoverCoord.lon : selected.lon
  const scale = useMemo(() => getMapScale(camState.altKm), [camState.altKm])

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-white">
      {/* Full-height globe container on mobile; left of sidebar on desktop */}
      <div className="relative h-full w-full lg:absolute lg:inset-0 lg:right-[440px] lg:w-auto">
        <MarsGlobe
          locations={locations}
          focus={selected}
          onSelect={handleSelectLocation}
          onHoverCoord={setHoverCoord}
          enableCrosshair
          mode={mapMode}
          layer={view === 'Rover Tracks' ? 'missions' : undefined}
          onCameraChange={(altKm, level) => setCamState({ altKm, level })}
          onCenter={() => setSelected({ ...selected })}
          onReset={() => {
            setSelected(DEFAULT_LOCATION)
            setDetailsOpen(false)
          }}
        />

        {/* Top-left mode switcher */}
        <aside
          className={`absolute left-2.5 top-2.5 z-10 flex overflow-hidden py-1 lg:left-4 lg:top-4 lg:block lg:w-[200px] lg:py-2 ${panel}`}
        >
          {menu.map(({ label, icon: Icon }) => (
            <button
              key={label}
              title={label}
              aria-label={label}
              onClick={() => handleMenuClick(label)}
              className={`flex items-center gap-3 px-3 py-2.5 text-left text-sm font-bold transition lg:w-full lg:px-4 lg:py-3 ${
                view === label
                  ? 'bg-red-500/20 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </aside>

        {/* Bottom-right live coordinates & distance scale HUD */}
        <div
          className={`pointer-events-none absolute bottom-[74px] right-2.5 z-20 flex items-center gap-2.5 px-3 py-1.5 font-mono text-[11px] tabular-nums sm:gap-3.5 sm:px-3.5 sm:py-2 sm:text-xs lg:bottom-5 lg:right-4 ${panel}`}
        >
          <span
            className={`flex items-center font-sans text-xs font-bold leading-none ${
              hoverCoord ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            {hoverCoord ? '+' : <MapPin size={11} />}
          </span>
          <span>
            {fmtLat(activeLat)}, {fmtLon(activeLon)}
          </span>
          <span className="text-white/20">·</span>
          {/* Distance Metric Scale Bar */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-300 sm:text-[11px]">{scale.label}</span>
            <div
              className="h-1.5 border-b border-x border-white/80 transition-[width] duration-150"
              style={{ width: `${scale.widthPx}px` }}
            />
          </div>
        </div>
      </div>

      {/* Expandable Bottom Sheet on Mobile / Right Panel on Desktop */}
      <aside
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-3xl border-t border-white/15 bg-black/85 shadow-2xl backdrop-blur-xl transition-[height] duration-300 ease-out lg:bottom-4 lg:left-auto lg:right-4 lg:top-4 lg:h-auto lg:w-[420px] lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/65 ${SHEET_HEIGHTS[sheetSnap]}`}
      >
        {/* Mobile Bottom Sheet Drag Handle Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (sheetSnap === 'peek') setSheetSnap('half')
          }}
          className="flex shrink-0 cursor-pointer select-none flex-col items-center px-4 pb-2 pt-2 lg:hidden"
        >
          <div className="mb-1.5 h-1.5 w-10 rounded-full bg-white/25" />
          <div className="flex w-full items-center justify-between gap-2">
            <span className="truncate text-sm font-bold text-white">
              {detailsOpen ? selected.name : 'Explore Mars'}
            </span>
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

        {/* Scrollable Sheet / Sidebar Body */}
        <div
          ref={scrollBodyRef}
          className="flex-1 overflow-y-auto px-4 pb-6 pt-2 lg:p-5"
        >
          {detailsOpen ? (
            /* ================= CLEAN LOCATION DETAILS VIEW ================= */
            <div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="mb-3.5 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={14} /> Back
              </button>

              {/* Location Header */}
              <div className="flex items-center gap-3.5">
                <LocationThumb loc={selected} className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-bold leading-tight">{selected.name}</h2>
                    {selected.is_nasa && (
                      <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                        NASA
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-300">{selected.type}</div>
                  <div className="mt-1 flex items-center gap-1 font-mono text-xs tabular-nums text-gray-400">
                    <MapPin size={12} className="shrink-0 text-red-400" />
                    <span>
                      {fmtLat(selected.lat)}, {fmtLon(selected.lon)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="mt-3.5 border-b border-white/10 pb-3.5 text-sm leading-relaxed text-gray-300">
                {selected.desc}
              </p>

              {/* Key Planetary Specs */}
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                {[
                  ['Terrain', selected.terrain, Globe],
                  [
                    'Span',
                    selected.diameter > 0 ? `${selected.diameter.toLocaleString()} km` : 'Landing Site',
                    Maximize2,
                  ],
                  ['Elevation', `${selected.elevation} km`, Mountain],
                  ['Surface Temp', `${selected.temp}°C`, Thermometer],
                ].map(([label, value, Icon]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-gray-200">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-gray-400">{label}</div>
                      <div className="truncate text-xs font-medium text-white">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Related Mission */}
              {selected.mission && (
                <div className="mt-3.5 flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold tracking-wider text-white">
                    NASA
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-xs font-semibold text-white">{selected.mission.name}</div>
                      <div className="font-mono text-[11px] tabular-nums text-gray-400">
                        {selected.mission.years}
                      </div>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-gray-300">
                      {selected.mission.note}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= EXPLORE MARS LIST VIEW ================= */
            <div>
              <div className="hidden items-baseline justify-between gap-2 lg:mb-1 lg:flex">
                <h2 className="text-xl font-bold">Explore Mars</h2>
                <span className="font-mono text-xs tabular-nums text-gray-400">
                  {locations.length} features
                </span>
              </div>
              <p className="mb-3 text-xs text-gray-400 sm:text-sm">
                Select a region, landform, or feature on the globe or from the list below.
              </p>

              {/* Category Tabs */}
              <div className="mb-3 flex overflow-x-auto border-b border-white/10 [scrollbar-width:none]">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition sm:text-sm ${
                      tab === t
                        ? 'border-red-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Locations List */}
              <div className="divide-y divide-white/10">
                {filteredList.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className={`flex w-full items-center gap-3.5 rounded-lg px-2 py-3 text-left transition hover:bg-white/5 ${
                      selected.id === loc.id ? 'bg-white/5' : ''
                    }`}
                  >
                    <LocationThumb loc={loc} className="h-12 w-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{loc.name}</span>
                        {loc.is_nasa && (
                          <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                            NASA
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        {loc.type} · {loc.diameter > 0 ? `Ø ${loc.diameter} km` : 'Landing Site'}
                      </div>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
