import { useState, useCallback, useMemo } from 'react'
import {
  Mountain,
  Layers,
  Gem,
  Hexagon,
  Thermometer,
  Wind,
  MapPin,
} from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
import LayerThumb from '../components/map/LayerThumb'
import { useMarsLocations, DEFAULT_LOCATION } from '../services/marsLocations'
import { useMapStore } from '../store/useMapStore'

const LAYERS = [
  { id: 'terrain', name: 'Terrain', sub: 'Surface features & texture', icon: Mountain, grad: 'from-orange-700 to-orange-950' },
  { id: 'elevation', name: 'Elevation', sub: 'Height data (color coded)', icon: Mountain, grad: 'from-blue-600 via-green-500 to-red-600' },
  { id: 'geo', name: 'Geological Features', sub: 'Rocks, craters, formations', icon: Hexagon, grad: 'from-gray-500 to-gray-800' },
  { id: 'minerals', name: 'Minerals', sub: 'Detected mineral composition', icon: Gem, grad: 'from-purple-600 to-indigo-900' },
  { id: 'temp', name: 'Temperature', sub: 'Surface temperature (est.)', icon: Thermometer, grad: 'from-yellow-500 via-red-500 to-blue-700' },
  { id: 'atmo', name: 'Atmosphere', sub: 'Pressure & dust', icon: Wind, grad: 'from-sky-600 to-sky-900' },
]

const panel = 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md'

const fmtLat = (lat) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`
const fmtLon = (lon) => `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`

function Switch({ on, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label="toggle layer"
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-red-500' : 'bg-white/20'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          on ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function LayersPage() {
  const locations = useMarsLocations()
  const storeSelected = useMapStore((s) => s.selected)
  const storeFocus = useMapStore((s) => s.focusTarget)
  const setStoreSelected = useMapStore((s) => s.setSelected)
  const clearFocus = useMapStore((s) => s.clearFocus)
  const [active, setActive] = useState('terrain')

  const selected = useMemo(() => {
    const found = storeSelected && locations.find((l) => l.id === storeSelected.id)
    return { ...(found || storeSelected || DEFAULT_LOCATION) }
  }, [locations, storeSelected])

  const pick = useCallback((loc) => setStoreSelected({ ...loc }), [setStoreSelected])
  const toggleLayer = (id) => setActive((cur) => (cur === id ? 'terrain' : id))

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-white">
      {/* Full-viewport Globe */}
      <div className="relative h-full w-full">
        <MarsGlobe
          locations={locations}
          focus={storeFocus}
          onSelect={pick}
          layer={active}
          onCenter={() => pick({ ...selected })}
          onReset={() => clearFocus()}
          controlsClassName="right-3 top-3 sm:right-4 sm:top-4"
          legendClassName="bottom-[132px] left-1/2 -translate-x-1/2 xl:bottom-[142px]"
        />

        {/* Left: Map Layers (desktop only, concise) */}
        <aside className={`absolute left-4 top-4 z-[1100] hidden w-[250px] p-2.5 xl:block ${panel}`}>
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold">
            <Layers size={16} /> Map Layers
          </div>
          <div className="mt-1 space-y-1">
            {LAYERS.map((l) => {
              const Icon = l.icon
              const on = active === l.id
              return (
                <div
                  key={l.id}
                  onClick={() => setActive(l.id)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition hover:bg-white/5 ${
                    on ? 'bg-red-500/10' : ''
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium leading-tight">{l.name}</div>
                    <div className="truncate text-[10px] text-gray-400">{l.sub}</div>
                  </div>
                  <Switch on={on} onClick={() => toggleLayer(l.id)} />
                </div>
              )
            })}
          </div>
        </aside>

        {/* Compass (desktop only) */}
        <div className="absolute left-[272px] top-4 z-[1100] hidden h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md xl:flex">
          <span className="absolute top-1 text-[9px] text-gray-300">N</span>
          <span className="absolute bottom-1 text-[9px] text-gray-300">S</span>
          <span className="absolute left-1.5 text-[9px] text-gray-300">W</span>
          <span className="absolute right-1.5 text-[9px] text-gray-300">E</span>
          <div className="h-0 w-0 border-x-[6px] border-b-[18px] border-x-transparent border-b-red-500" />
        </div>

        {/* Location tooltip */}
        <div className={`absolute left-1/2 top-3 z-[1050] -translate-x-1/2 whitespace-nowrap px-3 py-1.5 xl:top-4 xl:px-3.5 xl:py-2 ${panel}`}>
          <div className="flex items-center gap-2 text-xs font-semibold xl:text-sm">
            <MapPin size={14} style={{ color: selected.color }} /> {selected.name}
          </div>
          <div className="mt-0.5 font-mono text-[11px] tabular-nums text-gray-400">
            {fmtLat(selected.lat)}, {fmtLon(selected.lon)}
          </div>
          <div className="text-[11px] text-gray-400">
            Elevation: {selected.elevation} km
          </div>
        </div>

        {/* Bottom: layer thumbnails (responsively bottom center) */}
        <div
          className={`absolute bottom-3 left-1/2 z-[1000] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 overflow-x-auto p-2 [scrollbar-width:none] xl:bottom-4 xl:max-w-[calc(100vw-120px)] xl:gap-2.5 xl:p-2.5 ${panel}`}
        >
          {LAYERS.map((l) => {
            const Icon = l.icon
            return (
              <button
                key={l.id}
                onClick={() => setActive(l.id)}
                className={`w-[100px] shrink-0 overflow-hidden rounded-xl border text-left transition xl:w-[115px] ${
                  active === l.id ? 'border-red-500 ring-1 ring-red-500/50' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <LayerThumb layerId={l.id} grad={l.grad} />
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs">
                  <Icon size={13} className="shrink-0" />
                  <span className="truncate">{l.name.replace('Geological Features', 'Geological')}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}