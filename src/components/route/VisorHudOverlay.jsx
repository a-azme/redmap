import { useState } from 'react'

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function computeBearingDeg(from, to) {
  if (!from || !to) return 142
  const rad = Math.PI / 180
  const dLon = (to.lon - from.lon) * rad
  const lat1 = from.lat * rad
  const lat2 = to.lat * rad
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

function barColor(pct) {
  if (pct >= 85) return '#ff4d4d'
  if (pct >= 65) return '#f5a524'
  return '#4be08a'
}

export default function VisorHudOverlay({
  route,
  plan,
  spaceWeather,
  reconStops = [],
  activeIndex = 0,
  scrubPoint = null,
  onSelectIndex,
  onFocusHotspot,
  onExitVisor,
  onCloseModal,
}) {
  const [selectedHotspotId, setSelectedHotspotId] = useState(null)
  const [mobileTab, setMobileTab] = useState('targets') // 'targets' | 'waypoint' | 'suit' | 'min'

  if (!route || !reconStops.length) return null

  const idx = Math.min(reconStops.length - 1, Math.max(0, activeIndex))
  const stop = reconStops[idx]
  const prevStop = idx > 0 ? reconStops[idx - 1] : route.start
  const bearing = computeBearingDeg(scrubPoint || prevStop, stop)
  const cardinal = CARDINALS[Math.round(bearing / 45) % 8]

  const pov = stop.pov
  const hotspots = pov?.hotspots || []
  const activeHotspot =
    hotspots.find((h) => h.id === selectedHotspotId) || hotspots[0] || null

  const st = plan?.suitTelemetry
  const shelterIdx = reconStops.findIndex((s) => s.kind === 'shelter')
  const currentKm = scrubPoint ? +scrubPoint.km.toFixed(1) : stop.km
  const currentSlope = scrubPoint ? scrubPoint.slopeDeg : stop.slopeDeg
  const currentTemp = scrubPoint ? scrubPoint.tempC : stop.tempC
  const remKm = Math.max(0, +(route.distanceKm - currentKm).toFixed(1))

  const progressRatio = scrubPoint
    ? Math.min(1, Math.max(0.05, currentKm / Math.max(0.001, route.distanceKm)))
    : 1
  const dynO2Pct = st ? Math.round(st.peakO2Pct * progressRatio) : 0
  const dynWaterPct = st ? Math.round(st.peakWaterPct * progressRatio) : 0
  const dynBatteryPct = st ? Math.round(st.peakBatteryPct * progressRatio) : 0
  const dynO2Kg = st ? +(st.peakO2Kg * progressRatio).toFixed(2) : 0
  const dynWaterL = st ? +(st.peakWaterL * progressRatio).toFixed(2) : 0
  const dynBatteryWh = st ? Math.round(st.peakBatteryWh * progressRatio) : 0

  const metabolicKcalH = Math.round(
    (plan?.travel === 'foot' ? 310 : 165) +
      (currentSlope || 0) * 14 +
      (plan?.payloadKg || 12) * 4.5
  )

  const step = (delta) => {
    const next = (idx + delta + reconStops.length) % reconStops.length
    setSelectedHotspotId(null)
    onSelectIndex?.(next)
  }

  const handleTargetClick = (h) => {
    setSelectedHotspotId(h.id)
    onFocusHotspot?.(h)
  }

  return (
    <div className="rm-visor" role="region" aria-label="Spacesuit Helmet Visor HUD">
      {/* Subtle Curved Helmet Visor Vignette & Corner Reticle Brackets */}
      <div className="rm-visor__vignette" />
      <div className="rm-visor__bracket rm-visor__bracket--tl" />
      <div className="rm-visor__bracket rm-visor__bracket--tr" />
      <div className="rm-visor__bracket rm-visor__bracket--bl" />
      <div className="rm-visor__bracket rm-visor__bracket--br" />

      {/* TOP VISOR ARC: Heading Compass Tape, Radio Delay & View Controls */}
      <header className="rm-visor__top">
        <div className="rm-visor__sys">
          <strong>EVA VISOR HUD</strong>
          <small>Suit 4.3 psi · Crew {plan?.crewSize || 2}</small>
        </div>

        <div className="rm-visor__compass">
          <div className="rm-visor__tape">
            <span className="rm-visor__tape-side">
              {((bearing - 30 + 360) % 360).toString().padStart(3, '0')}°
            </span>
            <span className="rm-visor__tape-side">
              {((bearing - 15 + 360) % 360).toString().padStart(3, '0')}°
            </span>
            <strong className="rm-visor__heading">
              ▼ {bearing.toString().padStart(3, '0')}° {cardinal}
            </strong>
            <span className="rm-visor__tape-side">
              {((bearing + 15) % 360).toString().padStart(3, '0')}°
            </span>
            <span className="rm-visor__tape-side">
              {((bearing + 30) % 360).toString().padStart(3, '0')}°
            </span>
          </div>
          <small className="rm-visor__compass-sub">
            {stop.title.toUpperCase()} (KM {stop.km})
          </small>
        </div>

        <div className="rm-visor__clock">
          <div className="rm-visor__delay">
            <small>RADIO DELAY</small>
            <strong>{plan?.comms?.oneWayMin ?? 11.4}m</strong>
          </div>
          <button
            type="button"
            className="rm-visor__simbtn"
            onClick={onExitVisor}
            title="Switch to clean 360° view"
          >
            360° View
          </button>
          {onCloseModal && (
            <button
              type="button"
              className="rm-visor__exit"
              onClick={onCloseModal}
              title="Close 360° view and return to map (Esc)"
            >
              ✕ Exit
            </button>
          )}
        </div>
      </header>

      {/* DESKTOP LEFT VISOR ARC: Suit Life Support & Biometrics */}
      <aside className="rm-visor__left">
        <div className="rm-visor__panel-title">LIFE SUPPORT &amp; SUIT LOAD</div>

        {st && (
          <div className="rm-visor__gauges">
            <div className="rm-visor__gauge">
              <div className="rm-visor__gauge-row">
                <span>OXYGEN</span>
                <b>{100 - dynO2Pct}% rem ({dynO2Kg} kg used)</b>
              </div>
              <div className="rm-visor__bar">
                <i
                  style={{
                    width: `${Math.max(8, 100 - dynO2Pct)}%`,
                    background: barColor(dynO2Pct),
                  }}
                />
              </div>
            </div>

            <div className="rm-visor__gauge">
              <div className="rm-visor__gauge-row">
                <span>COOLING WATER</span>
                <b>{100 - dynWaterPct}% rem ({dynWaterL} L used)</b>
              </div>
              <div className="rm-visor__bar">
                <i
                  style={{
                    width: `${Math.max(8, 100 - dynWaterPct)}%`,
                    background: barColor(dynWaterPct),
                  }}
                />
              </div>
            </div>

            <div className="rm-visor__gauge">
              <div className="rm-visor__gauge-row">
                <span>BATTERY</span>
                <b>{100 - dynBatteryPct}% rem ({dynBatteryWh} Wh)</b>
              </div>
              <div className="rm-visor__bar">
                <i
                  style={{
                    width: `${Math.max(8, 100 - dynBatteryPct)}%`,
                    background: barColor(dynBatteryPct),
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="rm-visor__biometrics">
          <div>
            <small>METABOLIC RATE</small>
            <strong>{metabolicKcalH} kcal/h</strong>
          </div>
          <div>
            <small>EQUIPMENT LOAD</small>
            <strong>{plan?.payloadKg ?? 12} kg ({((plan?.payloadKg ?? 12) * 0.38).toFixed(1)} kgf)</strong>
          </div>
          <div>
            <small>PACE</small>
            <strong>{plan?.baseKmh ?? 3.1} km/h</strong>
          </div>
          <div>
            <small>WALK-BACK RESERVE</small>
            <strong
              style={{
                color:
                  (st?.worstWalkBackH ?? 0) > (st?.suitReserveH ?? 2)
                    ? '#ff7b72'
                    : '#4be08a',
              }}
            >
              {st?.worstWalkBackH ?? 0.9}h / {st?.suitReserveH ?? 2.0}h
            </strong>
          </div>
        </div>
      </aside>

      {/* DESKTOP RIGHT VISOR ARC: Waypoint Conditions & Radiation */}
      <aside className="rm-visor__right">
        <div className="rm-visor__panel-title">WAYPOINT &amp; CONDITIONS</div>

        <div className="rm-visor__wpbox">
          <h3>{stop.title}</h3>
          <p className="rm-visor__coords">
            {Math.abs(stop.lat).toFixed(3)}°{stop.lat >= 0 ? 'N' : 'S'}, {stop.lon.toFixed(3)}°E ·{' '}
            {stop.terrain}
          </p>

          <div className="rm-visor__wpstats">
            <div>
              <small>ALONG ROUTE</small>
              <strong>km {currentKm}</strong>
            </div>
            <div>
              <small>REMAINING</small>
              <strong>{remKm} km</strong>
            </div>
            <div>
              <small>LOCAL SLOPE</small>
              <strong style={{ color: currentSlope > 12 ? '#f5a524' : '#4be08a' }}>
                {currentSlope}°
              </strong>
            </div>
            <div>
              <small>SURFACE TEMP</small>
              <strong>{currentTemp}°C</strong>
            </div>
          </div>
        </div>

        {/* Radiation & Shelter Status */}
        <div
          className={`rm-visor__rad rm-visor__rad--${
            spaceWeather?.alertLevel === 'STORM ALERT'
              ? 'storm'
              : spaceWeather?.alertLevel === 'ELEVATED'
              ? 'elevated'
              : 'nominal'
          }`}
        >
          <div className="rm-visor__radhead">
            <span>RADIATION</span>
            <strong>{spaceWeather?.alertLevel || 'NOMINAL'} ({plan?.doseMsvPerSol ?? 0.64} mSv/sol)</strong>
          </div>
          {shelterIdx !== -1 && shelterIdx !== idx && (
            <button
              type="button"
              className="rm-visor__shelterbtn"
              onClick={() => {
                setSelectedHotspotId(null)
                onSelectIndex?.(shelterIdx)
              }}
            >
              Jump to Shelter (km {reconStops[shelterIdx].km} · -{route.shelterPoint?.shieldingPct ?? 28}% dose)
            </button>
          )}
        </div>
      </aside>

      {/* DESKTOP BOTTOM VISOR BAR: Station Switcher & Target Selector */}
      <footer className="rm-visor__bottombar">
        <div className="rm-visor__navgroup">
          <button type="button" onClick={() => step(-1)}>◀ Prev</button>
          <span>
            Stop {idx + 1}/{reconStops.length}
          </span>
          <button type="button" onClick={() => step(1)}>Next ▶</button>
        </div>

        {hotspots.length > 0 && (
          <div className="rm-visor__targets">
            <small>TARGETS:</small>
            {hotspots.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onClick={() => handleTargetClick(h)}
                className={`rm-visor__targetbtn ${activeHotspot?.id === h.id ? 'is-active' : ''}`}
              >
                <span>{i + 1}</span>
                <b>{h.label}</b>
              </button>
            ))}
          </div>
        )}

        <div className="rm-visor__readout">
          <strong>{activeHotspot ? `${activeHotspot.tag}: ${activeHotspot.label}` : stop.title}</strong>
          <small>{activeHotspot ? activeHotspot.detail : `${pov.footing} · ${pov.tool}`}</small>
        </div>
      </footer>

      {/* MOBILE / TABLET UNIFIED NON-OVERLAPPING BOTTOM HUD CONSOLE */}
      <section className="rm-visor__mobile-dock">
        <div className="rm-visor__mobile-bar">
          <div className="rm-visor__navgroup">
            <button type="button" onClick={() => step(-1)}>◀</button>
            <span>
              {idx + 1}/{reconStops.length}
            </span>
            <button type="button" onClick={() => step(1)}>▶</button>
          </div>

          <div className="rm-visor__mobile-tabs">
            {[
              { id: 'targets', label: 'Targets' },
              { id: 'waypoint', label: 'Waypoint' },
              { id: 'suit', label: 'Suit' },
              { id: 'min', label: mobileTab === 'min' ? 'Show' : 'Hide' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setMobileTab((cur) => (t.id === 'min' && cur === 'min' ? 'targets' : t.id))
                }
                className={`rm-visor__mobile-tab ${mobileTab === t.id ? 'is-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {mobileTab === 'targets' && (
          <div className="rm-visor__mobile-body">
            {hotspots.length > 0 && (
              <div className="rm-visor__targets">
                {hotspots.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleTargetClick(h)}
                    className={`rm-visor__targetbtn ${activeHotspot?.id === h.id ? 'is-active' : ''}`}
                  >
                    <span>{i + 1}</span>
                    <b>{h.label}</b>
                  </button>
                ))}
              </div>
            )}
            <div className="rm-visor__readout">
              <strong>
                {activeHotspot ? `${activeHotspot.tag}: ${activeHotspot.label}` : stop.title}
              </strong>
              <small>{activeHotspot ? activeHotspot.detail : `${pov.footing} · ${pov.tool}`}</small>
            </div>
          </div>
        )}

        {mobileTab === 'waypoint' && (
          <div className="rm-visor__mobile-body">
            <div className="rm-visor__wpstats">
              <div>
                <small>ALONG ROUTE</small>
                <strong>km {currentKm} ({remKm} km rem)</strong>
              </div>
              <div>
                <small>SLOPE / TEMP</small>
                <strong>
                  {currentSlope}° · {currentTemp}°C
                </strong>
              </div>
              <div>
                <small>RADIATION</small>
                <strong>{spaceWeather?.alertLevel || 'NOMINAL'} ({plan?.doseMsvPerSol ?? 0.64} mSv)</strong>
              </div>
              <div>
                <small>TERRAIN</small>
                <strong>{stop.terrain}</strong>
              </div>
            </div>
            {shelterIdx !== -1 && shelterIdx !== idx && (
              <button
                type="button"
                className="rm-visor__shelterbtn"
                onClick={() => {
                  setSelectedHotspotId(null)
                  onSelectIndex?.(shelterIdx)
                }}
              >
                Jump to Shelter (km {reconStops[shelterIdx].km} · -{route.shelterPoint?.shieldingPct ?? 28}% dose)
              </button>
            )}
          </div>
        )}

        {mobileTab === 'suit' && (
          <div className="rm-visor__mobile-body">
            {st && (
              <div className="rm-visor__gauges">
                <div className="rm-visor__gauge">
                  <div className="rm-visor__gauge-row">
                    <span>O₂: {100 - dynO2Pct}% rem</span>
                    <span>H₂O: {100 - dynWaterPct}% rem</span>
                    <span>BAT: {100 - dynBatteryPct}% rem</span>
                  </div>
                  <div className="rm-visor__bar">
                    <i
                      style={{
                        width: `${Math.max(8, 100 - dynO2Pct)}%`,
                        background: barColor(dynO2Pct),
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="rm-visor__biometrics">
              <div>
                <small>METABOLIC / PACE</small>
                <strong>
                  {metabolicKcalH} kcal/h · {plan?.baseKmh ?? 3.1} km/h
                </strong>
              </div>
              <div>
                <small>WALK-BACK RESERVE</small>
                <strong>
                  {st?.worstWalkBackH ?? 0.9}h / {st?.suitReserveH ?? 2.0}h
                </strong>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
