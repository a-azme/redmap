export const MARS_RADIUS_KM = 3389.5;

// Approximate coordinates (°E 0–360). Put photos in public/images/.
export const LOCATIONS = [
  { id: 'valles', name: 'Valles Marineris', lat: -14.57, lon: 316.0, elevKm: -3.5,
    image: '/images/valles.jpg',
    description: 'The largest canyon system in the solar system, stretching thousands of kilometres.',
    tags: ['Canyon', 'Layered walls', 'Sulfates'],
    mission: { name: 'Mars Reconnaissance Orbiter', years: '2006 – Present', note: 'CRISM and HiRISE mapped hydrated minerals and layered walls here.' } },
  { id: 'jezero', name: 'Jezero Crater', lat: 18.435, lon: 77.527, elevKm: -2.6,
    image: '/images/jezero.jpg',
    description: 'An ancient lake bed and one of the scientifically most significant locations on Mars.',
    tags: ['Landing Site', 'Delta', 'Clay Minerals'],
    mission: { name: 'Perseverance Rover', years: '2021 – Present', note: 'Collecting rock samples from the ancient delta for future return to Earth.' } },
  { id: 'gale', name: 'Gale Crater', lat: -5.4, lon: 137.8, elevKm: -4.4,
    image: '/images/gale.jpg',
    description: 'Home of Mount Sharp, a mound of layered sediment recording changing Martian climates.',
    tags: ['Landing Site', 'Sediment layers'],
    mission: { name: 'Curiosity Rover', years: '2012 – Present', note: 'Found evidence of an ancient habitable lake environment.' } },
  { id: 'meridiani', name: 'Meridiani Planum', lat: -1.95, lon: 354.47, elevKm: -1.4,
    image: '/images/meridiani.jpg',
    description: 'A flat plain rich in hematite, explored for more than a decade.',
    tags: ['Landing Site', 'Hematite'],
    mission: { name: 'Opportunity Rover', years: '2004 – 2018', note: 'Found evidence of past liquid water.' } },
  { id: 'utopia', name: 'Utopia Planitia', lat: 46.7, lon: 117.7, elevKm: -4.2,
    image: '/images/utopia.jpg',
    description: 'The largest recognised impact basin on Mars, with large reserves of subsurface ice.',
    tags: ['Landing Site', 'Subsurface ice'],
    mission: { name: 'Viking 2 Lander', years: '1976 – 1980', note: 'First measurements from the northern lowlands.' } },
  { id: 'olympus', name: 'Olympus Mons Base', lat: 18.65, lon: 226.2, elevKm: 2.0,
    image: '/images/olympus.jpg',
    description: 'The base of the tallest volcano known in the solar system.',
    tags: ['Volcano', 'Basalt'],
    mission: { name: 'Mars Global Surveyor (MOLA)', years: '1997 – 2006', note: 'Laser altimetry produced the global elevation model.' } },
];

export const MODES = {
  fastest:    { label: 'Fastest Route', detour: 1.08, roughness: 1.0,  speedKmh: 10 },
  safest:     { label: 'Safest Route',  detour: 1.25, roughness: 0.55, speedKmh: 8  },
  scientific: { label: 'Most Science',  detour: 1.18, roughness: 0.8,  speedKmh: 8  },
};

export const DEFAULT_SETTINGS = {
  mode: 'fastest',
  maxSlopeDeg: 15,
  avoidRough: true,
  showScience: true,
  evaHoursPerSol: 6,
};

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * MARS_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Great-circle interpolation, f = 0..1
function interpolate(a, b, f) {
  const d = haversineKm(a, b) / MARS_RADIUS_KM;
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(rad(a.lat)) * Math.cos(rad(a.lon)) + B * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon));
  const y = A * Math.cos(rad(a.lat)) * Math.sin(rad(a.lon)) + B * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon));
  const z = A * Math.sin(rad(a.lat)) + B * Math.sin(rad(b.lat));
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: (deg(Math.atan2(y, x)) + 360) % 360 };
}

