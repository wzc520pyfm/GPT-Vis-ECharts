export interface Example {
  id: string;
  label: string;
  type: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'line',
    label: '月度销售',
    type: 'line',
    source: `vis line
title 2026 年上半年销售额
axisXTitle 月份
axisYTitle 万元
data
  - time 1月
    value 128
    group 华东
  - time 2月
    value 116
    group 华东
  - time 3月
    value 143
    group 华东
  - time 4月
    value 151
    group 华东
  - time 5月
    value 162
    group 华东
  - time 6月
    value 174
    group 华东
  - time 1月
    value 96
    group 华南
  - time 2月
    value 101
    group 华南
  - time 3月
    value 110
    group 华南
  - time 4月
    value 108
    group 华南
  - time 5月
    value 121
    group 华南
  - time 6月
    value 133
    group 华南
`,
  },
  {
    id: 'column',
    label: '渠道对比',
    type: 'column',
    source: `vis column
title 各渠道签约额
axisXTitle 渠道
axisYTitle 万元
stack false
data
  - category 直销
    value 86
    group 新签
  - category 直销
    value 42
    group 续约
  - category 伙伴
    value 54
    group 新签
  - category 伙伴
    value 37
    group 续约
  - category 电商
    value 29
    group 新签
  - category 电商
    value 18
    group 续约
`,
  },
  {
    id: 'pie',
    label: '费用结构',
    type: 'pie',
    source: `vis pie
title 本季费用结构
innerRadius 0.62
data
  - category 人力
    value 46
  - category 投放
    value 22
  - category 云资源
    value 14
  - category 差旅
    value 8
  - category 其他
    value 10
`,
  },
  {
    id: 'dual',
    label: '收入与订单',
    type: 'dual-axes',
    source: `vis dual-axes
title 收入与订单
axisXTitle 月份
categories
  - 1月
  - 2月
  - 3月
  - 4月
  - 5月
  - 6月
series
  - type column
    axisYTitle 收入（万元）
    data
      - 128
      - 116
      - 143
      - 151
      - 162
      - 174
  - type line
    axisYTitle 订单数
    data
      - 420
      - 388
      - 455
      - 470
      - 512
      - 540
`,
  },
  {
    id: 'waterfall',
    label: '利润桥',
    type: 'waterfall',
    source: `vis waterfall
title 从收入到经营利润
axisYTitle 万元
data
  - category 营业收入
    value 860
    isTotal true
  - category 履约成本
    value -310
  - category 销售费用
    value -96
  - category 研发费用
    value -140
  - category 其他收益
    value 28
  - category 经营利润
    isTotal true
`,
  },
  {
    id: 'funnel',
    label: '转化漏斗',
    type: 'funnel',
    source: `vis funnel
title 官网线索转化
data
  - category 访问
    value 18200
  - category 注册
    value 2460
  - category 试用
    value 980
  - category 商机
    value 310
  - category 成交
    value 86
`,
  },
  {
    id: 'sankey',
    label: '流量去向',
    type: 'sankey',
    source: `vis sankey
title 投放流量去向
nodeAlign justify
data
  - source 信息流
    target 落地页
    value 4200
  - source 搜索
    target 落地页
    value 2600
  - source 落地页
    target 注册
    value 3900
  - source 落地页
    target 离开
    value 2900
  - source 注册
    target 试用
    value 1400
  - source 注册
    target 沉默
    value 2500
`,
  },
  {
    id: 'radar',
    label: '能力画像',
    type: 'radar',
    source: `vis radar
title 两个方案的能力画像
data
  - name 交付速度
    value 8
    group 方案 A
  - name 成本
    value 6
    group 方案 A
  - name 可扩展
    value 7
    group 方案 A
  - name 体验
    value 8
    group 方案 A
  - name 风险
    value 5
    group 方案 A
  - name 交付速度
    value 5
    group 方案 B
  - name 成本
    value 8
    group 方案 B
  - name 可扩展
    value 6
    group 方案 B
  - name 体验
    value 6
    group 方案 B
  - name 风险
    value 7
    group 方案 B
`,
  },
  {
    id: 'mindmap',
    label: '问数拆解',
    type: 'mindmap',
    source: `vis mindmap
title 销售额异常怎么拆
data
  - name 销售额下滑
    children
      - name 量
        children
          - name 线索减少
          - name 转化变差
      - name 价
        children
          - name 折扣加深
          - name 产品结构
      - name 结构
        children
          - name 大客户流失
          - name 区域不均
`,
  },
  {
    id: 'table',
    label: '区域明细',
    type: 'table',
    source: `vis table
title 区域经营快照
data
  - 区域 华东
    收入 174
    订单 540
    毛利率 38%
  - 区域 华南
    收入 133
    订单 410
    毛利率 34%
  - 区域 华北
    收入 121
    订单 366
    毛利率 41%
  - 区域 西部
    收入 78
    订单 240
    毛利率 29%
`,
  },
  {
    id: 'summary',
    label: '文字摘要',
    type: 'summary',
    source: `# 6 月经营摘要

华东收入 [174 万](metric_value)，环比 [+7%](delta_value, status=increase)。

- 直销新签是主要增量
- 电商续约低于预期
- 经营利润被研发费用吃掉一块，但合计仍为正
`,
  },
];
