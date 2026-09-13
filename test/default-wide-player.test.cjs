const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const settingsApi = require("../src/shared/settings.js");

const contentScript = readFileSync(
  require.resolve("../src/content/default-wide-player.js"),
  "utf8"
);

async function runContentScript({ enabled, screen }) {
  let clickCount = 0;

  class FakeElement {}
  class FakeMutationObserver {
    observe() {}
    disconnect() {}
  }

  const playerSurface = {
    dataset: { screen }
  };
  const wideButton = new FakeElement();
  wideButton.classList = {
    contains: (className) =>
      className === "bpx-state-entered" && screen === "wide"
  };
  wideButton.click = () => {
    clickCount += 1;
    playerSurface.dataset.screen = "wide";
  };

  const context = {
    BilibiliToolboxSettings: settingsApi,
    chrome: {
      storage: {
        sync: {
          get: async () => ({
            settings: {
              schemaVersion: 3,
              defaultWideMode: { enabled }
            }
          })
        }
      }
    },
    document: {
      documentElement: {},
      querySelector: (selector) =>
        selector === ".bpx-player-container" ? playerSurface : wideButton
    },
    HTMLElement: FakeElement,
    MutationObserver: FakeMutationObserver,
    window: {
      clearTimeout,
      setTimeout
    }
  };
  vm.runInNewContext(contentScript, context);
  await new Promise((resolve) => setImmediate(resolve));

  return clickCount;
}

test("开启设置时新页面通过原生按钮进入一次宽屏", async () => {
  assert.equal(
    await runContentScript({ enabled: true, screen: "normal" }),
    1
  );
});

test("关闭设置时不修改新页面的播放模式", async () => {
  assert.equal(
    await runContentScript({ enabled: false, screen: "normal" }),
    0
  );
});

test("页面已经是宽屏时不会重复点击", async () => {
  assert.equal(
    await runContentScript({ enabled: true, screen: "wide" }),
    0
  );
});
