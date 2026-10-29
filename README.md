# GPTVis ECharts

npm workspaces。库和演示分开安装依赖。

- `packages/gptvis-echarts`：发布用的 ECharts 适配层。用法见 [packages/gptvis-echarts/README.md](packages/gptvis-echarts/README.md)。
- `playground`：演示站。它自己依赖 React，并通过包入口 `gptvis-echarts` 和 `gptvis-echarts/react` 使用库。

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` 先编译库，再打开 http://127.0.0.1:4317 。线上演示：https://gptvis-echarts.netlify.app 。

`npm run build` 把库打到 `packages/gptvis-echarts/dist/`，把演示打到 `playground/dist/`。
