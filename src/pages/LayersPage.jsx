import { useState, useCallback } from 'react'
import {
  Mountain, Layers, Gem, Hexagon, Thermometer, Wind,
  Crosshair, RotateCcw, ExternalLink, TrendingUp, MapPin,
} from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
import LayerThumb from '../components/map/LayerThumb'
import LocationThumb from '../components/map/LocationThumb'
import { useMapStore } from '../store/useMapStore'

const LOCATIONS = [
  {
    id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527, color: '#ef4444',
    tags: ['Crater', 'Geological Feature', 'Landing Site'],
    elevation: -2.6, slope: 4.8, temp: -63, terrain: 'Crater Floor',
    desc: 'Jezero Crater is an ancient impact crater that once held a lake and is a key site in the search for past life on Mars.',
    mission: { name: 'Perseverance Rover', years: '2021 - Present', note: 'Collected samples and studied the ancient lakebed.' },
  },
  {
    id: 'olympus', name: 'Olympus Mons', lat: 18.65, lon: 226.2, color: '#3b82f6',
    tags: ['Volcano', 'Geological Feature'],
    elevation: 21.9, slope: 5.0, temp: -60, terrain: 'Shield Volcano',
    desc: 'The tallest known volcano in the solar system, about three times the height of Mount Everest.',
    mission: { name: 'Mars Global Surveyor', years: '1997 - 2006', note: 'Mapped the volcano with laser altimetry.' },
  },
  {
    id: 'valles', name: 'Valles Marineris', lat: -13.9, lon: 301, color: '#22c55e',
    tags: ['Canyon', 'Geological Feature'],
    elevation: -5.0, slope: 8.0, temp: -55, terrain: 'Canyon System',
    desc: 'One of the largest canyon systems in the solar system, stretching over 4,000 km.',
    mission: { name: 'Mars Odyssey', years: '2001 - Present', note: 'Thermal imaging of the canyon walls.' },
  },
  {
    id: 'tyrrhena', name: 'Tyrrhena Terra', lat: -15, lon: 90, color: '#f59e0b',
    tags: ['Terrain', 'Ancient Highlands'],
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
  {
    id: 'isidis', name: 'Isidis Planitia', lat: 12.9, lon: 87, color: '#06b6d4',
    tags: ['Plain', 'Impact Basin'],
    elevation: -3.8, slope: 2.0, temp: -61, terrain: 'Basin Floor',
    desc: 'A huge impact basin and smooth plain east of Jezero Crater.',
    mission: { name: 'Mars Reconnaissance Orbiter', years: '2006 - Present', note: 'Surveyed the basin from orbit.' },
  },
]

const LAYERS = [
  { id: 'terrain', name: 'Terrain', sub: 'Surface features & texture', icon: Mountain, grad: 'from-orange-700 to-orange-950' },
  { id: 'elevation', name: 'Elevation', sub: 'Height data (color coded)', icon: Mountain, grad: 'from-blue-600 via-green-500 to-red-600' },
  { id: 'geo', name: 'Geological Features', sub: 'Rocks, craters, formations', icon: Hexagon, grad: 'from-gray-500 to-gray-800' },
  { id: 'minerals', name: 'Minerals', sub: 'Detected mineral composition', icon: Gem, grad: 'from-purple-600 to-indigo-900' },
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
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function LayersPage() {
  const storeSelected = useMapStore((s) => s.selected)
  const setStoreSelected = useMapStore((s) => s.setSelected)
  const [active, setActive] = useState('terrain')

  const selected = LOCATIONS.find((l) => l.id === storeSelected.id) || LOCATIONS[0]
  const pick = useCallback((loc) => setStoreSelected(loc), [setStoreSelected])
  const toggleLayer = (id) => setActive((cur) => (cur === id ? 'terrain' : id))

  return (
    <div className="relative h-full overflow-y-auto bg-bg text-white xl:overflow-hidden">
      {/* Globe + everything that sits on top of it */}
      <div className="relative h-[75vh] min-h-[460px] xl:absolute xl:inset-0 xl:h-auto xl:min-h-0">
        <MarsGlobe locations={LOCATIONS} focus={selected} onSelect={pick} layer={active} />

        {/* Left: Map Layers (desktop only) */}
        <aside className={`absolute left-4 top-4 z-[1100] hidden w-[300px] p-2 xl:block ${panel}`}>
          {/* KEEP your existing content of this aside (title + LAYERS.map) */}
        </aside>

        {/* Compass (desktop only) */}
        <div className="absolute left-[330px] top-4 z-[1100] hidden h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md xl:flex">
          {/* KEEP your existing N/S/W/E spans + arrow */}
        </div>

        {/* Location tooltip */}
        <div className={`absolute left-1/2 top-3 z-[1100] -translate-x-1/2 whitespace-nowrap px-3 py-2 xl:top-6 xl:px-4 xl:py-3 ${panel}`}>
          {/* KEEP your existing content */}
        </div>

        {/* Right action buttons */}
        <div className="absolute right-3 top-[112px] z-[1100] flex flex-col gap-2 xl:right-[400px] xl:top-4">
          {/* KEEP your two buttons */}
        </div>

        {/* Bottom: layer thumbnails */}
        <div className={`absolute bottom-2 left-2 right-2 z-[1100] flex gap-2 overflow-x-auto p-2 xl:bottom-4 xl:left-4 xl:right-4 xl:gap-3 xl:p-3 ${panel}`}>
          {LAYERS.map((l) => {
            const Icon = l.icon
            return (
              <button
                key={l.id}
                onClick={() => setActive(l.id)}
                className={`w-[130px] shrink-0 overflow-hidden rounded-xl border text-left transition xl:w-[180px] ${
                  active === l.id ? 'border-red-500' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <LayerThumb layerId={l.id} grad={l.grad} />
                <div className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Icon size={14} /> {l.name.replace('Geological Features', 'Geological')}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: details (below the globe on mobile) */}
      <aside className={`relative z-[1100] m-2 p-4 xl:absolute xl:bottom-[132px] xl:right-4 xl:top-4 xl:m-0 xl:w-[370px] xl:overflow-y-auto xl:p-5 ${panel}`}>
        {/* KEEP everything inside your existing details aside */}
      </aside>
    </div>
  )
}