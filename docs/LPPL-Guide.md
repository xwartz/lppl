## LPPL / JLS 模型通俗指南

> 参考与灵感来源：Boulder Investment Technologies 的 Python 实现 `lppls`（MIT License）与相关论文。[项目主页](https://github.com/Boulder-Investment-Technologies/lppls)

### 1. LPPL 是什么？为什么有用？
LPPL（Log-Periodic Power Law，中文常译为“对数周期幂律”）又称 JLS 模型（Johansen–Ledoit–Sornette）。它用于识别与诊断金融市场中的“泡沫阶段”，并估计泡沫最可能破裂或转折的时间窗口。

核心直觉：
- 泡沫不是简单的指数增长，而是“超指数”增长（速度越来越快），并在临界时刻前越来越“抖动”（振荡频率提高）。
- 这种“越来越抖”的节奏可由对数周期项描述，且在接近临界时刻时，振荡间距呈对数缩短。

### 2. 数学公式（原型）
```math
\ln p(t) = A + B(t_c - t)^{m} + C(t_c - t)^{m}\cos\big(\omega\ln(t_c - t) + \phi\big)
```

参数含义：
- $t_c$：临界时间（泡沫最可能破裂或切换到新状态的时间点）
- $A$：在 $t \to t_c$ 时的期望对数价格
- $B$：幂律趋势项的幅度；正向泡沫通常 $B<0$
- $C$：对数周期振荡的幅度
- $m$：幂律指数（通常 $0<m<1$）
- $\omega$：对数周期振荡频率（>0）
- $\phi$：相位

为何 $0<m<1$ 且多取 $B<0$（正向泡沫）：
- $0<m<1$ 保证“速度”在靠近 $t_c$ 时发散（超指数），但价格本身有限。
- $B<0$ 让 $B(t_c-t)^m$ 在 $t\to t_c$ 时向上推动，符合“价格加速上涨”的直觉（反之可建模下跌泡沫）。

### 3. Python 实现与本项目实现的“稳定拟合”思路
直接用非线性最小二乘同时拟合 7 个参数会很不稳定。Python `lppls` 与本项目采取了“可分离最小二乘”的标准方案：
- 将 $A,B,C$ 与一个等价的二参数对 ($C_1,C_2$) 视为线性参数；将 $t_c,m,\omega$ 视为非线性参数。
- 给定 $t_c,m,\omega$ 后，构造线性回归矩阵，直接一次性求出最佳 $A,B,C_1,C_2$：

```math
\ln p(t) \approx A \cdot 1 + B \cdot x_m + C_1 \cdot x_m \cos(\omega\ln x) + C_2 \cdot x_m \sin(\omega\ln x)
```

其中 $x = t_c - t$,$x_m = x^m$。

- 线性回归完成后再把 $C_1,C_2$ 还原为 $C,\phi$：

```math
C = \sqrt{C_1^2 + C_2^2}, \quad \phi = \mathrm{atan2}(-C_2,\, C_1)
```

- 非线性参数 $t_c,m,\omega$ 通过受约束的随机搜索获得初值，再做小步 LM（Levenberg–Marquardt）细化。

好处：
- 将强非线性问题降为“少数非线性 + 多数线性”，提高稳定性与速度；
- 对目标面更“温和”，不易陷入坏的局部最优。

### 4. 约束与过滤器（Filters）
为避免数值上“看似拟合但经济含义不正确”的解，本项目与 Python 代码一样加入了一组常用约束与过滤器：
- 参数范围: $m \in [0.1,0.9]$, $\omega \in [6,13]$, $t_c$ 必须晚于样本末尾
- $B<0$（正向泡沫常见设定）
- 震荡次数 $O$（outer/inner 窗口内累计的对数周期摆动次数）

```math
O = \frac{\omega}{2\pi}\ln\frac{t_c - t_{\text{start}}}{t_c - t_{\text{end}}}
```

默认要求 $2.5 \le O \le 13$

- 阻尼指标 $D$（常用的经验型 proxy）

```math
D = \frac{m \cdot |B|}{\omega \cdot |C|}
```

默认要求 $0.5 \le D \le 1.0$（经验阈值，可根据资产特性调整）

这些过滤器用于剔除不符合“对数周期泡沫”形态的拟合，从而让结果更可靠。

### 5. 我们的拟合流程（与代码如何对应）
在本项目的 `src/lib/lppl.ts` 中，关键步骤如下：
1) 数据预处理：将时间统一换算为“天”为单位的归一化时间，价格取自然对数。
2) 随机搜索（可配置、确定性随机种子）：对 $t_c,m,\omega$ 进行受约束采样，给定三者后用一次 OLS 求得 $A,B,C_1,C_2$（进而得到 $C,\phi$），计算 RMSE 并应用过滤器。
3) 局部细化：对最佳解进行若干小扰动再评估，保留更优者。
4) LM 细化与收敛判定：以最佳解为初值，运行一次短步 LM；若 LM 提前停止则标记为“收敛”。
5) 预测临界价与置信区间（Delta 近似）：以 $A$ 给出 $\exp(A)$ 作为“临界时刻的预测价格”。根据雅可比与近似协方差进行 Delta 近似，给出简单区间（与 Python 项目中的“信心指标”不同维度的数据，不冲突）。

