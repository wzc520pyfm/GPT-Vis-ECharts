# Changelog

## 0.3.1

- 默认图表标题改为 16px（ECharts canvas 与 HTML 标题共用常量）。
- 给默认字体栈里的字体名加上引号（`"IBM Plex Sans"`, `"Source Sans 3"`），避免 Canvas `ctx.font` 丢弃声明、标题回退到 10px。
- 站点与 README 补充官方 GPT-Vis 来源标注（https://github.com/antvis/GPT-Vis），以及本仓 GitHub 链接。

## 0.3.0

- `echarts` 改为 peerDependency（`^5.6.0 || ^6.0.0`），应用需自行安装；开发依赖仍保留 5.6 用于测试。
- 新增 `gptvis-echarts/syntax` 子路径，供服务端解析 vis 语法且不引入 echarts。
- 主题支持 GPT-Vis 1.3 兼容的 ThemeSpec 对象；内置 `default` / `light` / `dark` / `academy` 仍可用。
- 补充 HTML 图种 XSS 回归测试，以及 ECharts 渲染冒烟测试。

## 0.2.1

- 说明改为产品文档：流式输出直接写清行为，渲染约定不再复述方案讨论。

## 0.2.0

- 仓库改为 npm workspaces。`playground` 单独依赖 React，并通过包入口使用库。
- 主入口对齐 GPT-Vis：`GPTVis`、`parse`、`isVisSyntax` 和 26 个同名构造函数。发布物是 Node 可直接加载的 ESM，主入口不依赖 React。
- React 组件从 `gptvis-echarts/react` 引入。
- 补齐和 GPT-Vis 同名的 26 个图表构造函数，以及 `wrapper`、`locale`、`zoomTo`、`getZoom`。
- 思维导图默认双向展开。网络图接受 force、circular、grid、radial、concentric、dagre。
- 漏斗图按上一阶段计算转化率。`group: false` 时不再按 group 拆系列。
- 水波图按 circle、rect、triangle、pin 画波形。词云改为螺旋避让。
- 摘要支持 metric、delta、ratio、rank 等语义实体；`detail` 里的数字会画成小折线。
