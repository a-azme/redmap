import { useRef, useState } from 'react'
import { ChevronRight, Globe, Map, MapPin, Truck, Bookmark } from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
import LocationThumb from '../components/map/LocationThumb'
import locations from '../data/locations.json'
import { useMapStore } from '../store/useMapStore'

const panel = 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md'

const menu = [
  { label: '3D Globe', icon: Globe },
  { label: 'Map View', icon: Map },
  { label: 'Locations', icon: MapPin },
  { label: 'Rover Tracks', icon: Truck },
  { label: 'Bookmarks', icon: Bookmark },
]

const tabs = ['Popular Locations', 'Recent', 'Bookmarks']

export default function ExplorePage() {
  const selected = useMapStore((s) => s.selected)
  const setSelected = useMapStore((s) => s.setSelected)
  const [view, setView] = useState('3D Globe')
  const [tab, setTab] = useState('Popular Locations')
  const rootRef = useRef(null)

  const choose = (loc) => {
    setSelected(loc)
    rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div ref={rootRef} className="relative flex h-full flex-col overflow-y-auto bg-bg text-white lg:block lg:overflow-hidden">
      <div className="relative h-[55vh] min-h-[320px] shrink-0 lg:absolute lg:inset-0 lg:right-[440px] lg:h-auto lg:min-h-0">
        <MarsGlobe locations={locations} focus={selected} onSelect={setSelected} />
        <aside className={`absolute left-2 top-2 z-10 flex overflow-hidden py-1 lg:left-4 lg:top-4 lg:block lg:w-[200px] lg:py-2 ${panel}`}>
          {menu.map(({ label, icon: Icon }) => (
            <button key={label} title={label} aria-label={label} onClick={() => setView(label)} className={`flex items-center gap-3 px-3 py-2.5 text-left text-sm transition lg:w-full lg:px-4 lg:py-3 ${view === label ? 'bg-red-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={18} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </aside>
        <div className={`absolute bottom-2 left-2 z-10 flex gap-3 px-3 py-2 text-xs lg:bottom-6 lg:left-4 lg:gap-6 lg:px-5 lg:py-3 lg:text-sm ${panel}`}>
          <span><span className="text-gray-400">LAT</span> {selected.lat}° N</span>
          <span><span className="text-gray-400">LON</span> {selected.lon}° E</span>
          <span><span className="text-gray-400">ALT</span> {selected.elevation} km</span>
        </div>
      </div>
      <aside className={`relative z-10 m-2 shrink-0 p-4 lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:m-0 lg:w-[420px] lg:overflow-y-auto lg:p-5 ${panel}`}>
        <h2 className="text-xl font-bold">Explore Mars</h2>
        <p className="mb-4 text-sm text-gray-400">Discover locations, explore terrain, and plan your journey.</p>
        <div className="mb-3 flex overflow-x-auto border-b border-white/10">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm sm:px-4 ${tab === t ? 'border-red-500 text-white' : 'border-transparent text-gray-400'}`}>{t}</button>
          ))}
        </div>
        <div className="divide-y divide-white/10">
          {locations.map((loc) => (
            <button key={loc.id} onClick={() => choose(loc)} className={`flex w-full items-center gap-4 rounded-lg px-2 py-4 text-left hover:bg-white/5 ${selected.id === loc.id ? 'bg-white/5' : ''}`}>
              <LocationThumb loc={loc} className="h-16 w-16 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{loc.name}</div>
                <div className="text-xs text-gray-400">{loc.type} • {loc.tag}</div>
                <div className="mt-1 text-xs text-gray-400">{loc.lat}° N, {loc.lon}° E</div>
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
