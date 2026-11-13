import { useState, useEffect, useRef } from 'react';
import './route.css';
import RouteSettings from './RouteSettings';
import { LOCATIONS, DEFAULT_SETTINGS, fmtCoord } from './routeUtils';
import { planAllModes } from '../../services/routePlanner';

function LocationRow({ label, icon, loc, id, setId }) {
  return (
    <div className="rm-loc">
      <span className="rm-pin">{icon}</span>
      <div className="rm-loc__body">
        <small>{label}</small>
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <span className="rm-coord">{fmtCoord(loc.lat, loc.lon)}</span>
      </div>
    </div>
  );
}

/**
 * Props:
 *  - onRouteChange(route | null, alternatives?)  alternatives maps mode -> route for the comparison card
 *  - onBack (optional)
 *  - initialStartId, initialDestId (optional)
 */
export default function RoutePanel({ onRouteChange, onBack, initialStartId = 'nili', initialDestId = 'jezero' }) {
  const [startId, setStartId] = useState(initialStartId);
  const [destId, setDestId] = useState(initialDestId);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refining, setRefining] = useState(false);
  const latest = useRef(0); // ignore results from an older, slower request
  const first = useRef(0); // id of the request whose first result is already on screen

  const start = LOCATIONS.find((l) => l.id === startId);
  const dest = LOCATIONS.find((l) => l.id === destId);

  const handlePlan = async () => {
    const id = ++latest.current
    setBusy(true)
    setRefining(false)
    setError('')
    const stale = () => id !== latest.current
    try {
      const result = await planAllModes(start, dest, settings, {
        cancelled: stale,
        onUpdate: ({ primary, alternatives, done }) => {
          if (stale()) return
          if (first.current !== id) {
            // first result: show the route now and let the other modes fill in behind it
            first.current = id
            onRouteChange?.(primary, alternatives)
            setBusy(false)
            setRefining(!done)
          } else {
            onRouteChange?.(primary, alternatives, { update: true })
            setRefining(!done)
          }
        },
      })
      if (stale()) return
      if (!result) {
        setError('Start and destination must be different.')
        onRouteChange?.(null)
      }
    } catch (e) {
      if (stale()) return
      setError(e.message || 'Could not plan this route.')
      onRouteChange?.(null)
    } finally {
      if (!stale()) { setBusy(false); setRefining(false) }
    }
  }

  // Plan the default route once when the page opens
  useEffect(() => {
    handlePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swap = () => { setStartId(destId); setDestId(startId); };

  return (
    <aside className="rm-panel">
      {onBack && <button type="button" className="rm-back" onClick={onBack}>← Back to Map</button>}

      <header className="rm-panel__title">
        <span className="rm-rocket">🚀</span>
        <div>
          <h2>Route Planner</h2>
          <p>Plan your journey across Mars</p>
        </div>
      </header>

      <LocationRow label="Start Location" icon="🟢" loc={start} id={startId} setId={setStartId} />
      <button type="button" className="rm-swap" onClick={swap} title="Swap">⇅</button>
      <LocationRow label="Destination" icon="📍" loc={dest} id={destId} setId={setDestId} />

      <RouteSettings value={settings} onChange={setSettings} />

      {error && <p className="rm-error">{error}</p>}

      <button type="button" className="rm-plan" onClick={handlePlan} disabled={busy}>
        {busy ? 'Loading NASA terrain…' : '🚀 Plan Route'}
      </button>
      {refining && <p className="rm-muted">Comparing the other modes…</p>}
    </aside>
  );
}