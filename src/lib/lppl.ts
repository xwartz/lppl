// Lightweight LPPL fitting utilities extracted from component to keep UI lean.
// Exports a single fitLppl function which runs Nelder-Mead on log-prices and
// returns an object with parameters, fitted curve (price-space), diagnostics and CI.

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
  riskLevel: 'low' | 'medium' | 'high'
  sse?: number
  rmse?: number
  iterations?: number
  converged?: boolean
  runTimeMs?: number
  predictedPrice?: number
  predictedPriceLower?: number | null
  predictedPriceUpper?: number | null
}

// Fit configuration and helpers
const EPS = 1e-8

const model = (theta: number[], t: number) => {
  const [A, B, C, tc, m, omega, phi] = theta
  const dt = tc - t
  if (!Number.isFinite(dt) || dt <= 0) return A
  const dtSafe = Math.max(dt, EPS)
  const pow = Math.pow(dtSafe, m)
  const val = A + B * pow + C * pow * Math.cos(omega * Math.log(dtSafe) + phi)
  return Number.isFinite(val) ? val : A
}

const sseObjective = (theta: number[], times: number[], logPrices: number[], lastTime: number) => {
  const [A, B, C, tc, m, omega, phi] = theta
  if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(C) || !Number.isFinite(tc) || !Number.isFinite(m) || !Number.isFinite(omega) || !Number.isFinite(phi)) return 1e30
  if (m <= 0 || m >= 2) return 1e25
  if (tc <= lastTime + 0.5) return 1e25
  if (omega <= 0 || omega > 50) return 1e25
  let sum = 0
  for (let i = 0; i < times.length; i++) {
    const t = times[i]
    const y = logPrices[i]
    if (!Number.isFinite(y)) continue
    const yhat = model(theta, t)
    if (!Number.isFinite(yhat)) return 1e26
    const diff = y - yhat
    sum += diff * diff
  }
  return sum
}

// Simple Nelder-Mead (kept small and synchronous)
const nelderMead = (f: (x: number[]) => number, xStart: number[], opts?: { maxIter?: number, tol?: number }) => {
  const n = xStart.length
  const maxIter = opts?.maxIter ?? 300
  const tol = opts?.tol ?? 1e-6
  const alpha = 1, gamma = 2, rho = 0.5, sigma = 0.5
  const simplex: number[][] = [xStart.slice()]
  for (let i = 0; i < n; i++) {
    const xi = xStart.slice()
    xi[i] = xi[i] !== 0 ? xi[i] * (1 + 0.05) : 1e-4
    simplex.push(xi)
  }
  const values = simplex.map(p => f(p))
  let iter = 0, converged = false
  for (; iter < maxIter; iter++) {
    const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v).map(o => o.i)
    const s = idx.map(i => simplex[i])
    const fv = idx.map(i => values[i])
    const best = s[0]
    const worst = s[n]
    const centroid = new Array(n).fill(0)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += s[i][j]
    for (let j = 0; j < n; j++) centroid[j] /= n
    const xr = centroid.map((c, j) => c + alpha * (c - worst[j]))
    const fr = f(xr)
    if (fr < fv[0]) {
      const xe = centroid.map((c, j) => c + gamma * (xr[j] - c))
      const fe = f(xe)
      if (fe < fr) { s[n] = xe; fv[n] = fe } else { s[n] = xr; fv[n] = fr }
    } else if (fr < fv[n - 1]) {
      s[n] = xr; fv[n] = fr
    } else {
      const xc = centroid.map((c, j) => c + rho * (worst[j] - c))
      const fc = f(xc)
      if (fc < fv[n]) { s[n] = xc; fv[n] = fc } else {
        for (let i = 1; i < s.length; i++) for (let j = 0; j < n; j++) s[i][j] = best[j] + sigma * (s[i][j] - best[j])
        for (let i = 1; i < s.length; i++) fv[i] = f(s[i])
      }
    }
    for (let k = 0; k < s.length; k++) { simplex[k] = s[k]; values[k] = fv[k] }
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length)
    if (sd < tol) { converged = true; break }
  }
  let bestIndex = 0, bestVal = values[0]
  for (let i = 1; i < values.length; i++) if (values[i] < bestVal) { bestVal = values[i]; bestIndex = i }
  return { solution: simplex[bestIndex], value: bestVal, iterations: iter + 1, converged }
}

// Small linear algebra helpers for CI
const transpose = (M: number[][]) => M[0].map((_, i) => M.map(row => row[i]))
const matMul = (A: number[][], B: number[][]) => {
  const n = A.length, m = B[0].length, k = B.length
  const C = Array.from({ length: n }, () => Array(m).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) for (let t = 0; t < k; t++) C[i][j] += A[i][t] * B[t][j]
  return C
}
const addRidge = (M: number[][], lambda: number) => {
  const R = M.map(row => row.slice())
  for (let i = 0; i < R.length; i++) R[i][i] += lambda
  return R
}
const invertMatrix = (M: number[][]) => {
  const n = M.length
  const A = M.map(row => row.slice())
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let i = 0; i < n; i++) {
    let pivot = A[i][i]
    let pivotRow = i
    if (Math.abs(pivot) < 1e-12) {
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(pivot)) { pivot = A[r][i]; pivotRow = r }
      if (pivotRow !== i) { const tmpA = A[i]; A[i] = A[pivotRow]; A[pivotRow] = tmpA; const tmpI = I[i]; I[i] = I[pivotRow]; I[pivotRow] = tmpI }
    }
    pivot = A[i][i]
    if (Math.abs(pivot) < 1e-15) return null
    const invPivot = 1 / pivot
    for (let j = 0; j < n; j++) { A[i][j] *= invPivot; I[i][j] *= invPivot }
    for (let r = 0; r < n; r++) if (r !== i) {
      const factor = A[r][i]
      for (let c = 0; c < n; c++) { A[r][c] -= factor * A[i][c]; I[r][c] -= factor * I[i][c] }
    }
  }
  return I
}

