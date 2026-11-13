import { useEffect, useState } from 'react'

const LAYER = 'Mars_Viking_MDIM21_ClrMosaic_global_232m'
const tileUrl = (col) =>
  `https://api.nasa.gov/mars-wmts/catalog/${LAYER}/1.0.0/default/default028mm/0/0/${col}.jpg`

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function useMarsTexture() {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    Promise.all([loadImg(tileUrl(0)), loadImg(tileUrl(1))])
      .then(([a, b]) => {
        const c = document.createElement('canvas')
        c.width = a.width + b.width
        c.height = a.height
        const ctx = c.getContext('2d')
        ctx.drawImage(a, 0, 0)
        ctx.drawImage(b, a.width, 0)
        setUrl(c.toDataURL('image/jpeg'))
      })
      .catch((e) => console.error('Mars texture load failed', e))
  }, [])

  return url
}