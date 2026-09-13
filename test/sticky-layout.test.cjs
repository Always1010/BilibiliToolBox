const test = require("node:test");
const assert = require("node:assert/strict");
const layoutApi = require("../src/shared/sticky-layout.js");

test("播放器在空间充足时保留原宽度和宽高比", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: 100,
    anchorWidth: 960,
    aspectRatio: 16 / 9,
    viewportWidth: 1200,
    viewportHeight: 1200,
    maxViewportHeight: 55,
    topOffset: 8
  });

  assert.deepEqual(geometry, {
    top: 8,
    left: 100,
    width: 960,
    height: 540,
    placeholderHeight: 540
  });
});

test("竖屏环境中限制播放器高度并水平居中", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: 20,
    anchorWidth: 960,
    aspectRatio: 16 / 9,
    viewportWidth: 1000,
    viewportHeight: 700,
    maxViewportHeight: 40,
    topOffset: 0
  });

  assert.equal(geometry.height, 280);
  assert.equal(geometry.width, 280 * (16 / 9));
  assert.equal(geometry.left, 20 + (960 - geometry.width) / 2);
  assert.equal(geometry.placeholderHeight, 540);
});

test("无效宽高比回退为 16:9，且不会超出视口宽度", () => {
  const geometry = layoutApi.calculatePlayerGeometry({
    anchorLeft: -20,
    anchorWidth: 500,
    aspectRatio: 0,
    viewportWidth: 360,
    viewportHeight: 800,
    maxViewportHeight: 55,
    topOffset: -10
  });

  assert.equal(geometry.top, 0);
  assert.equal(geometry.left, 50);
  assert.equal(geometry.width, 360);
  assert.equal(geometry.height, 202.5);
});
