import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleDot, MapPin, ArrowUpDown, ChevronDown, Plus, X } from 'lucide-react';
import './route.css';
import RouteSettings from './RouteSettings';
import {
  LOCATIONS,
  DEFAULT_SETTINGS,
  fmtCoord,
  haversineKm,
  getLocationsForSector,
  detectSectorForLocationId,
} from './routeUtils';
import { planAllModes } from '../../services/routePlanner';

const ALLOWED_LOCAL_LOCATIONS = [
  ...getLocationsForSector('gale'),
  ...getLocationsForSector('jezero'),
];

function resolveRouteEndpoints(targetLocation, fallbackStartId, fallbackDestId) {
  if (!targetLocation || typeof targetLocation.lat !== 'number' || typeof targetLocation.lon !== 'number') {
    return { startId: fallbackStartId, destId: fallbackDestId };
  }
  const byId = ALLOWED_LOCAL_LOCATIONS.find((l) => l.id === targetLocation.id);
  const rankedAll = [...ALLOWED_LOCAL_LOCATIONS].sort(
    (a, b) => haversineKm(targetLocation, a) - haversineKm(targetLocation, b)
  );
  const dest = byId || rankedAll[0];
  const secKey = detectSectorForLocationId(dest.id);
  const sectorPool = getLocationsForSector(secKey);
  const rankedInSector = [...sectorPool].sort(
    (a, b) => haversineKm(targetLocation, a) - haversineKm(targetLocation, b)
  );
  const neighbor = rankedInSector.find((l) => l.id !== dest.id) || sectorPool[0];
  return {
    startId: neighbor.id,
    destId: dest.id,
  };
}

