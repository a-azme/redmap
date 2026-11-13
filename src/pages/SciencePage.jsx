import { useMemo, useState } from 'react'

const R = 3389.5
const CAT_COLOR = { Water: '#4da3ff', Geology: '#f5a524', Minerals: '#b26bff', Atmosphere: '#3dd6a6' }

const ROUTES = [
  { id: 'jezero', name: 'Jezero → Nili Fossae',
    blurb: 'Ancient river delta, crater rim and the mineral-rich Nili Fossae troughs.',
    waypoints: [
      { name: 'Landing site', lat: 18.44, lon: 77.45 },
      { name: 'Delta front', lat: 18.5, lon: 77.35 },
      { name: 'Western rim', lat: 18.5, lon: 77.2 },
      { name: 'Plains', lat: 19.8, lon: 75.8 },
      { name: 'Nili Fossae', lat: 21.0, lon: 74.5 },
    ] },
  { id: 'gale', name: 'Gale Crater → Mount Sharp',
    blurb: 'From the Curiosity landing area up the layered slopes of Mount Sharp.',
    waypoints: [
      { name: 'Bradbury Landing', lat: -4.59, lon: 137.44 },
      { name: 'Foothills', lat: -4.85, lon: 137.45 },
      { name: 'Mid slope', lat: -5.0, lon: 137.62 },
      { name: 'Summit area', lat: -5.08, lon: 137.85 },
    ] },
]

// Positions are approximate (concept demo). Verify with NASA Mars Trek before real planning.
const POIS = [
  { id: 'delta', route: 'jezero', name: 'Jezero river delta', cat: 'Water', lat: 18.47, lon: 77.35,
    desc: 'Layered sediments from an ancient river delta, a prime place to look for preserved signs of past life.' },
  { id: 'seitah', route: 'jezero', name: 'Olivine-rich crater floor', cat: 'Geology', lat: 18.38, lon: 77.4,
    desc: 'Igneous rocks rich in olivine, records of volcanic activity deep in the crater\'s history.' },
  { id: 'rim', route: 'jezero', name: 'Rim carbonates', cat: 'Minerals', lat: 18.46, lon: 77.22,
    desc: 'Carbonate-bearing rocks along the rim, evidence of water interacting with rock.' },
  { id: 'neretva', route: 'jezero', name: 'Neretva Vallis inlet', cat: 'Water', lat: 18.6, lon: 77.1,
    desc: 'Ancient river valley that once carried water into Jezero lake.' },
  { id: 'methane', route: 'jezero', name: 'Methane hotspot (debated)', cat: 'Atmosphere', lat: 20.6, lon: 75.1,
    desc: 'Earth-based observations once reported methane plumes in this region. The findings remain debated.' },
  { id: 'nili', route: 'jezero', name: 'Nili Fossae troughs', cat: 'Minerals', lat: 20.9, lon: 74.7,
    desc: 'Exposed carbonate, clay and olivine-rich rocks that record early water-rich conditions.' },
  { id: 'rems', route: 'gale', name: 'Gale weather station', cat: 'Atmosphere', lat: -4.59, lon: 137.44,
    desc: 'Curiosity\'s weather instrument tracks daily and seasonal pressure, temperature and humidity here.' },
  { id: 'yellowknife', route: 'gale', name: 'Yellowknife Bay', cat: 'Water', lat: -4.62, lon: 137.49,
    desc: 'Ancient lakebed where Curiosity found conditions that could have supported microbial life.' },
  { id: 'dunes', route: 'gale', name: 'Bagnold Dunes', cat: 'Geology', lat: -4.9, lon: 137.3,
    desc: 'Active dunes where wind-driven sand movement on Mars can be studied up close.' },
  { id: 'layers', route: 'gale', name: 'Clay-to-sulfate layers', cat: 'Minerals', lat: -5.0, lon: 137.62,
    desc: 'Mount Sharp\'s layers shift from clay-rich to sulfate-rich rock, a record of Mars drying out.' },
  { id: 'summit', route: 'gale', name: 'Mount Sharp upper layers', cat: 'Geology', lat: -5.08, lon: 137.85,
    desc: 'A tall stack of layered rock. The upper layers hold the youngest part of Gale\'s history.' },
]

// lat/lon to local km (x east, y north) around an origin
const toXY = (p, o) => {
  const r = Math.PI / 180
  return { x: (p.lon - o.lon) * r * R * Math.cos(o.lat * r), y: (p.lat - o.lat) * r * R }
}

