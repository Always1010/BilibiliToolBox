# 问题日志

## BTT-001：驻留播放器退化为小窗布局

- 日期：2026-09-13
- 状态：已解决
- 现象或修改背景：向下滚动后只保留了缩小的视频区域，宽屏模式被错误压缩，弹幕发送栏和观看人数等完整播放器区域不可见。
- 原因分析：旧实现使用 `#playerWrap` 内占位元素的宽度计算播放器尺寸；宽屏时该父容器仍为左栏宽度，而完整播放器会横跨两栏。同时，B 站滚动后把内部播放器的 `data-screen` 改为 `mini`，触发原生小窗布局并隐藏发送栏。
- 解决方案：以 `#bilibili-player` 的完整实际尺寸作为驻留基准，显式保留等宽等高占位；记录并恢复 `normal` 或 `wide` 页面模式，监听模式切换后重新测量，覆盖原生小窗的内部定位样式。
- 验证方式：运行布局单元测试，并在包含视频区、控制区、观看人数和弹幕发送栏的 DOM 测试页中验证普通模式、宽屏模式和原生 `mini` 状态切换。
- 相关文件：`src/content/sticky-player.js`、`src/content/sticky-player.css`、`src/shared/sticky-layout.js`、`test/fixtures/sticky-player.html`、`test/sticky-layout.test.cjs`

## BTT-002：驻留播放器遮挡顶部导航栏

- 日期：2026-09-13
- 状态：已解决
- 现象或修改背景：开启播放器驻留并向下滚动后，B 站顶部导航栏看起来消失，无法正常看到或使用。
- 原因分析：旧实现给播放器使用接近浏览器上限的 `z-index` 并固定在视口 `top: 0`，导致播放器覆盖 B 站固定导航栏。
- 解决方案：把播放器层级降到 B 站导航栏之下；检测可见且固定在顶部的 B 站导航条，以其底边加用户设置间距作为播放器驻留位置，并提供默认开启的导航避让设置。
- 验证方式：运行顶部位置单元测试，并在 DOM 测试页确认 64px 导航栏保持可见、播放器从其下方开始且二者层级正确。
- 相关文件：`src/content/sticky-player.js`、`src/content/sticky-player.css`、`src/shared/settings.js`、`src/shared/sticky-layout.js`、`src/options/options.html`、`test/fixtures/sticky-player.html`
