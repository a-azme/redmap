import { useEffect, useState } from 'react'
import rawLocations from '../data/mars_globe_locations.json'

export const CATEGORY_META = {
  REGION_TERRA: {
    type: 'Highland Region',
    tag: 'Planetary Highland',
    terrain: 'Ancient Cratered Highland',
    color: '#f59e0b',
    isRegion: true,
    defaultElev: 1.8,
    defaultSlope: 3.2,
  },
  REGION_PLANITIA: {
    type: 'Lowland Plain',
    tag: 'Basin & Smooth Plain',
    terrain: 'Lowland Basin Plain',
    color: '#06b6d4',
    isRegion: true,
    defaultElev: -3.6,
    defaultSlope: 1.8,
  },
  REGION_PLANUM: {
    type: 'High Plateau',
    tag: 'Elevated Plateau',
    terrain: 'Volcanic / Layered Plateau',
    color: '#38bdf8',
    isRegion: true,
    defaultElev: 2.4,
    defaultSlope: 2.5,
  },
  REGION_VASTITAS: {
    type: 'Vast Lowland',
    tag: 'Circumpolar Basin',
    terrain: 'Northern Polar Lowland',
    color: '#60a5fa',
    isRegion: true,
    defaultElev: -4.5,
    defaultSlope: 1.2,
  },
  VOLCANO_MONS: {
    type: 'Volcano / Mons',
    tag: 'Volcanic Mountain',
    terrain: 'Shield Volcano & Edifice',
    color: '#f97316',
    isRegion: false,
    defaultElev: 9.5,
    defaultSlope: 5.5,
  },
  VOLCANO_DOME: {
    type: 'Volcanic Dome',
    tag: 'Tholus & Patera',
    terrain: 'Volcanic Dome / Caldera',
    color: '#fb7185',
    isRegion: false,
    defaultElev: 4.2,
    defaultSlope: 6.4,
  },
  CANYON_VALLEY: {
    type: 'Canyon / Valley',
    tag: 'Chasma & Outflow Valley',
    terrain: 'Tectonic Canyon / Channel',
    color: '#22c55e',
    isRegion: false,
    defaultElev: -3.2,
    defaultSlope: 8.5,
  },
  CLIFF_MESA_TRENCH: {
    type: 'Fossae / Mensae',
    tag: 'Trough, Scarp & Mesa',
    terrain: 'Fractured Trough & Scarp',
    color: '#a855f7',
    isRegion: false,
    defaultElev: -0.8,
    defaultSlope: 7.2,
  },
  CRATER: {
    type: 'Impact Crater',
    tag: 'Crater Basin',
    terrain: 'Impact Crater Floor & Rim',
    color: '#ef4444',
    isRegion: false,
    defaultElev: -2.1,
    defaultSlope: 4.8,
  },
  NOTABLE_TERRAIN: {
    type: 'Notable Terrain',
    tag: 'Dunes & Landforms',
    terrain: 'Aeolian Dune / Scopuli Field',
    color: '#eab308',
    isRegion: false,
    defaultElev: -1.5,
    defaultSlope: 3.5,
  },
  NASA_MISSION_HUB: {
    type: 'Mission Hub',
    tag: 'Spacecraft Landing Site',
    terrain: 'Mission Exploration Zone',
    color: '#3b82f6',
    isRegion: false,
    defaultElev: -2.4,
    defaultSlope: 2.8,
  },
}

const CANONICAL_IDS = {
  'Jezero': 'jezero',
  'Olympus Mons': 'olympus',
  'Valles Marineris': 'valles',
  'Tyrrhena Terra': 'tyrrhena',
  'Nili Fossae': 'nili',
  'Isidis Planitia': 'isidis',
  'Syrtis Major Planum': 'syrtis',
  'Hellas Planitia': 'hellas',
  'Utopia Planitia': 'utopia',
  'Gale': 'gale',
  'Gusev': 'gusev',
  'Meridiani Planum': 'meridiani',
  'Chryse Planitia': 'chryse',
  'Argyre Planitia': 'argyre',
  'Elysium Planitia': 'elysium-planitia',
  'Terra Cimmeria': 'terra-cimmeria',
  'Arabia Terra': 'arabia-terra',
  'Noachis Terra': 'noachis-terra',
}

