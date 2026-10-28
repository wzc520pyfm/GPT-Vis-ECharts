# GPTVis ECharts

用 GPT-Vis 那套 `vis` 语法出图，渲染引擎只有 Apache ECharts。模型不用学 ECharts `option`，业务代码也不用装 AntV。

语法、流式更新和容错跟在对话里走：一行没写完就先画已经完整的部分。主题有默认、学院和深色。26 种图里，统计图走 ECharts，表格、摘要、水波、词云、韦恩、小提琴和鱼骨走同一套运行时里的 HTML。

## 运行演示

```bash
npm install
npm run dev
```

打开 http://127.0.0.1:4317 。左边改语法，右边看图。可以按 token 把一段示例重新流出来。

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

React：

```tsx
import { GPTVisChart } from 'gptvis-echarts';

<GPTVisChart content={buffer} theme="dark" streaming />
```

Vue 不需要额外适配包。在 `onMounted` 里创建实例，语法变化时 `render`，卸载时 `destroy`：

```ts
import { bindGPTVis } from 'gptvis-echarts';

const chart = bindGPTVis(el.value, { theme: 'default' });
chart.update(syntax);
chart.destroy();
```

`render` 也接受已经解析好的对象，或一段 JSON。不以 `vis ` 开头的普通正文会按摘要排版。

## 和原方案的取舍

对话里有三条路：统一描述再适配、让模型直接写 ECharts option、把图做成 Agent 组件。这里采用第一条。

- 语法跟 GPT-Vis 的公开文法对齐，已有的选图习惯可以留着。
- 模型碰不到任意 `option`，也就执行不了它写出来的脚本。颜色只接受颜色字面量。
- 双轴、堆叠、瀑布、桑基这些问数里常见的图在第一版里就有。
- 思维导图画成从左到右的树，不是双向脑图。韦恩图只画二到三个集合。词云按字号排布，不做螺旋填充。

图表字段和选图规则在 `skills/chart-visualization/SKILL.md`。

## 许可

MIT。`vis` 文法的设计来自 AntV GPT-Vis，本仓库的解析器和渲染器是独立实现。
