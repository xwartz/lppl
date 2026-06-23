# 股票 API 配置指南

[English](API-SETUP.md)

本项目通过 `api/stock/historical.ts` 获取股票和大宗商品历史数据。浏览器端应该调用这个服务端接口，不要直接请求市场数据供应商。

## 为什么需要这个接口

Yahoo Finance 在 Vercel 上容易触发速率限制，因为 Serverless 部署可能共享出口 IP。这个 API 代理可以让浏览器代码保持简单，并在 Yahoo Finance 失败时由服务端切换到备用数据源。

## 数据源顺序

1. **Yahoo Finance**，通过 `yahoo-finance2`
2. **Twelve Data**，仅当配置了 `TWELVE_DATA_API_KEY` 时启用
3. **Alpha Vantage**，使用 `ALPHA_VANTAGE_API_KEY`；如果未配置，则使用 Alpha Vantage 的 `demo` key

Twelve Data 会先于 Alpha Vantage 尝试，因为它的免费额度更高。

## 环境变量

### 推荐：Twelve Data

Twelve Data 的免费额度高于 Alpha Vantage。

1. 注册账号：<https://twelvedata.com/pricing>
2. 获取免费 API key。
3. 在 Vercel 中添加环境变量：

```bash
TWELVE_DATA_API_KEY=your_key_here
```

### 可选：Alpha Vantage

Alpha Vantage 是最后一个备用数据源。免费额度较小，更适合作为兜底。

1. 获取免费 API key：<https://www.alphavantage.co/support/#api-key>
2. 在 Vercel 中添加环境变量：

```bash
ALPHA_VANTAGE_API_KEY=your_key_here
```

## 请求参数

`GET /api/stock/historical`

| 参数 | 是否必填 | 说明 |
| :-- | :-- | :-- |
| `symbol` | 是 | 市场代码，服务端会转成大写。 |
| `interval` | 否 | `1d`、`1wk` 或 `1mo`，默认 `1d`。 |
| `start` 和 `end` | 否 | 日期字符串或毫秒时间戳。使用时必须同时提供。 |
| `rangeDays` | 否 | 未提供 `start` 和 `end` 时使用的回看天数，默认 `200`。 |

响应结构：

```json
{
  "symbol": "AAPL",
  "interval": "1d",
  "points": [{ "time": 1719792000000, "close": 216.75 }]
}
```

## 运行流程

1. 接口先检查内存缓存。
2. 缓存未命中时，请求 Yahoo Finance。
3. 如果 Yahoo Finance 失败，并且错误是速率限制，会快速重试一次。
4. 如果 Yahoo 仍然失败，并且存在 `TWELVE_DATA_API_KEY`，则请求 Twelve Data。
5. 如果 Twelve Data 没有结果，则请求 Alpha Vantage。
6. 如果所有数据源都失败，接口返回 `500` 和错误信息。

## 缓存

- 内存缓存：1 小时
- Vercel CDN 缓存：`s-maxage=3600`
- 过期后重新验证窗口：`stale-while-revalidate=7200`

成功响应会包含：

- `X-Cache: HIT` 或 `MISS`
- 缓存未命中时包含 `X-Data-Source: yahoo`、`twelvedata` 或 `alphavantage`

## 部署

1. 尽量在 Vercel 中至少配置一个备用 API key：

```bash
TWELVE_DATA_API_KEY=xxx
ALPHA_VANTAGE_API_KEY=xxx
```

2. 部署应用：

```bash
git push
```

3. 验证响应：

```bash
curl -I "https://your-domain.example/api/stock/historical?symbol=AAPL&rangeDays=30"
```

检查响应头中的 `X-Data-Source` 和 `X-Cache`。

## 注意事项

- 不配置备用 key 时，Yahoo Finance 仍可能正常工作，但更容易受到速率限制影响。
- Twelve Data 是推荐备用数据源。
- Alpha Vantage 可以使用 `demo` key，但限制很严格。
- 1 小时缓存是有意设置的，因为这个接口用于历史数据查询。
