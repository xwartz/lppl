# ![LPPL Tracker](https://img.shields.io/badge/BTC-LPPL%20Tracker-orange?style=for-the-badge&logo=bitcoin)

[中文](README.zh.md)

LPPL Tracker is a technical tool for fitting the Log-Periodic Power Law model to crypto, stock, and commodity price series. It helps identify bubble-like price behavior, estimate a critical time window, and compare fit quality across assets.

LPPL stands for **Log-Periodic Power Law**. The model is also known as the **JLS model**, after Johansen, Ledoit, and Sornette.

## What LPPL Models

The LPPL model describes financial bubbles as positive-feedback processes. During a bubble, price may rise faster than an exponential trend while showing oscillations that become more frequent as the market approaches a critical time.

LPPL does not predict an exact crash date. It estimates a high-risk window where the current price regime is more likely to break or change.

## Core Formula

```math
\ln[p(t)] = A + B(t_c-t)^m + C(t_c-t)^m\cos[\omega\ln(t_c-t)+\phi]
```

## Parameters

| Symbol | Meaning | Notes |
| :-- | :-- | :-- |
| $p(t)$ | Asset price at time $t$ | The model fits the natural log of price. |
| $t$ | Current time | Usually normalized to days in this project. |
| $t_c$ | Critical time | Estimated time window where the bubble is most likely to break or change state. |
| $A$ | Expected log price near $t_c$ | The project uses $\exp(A)$ as the predicted critical price. |
| $B$ | Power-law trend coefficient | For a rising bubble, the usual constraint is $B < 0$. |
| $C$ | Oscillation amplitude | Controls how strongly price oscillates around the trend. |
| $m$ | Power-law exponent | Usually constrained to $0 < m < 1$. |
| $\omega$ | Log-periodic frequency | Controls how many oscillations appear before $t_c$. |
| $\phi$ | Phase | Sets the starting phase of the oscillation. |

## How to Read the Result

- **Fit quality**: lower RMSE means the fitted curve is closer to the observed log price, but RMSE alone is not enough.
- **Critical date**: the estimated center of a high-risk window, not a deterministic forecast.
- **Predicted critical price**: derived from $\exp(A)$, with a simple confidence interval when the fit supports it.
- **Confidence**: based on nested-window scans. Higher values mean more windows produced valid LPPL fits under the configured filters.

## Important Limits

- LPPL is a risk signal, not a trading signal.
- The model is sensitive to the selected time window and initial conditions.
- False positives are possible, especially outside clear bubble regimes.
- Historical bubbles often fit LPPL well after the fact. Real-time prediction is harder and should be treated cautiously.

## Documentation

- [LPPL Guide](docs/LPPL-Guide.md)
- [Stock API Setup Guide](docs/API-SETUP.md)
