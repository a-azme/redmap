import LocationThumb from '../map/LocationThumb'

// Short descriptions from general knowledge. Verify against NASA sources before submitting.
const FACTS = {
  jezero: {
    description: 'An ancient lake bed and river delta, and the landing site of the Perseverance rover.',
    mission: { name: 'Perseverance Rover', years: '2021 – Present', note: 'Collecting rock samples from the ancient delta.' },
  },
  olympus: {
    description: 'The largest known volcano in the solar system, about 21.9 km high.',
    mission: { name: 'Mars Global Surveyor (MOLA)', years: '1997 – 2006', note: 'Laser altimetry produced the global topographic model.' },
  },
  valles: {
    description: 'The largest known canyon system on Mars, thousands of kilometres long.',
    mission: { name: 'Mars Reconnaissance Orbiter', years: '2006 – Present', note: 'HiRISE and CRISM imaged the canyon walls and their minerals.' },
  },
  nili: {
    description: 'A system of troughs where orbiters detected clay minerals and carbonates.',
    mission: { name: 'Mars Reconnaissance Orbiter', years: '2006 – Present', note: 'CRISM mapped the clay and carbonate signatures here.' },
  },
}
const GENERIC_MISSION = {
  name: 'Mars Reconnaissance Orbiter',
  years: '2006 – Present',
  note: 'Orbital imaging and mineral mapping (CTX, HiRISE, CRISM) cover this region.',
}

export default function DestinationInfo({ route, onDetails }) {
  if (!route) return null
  const loc = route.end
  const last = route.points[route.points.length - 1]
  const f = FACTS[loc.id] || {}
  const mission = f.mission || GENERIC_MISSION

  const rows = [
    ['Terrain Type (est.)', last.terrain],
    ['Elevation', `${loc.elevation} km`],
    ['Avg. Slope (est.)', `${route.avgSlopeDeg}°`],
    ['Temperature (est.)', `${last.tempC}°C`],
  ]

  return (
    <section className="rm-card rm-dest">
      <div className="rm-dest__head">
        <LocationThumb loc={loc} className="h-24 w-24 rounded-lg" />
        <div>
          <small className="rm-muted">Destination</small>
          <h3>{loc.name}</h3>
          <span className="rm-coord">
            {Math.abs(loc.lat).toFixed(3)}° {loc.lat >= 0 ? 'N' : 'S'}, {loc.lon.toFixed(3)}° E
          </span>
          <p>{f.description || `${loc.type} · ${loc.tag}`}</p>
        </div>
      </div>

      <div className="rm-tags">
        {[loc.type, loc.tag].map((t) => (
          <span key={t} className="rm-tag" style={{ background: loc.color + '26', color: loc.color }}>{t}</span>
        ))}
      </div>

      <h4>Terrain &amp; Conditions</h4>
      <dl className="rm-rows">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>

      <h4>Mission Information</h4>
      <div className="rm-mission">
        <span className="rm-mission__logo">NASA</span>
        <div>
          <strong>{mission.name}</strong>
          <small>({mission.years})</small>
        </div>
      </div>
      <p className="rm-muted">{mission.note}</p>

      <button type="button" className="rm-details" onClick={onDetails}>View Detailed Information ↗</button>
    </section>
  )
}