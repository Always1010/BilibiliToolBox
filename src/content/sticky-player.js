(function initializeStickyPlayer() {
  "use strict";

  const settingsApi = globalThis.BilibiliToolboxSettings;
  const layoutApi = globalThis.BilibiliToolboxStickyLayout;
  const PLAYER_SELECTOR = "#bilibili-player";
  const PLAYER_SURFACE_SELECTOR = ".bpx-player-container";
  const PLAYER_WRAPPER_SELECTOR = "#playerWrap, .player-wrap";
  const PLAYER_CLASS = "btt-sticky-player";
  const PLACEHOLDER_CLASS = "btt-player-placeholder";
  const ACTIVE_PLACEHOLDER_CLASS = "btt-player-placeholder--active";

  let settings = settingsApi.cloneDefaults();
  let player = null;
  let playerSurface = null;
  let playerWrapper = null;
  let placeholder = null;
  let sourceGeometry = null;
  let preferredMode = "normal";
  let renderedMode = "normal";
  let active = false;
  let nativeMiniSuppressed = false;
  let animationFrame = 0;
  let scanTimer = 0;
  let modeMeasureFrame = 0;
  let bodyObserver = null;
  let resizeObserver = null;
  let screenObserver = null;

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
    document.documentElement.dataset.bttStickyEnabled = String(
      settings.stickyPlayer.enabled
    );

    if (!settings.stickyPlayer.enabled) {
      deactivate({ restoreNativeMini: true });
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
    const candidate = document.querySelector(PLAYER_SELECTOR);
    if (!isUsablePlayer(candidate) || candidate === player) {
      return;
    }

    detachPlayer();
    player = candidate;
    playerSurface = player.querySelector(PLAYER_SURFACE_SELECTOR);
    playerWrapper = player.closest(PLAYER_WRAPPER_SELECTOR) ?? player.parentElement;
    preferredMode = detectCurrentMode();
    renderedMode = preferredMode;

    placeholder = document.createElement("div");
    placeholder.className = PLACEHOLDER_CLASS;
    placeholder.setAttribute("aria-hidden", "true");
    player.before(placeholder);

    resizeObserver = new ResizeObserver(() => {
      if (!active) {
        rememberSourceGeometry();
      }
      scheduleUpdate();
    });
    resizeObserver.observe(player);

    if (playerSurface) {
      screenObserver = new MutationObserver(handleScreenModeChange);
      screenObserver.observe(playerSurface, {
        attributes: true,
        attributeFilter: ["data-screen"]
      });
    }

    rememberSourceGeometry();
    scheduleUpdate();
  }

  function isUsablePlayer(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const rectangle = element.getBoundingClientRect();
    return rectangle.width >= 320 && rectangle.height >= 180;
  }

  function detectCurrentMode() {
    const playerRectangle = player?.getBoundingClientRect();
    const wrapperRectangle = playerWrapper?.getBoundingClientRect();

    return layoutApi.detectPlayerMode({
      screen: playerSurface?.dataset.screen,
      playerWidth: playerRectangle?.width,
      wrapperWidth: wrapperRectangle?.width
    });
  }

  function handleScreenModeChange() {
    if (!playerSurface) {
      return;
    }

    const screen = playerSurface.dataset.screen;

    if (screen === "mini" && active) {
      nativeMiniSuppressed = true;
      playerSurface.dataset.screen = preferredMode;
      return;
    }

    if (!layoutApi.PAGE_MODES.includes(screen)) {
      scheduleUpdate();
      return;
    }

    preferredMode = screen;
    if (active && renderedMode !== preferredMode) {
      scheduleModeRemeasure();
    }

    scheduleUpdate();
  }

  function rememberSourceGeometry(rectangle = player?.getBoundingClientRect()) {
    if (!rectangle || rectangle.width <= 0 || rectangle.height <= 0) {
      return false;
    }

    sourceGeometry = {
      left: rectangle.left,
      width: rectangle.width,
      height: rectangle.height
    };
    return true;
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
      deactivate({ restoreNativeMini: true });
      return;
    }

    if (isFullscreenMode()) {
      deactivate();
      return;
    }

    const stickyTop = settings.stickyPlayer.topOffset;

    if (active) {
      const placeholderRectangle = placeholder.getBoundingClientRect();
      if (placeholderRectangle.top >= stickyTop) {
        deactivate();
        return;
      }

      updateGeometry(stickyTop);
      return;
    }

    const playerRectangle = player.getBoundingClientRect();
    const screen = playerSurface?.dataset.screen;
    if (layoutApi.PAGE_MODES.includes(screen)) {
      preferredMode = screen;
    }

    rememberSourceGeometry(playerRectangle);
    if (playerRectangle.top <= stickyTop) {
      activate(playerRectangle, stickyTop);
    }
  }

  function activate(playerRectangle, stickyTop) {
    if (active || !player || !placeholder) {
      return;
    }

    if (!rememberSourceGeometry(playerRectangle)) {
      return;
    }

    nativeMiniSuppressed = playerSurface?.dataset.screen === "mini";
    active = true;
    renderedMode = preferredMode;
    placeholder.classList.add(ACTIVE_PLACEHOLDER_CLASS);
    player.classList.add(PLAYER_CLASS);
    document.documentElement.dataset.bttStickyActive = "true";

    restorePagePlayerMode();
    updateGeometry(stickyTop);
  }

  function restorePagePlayerMode() {
    if (playerSurface?.dataset.screen === "mini") {
      playerSurface.dataset.screen = preferredMode;
    }
  }

  function updateGeometry(stickyTop) {
    if (!active || !player || !sourceGeometry) {
      return;
    }

    const geometry = layoutApi.calculatePlayerGeometry({
      anchorLeft: sourceGeometry.left,
      anchorWidth: sourceGeometry.width,
      anchorHeight: sourceGeometry.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      maxViewportHeight: settings.stickyPlayer.maxViewportHeight,
      topOffset: stickyTop
    });

    placeholder.style.setProperty(
      "--btt-placeholder-width",
      `${geometry.placeholderWidth}px`
    );
    placeholder.style.setProperty(
      "--btt-placeholder-height",
      `${geometry.placeholderHeight}px`
    );
    player.style.setProperty("--btt-player-top", `${geometry.top}px`);
    player.style.setProperty("--btt-player-left", `${geometry.left}px`);
    player.style.setProperty("--btt-player-width", `${geometry.width}px`);
    player.style.setProperty("--btt-player-height", `${geometry.height}px`);
  }

  function scheduleModeRemeasure() {
    if (modeMeasureFrame) {
      return;
    }

    modeMeasureFrame = window.requestAnimationFrame(() => {
      modeMeasureFrame = 0;
      if (!active || !player) {
        return;
      }

      removeStickyPresentation();
      const rectangle = player.getBoundingClientRect();
      activate(rectangle, settings.stickyPlayer.topOffset);
    });
  }

  function deactivate({ restoreNativeMini = false } = {}) {
    if (!active) {
      return;
    }

    const placeholderWasAboveViewport =
      placeholder?.getBoundingClientRect().top < settings.stickyPlayer.topOffset;
    removeStickyPresentation();

    if (
      restoreNativeMini &&
      nativeMiniSuppressed &&
      placeholderWasAboveViewport &&
      playerSurface
    ) {
      playerSurface.dataset.screen = "mini";
    }

    nativeMiniSuppressed = false;
  }

  function removeStickyPresentation() {
    active = false;
    player?.classList.remove(PLAYER_CLASS);
    player?.style.removeProperty("--btt-player-top");
    player?.style.removeProperty("--btt-player-left");
    player?.style.removeProperty("--btt-player-width");
    player?.style.removeProperty("--btt-player-height");
    placeholder?.classList.remove(ACTIVE_PLACEHOLDER_CLASS);
    placeholder?.style.removeProperty("--btt-placeholder-width");
    placeholder?.style.removeProperty("--btt-placeholder-height");
    delete document.documentElement.dataset.bttStickyActive;
  }

  function detachPlayer() {
    deactivate({ restoreNativeMini: true });
    resizeObserver?.disconnect();
    screenObserver?.disconnect();
    resizeObserver = null;
    screenObserver = null;
    placeholder?.remove();
    placeholder = null;
    playerSurface = null;
    playerWrapper = null;
    player = null;
    sourceGeometry = null;
  }

  function isFullscreenMode() {
    if (document.fullscreenElement) {
      return true;
    }

    const screen = playerSurface?.dataset.screen;
    return (
      screen === "web" ||
      screen === "full" ||
      screen === "fullscreen" ||
      Boolean(
        player?.matches(".bpx-state-web, .bpx-state-fullscreen") ||
          player?.querySelector(".bpx-state-web, .bpx-state-fullscreen")
      )
    );
  }
})();
