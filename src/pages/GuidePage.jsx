import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Clock,
  Compass,
  Globe,
  Radio,
  Route,
  ShieldAlert,
  Thermometer,
  Zap,
} from 'lucide-react'
import {
  coordinatedMarsTime,
  daylight,
  fmtClock,
  isDustSeason,
  seasonName,
  solarLongitude,
} from '../lib/marsTime'
import { commsDelay } from '../lib/commsDelay'

const TABS = [
  { id: 'all', label: 'All Protocols', icon: BookOpen },
  { id: 'plss', label: 'PLSS & Rover Dynamics', icon: Activity },
  { id: 'radiation', label: 'Radiation & Shelter', icon: ShieldAlert },
  { id: 'thermal', label: 'Cryogenic & Dust Hazards', icon: Thermometer },
  { id: 'terrain', label: 'Terrain & Ephemeris', icon: Compass },
]

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState('all')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const mtc = coordinatedMarsTime(now)
  const ls = solarLongitude(now)
  const comms = commsDelay(now)
  const galeDaylight = daylight(-4.59, ls)
  const jezeroDaylight = daylight(18.44, ls)
  const dustActive = isDustSeason(ls)

  const showSection = (id) => activeTab === 'all' || activeTab === id

  return (
    <div className="h-full w-full overflow-y-auto bg-bg text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-panel p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/15 text-red-400">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
                  Martian Interplanetary Survival Guide
                </h1>
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-red-300">
                  MSD {mtc.msd} · MTC {mtc.mtcFull}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                Astronaut EVA field manual: NASA life-support thresholds, Newtonian rover reserves, radiation shelter rules, and real-time orbital ephemeris.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              to="/route"
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-600"
            >
              <Route size={15} /> Plan EVA Traverse
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10 hover:text-white"
            >
              <Globe size={15} /> Planetary Atlas
            </Link>
          </div>
        </div>

        {/* Live Telemetry & Ephemeris Strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Coordinated Mars Time</span>
              <Clock size={14} className="text-red-400" />
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-white">
              {mtc.mtcFull} <span className="text-xs font-normal text-gray-400">MTC</span>
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              Mars Sol Date <span className="font-mono text-gray-200">{mtc.msd}</span> (24h 39m 35s)
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Solar Longitude (Ls)</span>
              <Compass size={14} className="text-amber-400" />
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-white">
              {ls.toFixed(1)}°
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              {dustActive ? (
                <span className="font-semibold text-amber-300">
                  Perihelion Global Dust Season (180°–330°)
                </span>
              ) : (
                <span className="text-emerald-300">Clear Orbital Season · {seasonName(ls, 18.44)}</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Earth–Mars Light Delay</span>
              <Radio size={14} className="text-amber-400" />
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-amber-300">
              {comms.oneWayMin} min <span className="text-xs font-normal text-gray-400">one-way</span>
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              Round-trip <span className="font-mono text-gray-200">{comms.roundTripMin} min</span> ·{' '}
              <span className="font-mono text-gray-200">{comms.distanceAU} AU</span> ({comms.distanceMkm}M km)
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Sector Daylight (LTST)</span>
              <Zap size={14} className="text-emerald-400" />
            </div>
            <div className="mt-1.5 font-mono text-base font-bold tabular-nums text-emerald-300">
              Gale: {fmtClock(galeDaylight.sunrise)}–{fmtClock(galeDaylight.sunset)}
            </div>
            <div className="mt-1 font-mono text-[11px] tabular-nums text-gray-300">
              Jezero: {fmtClock(jezeroDaylight.sunrise)}–{fmtClock(jezeroDaylight.sunset)}
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-5 flex overflow-x-auto border-b border-white/10 [scrollbar-width:none]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition sm:text-sm ${
                activeTab === id
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={15} className={activeTab === id ? 'text-red-400' : 'text-gray-400'} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Protocol Sections */}
        <div className="mt-6 space-y-6 pb-10">
          {showSection('plss') && (
            <section className="rounded-2xl border border-white/10 bg-panel p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-red-400" />
                <h2 className="text-base font-bold text-white sm:text-lg">
                  01. Spacesuit PLSS & Newtonian Pressurized Rover Dynamics
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                Calibrated against NASA Exploration xEMU life-support reserves and Martian gravitational mechanics (g = 3.71 m/s²).
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs font-semibold text-gray-400">Metabolic O₂ Reserve</div>
                  <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                    0.76 <span className="text-xs font-normal text-gray-400">kg (8.0 h max)</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-300">
                    Base draw <strong>0.084 kg/h</strong> on level regolith; scales nonlinearly with uphill grade and carried geological sample mass.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs font-semibold text-gray-400">Sublimator Cooling H₂O</div>
                  <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                    3.60 <span className="text-xs font-normal text-gray-400">L</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-300">
                    Base draw <strong>0.42 L/h</strong> for LCVG thermal rejection; spikes during sustained climbs above 10° slope.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs font-semibold text-gray-400">Suit Avionics & Heaters</div>
                  <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                    620 <span className="text-xs font-normal text-gray-400">Wh</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-300">
                    <strong>68 W</strong> base load for visor HUD, UHF radio, and CO₂ scrubbing, plus up to <strong>+35 W</strong> glove/boot heating below −65°C.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-300">
                    Newtonian 2-Crew Utility Rover (1,200 kg @ 3.71 m/s²)
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                    Propulsion energy is integrated along every MOLA DEM step using rolling resistance <strong>Crr = 0.15</strong> on loose regolith, signed slope grade <strong>F = mg(Crr cos θ + sin θ)</strong>, <strong>65%</strong> drivetrain efficiency, <strong>30%</strong> downhill regenerative braking recovery, and <strong>300 W</strong> continuous hotel load against a <strong>15 kWh</strong> pack (<strong>11.25 kWh</strong> usable after mandatory 25% reserve).
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-300">
                    Mandatory Walk-Back & 0.38g Sample Burden Rules
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                    Unburdened suited pace is <strong>3.5 km/h</strong> on flat ground with a hard <strong>6.0 h usable walk-back ceiling</strong> (8.0 h tank minus 2.0 h emergency reserve). Carrying up to <strong>30 kg</strong> of core samples reduces walking speed by up to 24% and raises metabolic O₂ and cooling water draw by ~1.4% per kilogram.
                  </p>
                </div>
              </div>
            </section>
          )}

          {showSection('radiation') && (
            <section className="rounded-2xl border border-white/10 bg-panel p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={18} className="text-amber-400" />
                <h2 className="text-base font-bold text-white sm:text-lg">
                  02. Surface Radiation & Topographic Horizon Shielding (MSL RAD + NASA DONKI)
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                Mars lacks an intrinsic global magnetic dipole and its ~6 mbar CO₂ atmosphere offers minimal overhead shielding.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="text-xs font-bold text-emerald-300">NOMINAL GCR BASELINE (1.0×)</div>
                  <div className="mt-1 font-mono text-lg font-bold tabular-nums text-white">
                    0.64 mSv/sol
                  </div>
                  <p className="mt-1 text-xs text-gray-300">
                    Measured by Curiosity’s MSL RAD detector during quiet solar conditions (~233 mSv/yr). Standard EVA permitted.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="text-xs font-bold text-amber-300">ELEVATED CME / FLARE (2.8×)</div>
                  <div className="mt-1 font-mono text-lg font-bold tabular-nums text-white">
                    1.79 mSv/sol
                  </div>
                  <p className="mt-1 text-xs text-gray-300">
                    Triggered by M-class solar flares or heliospheric CME passage. Restrict high-altitude ridge traverses.
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="text-xs font-bold text-red-300">SOLAR PARTICLE STORM (8.5×)</div>
                  <div className="mt-1 font-mono text-lg font-bold tabular-nums text-white">
                    5.44 mSv/sol
                  </div>
                  <p className="mt-1 text-xs text-gray-300">
                    Acute Solar Energetic Particle (SEP) or X-class flare event. Abort open-plain EVA and shelter immediately.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  🛡️ Natural Topographic Sky-Dome Shielding Protocol
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                  Because isotropic Galactic Cosmic Rays and secondary atmospheric neutron/proton cascades arrive from the overhead hemisphere, positioning crew against a steep crater wall, boxwork ridge, or canyon alcove blocks <strong>18%–62%</strong> of the sky solid angle. RedMap automatically evaluates surrounding MOLA elevation cells along every route to pin the <strong>Nearest Natural Radiation Shelter (`🛡️`)</strong>.
                </p>
              </div>
            </section>
          )}

          {showSection('thermal') && (
            <section className="rounded-2xl border border-white/10 bg-panel p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <Thermometer size={18} className="text-sky-400" />
                <h2 className="text-base font-bold text-white sm:text-lg">
                  03. Diurnal Cryogenic Thermal Stress & Perihelion Dust Storms
                </h2>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    REMS (Gale) & MEDA (Jezero) Diurnal Temperature Envelope
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                    Surface temperatures swing over <strong>75°C every single sol</strong>—from afternoon highs near <strong>−13°C (Gale) / −22°C (Jezero)</strong> down to pre-dawn lows of <strong>−78°C to −90°C</strong>. All EVAs are scheduled inside the daytime thermal window with at least <strong>30 minutes of daylight margin before local sunset</strong> to avoid rapid post-sunset cryogenic heat loss and suit battery depletion.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Global Dust Storm Season (Ls 180°–330°)
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                    During southern spring and summer (perihelion), atmospheric optical depth (τ) can surge from τ ≈ 0.4 to τ &gt; 4.0, cutting solar array generation by over 80%, obscuring horizon landmarks needed for visual navigation, and coating suit thermal radiators and seals with electrostatic micron-scale dust.
                  </p>
                </div>
              </div>
            </section>
          )}

          {showSection('terrain') && (
            <section className="rounded-2xl border border-white/10 bg-panel p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <Compass size={18} className="text-emerald-400" />
                <h2 className="text-base font-bold text-white sm:text-lg">
                  04. NASA Orbital Datasets & Autonomous Light-Delay Operations
                </h2>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="font-mono text-xs font-bold text-red-400">
                    MGS MOLA · 463 m/px Calibrated DEM
                  </div>
                  <p className="mt-1 text-xs text-gray-300">
                    Mars Orbiter Laser Altimeter elevation model calibrated against 12 benchmark landing sites (R² = 0.999) to compute real elevation gain, slope angle, terrain roughness, and enclosed basin hazards.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="font-mono text-xs font-bold text-red-400">
                    MRO HiRISE (25 cm/px) & CTX (5 m/px) Pyramids
                  </div>
                  <p className="mt-1 text-xs text-gray-300">
                    Localized two-layer orbital orthomosaics over Gale Crater / Mount Sharp and Jezero Crater / Western Delta resolving meter-scale scarps, boxwork ridges, and boulder fields.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="font-mono text-xs font-bold text-red-400">
                    360° Mastcam & Navcam Surface Visor HUD
                  </div>
                  <p className="mt-1 text-xs text-gray-300">
                    23 authentic NASA/JPL PDS spherical panoramas from Curiosity and Perseverance allowing astronauts to inspect real surface outcrops, horizon ridges, and regolith texture before stepping onto the terrain.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="font-mono text-xs font-bold text-red-400">
                    Asynchronous Comms Protocol (&gt;10 min One-Way Delay)
                  </div>
                  <p className="mt-1 text-xs text-gray-300">
                    With Earth–Mars round-trip light time between <strong>6.2 and 44.6 minutes</strong>, crews operate under autonomous GO / CAUTION / NO-GO flight rules with pre-computed turn-back kilometer marks and waypoint retrace budgets.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