主要导出函数：
- `fitLppl(data, options)`：对一段数据进行 LPPL 拟合，返回参数、拟合曲线、RMSE、临界日等
- `lpplScanConfidence(data, config)`：进行“嵌套窗口扫描”，统计各窗口下“通过过滤器的拟合比例”作为 `confidence`，可用于热力/折线呈现

### 6. 嵌套窗口扫描与“信心指标”（Confidence Indicators）
Python 版提供 `mp_compute_nested_fits` 来并行扫描窗口。本项目提供同步版本 `lpplScanConfidence`（同语义）：
- 设定外层窗口（固定尾部为最新点，起点逐步前移），在每个外层窗口内再枚举一组内层窗口；
- 每个内层窗口做一次 LPPL 拟合，应用过滤器，统计“通过比例”；
- 对每个外层窗口输出 `confidence = 通过数 / 总数`，可视为“该区间呈现泡沫结构的稳定度”。

这与 Python 项目的使用方式一致，只是这里是 TypeScript/浏览器环境的实现。[Python 参考](https://github.com/Boulder-Investment-Technologies/lppls)

### 7. 与 Python `lppls` 的一致项与差异项
已对齐的关键点：
- 可分离最小二乘（线性 $A,B,C_1,C_2$ + 非线性 $t_c,m,\omega$）
- 约束区间与过滤器($B<0$, $O$, $D$)
- 多起点随机搜索 + 局部细化（随后短步 LM 判断收敛）
- 嵌套窗口扫描 + 信心指标（同步实现）

仍未覆盖/可选增强：
- 分位回归（L1）变体（Python 提供 q-quantile 方案）
- CMA-ES 作为搜索器的替代（Python 有子类）
- 并行加速（浏览器/Node 环境可用 Web Workers/worker_threads）

### 8. 如何在代码中使用（最常见场景）
1) 单次拟合与绘图（伪示例）：
```ts
import { fitLppl } from "@/lib/lppl"
const result = fitLppl(series, { maxIter: 1000, restarts: 6, tol: 1e-9 })
// result.fitted: 对应每个点的拟合价格（线）
// result.criticalDate: 预测临界日
// result.params: { A,B,C,tc,m,omega,phi }
```
2) 计算信心指标：
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
// scan.points: 每个外层窗口的 {confidence, fits, total, tc统计量...}
```

### 9. 结果如何解读？
- “拟合优度”（RMSE）越小越好，但要结合过滤器是否通过。
- “临界日”不是水晶球；它表示一个高风险窗口的中心。可结合“信心指标”判断信号稳健性。
- 当多个外层窗口（不同跨度）都给出较高的 confidence，且 $m,\omega$ 处于经验稳定区间 $B<0$，则“处于泡沫末期”的可能性更高。

### 10. 常见问题
- 为什么有时会“未收敛”？
  LM 细化若无法早停，标记为“未完全收敛”。可增大 `restarts` 或放宽 `maxIter`，或调整过滤器/窗口。
- 为什么每次刷新结果不一样？
  本项目针对相同数据使用“确定性随机种子”，因此在一致数据下结果稳定。数据变化会改变种子，结果自然不同。
- 能预测下跌泡沫吗？
  可通过放宽 `B<0` 过滤，或设置反向条件来建模下跌型泡沫。

### 11. 参考链接与论文（强烈推荐）
- Python 实现与用法示例：`lppls`（MIT）
  项目主页：<https://github.com/Boulder-Investment-Technologies/lppls>
- Filimonov, V. and Sornette, D. (2013). A Stable and Robust Calibration Scheme of the Log-Periodic Power Law Model. Physica A.
- Sornette, D. (2002). Why Stock Markets Crash: Critical Events in Complex Financial Systems.
- Zhang, Zhang & Sornette (2016). Early Warning Signals with Multi-Scale Quantile Regressions (PLOS ONE).

---

附：与本项目源码的对应关系（快速索引）
- 参数拟合核心：`src/lib/lppl.ts` 内 `fitSeparableRandom`、`evaluateSeparable`、`fitLMWithRestarts`
- 过滤器：同文件中 `BNegative / O / D` 逻辑
- 置信区间（临界价 Delta 近似）：`computePredictedPriceCI`
- 嵌套窗口扫描：`lpplScanConfidence`


