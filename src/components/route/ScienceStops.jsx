import { useMemo, useState } from 'react';

const CAT_BADGE = {
  Boxwork: { bg: 'rgba(226, 59, 46, 0.22)', color: '#ff7b72' },
  Water: { bg: 'rgba(43, 181, 245, 0.2)', color: '#7fd4ff' },
  Minerals: { bg: 'rgba(178, 107, 255, 0.2)', color: '#d2a8ff' },
  Geology: { bg: 'rgba(245, 165, 36, 0.2)', color: '#f5a524' },
  Atmosphere: { bg: 'rgba(75, 224, 138, 0.2)', color: '#4be08a' },
};

const CATEGORIES = ['All', 'Boxwork', 'Water', 'Minerals', 'Geology', 'Atmosphere'];

export default function ScienceStops({
  route,
  selectedIds = [],
  onToggle,
  onLocateStop,
}) {
  const [corridorKm, setCorridorKm] = useState(12);
  const [activeCat, setActiveCat] = useState('All');

  const allStops = useMemo(() => {
    if (!route) return [];
    return route.corridorStops?.length ? route.corridorStops : route.stops || [];
  }, [route]);

  const filteredStops = useMemo(() => {
    return allStops.filter((s) => {
      const dist = s.offRouteKm ?? 0;
      const inCorridor = dist <= corridorKm || selectedIds.includes(s.id);
      const inCat = activeCat === 'All' || (s.category || 'Geology') === activeCat;
      return inCorridor && inCat;
    });
  }, [allStops, corridorKm, activeCat, selectedIds]);

  const selectedStops = useMemo(
    () => allStops.filter((s) => selectedIds.includes(s.id)),
    [allStops, selectedIds]
  );

  const extraDetourKm = useMemo(
    () =>
      +selectedStops
        .reduce((sum, s) => sum + 2 * (s.offRouteKm ?? 0), 0)
        .toFixed(1),
    [selectedStops]
  );

  if (!route) return null;

  const totalWithDetourKm = +(route.distanceKm + extraDetourKm).toFixed(1);

  return (
    <section className="rm-card rm-science">
      <div className="rm-science__head">
        <h3>
          Science Corridor &amp; Stops{' '}
          <span className="rm-count">{filteredStops.length}</span>
        </h3>
        <span className="rm-science__corridor-tag">±{corridorKm} km</span>
      </div>

      {route.settings.showScience ? (
        <>
          <div className="rm-science__controls">
            <label className="rm-field">
              <span>
                Lateral search corridor <b>±{corridorKm} km</b> from route
              </span>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={corridorKm}
                onChange={(e) => setCorridorKm(+e.target.value)}
              />
            </label>

            <div className="rm-science__cats">
              {CATEGORIES.map((cat) => {
                const isAct = activeCat === cat;
                const style =
                  isAct && cat !== 'All' && CAT_BADGE[cat]
                    ? {
                        background: CAT_BADGE[cat].bg,
                        color: CAT_BADGE[cat].color,
                        borderColor: CAT_BADGE[cat].color,
                      }
                    : undefined;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCat(cat)}
                    style={style}
                    className={`rm-science__catbtn${isAct ? ' is-active' : ''}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rm-science__summary">
            <div>
              <small>SELECTED</small>
              <strong>
                {selectedStops.length} {selectedStops.length === 1 ? 'site' : 'sites'}
              </strong>
            </div>
            <div>
              <small>DETOUR (R/T)</small>
              <strong>+{extraDetourKm} km</strong>
            </div>
            <div>
              <small>TOTAL TRAVERSE</small>
              <strong>~{totalWithDetourKm} km</strong>
            </div>
          </div>
        </>
      ) : (
        <p className="rm-muted">
          Science stops are turned off in Route Settings.
        </p>
      )}

      {route.settings.showScience && filteredStops.length === 0 && (
        <p className="rm-muted">
          No catalogued science sites within ±{corridorKm} km for this filter. Widen the corridor slider above.
        </p>
      )}

      <ul>
        {filteredStops.map((s) => {
          const on = selectedIds.includes(s.id);
          const catStyle = CAT_BADGE[s.category] || CAT_BADGE.Geology;
          const offKm = s.offRouteKm ?? 0;
          const detourLabel =
            offKm <= 0.3
              ? 'On route'
              : `${offKm} km off route (+${(offKm * 2).toFixed(1)} km R/T)`;
          return (
            <li key={s.id} className={`rm-stop ${on ? 'is-on' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle?.(s.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="rm-stop__head">
                    <strong>{s.title}</strong>
                    {s.category && (
                      <span
                        className="rm-stop__cat"
                        style={{ background: catStyle.bg, color: catStyle.color }}
                      >
                        {s.category}
                      </span>
                    )}
                  </div>
                  <small>
                    km {s.km} · {s.elevKm.toFixed(1)} km elev · {detourLabel}
                  </small>
                  <p>{s.detail}</p>
                  <div className="rm-stop__foot">
                    {s.source && <span className="rm-src">{s.source}</span>}
                    {onLocateStop && (
                      <button
                        type="button"
                        className="rm-stop__fly"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onLocateStop(s);
                        }}
                      >
                        Center on Map
                      </button>
                    )}
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      {filteredStops.length > 0 && (
        <p className="rm-muted">
          Each selected stop adds ~0.5 sol of field sampling plus round-trip lateral detour.
        </p>
      )}
    </section>
  );
}