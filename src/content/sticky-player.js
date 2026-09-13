(function initializeStickyPlayer() {
  "use strict";

  const settingsApi = globalThis.BilibiliToolboxSettings;
  const layoutApi = globalThis.BilibiliToolboxStickyLayout;
  const PLAYER_SELECTORS = [
    "#bilibili-player",
    "#playerWrap .bpx-player-container",
    ".player-wrap .bpx-player-container"
  ];
  const PLAYER_CLASS = "btt-sticky-player";
  const PLACEHOLDER_CLASS = "btt-player-placeholder";
  const ACTIVE_PLACEHOLDER_CLASS = "btt-player-placeholder--active";

  let settings = settingsApi.cloneDefaults();
  let player = null;
  let placeholder = null;
  let aspectRatio = 16 / 9;
  let active = false;
  let animationFrame = 0;
  let scanTimer = 0;
  let bodyObserver = null;
  let resizeObserver = null;

  void start();

  async function start() {
    const stored = await chrome.storage.sync.get(settingsApi.STORAGE_KEY);
    settings = settingsApi.sanitizeSettings(stored[settingsApi.STORAGE_KEY]);
    applySettings();
    findPlayer();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    document.addEventListener("fullscreenchange", scheduleUpdate);
    chrome.storage.onChanged.addListener(handleStorageChange);

    observePageChanges();
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== "sync" || !changes[settingsApi.STORAGE_KEY]) {
      return;
    }

    settings = settingsApi.sanitizeSettings(
      changes[settingsApi.STORAGE_KEY].newValue
    );
    applySettings();
    scheduleUpdate();
  }

  function applySettings() {
    const stickySettings = settings.stickyPlayer;

    document.documentElement.dataset.bttStickyEnabled = String(
      stickySettings.enabled
    );

    if (!stickySettings.enabled) {
      deactivate();
    }
  }

  function observePageChanges() {
    if (!document.body) {
      window.setTimeout(observePageChanges, 50);
      return;
    }

    bodyObserver = new MutationObserver(() => {
      window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(() => {
        if (!player || !player.isConnected) {
          detachPlayer();
          findPlayer();
        }
      }, 200);
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function findPlayer() {
    const candidate = PLAYER_SELECTORS.map((selector) =>
      document.querySelector(selector)
    ).find(isUsablePlayer);

    if (!candidate || candidate === player) {
      return;
    }

    detachPlayer();
    player = candidate;
    placeholder = document.createElement("div");
    placeholder.className = PLACEHOLDER_CLASS;
    placeholder.setAttribute("aria-hidden", "true");
    player.before(placeholder);

    resizeObserver = new ResizeObserver(() => {
      if (!active) {
        rememberAspectRatio();
      }
      scheduleUpdate();
    });
    resizeObserver.observe(player);
    rememberAspectRatio();
    scheduleUpdate();
  }

  function isUsablePlayer(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const rectangle = element.getBoundingClientRect();
    return rectangle.width >= 320 && rectangle.height >= 180;
  }

  function rememberAspectRatio() {
    if (!player || active) {
      return;
    }

    const rectangle = player.getBoundingClientRect();
    if (rectangle.width > 0 && rectangle.height > 0) {
      aspectRatio = rectangle.width / rectangle.height;
    }
  }

  function scheduleUpdate() {
    if (animationFrame) {
      return;
    }

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0;
      update();
    });
  }

  function update() {
    if (!settings.stickyPlayer.enabled || !player || !player.isConnected) {
      deactivate();
      return;
    }

    if (isFullscreenMode()) {
      deactivate();
      return;
    }

    if (active) {
      const placeholderRectangle = placeholder.getBoundingClientRect();
      if (placeholderRectangle.top >= settings.stickyPlayer.topOffset) {
        deactivate();
        return;
      }

      updateGeometry(placeholderRectangle);
      return;
    }

    const playerRectangle = player.getBoundingClientRect();
    if (playerRectangle.top <= settings.stickyPlayer.topOffset) {
      activate(playerRectangle);
    }
  }

  function activate(playerRectangle) {
    if (active || !player || !placeholder) {
      return;
    }

    if (playerRectangle.width <= 0 || playerRectangle.height <= 0) {
      return;
    }

    aspectRatio = playerRectangle.width / playerRectangle.height;
    placeholder.style.height = `${playerRectangle.height}px`;
    placeholder.classList.add(ACTIVE_PLACEHOLDER_CLASS);
    player.classList.add(PLAYER_CLASS);
    active = true;
    document.documentElement.dataset.bttStickyActive = "true";
    updateGeometry(placeholder.getBoundingClientRect());
  }

  function updateGeometry(anchorRectangle) {
    if (!active || !player) {
      return;
    }

    const geometry = layoutApi.calculatePlayerGeometry({
      anchorLeft: anchorRectangle.left,
      anchorWidth: anchorRectangle.width,
      aspectRatio,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      maxViewportHeight: settings.stickyPlayer.maxViewportHeight,
      topOffset: settings.stickyPlayer.topOffset
    });

    placeholder.style.height = `${geometry.placeholderHeight}px`;
    player.style.setProperty("--btt-player-top", `${geometry.top}px`);
    player.style.setProperty("--btt-player-left", `${geometry.left}px`);
    player.style.setProperty("--btt-player-width", `${geometry.width}px`);
    player.style.setProperty("--btt-player-height", `${geometry.height}px`);
  }

  function deactivate() {
    if (!active) {
      return;
    }

    active = false;
    player?.classList.remove(PLAYER_CLASS);
    player?.style.removeProperty("--btt-player-top");
    player?.style.removeProperty("--btt-player-left");
    player?.style.removeProperty("--btt-player-width");
    player?.style.removeProperty("--btt-player-height");
    placeholder?.classList.remove(ACTIVE_PLACEHOLDER_CLASS);
    placeholder?.style.removeProperty("height");
    delete document.documentElement.dataset.bttStickyActive;
  }

  function detachPlayer() {
    deactivate();
    resizeObserver?.disconnect();
    resizeObserver = null;
    placeholder?.remove();
    placeholder = null;
    player = null;
  }

  function isFullscreenMode() {
    if (document.fullscreenElement) {
      return true;
    }

    return Boolean(
      player?.matches(".bpx-state-web, .bpx-state-fullscreen") ||
        player?.querySelector(".bpx-state-web, .bpx-state-fullscreen")
    );
  }
})();
