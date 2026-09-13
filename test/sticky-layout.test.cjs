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
