// NASA Mars Trek tiles. {ext} code nijei jpg/png probe kore bosay.
const TREK = 'https://trek.nasa.gov/tiles/Mars/EQ'
const trek = (product) =>
  `${TREK}/${product}/1.0.0/default/default028mm/{z}/{y}/{x}.{ext}`

// High-resolution regional overlays (Jezero Crater + Gale Crater / Mount Sharp)
// rect = [west, south, east, north]
const HIGH_RES_OVERLAYS = [
  {
    name: 'MRO CTX Jezero mosaic (6 m)',
    url: trek('Jezero_CTX_BlockAdj_dd'),
    rect: [75.15, 15.9, 78.87, 19.45],
    maxNativeZoom: 10,
  },
  {
    name: 'MRO HiRISE Jezero mosaic (25 cm)',
    url: trek('JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd'),
    rect: [77.2229, 18.3068, 77.584, 18.6693],
    maxNativeZoom: 16,
  },
  {
    name: 'MRO CTX Gale Crater & Mount Sharp mosaic (5 m)',
    url: trek('Gale_CTX_BlockAdj_dd'),
    rect: [135.1843, -6.5733, 139.2413, -2.8078],
    maxNativeZoom: 12,
  },
  {
    name: 'MRO HiRISE Curiosity & Mount Sharp mosaic (25 cm)',
    url: trek('curiosity_hirise_mosaic'),
    rect: [137.1225, -4.9255, 137.7298, -4.249],
    maxNativeZoom: 16,
  },
]

const VIKING = {
  name: 'Viking MDIM 2.1 color mosaic',
  url: trek('Mars_Viking_MDIM21_ClrMosaic_global_232m'),
  maxNativeZoom: 7,
}

// MarsGlobe.jsx er colorize ramp er sathe same (Temperature legend er jonno)
const THERMAL_BAR =
  'linear-gradient(to right, rgb(25,35,130), rgb(70,50,180), rgb(180,50,140), rgb(240,100,50), rgb(255,200,70), rgb(255,248,200))'

export const LAYER_CATALOG = [
  {
    id: 'terrain',
    name: 'Terrain',
    short: 'Terrain',
    shortName: 'Terrain',
    sub: 'Surface features & HiRISE/CTX',
    grad: 'from-orange-700 to-orange-950',
  },
  {
    id: 'elevation',
    name: 'Elevation',
    short: 'Elevation',
    shortName: 'Elevation',
    sub: 'MOLA + HRSC height relief',
    grad: 'from-blue-600 via-green-500 to-red-600',
  },
  {
    id: 'geo',
    name: 'Geological Features',
    short: 'Geological',
    shortName: 'Geological',
    sub: 'Craters, ridges & formations',
    grad: 'from-gray-500 to-gray-800',
  },
  {
    id: 'minerals',
    name: 'Minerals',
    short: 'Minerals',
    shortName: 'Minerals',
    sub: 'Silicates & clay abundance',
    grad: 'from-purple-600 to-indigo-900',
  },
  {
    id: 'temp',
    name: 'Temperature',
    short: 'Thermal IR',
    shortName: 'Thermal IR',
    sub: 'THEMIS daytime thermal IR',
    grad: 'from-yellow-500 via-red-500 to-blue-700',
  },
  {
    id: 'atmo',
    name: 'Atmosphere',
    short: 'Atmosphere',
    shortName: 'Atmosphere',
    sub: 'TES atmospheric dust',
    grad: 'from-sky-600 to-sky-900',
  },
]

