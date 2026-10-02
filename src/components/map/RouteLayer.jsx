import { useEffect, useRef } from 'react'
import { ROUGH_SLOPE } from '../../constants/config'

const lerp = (a, b, t) => a + (b - a) * t
function ramp(t) {
  const lo = [58, 22, 14], mid = [170, 78, 40], hi = [226, 160, 112]
  const [a, b, u] = t < 0.5 ? [lo, mid, t * 2] : [mid, hi, (t - 0.5) * 2]
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]
}

function Tag({ x, y, text, color = '#fff', left = false }) {
  const w = text.length * 1.2 + 2.4
  const rx = left ? x - w : x
  return (
    <g>
      <rect x={rx} y={y - 2.2} width={w} height={3.8} rx={1} fill="rgba(10,13,18,0.88)" />
      <text x={rx + 1.2} y={y + 0.5} fontSize="2" fontWeight="600" fill={color}>
        {text}
      </text>
    </g>
  )
}

export default function RouteLayer({ result }) {
  const canvasRef = useRef(null)
  const { grid, path, analysis, start, dest, startLoc, destLoc, pois, nearPois } = result
  const { gw, gh } = grid
  const nearIds = new Set(nearPois.map((p) => p.id))
  const isRight = (x) => x > gw * 0.7

  useEffect(() => {
    const c = canvasRef.current
    const { heights, dx, dy } = grid
    c.width = gw
    c.height = gh
    const ctx = c.getContext('2d')
    const img = ctx.createImageData(gw, gh)

    let min = Infinity, max = -Infinity
    for (const h of heights) {
      if (h < min) min = h
      if (h > max) max = h
    }
    const at = (x, y) =>
      heights[Math.min(gh - 1, Math.max(0, y)) * gw + Math.min(gw - 1, Math.max(0, x))]

    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const h = heights[y * gw + x]
        const t = (h - min) / (max - min || 1)
        const dzdx = (at(x + 1, y) - at(x - 1, y)) / (2 * dx)
        const dzdy = (at(x, y + 1) - at(x, y - 1)) / (2 * dy)
        const s = Math.min(1.6, Math.max(0.45, 1 + 6 * (dzdx + dzdy)))
        const [r, g, b] = ramp(t)
        const i = (y * gw + x) * 4
        img.data[i] = Math.min(255, r * s)
        img.data[i + 1] = Math.min(255, g * s)
        img.data[i + 2] = Math.min(255, b * s)
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [grid, gw, gh])

  const points = path.map((p) => `${p.x + 0.5},${p.y + 0.5}`).join(' ')
  const step = Math.max(1, Math.ceil(path.length / 12))
  const mid = path[Math.floor(path.length / 2)]
  const rough = analysis.roughSpot && analysis.maxSlope > ROUGH_SLOPE ? analysis.roughSpot : null

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="w-full h-full" style={{ objectFit: 'cover' }} />
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${gw} ${gh}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {pois.map((p) => (
          <g key={p.id}>
            <circle
              cx={p.x + 0.5} cy={p.y + 0.5}
              r={nearIds.has(p.id) ? 1.1 : 0.7}
              fill={nearIds.has(p.id) ? '#fbbf24' : '#9ca3af'}
              stroke="#0b0e13" strokeWidth="0.25"
            />
            {nearIds.has(p.id) && (
              <Tag x={p.x + 2} y={p.y - 1.5} text={p.name} color="#fbbf24" left={isRight(p.x)} />
            )}
          </g>
        ))}

        <polyline points={points} fill="none" stroke="#3aa0ff" strokeOpacity="0.25"
          strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline points={points} fill="none" stroke="#4db3ff"
          strokeWidth="3.5" strokeDasharray="9 6" strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" />

        {path.filter((_, i) => i % step === 0).map((p, i) => (
          <circle key={i} cx={p.x + 0.5} cy={p.y + 0.5} r="0.5" fill="#fff" />
        ))}

        {rough && (
          <g>
            <path d={`M${rough.x},${rough.y - 2.4} l1.6,2.8 h-3.2 z`} fill="#f59e0b" stroke="#0b0e13" strokeWidth="0.25" />
            <Tag x={rough.x + 2.4} y={rough.y - 0.5}
              text={`Rough Terrain ${rough.slope.toFixed(0)}°`} color="#f59e0b" left={isRight(rough.x)} />
          </g>
        )}

        <Tag x={mid.x + 2} y={mid.y + 4} text={`Elevation Gain +${analysis.gain.toFixed(1)} km`} left={isRight(mid.x)} />

        <circle cx={start.x + 0.5} cy={start.y + 0.5} r="1.6" fill="#22c55e" stroke="#fff" strokeWidth="0.3" />
        <Tag x={start.x + 2.6} y={start.y} text={`Start: ${startLoc.name}`} color="#86efac" left={isRight(start.x)} />

        <circle cx={dest.x + 0.5} cy={dest.y + 0.5} r="1.6" fill="#e5322d" stroke="#fff" strokeWidth="0.3" />
        <Tag x={dest.x + 2.6} y={dest.y} text={`Destination: ${destLoc.name}`} color="#fca5a5" left={isRight(dest.x)} />
      </svg>
    </div>
  )
}