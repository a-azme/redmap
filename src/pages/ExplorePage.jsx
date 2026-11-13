import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Compass,
  FlaskConical,
  Globe,
  Layers,
  Map,
  MapPin,
  Maximize2,
  Mountain,
  Rocket,
  Thermometer,
  Wind,
  X,
} from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
import LocationThumb from '../components/map/LocationThumb'
import LayerThumb from '../components/map/LayerThumb'
import { LAYER_CATALOG } from '../services/layerService'
import {
  useMarsLocations,
  DEFAULT_LOCATION,
} from '../services/marsLocations'
import { buildHorizonFallbackSvg, getPovForStop } from '../services/surfacePovService'
import { useMapStore } from '../store/useMapStore'

const panel = 'rounded-2xl border border-white/10 bg-black/65 backdrop-blur-md'

const LAYER_ICONS = {
  terrain: Globe,
  elevation: Mountain,
  geological: Compass,
  minerals: FlaskConical,
  temperature: Thermometer,
  atmosphere: Wind,
}

const menu = [
  { label: '3D Globe', icon: Globe },
  { label: 'Map View', icon: Map },
  { label: 'Layers', icon: Layers },
  { label: 'Locations', icon: MapPin },
  { label: 'Missions', icon: Rocket },
]

const tabs = ['Popular Locations', 'Regions', 'Landforms', 'Features', 'Missions']

const TYPE_COLOR = { rover: '#ff5a4f', lander: '#f5a524', orbiter: '#5aa9ff' }