const CURATED_DETAILS = {
  jezero: {
    elevation: -2.6,
    slope: 4.8,
    temp: -63,
    terrain: 'Ancient Lakebed & River Delta',
    desc: 'An ancient impact crater (47.5 km diameter) that once held a lake and river delta; primary sampling site for the Mars 2020 Perseverance mission.',
    mission: { name: 'Perseverance Rover & Ingenuity', years: '2021 – Present', note: 'Exploring the western delta and caching core samples for future return.' },
  },
  olympus: {
    elevation: 21.9,
    slope: 5.0,
    temp: -60,
    terrain: 'Giant Shield Volcano',
    desc: 'The tallest known volcano and mountain in the Solar System (~21.9 km high, 610 km across), bordered by a steep basal scarp.',
    mission: { name: 'Mars Global Surveyor & Mars Express', years: '1997 – Present', note: 'Mapped summit calderas and lava flow chronology via laser altimetry.' },
  },
  valles: {
    elevation: -5.0,
    slope: 8.0,
    temp: -55,
    terrain: 'Tectonic Rift Canyon System',
    desc: 'One of the largest canyon systems in the Solar System, spanning 3,761 km in length and plunging up to 7 km deep.',
    mission: { name: 'Mars Reconnaissance Orbiter & Odyssey', years: '2001 – Present', note: 'Revealed layered sulfates, landslides, and recurring slope lineae.' },
  },
  tyrrhena: {
    elevation: 1.2,
    slope: 3.0,
    temp: -58,
    terrain: 'Noachian Cratered Highlands',
    desc: 'Heavily cratered ancient highland region (2,470 km across) in the southern hemisphere, preserving early Martian crustal history.',
    mission: { name: 'Mars Reconnaissance Orbiter', years: '2006 – Present', note: 'High-resolution spectral and context mapping of ancient volcanic and impact units.' },
  },
  nili: {
    elevation: -0.6,
    slope: 6.0,
    temp: -62,
    terrain: 'Concentric Grabens & Troughs',
    desc: 'A 728 km system of curved tectonic troughs cutting ancient crust northwest of Isidis Planitia, rich in clay and carbonate minerals.',
    mission: { name: 'Mars Reconnaissance Orbiter (CRISM)', years: '2006 – Present', note: 'Identified diverse phyllosilicates, olivine, and carbonate outcrops.' },
  },
  isidis: {
    elevation: -3.8,
    slope: 2.0,
    temp: -61,
    terrain: 'Giant Impact Basin Floor',
    desc: 'A 1,225 km wide impact basin whose western margin hosts Jezero Crater and Syrtis Major volcanic plains.',
    mission: { name: 'Mars Reconnaissance Orbiter & Beagle 2', years: '2003 – Present', note: 'Orbital radar and high-resolution imaging across the basin floor.' },
  },
  hellas: {
    elevation: -7.1,
    slope: 2.4,
    temp: -52,
    terrain: 'Deep Impact Basin',
    desc: 'The largest visible impact structure on Mars (~2,300 km diameter) and the lowest elevation point on the planet.',
    mission: { name: 'MGS MOLA & MRO', years: '1997 – Present', note: 'Measured record atmospheric surface pressure and glacial landforms.' },
  },
  gale: {
    elevation: -4.5,
    slope: 4.2,
    temp: -60,
    terrain: 'Layered Mound & Crater Floor',
    desc: 'A 154 km diameter crater featuring Aeolis Mons (Mount Sharp), a 5.5 km high central peak of climate-recording sedimentary layers.',
    mission: { name: 'Curiosity Rover (MSL)', years: '2012 – Present', note: 'Confirmed ancient habitable lakebed conditions and organic molecules.' },
  },
  gusev: {
    elevation: -1.9,
    slope: 3.8,
    temp: -59,
    terrain: 'Crater Plains & Volcanic Hills',
    desc: 'A 158 km impact crater fed from the south by Ma’adim Vallis, containing hydrothermal and water-altered rocks in the Columbia Hills.',
    mission: { name: 'Spirit Rover (MER-A)', years: '2004 – 2010', note: 'Discovered silica-rich hydrothermal deposits and ancient aqueous alteration.' },
  },
}

