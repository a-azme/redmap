import { useState, useEffect } from 'react';
import './route.css';
import RouteSettings from './RouteSettings';
import { LOCATIONS, DEFAULT_SETTINGS, planRoute, fmtCoord } from './routeUtils';

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
 *  - onRouteChange(route | null)
 *  - onBack (optional)
 *  - initialStartId, initialDestId (optional)
 */
export default function RoutePanel({ onRouteChange, onBack, initialStartId = 'valles', initialDestId = 'jezero' }) {
  const [startId, setStartId] = useState(initialStartId);
  const [destId, setDestId] = useState(initialDestId);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');

  const start = LOCATIONS.find((l) => l.id === startId);
  const dest = LOCATIONS.find((l) => l.id === destId);

  const handlePlan = () => {
    const route = planRoute(start, dest, settings);
    if (!route) {
      setError('Start and destination must be different.');
      onRouteChange?.(null);
      return;
    }
    setError('');
    onRouteChange?.(route);
  };

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

      <button type="button" className="rm-plan" onClick={handlePlan}>🚀 Plan Route</button>
    </aside>
  );
}