# LPPL / JLS 模型指南

[English](LPPL-Guide.md)

参考实现：Boulder Investment Technologies 的 Python 包 `lppls`，MIT License。见[项目仓库](https://github.com/Boulder-Investment-Technologies/lppls)。

## 1. LPPL 是什么

LPPL 是 Log-Periodic Power Law 的缩写，中文常译为对数周期幂律。它也称为 JLS 模型，以 Johansen、Ledoit 和 Sornette 的名字命名。该模型用于识别类似泡沫的市场状态，并估计泡沫最可能破裂或切换状态的时间窗口。

模型基于两个直觉：

- 泡沫阶段的价格增长可能快于指数增长，因为正反馈不断增强。
- 越接近临界时间，价格振荡可能越频繁。

## 2. 公式

```math
\ln p(t) = A + B(t_c - t)^m + C(t_c - t)^m\cos\big(\omega\ln(t_c - t) + \phi\big)
```

参数含义：

- $t_c$：临界时间，也就是当前泡沫状态最可能破裂或切换的时间点
- $A$：当 $t$ 接近 $t_c$ 时的期望对数价格
- $B$：幂律趋势系数；上涨泡沫通常使用 $B < 0$
- $C$：对数周期振荡幅度
- $m$：幂律指数，通常满足 $0 < m < 1$
- $\omega$：对数周期频率，大于 0
- $\phi$：相位

对于上涨泡沫，$0 < m < 1$ 可以让价格本身保持有限，同时让接近 $t_c$ 时的增长率加速。$B < 0$ 会让幂律趋势项在 $t$ 接近 $t_c$ 时向上推动对数价格。

## 3. 稳定拟合思路

直接用非线性最小二乘同时拟合 7 个参数并不稳定。Python `lppls` 包和本项目都使用可分离最小二乘：

- 把 $A$、$B$、$C_1$ 和 $C_2$ 当作线性参数。
- 把 $t_c$、$m$ 和 $\omega$ 当作非线性参数。
- 给定 $t_c$、$m$ 和 $\omega$ 后，直接求解线性回归：

```math
\ln p(t) \approx A + Bx^m + C_1x^m\cos(\omega\ln x) + C_2x^m\sin(\omega\ln x)
```

其中 $x = t_c - t$。

线性拟合完成后，再把 $C_1$ 和 $C_2$ 转回 $C$ 和 $\phi$：

```math
C = \sqrt{C_1^2 + C_2^2}, \quad \phi = \mathrm{atan2}(-C_2, C_1)
```

这样可以减少非线性搜索维度，让拟合更稳定。

## 4. 约束与过滤器

本项目使用常见 LPPL 约束和过滤器，剔除数值上看似可行但市场含义较弱的拟合：

- $m \in [0.1, 0.9]$
- $\omega \in [6, 13]$
- $t_c$ 必须晚于样本末尾
- 上涨泡沫默认要求 $B < 0$
- 振荡次数 $O$：

```math
O = \frac{\omega}{2\pi}\ln\frac{t_c - t_{\text{start}}}{t_c - t_{\text{end}}}
```

默认范围：$2.5 \le O \le 13$。

- 阻尼 proxy $D$：

```math
D = \frac{m \cdot |B|}{\omega \cdot |C|}
```

默认范围：$0.5 \le D \le 1.0$。

这些过滤器不能证明市场处于泡沫中，只是排除不符合 LPPL 形态预期的拟合。

## 5. 实现流程

主要实现位于 `src/lib/lppl.ts`。

1. 将时间戳归一化为天，并对价格取自然对数。
2. 对 $t_c$、$m$ 和 $\omega$ 做确定性随机搜索。
3. 对每个候选点，用普通最小二乘求解 $A$、$B$、$C_1$ 和 $C_2$。
4. 应用配置的过滤器，并保留 RMSE 最低的拟合。
5. 对最佳候选做小范围局部扰动，继续细化。
6. 运行一次短步 Levenberg-Marquardt 细化；只有该过程在 `maxIter` 前停止时，才标记为已收敛。
7. 使用 $\exp(A)$ 估计临界价格，并在可行时计算一个简单的 Delta 方法置信区间。

主要导出函数：

- `fitLppl(data, options)`：对单个序列做 LPPL 拟合，返回参数、拟合点、RMSE、临界日期和临界价格预测。
- `lpplScanConfidence(data, config)`：运行嵌套窗口扫描，返回在配置的搜索和过滤条件下产生有限 LPPL 拟合的窗口比例。

## 6. 嵌套窗口信心指标

Python 包提供 `mp_compute_nested_fits` 来并行做嵌套窗口扫描。本项目提供同步 TypeScript 版本 `lpplScanConfidence`。

扫描流程：

1. 固定最新数据点作为窗口终点。
2. 沿时间序列移动外层窗口起点。
3. 在每个外层窗口中测试多个内层窗口。
4. 对每个内层窗口拟合 LPPL。
5. 对每个外层窗口输出 `confidence = 有效拟合数 / 总拟合数`。

更高的 confidence 表示类似泡沫的结构在不同窗口选择下更稳定，但不表示模型确定正确。

## 7. 与 Python `lppls` 的一致项

已对齐：

- 对 $A$、$B$、$C_1$ 和 $C_2$ 使用可分离最小二乘
- 对 $t_c$、$m$ 和 $\omega$ 做非线性搜索
- 默认过滤 $B < 0$、$O$ 和 $D$
- 多起点随机搜索和局部细化
- 嵌套窗口信心扫描

未实现：

- 分位回归变体
- CMA-ES 搜索
- 并行扫描

## 8. 代码示例

单次拟合：

```ts
import { fitLppl } from "@/lib/lppl"

const result = fitLppl(series, { maxIter: 1000, restarts: 6, tol: 1e-9 })

// result.fitted: 拟合价格线
// result.criticalDate: 估计临界日期
// result.params: { A, B, C, tc, m, omega, phi }
```

信心指标扫描：

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

// scan.points 包含每个外层窗口的 confidence、fits、total 和 tc 统计值
```

## 9. 如何解读结果

- RMSE 越低越好，但需要先确认拟合是否通过 LPPL 过滤器。
- 临界日期是风险窗口中心，不是精确崩盘日期。
- 如果多个窗口长度都给出相近的有效拟合，confidence 更有参考价值。
- 当 $m$、$\omega$、$O$ 和 $D$ 都处于预期范围内时，结果更可信。

## 10. 常见问题

### 为什么有些拟合会显示未收敛？

短步 Levenberg-Marquardt 过程只有在 `maxIter` 前停止时才算收敛。如果它跑满所有迭代，结果仍可能有参考价值，但需要更谨慎地看待。

### 为什么结果可能变化？

本项目对相同输入数据使用确定性随机种子。数据变化时，种子和拟合结果也可能变化。

### 能建模下跌趋势吗？

可以，但默认过滤器针对上涨泡沫。要建模下跌泡沫，需要放宽或替换 `B < 0` 过滤器。

## 11. 参考资料

- Python 实现：<https://github.com/Boulder-Investment-Technologies/lppls>
- Filimonov, V. and Sornette, D. (2013). A Stable and Robust Calibration Scheme of the Log-Periodic Power Law Model. Physica A.
- Sornette, D. (2002). Why Stock Markets Crash: Critical Events in Complex Financial Systems.
- Zhang, Zhang, and Sornette (2016). Early Warning Signals with Multi-Scale Quantile Regressions. PLOS ONE.

## 源码索引

- 核心拟合：`src/lib/lppl.ts` 中的 `fitSeparableRandom`、`evaluateSeparable` 和 `fitLMWithRestarts`
- 过滤器：`src/lib/lppl.ts` 中的 `BNegative`、`O` 和 `D` 逻辑
- 临界价格置信区间：`computePredictedPriceCI`
- 嵌套窗口扫描：`lpplScanConfidence`
