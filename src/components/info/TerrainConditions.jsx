import { Mountain, TrendingUp, Ruler, Thermometer } from 'lucide-react'

function terrainType(avg) {
  if (avg < 3) return 'Plains / Crater Floor'
  if (avg < 6) return 'Rocky / Undulating'
  return 'Rugged / Steep'
}

export default function TerrainConditions({ analysis }) {
  const rows = [
    { icon: Mountain, label: 'Terrain Type', value: terrainType(analysis.avgSlope) },
    { icon: TrendingUp, label: 'Elevation (dest.)', value: `${analysis.endElevation} km` },
    { icon: Ruler, label: 'Avg. Slope', value: `${analysis.avgSlope.toFixed(1)}°` },
    { icon: Thermometer, label: 'Temperature (est.)', value: '-63°C' },
  ]
  return (
    <div>
      <div className="font-semibold mb-3">Terrain & Conditions</div>
      <div className="space-y-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-panel-2 flex items-center justify-center">
              <Icon size={18} className="text-muted" />
            </div>
            <div>
              <div className="text-xs text-muted">{label}</div>
              <div className="text-sm font-medium">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}