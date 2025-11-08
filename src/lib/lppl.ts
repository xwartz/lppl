export interface KlineData {
  time: number
  close: number
}

export interface LPPLParams {
  A: number
  B: number
  C: number
  tc: number
  m: number
  omega: number
  phi: number
}

export interface LPPLResult {
  params: LPPLParams | null
  fitted: number[]
  residual: number
  criticalDate: Date | null
  riskLevel: "low" | "medium" | "high"
  riskReasons?: string[]
  sse?: number
  rmse?: number
  iterations?: number
  converged?: boolean
  runTimeMs?: number
  predictedPrice?: number
  predictedPriceLower?: number | null
  predictedPriceUpper?: number | null
}

// --- LPPL model & LM solver (lightweight port from lppl-p.ts) ---
const EPS = 1e-8

// Separable LPPLS (A, B, C1, C2 are linear for fixed tc, m, omega)
// Our public params keep C, phi; we map C1/C2 -> (C, phi) with:
//   C = sqrt(C1^2 + C2^2), phi = atan2(-C2, C1)

const model = (theta: number[], t: number) => {
  // vector order: [A, B, C, tc, m, omega, phi]
  const [A, B, C, tc, m, omega, phi] = theta
  const dt = tc - t
  if (!Number.isFinite(dt) || dt <= 0) return A
  const dtSafe = Math.max(dt, EPS)
  const pow = Math.pow(dtSafe, m)
  const val = A + B * pow + C * pow * Math.cos(omega * Math.log(dtSafe) + phi)
  return Number.isFinite(val) ? val : A
}

class LPPL {
  t: Float64Array
  y: Float64Array

  constructor(
    time: number[] | Float64Array,
    logPrice: number[] | Float64Array
  ) {
    this.t = Float64Array.from(time)
    this.y = Float64Array.from(logPrice)
    if (this.t.length !== this.y.length)
      throw new Error("time and logPrice must have same length")
  }

  static lpplAtVec(t: Float64Array, v: number[]): Float64Array {
    const out = new Float64Array(t.length)
    const [A, B, C, tc, m, omega, phi] = v
    for (let i = 0; i < t.length; i++) {
      const x = tc - t[i]
      if (x <= 0) {
        out[i] = Number.POSITIVE_INFINITY
        continue
      }
      const xm = Math.pow(x, m)
      out[i] = A + B * xm + C * xm * Math.cos(omega * Math.log(x) + phi)
    }
    return out
  }

  residualsVec(v: number[]): Float64Array {
    const pred = LPPL.lpplAtVec(this.t, v)
    const r = new Float64Array(this.t.length)
    for (let i = 0; i < r.length; i++) {
      const val = pred[i]
      r[i] = isFinite(val) ? val - this.y[i] : 1e9
    }
    return r
  }

  costVec(v: number[]): number {
    const r = this.residualsVec(v)
    let s = 0
    for (let i = 0; i < r.length; i++) s += r[i] * r[i]
    return s / r.length
  }

