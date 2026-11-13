import { useState } from 'react'
import {
  Mountain, Layers, Gem, Hexagon, Rocket, Thermometer, Wind,
  Crosshair, RotateCcw, ExternalLink, TrendingUp, MapPin,
} from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'

const LOCATIONS = [
  {
    id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527, color: '#ef4444',
    tags: ['Crater', 'Geological Feature', 'Landing Site'],
    elevation: -2.6, slope: 4.8, temp: -63, terrain: 'Crater Floor',
    desc: 'Jezero Crater is an ancient impact crater that once held a lake and is a key site in the search for past life on Mars.',
    mission: { name: 'Perseverance Rover', years: '2021 - Present', note: 'Collected samples and studied the ancient lakebed.' },
  },
  {
    id: 'olympus', name: 'Olympus Mons', lat: 18.65, lon: 133.26, color: '#3b82f6',
    tags: ['Volcano', 'Geological Feature'],
    elevation: 21.9, slope: 5.0, temp: -60, terrain: 'Shield Volcano',
    desc: 'The tallest known volcano in the solar system, about three times the height of Mount Everest.',
    mission: { name: 'Mars Global Surveyor', years: '1997 - 2006', note: 'Mapped the volcano with laser altimetry.' },
  },
  {
    id: 'valles', name: 'Valles Marineris', lat: -14.57, lon: 316, color: '#22c55e',
    tags: ['Canyon', 'Geological Feature'],
    elevation: -5.0, slope: 8.0, temp: -55, terrain: 'Canyon System',
    desc: 'One of the largest canyon systems in the solar system, stretching over 4,000 km.',
    mission: { name: 'Mars Odyssey', years: '2001 - Present', note: 'Thermal imaging of the canyon walls.' },
  },
  {
    id: 'tyrrhena', name: 'Tyrrhena Terra', lat: -5, lon: 39, color: '#f59e0b',
    tags: ['Terrain', 'Landing Site'],
    elevation: 1.0, slope: 3.0, temp: -58, terrain: 'Ancient Highlands',
    desc: 'Heavily cratered ancient highland terrain in the southern hemisphere.',
    mission: { name: 'Mars Reconnaissance Orbiter', years: '2006 - Present', note: 'High-resolution imaging of the region.' },
  },
  {
    id: 'nili', name: 'Nili Fossae', lat: 21, lon: 74.5, color: '#a855f7',
    tags: ['Trough', 'Clay & Carbonates'],
    elevation: -0.6, slope: 6.0, temp: -62, terrain: 'Fracture Trough',
    desc: 'A set of troughs rich in clay and carbonate minerals, near Jezero Crater.',
    mission: { name: 'Perseverance Rover', years: '2021 - Present', note: 'Nearby exploration targets.' },
  },
]

const LAYERS = [
  { id: 'terrain', name: 'Terrain', sub: 'Surface features & texture', icon: Mountain, grad: 'from-orange-700 to-orange-950' },
  { id: 'elevation', name: 'Elevation', sub: 'Height data (color coded)', icon: Mountain, grad: 'from-blue-600 via-green-500 to-red-600' },
  { id: 'geo', name: 'Geological Features', sub: 'Rocks, craters, formations', icon: Hexagon, grad: 'from-gray-500 to-gray-800' },
  { id: 'minerals', name: 'Minerals', sub: 'Detected mineral composition', icon: Gem, grad: 'from-purple-600 to-indigo-900' },
  { id: 'missions', name: 'NASA Missions', sub: 'Rover tracks & observations', icon: Rocket, grad: 'from-slate-600 to-slate-900' },
  { id: 'temp', name: 'Temperature', sub: 'Surface temperature (est.)', icon: Thermometer, grad: 'from-yellow-500 via-red-500 to-blue-700' },
  { id: 'atmo', name: 'Atmosphere', sub: 'Pressure & dust', icon: Wind, grad: 'from-sky-600 to-sky-900' },
]

const panel = 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md'

