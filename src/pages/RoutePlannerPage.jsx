import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RouteMap from '../components/route/RouteMap'
import RoutePanel from '../components/route/RoutePanel'
import RouteOverview from '../components/route/RouteOverview'
import ElevationProfile from '../components/route/ElevationProfile'
import RouteWarnings from '../components/route/RouteWarnings'
import ScienceStops from '../components/route/ScienceStops'
import DestinationInfo from '../components/route/DestinationInfo'

// must match keys in services/layerService TILE_LAYERS
const LAYERS = ['terrain', 'satellite', 'elevation']
const MODES = ['3D', '2D']
const cap = (s) => s[0].toUpperCase() + s.slice(1)

export default function RoutePlannerPage() {
  const navigate = useNavigate()
  const [route, setRoute] = useState(null)
  const [selected, setSelected] = useState([])
  const [layer, setLayer] = useState('terrain')
  const [mode, setMode] = useState('3D')

  const toggleStop = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    // adjust 90px to your navbar height
    <div style={{ position: 'relative', height: 'calc(100vh - 90px)', overflow: 'hidden' }}>
      <RouteMap route={route} layer={layer} mode={mode} selectedStopIds={selected} />

      <div className="rm-layout">
        <RoutePanel onBack={() => navigate('/')} onRouteChange={(r) => { setRoute(r); setSelected([]) }} />

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
          <DestinationInfo route={route} onDetails={() => navigate('/missions')} />
          <RouteWarnings route={route} />
          <ScienceStops route={route} selectedIds={selected} onToggle={toggleStop} />
        </div>

        <div className="rm-bottom">
          <RouteOverview route={route} selectedStopIds={selected} />
          <ElevationProfile route={route} />
        </div>
      </div>
    </div>
  )
}