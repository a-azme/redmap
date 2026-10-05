import { useMemo, useState } from 'react'
import MarsGlobe from '../components/map/MarsGlobe'

const TYPE_COLOR = { rover: '#ff5a4f', lander: '#f5a524', orbiter: '#5aa9ff' }

const MISSIONS = [
  { id: 'viking1', name: 'Viking 1', type: 'lander', years: '1976–1982', site: 'Chryse Planitia', lat: 22.27, lon: -47.95,
    summary: 'First long-lived successful Mars lander. Imaged the surface and ran biology experiments.',
    instruments: ['Lander cameras', 'Biology experiments', 'Meteorology'] },
  { id: 'viking2', name: 'Viking 2', type: 'lander', years: '1976–1980', site: 'Utopia Planitia', lat: 47.67, lon: -134.29,
    summary: 'Twin of Viking 1 in the northern plains. Returned surface images and weather data.',
    instruments: ['Lander cameras', 'Biology experiments', 'Meteorology'] },
  { id: 'pathfinder', name: 'Pathfinder', type: 'rover', years: '1997', site: 'Ares Vallis', lat: 19.13, lon: -33.22,
    summary: 'Delivered Sojourner, the first rover to drive on Mars, and analysed nearby rocks.',
    instruments: ['Sojourner rover', 'APXS spectrometer', 'Imager'] },
  { id: 'spirit', name: 'Spirit', type: 'rover', years: '2004–2010', site: 'Gusev Crater', lat: -14.57, lon: 175.47,
    summary: 'Explored Gusev Crater and the Columbia Hills, finding rocks altered by past water.',
    instruments: ['Pancam', 'Mini-TES', 'APXS', 'Mössbauer'] },
  { id: 'opportunity', name: 'Opportunity', type: 'rover', years: '2004–2018', site: 'Meridiani Planum', lat: -1.95, lon: -5.53,
    summary: 'Found minerals that formed in water, and drove far beyond its planned lifetime.',
    instruments: ['Pancam', 'Mini-TES', 'APXS', 'Mössbauer'] },
  { id: 'phoenix', name: 'Phoenix', type: 'lander', years: '2008', site: 'Vastitas Borealis', lat: 68.22, lon: -125.7,
    summary: 'Dug into the arctic soil and confirmed water ice just below the surface.',
    instruments: ['Robotic arm', 'TEGA', 'MECA', 'Surface camera'] },
  { id: 'curiosity', name: 'Curiosity', type: 'rover', years: '2012–present', site: 'Gale Crater', lat: -4.59, lon: 137.44,
    summary: 'Showed that Gale Crater once had conditions that could support microbial life.',
    instruments: ['ChemCam', 'SAM', 'CheMin', 'Mastcam', 'REMS'] },
  { id: 'insight', name: 'InSight', type: 'lander', years: '2018–2022', site: 'Elysium Planitia', lat: 4.5, lon: 135.62,
    summary: 'Listened for marsquakes and probed the crust, mantle and core of Mars.',
    instruments: ['SEIS seismometer', 'HP3 heat probe', 'RISE'] },
  { id: 'perseverance', name: 'Perseverance', type: 'rover', years: '2021–present', site: 'Jezero Crater', lat: 18.44, lon: 77.45,
    summary: 'Searching an ancient river delta for signs of past life and caching samples.',
    instruments: ['Mastcam-Z', 'SuperCam', 'PIXL', 'SHERLOC', 'MOXIE', 'RIMFAX', 'MEDA'] },
  { id: 'mgs', name: 'Mars Global Surveyor', type: 'orbiter', years: '1997–2006', site: 'Global coverage',
    summary: 'Mapped the whole planet and produced the first global topographic map of Mars.',
    instruments: ['MOLA', 'MOC', 'TES'] },
  { id: 'odyssey', name: 'Mars Odyssey', type: 'orbiter', years: 'Orbit since 2001', site: 'Global coverage',
    summary: 'Maps surface temperature and detects hydrogen (water ice) hidden under the soil.',
    instruments: ['THEMIS', 'GRS'] },
  { id: 'mro', name: 'Mars Reconnaissance Orbiter', type: 'orbiter', years: 'Orbit since 2006', site: 'Global coverage',
    summary: 'Our sharpest eye on Mars: close-up images, minerals, subsurface radar and climate.',
    instruments: ['HiRISE', 'CTX', 'CRISM', 'SHARAD', 'MCS'] },
  { id: 'maven', name: 'MAVEN', type: 'orbiter', years: 'Orbit since 2014', site: 'Global coverage',
    summary: 'Studies the upper atmosphere and how Mars lost its air to space.',
    instruments: ['NGIMS', 'IUVS', 'and more'] },
]

// Orbital datasets cover every location on Mars, so they can be shown "at" any site
const ORBITAL_DATA = [
  { mission: 'mgs', instrument: 'MOLA', layer: 'Elevation', shows: 'Laser altimetry used for the first global topographic map.' },
  { mission: 'mro', instrument: 'HiRISE & CTX', layer: 'Imagery', shows: 'Close-up and context images that resolve features about a meter across.' },
  { mission: 'mro', instrument: 'CRISM', layer: 'Minerals', shows: 'Mineral mapping from visible and infrared light (clays, sulfates, carbonates).' },
  { mission: 'mro', instrument: 'SHARAD', layer: 'Subsurface', shows: 'Radar sounding of layers and ice beneath the surface.' },
  { mission: 'mro', instrument: 'MCS', layer: 'Atmosphere', shows: 'Temperature, dust and water-vapor profiles of the air.' },
  { mission: 'odyssey', instrument: 'THEMIS', layer: 'Temperature', shows: 'Thermal-infrared imaging of surface temperature and rock/dust properties.' },
  { mission: 'odyssey', instrument: 'GRS', layer: 'Subsurface', shows: 'Gamma-ray and neutron signals that reveal hydrogen (water ice) near the surface.' },
  { mission: 'maven', instrument: 'NGIMS, IUVS & more', layer: 'Atmosphere', shows: 'Upper atmosphere and how gas escapes to space.' },
]