const MISSIONS = [
  {
    id: 'perseverance',
    name: 'Perseverance',
    type: 'rover',
    years: '2021–present',
    site: 'Jezero Crater',
    locId: 'jezero',
    lat: 18.44,
    lon: 77.45,
    summary: 'Searching an ancient river delta for signs of past microbial life and caching core samples for return.',
    instruments: ['Mastcam-Z', 'SuperCam', 'PIXL', 'SHERLOC', 'MOXIE', 'RIMFAX', 'MEDA'],
  },
  {
    id: 'curiosity',
    name: 'Curiosity',
    type: 'rover',
    years: '2012–present',
    site: 'Gale Crater',
    locId: 'gale',
    lat: -4.59,
    lon: 137.44,
    summary: 'Showed that Gale Crater and Mount Sharp once had habitable lakebed conditions and organic molecules.',
    instruments: ['ChemCam', 'SAM', 'CheMin', 'Mastcam', 'REMS', 'RAD'],
  },
  {
    id: 'insight',
    name: 'InSight',
    type: 'lander',
    years: '2018–2022',
    site: 'Elysium Planitia',
    locId: 'elysium-planitia',
    lat: 4.5,
    lon: 135.62,
    summary: 'Listened for marsquakes and probed the interior crust, mantle, and liquid core of Mars.',
    instruments: ['SEIS seismometer', 'HP3 heat probe', 'RISE'],
  },
  {
    id: 'opportunity',
    name: 'Opportunity',
    type: 'rover',
    years: '2004–2018',
    site: 'Meridiani Planum',
    locId: 'meridiani',
    lat: -1.95,
    lon: -5.53,
    summary: 'Discovered hematite spherules and minerals formed in liquid water, driving over 45 km.',
    instruments: ['Pancam', 'Mini-TES', 'APXS', 'Mössbauer'],
  },
  {
    id: 'spirit',
    name: 'Spirit',
    type: 'rover',
    years: '2004–2010',
    site: 'Gusev Crater',
    locId: 'gusev',
    lat: -14.57,
    lon: 175.47,
    summary: 'Explored Gusev Crater and the Columbia Hills, discovering silica-rich hydrothermal deposits.',
    instruments: ['Pancam', 'Mini-TES', 'APXS', 'Mössbauer'],
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    type: 'lander',
    years: '2008',
    site: 'Vastitas Borealis',
    lat: 68.22,
    lon: -125.7,
    summary: 'Excavated arctic polygonal soil and confirmed subsurface water ice and perchlorate salts.',
    instruments: ['Robotic arm', 'TEGA', 'MECA', 'Surface camera'],
  },
  {
    id: 'pathfinder',
    name: 'Pathfinder',
    type: 'rover',
    years: '1997',
    site: 'Ares Vallis',
    lat: 19.13,
    lon: -33.22,
    summary: 'Delivered Sojourner, the first wheeled rover to operate on Mars, inside an ancient flood channel.',
    instruments: ['Sojourner rover', 'APXS spectrometer', 'IMP Imager'],
  },
  {
    id: 'viking1',
    name: 'Viking 1',
    type: 'lander',
    years: '1976–1982',
    site: 'Chryse Planitia',
    locId: 'chryse',
    lat: 22.27,
    lon: -47.95,
    summary: 'First long-lived Mars surface lander; returned iconic surface panoramas and soil biology experiments.',
    instruments: ['Lander cameras', 'Biology experiments', 'Meteorology'],
  },
  {
    id: 'viking2',
    name: 'Viking 2',
    type: 'lander',
    years: '1976–1980',
    site: 'Utopia Planitia',
    locId: 'utopia',
    lat: 47.67,
    lon: -134.29,
    summary: 'Twin of Viking 1 in the northern plains; imaged seasonal water-ice frost and analyzed regolith.',
    instruments: ['Lander cameras', 'Biology experiments', 'Meteorology'],
  },
  {
    id: 'mro',
    name: 'Mars Reconnaissance Orbiter',
    type: 'orbiter',
    years: 'Orbit since 2006',
    site: 'Global coverage',
    summary: 'Our sharpest eye on Mars: 25 cm/px surface imaging, mineral spectroscopy, subsurface radar, and weather.',
    instruments: ['HiRISE', 'CTX', 'CRISM', 'SHARAD', 'MCS'],
  },
  {
    id: 'odyssey',
    name: 'Mars Odyssey',
    type: 'orbiter',
    years: 'Orbit since 2001',
    site: 'Global coverage',
    summary: 'Longest-operating Mars spacecraft; maps daytime/nighttime thermal inertia and subsurface hydrogen.',
    instruments: ['THEMIS', 'GRS', 'HEND'],
  },
  {
    id: 'mgs',
    name: 'Mars Global Surveyor',
    type: 'orbiter',
    years: '1997–2006',
    site: 'Global coverage',
    summary: 'Mapped the entire planet via laser altimetry and produced the benchmark MOLA global topographic DEM.',
    instruments: ['MOLA', 'MOC', 'TES'],
  },
  {
    id: 'maven',
    name: 'MAVEN',
    type: 'orbiter',
    years: 'Orbit since 2014',
    site: 'Global coverage',
    summary: 'Studies the upper Martian atmosphere, solar wind stripping, and solar energetic particle events.',
    instruments: ['NGIMS', 'IUVS', 'SEP'],
  },
]

const ORBITAL_DATA = [
  { mission: 'mgs', instrument: 'MOLA', layer: 'Elevation', shows: 'Laser altimetry used for the global topographic DEM and slope hazard model.' },
  { mission: 'mro', instrument: 'HiRISE & CTX', layer: 'Imagery', shows: '25 cm/px and 5 m/px orthomosaics resolving boulders, scarps, and rover tracks.' },
  { mission: 'mro', instrument: 'CRISM', layer: 'Minerals', shows: 'Visible/IR mineral mapping (phyllosilicates, sulfates, and carbonates).' },
  { mission: 'mro', instrument: 'SHARAD', layer: 'Subsurface', shows: 'Radar sounding of buried strata and subsurface water ice.' },
  { mission: 'odyssey', instrument: 'THEMIS', layer: 'Temperature', shows: '100 m/px thermal-infrared imaging of rock abundance and thermal inertia.' },
  { mission: 'maven', instrument: 'SEP & IUVS', layer: 'Atmosphere', shows: 'Upper atmosphere solar particle monitoring and atmospheric escape.' },
]

const missionById = (id) => MISSIONS.find((m) => m.id === id)

const greatCircleKm = (a, b) => {
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLon = (b.lon - a.lon) * r
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 2 * 3389.5 * Math.asin(Math.sqrt(h))
}

const MissionBadge = ({ type }) => (
  <span
    className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize"
    style={{ background: TYPE_COLOR[type] + '22', color: TYPE_COLOR[type] }}
  >
    {type}
  </span>
)

