import { useEffect, useState } from 'react'
import { TILE_LAYERS } from '../../services/layerService'
import { colorizeToDataUrl } from '../../services/tiles'

// Jezero er ashepashe ekta chhoto tile thumbnail hishebe use hobe
const LON = 77.5
const LAT = 18.4
const MAX_Z = 4

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
            return colorizeToDataUrl(img)
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