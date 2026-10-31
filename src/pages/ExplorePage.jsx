import { useMemo, useRef, useState } from 'react'
import { ChevronRight, Globe, Map, MapPin, Truck, Bookmark } from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
import LocationThumb from '../components/map/LocationThumb'
import { useMarsLocations, DEFAULT_LOCATION } from '../services/marsLocations'
import { useMapStore } from '../store/useMapStore'

const panel = 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md'

const menu = [
  { label: '3D Globe', icon: Globe },
  { label: 'Map View', icon: Map },
  { label: 'Locations', icon: MapPin },
  { label: 'Rover Tracks', icon: Truck },
  { label: 'Bookmarks', icon: Bookmark },
]

const tabs = ['Popular Locations', 'Regions (L1)', 'Landforms (L2)', 'Features (L3)']

const fmtLat = (lat) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`
const fmtLon = (lon) => `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`

export default function ExplorePage() {
  const locations = useMarsLocations()
  const selected = useMapStore((s) => s.selected) || DEFAULT_LOCATION
  const setSelected = useMapStore((s) => s.setSelected)
  const [view, setView] = useState('3D Globe')
  const [mapMode, setMapMode] = useState('3D')
  const [tab, setTab] = useState('Popular Locations')
  const [camState, setCamState] = useState({ altKm: 8000, level: 1 })
  const rootRef = useRef(null)

  const handleMenuClick = (label) => {
    setView(label)
    if (label === '3D Globe') setMapMode('3D')
    else if (label === 'Map View') setMapMode('2D')
  }

  const choose = (loc) => {
    setSelected({ ...loc })
    rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filteredList = useMemo(() => {
    if (tab === 'Regions (L1)') return locations.filter((l) => l.level === 1)
    if (tab === 'Landforms (L2)') return locations.filter((l) => l.level === 2)
    if (tab === 'Features (L3)') return locations.filter((l) => l.level === 3)
    // Popular Locations: NASA priority landmarks & mission hubs
    const priorityOrder = ['jezero', 'olympus', 'valles', 'hellas', 'gale', 'gusev', 'nili', 'isidis', 'tyrrhena', 'syrtis']
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

  return (
    <div ref={rootRef} className="relative flex h-full flex-col overflow-y-auto bg-bg text-white lg:block lg:overflow-hidden">
      <div className="relative h-[55vh] min-h-[320px] shrink-0 lg:absolute lg:inset-0 lg:right-[440px] lg:h-auto lg:min-h-0">
        <MarsGlobe
          locations={locations}
          focus={selected}
          onSelect={setSelected}
          mode={mapMode}
          layer={view === 'Rover Tracks' ? 'missions' : undefined}
          onCameraChange={(altKm, level) => setCamState({ altKm, level })}
          onCenter={() => setSelected({ ...selected })}
          onReset={() => setSelected(DEFAULT_LOCATION)}
        />
        <aside className={`absolute left-2 top-2 z-10 flex overflow-hidden py-1 lg:left-4 lg:top-4 lg:block lg:w-[200px] lg:py-2 ${panel}`}>
          {menu.map(({ label, icon: Icon }) => (
            <button key={label} title={label} aria-label={label} onClick={() => handleMenuClick(label)} className={`flex items-center gap-3 px-3 py-2.5 text-left text-sm transition lg:w-full lg:px-4 lg:py-3 ${view === label ? 'bg-red-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={18} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </aside>
        <div className={`absolute bottom-2 right-2 z-20 flex flex-wrap gap-3 px-3 py-2 text-xs lg:bottom-6 lg:right-4 lg:gap-5 lg:px-5 lg:py-3 lg:text-sm ${panel}`}>
          <span><span className="text-gray-400">LAT</span> {fmtLat(selected.lat)}</span>
          <span><span className="text-gray-400">LON</span> {fmtLon(selected.lon)}</span>
          <span><span className="text-gray-400">SPAN</span> {selected.diameter > 0 ? `${selected.diameter} km` : 'Hub'}</span>
          <span><span className="text-gray-400">ALT</span> {camState.altKm.toLocaleString()} km <span className="text-xs text-gray-400">(L{camState.level})</span></span>
        </div>
      </div>
      <aside className={`relative z-10 m-2 shrink-0 p-4 lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:m-0 lg:w-[420px] lg:overflow-y-auto lg:p-5 ${panel}`}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Explore Mars</h2>
          <span className="text-xs text-gray-400">{locations.length} features</span>
        </div>
        <p className="mb-4 text-sm text-gray-400">Discover planetary regions, craters, canyons, and mission hubs across zoom levels.</p>
        <div className="mb-3 flex overflow-x-auto border-b border-white/10 [scrollbar-width:none]">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs sm:text-sm ${tab === t ? 'border-red-500 text-white' : 'border-transparent text-gray-400'}`}>{t}</button>
          ))}
        </div>
        <div className="divide-y divide-white/10">
          {filteredList.map((loc) => (
            <button key={loc.id} onClick={() => choose(loc)} className={`flex w-full items-center gap-3.5 rounded-lg px-2 py-3.5 text-left hover:bg-white/5 ${selected.id === loc.id ? 'bg-white/5' : ''}`}>
              <LocationThumb loc={loc} className="h-14 w-14 rounded-lg" />
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
                  {loc.type} • {loc.diameter > 0 ? `Ø ${loc.diameter} km` : 'Landing Site'}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-400">
                  {fmtLat(loc.lat)}, {fmtLon(loc.lon)} • {loc.min_alt_km}–{loc.max_alt_km} km
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-gray-400" />
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-gradient-to-r from-red-900/60 to-black/40 p-5">
          <div className="font-bold">Explore. Plan. Discover.</div>
          <div className="text-sm text-gray-400">The Red Planet is waiting.</div>
        </div>
      </aside>
    </div>
  )
}
