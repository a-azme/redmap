export const GRID_W = 200
export const GRID_H = 112
export const SOL_RANGE_KM = 60      // ek sol e koto km jete pare (assumption)
export const ROUGH_SLOPE = 8        // eta theke beshi slope = rough terrain
export const POI_NEAR_KM = 12       // route theke koto km er moddhe thakle science stop
export const MAX_SPAN_DEG = 120     // eta theke boro area te route kora jabe na

// How each mode trades distance against terrain. Costs are in "km-equivalent":
//  slopeWeight   – extra cost on steep ground, multiplier (1 + w * (slope/10)^2)
//  roughWeight   – extra cost near rugged ground (steepest neighbour slope), same form
//  lowWeight     – extra cost on low ground (below the surrounding terrain): craters floors, pits
//  bumpWeight    – extra cost on bumpy ground (multi-scale local relief), multiplier (1 + w * (bump/5)^2)
//  keepOut       – cells beyond these limits are no-go zones: steepDeg (steepest neighbour), lowKm (below surroundings), bumpDeg
//  climbKmPerKm  – each km of ascent costs this many km of travel (effort / power use)
//  maxSlope      – hard limit for this mode (the user's slider can only lower it)
//  maxDetour     – scientific mode may lengthen the route by this fraction to pass through sites
export const ROUTE_MODES = {
  fastest: {
    label: 'Fastest',
    desc: 'Shortest travel time',
    maxSlope: 20,
    slopeWeight: 0.6,
    roughWeight: 0.4,
    lowWeight: 0.6,
    bumpWeight: 0.5,
    keepOut: { steepDeg: 20, lowKm: 1.6, bumpDeg: 12 },
    climbKmPerKm: 4,
  },
  safest: {
    label: 'Safest',
    desc: 'Avoids steep and rugged ground',
    maxSlope: 10,
    slopeWeight: 4,
    roughWeight: 3,
    lowWeight: 3,
    bumpWeight: 2.5,
    keepOut: { steepDeg: 10, lowKm: 0.9, bumpDeg: 7 },
    climbKmPerKm: 16,
  },
  scientific: {
    label: 'Most Scientific',
    desc: 'Passes through science sites',
    maxSlope: 15,
    slopeWeight: 1.5,
    roughWeight: 0.8,
    lowWeight: 1.2,
    bumpWeight: 1,
    keepOut: { steepDeg: 15, lowKm: 1.3, bumpDeg: 9 },
    climbKmPerKm: 6,
    sciBonus: 0.5,
    sciRadiusKm: 8,
    maxDetour: 0.35,
  },
}

// Planning defaults for operations (both can be changed in Route Settings)
export const DEFAULT_MAX_LEG_KM = 20   // a checkpoint is added at least this often
export const RETRACE_MAX_SLOPE = 12    // a leg steeper than this is hard to climb back out of