export function fmtCoord(lat, lon) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${lon.toFixed(1)}° E`;
}

// Deterministic random so the same route always gives the same result
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

// PLACEHOLDER catalogue: swap for real mission data (CRISM, HiRISE, SHARAD...) when available
const SCIENCE_POOL = [
  { title: 'Clay-bearing outcrop',        source: 'MRO CRISM',             detail: 'Phyllosilicate signature – evidence of past liquid water.' },
  { title: 'Ancient delta deposits',      source: 'MRO HiRISE',            detail: 'Layered sediments – prime target for biosignature search.' },
  { title: 'Possible subsurface ice',     source: 'MRO SHARAD',            detail: 'Radar reflections consistent with buried ice – water resource.' },
  { title: 'Methane variability zone',    source: 'Curiosity SAM',         detail: 'Seasonal methane changes measured nearby.' },
  { title: 'Rock sampling candidate',     source: 'Perseverance SuperCam', detail: 'Diverse igneous/sedimentary rocks within walking range.' },
  { title: 'Fresh impact crater',         source: 'MRO CTX',               detail: 'Exposes material from below the surface.' },
  { title: 'Dust & weather station spot', source: 'MRO MCS',               detail: 'Good location for atmospheric dust and temperature logging.' },
];

export function planRoute(start, end, settings = DEFAULT_SETTINGS) {
  if (!start || !end || start.id === end.id) return null;
  const mode = MODES[settings.mode] ?? MODES.fastest;
  const rough = mode.roughness;
  const rng = mulberry32(hash(start.id + end.id + settings.mode + settings.avoidRough));

  const distanceKm = Math.round(haversineKm(start, end) * mode.detour);
  const N = Math.min(80, Math.max(30, Math.round(distanceKm / 10)));
  const phase = rng() * Math.PI * 2;

  // PLACEHOLDER terrain generator: replace this loop with real MOLA/HRSC elevation sampling
  const points = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const base = start.elevKm + (end.elevKm - start.elevKm) * f;
    const wave = (Math.sin(f * Math.PI * 3 + phase) * 0.35 + (rng() - 0.5) * 0.15) * rough * Math.sin(Math.PI * f);
    const pos = interpolate(start, end, f);

    const roll = rng();
    const bad = settings.avoidRough ? 0.08 : 0.2;
    let terrain;
    if (roll < bad / 2) terrain = 'Rough / boulders';
    else if (roll < bad) terrain = 'Crater rim';
    else terrain = ['Smooth plain', 'Rocky', 'Crater floor', 'Sand ripples'][Math.floor(rng() * 4)];

    const slopeBoost = terrain === 'Crater rim' ? 8 : terrain === 'Rough / boulders' ? 5 : 0;
    const slope = Math.min(32, 1.5 + rng() * 9 * rough + slopeBoost);
    const elevKm = base + wave;
    const tempC = Math.round(-45 - Math.abs(pos.lat) * 0.6 - elevKm * 1.5);

    points.push({ km: f * distanceKm, ...pos, elevKm: +elevKm.toFixed(3), terrain, slopeDeg: +slope.toFixed(1), tempC });
  }

  let gain = 0, loss = 0;
  for (let i = 1; i < points.length; i++) {
    const d = points[i].elevKm - points[i - 1].elevKm;
    if (d > 0) gain += d; else loss -= d;
  }
  const avgSlopeDeg = +(points.reduce((s, p) => s + p.slopeDeg, 0) / points.length).toFixed(1);
  const maxSlopeDeg = Math.max(...points.map((p) => p.slopeDeg));
  const minTempC = Math.min(...points.map((p) => p.tempC));

  const kmPerSol = mode.speedKmh * settings.evaHoursPerSol;
  const sols = Math.max(1, Math.ceil(distanceKm / kmPerSol));
  // Surface radiation measured by Curiosity's RAD is roughly 0.64 mSv per sol
  const radiationMsv = +(sols * 0.64).toFixed(1);

  // ---- warnings: merge consecutive bad points into one warning ----
  const warnings = [];
  const addRuns = (test, make) => {
    let s = null;
    points.forEach((p, i) => {
      const hit = test(p);
      if (hit && s === null) s = i;
      if ((!hit || i === points.length - 1) && s !== null) {
        const e = hit ? i : i - 1;
        warnings.push({ ...make(points.slice(s, e + 1)), fromKm: points[s].km, toKm: points[e].km });
        s = null;
      }
    });
  };
  addRuns((p) => p.slopeDeg > settings.maxSlopeDeg, (seg) => ({
    severity: 'critical', title: 'Steep Slope',
    detail: `Up to ${Math.max(...seg.map((p) => p.slopeDeg)).toFixed(0)}° – exceeds your ${settings.maxSlopeDeg}° limit. Find a detour.`,
  }));
  addRuns((p) => p.terrain === 'Rough / boulders', () => ({
    severity: 'caution', title: 'Rough Terrain', detail: 'Boulder field – reduce speed, risk to wheels and suit abrasion.',
  }));
  addRuns((p) => p.terrain === 'Crater rim', () => ({
    severity: 'caution', title: 'Crater Rim', detail: 'Steep, loose material on the rim. Scout on foot first.',
  }));
  if (minTempC < -75) warnings.push({ severity: 'caution', title: 'Extreme Cold', detail: `Estimated down to ${minTempC}°C – check suit heating margins.`, fromKm: 0, toKm: distanceKm });
  if (sols > 30) warnings.push({ severity: 'caution', title: 'Dust-Storm Exposure', detail: `${sols} sols on the surface – likely to overlap a regional dust storm (solar power and visibility drop).`, fromKm: 0, toKm: distanceKm });
  if (Math.max(Math.abs(start.lat), Math.abs(end.lat)) > 60) warnings.push({ severity: 'info', title: 'Comms Gaps', detail: 'High latitude – fewer orbiter relay passes.', fromKm: 0, toKm: distanceKm });
  warnings.sort((a, b) => a.fromKm - b.fromKm);
  warnings.forEach((w, i) => {
    w.id = `w${i}`;
    const p = points.reduce((a, b) => (Math.abs(b.km - w.fromKm) < Math.abs(a.km - w.fromKm) ? b : a));
    w.lat = p.lat; w.lon = p.lon;
  });

  // ---- science stops ----
  const stopCount = settings.mode === 'scientific' ? 6 : 4;
  const pool = [...SCIENCE_POOL].sort(() => rng() - 0.5);
  const stops = settings.showScience
    ? Array.from({ length: stopCount }, (_, i) => {
        const f = (i + 1) / (stopCount + 1) + (rng() - 0.5) * 0.04;
        const p = points[Math.min(points.length - 1, Math.round(f * N))];
        return { id: `s${i}`, ...pool[i % pool.length], km: Math.round(p.km), lat: p.lat, lon: p.lon, elevKm: p.elevKm };
      })
    : [];

  // ---- risk score 0–100 ----
  const steepShare = points.filter((p) => p.slopeDeg > settings.maxSlopeDeg).length / points.length;
  const critical = warnings.filter((w) => w.severity === 'critical').length;
  const risk = Math.min(100, Math.round(steepShare * 120 + critical * 8 + Math.min(sols, 60) * 0.5 + (minTempC < -75 ? 8 : 0)));

  return {
    start, end, settings, mode: settings.mode, distanceKm, sols,
    elevationGainKm: +gain.toFixed(2), elevationLossKm: +loss.toFixed(2),
    avgSlopeDeg, maxSlopeDeg, minTempC, radiationMsv, risk,
    riskLabel: risk < 25 ? 'Low' : risk < 55 ? 'Moderate' : 'High',
    points, path: points.map((p) => ({ lat: p.lat, lon: p.lon })), warnings, stops,
  };
}

// Each science stop adds ~0.5 sol of work
export const totalSols = (route, selectedIds = []) =>
  route ? +(route.sols + selectedIds.length * 0.5).toFixed(1) : 0;