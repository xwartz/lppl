# Stock API Setup Guide

## 问题
Yahoo Finance API 在 Vercel 上容易触发速率限制（"Too Many Requests"），因为 Vercel 使用共享 IP 池。

## 解决方案
实现多数据源策略：
1. **Primary**: Yahoo Finance (yahoo-finance2)
2. **Fallback 1**: Twelve Data (推荐，800 次/天)
3. **Fallback 2**: Alpha Vantage (25 次/天)

## 快速设置

### 选项 1：Twelve Data (推荐)
最佳免费额度，800 次请求/天

1. 注册账号：https://twelvedata.com/pricing
2. 获取免费 API Key
3. 在 Vercel 环境变量中设置：
   ```
   TWELVE_DATA_API_KEY=your_key_here
   ```

### 选项 2：Alpha Vantage
备用方案，25 次请求/天

1. 获取免费 API Key：https://www.alphavantage.co/support/#api-key
2. 在 Vercel 环境变量中设置：
   ```
   ALPHA_VANTAGE_API_KEY=your_key_here
   ```

## 工作流程

1. **首次尝试 Yahoo Finance**
   - 如果成功 → 返回数据（标记为 `X-Data-Source: yahoo`）
   - 如果失败（429） → 快速重试一次

2. **Yahoo 失败后自动切换**
   - 优先尝试 Twelve Data（如果配置了 API key）
   - 再尝试 Alpha Vantage
   - 都失败则返回错误提示

3. **缓存策略**
   - 内存缓存：1 小时
   - Edge 缓存：1 小时（Vercel CDN）
   - stale-while-revalidate：2 小时

## 部署步骤

1. 配置环境变量（Vercel Dashboard）：
   ```bash
   # 推荐至少配置一个
   TWELVE_DATA_API_KEY=xxx
   ALPHA_VANTAGE_API_KEY=xxx
   ```

2. 部署：
   ```bash
   git push
   ```

3. 验证：
   - 检查响应头 `X-Data-Source` 查看使用的数据源
   - 检查响应头 `X-Cache` 查看是否命中缓存

## 注意事项

- 即使不配置备用 API，Yahoo Finance 在未被限制时仍可正常使用
- 配置了 TWELVE_DATA_API_KEY 后，系统会优先使用它作为备用（更高的速率限制）
- Alpha Vantage 使用 "demo" key 也能工作，但限制极严格
- 缓存时间较长（1小时），适合历史数据查询

## 成本

所有推荐的 API 都有**完全免费**的额度：
- Yahoo Finance: 无限制（但会被限速）
- Twelve Data: 800 次/天（免费）
- Alpha Vantage: 25 次/天（免费）

结合 1 小时缓存，对于大多数应用场景完全足够。
