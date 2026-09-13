(function initializeDefaultWidePlayer() {
  "use strict";

  const settingsApi = globalThis.BilibiliToolboxSettings;
  const PLAYER_SURFACE_SELECTOR = ".bpx-player-container";
  const WIDE_BUTTON_SELECTOR =
    ".bpx-player-ctrl-wide, [role='button'][aria-label='宽屏']";
  const WAIT_TIMEOUT = 30000;

  void start();

  async function start() {
    const stored = await chrome.storage.sync.get(settingsApi.STORAGE_KEY);
    const settings = settingsApi.sanitizeSettings(
      stored[settingsApi.STORAGE_KEY]
    );

    if (!settings.defaultWideMode.enabled) {
      return;
    }

    applyDefaultWideMode();
  }

  function applyDefaultWideMode() {
    let observer = null;
    let timeout = 0;
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      observer?.disconnect();
      window.clearTimeout(timeout);
    };

    const tryEnterWideMode = () => {
      if (finished) {
        return;
      }

      const playerSurface = document.querySelector(PLAYER_SURFACE_SELECTOR);
      const wideButton = document.querySelector(WIDE_BUTTON_SELECTOR);
      const isAlreadyWide =
        playerSurface?.dataset.screen === "wide" ||
        wideButton?.classList.contains("bpx-state-entered");

      if (isAlreadyWide) {
        finish();
        return;
      }

      if (
        playerSurface?.dataset.screen === "normal" &&
        wideButton instanceof HTMLElement
      ) {
        finish();
        wideButton.click();
      }
    };

    observer = new MutationObserver(tryEnterWideMode);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-screen"]
    });
    timeout = window.setTimeout(finish, WAIT_TIMEOUT);
    tryEnterWideMode();
  }
})();
