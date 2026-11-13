// NASA Mars Trek tiles. {ext} code nijei jpg/png probe kore bosay.
const TREK = 'https://trek.nasa.gov/tiles/Mars/EQ'
const trek = (product) =>
  `${TREK}/${product}/1.0.0/default/default028mm/{z}/{y}/{x}.{ext}`

// Jezero er sharp detail (rect = [west, south, east, north])
const JEZERO_OVERLAYS = [
  {
    name: 'MRO CTX Jezero mosaic',
    url: trek('Jezero_CTX_BlockAdj_dd'),
    rect: [75.15, 15.9, 78.87, 19.45],
    maxNativeZoom: 10,
  },
  {
    name: 'MRO HiRISE Jezero mosaic (25 cm)',
    url: trek('JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd'),
    rect: [77.22, 18.31, 77.58, 18.67],
    maxNativeZoom: 14,
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

// sources: ekta ekta kore try hobe, prothom je ta kaaj kore seta use hobe
// legend: { bar, labels } shudhu jekhane color er mane nishchit
export const TILE_LAYERS = {
  terrain: {
    title: 'Terrain',
    note: 'Natural color. Zoom into Jezero Crater for MRO CTX and HiRISE detail.',
    sources: [VIKING],
    overlays: JEZERO_OVERLAYS,
    legend: null,
  },
  elevation: {
    title: 'Elevation',
    note: 'Color shows height above/below the Mars reference level. Blue tones are generally lower ground and warm or light tones are higher ground. The exact scale is shown in NASA Mars Trek.',
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
    legend: null,
  },
  geo: {
    title: 'Geological Features',
    note: 'Landforms: craters, ridges, canyons and volcanoes. Shows surface shape, not rock type.',
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
    title: 'Minerals',
    note: 'Low-resolution global map of clay-like (sheet silicate) minerals. Colors show relative abundance. The exact scale is shown in NASA Mars Trek.',
    sources: [
      { name: 'MGS TES sheet silicates / high-Si glass', url: trek('TES_Glass_Clay'), maxNativeZoom: 3 },
    ],
    legend: null,
  },
  temp: {
    title: 'Temperature',
    note: 'False-color view of daytime infrared brightness. A relative visual proxy, not calibrated degrees. Covers 65°S to 65°N only.',
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
    title: 'Atmosphere',
    note: 'Dust in the atmosphere. Pressure data is not available as a tile layer.',
    sources: [{ name: 'MGS TES global dust', url: trek('TES_Dust'), maxNativeZoom: 3 }],
    legend: null,
  },
  missions: {
    title: 'NASA Missions',
    note: 'Blue markers are rover and lander landing sites.',
    sources: [VIKING],
    overlays: JEZERO_OVERLAYS,
    legend: null,
  },
}

export const ROVERS = [
  { id: 'perseverance', name: 'Perseverance', lat: 18.44, lon: 77.45 },
  { id: 'curiosity', name: 'Curiosity', lat: -4.59, lon: 137.44 },
  { id: 'opportunity', name: 'Opportunity', lat: -1.95, lon: 354.47 },
  { id: 'spirit', name: 'Spirit', lat: -14.57, lon: 175.47 },
  { id: 'insight', name: 'InSight', lat: 4.5, lon: 135.6 },
]