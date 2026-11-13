import { Rocket } from 'lucide-react'
import locations from '../../data/locations.json'
import { useRouteStore } from '../../store/useRouteStore'
import { ROUTE_MODES } from '../../constants/config'

const selectCls =
  'w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-red'

export default function RoutePanel() {
  const { startId, destId, mode, error, setStartId, setDestId, setMode, planRoute } =
    useRouteStore()

  return (
    <aside className="absolute left-4 top-4 w-[300px] max-h-[calc(100%-210px)] overflow-y-auto bg-panel/95 border border-line rounded-2xl p-5 z-10">
      <div className="flex items-center gap-3 mb-5">
        <Rocket className="text-red" size={26} />
        <div>
          <div className="font-bold">Route Planner</div>
          <div className="text-xs text-muted">Plan your journey across Mars</div>
        </div>
      </div>

      <label className="text-xs text-muted">Start Location</label>
      <select value={startId} onChange={(e) => setStartId(e.target.value)} className={`${selectCls} mb-4 mt-1`}>
        {locations.map((l) => (
          <option key={l.id} value={l.id} className="bg-panel">{l.name}</option>
        ))}
      </select>

      <label className="text-xs text-muted">Destination</label>
      <select value={destId} onChange={(e) => setDestId(e.target.value)} className={`${selectCls} mb-4 mt-1`}>
        {locations.map((l) => (
          <option key={l.id} value={l.id} className="bg-panel">{l.name}</option>
        ))}
      </select>

      <div className="text-xs text-muted mb-2">Route Settings</div>
      <div className="space-y-2 mb-5">
        {Object.entries(ROUTE_MODES).map(([key, m]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
              mode === key
                ? 'border-red bg-red/15 text-white'
                : 'border-line bg-panel-2 text-muted hover:text-white'
            }`}
          >
            <div className="font-medium">{m.label}</div>
            <div className="text-xs opacity-70">{m.desc}</div>
          </button>
        ))}
      </div>

      <button
        onClick={planRoute}
        className="w-full flex items-center justify-center gap-2 bg-red hover:bg-red-dark transition rounded-lg py-3 font-semibold"
      >
        <Rocket size={16} /> Plan Route
      </button>

      {error && <div className="mt-3 text-xs text-red">{error}</div>}
    </aside>
  )
}