function Switch({ on, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label="toggle layer"
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-red-500' : 'bg-white/20'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export default function ExplorePage() {
  const [selected, setSelected] = useState(LOCATIONS[0])
  const [focus, setFocus] = useState(null)
  const [active, setActive] = useState('terrain')

  const pick = (loc) => {
    setSelected(loc)
    setFocus({ ...loc })
  }

  // Active layer-e click korle off hoy (Terrain-e fire jay), onno layer-e click korle oita active hoy
  const toggleLayer = (id) => setActive((cur) => (cur === id ? 'terrain' : id))

  return (
    <div className="relative h-full overflow-hidden bg-bg text-white">
      {/* Globe */}
      <div className="absolute inset-0">
        <MarsGlobe locations={LOCATIONS} focus={focus} onSelect={pick} layer={active} />
      </div>

      {/* Left: Map Layers */}
      <aside className={`absolute left-4 top-4 w-[300px] p-2 ${panel}`}>
        <div className="flex items-center gap-2 px-3 py-3 font-semibold">
          <Layers size={18} /> Map Layers
        </div>
        {LAYERS.map((l) => {
          const Icon = l.icon
          const on = active === l.id
          return (
            <div
              key={l.id}
              onClick={() => setActive(l.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5 ${on ? 'bg-red-500/10' : ''}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{l.name}</div>
                <div className="truncate text-xs text-gray-400">{l.sub}</div>
              </div>
              <Switch on={on} onClick={() => toggleLayer(l.id)} />
            </div>
          )
        })}
      </aside>

      {/* Compass */}
      <div className="absolute left-[330px] top-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md">
        <span className="absolute top-1 text-[10px] text-gray-300">N</span>
        <span className="absolute bottom-1 text-[10px] text-gray-300">S</span>
        <span className="absolute left-2 text-[10px] text-gray-300">W</span>
        <span className="absolute right-2 text-[10px] text-gray-300">E</span>
        <div className="h-0 w-0 border-x-[7px] border-b-[22px] border-x-transparent border-b-red-500" />
      </div>

      {/* Location tooltip */}
      <div className={`absolute left-1/2 top-6 -translate-x-1/2 px-4 py-3 ${panel}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MapPin size={14} style={{ color: selected.color }} /> {selected.name}
        </div>
        <div className="mt-0.5 text-xs text-gray-400">
          {selected.lat}° N, {selected.lon}° E
        </div>
        <div className="text-xs text-gray-400">Elevation: {selected.elevation} km</div>
      </div>

      {/* Right action buttons */}
      <div className="absolute right-[400px] top-4 flex flex-col gap-2">
        <button onClick={() => setFocus({ ...selected })} title="Center on location"
          className={`flex h-11 w-11 items-center justify-center ${panel} hover:bg-white/10`}>
          <Crosshair size={18} />
        </button>
        <button onClick={() => { setSelected(LOCATIONS[0]); setFocus({ ...LOCATIONS[0] }) }} title="Reset"
          className={`flex h-11 w-11 items-center justify-center ${panel} hover:bg-white/10`}>
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Right: details */}
      <aside className={`absolute bottom-[132px] right-4 top-4 w-[370px] overflow-y-auto p-5 ${panel}`}>
        <div className="flex gap-4">
          <div className="h-[84px] w-[84px] shrink-0 rounded-xl"
            style={{ background: `linear-gradient(135deg, ${selected.color}, #1a0b08)` }} />
          <div>
            <h2 className="text-lg font-bold">{selected.name}</h2>
            <div className="text-sm text-gray-400">{selected.lat}° N, {selected.lon}° E</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.tags.map((t) => (
                <span key={t} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-gray-200">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 border-b border-white/10 pb-4 text-sm text-gray-300">{selected.desc}</p>

        <h3 className="mt-4 font-semibold">Terrain &amp; Elevation</h3>
        <div className="mt-3 space-y-3 text-sm">
          {[
            ['Terrain Type', selected.terrain, Mountain],
            ['Elevation', `${selected.elevation} km`, TrendingUp],
            ['Avg. Slope', `${selected.slope}°`, TrendingUp],
            ['Temperature (est.)', `${selected.temp}°C`, Thermometer],
          ].map(([label, value, Icon]) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Icon size={16} /></div>
              <div>
                <div className="text-xs text-gray-400">{label}</div>
                <div className="font-medium">{value}</div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-5 border-t border-white/10 pt-4 font-semibold">Related Missions</h3>
        <div className="mt-3 flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold">NASA</div>
          <div>
            <div className="text-sm font-medium">{selected.mission.name}</div>
            <div className="text-xs text-gray-400">({selected.mission.years})</div>
            <div className="mt-1 text-xs text-gray-400">{selected.mission.note}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {LOCATIONS.map((l) => (
            <button key={l.id} onClick={() => pick(l)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                selected.id === l.id ? 'border-red-500 bg-red-500/20' : 'border-white/10 text-gray-400 hover:text-white'
              }`}>
              {l.name}
            </button>
          ))}
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm hover:bg-white/10">
          View More Details <ExternalLink size={14} />
        </button>
      </aside>

      {/* Bottom: layer thumbnails */}
      <div className={`absolute bottom-4 left-4 right-4 flex gap-3 overflow-x-auto p-3 ${panel}`}>
        {LAYERS.slice(0, 6).map((l) => {
          const Icon = l.icon
          return (
            <button key={l.id} onClick={() => setActive(l.id)}
              className={`w-[180px] shrink-0 overflow-hidden rounded-xl border text-left transition ${
                active === l.id ? 'border-red-500' : 'border-white/10 hover:border-white/30'
              }`}>
              <div className={`h-[64px] bg-gradient-to-br ${l.grad}`} />
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <Icon size={14} /> {l.name.replace('Geological Features', 'Geological')}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}