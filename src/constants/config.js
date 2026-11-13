export const GRID_W = 200
export const GRID_H = 112
export const SOL_RANGE_KM = 60      // ek sol e koto km jete pare (assumption)
export const ROUGH_SLOPE = 8        // eta theke beshi slope = rough terrain
export const POI_NEAR_KM = 12       // route theke koto km er moddhe thakle science stop
export const MAX_SPAN_DEG = 120     // eta theke boro area te route kora jabe na

export const ROUTE_MODES = {
  fastest: {
    label: 'Fastest',
    desc: 'Shortest travel time',
    maxSlope: 20,
    slopeWeight: 0.6,
  },
  safest: {
    label: 'Safest',
    desc: 'Avoids steep slopes',
    maxSlope: 12,
    slopeWeight: 4,
  },
  scientific: {
    label: 'Most Scientific',
    desc: 'Passes near science sites',
    maxSlope: 15,
    slopeWeight: 1.5,
    sciBonus: 0.5,
    sciRadiusKm: 8,
  },
}