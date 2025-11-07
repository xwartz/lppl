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
      const perturb = (scale: number) => (Math.random() - 0.5) * scale
      const lastT = Math.max(...this.t)
      const firstT = Math.min(...this.t)

      const init: Partial<LPPLParams> = options?.initial ?? {
        A:
          (this.y.reduce((a, b) => a + b, 0) / this.y.length) *
          (1 + perturb(0.2)),
        B: -1 * (1 + perturb(1.0)),
        C: 0.1 * (1 + perturb(1.0)),
        m: 0.5 * (1 + perturb(0.5)),
        omega: 8 * (1 + perturb(0.5)),
        phi: perturb(Math.PI),
        tc: lastT + (lastT - firstT) * (0.2 + Math.random() * 1.5),
      }

      const res = this.fitLM({
        initial: init,
        bounds: options?.bounds,
        maxIter: options?.maxIter,
        tol: options?.tol,
      })
      if (!best || res.cost < best.cost) best = res
    }

    // bootstrap (optional)
    const bootstrapN = options?.bootstrap ?? 0
    const bootParams: LPPLParams[] = []
    if (bootstrapN > 0 && best) {
      const n = this.t.length
      for (let b = 0; b < bootstrapN; b++) {
        const indices = Float64Array.from({ length: n }, () =>
          Math.floor(Math.random() * n)
        )
        const tSample = Float64Array.from(indices, (i) => this.t[i])
        const ySample = Float64Array.from(indices, (i) => this.y[i])
        const sub = new LPPL(tSample, ySample)
        const subRes = sub.fitLM({
          initial: best.params,
          bounds: options?.bounds,
          maxIter: options?.maxIter,
        })
        bootParams.push(subRes.params)
      }
    }

    const ci: Record<keyof LPPLParams, [number, number]> = {
      A: [best!.params.A, best!.params.A],
      B: [best!.params.B, best!.params.B],
      C: [best!.params.C, best!.params.C],
      tc: [best!.params.tc, best!.params.tc],
      m: [best!.params.m, best!.params.m],
      omega: [best!.params.omega, best!.params.omega],
      phi: [best!.params.phi, best!.params.phi],
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

    const maxIterUsed = options?.maxIter ?? 200
    const converged = best ? best.iterations < maxIterUsed : false
    return {
      params: best!.params,
      cost: best!.cost,
      iterations: best!.iterations,
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
    if (daysUntilCritical < 30) riskReasons.push("预测临界日临近 (<30 天)")
    else if (daysUntilCritical < 60) riskReasons.push("预测临界日在 30–60 天内")
    if (priceAcceleration > 0.1) riskReasons.push("近期价格快速上涨 (>10%)")
    else if (priceAcceleration > 0.05) riskReasons.push("近期价格上涨 (>5%)")

    if (daysUntilCritical < 30 && priceAcceleration > 0.1) riskLevel = "high"
    else if (daysUntilCritical < 60 || priceAcceleration > 0.05)
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
