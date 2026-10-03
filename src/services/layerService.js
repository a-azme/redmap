// NASA Mars Trek tiles (equirectangular, WMTS REST)
const TREK = 'https://trek.nasa.gov/tiles/Mars/EQ'
const trek = (product, ext = 'jpg') =>
  `${TREK}/${product}/1.0.0/default/default028mm/{z}/{y}/{x}.${ext}`

export const TILE_LAYERS = {
  terrain: {
    title: 'Terrain',
    source: 'Viking MDIM 2.1 Color Mosaic',
    note: 'Natural-color surface imagery.',
    url: trek('Mars_Viking_MDIM21_ClrMosaic_global_232m'),
    maxNativeZoom: 7,
  },
  elevation: {
    title: 'Elevation',
    source: 'MGS MOLA colorized shaded relief (463 m)',
    note: 'Color shows height above/below the Mars reference level.',
    url: trek('Mars_MGS_MOLA_ClrShade_merge_global_463m'),
    maxNativeZoom: 6,
  },
  // Product er nam Trek er pattern theke anuman kora. Kaj na korle card e lal message ashbe.
  temp: {
    title: 'Temperature',
    source: 'Mars Odyssey THEMIS Day IR mosaic (100 m)',
    note: 'Daytime infrared brightness, a visual proxy for surface temperature. Not calibrated degrees.',
    url: trek('Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12'),
    maxNativeZoom: 8,
  },
  // ---- Nicher gulo ekhono set kora nai ----
  geo: {
    title: 'Geological Features',
    source: 'Not configured yet',
    note: 'Add a geologic map tile product name here.',
    url: null,
    maxNativeZoom: 6,
  },
  minerals: {
    title: 'Minerals',
    source: 'Not configured yet',
    note: 'Add a mineral map tile product name here.',
    url: null,
    maxNativeZoom: 6,
  },
  atmo: {
    title: 'Atmosphere',
    source: 'Not configured yet',
    note: 'Add a pressure / dust tile source here.',
    url: null,
    maxNativeZoom: 6,
  },
  missions: {
    title: 'NASA Missions',
    source: 'Viking base map + rover landing sites',
    note: 'Blue markers are rover and lander landing sites.',
    url: trek('Mars_Viking_MDIM21_ClrMosaic_global_232m'),
    maxNativeZoom: 7,
  },
}

export const ROVERS = [
  { id: 'perseverance', name: 'Perseverance', lat: 18.44, lon: 77.45 },
  { id: 'curiosity', name: 'Curiosity', lat: -4.59, lon: 137.44 },
  { id: 'opportunity', name: 'Opportunity', lat: -1.95, lon: 354.47 },
  { id: 'spirit', name: 'Spirit', lat: -14.57, lon: 175.47 },
  { id: 'insight', name: 'InSight', lat: 4.5, lon: 135.6 },
]