  jacobian(v: number[], epsFactor = 1e-6): number[][] {
    const n = this.t.length
    const m = v.length
    const J: number[][] = Array.from({ length: n }, () => new Array(m).fill(0))
    for (let j = 0; j < m; j++) {
      const h = Math.max(Math.abs(v[j]) * epsFactor, epsFactor)
      const vp = v.slice()
      const vm = v.slice()
      vp[j] += h
      vm[j] -= h
      const fp = LPPL.lpplAtVec(this.t, vp)
      const fm = LPPL.lpplAtVec(this.t, vm)
      for (let i = 0; i < n; i++) J[i][j] = (fp[i] - fm[i]) / (2 * h)
    }
    return J
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length
    const M: number[][] = A.map((row) => row.slice())
    const rhs = b.slice()

    for (let k = 0; k < n; k++) {
      let maxRow = k
      for (let i = k + 1; i < n; i++)
        if (Math.abs(M[i][k]) > Math.abs(M[maxRow][k])) maxRow = i
      if (maxRow !== k) {
        ;[M[k], M[maxRow]] = [M[maxRow], M[k]]
        ;[rhs[k], rhs[maxRow]] = [rhs[maxRow], rhs[k]]
      }
      const pivot = M[k][k] || 1e-12
      for (let i = k + 1; i < n; i++) {
        const factor = M[i][k] / pivot
        for (let j = k; j < n; j++) M[i][j] -= factor * M[k][j]
        rhs[i] -= factor * rhs[k]
      }
    }

    const x = new Array(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      let s = rhs[i]
      for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]
      x[i] = s / (M[i][i] || 1e-12)
    }
    return x
  }

  // --- Separable least squares helpers (lppls-style) ---
  private buildDesignMatrix(
    tc: number,
    m: number,
    omega: number
  ): { X: number[][]; idx: number[] } {
    const X: number[][] = []
    const idx: number[] = []
    for (let i = 0; i < this.t.length; i++) {
      const dt = tc - this.t[i]
      if (!Number.isFinite(dt) || dt <= 0) continue
      const x = Math.max(dt, EPS)
      const xm = Math.pow(x, m)
      const ln = Math.log(x)
      const cosw = Math.cos(omega * ln)
      const sinw = Math.sin(omega * ln)
      X.push([1, xm, xm * cosw, xm * sinw])
      idx.push(i)
    }
    return { X, idx }
  }

  private solveOLS(X: number[][], y: number[]): number[] | null {
    if (X.length === 0) return null
    const nRows = X.length
    const nCols = X[0].length
    const XtX: number[][] = Array.from({ length: nCols }, () =>
      new Array(nCols).fill(0)
    )
    const Xty: number[] = new Array(nCols).fill(0)
    for (let i = 0; i < nRows; i++) {
      const row = X[i]
      for (let a = 0; a < nCols; a++) {
        Xty[a] += row[a] * y[i]
        for (let b = 0; b < nCols; b++) XtX[a][b] += row[a] * row[b]
      }
    }
    for (let d = 0; d < nCols; d++) XtX[d][d] += 1e-12
    return this.solveLinearSystem(XtX, Xty)
  }

  private evaluateSeparable(
    tc: number,
    m: number,
    omega: number
  ): {
    ok: boolean
    A?: number
    B?: number
    C?: number
    phi?: number
    sse?: number
    O?: number
    D?: number
  } {
    if (!Number.isFinite(tc) || !Number.isFinite(m) || !Number.isFinite(omega))
      return { ok: false }
    const { X, idx } = this.buildDesignMatrix(tc, m, omega)
    if (X.length < 5) return { ok: false }
    const ysub = idx.map((i) => this.y[i])
    const beta = this.solveOLS(X, ysub)
    if (!beta) return { ok: false }
    const [A, B, C1, C2] = beta
    let sse = 0
    for (let r = 0; r < X.length; r++) {
      const yhat = A + B * X[r][1] + C1 * X[r][2] + C2 * X[r][3]
      const e = yhat - ysub[r]
      sse += e * e
    }
    const C = Math.hypot(C1, C2)
    const phi = Math.atan2(-C2, C1)
    if (!Number.isFinite(C) || !Number.isFinite(phi)) return { ok: false }
    // Compute O (number of oscillations over window) and D (damping proxy)
    // O = (omega / (2*pi)) * ln((tc - t1) / (tc - t2)), where t1=min(t), t2=max(t)
    const t1 = Math.min(...this.t)
    const t2 = Math.max(...this.t)
    let O: number | undefined
    if (tc > t2) {
      const num = Math.log(Math.max((tc - t1) / Math.max(tc - t2, EPS), EPS))
      O = (omega / (2 * Math.PI)) * num
    }
    // D proxy per common practice: D = (m * |B|) / (omega * |C|)
    // Only defined when C != 0
    let D: number | undefined
    if (C > 1e-12 && omega > 0) {
      D = (m * Math.abs(B)) / (omega * Math.abs(C))
    }
    return { ok: true, A, B, C, phi, sse, O, D }
  }

  fitSeparableRandom(options?: {
    maxSearches?: number
    bounds?: {
      m?: [number, number]
      omega?: [number, number]
      tc?: [number, number]
    }
    filters?: {
      BNegative?: boolean
      O?: [number, number] // allowed oscillation count range
      D?: [number, number] // allowed damping proxy range
    }
    seed?: number
  }): { params: LPPLParams; cost: number; iterations: number } {
    const lastT = Math.max(...this.t)
    const firstT = Math.min(...this.t)
    const window = Math.max(1, lastT - firstT)
    const defaultBounds = {
      m: [0.1, 0.9] as [number, number],
      omega: [6, 13] as [number, number],
      tc: [lastT + 1e-3, lastT + Math.max(1, window * 1.5)] as [number, number],
    }
    const b = Object.assign({}, defaultBounds, options?.bounds || {})
    const f = Object.assign(
      {
        BNegative: true,
        O: [2.5, 13] as [number, number],
        D: [0.5, 1.0] as [number, number],
      },
      options?.filters || {}
    )
    const maxSearches = Math.max(10, options?.maxSearches ?? 50)

    let best: { params: LPPLParams; cost: number; iterations: number } | null =
      null
    // Deterministic RNG (Park–Miller LCG)
    const rng = (() => {
      const mod = 2147483647
      const mul = 16807
      let seed = Math.floor(
        options?.seed && Number.isFinite(options.seed)
          ? (options.seed as number)
          : 1234567
      )
      if (seed <= 0) seed = 1234567
      return () => {
        seed = (seed * mul) % mod
        return seed / mod
      }
    })()
    let iters = 0

    for (let s = 0; s < maxSearches; s++) {
      const m = b.m![0] + rng() * (b.m![1] - b.m![0])
      const omega = b.omega![0] + rng() * (b.omega![1] - b.omega![0])
      const tc = b.tc![0] + rng() * (b.tc![1] - b.tc![0])
      const evalRes = this.evaluateSeparable(tc, m, omega)
      iters++
      if (!evalRes.ok) continue
      const { A, B, C, phi, sse, O, D } = evalRes
      if (f.BNegative && !(B! < 0)) continue
      if (Number.isFinite(O) && f.O) {
        if (!(O! >= f.O[0] && O! <= f.O[1])) continue
      }
      if (Number.isFinite(D) && f.D) {
        if (!(D! >= f.D[0] && D! <= f.D[1])) continue
      }
      const rmse = Math.sqrt(sse! / this.t.length)
      const candidate: LPPLParams = {
        A: A!,
        B: B!,
        C: C!,
        tc,
        m,
        omega,
        phi: phi!,
      }
      if (!best || rmse < best.cost) {
        best = { params: candidate, cost: rmse, iterations: iters }
      }
    }

    if (best) {
      const { params } = best
      const refineSteps = Math.ceil(maxSearches * 0.5)
      for (let k = 0; k < refineSteps; k++) {
        const m = Math.min(
          b.m![1],
          Math.max(b.m![0], params.m + (rng() - 0.5) * 0.1)
        )
        const omega = Math.min(
          b.omega![1],
          Math.max(b.omega![0], params.omega + (rng() - 0.5) * 1.0)
        )
        const lastT2 = Math.max(...this.t)
        const firstT2 = Math.min(...this.t)
        const window2 = Math.max(1, lastT2 - firstT2)
        const tc = Math.min(
          b.tc![1],
          Math.max(
            b.tc![0],
            params.tc + (rng() - 0.5) * Math.max(1, window2 * 0.1)
          )
        )
        const evalRes = this.evaluateSeparable(tc, m, omega)
        iters++
        if (!evalRes.ok) continue
        const { A, B, C, phi, sse, O, D } = evalRes
        if (f.BNegative && !(B! < 0)) continue
        if (Number.isFinite(O) && f.O) {
          if (!(O! >= f.O[0] && O! <= f.O[1])) continue
        }
        if (Number.isFinite(D) && f.D) {
          if (!(D! >= f.D[0] && D! <= f.D[1])) continue
        }
        const rmse = Math.sqrt(sse! / this.t.length)
        if (rmse < best.cost) {
          best = {
            params: { A: A!, B: B!, C: C!, tc, m, omega, phi: phi! },
            cost: rmse,
            iterations: iters,
          }
        }
      }
    }

    if (best) return best
    return this.fitLM()
  }

  fitLM(options?: {
    initial?: Partial<LPPLParams>
    bounds?: Partial<Record<keyof LPPLParams, [number, number]>>
    maxIter?: number
    lambda0?: number
    tol?: number
  }): { params: LPPLParams; cost: number; iterations: number } {
    const lastT = Math.max(...this.t)
    const firstT = Math.min(...this.t)
    const meanY = this.y.reduce((a, b) => a + b, 0) / this.y.length

    const opts = Object.assign(
      { maxIter: 200, lambda0: 1e-3, tol: 1e-9 },
      options || {}
    )

    const initial: LPPLParams = Object.assign(
      {
        A: meanY,
        B: -1.0,
        C: 0.1,
        tc: lastT + (lastT - firstT) * 0.5,
        m: 0.5,
        omega: 8.0,
        phi: 0.0,
      },
      opts.initial || {}
    )

    const toVec = (p: LPPLParams): number[] => [
      p.A,
      p.B,
      p.C,
      p.tc,
      p.m,
      p.omega,
      p.phi,
    ]
    const fromVec = (v: number[]): LPPLParams => ({
      A: v[0],
      B: v[1],
      C: v[2],
      tc: v[3],
      m: v[4],
      omega: v[5],
      phi: v[6],
    })

    let v = toVec(initial)
    let lambda = opts.lambda0!
    let prevCost = this.costVec(v)

    for (let iter = 0; iter < opts.maxIter!; iter++) {
      const r = this.residualsVec(v)
      const J = this.jacobian(v)

      const nParams = v.length
      const JTJ: number[][] = Array.from({ length: nParams }, () =>
        new Array(nParams).fill(0)
      )
      const JTr: number[] = new Array(nParams).fill(0)

      for (let i = 0; i < this.t.length; i++) {
        for (let a = 0; a < nParams; a++) {
          const Ji_a = J[i][a]
          JTr[a] += Ji_a * r[i]
          for (let b = 0; b < nParams; b++) JTJ[a][b] += Ji_a * J[i][b]
        }
      }

      for (let i = 0; i < nParams; i++) JTJ[i][i] *= 1 + lambda

      const b = JTr.map((v) => -v)
      const dx = this.solveLinearSystem(JTJ, b)
      const vNew = v.map((val, idx) => val + dx[idx])
      const newCost = this.costVec(vNew)

      if (!isFinite(newCost) || newCost > prevCost) lambda *= 10
      else {
        v = vNew
        prevCost = newCost
        lambda /= 10
      }

      const maxDx = Math.max(...dx.map(Math.abs))
      if (maxDx < opts.tol!)
        return {
          params: fromVec(v),
          cost: Math.sqrt(prevCost),
          iterations: iter + 1,
        }
    }

    return {
      params: fromVec(v),
      cost: Math.sqrt(prevCost),
      iterations: opts.maxIter!,
    }
  }

  fitLMWithRestarts(options?: {
    restarts?: number
    initial?: Partial<LPPLParams>
    bounds?: Partial<Record<keyof LPPLParams, [number, number]>>
    maxIter?: number
    tol?: number
    bootstrap?: number
    seed?: number
    filters?: {
      BNegative?: boolean
      O?: [number, number]
      D?: [number, number]
    }
  }): {
    params: LPPLParams
    cost: number
    iterations: number
    ci: Record<keyof LPPLParams, [number, number]>
    sse?: number
    converged: boolean
  } {
    const restarts = options?.restarts ?? 5
    let best: { params: LPPLParams; cost: number; iterations: number } | null =
      null

    for (let r = 0; r < restarts; r++) {
      const lastT = Math.max(...this.t)
      const firstT = Math.min(...this.t)
      const res = this.fitSeparableRandom({
        maxSearches: Math.max(25, Math.floor((options?.maxIter ?? 200) / 4)),
        bounds: {
          m: [0.1, 0.9],
          omega: [6, 13],
          tc: [
            lastT + 1e-3,
            lastT +
              Math.max(
                1,
                (lastT - firstT) *
                  (0.8 + (((options?.seed ?? 0) + r + 1) % 997) / 997)
              ),
          ],
        },
        seed: (options?.seed ?? 0) + r + 1,
        filters: options?.filters ?? {
          BNegative: true,
          O: [2.5, 13],
          D: [0.5, 1.0],
        },
      })
      if (!best || res.cost < best.cost) best = res
    }

    // Optional small LM refinement to compute convergence properly
    let finalParams = best!.params
    let finalCost = best!.cost
    let finalIterations = best!.iterations
    const maxIterUsed = options?.maxIter ?? 200
    let converged = false
    try {
      const lmRes = this.fitLM({
        initial: finalParams,
        bounds: options?.bounds,
        maxIter: maxIterUsed,
        tol: options?.tol,
      })
      if (Number.isFinite(lmRes.cost) && lmRes.cost <= finalCost) {
        finalParams = lmRes.params
        finalCost = lmRes.cost
        finalIterations = lmRes.iterations
        converged = lmRes.iterations < maxIterUsed
      }
    } catch {
      // ignore and keep separable result; converged stays false
    }

    // bootstrap (optional)
    const bootstrapN = options?.bootstrap ?? 0
    const bootParams: LPPLParams[] = []
    if (bootstrapN > 0) {
      const n = this.t.length
      for (let b = 0; b < bootstrapN; b++) {
        const indices = Float64Array.from({ length: n }, () =>
          Math.floor(Math.random() * n)
        )
        const tSample = Float64Array.from(indices, (i) => this.t[i])
        const ySample = Float64Array.from(indices, (i) => this.y[i])
        const sub = new LPPL(tSample, ySample)
        const subRes = sub.fitLM({
          initial: finalParams,
          bounds: options?.bounds,
          maxIter: options?.maxIter,
        })
        bootParams.push(subRes.params)
      }
    }

    const ci: Record<keyof LPPLParams, [number, number]> = {
      A: [finalParams.A, finalParams.A],
      B: [finalParams.B, finalParams.B],
      C: [finalParams.C, finalParams.C],
      tc: [finalParams.tc, finalParams.tc],
      m: [finalParams.m, finalParams.m],
      omega: [finalParams.omega, finalParams.omega],
      phi: [finalParams.phi, finalParams.phi],
    }

    if (bootParams.length > 1) {
      const keys = Object.keys(ci) as (keyof LPPLParams)[]
      for (const k of keys) {
        const vals = bootParams.map((p) => p[k]).sort((a, b) => a - b)
        const lowIdx = Math.floor(0.025 * vals.length)
        const highIdx = Math.floor(0.975 * vals.length)
        ci[k] = [vals[lowIdx], vals[highIdx]]
      }
    }

    return {
      params: finalParams,
      cost: finalCost,
      iterations: finalIterations,
      ci,
      sse: undefined,
      converged,
    }
  }
}