function slugify(name, index) {
  if (CANONICAL_IDS[name]) return CANONICAL_IDS[name]
  const base = String(name || `loc-${index}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `loc-${index}`
}

function buildDescription(item, meta) {
  const spanText =
    item.diameter && item.diameter > 0
      ? `spanning approximately ${item.diameter.toLocaleString()} km in diameter`
      : 'pinpointing a key surface landing and exploration zone'
  const regionNote = meta.isRegion
    ? 'broad planetary region'
    : `Level ${item.level} ${meta.type.toLowerCase()}`
  const nasaNote = item.is_nasa
    ? ' Designated as a high-priority NASA scientific and mission landmark.'
    : ''
  return `${item.name} is a ${regionNote} on Mars (${Math.abs(item.lat).toFixed(2)}°${item.lat >= 0 ? 'N' : 'S'}, ${Math.abs(item.lon).toFixed(2)}°${item.lon >= 0 ? 'E' : 'W'}), ${spanText}. Visible on the globe between ${item.min_alt_km.toLocaleString()} km and ${item.max_alt_km.toLocaleString()} km altitude.${nasaNote}`
}

export function normalizeMarsLocations(list) {
  if (!Array.isArray(list)) return []
  const seenIds = new Set()

  return list.map((raw, idx) => {
    let id = slugify(raw.name, idx)
    if (seenIds.has(id)) {
      id = `${id}-${idx}`
    }
    seenIds.add(id)

    const meta = CATEGORY_META[raw.category] || {
      type: 'Surface Feature',
      tag: 'Martian Landform',
      terrain: 'Martian Surface',
      color: '#ef4444',
      isRegion: false,
      defaultElev: -1.0,
      defaultSlope: 4.0,
    }

    const curated = CURATED_DETAILS[id]
    const lat = Number(raw.lat) || 0
    const lon = Number(raw.lon) || 0
    const diameter = Number(raw.diameter) || 0
    const level = Number(raw.level) || 2
    const min_alt_km = Number(raw.min_alt_km) || 100
    const max_alt_km = Number(raw.max_alt_km) || 8000
    const is_nasa = Boolean(raw.is_nasa)

    const estTemp = curated?.temp ?? Math.round(-55 - Math.abs(lat) * 0.45)
    const elevation = curated?.elevation ?? meta.defaultElev
    const slope = curated?.slope ?? meta.defaultSlope

    const tags = [
      meta.type,
      `Level ${level}`,
      ...(is_nasa ? ['NASA Priority'] : []),
      ...(diameter > 0 ? [`Ø ${diameter} km`] : ['Landing Hub']),
    ]

    return {
      id,
      name: raw.name,
      category: raw.category,
      type: meta.type,
      tag: is_nasa ? `NASA • ${meta.tag}` : meta.tag,
      isRegion: meta.isRegion,
      color: is_nasa && raw.category === 'CRATER' ? '#ef4444' : meta.color,
      diameter,
      lat: +lat.toFixed(4),
      lon: +lon.toFixed(4),
      is_nasa,
      level,
      min_alt_km,
      max_alt_km,
      elevation,
      slope,
      temp: estTemp,
      terrain: curated?.terrain || meta.terrain,
      desc: curated?.desc || buildDescription({ ...raw, lat, lon, diameter, level, min_alt_km, max_alt_km, is_nasa }, meta),
      mission: curated?.mission || {
        name: is_nasa ? 'NASA Mars Reconnaissance & Odyssey Orbiters' : 'MGS MOLA & MRO Global Survey',
        years: '1997 – Present',
        note: `Mapped across ${min_alt_km.toLocaleString()}–${max_alt_km.toLocaleString()} km orbital altitude band.`,
      },
      tags,
    }
  })
}

export const MARS_LOCATIONS = normalizeMarsLocations(rawLocations)

export const DEFAULT_LOCATION =
  MARS_LOCATIONS.find((l) => l.id === 'jezero') || MARS_LOCATIONS[0]

const FEATURED_IDS = [
  'jezero',
  'olympus',
  'valles',
  'hellas',
  'gale',
  'gusev',
  'nili',
  'isidis',
  'tyrrhena',
  'syrtis',
  'utopia',
  'chryse',
]

export const FEATURED_LOCATIONS = FEATURED_IDS.map((id) =>
  MARS_LOCATIONS.find((l) => l.id === id)
).filter(Boolean)

/**
 * Computes an ideal camera altitude (in meters) to fly to when selecting a location/feature,
 * staying inside its [min_alt_km, max_alt_km] visibility window and framing its diameter.
 */
export function getIdealFlyHeightMeters(loc) {
  if (!loc) return 150000
  const minKm = Number(loc.min_alt_km)
  const maxKm = Number(loc.max_alt_km)
  const diamKm = Number(loc.diameter) || 0

  if (Number.isFinite(minKm) && Number.isFinite(maxKm) && maxKm > minKm) {
    const lowBound = Math.max(minKm * 1.12, minKm + 25)
    const highBound = Math.max(lowBound, maxKm * 0.72)
    const targetFromDiameter = diamKm > 0 ? Math.max(220, diamKm * 1.55) : 240
    const clampedKm = Math.max(lowBound, Math.min(highBound, targetFromDiameter))
    return Math.round(clampedKm * 1000)
  }

  return 150000
}

let cachedDynamicLocations = MARS_LOCATIONS
let fetchPromise = null

export function loadMarsLocationsFromAssets() {
  if (fetchPromise) return fetchPromise
  fetchPromise = fetch('../data/mars_globe_locations.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      if (Array.isArray(json) && json.length > 0) {
        cachedDynamicLocations = normalizeMarsLocations(json)
      }
      return cachedDynamicLocations
    })
    .catch(() => cachedDynamicLocations)
  return fetchPromise
}

export function useMarsLocations() {
  const [locations, setLocations] = useState(cachedDynamicLocations)

  useEffect(() => {
    let active = true
    loadMarsLocationsFromAssets().then((list) => {
      if (active && list) setLocations(list)
    })
    return () => {
      active = false
    }
  }, [])

  return locations
}
