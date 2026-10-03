import { useState } from 'react'
import { ChevronRight, Globe, Map, MapPin, Truck, Bookmark } from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
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

  return (
    <div className="relative h-full overflow-hidden bg-bg text-white">
      {/* Globe */}
      <div className="absolute inset-0 right-[440px]">
        <MarsGlobe locations={locations} focus={selected} onSelect={setSelected} />
      </div>

      {/* Left menu */}
      <aside className={`absolute left-4 top-4 w-[200px] py-2 ${panel}`}>
        {menu.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setView(label)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
              view === label ? 'bg-red-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </aside>

      {/* LAT / LON / ALT */}
      <div className={`absolute bottom-6 left-4 flex gap-6 px-5 py-3 text-sm ${panel}`}>
        <span><span className="text-gray-400">LAT</span> {selected.lat}° N</span>
        <span><span className="text-gray-400">LON</span> {selected.lon}° E</span>
        <span><span className="text-gray-400">ALT</span> {selected.elevation} km</span>
      </div>

      {/* Right: Explore Mars */}
      <aside className={`absolute bottom-4 right-4 top-4 w-[420px] overflow-y-auto p-5 ${panel}`}>
        <h2 className="text-xl font-bold">Explore Mars</h2>
        <p className="mb-4 text-sm text-gray-400">
          Discover locations, explore terrain, and plan your journey.
        </p>

        <div className="mb-3 flex border-b border-white/10">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                tab === t ? 'border-red-500 text-white' : 'border-transparent text-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="divide-y divide-white/10">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelected(loc)}
              className={`flex w-full items-center gap-4 rounded-lg px-2 py-4 text-left hover:bg-white/5 ${
                selected.id === loc.id ? 'bg-white/5' : ''
              }`}
            >
              <div
                className="h-16 w-16 shrink-0 rounded-lg"
                style={{ background: `linear-gradient(135deg, ${loc.color}, #1a0b08)` }}
              />
              <div className="flex-1">
                <div className="font-semibold">{loc.name}</div>
                <div className="text-xs text-gray-400">{loc.type} • {loc.tag}</div>
                <div className="mt-1 text-xs text-gray-400">{loc.lat}° N, {loc.lon}° E</div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
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