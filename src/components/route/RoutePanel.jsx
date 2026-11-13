import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleDot, MapPin, MapPinPlus, ArrowUpDown, ChevronDown, Plus, X } from 'lucide-react';
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

function LocationRow({
  label,
  icon,
  isPicking,
  onPickClick,
  loc,
  id,
  setId,
  customLoc,
  onClearCustom,
  options,
}) {
  const selectValue = customLoc ? '__custom__' : id;

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') return;
    onClearCustom?.(null);
    setId(val);
  };

  return (
    <div className="rm-loc">
      <span className="rm-loc__icon">{icon}</span>
      <div className="rm-loc__body">
        <small>
          {label}
          {isPicking ? ' · Tap map…' : ''}
        </small>
        <div className="rm-loc__row">
          <div className="rm-select-wrap">
            <select value={selectValue} onChange={handleSelectChange}>
              {customLoc && (
                <option value="__custom__">
                  {customLoc.name}
                </option>
              )}
              {options.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="rm-select-chevron" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onPickClick?.();
            }}
            className={`rm-loc__picker${isPicking ? ' is-picking' : ''}${customLoc ? ' has-custom' : ''}`}
            title={
              isPicking
                ? `Cancel picking ${label.toLowerCase()} on map`
                : `Pick custom ${label.toLowerCase()} on map`
            }
            aria-label={`Pick custom ${label.toLowerCase()} on map`}
          >
            <MapPinPlus size={15} />
          </button>
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
  customStart = null,
  customDest = null,
  onCustomStartChange,
  onCustomDestChange,
  onEndpointsChange,
  customWaypoints = [],
  mapPickMode = null,
  onSelectPickMode,
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

  const activeSectorKey = sectorKey === 'jezero' ? 'jezero' : 'gale';
  const sectorLocations = getLocationsForSector(activeSectorKey);
  const defaultStartId = activeSectorKey === 'jezero' ? 'butler' : 'gediz';
  const defaultDestId = activeSectorKey === 'jezero' ? 'neretva' : 'boxwork';

  const presetStart =
    sectorLocations.find((l) => l.id === startId) ||
    sectorLocations.find((l) => l.id === defaultStartId) ||
    sectorLocations[0];
  const presetDest =
    sectorLocations.find((l) => l.id === destId && l.id !== presetStart.id) ||
    sectorLocations.find((l) => l.id === defaultDestId && l.id !== presetStart.id) ||
    sectorLocations.find((l) => l.id !== presetStart.id) ||
    sectorLocations[1] ||
    sectorLocations[0];

  const start = customStart || presetStart;
  const dest = customDest || presetDest;

  // Keep map preview endpoints in sync immediately when user picks custom Start/Destination or changes dropdowns
  useEffect(() => {
    onEndpointsChange?.({ start, end: dest });
  }, [start, dest, onEndpointsChange]);

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
                      crewSize: cfg.payloadKg ? cfg.crewSize : primary.settings?.crewSize,
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

  const handlePlan = (e) => {
    e?.currentTarget?.blur();
    onSelectPickMode?.(null);
    runPlan(start, dest, settings, true, customWaypoints);
  };

  const handleSettingsChange = (nextSettings) => {
    const prev = settings;
    setSettings(nextSettings);
    if (
      nextSettings.mode !== prev.mode ||
      nextSettings.maxSlopeDeg !== prev.maxSlopeDeg ||
      nextSettings.showScience !== prev.showScience
    ) {
      runPlan(start, dest, nextSettings, false, customWaypoints);
      return;
    }
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
      const sLoc = LOCATIONS.find((l) => l.id === externalPreset.startId) || presetStart;
      const dLoc = LOCATIONS.find((l) => l.id === externalPreset.destId) || presetDest;
      const nextSettings = {
        ...settings,
        mode: externalPreset.mode || settings.mode,
        payloadKg: externalPreset.payloadKg ?? settings.payloadKg,
      };
      onCustomStartChange?.(null);
      onCustomDestChange?.(null);
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

  const swap = (e) => {
    e?.currentTarget?.blur();
    const prevCustomStart = customStart;
    const prevCustomDest = customDest;
    onCustomStartChange?.(
      prevCustomDest
        ? {
            ...prevCustomDest,
            id: `custom-start-${activeSectorKey}-${prevCustomDest.lat.toFixed(4)}-${prevCustomDest.lon.toFixed(4)}`,
            name: 'Start',
            sector: activeSectorKey,
          }
        : null
    );
    onCustomDestChange?.(
      prevCustomStart
        ? {
            ...prevCustomStart,
            id: `custom-dest-${activeSectorKey}-${prevCustomStart.lat.toFixed(4)}-${prevCustomStart.lon.toFixed(4)}`,
            name: 'Destination',
            sector: activeSectorKey,
          }
        : null
    );
    setStartId(presetDest.id);
    setDestId(presetStart.id);
  };

  const isPickingStart = mapPickMode === 'start';
  const isPickingDest = mapPickMode === 'dest';
  const isPickingDetour = mapPickMode === 'detour';

  return (
    <aside className="rm-panel">
      <header className="rm-panel__title">
        <h2>Route Planner</h2>
      </header>

      <LocationRow
        label="Start Location"
        icon={<CircleDot size={15} className="text-emerald-400" />}
        isPicking={isPickingStart}
        onPickClick={() => onSelectPickMode?.('start')}
        loc={start}
        id={presetStart.id}
        setId={setStartId}
        customLoc={customStart}
        onClearCustom={onCustomStartChange}
        options={sectorLocations}
      />
      <button type="button" className="rm-swap" onClick={swap} title="Swap start and destination">
        <ArrowUpDown size={13} />
      </button>
      <LocationRow
        label="Destination"
        icon={<MapPin size={15} className="text-red-400" />}
        isPicking={isPickingDest}
        onPickClick={() => onSelectPickMode?.('dest')}
        loc={dest}
        id={presetDest.id}
        setId={setDestId}
        customLoc={customDest}
        onClearCustom={onCustomDestChange}
        options={sectorLocations}
      />

      {/* Interactive Custom Waypoint & Detour Insertion Controls */}
      <div className="rm-custom-wps">
        <div className="rm-custom-wps__bar">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onSelectPickMode?.('detour');
            }}
            className={`rm-custom-wps__btn ${isPickingDetour ? 'is-active' : ''}`}
            title="Tap to extend path or add multiple intermediate detour stops on the crater map"
          >
            <Plus size={13} />
            <span>
              {isPickingDetour
                ? `Tap Map to Add Stops (${customWaypoints.length}/4)`
                : 'Add Map Detour Stops'}
            </span>
          </button>
          {customWaypoints.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onClearCustomWaypoints?.();
              }}
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
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRemoveCustomWaypoint?.(w.id);
                  }}
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