// --- CI helpers (reused/adapted from previous implementation) ---
const transpose = (M: number[][]) => M[0].map((_, i) => M.map((row) => row[i]))
const matMul = (A: number[][], B: number[][]) => {
  const n = A.length,
    m = B[0].length,
    k = B.length
  const C = Array.from({ length: n }, () => Array(m).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      for (let t = 0; t < k; t++) C[i][j] += A[i][t] * B[t][j]
  return C
}
const addRidge = (M: number[][], lambda: number) => {
  const R = M.map((row) => row.slice())
  for (let i = 0; i < R.length; i++) R[i][i] += lambda
  return R
}
const invertMatrix = (M: number[][]) => {
  const n = M.length
  const A = M.map((row) => row.slice())
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )
  for (let i = 0; i < n; i++) {
    let pivot = A[i][i]
    let pivotRow = i
    if (Math.abs(pivot) < 1e-12) {
      for (let r = i + 1; r < n; r++)
        if (Math.abs(A[r][i]) > Math.abs(pivot)) {
          pivot = A[r][i]
          pivotRow = r
        }
      if (pivotRow !== i) {
        const tmpA = A[i]
        A[i] = A[pivotRow]
        A[pivotRow] = tmpA
        const tmpI = I[i]
        I[i] = I[pivotRow]
        I[pivotRow] = tmpI
      }
    }
    pivot = A[i][i]
    if (Math.abs(pivot) < 1e-15) return null
    const invPivot = 1 / pivot
    for (let j = 0; j < n; j++) {
      A[i][j] *= invPivot
      I[i][j] *= invPivot
    }
    for (let r = 0; r < n; r++)
      if (r !== i) {
        const factor = A[r][i]
        for (let c = 0; c < n; c++) {
          A[r][c] -= factor * A[i][c]
          I[r][c] -= factor * I[i][c]
        }
      }
  }
  return I
}

