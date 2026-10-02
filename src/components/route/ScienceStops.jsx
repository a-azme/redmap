import { FlaskConical } from 'lucide-react'

export default function ScienceStops({ nearPois, mode }) {
  return (
    <div>
      <div className="font-semibold mb-3">Science Stops</div>
      {nearPois.length === 0 ? (
        <div className="text-sm text-muted">Route er pashe kono science site nai.</div>
      ) : (
        <div className="space-y-3">
          {nearPois.map((p) => (
            <div key={p.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center shrink-0">
                <FlaskConical size={15} className="text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted">{p.note}</div>
                <div className="text-[11px] text-amber-400 mt-0.5">{p.distKm.toFixed(1)} km from route</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {mode !== 'scientific' && (
        <div className="text-xs text-muted mt-3">
          Tip: "Most Scientific" mode e route ei site gulor kache diye jabe.
        </div>
      )}
    </div>
  )
}