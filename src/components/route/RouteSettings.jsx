import { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { MODES } from './routeUtils';

export default function RouteSettings({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });
  const payloadKg = value.payloadKg ?? 12;
  const marsWeightKgf = (payloadKg * 0.38).toFixed(1);

  return (
    <div className="rm-settings">
      <button type="button" className="rm-settings__head" onClick={() => setOpen(!open)}>
        <span className="rm-settings__icon">
          <SlidersHorizontal size={15} className="text-gray-400" />
        </span>
        <span>
          <small>Route &amp; Suit Constraints</small>
          <strong>{MODES[value.mode]?.label?.replace(' Route', '') ?? 'Science'} · ≤{value.maxSlopeDeg}° · {payloadKg} kg</strong>
        </span>
        <ChevronDown size={16} className={`rm-chevron text-gray-400 ${open ? 'is-open' : ''}`} />
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

          <label className="rm-field">
            <span>
              Equipment load <b>{payloadKg} kg</b>{' '}
              <small style={{ color: '#9aa0ad' }}>(≈{marsWeightKgf} kgf in 0.38g)</small>
            </span>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={payloadKg}
              onChange={(e) => set({ payloadKg: +e.target.value })}
            />
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