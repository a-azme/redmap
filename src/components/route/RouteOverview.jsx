export default function RouteOverview({ analysis }) {
  const stats = [
    { label: 'Total Distance', value: `~ ${analysis.distance.toFixed(0)} km` },
    { label: 'Estimated Time', value: `~ ${analysis.sols.toFixed(1)} sols` },
    { label: 'Elevation Gain', value: `+${analysis.gain.toFixed(1)} km` },
  ]
  return (
    <div className="w-[330px] shrink-0 bg-panel/95 border border-line rounded-2xl p-4">
      <div className="font-semibold mb-3">Route Overview</div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[11px] text-muted">{s.label}</div>
            <div className="text-lg font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted mt-3">Avg slope {analysis.avgSlope.toFixed(1)}° • Max {analysis.maxSlope.toFixed(1)}°</div>
    </div>
  )
}