const computePredictedPriceCI = (
  opt: number[],
  times: number[],
  logPrices: number[],
  fittedLog: number[],
  sseVal: number,
  optParams: LPPLParams
) => {
  const p = opt.length
  const indices: number[] = []
  for (let i = 0; i < times.length; i++)
    if (Number.isFinite(logPrices[i]) && Number.isFinite(fittedLog[i]))
      indices.push(i)
  const sigma2 = sseVal / Math.max(1, indices.length - p)
  const theta = opt.slice()
  const epsFor = (v: number) => Math.max(1e-6, Math.abs(v) * 1e-6)
  const J: number[][] = []
  for (const idx of indices) {
    const t = times[idx]
    const row: number[] = []
    for (let j = 0; j < p; j++) {
      const h = epsFor(theta[j])
      const thetaPlus = theta.slice()
      thetaPlus[j] = thetaPlus[j] + h
      const yPlus = model(thetaPlus, t)
      const y0 = fittedLog[idx]
      row.push((yPlus - y0) / h)
    }
    J.push(row)
  }
  const JT = transpose(J)
  const JTJ = matMul(JT, J)
  const trace = JTJ.reduce((s, r, i) => s + (r[i] || 0), 0)
  const lambda = Math.max(1e-12, trace * 1e-8)
  const JTJreg = addRidge(JTJ, lambda)
  const invJTJ = invertMatrix(JTJreg)
  if (!invJTJ) return { lower: null, upper: null }
  const cov = invJTJ.map((row) => row.map((v) => v * sigma2))
  const tc = optParams.tc
  const g: number[] = []
  for (let j = 0; j < p; j++) {
    const h = epsFor(theta[j])
    const thetaPlus = theta.slice()
    thetaPlus[j] = thetaPlus[j] + h
    const yPlus = model(thetaPlus, tc)
    const y0 = model(theta, tc)
    g.push((yPlus - y0) / h)
  }
  let varY = 0
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++) varY += g[i] * cov[i][j] * g[j]
  if (!Number.isFinite(varY) || varY < 0) return { lower: null, upper: null }
  const yhatTc = model(theta, tc)
  const z = 1.96
  const se = Math.sqrt(varY)
  return { lower: Math.exp(yhatTc - z * se), upper: Math.exp(yhatTc + z * se) }
}

