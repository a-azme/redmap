import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
} from 'lucide-react'
import { buildHorizonFallbackSvg } from '../../services/surfacePovService'
import VisorHudOverlay from './VisorHudOverlay'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const wrapSym = (v, period) => {
  if (!period) return 0
  return ((((v + period / 2) % period) + period) % period) - period / 2
}

export default function PhotoSphereModal({
  open,
  visorActive = false,
  onToggleVisor,
  onClose,
  route,
  plan,
  spaceWeather,
  reconStops = [],
  activeIndex = 0,
  scrubPoint = null,
  isPlaying = false,
  onTogglePlay,
  onSelectIndex,
}) {
  const viewportRef = useRef(null)
  const dragRef = useRef(null)

  const [naturalSize, setNaturalSize] = useState({ w: 2560, h: 1280 })
  const [vpSize, setVpSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight || 720 : 720,
  }))
  const [loadedUrl, setLoadedUrl] = useState('')
  const [failedUrls, setFailedUrls] = useState({})
  const [fitMode, setFitMode] = useState('horizon') // 'horizon' (seamless 360° pan) | 'contain' (full uncropped frame)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const [selectedHotspot, setSelectedHotspot] = useState(null)
  const [prevStationKey, setPrevStationKey] = useState(null)

  const idx = reconStops.length
    ? Math.min(reconStops.length - 1, Math.max(0, activeIndex))
    : 0
  const stop = reconStops[idx] || null
  const pov = stop?.pov || null

  const primaryUrl = pov?.fullResUrl || pov?.imageUrl || ''
  const backupUrl =
    pov?.imageUrl && pov.imageUrl !== primaryUrl ? pov.imageUrl : null
  let activeImgUrl = primaryUrl
  if (failedUrls[primaryUrl]) {
    activeImgUrl =
      backupUrl && !failedUrls[backupUrl]
        ? backupUrl
        : buildHorizonFallbackSvg(stop)
  }

  const stationKey = `${open ? '1' : '0'}:${stop?.key || ''}:${primaryUrl}`
  if (stationKey !== prevStationKey) {
    setPrevStationKey(stationKey)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelectedHotspot(stop?.pov?.hotspots?.[0] || null)
  }

  const loadingImg = Boolean(activeImgUrl) && loadedUrl !== activeImgUrl

  // Measure viewport dimensions
  useEffect(() => {
    if (!open || !viewportRef.current) return undefined
    const el = viewportRef.current
    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setVpSize({ w: rect.width, h: rect.height })
      }
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  // Compute rendered tile dimensions so the full image is never cropped
  const aspect = Math.max(1.1, naturalSize.w / Math.max(1, naturalSize.h))
  let baseH = vpSize.h
  let baseW = baseH * aspect

  if (fitMode === 'contain') {
    const scale = Math.min(vpSize.w / Math.max(1, naturalSize.w), vpSize.h / Math.max(1, naturalSize.h))
    baseW = naturalSize.w * scale
    baseH = naturalSize.h * scale
  } else {
    // In 360° Horizon mode, ensure the panorama tile is wide enough to pan smoothly while keeping 100% height uncropped
    baseH = vpSize.h
    baseW = Math.max(vpSize.w * 1.35, baseH * aspect)
  }

  const tileW = baseW * zoom
  const tileH = baseH * zoom
  const maxPanY = Math.max(0, (tileH - vpSize.h) / 2)
  const maxPanXContain = Math.max(0, (tileW - vpSize.w) / 2)

  const clampPan = useCallback(
    (nx, ny, nextZoom = zoom, mode = fitMode) => {
      const tW = baseW * nextZoom
      const tH = baseH * nextZoom
      const limY = Math.max(0, (tH - vpSize.h) / 2)
      const clampedY = clamp(ny, -limY, limY)
      if (mode === 'contain' && nextZoom <= 1.02) {
        const limX = Math.max(0, (tW - vpSize.w) / 2)
        return { x: clamp(nx, -limX, limX), y: clampedY }
      }
      return { x: wrapSym(nx, tW), y: clampedY }
    },
    [baseW, baseH, vpSize.w, vpSize.h, zoom, fitMode]
  )

  // Gentle 360° horizontal auto-pan when enabled
  useEffect(() => {
    if (!open || !autoRotate || isDragging) return undefined
    const timer = setInterval(() => {
      setPan((prev) => clampPan(prev.x - 1.8, prev.y, zoom, 'horizon'))
    }, 24)
    return () => clearInterval(timer)
  }, [open, autoRotate, isDragging, clampPan, zoom])

  if (!open || !stop || !pov) return null

  const hotspots = pov.hotspots || []

  // Pointer drag handlers for smooth 360° panning
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan(clampPan(dragRef.current.origX + dx, dragRef.current.origY + dy))
  }

  const handlePointerUp = () => {
    dragRef.current = null
    setIsDragging(false)
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18
    const nextZoom = clamp(+(zoom * factor).toFixed(2), 1, 4)
    const ratio = nextZoom / zoom
    setZoom(nextZoom)
    setPan((prev) => clampPan(prev.x * ratio, prev.y * ratio, nextZoom))
  }

  const adjustZoom = (factor) => {
    const nextZoom = clamp(+(zoom * factor).toFixed(2), 1, 4)
    const ratio = nextZoom / zoom
    setZoom(nextZoom)
    setPan((prev) => clampPan(prev.x * ratio, prev.y * ratio, nextZoom))
  }

  const focusHotspot = (h) => {
    setSelectedHotspot(h)
    const targetZoom = Math.max(zoom, 1.45)
    const tW = baseW * targetZoom
    const tH = baseH * targetZoom
    const targetX = ((50 - h.x) / 100) * tW
    const targetY = ((50 - h.y) / 100) * tH
    setZoom(targetZoom)
    setPan(clampPan(targetX, targetY, targetZoom))
  }

  const step = (delta) => {
    const next = (idx + delta + reconStops.length) % reconStops.length
    onSelectIndex?.(next)
  }

  const useSeamlessLoop = fitMode === 'horizon' || zoom > 1.05
  const tileOffsets = useSeamlessLoop ? [-1, 0, 1] : [0]

  return (
    <div className="rm-psv-modal" role="dialog" aria-modal="true" aria-label="360° View">
      {/* High-Resolution Interactive 360° Cylindrical & Deep-Zoom Surface Canvas */}
      <div
        ref={viewportRef}
        className={`rm-psv-canvas rm-hrpano ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={() => adjustZoom(zoom >= 2.5 ? 0.25 : 1.6)}
      >
        <div
          className={`rm-hrpano__stage ${isDragging ? 'is-dragging' : ''}`}
          style={{
            width: `${tileW}px`,
            height: `${tileH}px`,
            transform: `translate3d(calc(-50% + ${
              fitMode === 'contain' && zoom <= 1.02
                ? clamp(pan.x, -maxPanXContain, maxPanXContain)
                : pan.x
            }px), calc(-50% + ${clamp(pan.y, -maxPanY, maxPanY)}px), 0)`,
          }}
        >
          {tileOffsets.map((offset) => (
            <div
              key={offset}
              className="rm-hrpano__tile"
              style={{
                width: `${tileW}px`,
                height: `${tileH}px`,
                left: `${offset * tileW}px`,
              }}
            >
              <img
                src={activeImgUrl}
                alt={stop.title}
                draggable={false}
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  const nw = e.currentTarget.naturalWidth || 2560
                  const nh = e.currentTarget.naturalHeight || 1280
                  setNaturalSize({ w: nw, h: nh })
                  setLoadedUrl(activeImgUrl)
                }}
                onError={() => {
                  setFailedUrls((prev) => ({ ...prev, [activeImgUrl]: true }))
                  setLoadedUrl(activeImgUrl)
                }}
                className="rm-hrpano__img"
              />

              {/* Geological Target Reticles pinned directly on the high-resolution image */}
              {hotspots.map((h, i) => (
                <button
                  key={`${offset}-${h.id}`}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    focusHotspot(h)
                  }}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  className={`rm-psv-marker rm-hrpano__marker ${
                    selectedHotspot?.id === h.id ? 'is-active' : ''
                  }`}
                  title={`${h.tag}: ${h.label}`}
                >
                  <span>{i + 1}</span>
                  <b>{h.tag}</b>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Top Navigation & Mode Bar (hidden when Visor HUD is active) */}
      {!visorActive && (
        <header className="rm-psv-topbar">
          <div className="rm-psv-topbar__left">
            <span className="rm-psv-badge">
              <Compass size={14} />
              <span>{pov.nasaId} · {pov.resolution || 'High-Res'}</span>
            </span>
            <div className="rm-psv-stopinfo">
              <strong>{stop.title}</strong>
              <small>
                {pov.mission} · {pov.camera} · {pov.sol}
              </small>
            </div>
          </div>

          <div className="rm-psv-topbar__center">
            <button type="button" className="rm-psv-navbtn" onClick={() => step(-1)}>
              <ChevronLeft size={15} />
              <span>Prev</span>
            </button>
            <select
              value={idx}
              onChange={(e) => onSelectIndex?.(Number(e.target.value))}
              className="rm-psv-select"
              aria-label="Select surface station"
            >
              {reconStops.map((s, i) => (
                <option key={s.key} value={i}>
                  {i + 1}. {s.title} (km {s.km})
                </option>
              ))}
            </select>
            <button type="button" className="rm-psv-navbtn" onClick={() => step(1)}>
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="rm-psv-topbar__right">
            <button
              type="button"
              onClick={() => adjustZoom(1 / 1.3)}
              className="rm-psv-btn"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(1.3)}
              className="rm-psv-btn"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                const nextMode = fitMode === 'horizon' ? 'contain' : 'horizon'
                setFitMode(nextMode)
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              className={`rm-psv-btn ${fitMode === 'contain' ? 'is-active' : ''}`}
              title="Toggle between 360° Horizon Pan and Full Uncropped Frame"
            >
              <Maximize2 size={13} />
              <span>{fitMode === 'contain' ? '360° Pan' : 'Full Frame'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFitMode('horizon')
                setAutoRotate((r) => !r)
              }}
              className={`rm-psv-btn ${autoRotate ? 'is-active' : ''}`}
              title="Toggle panorama auto-rotation"
            >
              <RotateCw size={14} />
              <span>Auto-pan</span>
            </button>
            <button
              type="button"
              onClick={onToggleVisor}
              className="rm-psv-btn rm-psv-btn--visor"
              title="Switch to first-person Astronaut Helmet Visor HUD"
            >
              Visor HUD
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rm-psv-btn rm-psv-btn--close"
              title="Return to map (Esc)"
            >
              <X size={15} />
              <span>Close</span>
            </button>
          </div>
        </header>
      )}

      {/* Bottom Surface Notes & Points of Interest Dock (when not in Visor HUD mode) */}
      {!visorActive && (
        <aside className="rm-psv-dock">
          <div className="rm-psv-dock__main">
            <div className="rm-psv-dock__head">
              <span className={`rm-pov__badge rm-pov__badge--${stop.kind}`}>{stop.badge}</span>
              <span>
                km {stop.km} · Elev {stop.elevKm} km · Slope {stop.slopeDeg}° · Temp {stop.tempC}°C
              </span>
              {loadingImg && <span className="rm-psv-loading">Loading high-res NASA mosaic…</span>}
            </div>
            <p className="rm-psv-dock__caption">{pov.caption}</p>
            <div className="rm-psv-dock__specs">
              <div>
                <small>SURFACE FOOTING</small>
                <strong>{pov.footing}</strong>
              </div>
              <div>
                <small>FIELD INSTRUMENTS</small>
                <strong>{pov.tool}</strong>
              </div>
            </div>
          </div>

          {hotspots.length > 0 && (
            <div className="rm-psv-dock__targets">
              <div className="rm-psv-dock__target-chips">
                <small>POINTS OF INTEREST:</small>
                {hotspots.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => focusHotspot(h)}
                    className={`rm-psv-targetchip ${selectedHotspot?.id === h.id ? 'is-active' : ''}`}
                  >
                    <span>{i + 1}</span>
                    <b>{h.label}</b>
                  </button>
                ))}
              </div>
              {selectedHotspot && (
                <div className="rm-psv-dock__callout">
                  <strong>
                    {selectedHotspot.tag}: {selectedHotspot.label}
                  </strong>
                  <p>{selectedHotspot.detail}</p>
                </div>
              )}
            </div>
          )}
        </aside>
      )}

      {/* Spacesuit Helmet Visor HUD overlaid on the 360° Panorama */}
      {visorActive && (
        <VisorHudOverlay
          route={route}
          plan={plan}
          spaceWeather={spaceWeather}
          reconStops={reconStops}
          activeIndex={idx}
          scrubPoint={scrubPoint}
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onSelectIndex={onSelectIndex}
          onFocusHotspot={focusHotspot}
          onExitVisor={onToggleVisor}
          onCloseModal={onClose}
        />
      )}
    </div>
  )
}