// distance from a point to the route, plus how far along the route it sits
function project(pt, pts) {
  let best = { d: Infinity, along: 0 }
  let acc = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const dx = b.x - a.x, dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const len = Math.sqrt(len2)
    let t = len2 ? ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const d = Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy))
    if (d < best.d) best = { d, along: acc + t * len }
    acc += len
  }
  return best
}

const pathLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0)

const W = 800, H = 520, PAD = 48

export default function SciencePage() {
  const [routeId, setRouteId] = useState('jezero')
  const [corridor, setCorridor] = useState(30)
  const [cats, setCats] = useState(Object.keys(CAT_COLOR))
  const [selId, setSelId] = useState(null)
  const [plan, setPlan] = useState([])

  const route = ROUTES.find((r) => r.id === routeId)

  const { pts, total, list } = useMemo(() => {
    const o = route.waypoints[0]
    const pts = route.waypoints.map((w) => toXY(w, o))
    const list = POIS.filter((p) => p.route === route.id)
      .map((p) => { const xy = toXY(p, o); return { ...p, xy, ...project(xy, pts) } })
      .filter((p) => p.d <= corridor && cats.includes(p.cat))
      .sort((a, b) => a.along - b.along)
    return { pts, total: pathLen(pts), list }
  }, [route, corridor, cats])

  const sel = list.find((p) => p.id === selId) || list[0]
  const planned = list.filter((p) => plan.includes(p.id))
  const extra = planned.reduce((s, p) => s + 2 * p.d, 0)

  // fit map
  const xs = [...pts.map((p) => p.x), ...list.map((p) => p.xy.x)]
  const ys = [...pts.map((p) => p.y), ...list.map((p) => p.xy.y)]
  const m = Math.max(corridor, 5)
  const minX = Math.min(...xs) - m, maxX = Math.max(...xs) + m
  const minY = Math.min(...ys) - m, maxY = Math.max(...ys) + m
  const scale = Math.min((W - 2 * PAD) / (maxX - minX), (H - 2 * PAD) / (maxY - minY))
  const sx = (x) => PAD + (x - minX) * scale + (W - 2 * PAD - (maxX - minX) * scale) / 2
  const sy = (y) => PAD + (maxY - y) * scale + (H - 2 * PAD - (maxY - minY) * scale) / 2
  const bar = [1, 2, 5, 10, 20, 50, 100].find((v) => v * scale >= 90) || 100

  const toggleCat = (c) => setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))
  const togglePlan = (id) => setPlan((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <div className="grid h-full grid-cols-1 content-start gap-4 overflow-y-auto p-3 text-white xl:grid-cols-[340px_1fr_340px] xl:grid-rows-1 xl:overflow-hidden xl:p-4">
      {/* Left: route, filters, stops */}
      <aside className="flex flex-col rounded-2xl border border-white/10 bg-[#0b0e13] p-4 xl:min-h-0">
        <h2 className="text-lg font-semibold">Science Along the Way</h2>
        <p className="mt-1 text-xs text-white/50">Pick a route and see which science sites lie close enough to visit safely.</p>

        <div className="mt-3 space-y-2">
          {ROUTES.map((r) => (
            <button key={r.id} onClick={() => { setRouteId(r.id); setSelId(null); setPlan([]) }}
              className={`w-full rounded-xl border p-3 text-left ${routeId === r.id ? 'border-red-500/60 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <div className="text-sm font-medium">{r.name}</div>
              <div className="mt-0.5 text-xs text-white/50">{r.blurb}</div>
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs text-white/60">
          Corridor width: <span className="font-semibold text-white">±{corridor} km</span> from route
          <input type="range" min="5" max="100" step="5" value={corridor}
            onChange={(e) => setCorridor(+e.target.value)} className="mt-1 w-full accent-red-500" />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(CAT_COLOR).map((c) => (
            <button key={c} onClick={() => toggleCat(c)}
              className={`rounded-full px-3 py-1 text-xs ${cats.includes(c) ? 'text-black' : 'bg-white/5 text-white/50'}`}
              style={cats.includes(c) ? { background: CAT_COLOR[c] } : undefined}>{c}</button>
          ))}
        </div>

        <h3 className="mt-4 text-sm font-semibold text-red-400">Science stops ({list.length})</h3>
        <div className="mt-2 max-h-[320px] flex-1 space-y-2 overflow-y-auto pr-1 xl:max-h-none">
          {list.length === 0 && <p className="text-xs text-white/50">No stops in this corridor. Widen it or enable more categories.</p>}
          {list.map((p, i) => (
            <button key={p.id} onClick={() => setSelId(p.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${sel?.id === p.id ? 'border-red-500/60 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                style={{ background: CAT_COLOR[p.cat] }}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="text-xs text-white/50">{p.along.toFixed(1)} km along · {p.d.toFixed(1)} km off route</span>
              </span>
              {plan.includes(p.id) && <span className="text-xs text-red-400">In plan</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Center: route map */}
      <main className="relative h-[420px] overflow-auto rounded-2xl border border-white/10 bg-[#07090c] xl:h-auto xl:min-h-0 xl:overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" className="h-full w-full min-w-[640px] xl:min-w-0" preserveAspectRatio="xMidYMid meet">
          <polyline points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none"
            stroke="rgba(255,90,79,0.12)" strokeWidth={corridor * 2 * scale} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none"
            stroke="#ff5a4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {route.waypoints.map((w, i) => (
            <g key={w.name}>
              <rect x={sx(pts[i].x) - 4} y={sy(pts[i].y) - 4} width="8" height="8" fill="#fff" transform={`rotate(45 ${sx(pts[i].x)} ${sy(pts[i].y)})`} />
              <text x={sx(pts[i].x) + 10} y={sy(pts[i].y) + 20} fontSize="11" fill="rgba(255,255,255,0.55)">{w.name}</text>
            </g>
          ))}
          {list.map((p, i) => (
            <g key={p.id} className="cursor-pointer" onClick={() => setSelId(p.id)}>
              <line x1={sx(p.xy.x)} y1={sy(p.xy.y)}
                x2={sx(pts[0].x) + 0} y2={sy(pts[0].y)} stroke="none" />
              <circle cx={sx(p.xy.x)} cy={sy(p.xy.y)} r="11" fill={CAT_COLOR[p.cat]}
                stroke={sel?.id === p.id ? '#fff' : plan.includes(p.id) ? '#ff5a4f' : 'rgba(0,0,0,0.5)'} strokeWidth="3" />
              <text x={sx(p.xy.x)} y={sy(p.xy.y) + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#000">{i + 1}</text>
              <title>{p.name}</title>
            </g>
          ))}
          <g transform={`translate(${PAD},${H - 24})`}>
            <line x2={bar * scale} stroke="#fff" strokeWidth="2" />
            <text y="-6" fontSize="11" fill="rgba(255,255,255,0.7)">{bar} km</text>
          </g>
          <text x={W - 28} y="30" fontSize="12" fill="rgba(255,255,255,0.7)" textAnchor="middle">N ↑</text>
        </svg>
        <div className="pointer-events-none absolute right-3 bottom-3 hidden rounded-lg bg-black/50 px-3 py-1.5 text-[11px] text-white/60 md:block">
          Local route map · positions approximate
        </div>
      </main>

      {/* Right: detail and plan */}
      <aside className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0e13] p-4 xl:min-h-0 xl:overflow-y-auto">
        {sel ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{sel.name}</h2>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: CAT_COLOR[sel.cat] + '22', color: CAT_COLOR[sel.cat] }}>{sel.cat}</span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {sel.along.toFixed(1)} km along route · {sel.d.toFixed(1)} km from route
              {' · '}{sel.d < 5 ? 'On the way' : sel.d < 20 ? 'Short detour' : 'Long detour'}
            </p>
            <p className="mt-3 text-sm text-white/80">{sel.desc}</p>
            <button onClick={() => togglePlan(sel.id)}
              className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-medium ${plan.includes(sel.id) ? 'bg-white/10 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}>
              {plan.includes(sel.id) ? 'Remove from plan' : 'Add science stop to plan'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-white/50">Select a science stop to see details.</p>
        )}

        <section className="rounded-xl border border-white/10 bg-white/5 p-3">
          <h3 className="text-sm font-semibold text-red-400">Mission plan</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-white/60">Route length</dt><dd>{total.toFixed(1)} km</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Science stops</dt><dd>{planned.length}</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Extra detour (round trip)</dt><dd>~{extra.toFixed(1)} km</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-1 font-medium"><dt>Total distance</dt><dd>~{(total + extra).toFixed(1)} km</dd></div>
          </dl>
          {planned.length > 0 && (
            <ol className="mt-3 space-y-1 text-xs text-white/70">
              {planned.map((p) => <li key={p.id}>{p.along.toFixed(1)} km · {p.name}</li>)}
            </ol>
          )}
          <p className="mt-3 text-[11px] text-white/40">Detours are straight-line estimates and ignore terrain and slope.</p>
        </section>
      </aside>
    </div>
  )
}