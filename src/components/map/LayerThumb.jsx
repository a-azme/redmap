import { useEffect, useState } from 'react'
import { TILE_LAYERS } from '../../services/layerService'

// Jezero er ashepashe ekta chhoto tile thumbnail hishebe use hobe
const LON = 77.5
const LAT = 18.4
const MAX_Z = 4

// Grayscale THEMIS ke false-color (Temperature layer er moto)
const RAMP = [
  [25, 35, 130], [70, 50, 180], [180, 50, 140],
  [240, 100, 50], [255, 200, 70], [255, 248, 200],
]
function rampColor(t) {
  const p = Math.min(1, Math.max(0, t)) * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(p))
  const u = p - i
  const a = RAMP[i]
  const b = RAMP[i + 1]
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}
function colorize(img) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height)
  for (let i = 0; i < d.data.length; i += 4) {
    const v = d.data[i]
    if (v < 8) {
      d.data[i + 3] = 0
      continue
    }
    const [r, g, b] = rampColor(v / 255)
    d.data[i] = r
    d.data[i + 1] = g
    d.data[i + 2] = b
    d.data[i + 3] = 255
  }
  ctx.putImageData(d, 0, 0)
  return c.toDataURL('image/png')
}

const load = (url, cors) =>
  new Promise((resolve) => {
    const img = new Image()
    if (cors) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })

async function build(layerId) {
  const cfg = TILE_LAYERS[layerId]
  if (!cfg) return null
  for (const s of cfg.sources) {
    const top = Math.min(MAX_Z, s.maxNativeZoom)
    // Uchu zoom theke shuru kore, tile na pele kom zoom e try
    for (let z = top; z >= 1; z--) {
      const x = Math.floor(((LON + 180) / 360) * 2 ** (z + 1))
      const y = Math.floor(((90 - LAT) / 180) * 2 ** z)
      for (const ext of ['jpg', 'png']) {
        const url = s.url
          .replace('{ext}', ext)
          .replace('{z}', z)
          .replace('{y}', y)
          .replace('{x}', x)
        const img = await load(url, !!s.colorize)
        console.info('[RedMap thumb]', layerId, img ? 'OK  ' : '404 ', url)
        if (!img) continue
        if (s.colorize) {
          try {
            return colorize(img)
          } catch {
            return null
          }
        }
        return url
      }
    }
  }
  return null
}

const cache = new Map()

export default function LayerThumb({ layerId, grad }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let alive = true
    if (!cache.has(layerId)) cache.set(layerId, build(layerId))
    cache.get(layerId).then((u) => {
      if (alive) setSrc(u)
    })
    return () => {
      alive = false
    }
  }, [layerId])

  return (
    <div className={`relative h-[64px] overflow-hidden bg-gradient-to-br ${grad}`}>
      {src && (
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: '50% 29%' }}
        />
      )}
    </div>
  )
}