import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RouteMap from '../components/route/RouteMap'
import RoutePanel from '../components/route/RoutePanel'
import RouteOverview from '../components/route/RouteOverview'
import ElevationProfile from '../components/route/ElevationProfile'
import RouteWarnings from '../components/route/RouteWarnings'
import ScienceStops from '../components/route/ScienceStops'
import DestinationInfo from '../components/route/DestinationInfo'
import EvaTimeline from '../components/route/EvaTimeline'
import RouteCompare from '../components/route/RouteCompare'
import RouteWaypoints from '../components/route/RouteWaypoints'
import RouteWhy from '../components/route/RouteWhy'
import { planEva } from '../lib/evaPlan'

// must match keys in services/layerService TILE_LAYERS
const LAYERS = ['terrain', 'satellite', 'elevation']
const MODES = ['3D', '2D']
const cap = (s) => s[0].toUpperCase() + s.slice(1)

export default function RoutePlannerPage() {
  const navigate = useNavigate()
  const [route, setRoute] = useState(null)
  const [selected, setSelected] = useState([])
  const [alternatives, setAlternatives] = useState(null)
  const [hazard, setHazard] = useState('off') // map heat-map: 'off' | 'slope' | 'low'
  const [layer, setLayer] = useState('terrain')
  const [mode, setMode] = useState('3D')
  const [evaDate, setEvaDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [travel, setTravel] = useState('rover')

  const plan = useMemo(() => {
    if (!route) return null
    const d = new Date(`${evaDate}T00:00:00Z`)
    return planEva(route, { date: Number.isNaN(d.getTime()) ? new Date() : d, travel, selectedStopIds: selected })
  }, [route, evaDate, travel, selected])

  const toggleStop = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
    <div className="rm-page">
      <div className="rm-mapwrap">
        <RouteMap route={route} alternatives={alternatives} hazard={hazard} layer={layer} mode={mode} selectedStopIds={selected} />
      </div>

      <div className="rm-layout">
        <RoutePanel onBack={() => navigate('/')} onRouteChange={(r, alts) => { setRoute(r); setAlternatives(alts ?? null); setSelected([]) }} />

        <div className="rm-topbar">
          <div className="rm-viewtoggle">
            {LAYERS.map((v) => (
              <button key={v} className={layer === v ? 'is-active' : ''} onClick={() => setLayer(v)}>{cap(v)}</button>
            ))}
          </div>
          <div className="rm-viewtoggle">
            {MODES.map((m) => (
              <button key={m} className={mode === m ? 'is-active' : ''} onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>
        </div>

        <div className="rm-right">
          <RouteCompare routes={alternatives} current={route} onSelect={(r) => { setRoute(r); setSelected([]) }} />
          <RouteWhy route={route} hazard={hazard} onHazard={setHazard} />
          <DestinationInfo route={route} onDetails={() => navigate('/missions')} />
          <EvaTimeline route={route} plan={plan} date={evaDate} onDate={setEvaDate} travel={travel} onTravel={setTravel} />
          <RouteWaypoints route={route} />
          <RouteWarnings route={route} />
          <ScienceStops route={route} selectedIds={selected} onToggle={toggleStop} />
        </div>

        <div className="rm-bottom">
          <RouteOverview route={route} plan={plan} selectedStopIds={selected} />
          <ElevationProfile route={route} />
        </div>
      </div>
    </div>
  )
}