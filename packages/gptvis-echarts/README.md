# GPTVis ECharts

[![npm version](https://img.shields.io/npm/v/gptvis-echarts.svg)](https://www.npmjs.com/package/gptvis-echarts)
[![npm](https://img.shields.io/npm/v/gptvis-echarts/latest.svg?label=latest)](https://www.npmjs.com/package/gptvis-echarts)
[![npm downloads](https://img.shields.io/npm/dm/gptvis-echarts.svg)](https://www.npmjs.com/package/gptvis-echarts)

[GPT-Vis](https://github.com/antvis/GPT-Vis) 的 ECharts 适配层。公开入口和 `@antv/gpt-vis` 对齐：`GPTVis`、`parse`、`isVisSyntax`，以及 26 个同名构造函数。模型继续写 `vis` 语法，图由 Apache ECharts 绘制，不安装 AntV。

流式输出时，没写完的最后一行先不画，已经完整的部分照常出图。主题有默认、浅色、学院和深色，也可以传 GPT-Vis 1.3 风格的 `ThemeSpec`。26 种图里，统计图走 ECharts，表格、摘要、水波、词云、韦恩、小提琴和鱼骨走同一套运行时里的 HTML。

## 安装

`echarts` 是 peer dependency，应用需要和本包一起安装：

```bash
npm install gptvis-echarts echarts
```

支持的 ECharts 版本是 `^5.6.0 || ^6.0.0`。React 入口还需要 React 18+；主包解析和服务端 `syntax` 入口不需要 React。

ECharts 6 调整了默认主题和部分组件默认值。适配层会显式设置标题、坐标轴、提示框和系列颜色，但如果你还通过 `echarts.init` 注册了自定义 ECharts 主题，升级 6.x 后建议做一次视觉回归。仓库里的安装冒烟测试固定跑 ECharts 5.6。

## 运行演示

在仓库根目录：

```bash
npm install
npm run dev
```

打开 http://127.0.0.1:4317 。左边改语法，右边看图。可以按 token 把一段示例重新流出来。线上同一套演示在 https://gptvis-echarts.netlify.app 。

```bash
npm test
npm run build
```

`npm run build` 把库打到 `packages/gptvis-echarts/dist/`，把演示打到 `playground/dist/`。演示包自己依赖 React 和 ECharts，并从 `gptvis-echarts` 与 `gptvis-echarts/react` 引用这个库。

## 在页面里用

```ts
import { GPTVis } from 'gptvis-echarts';

const vis = new GPTVis({ container: '#chart', theme: 'academy' });

vis.render(`
vis column
title 各渠道签约额
data
  - category 直销
    value 86
  - category 伙伴
    value 54
`);

vis.destroy();
```

流式输出时每次把当前缓冲区交进去，并打开 `streaming`，这样最后一行半截内容会被丢掉而不是画坏：

```ts
const vis = new GPTVis({ container: '#chart', streaming: true });
if (buffer.trim().startsWith('vis ')) vis.render(buffer);
```

React 单独入口，不装 React 也能用主包：

```tsx
import { GPTVisChart } from 'gptvis-echarts/react';

<GPTVisChart content={buffer} theme="dark" streaming />
```

Vue 不需要额外适配包。在 `onMounted` 里创建实例，语法变化时 `render`，卸载时 `destroy`：

```ts
import { bindGPTVis } from 'gptvis-echarts';

const chart = bindGPTVis(el.value, { theme: 'default' });
chart.update(syntax);
chart.destroy();
```

服务端、Worker 或只做校验的流程从 `gptvis-echarts/syntax` 导入，不会加载 ECharts、React 或浏览器运行时：

```ts
import { isVisSyntax, parse, readConfig } from 'gptvis-echarts/syntax';

if (isVisSyntax(buffer)) {
  const config = parse(buffer);
  // 也可以把 JSON 字符串或配置对象交给 readConfig。
}
```

主题除了内置名称，还可以传 GPT-Vis 1.3 兼容的 `ThemeSpec`。它不会依赖 `@antv/gpt-vis`：

```ts
import { GPTVis, type ThemeSpec } from 'gptvis-echarts';

const theme: ThemeSpec = {
  id: 'brand',
  label: '品牌主题',
  baseTheme: 'light',
  tokens: {
    colorBackground: '#ffffff',
    colorText: '#1c1916',
    colorTextSecondary: '#6e675f',
    colorStroke: '#e6e0d6',
    category10: ['#0f6e6b', '#d4652f', '#2f5d9f'],
    colorPositive: '#2f7d4a',
    colorNegative: '#b44848',
    colorSurface: '#1c1916',
    colorTextInverse: '#fbf9f6',
  },
};

const vis = new GPTVis({ container: '#chart', theme });
```

`ThemeSpec.tokens` 会映射到现有 `ThemeTokens`：`colorBackground → background`、`colorText → text`、`colorTextSecondary` 或 `colorNeutral → muted`、`colorStroke → grid`、`category10`（缺省时用 `category20`）`→ palette`、`colorSurface → tooltipBg`、`colorTextInverse → tooltipText`、`colorPositive/colorNegative`、`colorDefault → total`。`style.backgroundColor` 和 `style.palette` 会在 token 展开后覆盖。

`render` 也接受已经解析好的对象，或一段 JSON。不以 `vis ` 开头的普通正文会按摘要排版，摘要里的 `[文本](metric_value)` 这类语义标记会画成标注。

只要一种图时，可以用和 GPT-Vis 同名的构造函数。配置对象里不用再写 `type`：

```ts
import { Pie } from 'gptvis-echarts';

const pie = Pie({ container: '#chart', theme: 'academy' });
pie.render({
  data: [
    { category: '人力', value: 46 },
    { category: '投放', value: 22 },
  ],
  innerRadius: 0.6,
});
```

外层工具条默认关闭。打开后有「图表 / 代码」切换、复制语法、下载图片，以及流程图、网络图、思维导图、组织架构、缩进树和鱼骨图的缩放：

```ts
const vis = new GPTVis({
  container: '#chart',
  wrapper: true,
  locale: 'zh-CN',
});
vis.zoomTo(1.2);
vis.getZoom();
```

`locale` 不写时，工具条文案是英文，和 GPT-Vis 一致。

## 渲染约定

- 语法跟 GPT-Vis 的公开文法对齐，26 种类型和同名构造函数都可以用。字段名和选图规则相同。
- 模型碰不到任意 `option`，也就执行不了它写出来的脚本。颜色只接受颜色字面量。
- 思维导图默认从中心向两侧展开。网络图可以指定 `force`、`circular`、`grid`、`radial`、`concentric`，`dagre` 会排成从左到右的层次。
- 水波图支持 `circle`、`rect`、`triangle`、`pin`。词云按字号做螺旋避让。摘要支持 GPT-Vis 那组语义实体；带数字 `detail` 的实体旁边会画一条小折线。

图表字段和选图规则在 `skills/chart-visualization/SKILL.md`。

## 许可

MIT，见 `LICENSE`。`vis` 文法的设计来自 [AntV GPT-Vis](https://github.com/antvis/GPT-Vis)，本仓库的解析器和渲染器是独立实现。