// sources: ekta ekta kore try hobe, prothom je ta kaaj kore seta use hobe
// legend: { bar, labels } shudhu jekhane color er mane nishchit
export const TILE_LAYERS = {
  terrain: {
    title: 'Terrain (HiRISE 25 cm + CTX 5 m)',
    note: 'Natural color global mosaic overlaid with MRO CTX (5 m/px) and MRO HiRISE (25 cm/px) surface orthomosaics.',
    sources: [VIKING],
    overlays: HIGH_RES_OVERLAYS,
    legend: null,
  },
  elevation: {
    title: 'Elevation (MGS MOLA + HRSC)',
    note: 'Color shows height above/below the Mars reference level. Blue tones are lower ground and warm/light tones are higher ground.',
    sources: [
      {
        name: 'MOLA + HRSC blended color shaded relief (200 m)',
        url: trek('Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw'),
        maxNativeZoom: 7,
      },
      {
        name: 'MGS MOLA color shaded relief (463 m)',
        url: trek('Mars_MGS_MOLA_ClrShade_merge_global_463m'),
        maxNativeZoom: 6,
      },
    ],
    legend: {
      bar: 'linear-gradient(to right, #1e3a8a, #06b6d4, #22c55e, #eab308, #ef4444, #ffffff)',
      labels: ['-7 km', '0 km', '+14 km'],
    },
  },
  geo: {
    title: 'Geological Features (HRSC + CTX)',
    note: 'Landforms: craters, ridges, canyons and volcanoes. Shows surface morphology and slope shading.',
    sources: [
      {
        name: 'MOLA + HRSC blended shaded relief (200 m)',
        url: trek('Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw'),
        maxNativeZoom: 7,
      },
    ],
    legend: {
      bar: 'linear-gradient(to right, #111, #888, #eee)',
      labels: ['Shaded side', 'Sunlit side'],
    },
  },
  minerals: {
    title: 'Minerals (MGS TES / CRISM)',
    note: 'Global map of clay-like (sheet silicate) minerals from MGS TES. Colors show relative mineral abundance.',
    sources: [
      { name: 'MGS TES sheet silicates / high-Si glass', url: trek('TES_Glass_Clay'), maxNativeZoom: 3 },
    ],
    legend: {
      bar: 'linear-gradient(to right, #1e1b4b, #4338ca, #22c55e, #facc15, #ef4444)',
      labels: ['Low abundance', 'High clay/silicate'],
    },
  },
  temp: {
    title: 'Thermal Inertia (Odyssey THEMIS 100 m)',
    note: 'Daytime thermal infrared brightness (Mars Odyssey THEMIS, 100 m/px). Covers 65°S to 65°N.',
    sources: [
      {
        name: 'Mars Odyssey THEMIS day IR mosaic (100 m)',
        url: trek('THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018'),
        maxNativeZoom: 8,
        colorize: true,
      },
    ],
    legend: {
      bar: THERMAL_BAR,
      labels: ['Cooler', 'Warmer'],
    },
  },
  atmo: {
    title: 'Atmosphere (TES Dust Opacity)',
    note: 'Atmospheric dust opacity mapped by Mars Global Surveyor TES.',
    sources: [{ name: 'MGS TES global dust', url: trek('TES_Dust'), maxNativeZoom: 3 }],
    legend: {
      bar: 'linear-gradient(to right, #0c4a6e, #38bdf8, #f59e0b, #dc2626)',
      labels: ['Clear sky', 'High dust opacity'],
    },
  },
  missions: {
    title: 'NASA Missions',
    note: 'Blue markers show NASA rover and lander surface sites.',
    sources: [VIKING],
    overlays: HIGH_RES_OVERLAYS,
    legend: null,
  },
}

TILE_LAYERS.geological = TILE_LAYERS.geo
TILE_LAYERS.temperature = TILE_LAYERS.temp
TILE_LAYERS.atmosphere = TILE_LAYERS.atmo

export const ROVERS = [
  { id: 'perseverance', name: 'Perseverance', lat: 18.44, lon: 77.45, color: '#ff5a4f' },
  { id: 'curiosity', name: 'Curiosity', lat: -4.59, lon: 137.44, color: '#ff5a4f' },
  { id: 'insight', name: 'InSight', lat: 4.5, lon: 135.62, color: '#f5a524' },
  { id: 'phoenix', name: 'Phoenix', lat: 68.22, lon: -125.7, color: '#f5a524' },
  { id: 'opportunity', name: 'Opportunity', lat: -1.95, lon: -5.53, color: '#ff5a4f' },
  { id: 'spirit', name: 'Spirit', lat: -14.57, lon: 175.47, color: '#ff5a4f' },
  { id: 'pathfinder', name: 'Pathfinder', lat: 19.13, lon: -33.22, color: '#ff5a4f' },
  { id: 'viking2', name: 'Viking 2', lat: 47.67, lon: -134.29, color: '#f5a524' },
  { id: 'viking1', name: 'Viking 1', lat: 22.27, lon: -47.95, color: '#f5a524' },
]