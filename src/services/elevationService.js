import { haversine } from '../lib/geo'

// ============================================================
// PLACEHOLDER: ekhane synthetic (nokol) terrain use hocche.
// Pore NASA MOLA elevation data diye heightAt() / getTerrainGrid()
// replace korte hobe. Baki code change lagbe na.
// ============================================================

function hash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return h - Math.floor(h)
}
const smooth = (t) => t * t * (3 - 2 * t)

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const a = hash(xi, yi), b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  const u = smooth(xf), v = smooth(yf)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x, y) {
  let s = 0, amp = 0.5, f = 1
  for (let i = 0; i < 5; i++) {
    s += amp * vnoise(x * f, y * f)
    f *= 2
    amp *= 0.5
  }
  return s
}

// height in km
export function heightAt(lat, lon) {
  return (
    -2.4 +
    (fbm(lat * 1.3, lon * 1.3) - 0.5) * 3.2 +
    (fbm(lat * 6 + 50, lon * 6) - 0.5) * 0.5
  )
}

export function getTerrainGrid(b, gw, gh) {
  const heights = new Float32Array(gw * gh)
  for (let y = 0; y < gh; y++) {
    const lat = b.latMax - (y / (gh - 1)) * (b.latMax - b.latMin)
    for (let x = 0; x < gw; x++) {
      const lon = b.lonMin + (x / (gw - 1)) * (b.lonMax - b.lonMin)
      heights[y * gw + x] = heightAt(lat, lon)
    }
  }
  const cLat = (b.latMax + b.latMin) / 2
  const dx = haversine(cLat, b.lonMin, cLat, b.lonMin + (b.lonMax - b.lonMin) / (gw - 1))
  const dy = haversine(b.latMax, b.lonMin, b.latMax - (b.latMax - b.latMin) / (gh - 1), b.lonMin)
  return { gw, gh, heights, dx, dy, bounds: b }
}