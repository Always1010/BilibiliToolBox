const test = require("node:test");
const assert = require("node:assert/strict");
const settingsApi = require("../src/shared/settings.js");

test("默认使用 B 站原生滚动行为", () => {
  const settings = settingsApi.cloneDefaults();

  assert.equal(settings.stickyPlayer.enabled, false);
  assert.equal(settings.stickyPlayer.avoidHeader, true);
});

test("保留合法的用户设置", () => {
  const settings = settingsApi.sanitizeSettings({
    stickyPlayer: {
      enabled: true,
      avoidHeader: false,
      topOffset: 12,
      maxViewportHeight: 65
    }
  });

  assert.deepEqual(settings.stickyPlayer, {
    enabled: true,
    avoidHeader: false,
    topOffset: 12,
    maxViewportHeight: 65
  });
});

test("修复越界值并忽略错误类型", () => {
  const settings = settingsApi.sanitizeSettings({
    stickyPlayer: {
      enabled: "yes",
      avoidHeader: "yes",
      topOffset: 200,
      maxViewportHeight: 10
    }
  });

  assert.deepEqual(settings.stickyPlayer, {
    enabled: false,
    avoidHeader: true,
    topOffset: 32,
    maxViewportHeight: 35
  });
});

test("缺少设置时生成互不共享引用的默认值", () => {
  const first = settingsApi.sanitizeSettings(undefined);
  const second = settingsApi.cloneDefaults();

  first.stickyPlayer.enabled = true;

  assert.equal(second.stickyPlayer.enabled, false);
});
