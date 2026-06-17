# 设计预览存档

本目录存放已经用于评审的静态 SVG 预览稿，只作为视觉方向记录，不参与生产构建。

## 已沉淀版本

- `hero-editorial-clean-v3.svg`：首屏方向，采用简化标题、主题标签、5 秒结论和右侧轻量视觉面板。
- `page-desktop-clean-v3.svg`：桌面完整页面方向，强调高密度资讯阅读和两列情报卡。
- `page-mobile-clean-v3.svg`：移动端完整页面方向，验证单列阅读、标签折叠和无横向滚动。

## 取舍记录

- 已移除早期 `hero-editorial-signal-map.svg` 方向，因为该版本存在标题截断、视觉遮挡和信号地图噪声过高的问题。
- 正式代码以 CSS Modules 实现，不引入额外 UI 框架或图片素材。
