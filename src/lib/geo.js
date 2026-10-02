export const MARS_R = 3389.5

const rad = (d) => (d * Math.PI) / 180

export function haversine(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * MARS_R * Math.asin(Math.min(1, Math.sqrt(a)))
}

export const wrapLon = (d) => ((((d + 180) % 360) + 360) % 360) - 180