function LocationRow({ label, icon, loc, id, setId, options }) {
  return (
    <div className="rm-loc">
      <span className="rm-loc__icon">{icon}</span>
      <div className="rm-loc__body">
        <small>{label}</small>
        <div className="rm-select-wrap">
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {options.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="rm-select-chevron" />
        </div>
        <span className="rm-coord">{fmtCoord(loc.lat, loc.lon)}</span>
      </div>
    </div>
  );
}

export default function RoutePanel({
  onRouteChange,
  sectorKey = 'gale',
  externalPreset = null,
  initialStartId = 'gediz',
  initialDestId = 'boxwork',
  skipInitialPlan = false,
  onPlanSuccess,
  customWaypoints = [],
  addWaypointMode = false,
  onToggleAddWaypointMode,
  onRemoveCustomWaypoint,
  onClearCustomWaypoints,
}) {
  const routerLocation = useLocation();
  const resolved = resolveRouteEndpoints(
    routerLocation.state?.targetLocation,
    initialStartId,
    initialDestId
  );
  const [startId, setStartId] = useState(resolved.startId);
  const [destId, setDestId] = useState(resolved.destId);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refining, setRefining] = useState(false);
  const latest = useRef(0);
  const first = useRef(0);
  const mountedRef = useRef(false);

  const activeSectorKey =
    sectorKey === 'jezero' || detectSectorForLocationId(startId) === 'jezero'
      ? 'jezero'
      : 'gale';
  const sectorLocations = getLocationsForSector(activeSectorKey);
  const start =
    sectorLocations.find((l) => l.id === startId) ||
    LOCATIONS.find((l) => l.id === startId) ||
    sectorLocations[0];
  const dest =
    sectorLocations.find((l) => l.id === destId) ||
    LOCATIONS.find((l) => l.id === destId) ||
    sectorLocations[1] ||
    sectorLocations[0];

  const runPlan = async (
    sLoc = start,
    dLoc = dest,
    cfg = settings,
    userInitiated = false,
    cWaypoints = customWaypoints
  ) => {
    const id = ++latest.current;
    setBusy(true);
    setRefining(false);
    setError('');
    const stale = () => id !== latest.current;
    const fullSettings = { ...cfg, customWaypoints: cWaypoints };
    try {
      const result = await planAllModes(sLoc, dLoc, fullSettings, {
        cancelled: stale,
        onUpdate: ({ primary, alternatives, done }) => {
          if (stale()) return;
          if (first.current !== id) {
            first.current = id;
            onRouteChange?.(
              primary
                ? {
                    ...primary,
                    settings: {
                      ...primary.settings,
                      payloadKg: cfg.payloadKg,
                      crewSize: cfg.crewSize,
                      customWaypoints: cWaypoints,
                    },
                  }
                : primary,
              alternatives
            );
            setBusy(false);
            setRefining(!done);
            if (userInitiated && primary) {
              onPlanSuccess?.();
            }
          } else {
            onRouteChange?.(
              primary
                ? {
                    ...primary,
                    settings: {
                      ...primary.settings,
                      payloadKg: cfg.payloadKg,
                      crewSize: cfg.crewSize,
                      customWaypoints: cWaypoints,
                    },
                  }
                : primary,
              alternatives,
              { update: true }
            );
            setRefining(!done);
          }
        },
      });
      if (stale()) return;
      if (!result) {
        setError('Start and destination must be different.');
        onRouteChange?.(null);
      }
    } catch (e) {
      if (stale()) return;
      setError(e.message || 'Could not plan this route.');
      onRouteChange?.(null);
    } finally {
      if (!stale()) {
        setBusy(false);
        setRefining(false);
      }
    }
  };

  const handlePlan = () => runPlan(start, dest, settings, true, customWaypoints);

  const handleSettingsChange = (nextSettings) => {
    const prev = settings;
    setSettings(nextSettings);
    if (
      nextSettings.payloadKg !== prev.payloadKg ||
      nextSettings.evaHoursPerSol !== prev.evaHoursPerSol ||
      nextSettings.crewSize !== prev.crewSize
    ) {
      onRouteChange?.(null, undefined, { settingsPatch: nextSettings });
    }
  };

  useEffect(() => {
    if (skipInitialPlan) return undefined;
    const timer = setTimeout(() => {
      mountedRef.current = true;
      runPlan(start, dest, settings, false, customWaypoints);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-plan automatically whenever custom detour waypoints are added or removed
  const customWpKey = customWaypoints.map((w) => `${w.lat},${w.lon}`).join(';');
  useEffect(() => {
    if (!mountedRef.current || skipInitialPlan) return undefined;
    const timer = setTimeout(() => {
      runPlan(start, dest, settings, false, customWaypoints);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customWpKey]);

  useEffect(() => {
    if (!externalPreset?.startId || !externalPreset?.destId) return undefined;
    const timer = setTimeout(() => {
      const sLoc = LOCATIONS.find((l) => l.id === externalPreset.startId) || start;
      const dLoc = LOCATIONS.find((l) => l.id === externalPreset.destId) || dest;
      const nextSettings = {
        ...settings,
        mode: externalPreset.mode || settings.mode,
        payloadKg: externalPreset.payloadKg ?? settings.payloadKg,
      };
      setStartId(sLoc.id);
      setDestId(dLoc.id);
      setSettings(nextSettings);
      if (!skipInitialPlan) {
        runPlan(sLoc, dLoc, nextSettings, false, []);
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPreset?.seq]);

  const swap = () => {
    setStartId(destId);
    setDestId(startId);
  };

  return (
    <aside className="rm-panel">
      <header className="rm-panel__title">
        <h2>Route Planner</h2>
      </header>

      <LocationRow
        label="Start Location"
        icon={<CircleDot size={15} className="text-emerald-400" />}
        loc={start}
        id={start.id}
        setId={setStartId}
        options={sectorLocations}
      />
      <button type="button" className="rm-swap" onClick={swap} title="Swap start and destination">
        <ArrowUpDown size={13} />
      </button>
      <LocationRow
        label="Destination"
        icon={<MapPin size={15} className="text-red-400" />}
        loc={dest}
        id={dest.id}
        setId={setDestId}
        options={sectorLocations}
      />

      {/* Interactive Custom Waypoint & Detour Insertion Controls */}
      <div className="rm-custom-wps">
        <div className="rm-custom-wps__bar">
          <button
            type="button"
            onClick={onToggleAddWaypointMode}
            className={`rm-custom-wps__btn ${addWaypointMode ? 'is-active' : ''}`}
            title="Click anywhere on the crater map to insert an intermediate detour waypoint"
          >
            <Plus size={13} />
            <span>{addWaypointMode ? 'Click Map to Place Detour…' : 'Add Map Detour Waypoint'}</span>
          </button>
          {customWaypoints.length > 0 && (
            <button
              type="button"
              onClick={onClearCustomWaypoints}
              className="rm-custom-wps__clear"
              title="Clear all custom detour waypoints"
            >
              Clear
            </button>
          )}
        </div>

        {customWaypoints.length > 0 && (
          <ul className="rm-custom-wps__list">
            {customWaypoints.map((w, idx) => (
              <li key={w.id} className="rm-custom-wps__item">
                <span className="rm-custom-wps__badge">D{idx + 1}</span>
                <span className="rm-custom-wps__coord">{fmtCoord(w.lat, w.lon)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveCustomWaypoint?.(w.id)}
                  aria-label={`Remove ${w.name}`}
                  className="rm-custom-wps__del"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RouteSettings value={settings} onChange={handleSettingsChange} />

      {error && <p className="rm-error">{error}</p>}

      <button type="button" className="rm-plan" onClick={handlePlan} disabled={busy}>
        {busy ? 'Planning route…' : 'Plan Route'}
      </button>
      {refining && <p className="rm-muted">Comparing route options…</p>}
    </aside>
  );
}