# GPTVis ECharts

GPT-Vis 的 ECharts 适配层。公开入口和 `@antv/gpt-vis` 对齐：`GPTVis`、`parse`、`isVisSyntax`，以及 26 个同名构造函数。模型继续写 `vis` 语法，图由 Apache ECharts 绘制，不安装 AntV。

语法、流式更新和容错跟在对话里走：一行没写完就先画已经完整的部分。主题有默认、学院和深色。26 种图里，统计图走 ECharts，表格、摘要、水波、词云、韦恩、小提琴和鱼骨走同一套运行时里的 HTML。

## 运行演示

```bash
npm install
npm run dev
```

打开 http://127.0.0.1:4317 。左边改语法，右边看图。可以按 token 把一段示例重新流出来。线上同一套演示在 https://gptvis-echarts.netlify.app 。

```bash
npm test
npm run build
```

`npm run build` 会产出库到 `dist/`，演示站点到 `dist-site/`。

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

## 和原方案的取舍

对话里有三条路：统一描述再适配、让模型直接写 ECharts option、把图做成 Agent 组件。这里采用第一条。

- 语法跟 GPT-Vis 的公开文法对齐，26 种类型和同名构造函数都可以用。已有的选图习惯可以留着。
- 模型碰不到任意 `option`，也就执行不了它写出来的脚本。颜色只接受颜色字面量。
- 思维导图默认从中心向两侧展开。网络图可以指定 `force`、`circular`、`grid`、`radial`、`concentric`，`dagre` 会排成从左到右的层次。
- 水波图支持 `circle`、`rect`、`triangle`、`pin`。词云按字号做螺旋避让。摘要支持 GPT-Vis 那组语义实体；带数字 `detail` 的实体旁边会画一条小折线。

图表字段和选图规则在 `skills/chart-visualization/SKILL.md`。

## 许可

MIT，见 `LICENSE`。`vis` 文法的设计来自 AntV GPT-Vis，本仓库的解析器和渲染器是独立实现。