// --- Public fit function (replaces earlier nelder-mead variant) ---
export const fitLppl = (
  data: KlineData[],
  options?: { maxIter?: number; restarts?: number; tol?: number }
): LPPLResult => {
  if (!data || data.length < 10) {
    return {
      params: null,
      fitted: [],
      residual: NaN,
      criticalDate: null,
      riskLevel: "low",
    }
  }

  const times = data.map((d) => d.time / 1000)
  const prices = data.map((d) => d.close)
  const t0 = times[0]
  const normalizedTimes = times.map((t) => (t - t0) / 86400)
  const lastTime = normalizedTimes[normalizedTimes.length - 1]
  const logPrices = prices.map((p) => Math.log(p))

  const maxPrice = Math.max(...prices)
  const lastPrice = prices[prices.length - 1]
  const initHeuristicA = Number.isFinite(maxPrice * 1.1)
    ? Math.log(maxPrice * 1.1)
    : Math.log(Math.max(1, lastPrice * 1.05))
  // vector order: [A, B, C, tc, m, omega, phi]
  const x0 = [initHeuristicA, -0.01, 0.005, lastTime + 30, 0.5, 6.0, 0.0]

  const modelStart = Date.now()
  const lp = new LPPL(normalizedTimes, logPrices)
  // Deterministic seed from data
  let seed = 1234567
  for (let i = 0; i < normalizedTimes.length; i++) {
    const a = Math.floor(normalizedTimes[i] * 1e6)
    const b = Math.floor(logPrices[i] * 1e6)
    seed = (seed * 31 + ((a ^ b) & 0xffffffff)) >>> 0
  }
  if (seed <= 0) seed = 1234567
  const res = lp.fitLMWithRestarts({
    restarts: options?.restarts ?? 6,
    initial: {
      A: x0[0],
      B: x0[1],
      C: x0[2],
      tc: x0[3],
      m: x0[4],
      omega: x0[5],
      phi: x0[6],
    },
    maxIter: options?.maxIter ?? 1000,
    tol: options?.tol,
    seed,
  })
  const modelEnd = Date.now()

  const optParams = res.params
  const optVec = [
    optParams.A,
    optParams.B,
    optParams.C,
    optParams.tc,
    optParams.m,
    optParams.omega,
    optParams.phi,
  ]
  const fittedLog = normalizedTimes.map((t) => model(optVec, t))
  const fitted = fittedLog.map((v) => (Number.isFinite(v) ? Math.exp(v) : NaN))

  const paired = logPrices
    .map((p, i) => ({ p, f: fittedLog[i] }))
    .filter((x) => Number.isFinite(x.p) && Number.isFinite(x.f))
  const residuals = paired.map((pair) => Math.pow(pair.p - pair.f, 2))
  const sseVal = res.sse ?? residuals.reduce((a, b) => a + b, 0)
  const rmse = Math.sqrt(sseVal / Math.max(1, residuals.length))

  const criticalTimestamp = (optParams.tc * 86400 + t0) * 1000
  const criticalDate = new Date(
    Number.isFinite(criticalTimestamp) ? criticalTimestamp : Date.now()
  )

  const lookback = Math.min(10, prices.length - 1)
  const prevIndex = Math.max(0, prices.length - 1 - lookback)
  const prevPrice = prices[prevIndex]
  const denom = prevPrice && prevPrice > 0 ? prevPrice : null
  const priceAcceleration = denom ? (lastPrice - prevPrice) / prevPrice : 0
  const daysUntilCritical = Number.isFinite(criticalTimestamp)
    ? (criticalTimestamp - Date.now()) / (1000 * 86400)
    : Infinity

  let riskLevel: "low" | "medium" | "high" = "low"
  const riskReasons: string[] = []
  if (
    !Number.isFinite(rmse) ||
    rmse > Math.max(1e-3, Math.abs(lastPrice) * 0.5)
  ) {
    riskLevel = "low"
    riskReasons.push("拟合不可靠（残差过大或数值异常）")
  } else {
    if (daysUntilCritical < 0) riskReasons.push("预测临界日已过")
    else if (daysUntilCritical < 30) riskReasons.push("预测临界日临近 (<30 天)")
    else if (daysUntilCritical < 60) riskReasons.push("预测临界日在 60 天内")
    if (priceAcceleration > 0.1) riskReasons.push("近期价格快速上涨 (>10%)")
    else if (priceAcceleration > 0.05) riskReasons.push("近期价格上涨 (>5%)")

    if (
      daysUntilCritical > 0 &&
      daysUntilCritical < 30 &&
      priceAcceleration > 0.1
    )
      riskLevel = "high"
    else if (
      (daysUntilCritical > 0 && daysUntilCritical < 60) ||
      priceAcceleration > 0.05
    )
      riskLevel = "medium"
    else riskLevel = "low"
  }

  const predictedPrice = Number.isFinite(optParams.A)
    ? Math.exp(optParams.A)
    : NaN
  const ci = computePredictedPriceCI(
    optVec,
    normalizedTimes,
    logPrices,
    fittedLog,
    sseVal,
    optParams
  )

  return {
    params: optParams,
    fitted,
    residual: rmse,
    criticalDate,
    riskLevel,
    riskReasons,
    sse: sseVal,
    rmse,
    iterations: res.iterations,
    converged: res.converged,
    runTimeMs: modelEnd - modelStart,
    predictedPrice,
    predictedPriceLower: ci.lower,
    predictedPriceUpper: ci.upper,
  }
}

