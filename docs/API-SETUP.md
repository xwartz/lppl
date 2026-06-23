# Stock API Setup Guide

[中文](API-SETUP.zh.md)

This project fetches stock and commodity history through `api/stock/historical.ts`. The browser should call this server endpoint instead of calling market data providers directly.

## Why This Exists

Yahoo Finance can hit rate limits on Vercel because serverless deployments may share outbound IP addresses. The API proxy keeps the browser code simple and lets the server fall back to other providers when Yahoo Finance fails.

## Data Source Order

1. **Yahoo Finance** via `yahoo-finance2`
2. **Twelve Data** when `TWELVE_DATA_API_KEY` is configured
3. **Alpha Vantage** using `ALPHA_VANTAGE_API_KEY`, or the Alpha Vantage `demo` key when the variable is missing

Twelve Data is tried before Alpha Vantage because its free quota is higher.

## Environment Variables

### Recommended: Twelve Data

Twelve Data provides a larger free quota than Alpha Vantage.

1. Create an account: <https://twelvedata.com/pricing>
2. Get a free API key.
3. Add this variable in Vercel:

```bash
TWELVE_DATA_API_KEY=your_key_here
```

### Optional: Alpha Vantage

Alpha Vantage is the last fallback. The free quota is small, so it is best used as a backup.

1. Get a free API key: <https://www.alphavantage.co/support/#api-key>
2. Add this variable in Vercel:

```bash
ALPHA_VANTAGE_API_KEY=your_key_here
```

## Request Parameters

`GET /api/stock/historical`

| Parameter | Required | Description |
| :-- | :-- | :-- |
| `symbol` | Yes | Market symbol, converted to uppercase on the server. |
| `interval` | No | `1d`, `1wk`, or `1mo`. Defaults to `1d`. |
| `start` and `end` | No | Date strings or millisecond timestamps. Both must be present when used. |
| `rangeDays` | No | Lookback window in days when `start` and `end` are not provided. Defaults to `200`. |

The response shape is:

```json
{
  "symbol": "AAPL",
  "interval": "1d",
  "points": [{ "time": 1719792000000, "close": 216.75 }]
}
```

## Runtime Behavior

1. The endpoint checks the in-memory cache first.
2. On cache miss, it tries Yahoo Finance.
3. If Yahoo Finance fails, it retries once for rate-limit errors.
4. If Yahoo still fails, it tries Twelve Data when `TWELVE_DATA_API_KEY` exists.
5. If no Twelve Data result is available, it tries Alpha Vantage.
6. If every provider fails, the endpoint returns a `500` response with an error message.

## Caching

- In-memory cache: 1 hour
- Vercel CDN cache: `s-maxage=3600`
- Stale revalidation window: `stale-while-revalidate=7200`

Successful responses include:

- `X-Cache: HIT` or `MISS`
- `X-Data-Source: yahoo`, `twelvedata`, or `alphavantage` on cache misses

## Deployment

1. Add at least one fallback API key in Vercel when possible:

```bash
TWELVE_DATA_API_KEY=xxx
ALPHA_VANTAGE_API_KEY=xxx
```

2. Deploy the app:

```bash
git push
```

3. Verify a response:

```bash
curl -I "https://your-domain.example/api/stock/historical?symbol=AAPL&rangeDays=30"
```

Check `X-Data-Source` and `X-Cache` in the response headers.

## Notes

- Yahoo Finance can work without fallback keys, but it is more exposed to rate limits.
- Twelve Data is the preferred fallback when available.
- Alpha Vantage can run with the `demo` key, but the limits are strict.
- The 1-hour cache is intentional because this endpoint is used for historical data.
