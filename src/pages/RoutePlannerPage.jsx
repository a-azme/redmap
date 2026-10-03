import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RouteMap from "../components/route/RouteMap";
import RouteGlobe from '../components/route/RouteGlobe'
import RoutePanel from '../components/route/RoutePanel'
import RouteOverview from '../components/route/RouteOverview'
import ElevationProfile from '../components/route/ElevationProfile'
import RouteWarnings from '../components/route/RouteWarnings'
import ScienceStops from '../components/route/ScienceStops'
import DestinationInfo from '../components/route/DestinationInfo'

export default function RoutePlannerPage() {
  const navigate = useNavigate()
  const [route, setRoute] = useState(null)
  const [selected, setSelected] = useState([])
  const [view, setView] = useState('terrain') // terrain | satellite | elevation

  const toggleStop = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const handleRouteChange = (r) => {
    setRoute(r)
    setSelected([])
  }

  return (
    // adjust 90px to your navbar height
    <div style={{ position: 'relative', height: 'calc(100vh - 90px)', overflow: 'hidden' }}>
      <RouteMap route={route} view={view} selectedStopIds={selected} />

      <div className="rm-layout">
        <RoutePanel onBack={() => navigate('/')} onRouteChange={handleRouteChange} />

        <div className="rm-viewtoggle">
          {['terrain', 'satellite', 'elevation'].map((v) => (
            <button key={v} className={view === v ? 'is-active' : ''} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
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