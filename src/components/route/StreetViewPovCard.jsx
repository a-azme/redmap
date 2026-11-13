import { useState } from 'react'
import { Compass, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { buildHorizonFallbackSvg } from '../../services/surfacePovService'

export default function StreetViewPovCard({
  reconStops = [],
  activeIndex = 0,
  onSelectIndex,
  onOpenStreetView,
}) {
  const [failedUrls, setFailedUrls] = useState({})

  if (!reconStops.length) return null

  const idx = Math.min(reconStops.length - 1, Math.max(0, activeIndex))
  const stop = reconStops[idx]
  const pov = stop.pov
  const primaryUrl = pov.imageUrl
  const backupUrl = pov.fullResUrl && pov.fullResUrl !== primaryUrl ? pov.fullResUrl : null

  let imgSrc = primaryUrl
  if (failedUrls[primaryUrl]) {
    imgSrc = backupUrl && !failedUrls[backupUrl] ? backupUrl : buildHorizonFallbackSvg(stop)
  }

  const step = (e, delta) => {
    e.stopPropagation()
    const next = (idx + delta + reconStops.length) % reconStops.length
    onSelectIndex?.(next)
  }

  return (
    <div
      className="rm-streetcard"
      onClick={onOpenStreetView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenStreetView?.()
        }
      }}
      title="Click to open High-Resolution 360° Surface Panorama"
    >
      <div className="rm-streetcard__media">
        <img
          src={imgSrc}
          alt={stop.title}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() =>
            setFailedUrls((prev) => ({ ...prev, [imgSrc]: true }))
          }
          className="rm-streetcard__img"
        />
        <div className="rm-streetcard__scrim" />

        {/* Single Top Badge & Expand Indicator */}
        <div className="rm-streetcard__top">
          <span className="rm-streetcard__badge">
            <Compass size={12} />
            <span>360° Surface View · {pov.nasaId}</span>
          </span>
          <span className="rm-streetcard__expand" aria-hidden="true">
            <Maximize2 size={12} />
          </span>
        </div>

        {/* Bottom Caption Overlay + Compact Station Stepper */}
        <div className="rm-streetcard__caption">
          <div className="rm-streetcard__row">
            <div className="rm-streetcard__info">
              <div className="rm-streetcard__title">{stop.title}</div>
              <div className="rm-streetcard__meta">
                km {stop.km} · {stop.slopeDeg}° slope · {pov.resolution || 'High-Res NASA'}
              </div>
            </div>
            <div className="rm-streetcard__step" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => step(e, -1)}
                title="Previous station"
                aria-label="Previous station"
              >
                <ChevronLeft size={13} />
              </button>
              <span>
                {idx + 1}/{reconStops.length}
              </span>
              <button
                type="button"
                onClick={(e) => step(e, 1)}
                title="Next station"
                aria-label="Next station"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
