import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function ElevationProfile({ profile }) {
  return (
    <div className="flex-1 min-w-0 bg-panel/95 border border-line rounded-2xl p-4">
      <div className="text-sm font-semibold mb-2">Elevation Profile</div>
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={profile} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e5322d" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#e5322d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              type="number" dataKey="km" domain={[0, 'dataMax']}
              tick={{ fill: '#8b95a5', fontSize: 10 }} tickLine={false}
              axisLine={{ stroke: '#1f2733' }} unit=" km"
            />
            <YAxis
              domain={['auto', 'auto']} width={52}
              tick={{ fill: '#8b95a5', fontSize: 10 }} tickLine={false}
              axisLine={false} unit=" km"
            />
            <Tooltip
              contentStyle={{ background: '#0e1218', border: '1px solid #1f2733', fontSize: 12 }}
              formatter={(v) => [`${v} km`, 'Elevation']}
              labelFormatter={(l) => `${l} km`}
            />
            <Area
              type="monotone" dataKey="elevation" stroke="#e5322d" strokeWidth={2}
              fill="url(#elev)" dot={false} isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}