// Estimate CI for predicted price at tc using finite-difference Jacobian + delta method
const computePredictedPriceCI = (opt: number[], times: number[], logPrices: number[], fittedLog: number[], sseVal: number, optParams: LPPLParams) => {
  const p = opt.length
  const indices: number[] = []
  for (let i = 0; i < times.length; i++) if (Number.isFinite(logPrices[i]) && Number.isFinite(fittedLog[i])) indices.push(i)
  const sigma2 = sseVal / Math.max(1, indices.length - p)
  const theta = opt.slice()
  const epsFor = (v: number) => Math.max(1e-6, Math.abs(v) * 1e-6)
  const J: number[][] = []
  for (const idx of indices) {
    const t = times[idx]
    const row: number[] = []
    for (let j = 0; j < p; j++) {
      const h = epsFor(theta[j])
      const thetaPlus = theta.slice(); thetaPlus[j] = thetaPlus[j] + h
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
  const cov = invJTJ.map(row => row.map(v => v * sigma2))
  const tc = optParams.tc
  const g: number[] = []
  for (let j = 0; j < p; j++) {
    const h = epsFor(theta[j])
    const thetaPlus = theta.slice(); thetaPlus[j] = thetaPlus[j] + h
    const yPlus = model(thetaPlus, tc)
    const y0 = model(theta, tc)
    g.push((yPlus - y0) / h)
  }
  let varY = 0
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) varY += g[i] * cov[i][j] * g[j]
  if (!Number.isFinite(varY) || varY < 0) return { lower: null, upper: null }
  const yhatTc = model(theta, tc)
  const z = 1.96
  const se = Math.sqrt(varY)
  return { lower: Math.exp(yhatTc - z * se), upper: Math.exp(yhatTc + z * se) }
}

export const fitLppl = (data: KlineData[]) : LPPLResult => {
  if (!data || data.length < 10) {
    return { params: null, fitted: [], residual: NaN, criticalDate: null, riskLevel: 'low' }
  }
  const times = data.map(d => d.time / 1000)
  const prices = data.map(d => d.close)
  const t0 = times[0]
  const normalizedTimes = times.map(t => (t - t0) / 86400)
  const maxPrice = Math.max(...prices)
  const lastPrice = prices[prices.length - 1]
  const lastTime = normalizedTimes[normalizedTimes.length - 1]
  const logPrices = prices.map(p => Math.log(p))
  const initHeuristicA = Number.isFinite(maxPrice * 1.1) ? Math.log(maxPrice * 1.1) : Math.log(Math.max(1, lastPrice * 1.05))
  const x0 = [initHeuristicA, -0.01, 0.005, lastTime + 30, 0.5, 6.0, 0.0]
  const tStart = Date.now()
  const result = nelderMead((x) => sseObjective(x, normalizedTimes, logPrices, lastTime), x0, { maxIter: 400, tol: 1e-8 })
  const tEnd = Date.now()
  const opt = result.solution
  const optParams: LPPLParams = { A: opt[0], B: opt[1], C: opt[2], tc: opt[3], m: opt[4], omega: opt[5], phi: opt[6] }
  const fittedLog = normalizedTimes.map(t => model(opt, t))
  const fitted = fittedLog.map(v => Number.isFinite(v) ? Math.exp(v) : NaN)
  const paired = logPrices.map((p, i) => ({ p, f: fittedLog[i] })).filter(x => Number.isFinite(x.p) && Number.isFinite(x.f))
  const residuals = paired.map(pair => Math.pow(pair.p - pair.f, 2))
  const sseVal = result.value ?? residuals.reduce((a, b) => a + b, 0)
  const rmse = Math.sqrt(sseVal / Math.max(1, residuals.length))
  const residual = rmse
  const criticalTimestamp = (optParams.tc * 86400 + t0) * 1000
  const criticalDate = new Date(Number.isFinite(criticalTimestamp) ? criticalTimestamp : Date.now())
  const lookback = Math.min(10, prices.length - 1)
  const prevIndex = Math.max(0, prices.length - 1 - lookback)
  const prevPrice = prices[prevIndex]
  const denom = prevPrice && prevPrice > 0 ? prevPrice : null
  const priceAcceleration = denom ? (lastPrice - prevPrice) / prevPrice : 0
  const daysUntilCritical = Number.isFinite(criticalTimestamp) ? (criticalTimestamp - Date.now()) / (1000 * 86400) : Infinity
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (!Number.isFinite(residual) || residual > Math.max(1e-3, Math.abs(lastPrice) * 0.5)) {
    riskLevel = 'low'
  } else {
    if (daysUntilCritical < 30 && priceAcceleration > 0.1) riskLevel = 'high'
    else if (daysUntilCritical < 60 || priceAcceleration > 0.05) riskLevel = 'medium'
  }
  const predictedPrice = Number.isFinite(optParams.A) ? Math.exp(optParams.A) : NaN
  const ci = computePredictedPriceCI(opt, normalizedTimes, logPrices, fittedLog, sseVal, optParams)
  return {
    params: optParams,
    fitted,
    residual,
    criticalDate,
    riskLevel,
    sse: sseVal,
    rmse,
    iterations: result.iterations,
    converged: result.converged,
    runTimeMs: tEnd - tStart,
    predictedPrice,
    predictedPriceLower: ci.lower,
    predictedPriceUpper: ci.upper
  }
}
