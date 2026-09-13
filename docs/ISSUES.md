# 问题日志

## BTT-001：驻留播放器退化为小窗布局

- 日期：2026-09-13
- 状态：已解决
- 现象或修改背景：向下滚动后只保留了缩小的视频区域，宽屏模式被错误压缩，弹幕发送栏和观看人数等完整播放器区域不可见。
- 原因分析：旧实现使用 `#playerWrap` 内占位元素的宽度计算播放器尺寸；宽屏时该父容器仍为左栏宽度，而完整播放器会横跨两栏。同时，B 站滚动后把内部播放器的 `data-screen` 改为 `mini`，触发原生小窗布局并隐藏发送栏。
- 解决方案：以 `#bilibili-player` 的完整实际尺寸作为驻留基准，显式保留等宽等高占位；记录并恢复 `normal` 或 `wide` 页面模式，监听模式切换后重新测量，覆盖原生小窗的内部定位样式。
- 验证方式：运行布局单元测试，并在包含视频区、控制区、观看人数和弹幕发送栏的 DOM 测试页中验证普通模式、宽屏模式和原生 `mini` 状态切换。
- 相关文件：`src/content/sticky-player.js`、`src/content/sticky-player.css`、`src/shared/sticky-layout.js`、`test/fixtures/sticky-player.html`、`test/sticky-layout.test.cjs`