const byId = (id) => MISSIONS.find((m) => m.id === id)

// Great-circle distance on Mars (km)
const dist = (a, b) => {
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLon = (b.lon - a.lon) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 2 * 3389.5 * Math.asin(Math.sqrt(h))
}

const Badge = ({ type }) => (
  <span className="rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
    style={{ background: TYPE_COLOR[type] + '22', color: TYPE_COLOR[type] }}>{type}</span>
)

export default function MissionsPage() {
  const [filter, setFilter] = useState('all')
  const [selId, setSelId] = useState('perseverance')
  const [focus, setFocus] = useState({ lat: 18.44, lon: 77.45 })
  const sel = byId(selId)
  const landed = sel.lat != null

  const select = (m) => {
    setSelId(m.id)
    if (m.lat != null) setFocus({ lat: m.lat, lon: m.lon })
  }

  const pins = useMemo(
    () => MISSIONS.filter((m) => m.lat != null && (filter === 'all' || filter === m.type))
      .map((m) => ({ id: m.id, name: m.name, lat: m.lat, lon: m.lon, color: TYPE_COLOR[m.type] })),
    [filter]
  )

  const nearby = landed
    ? MISSIONS.filter((m) => m.lat != null && m.id !== sel.id)
        .map((m) => ({ m, km: dist(sel, m) }))
        .filter((x) => x.km < 2000)
        .sort((a, b) => a.km - b.km)
    : []

  return (
    <div className="grid h-full grid-cols-1 content-start gap-4 overflow-y-auto p-3 text-white xl:grid-cols-[320px_1fr_380px] xl:grid-rows-1 xl:overflow-hidden xl:p-4">
      {/* Left: mission list */}
      <aside className="flex flex-col rounded-2xl border border-white/10 bg-[#0b0e13] p-4 xl:min-h-0">
        <h2 className="text-lg font-semibold">NASA Missions</h2>
        <p className="mt-1 text-xs text-white/50">Surface and orbital missions, combined by location.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['all', 'rover', 'lander', 'orbiter'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs capitalize ${filter === f ? 'bg-red-500 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="mt-3 max-h-[320px] flex-1 space-y-2 overflow-y-auto pr-1 xl:max-h-none">
          {MISSIONS.filter((m) => filter === 'all' || m.type === filter).map((m) => (
            <button key={m.id} onClick={() => select(m)}
              className={`w-full rounded-xl border p-3 text-left transition ${selId === m.id ? 'border-red-500/60 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{m.name}</span>
                <Badge type={m.type} />
              </div>
              <div className="mt-1 text-xs text-white/50">{m.site} · {m.years}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Center: globe */}
      <main className="relative order-first h-[45vh] min-h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#07090c] xl:order-none xl:h-auto xl:min-h-0">
        <MarsGlobe locations={pins} focus={focus} onSelect={(d) => select(byId(d.id))} />
        <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-lg bg-black/50 px-3 py-1.5 text-[11px] text-white/70">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.rover }} />Rover</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.lander }} />Lander</span>
          <span className="hidden text-white/40 sm:inline">Orbiters cover the whole planet</span>
        </div>
      </main>

      {/* Right: detail + multi-mission data */}
      <aside className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0e13] p-4 xl:min-h-0 xl:overflow-y-auto">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{sel.name}</h2>
            <Badge type={sel.type} />
          </div>
          <p className="mt-1 text-xs text-white/50">
            {sel.site} · {sel.years}
            {landed && ` · ${Math.abs(sel.lat).toFixed(2)}°${sel.lat >= 0 ? 'N' : 'S'}, ${(((sel.lon % 360) + 360) % 360).toFixed(2)}°E`}
          </p>
          <p className="mt-3 text-sm text-white/80">{sel.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sel.instruments.map((i) => (
              <span key={i} className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/70">{i}</span>
            ))}
          </div>
        </div>

        {landed ? (
          <>
            <section>
              <h3 className="text-sm font-semibold text-red-400">Data from other missions at this location</h3>
              <p className="mt-1 text-xs text-white/50">Orbiters have mapped {sel.site} from above. Tap one to see its mission.</p>
              <div className="mt-2 space-y-2">
                {ORBITAL_DATA.map((d) => (
                  <button key={d.mission + d.instrument} onClick={() => select(byId(d.mission))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">{byId(d.mission).name} · {d.instrument}</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/60">{d.layer}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">{d.shows}</p>
                  </button>
                ))}
              </div>
            </section>
            {nearby.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-red-400">Nearby surface missions</h3>
                <div className="mt-2 space-y-2">
                  {nearby.map(({ m, km }) => (
                    <button key={m.id} onClick={() => select(m)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm hover:bg-white/10">
                      <span>{m.name} <span className="text-xs text-white/50">· {m.site}</span></span>
                      <span className="text-xs text-white/60">~{Math.round(km)} km</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <section>
              <h3 className="text-sm font-semibold text-red-400">Datasets from this mission</h3>
              <div className="mt-2 space-y-2">
                {ORBITAL_DATA.filter((d) => d.mission === sel.id).map((d) => (
                  <div key={d.instrument} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{d.instrument}</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/60">{d.layer}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">{d.shows}</p>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-red-400">See it at a landing site</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {MISSIONS.filter((m) => m.lat != null).map((m) => (
                  <button key={m.id} onClick={() => select(m)}
                    className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10">{m.name}</button>
                ))}
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  )
}