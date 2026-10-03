import { useState } from 'react';
import { MODES } from './routeUtils';

export default function RouteSettings({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="rm-settings">
      <button type="button" className="rm-settings__head" onClick={() => setOpen(!open)}>
        <span className="rm-settings__icon">⚙</span>
        <span>
          <small>Route Settings</small>
          <strong>{MODES[value.mode].label}</strong>
        </span>
        <span className={`rm-chevron ${open ? 'is-open' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="rm-settings__body">
          <div className="rm-modes">
            {Object.entries(MODES).map(([key, m]) => (
              <button
                key={key}
                type="button"
                className={`rm-chip ${value.mode === key ? 'is-active' : ''}`}
                onClick={() => set({ mode: key })}
              >
                {m.label.replace(' Route', '')}
              </button>
            ))}
          </div>

          <label className="rm-field">
            <span>Max slope <b>{value.maxSlopeDeg}°</b></span>
            <input type="range" min="5" max="30" value={value.maxSlopeDeg}
              onChange={(e) => set({ maxSlopeDeg: +e.target.value })} />
          </label>

          <label className="rm-field">
            <span>EVA hours per sol <b>{value.evaHoursPerSol} h</b></span>
            <input type="range" min="2" max="10" value={value.evaHoursPerSol}
              onChange={(e) => set({ evaHoursPerSol: +e.target.value })} />
          </label>

          <label className="rm-check">
            <input type="checkbox" checked={value.avoidRough}
              onChange={(e) => set({ avoidRough: e.target.checked })} />
            Avoid rough terrain
          </label>
          <label className="rm-check">
            <input type="checkbox" checked={value.showScience}
              onChange={(e) => set({ showScience: e.target.checked })} />
            Suggest science stops
          </label>
        </div>
      )}
    </div>
  );
}