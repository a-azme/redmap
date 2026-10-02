import { ShieldAlert } from 'lucide-react'
import { ROUGH_SLOPE } from '../../constants/config'

export default function RouteWarnings({ analysis }) {
  const warnings = []
  if (analysis.roughSpot && analysis.maxSlope > ROUGH_SLOPE) {
    warnings.push(
      `Steep section at ${analysis.roughSpot.km.toFixed(0)} km (slope ${analysis.maxSlope.toFixed(1)}°)`
    )
  }
  if (analysis.roughCount > 0) {
    warnings.push(`${analysis.roughCount} rough segment(s) on this route`)
  }
  if (analysis.sols > 8) {
    warnings.push('Long route: plan extra supplies and power')
  }

  return (
    <div>
      <div className="font-semibold mb-3">Safety Alerts</div>
      {warnings.length === 0 ? (
        <div className="text-sm text-green-400">No major hazards detected.</div>
      ) : (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div key={w} className="flex gap-2 text-sm text-amber-400">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}