// -------- Nested window scan & confidence indicators --------
export interface LPPLScanConfig {
  windowSize: number // number of points in the outer window
  smallestWindowSize: number // minimal inner window size (points)
  outerIncrement: number // step in points for outer start
  innerIncrement: number // step in points for inner start
  maxIter?: number
  restarts?: number
  maxSearches?: number
  tol?: number
  seed?: number
  bounds?: {
    m?: [number, number]
    omega?: [number, number]
    tc?: [number, number]
  }
  filters?: {
    BNegative?: boolean
    O?: [number, number]
    D?: [number, number]
  }
}

export interface LPPLConfidencePoint {
  startIndex: number
  endIndex: number
  tStart: number // normalized time
  tEnd: number // normalized time
  confidence: number // accepted / total
  fits: number
  total: number
  tcMedian?: number // normalized tc median of accepted fits
  tc25?: number
  tc75?: number
}

export interface LPPLConfidenceResult {
  points: LPPLConfidencePoint[]
}

export const lpplScanConfidence = (
  data: KlineData[],
  cfg: LPPLScanConfig
): LPPLConfidenceResult => {
  if (!data || data.length < Math.max(10, cfg.smallestWindowSize)) {
    return { points: [] }
  }
  const times = data.map((d) => d.time / 1000)
  const prices = data.map((d) => d.close)
  const t0 = times[0]
  const normalizedTimes = times.map((t) => (t - t0) / 86400)
  const logPrices = prices.map((p) => Math.log(p))
  const n = normalizedTimes.length
  const endIndex = n - 1

  const windowSize = Math.min(Math.max(5, cfg.windowSize), n)
  const smallest = Math.min(
    Math.max(5, cfg.smallestWindowSize),
    Math.max(5, windowSize - 1)
  )
  const outerInc = Math.max(1, cfg.outerIncrement)
  const innerInc = Math.max(1, cfg.innerIncrement)

  // Deterministic seed from data baseline
  let baseSeed = 1234567
  for (let i = 0; i < normalizedTimes.length; i++) {
    const a = Math.floor(normalizedTimes[i] * 1e6)
    const b = Math.floor(logPrices[i] * 1e6)
    baseSeed = (baseSeed * 31 + ((a ^ b) & 0xffffffff)) >>> 0
  }
  if (baseSeed <= 0) baseSeed = 1234567

  const points: LPPLConfidencePoint[] = []

  // Outer window slides backward with fixed end at latest point
  const outerMaxStart = Math.max(0, endIndex - windowSize + 1)
  for (
    let start = outerMaxStart;
    start <= endIndex - smallest;
    start += outerInc
  ) {
    const outerStart = start
    const outerEnd = endIndex
    let fits = 0
    let total = 0
    const acceptedTc: number[] = []

    // Inner windows: start moves forward within outer, end fixed at latest
    for (
      let innerStart = outerStart;
      innerStart <= outerEnd - smallest + 1;
      innerStart += innerInc
    ) {
      const sliceT = normalizedTimes.slice(innerStart, outerEnd + 1)
      const sliceY = logPrices.slice(innerStart, outerEnd + 1)
      if (sliceT.length < smallest) continue

      const lp = new LPPL(sliceT, sliceY)
      // seed per window to keep determinism and diversity
      const seed = baseSeed + innerStart * 17 + outerStart * 131
      const res = lp.fitLMWithRestarts({
        restarts: cfg.restarts ?? 4,
        maxIter: cfg.maxIter ?? 300,
        tol: cfg.tol ?? 1e-9,
        seed,
        filters: cfg.filters ?? {
          BNegative: true,
          O: [2.5, 13],
          D: [0.5, 1.0],
        },
      })
      total += 1
      // Accept any finite cost result (filters applied inside separable search)
      if (Number.isFinite(res.cost)) {
        fits += 1
        if (Number.isFinite(res.params.tc)) acceptedTc.push(res.params.tc)
      }
    }

    let confidence = 0
    if (total > 0) confidence = fits / total
    acceptedTc.sort((a, b) => a - b)
    const q = (arr: number[], p: number) => {
      if (arr.length === 0) return undefined
      const idx = Math.floor((arr.length - 1) * p)
      return arr[idx]
    }
    const tc25 = q(acceptedTc, 0.25)
    const tcMedian = q(acceptedTc, 0.5)
    const tc75 = q(acceptedTc, 0.75)

    points.push({
      startIndex: outerStart,
      endIndex: outerEnd,
      tStart: normalizedTimes[outerStart],
      tEnd: normalizedTimes[outerEnd],
      confidence,
      fits,
      total,
      tcMedian,
      tc25,
      tc75,
    })
  }

  return { points }
}