const fmtLat = (lat) => `${Math.abs(Number(lat) || 0).toFixed(2)}° ${(Number(lat) || 0) >= 0 ? 'N' : 'S'}`
const fmtLon = (lon) => `${Math.abs(Number(lon) || 0).toFixed(2)}° ${(Number(lon) || 0) >= 0 ? 'E' : 'W'}`

const SHEET_HEIGHTS = {
  peek: 'max-lg:h-[64px]',
  half: 'max-lg:h-[50%]',
  full: 'max-lg:h-[85%]',
}

const SCALE_STEPS = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]

function getMapScale(altKm) {
  const safeAlt = Math.max(0.05, Number(altKm) || 8000)
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
  const [searchParams, setSearchParams] = useSearchParams()
  const locations = useMarsLocations()
  const storeSelected = useMapStore((s) => s.selected)
  const storeFocus = useMapStore((s) => s.focusTarget)
  const detailsOpen = useMapStore((s) => s.detailsOpen)
  const sheetSnap = useMapStore((s) => s.sheetSnap)
  const desktopDrawerOpen = useMapStore((s) => s.desktopDrawerOpen)
  const setSelected = useMapStore((s) => s.setSelected)
  const clearFocus = useMapStore((s) => s.clearFocus)
  const setDetailsOpen = useMapStore((s) => s.setDetailsOpen)
  const setSheetSnap = useMapStore((s) => s.setSheetSnap)
  const setDesktopDrawerOpen = useMapStore((s) => s.setDesktopDrawerOpen)
  const selectWithDetails = useMapStore((s) => s.selectWithDetails)

  const [view, setView] = useState('3D Globe')
  const [mapMode, setMapMode] = useState('3D')
  const [activeLayer, setActiveLayer] = useState('terrain')
  const [layersOpen, setLayersOpen] = useState(false)
  const [showRovers, setShowRovers] = useState(
    () => searchParams.get('tab') === 'missions'
  )
  const [tab, setTab] = useState(() =>
    searchParams.get('tab') === 'missions' ? 'Missions' : 'Popular Locations'
  )
  const [missionFilter, setMissionFilter] = useState('all')
  const [activeMissionId, setActiveMissionId] = useState(null)
  const [missionHistory, setMissionHistory] = useState([])
  const [failedImgs, setFailedImgs] = useState({})
  const [camState, setCamState] = useState(() => ({
    altKm: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 12000 : 8000,
    level: 1,
  }))
  const [hoverCoord, setHoverCoord] = useState(null)

  const scrollBodyRef = useRef(null)
  const touchStartYRef = useRef(null)

  const selected = useMemo(() => {
    const found = storeSelected && locations.find((l) => l.id === storeSelected.id)
    return { ...(found || storeSelected || DEFAULT_LOCATION) }
  }, [locations, storeSelected])

  const activeMission = useMemo(
    () => (activeMissionId ? missionById(activeMissionId) : null),
    [activeMissionId]
  )

  const missionPov = useMemo(
    () =>
      activeMission && activeMission.lat != null
        ? getPovForStop({
            id: activeMission.id,
            title: activeMission.site,
            lat: activeMission.lat,
            lon: activeMission.lon,
          })
        : null,
    [activeMission]
  )

  const nearbyMissions = useMemo(() => {
    if (!activeMission || activeMission.lat == null) return []
    return MISSIONS.filter((m) => m.lat != null && m.id !== activeMission.id)
      .map((m) => ({ m, km: greatCircleKm(activeMission, m) }))
      .filter((x) => x.km < 2200)
      .sort((a, b) => a.km - b.km)
  }, [activeMission])

  const filteredMissions = useMemo(
    () => MISSIONS.filter((m) => missionFilter === 'all' || m.type === missionFilter),
    [missionFilter]
  )

  // Sync ?tab=missions query param if navigated from /missions redirect
  useEffect(() => {
    if (searchParams.get('tab') === 'missions') {
      setDesktopDrawerOpen(true)
      setSheetSnap((prev) => (prev === 'peek' ? 'half' : prev))
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setDesktopDrawerOpen, setSheetSnap, setSearchParams])

  // Scroll sheet/panel back to top whenever a new location or mission details are opened
  useEffect(() => {
    if (detailsOpen || activeMissionId) {
      scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [detailsOpen, selected.id, activeMissionId])

  // Allow Escape key to close the open desktop Explore Mars drawer or Layers popover
  useEffect(() => {
    if (!desktopDrawerOpen && !layersOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (layersOpen) setLayersOpen(false)
        else setDesktopDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [desktopDrawerOpen, layersOpen, setDesktopDrawerOpen])

  const openMissionDetails = useCallback(
    (mission, pushCurrent = false) => {
      if (!mission) return
      if (pushCurrent && activeMissionId && activeMissionId !== mission.id) {
        setMissionHistory((prev) => [...prev, activeMissionId])
      } else if (!pushCurrent) {
        setMissionHistory([])
      }
      setActiveMissionId(mission.id)
      setDetailsOpen(false)
      setShowRovers(true)
      setDesktopDrawerOpen(true)
      setSheetSnap((prev) => (prev === 'peek' ? 'half' : prev))
      if (mission.lat != null) {
        const matchedLoc = mission.locId && locations.find((l) => l.id === mission.locId)
        setSelected(
          matchedLoc || {
            id: mission.id,
            name: `${mission.name} (${mission.site})`,
            lat: mission.lat,
            lon: mission.lon,
            min_alt_km: 50,
            max_alt_km: 1800,
            diameter: 120,
          }
        )
      }
    },
    [activeMissionId, locations, setDetailsOpen, setDesktopDrawerOpen, setSelected, setSheetSnap]
  )

  const handleMissionBack = () => {
    if (missionHistory.length > 0) {
      const prevId = missionHistory[missionHistory.length - 1]
      const prevMission = missionById(prevId)
      setMissionHistory((prev) => prev.slice(0, -1))
      setActiveMissionId(prevId)
      if (prevMission?.lat != null) {
        const matchedLoc = prevMission.locId && locations.find((l) => l.id === prevMission.locId)
        setSelected(
          matchedLoc || {
            id: prevMission.id,
            name: `${prevMission.name} (${prevMission.site})`,
            lat: prevMission.lat,
            lon: prevMission.lon,
            min_alt_km: 50,
            max_alt_km: 1800,
            diameter: 120,
          }
        )
      }
    } else {
      setActiveMissionId(null)
    }
  }

  const handleMenuClick = (label) => {
    if (label === 'Locations') {
      setActiveMissionId(null)
      if (tab === 'Missions') setTab('Popular Locations')
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
      if (isDesktop) {
        setDesktopDrawerOpen((prev) => (tab === 'Missions' ? true : !prev))
      } else {
        setSheetSnap((prev) => (prev === 'peek' ? 'half' : 'peek'))
      }
      return
    }

    if (label === 'Missions') {
      setDetailsOpen(false)
      setTab('Missions')
      setShowRovers(true)
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
      if (isDesktop) {
        setDesktopDrawerOpen((prev) => (tab !== 'Missions' ? true : !prev))
      } else {
        setSheetSnap((prev) => (prev === 'peek' ? 'half' : prev))
      }
      return
    }

    if (label === 'Layers') {
      setLayersOpen((prev) => !prev)
      return
    }

    setView(label)
    if (label === '3D Globe') setMapMode('3D')
    else if (label === 'Map View') setMapMode('2D')
  }

  const handleSelectLocation = useCallback(
    (loc) => {
      if (!loc) return
      if (loc.isRoverPin) {
        const m = missionById(loc.id)
        if (m) {
          openMissionDetails(m, false)
          return
        }
      }
      setActiveMissionId(null)
      setMissionHistory([])
      selectWithDetails(loc)
    },
    [openMissionDetails, selectWithDetails]
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

  const activeLat = hoverCoord
    ? hoverCoord.lat
    : activeMission && activeMission.lat != null
    ? activeMission.lat
    : selected.lat
  const activeLon = hoverCoord
    ? hoverCoord.lon
    : activeMission && activeMission.lon != null
    ? activeMission.lon
    : selected.lon
  const scale = useMemo(() => getMapScale(camState.altKm), [camState.altKm])
  const effectiveShowRovers = showRovers || tab === 'Missions' || Boolean(activeMissionId)

  const drawerTitle = activeMission
    ? activeMission.name
    : detailsOpen
    ? selected.name
    : tab === 'Missions'
    ? 'NASA Missions'
    : 'Explore Mars'

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-white">
      {/* Full-viewport globe container on both mobile and desktop */}
      <div className="relative h-full w-full lg:absolute lg:inset-0">
        <MarsGlobe
          locations={locations}
          focus={storeFocus}
          onSelect={handleSelectLocation}
          onHoverCoord={setHoverCoord}
          enableCrosshair
          mode={mapMode}
          layer={activeLayer}
          showRovers={effectiveShowRovers}
          showCompass
          compassClassName="bottom-14 left-4 hidden lg:flex"
          legendClassName="bottom-20 left-1/2 -translate-x-1/2 lg:bottom-6"
          onCameraChange={(altKm, level) => setCamState({ altKm, level })}
          onCenter={() => setSelected({ ...selected })}
          onReset={() => {
            setActiveMissionId(null)
            setMissionHistory([])
            clearFocus()
          }}
          controlsClassName={`right-3 top-3 sm:right-4 sm:top-4 transition-all duration-300 ease-out ${
            desktopDrawerOpen ? 'lg:right-[452px] lg:top-4' : 'lg:right-4 lg:top-4'
          }`}
        />

        {/* Top-left mode switcher */}
        <aside
          className={`absolute left-2.5 top-2.5 z-10 flex overflow-hidden py-1 lg:left-4 lg:top-4 lg:block lg:w-[205px] lg:py-2 ${panel}`}
        >
          {menu.map(({ label, icon: Icon }) => {
            const isLocations = label === 'Locations'
            const isMissions = label === 'Missions'
            const isLayers = label === 'Layers'
            const isDrawerShowingMissions = tab === 'Missions' || Boolean(activeMissionId)
            const isActive = isLocations
              ? !isDrawerShowingMissions && (desktopDrawerOpen || sheetSnap !== 'peek')
              : isMissions
              ? isDrawerShowingMissions && (desktopDrawerOpen || sheetSnap !== 'peek')
              : isLayers
              ? layersOpen || activeLayer !== 'terrain' || showRovers
              : view === label
            const activeLayerShort = LAYER_CATALOG.find((l) => l.id === activeLayer)?.short
            return (
              <button
                key={label}
                title={label}
                aria-label={label}
                onClick={() => handleMenuClick(label)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-bold transition lg:w-full lg:px-4 lg:py-2.5 ${
                  isActive
                    ? 'bg-red-500/20 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  <span className="hidden lg:inline">{label}</span>
                </span>
                {isLayers && (
                  <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300 lg:inline">
                    {activeLayerShort}
                  </span>
                )}
                {isMissions && (
                  <span className="hidden rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300 lg:inline">
                    {MISSIONS.length}
                  </span>
                )}
              </button>
            )
          })}
        </aside>

        {/* Compact NASA Map Layers popover anchored below top-left menu */}
        {layersOpen && (
          <div
            className={`absolute left-2.5 top-[58px] z-30 w-[290px] p-3 shadow-2xl sm:w-[310px] lg:left-4 lg:top-[252px] ${panel}`}
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
                const isSelected = activeLayer === l.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveLayer(l.id)}
                    className={`group overflow-hidden rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-red-500 ring-1 ring-red-500/40 bg-red-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                    }`}
                  >
                    <LayerThumb layerId={l.id} grad={l.grad} className="h-[46px]" />
                    <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium">
                      <LIcon
                        size={13}
                        className={isSelected ? 'text-red-400 shrink-0' : 'text-white/60 shrink-0'}
                      />
                      <span className="truncate">{l.short}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Rover & Lander Sites overlay switch */}
            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2.5">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">Rover & Lander Sites</div>
                <div className="text-[10px] text-gray-400">Pin NASA surface missions on map</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={effectiveShowRovers}
                onClick={() => setShowRovers((prev) => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  effectiveShowRovers ? 'bg-red-500' : 'bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    effectiveShowRovers ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Bottom-left live axis / coordinates */}
        <div
          className={`pointer-events-none absolute bottom-[74px] left-2.5 z-20 flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] tabular-nums sm:px-3.5 sm:py-2 sm:text-xs lg:bottom-5 lg:left-4 ${panel}`}
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
        </div>

        {/* Bottom-right distance metric scale (no border or card), smoothly shifts when desktop drawer opens */}
        <div
          className={`pointer-events-none absolute bottom-[74px] right-3 z-20 flex items-center gap-2 font-mono text-[11px] tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-all duration-300 ease-out sm:text-xs lg:bottom-5 ${
            desktopDrawerOpen ? 'lg:right-[452px]' : 'lg:right-4'
          }`}
        >
          <span className="text-[11px] font-medium text-white/90 sm:text-xs">{scale.label}</span>
          <div
            className="h-1.5 border-b border-x border-white/90 transition-[width] duration-150"
            style={{ width: `${scale.widthPx}px` }}
          />
        </div>

        {/* Compact vertically centered right-edge pill tab when desktop drawer is collapsed */}
        <button
          type="button"
          onClick={() => setDesktopDrawerOpen(true)}
          title="Open Explore Mars panel"
          aria-label="Open Explore Mars panel"
          className={`hidden lg:flex absolute right-0 top-1/2 z-20 -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-white/15 bg-black/75 py-3 pl-3 pr-2.5 text-xs font-semibold text-gray-200 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out hover:border-red-500/40 hover:bg-black/90 hover:pl-4 hover:text-white ${
            desktopDrawerOpen
              ? 'pointer-events-none translate-x-full opacity-0'
              : 'translate-x-0 opacity-100'
          }`}
        >
          <ChevronLeft size={16} className="text-red-400" />
          <MapPin size={14} className="text-red-400" />
          <span className="max-w-[160px] truncate tracking-wide">{drawerTitle}</span>
        </button>
      </div>

      {/* Expandable Bottom Sheet on Mobile / Content-Fit Slide-Over Right Drawer on Desktop */}
      <aside
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-3xl border-t border-white/15 bg-black/85 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out lg:bottom-auto lg:left-auto lg:right-4 lg:top-4 lg:h-auto lg:max-h-[calc(100%-2rem)] lg:w-[420px] lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/65 ${
          SHEET_HEIGHTS[sheetSnap]
        } ${
          desktopDrawerOpen
            ? 'lg:translate-x-0 lg:opacity-100'
            : 'lg:pointer-events-none lg:translate-x-[calc(100%+2rem)] lg:opacity-0'
        }`}
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
            <span className="truncate text-sm font-bold text-white">{drawerTitle}</span>
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
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 lg:flex-initial lg:p-5"
        >
          {activeMission ? (
            /* ================= NASA MISSION DETAILS VIEW ================= */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleMissionBack}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopDrawerOpen(false)}
                  title="Collapse panel (Esc)"
                  aria-label="Collapse Explore Mars panel"
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white lg:flex"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold leading-tight">{activeMission.name}</h2>
                  <MissionBadge type={activeMission.type} />
                </div>
                <p className="mt-1 font-mono text-xs text-gray-400">
                  {activeMission.site} · {activeMission.years}
                  {activeMission.lat != null &&
                    ` · ${fmtLat(activeMission.lat)}, ${fmtLon(activeMission.lon)}`}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                  {activeMission.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeMission.instruments.map((inst) => (
                    <span
                      key={inst}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300"
                    >
                      {inst}
                    </span>
                  ))}
                </div>

                {activeMission.locId && (
                  <button
                    type="button"
                    onClick={() => {
                      const loc = locations.find((l) => l.id === activeMission.locId)
                      if (loc) {
                        setActiveMissionId(null)
                        setMissionHistory([])
                        selectWithDetails(loc)
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 hover:text-white"
                  >
                    <MapPin size={13} /> Inspect {activeMission.site} Landform Specs
                  </button>
                )}
              </div>

              {activeMission.lat != null ? (
                <>
                  {missionPov && (
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                      <div className="relative h-36 w-full bg-[#1a0c06]">
                        <img
                          src={
                            failedImgs[missionPov.imageUrl]
                              ? buildHorizonFallbackSvg({ title: activeMission.site })
                              : missionPov.imageUrl
                          }
                          alt={`${activeMission.name} surface view at ${activeMission.site}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImgs((prev) => ({ ...prev, [missionPov.imageUrl]: true }))
                          }
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 py-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
                            <Camera size={12} />
                            <span>
                              {missionPov.camera} · {missionPov.nasaId}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="px-3 py-2 text-xs text-gray-300">{missionPov.caption}</p>
                    </div>
                  )}

                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                      Orbital Datasets Over {activeMission.site}
                    </h3>
                    <div className="mt-2 space-y-2">
                      {ORBITAL_DATA.map((d) => {
                        const orb = missionById(d.mission)
                        if (!orb) return null
                        return (
                          <button
                            key={d.mission + d.instrument}
                            type="button"
                            onClick={() => openMissionDetails(orb, true)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:bg-white/10"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-white">
                                {orb.name} · {d.instrument}
                              </span>
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">
                                {d.layer}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">{d.shows}</p>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {nearbyMissions.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Nearby Surface Missions
                      </h3>
                      <div className="mt-2 space-y-1.5">
                        {nearbyMissions.map(({ m, km }) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => openMissionDetails(m, true)}
                            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs transition hover:bg-white/10"
                          >
                            <span>
                              <strong className="text-white">{m.name}</strong>{' '}
                              <span className="text-gray-400">· {m.site}</span>
                            </span>
                            <span className="font-mono text-gray-400">~{Math.round(km)} km</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <>
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                      Datasets From This Orbiter
                    </h3>
                    <div className="mt-2 space-y-2">
                      {ORBITAL_DATA.filter((d) => d.mission === activeMission.id).map((d) => (
                        <div
                          key={d.instrument}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-white">{d.instrument}</span>
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">
                              {d.layer}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">{d.shows}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                      Inspect At A Surface Landing Site
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {MISSIONS.filter((m) => m.lat != null).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => openMissionDetails(m, true)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200 transition hover:bg-white/10 hover:text-white"
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          ) : detailsOpen ? (
            /* ================= CLEAN LOCATION DETAILS VIEW ================= */
            <div>
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopDrawerOpen(false)}
                  title="Collapse panel (Esc)"
                  aria-label="Collapse Explore Mars panel"
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white lg:flex"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

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
            /* ================= EXPLORE MARS & MISSIONS LIST VIEW ================= */
            <div>
              <div className="hidden items-center justify-between gap-2 lg:mb-1.5 lg:flex">
                <div className="flex items-baseline gap-2.5">
                  <h2 className="text-xl font-bold">
                    {tab === 'Missions' ? 'NASA Missions' : 'Explore Mars'}
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-gray-400">
                    {tab === 'Missions'
                      ? `${MISSIONS.length} missions`
                      : `${locations.length} features`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDesktopDrawerOpen(false)}
                  title="Collapse panel (Esc)"
                  aria-label="Collapse Explore Mars panel"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <p className="mb-3 text-xs text-gray-400 sm:text-sm">
                {tab === 'Missions'
                  ? 'Surface rovers, landers, and orbital spacecraft combined by landing site.'
                  : 'Select a region, landform, feature, or NASA mission on the globe or below.'}
              </p>

              {/* Category Tabs */}
              <div className="mb-3 flex overflow-x-auto border-b border-white/10 [scrollbar-width:none]">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTab(t)
                      if (t === 'Missions') setShowRovers(true)
                    }}
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

              {tab === 'Missions' ? (
                /* Missions Filter + List */
                <div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {['all', 'rover', 'lander', 'orbiter'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setMissionFilter(f)}
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
                          missionFilter === f
                            ? 'bg-red-500 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {filteredMissions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => openMissionDetails(m, false)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-white">
                              {m.name}
                            </span>
                            <MissionBadge type={m.type} />
                          </div>
                          <div className="mt-0.5 truncate text-xs text-gray-400">
                            {m.site} · {m.years}
                          </div>
                        </div>
                        <ChevronRight size={17} className="shrink-0 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Locations List */
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
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
