import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Plus, Minus } from 'lucide-react'
import { TILE_LAYERS, ROVERS } from '../../services/layerService'

const toLon = (lon) => (lon > 180 ? lon - 360 : lon)

export default function MarsMap({ locations, focus, onSelect, layer = 'terrain' }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const markerRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [status, setStatus] = useState('loading')

  const cfg = TILE_LAYERS[layer] || TILE_LAYERS.terrain

  // Map ekbar toiri
  useEffect(() => {
    const map = L.map(elRef.current, {
      crs: L.CRS.EPSG4326,
      center: [18.4, 77.5],
      zoom: 4,
      minZoom: 1,
      maxZoom: 9,
      zoomControl: false,
    })
    markerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Layer change hole tile change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileRef.current) map.removeLayer(tileRef.current)

    const src = cfg.url ? cfg : TILE_LAYERS.terrain
    setStatus(cfg.url ? 'loading' : 'pending')

    let loaded = false
    let errors = 0
    const tiles = L.tileLayer(src.url, {
      tileSize: 256,
      noWrap: true,
      maxNativeZoom: src.maxNativeZoom,
      maxZoom: 9,
      attribution: 'NASA/JPL Trek · USGS · MGS MOLA',
    })
    tiles.on('tileload', () => {
      loaded = true
      if (cfg.url) setStatus('ok')
    })
    tiles.on('tileerror', () => {
      errors++
      if (!loaded && errors >= 4) setStatus('error')
    })
    tiles.addTo(map)
    tileRef.current = tiles
  }, [layer]) // eslint-disable-line react-hooks/exhaustive-deps

  // Marker gulo
  useEffect(() => {
    const group = markerRef.current
    if (!group) return
    group.clearLayers()

    locations.forEach((loc) => {
      L.circleMarker([loc.lat, toLon(loc.lon)], {
        radius: 7, color: '#fff', weight: 2, fillColor: loc.color, fillOpacity: 1,
      })
        .bindTooltip(loc.name, { permanent: true, direction: 'right', offset: [8, 0], className: 'redmap-tip' })
        .on('click', () => onSelectRef.current?.(loc))
        .addTo(group)
    })

    if (layer === 'missions') {
      ROVERS.forEach((r) => {
        L.circleMarker([r.lat, toLon(r.lon)], {
          radius: 6, color: '#fff', weight: 2, fillColor: '#38bdf8', fillOpacity: 1,
        })
          .bindTooltip(r.name, { permanent: true, direction: 'right', offset: [8, 0], className: 'redmap-tip' })
          .addTo(group)
      })
    }
  }, [locations, layer])

  // Location e zoom
  useEffect(() => {
    if (!focus || !mapRef.current) return
    mapRef.current.flyTo([focus.lat, toLon(focus.lon)], 6, { duration: 1 })
  }, [focus])

  const msg = {
    loading: 'Loading NASA tiles...',
    ok: 'NASA Mars Trek data',
    pending: 'Source not set yet. Showing terrain. Add a tile URL in services/layerService.js',
    error: 'Tiles failed to load. Check the URL in services/layerService.js and the browser console.',
  }[status]

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md hover:bg-white/10'

  return (
    <div className="relative isolate h-full w-full">
      <div ref={elRef} className="h-full w-full" style={{ background: '#07090d' }} />

      <div className="absolute left-[330px] top-[110px] z-[1000] flex flex-col gap-2">
        <button className={btn} onClick={() => mapRef.current?.zoomIn()}><Plus size={18} /></button>
        <button className={btn} onClick={() => mapRef.current?.zoomOut()}><Minus size={18} /></button>
      </div>

      <div className="absolute bottom-[132px] left-[330px] z-[1000] w-[330px] rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md">
        <div className="text-sm font-semibold">{cfg.title}</div>
        <div className="mt-1 text-xs text-gray-400">{cfg.note}</div>
        <div className="mt-2 text-xs text-gray-300">Source: {cfg.source}</div>
        <div className={`mt-2 border-t border-white/10 pt-2 text-xs ${
          status === 'error' ? 'text-red-400' : status === 'pending' ? 'text-amber-400' : 'text-gray-400'
        }`}>
          {msg}
        </div>
      </div>
    </div>
  )
}