# GPTVis ECharts

npm workspaces。库和演示分开安装依赖。

- `packages/gptvis-echarts`：发布用的 ECharts 适配层。用法见 [packages/gptvis-echarts/README.md](packages/gptvis-echarts/README.md)。
- `playground`：演示站。它自己依赖 React 和 ECharts，并通过包入口 `gptvis-echarts` 和 `gptvis-echarts/react` 使用库。

应用侧需要同时安装 ECharts，它是 `gptvis-echarts` 的 peer dependency（`^5.6.0 || ^6.0.0`）：

```bash
npm install gptvis-echarts echarts
```

只做服务端解析时可以从 `gptvis-echarts/syntax` 导入 `parse`、`isVisSyntax` 和 `readConfig`，这个入口不会加载 ECharts 或 React。

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` 先编译库，再打开 http://127.0.0.1:4317 。线上演示：https://gptvis-echarts.netlify.app 。

`npm run build` 把库打到 `packages/gptvis-echarts/dist/`，把演示打到 `playground/dist/`。
