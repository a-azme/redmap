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

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]

export function findPath(grid, start, goal, opts) {
  const { maxSlope, slopeWeight, bonus = null, minMult = 1 } = opts
  const { gw, gh, heights, dx, dy } = grid
  const N = gw * gh
  const g = new Float32Array(N).fill(Infinity)
  const parent = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)
  const si = start.y * gw + start.x
  const gi = goal.y * gw + goal.x
  const hFn = (x, y) => Math.hypot((x - goal.x) * dx, (y - goal.y) * dy) * minMult

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
      const d = Math.hypot(ox * dx, oy * dy)
      const dz = heights[ni] - heights[i]
      const slope = (Math.atan(Math.abs(dz) / d) * 180) / Math.PI
      if (slope > maxSlope) continue
      const mult = (1 + slopeWeight * (slope / 10) ** 2) * (bonus ? bonus[ni] : 1)
      const ng = g[i] + d * mult
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