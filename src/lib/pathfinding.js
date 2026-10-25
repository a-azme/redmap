class MinHeap {
  constructor() { this.a = [] }
  get size() { return this.a.length }
  push(f, i) {
    const a = this.a
    a.push([f, i])
    let c = a.length - 1
    while (c > 0) {
      const p = (c - 1) >> 1
      if (a[p][0] <= a[c][0]) break
      ;[a[p], a[c]] = [a[c], a[p]]
      c = p
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < a.length && a[l][0] < a[m][0]) m = l
        if (r < a.length && a[r][0] < a[m][0]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

/** Terrain gradient per cell (km of height per km, in grid x / y directions); cached on the grid. */
export function cellGradient(grid) {
  if (grid._grad) return grid._grad
  const { gw, gh, heights, dy } = grid
  const gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh)
  for (let y = 0; y < gh; y++) {
    const dxr = grid.dxRow ? grid.dxRow[y] : grid.dx
    for (let x = 0; x < gw; x++) {
      const x0 = Math.max(0, x - 1), x1 = Math.min(gw - 1, x + 1), y0 = Math.max(0, y - 1), y1 = Math.min(gh - 1, y + 1)
      gx[y * gw + x] = (heights[y * gw + x1] - heights[y * gw + x0]) / ((x1 - x0) * dxr)
      gy[y * gw + x] = (heights[y1 * gw + x] - heights[y0 * gw + x]) / ((y1 - y0) * dy)
    }
  }
  return (grid._grad = { gx, gy })
}

/** Side slope (degrees) when moving by (ex, ey) km across a surface with gradient (gx, gy): 0 straight up or down, big when traversing. */
export const crossSlopeDeg = (gx, gy, ex, ey) => {
  const len = Math.hypot(ex, ey) || 1
  return (Math.atan(Math.abs(-gx * ey + gy * ex) / len) * 180) / Math.PI
}

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]

export function findPath(grid, start, goal, opts) {
  const { maxSlope, slopeWeight, bonus = null, minMult = 1, climb = 0, blocked = null, crossWeight = 0 } = opts
  const grad = crossWeight ? cellGradient(grid) : null
  const { gw, gh, heights, dx, dy, dxRow = null } = grid
  // dxRow (optional): cell width in km per row, so long routes stay accurate away from the equator
  const dxAt = (y) => (dxRow ? dxRow[y] : dx)
  const dxMin = dxRow ? Math.min(...dxRow) : dx
  const N = gw * gh
  const g = new Float32Array(N).fill(Infinity)
  const parent = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)
  const si = start.y * gw + start.x
  const gi = goal.y * gw + goal.x
  const hFn = (x, y) => Math.hypot((x - goal.x) * dxMin, (y - goal.y) * dy) * minMult

  const heap = new MinHeap()
  g[si] = 0
  heap.push(hFn(start.x, start.y), si)

  while (heap.size) {
    const [, i] = heap.pop()
    if (closed[i]) continue
    if (i === gi) break
    closed[i] = 1
    const x = i % gw
    const y = (i / gw) | 0

    for (const [ox, oy] of NB) {
      const nx = x + ox, ny = y + oy
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
      const ni = ny * gw + nx
      if (closed[ni]) continue
      if (blocked && blocked[ni]) continue // keep-out zone
      const d = Math.hypot(ox * dxAt(y), oy * dy)
      const dz = heights[ni] - heights[i]
      const slope = (Math.atan(Math.abs(dz) / d) * 180) / Math.PI
      if (slope > maxSlope) continue
      // traversing a slope (side slope) is harder and riskier than going straight up or down it
      const side = grad ? crossWeight * (crossSlopeDeg(grad.gx[i], grad.gy[i], ox * dxAt(y), oy * dy) / 10) ** 2 : 0
      const mult = (1 + slopeWeight * (slope / 10) ** 2 + side) * (bonus ? bonus[ni] : 1)
      const ng = g[i] + d * mult + climb * Math.max(0, dz)
      if (ng < g[ni]) {
        g[ni] = ng
        parent[ni] = i
        heap.push(ng + hFn(nx, ny), ni)
      }
    }
  }

  if (si !== gi && parent[gi] === -1) return null
  const path = []
  for (let i = gi; i !== -1; i = parent[i]) path.push({ x: i % gw, y: (i / gw) | 0 })
  return path.reverse()
}