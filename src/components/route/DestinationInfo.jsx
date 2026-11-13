import LocationThumb from '../map/LocationThumb'

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
  note: 'Orbital imaging and mineral mapping cover this region.',
}

export default function DestinationInfo({ route }) {
  if (!route) return null
  const loc = route.end
  const last = route.points[route.points.length - 1]
  const f = FACTS[loc.id] || {}
  const mission = loc.mission || f.mission || GENERIC_MISSION
  const desc = loc.description || f.description || `${loc.type} · ${loc.tag}`
  const tagList = Array.isArray(loc.tags) && loc.tags.length > 0 ? loc.tags : [loc.type, loc.tag].filter(Boolean)

  const rows = [
    ['Surface Terrain', last.terrain],
    ['Site Elevation', `${loc.elevation} km`],
  ]

  return (
    <section className="rm-card rm-dest">
      <div className="rm-dest__head">
        <LocationThumb loc={loc} className="h-20 w-20 rounded-lg" />
        <div>
          <small className="rm-muted">Destination</small>
          <h3>{loc.name}</h3>
          <span className="rm-coord">
            {Math.abs(loc.lat).toFixed(3)}° {loc.lat >= 0 ? 'N' : 'S'}, {loc.lon.toFixed(3)}° E
          </span>
          <p>{desc}</p>
        </div>
      </div>

      <div className="rm-tags">
        {tagList.map((t) => (
          <span key={t} className="rm-tag" style={{ background: loc.color + '26', color: loc.color }}>{t}</span>
        ))}
      </div>

      <dl className="rm-rows">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>

      <div className="rm-mission">
        <span className="rm-mission__logo">NASA</span>
        <div>
          <strong>{mission.name}</strong>
          <small>{mission.years} · {mission.note}</small>
        </div>
      </div>
    </section>
  )
}