import { useState, useCallback, useMemo } from 'react'
import {
  Mountain, Layers, Gem, Hexagon, Thermometer, Wind,
  ExternalLink, TrendingUp, MapPin, Eye, Maximize2,
} from 'lucide-react'
import MarsGlobe from '../components/map/MarsGlobe'
import LayerThumb from '../components/map/LayerThumb'
import { useMarsLocations, DEFAULT_LOCATION, FEATURED_LOCATIONS } from '../services/marsLocations'
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
  const setStoreSelected = useMapStore((s) => s.setSelected)
  const [active, setActive] = useState('terrain')

  const selected = useMemo(() => {
    const found = storeSelected && locations.find((l) => l.id === storeSelected.id)
    return { ...(found || storeSelected || DEFAULT_LOCATION) }
  }, [locations, storeSelected])

  const quickChips = useMemo(() => {
    const inFeatured = FEATURED_LOCATIONS.some((l) => l.id === selected.id)
    return inFeatured ? FEATURED_LOCATIONS : [selected, ...FEATURED_LOCATIONS.slice(0, 8)]
  }, [selected])

  const pick = useCallback((loc) => setStoreSelected({ ...loc }), [setStoreSelected])
  const toggleLayer = (id) => setActive((cur) => (cur === id ? 'terrain' : id))

  return (
    <div className="relative h-full overflow-y-auto bg-bg text-white xl:overflow-hidden">
      {/* Globe + everything that sits on top of it */}
      <div className="relative h-[75vh] min-h-[460px] xl:absolute xl:inset-0 xl:h-auto xl:min-h-0">
        <MarsGlobe
          locations={locations}
          focus={selected}
          onSelect={pick}
          layer={active}
          onCenter={() => pick({ ...selected })}
          onReset={() => pick(DEFAULT_LOCATION)}
          controlsClassName="right-3 top-3 xl:right-[306px] xl:top-4"
          legendClassName="bottom-[132px] left-1/2 -translate-x-1/2 xl:bottom-[142px]"
        />

        {/* Left: Map Layers (desktop only, concise) */}
        <aside className={`absolute left-4 top-4 z-[1100] hidden w-[250px] p-2.5 xl:block ${panel}`}>
          <div className="flex items-center gap-2 px-2 py-1.5 font-semibold text-sm">
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
          <div className="mt-0.5 text-[11px] text-gray-400">
            {fmtLat(selected.lat)}, {fmtLon(selected.lon)}
          </div>
          <div className="text-[11px] text-gray-400">
            {selected.diameter > 0 ? `Diameter: ${selected.diameter} km` : 'Landing Site'} • L{selected.level} ({selected.min_alt_km}–{selected.max_alt_km} km)
          </div>
        </div>

        {/* Bottom: layer thumbnails (responsively bottom center) */}
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex max-w-[calc(100vw-32px)] xl:max-w-[calc(100vw-620px)] items-center gap-2 overflow-x-auto p-2 [scrollbar-width:none] xl:bottom-4 xl:gap-2.5 xl:p-2.5 ${panel}`}
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

      {/* Right: details (below the globe on mobile, concise on desktop above bottom bar) */}
      <aside className={`relative z-[1100] m-2 p-4 xl:absolute xl:right-4 xl:top-4 xl:m-0 xl:max-h-[calc(100%-148px)] xl:w-[280px] xl:overflow-y-auto xl:p-3.5 ${panel}`}>
        <div className="flex gap-3">
          <div
            className="h-16 w-16 shrink-0 rounded-xl"
            style={{ background: `linear-gradient(135deg, ${selected.color}, #1a0b08)` }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight">{selected.name}</h2>
            <div className="text-xs text-gray-400">
              {fmtLat(selected.lat)}, {fmtLon(selected.lon)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(selected.tags || [selected.type]).map((t) => (
                <span key={t} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 border-b border-white/10 pb-3 text-xs leading-relaxed text-gray-300">{selected.desc}</p>

        <h3 className="mt-3 text-xs font-semibold text-gray-200">Feature &amp; Visibility</h3>
        <div className="mt-2 space-y-2 text-xs">
          {[
            ['Feature Category', `${selected.type} (${selected.terrain})`, Mountain],
            ['Diameter / Span', selected.diameter > 0 ? `${selected.diameter} km` : 'Point Landing Hub', Maximize2],
            ['Visible Altitude', `${selected.min_alt_km} – ${selected.max_alt_km} km (Level ${selected.level})`, Eye],
            ['Elevation / Temp', `${selected.elevation} km • ${selected.temp}°C`, Thermometer],
          ].map(([label, value, Icon]) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-gray-400">{label}</div>
                <div className="truncate font-medium text-xs">{value}</div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-3 border-t border-white/10 pt-3 text-xs font-semibold text-gray-200">Related Missions</h3>
        <div className="mt-2 flex gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold">
            NASA
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium">{selected.mission?.name}</div>
            <div className="text-[10px] text-gray-400">({selected.mission?.years})</div>
            <div className="mt-0.5 text-[10px] leading-tight text-gray-400">{selected.mission?.note}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickChips.map((l) => (
            <button
              key={l.id}
              onClick={() => pick(l)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                selected.id === l.id
                  ? 'border-red-500 bg-red-500/20 text-white'
                  : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>

        <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-medium hover:bg-white/10">
          View More Details <ExternalLink size={13} />
        </button>
      </aside>
    </div>
  )
}