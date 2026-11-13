// NASA Mars Trek tiles. {ext} code nijei jpg/png probe kore bosay.
const TREK = 'https://trek.nasa.gov/tiles/Mars/EQ'
const trek = (product) =>
  `${TREK}/${product}/1.0.0/default/default028mm/{z}/{y}/{x}.{ext}`

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
    sub: 'Viking global color mosaic',
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
    title: 'Terrain',
    note: 'Global 232 m/px color mosaic mapped by NASA Viking Orbiters.',
    sources: [VIKING],
    overlays: [],
    legend: null,
  },
  elevation: {
    title: 'Elevation',
    note: 'Topographic height relative to Mars datum (blue = basins, red/white = highlands).',
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
    title: 'Geological Features',
    note: 'Surface morphology and slope relief across craters, troughs, and volcanic shields.',
    sources: [
      {
        name: 'MOLA + HRSC blended shaded relief (200 m)',
        url: trek('Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw'),
        maxNativeZoom: 7,
      },
    ],
    legend: {
      bar: 'linear-gradient(to right, #111, #888, #eee)',
      labels: ['Shaded', 'Sunlit'],
    },
  },
  minerals: {
    title: 'Minerals',
    note: 'Global sheet silicate and clay mineral abundance mapped by MGS TES.',
    sources: [
      { name: 'MGS TES sheet silicates / high-Si glass', url: trek('TES_Glass_Clay'), maxNativeZoom: 1 },
    ],
    legend: {
      bar: 'linear-gradient(to right, #1e1b4b, #4338ca, #22c55e, #facc15, #ef4444)',
      labels: ['Low', 'High clay/silicate'],
    },
  },
  temp: {
    title: 'Thermal Inertia',
    note: 'Mars Odyssey THEMIS daytime thermal IR mosaic (100 m/px, 65°S–65°N) over MGS TES global thermal inertia.',
    sources: [
      {
        name: 'Mars Odyssey THEMIS day IR mosaic (100 m)',
        url: trek('THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018'),
        maxNativeZoom: 8,
        colorize: true,
      },
      {
        name: 'MGS TES global thermal inertia',
        url: trek('TES_Thermal_Inertia'),
        maxNativeZoom: 1,
      },
    ],
    legend: {
      bar: THERMAL_BAR,
      labels: ['Cooler', 'Warmer'],
    },
  },
  atmo: {
    title: 'Atmosphere',
    note: 'Global atmospheric dust optical depth mapped by Mars Global Surveyor TES.',
    sources: [{ name: 'MGS TES global dust', url: trek('TES_Dust'), maxNativeZoom: 1 }],
    legend: {
      bar: 'linear-gradient(to right, #0c4a6e, #38bdf8, #f59e0b, #dc2626)',
      labels: ['Clear sky', 'High dust'],
    },
  },
  missions: {
    title: 'NASA Missions',
    note: 'Surface markers for NASA rovers and landers across Mars.',
    sources: [VIKING],
    overlays: [],
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