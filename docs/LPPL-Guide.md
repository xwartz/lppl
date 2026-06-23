# LPPL / JLS Model Guide

[中文](LPPL-Guide.zh.md)

Reference implementation: Boulder Investment Technologies `lppls` Python package, MIT License. See the [project repository](https://github.com/Boulder-Investment-Technologies/lppls).

## 1. What LPPL Is

LPPL, short for Log-Periodic Power Law, is also known as the JLS model after Johansen, Ledoit, and Sornette. It is used to identify bubble-like market regimes and estimate the time window where a bubble is most likely to break or change state.

The model is based on two ideas:

- Bubble growth can be faster than exponential growth as positive feedback strengthens.
- Price oscillations can become more frequent as the market approaches a critical time.

## 2. Formula

```math
\ln p(t) = A + B(t_c - t)^m + C(t_c - t)^m\cos\big(\omega\ln(t_c - t) + \phi\big)
```

Parameters:

- $t_c$: critical time, or the estimated point where the current bubble regime is most likely to break or change
- $A$: expected log price as $t$ approaches $t_c$
- $B$: power-law trend coefficient; rising bubbles usually use $B < 0$
- $C$: log-periodic oscillation amplitude
- $m$: power-law exponent, usually $0 < m < 1$
- $\omega$: log-periodic frequency, greater than 0
- $\phi$: phase

For a rising bubble, $0 < m < 1$ keeps price finite while allowing the growth rate to accelerate near $t_c$. $B < 0$ makes the power-law trend push log price upward as $t$ approaches $t_c$.

## 3. Stable Fitting Approach

Fitting all 7 parameters with nonlinear least squares is unstable. The Python `lppls` package and this project use a separable least-squares approach:

- Treat $A$, $B$, $C_1$, and $C_2$ as linear parameters.
- Treat $t_c$, $m$, and $\omega$ as nonlinear parameters.
- For a given $t_c$, $m$, and $\omega$, solve the linear regression directly:

```math
\ln p(t) \approx A + Bx^m + C_1x^m\cos(\omega\ln x) + C_2x^m\sin(\omega\ln x)
```

where $x = t_c - t$.

After the linear fit, convert $C_1$ and $C_2$ back to $C$ and $\phi$:

```math
C = \sqrt{C_1^2 + C_2^2}, \quad \phi = \mathrm{atan2}(-C_2, C_1)
```

This reduces the nonlinear search space and makes the fit more stable.

## 4. Constraints and Filters

This project uses common LPPL constraints and filters to reject fits that may be numerically plausible but weak in market meaning:

- $m \in [0.1, 0.9]$
- $\omega \in [6, 13]$
- $t_c$ must be later than the end of the sample
- $B < 0$ by default for rising bubbles
- Oscillation count $O$:

```math
O = \frac{\omega}{2\pi}\ln\frac{t_c - t_{\text{start}}}{t_c - t_{\text{end}}}
```

Default range: $2.5 \le O \le 13$.

- Damping proxy $D$:

```math
D = \frac{m \cdot |B|}{\omega \cdot |C|}
```

Default range: $0.5 \le D \le 1.0$.

These filters do not prove that a market is in a bubble. They only remove fits that do not match the expected LPPL shape.

## 5. Implementation Flow

The main implementation is in `src/lib/lppl.ts`.

1. Normalize timestamps to days and transform prices with natural log.
2. Run deterministic random search over $t_c$, $m$, and $\omega$.
3. For each candidate, solve $A$, $B$, $C_1$, and $C_2$ with ordinary least squares.
4. Apply the configured filters and keep the lowest-RMSE fit.
5. Refine the best candidate with small local perturbations.
6. Run a short Levenberg-Marquardt pass and mark the fit as converged only when that pass stops before `maxIter`.
7. Estimate critical price as $\exp(A)$ and compute a simple Delta-method confidence interval when possible.

Main exports:

- `fitLppl(data, options)`: fits LPPL to one series and returns parameters, fitted points, RMSE, critical date, and predicted critical price.
- `lpplScanConfidence(data, config)`: runs nested-window scans and returns the share of windows that produced finite LPPL fits under the configured search and filters.

## 6. Nested-Window Confidence

The Python package provides `mp_compute_nested_fits` for parallel nested-window scans. This project provides a synchronous TypeScript version, `lpplScanConfidence`.

The scan works as follows:

1. Keep the latest data point fixed as the window end.
2. Move the outer window start across the series.
3. Inside each outer window, test multiple inner windows.
4. Fit LPPL for each inner window.
5. Report `confidence = accepted fits / total fits` for each outer window.

Higher confidence means the bubble-like structure is more stable across window choices. It does not mean the model is certain.

## 7. Match With Python `lppls`

Aligned parts:

- Separable least squares for $A$, $B$, $C_1$, and $C_2$
- Nonlinear search over $t_c$, $m$, and $\omega$
- Default filters for $B < 0$, $O$, and $D$
- Multi-start random search with local refinement
- Nested-window confidence scan

Not implemented:

- Quantile regression variant
- CMA-ES search
- Parallel scan execution

## 8. Code Examples

Single fit:

```ts
import { fitLppl } from "@/lib/lppl"

const result = fitLppl(series, { maxIter: 1000, restarts: 6, tol: 1e-9 })

// result.fitted: fitted price line
// result.criticalDate: estimated critical date
// result.params: { A, B, C, tc, m, omega, phi }
```

Confidence scan:

```ts
import { lpplScanConfidence } from "@/lib/lppl"

const scan = lpplScanConfidence(series, {
  windowSize: 120,
  smallestWindowSize: 30,
  outerIncrement: 1,
  innerIncrement: 5,
  restarts: 4,
  maxIter: 300,
  filters: { BNegative: true, O: [2.5, 13], D: [0.5, 1.0] },
})

// scan.points contains confidence, fits, total, and tc statistics per outer window
```

## 9. Reading Results

- Lower RMSE is better, but only after checking that the fit passes the LPPL filters.
- The critical date is the center of a risk window, not an exact crash date.
- Confidence is stronger when several window lengths produce similar accepted fits.
- A result is more credible when $m$, $\omega$, $O$, and $D$ stay inside their expected ranges.

## 10. FAQ

### Why can a fit be marked as not converged?

The short Levenberg-Marquardt pass only counts as converged when it stops before `maxIter`. If it runs through all iterations, the result may still be usable, but it should be treated with more caution.

### Why can results change?

The project uses deterministic seeds for the same input data. If the data changes, the seed and the resulting fit can change.

### Can this model fit downtrends?

Yes, but the default filters are tuned for rising bubbles. To model negative bubbles, relax or replace the `B < 0` filter.

## 11. References

- Python implementation: <https://github.com/Boulder-Investment-Technologies/lppls>
- Filimonov, V. and Sornette, D. (2013). A Stable and Robust Calibration Scheme of the Log-Periodic Power Law Model. Physica A.
- Sornette, D. (2002). Why Stock Markets Crash: Critical Events in Complex Financial Systems.
- Zhang, Zhang, and Sornette (2016). Early Warning Signals with Multi-Scale Quantile Regressions. PLOS ONE.

## Source Map

- Core fitting: `fitSeparableRandom`, `evaluateSeparable`, and `fitLMWithRestarts` in `src/lib/lppl.ts`
- Filters: `BNegative`, `O`, and `D` logic in `src/lib/lppl.ts`
- Critical price confidence interval: `computePredictedPriceCI`
- Nested-window scan: `lpplScanConfidence`
