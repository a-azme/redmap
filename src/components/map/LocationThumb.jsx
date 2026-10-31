import { useEffect, useRef, useState } from 'react'
import { TILE_LAYERS } from '../../services/layerService'

// Prottek location er jonno zoom level (boro feature e kom zoom)
const ZOOM = {
  jezero: 5,
  nili: 5,
  tyrrhena: 4,
  isidis: 3,
  olympus: 3,
  valles: 3,
  butler: 5,
  delta: 5,
  neretva: 5,
  syrtis: 4,
}

function getThumbZoom(loc) {
  if (ZOOM[loc.id]) return ZOOM[loc.id]
  const d = Number(loc.diameter) || 0
  if (d >= 1500) return 2
  if (d >= 450) return 3
  if (d >= 100) return 4
  return 5
}

const TILE = 256
const OUT = 160 // thumbnail pixel size
const CROP = 192 // tile theke koto pixel kete nibo

const norm = (lon) => (lon > 180 ? lon - 360 : lon)

const load = (url) =>
  new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })

const tileUrl = (tpl, ext, z, x, y) =>
  tpl.replace('{ext}', ext).replace('{z}', z).replace('{y}', y).replace('{x}', x)

async function build(loc) {
  const src = TILE_LAYERS.terrain.sources[0]
  const z = getThumbZoom(loc)
  const rows = 2 ** z
  const cols = 2 ** (z + 1)
  const fx = ((norm(loc.lon) + 180) / 360) * cols
  const fy = ((90 - loc.lat) / 180) * rows
  const tx = Math.floor(fx)
  const ty = Math.floor(fy)

  // Majher tile diye jpg/png thik kori
  let ext = 'jpg'
  let center = await load(tileUrl(src.url, 'jpg', z, tx, ty))
  if (!center) {
    ext = 'png'
    center = await load(tileUrl(src.url, 'png', z, tx, ty))
  }
  if (!center) return null

  // 3x3 tile jure majhkhane location rakhi
  const big = document.createElement('canvas')
  big.width = TILE * 3
  big.height = TILE * 3
  const bctx = big.getContext('2d')
  const jobs = []
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const ny = ty + j
      if (ny < 0 || ny >= rows) continue
      const nx = (((tx + i) % cols) + cols) % cols
      const px = (i + 1) * TILE
      const py = (j + 1) * TILE
      if (i === 0 && j === 0) {
        bctx.drawImage(center, px, py)
      } else {
        jobs.push(
          load(tileUrl(src.url, ext, z, nx, ny)).then((img) => {
            if (img) bctx.drawImage(img, px, py)
          })
        )
      }
    }
  }
  await Promise.all(jobs)

  const cx = (fx - (tx - 1)) * TILE
  const cy = (fy - (ty - 1)) * TILE
  const out = document.createElement('canvas')
  out.width = OUT
  out.height = OUT
  out.getContext('2d').drawImage(big, cx - CROP / 2, cy - CROP / 2, CROP, CROP, 0, 0, OUT, OUT)
  try {
    return out.toDataURL('image/jpeg', 0.85)
  } catch {
    return tileUrl(src.url, ext, z, tx, ty) // canvas block hole shudhu majher tile
  }
}

const cache = new Map()

export default function LocationThumb({ loc, className = '' }) {
  const elRef = useRef(null)
  const [visible, setVisible] = useState(() => cache.has(loc.id))
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (visible) return
    const el = elRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '120px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loc.id, visible])

  useEffect(() => {
    if (!visible) return
    let alive = true
    setSrc(null)
    if (!cache.has(loc.id)) cache.set(loc.id, build(loc))
    cache.get(loc.id).then((u) => {
      if (alive) setSrc(u)
    })
    return () => {
      alive = false
    }
  }, [loc.id, visible]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={elRef}
      className={`shrink-0 overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${loc.color}, #1a0b08)` }}
    >
      {src && (
        <img src={src} alt={loc.name} draggable={false} className="h-full w-full object-cover" />
      )}
    </div>
  )
}