const test = require("node:test");
const assert = require("node:assert/strict");
const layoutApi = require("../src/shared/sticky-layout.js");

test("空间充足时完整保留播放器模块尺寸", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: 100,
    anchorWidth: 960,
    anchorHeight: 586,
    viewportWidth: 1200,
    viewportHeight: 1200,
    maxViewportHeight: 55,
    topOffset: 8
  });

  assert.deepEqual(geometry, {
    top: 8,
    left: 100,
    width: 960,
    height: 586,
    placeholderWidth: 960,
    placeholderHeight: 586
  });
});

test("高度受限时等比例缩放整个播放器模块", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: 20,
    anchorWidth: 960,
    anchorHeight: 586,
    viewportWidth: 1000,
    viewportHeight: 700,
    maxViewportHeight: 40,
    topOffset: 0
  });

  const scale = 280 / 586;
  assert.equal(geometry.height, 280);
  assert.equal(geometry.width, 960 * scale);
  assert.equal(geometry.left, 20 + (960 - geometry.width) / 2);
  assert.equal(geometry.placeholderHeight, 586);
});

test("播放器不会超出视口左右边界", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: -20,
    anchorWidth: 500,
    anchorHeight: 300,
    viewportWidth: 360,
    viewportHeight: 800,
    maxViewportHeight: 55,
    topOffset: -10
  });

  assert.equal(geometry.top, 0);
  assert.equal(geometry.left, 0);
  assert.equal(geometry.width, 360);
  assert.equal(geometry.height, 216);
});

test("标题区占用顶部空间后播放器不会超出视口底部", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: 40,
    anchorWidth: 960,
    anchorHeight: 586,
    viewportWidth: 1100,
    viewportHeight: 600,
    maxViewportHeight: 80,
    topOffset: 168
  });

  assert.equal(geometry.top, 168);
  assert.equal(geometry.height, 432);
  assert.equal(geometry.top + geometry.height, 600);
});

test("横屏宽屏播放器至少保持主内容栏宽度并与其左侧对齐", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: 154,
    anchorWidth: 1520,
    anchorHeight: 907,
    viewportWidth: 1824,
    viewportHeight: 972,
    maxViewportHeight: 55,
    topOffset: 167,
    minimumWidth: 1080,
    alignToAnchorStart: true
  });

  assert.equal(geometry.left, 154);
  assert.equal(geometry.width, 1080);
  assert.equal(geometry.height, 907 * (1080 / 1520));
});

test("横屏高度不足时仍优先保证播放器完整显示", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: 80,
    anchorWidth: 1520,
    anchorHeight: 907,
    viewportWidth: 1680,
    viewportHeight: 600,
    maxViewportHeight: 55,
    topOffset: 168,
    minimumWidth: 1080,
    alignToAnchorStart: true
  });

  assert.equal(geometry.left, 80);
  assert.equal(geometry.height, 432);
  assert.equal(geometry.top + geometry.height, 600);
});

test("标题、UP主与播放器保持原生纵向间距", () => {
  assert.deepEqual(
    layoutApi.calculateStickyModulePositions({
      stickyTop: 64,
      modulePageTop: 64,
      videoInfoPageTop: 64,
      upInfoPageTop: 64,
      playerPageTop: 168
    }),
    {
      videoInfoTop: 64,
      upInfoTop: 64,
      playerTop: 168
    }
  );
});

test("信息区暂未挂载时仍可单独驻留播放器", () => {
  assert.deepEqual(
    layoutApi.calculateStickyModulePositions({
      stickyTop: 72,
      modulePageTop: 168,
      playerPageTop: 168
    }),
    {
      videoInfoTop: null,
      upInfoTop: null,
      playerTop: 72
    }
  );
});

test("优先使用 B 站明确提供的普通与宽屏状态", () => {
  assert.equal(
    layoutApi.detectPlayerMode({
      screen: "wide",
      playerWidth: 600,
      wrapperWidth: 600
    }),
    "wide"
  );
  assert.equal(
    layoutApi.detectPlayerMode({
      screen: "normal",
      playerWidth: 900,
      wrapperWidth: 600
    }),
    "normal"
  );
});

test("原生小窗状态下通过播放器是否横跨栏位推断先前模式", () => {
  assert.equal(
    layoutApi.detectPlayerMode({
      screen: "mini",
      playerWidth: 923,
      wrapperWidth: 543
    }),
    "wide"
  );
  assert.equal(
    layoutApi.detectPlayerMode({
      screen: "mini",
      playerWidth: 668,
      wrapperWidth: 668
    }),
    "normal"
  );
});

test("导航栏可见时在其下方叠加用户间距", () => {
  assert.equal(
    layoutApi.calculateStickyTop({
      topOffset: 8,
      avoidHeader: true,
      headerBottom: 64
    }),
    72
  );
});

test("关闭导航避让时只使用用户间距", () => {
  assert.equal(
    layoutApi.calculateStickyTop({
      topOffset: 12,
      avoidHeader: false,
      headerBottom: 64
    }),
    12
  );
});
