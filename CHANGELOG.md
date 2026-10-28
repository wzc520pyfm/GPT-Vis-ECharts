# Changelog

## 0.2.0

- 补齐和 GPT-Vis 同名的 26 个图表构造函数，以及 `wrapper`、`locale`、`zoomTo`、`getZoom`。
- 思维导图默认双向展开。网络图接受 force、circular、grid、radial、concentric、dagre。
- 漏斗图按上一阶段计算转化率。`group: false` 时不再按 group 拆系列。
- 水波图按 circle、rect、triangle、pin 画波形。词云改为螺旋避让。
- 摘要支持 metric、delta、ratio、rank 等语义实体；`detail` 里的数字会画成小折线。
