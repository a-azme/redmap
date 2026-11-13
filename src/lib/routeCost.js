import { ROUGH_SLOPE, SOL_RANGE_KM } from '../constants/config'

export function analyzeRoute(grid, path) {
  const { gw, heights, dx, dy } = grid
  let dist = 0, gain = 0, slopeSum = 0, roughCount = 0
  let roughSpot = null
  const profile = []

  path.forEach((p, i) => {
    const h = heights[p.y * gw + p.x]
    if (i > 0) {
      const q = path[i - 1]
      const d = Math.hypot((p.x - q.x) * dx, (p.y - q.y) * dy)
      const dz = h - heights[q.y * gw + q.x]
      const slope = (Math.atan(Math.abs(dz) / d) * 180) / Math.PI
      dist += d
      if (dz > 0) gain += dz
      slopeSum += slope
      if (slope > ROUGH_SLOPE) roughCount++
      if (!roughSpot || slope > roughSpot.slope) {
        roughSpot = { x: p.x, y: p.y, slope, km: dist }
      }
    }
    profile.push({ km: +dist.toFixed(1), elevation: +h.toFixed(2) })
  })

  return {
    distance: dist,
    gain,
    avgSlope: slopeSum / Math.max(1, path.length - 1),
    maxSlope: roughSpot ? roughSpot.slope : 0,
    roughCount,
    roughSpot,
    profile,
    endElevation: profile[profile.length - 1].elevation,
    sols: dist / SOL_RANGE_KM,
  }
}