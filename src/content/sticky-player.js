(function initializeStickyPlayer() {
  "use strict";

  const settingsApi = globalThis.BilibiliToolboxSettings;
  const layoutApi = globalThis.BilibiliToolboxStickyLayout;
  const PLAYER_SELECTOR = "#bilibili-player";
  const PLAYER_SURFACE_SELECTOR = ".bpx-player-container";
  const MINI_CLOSE_SELECTOR = ".bpx-player-mini-close";
  const PLAYER_WRAPPER_SELECTOR = "#playerWrap, .player-wrap";
  const VIDEO_INFO_SELECTOR = "#viewbox_report.video-info-container, .video-info-container";
  const UP_INFO_SELECTOR = ".up-info-container";
  const HEADER_SELECTORS = [
    "#biliMainHeader .bili-header__bar",
    ".bili-header__bar",
    ".international-header .mini-header",
    ".mini-header"
  ];
  const PLAYER_CLASS = "btt-sticky-player";
  const VIDEO_INFO_CLASS = "btt-sticky-video-info";
  const UP_INFO_CLASS = "btt-sticky-up-info";
  const RESERVED_WRAPPER_CLASS = "btt-player-wrapper--reserved";
  const RESERVED_UP_WRAPPER_CLASS = "btt-up-wrapper--reserved";

  let settings = settingsApi.cloneDefaults();
  let player = null;
  let playerSurface = null;
  let playerWrapper = null;
  let videoInfo = null;
  let upInfo = null;
  let upInfoWrapper = null;
  let sourceGeometry = null;
  let sourceInfoGeometry = null;
  let preferredMode = "normal";
  let renderedMode = "normal";
  let active = false;
  let nativeMiniExitPending = false;
  let nativeMiniExitTimer = 0;
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
    window.addEventListener("resize", handleViewportResize, { passive: true });
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
          return;
        }

        syncInfoElements();
        scheduleUpdate();
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
    syncInfoElements();
    preferredMode = detectCurrentMode();
    renderedMode = preferredMode;

    resizeObserver = new ResizeObserver(() => {
      if (!active) {
        rememberSourceGeometry();
      }
      scheduleUpdate();
    });
    resizeObserver.observe(player);
    if (videoInfo) {
      resizeObserver.observe(videoInfo);
    }
    if (upInfo) {
      resizeObserver.observe(upInfo);
    }

    if (playerSurface) {
      screenObserver = new MutationObserver(handleScreenModeChange);
      screenObserver.observe(playerSurface, {
        attributes: true,
        attributeFilter: ["data-screen"]
      });
    }

    rememberSourceGeometry();
    rememberSourceInfoGeometry();
    scheduleUpdate();
  }

  function syncInfoElements() {
    const previousVideoInfo = videoInfo;
    const previousUpInfo = upInfo;

    if (!previousVideoInfo?.isConnected) {
      videoInfo = document.querySelector(VIDEO_INFO_SELECTOR);
    }
    if (!previousUpInfo?.isConnected) {
      upInfo = document.querySelector(UP_INFO_SELECTOR);
    }
    upInfoWrapper = upInfo?.parentElement ?? null;

    if (resizeObserver && videoInfo && videoInfo !== previousVideoInfo) {
      resizeObserver.observe(videoInfo);
    }
    if (resizeObserver && upInfo && upInfo !== previousUpInfo) {
      resizeObserver.observe(upInfo);
    }
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

    if (screen === "mini") {
      requestNativeMiniExit();
      return;
    }

    nativeMiniExitPending = false;
    window.clearTimeout(nativeMiniExitTimer);

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
      height: rectangle.height,
      pageTop: rectangle.top + window.scrollY
    };
    return true;
  }

  function rememberSourceInfoGeometry() {
    syncInfoElements();
    const videoRectangle = getUsableRectangle(videoInfo);
    const upRectangle = getUsableRectangle(upInfo);
    const rectangles = [videoRectangle, upRectangle].filter(Boolean);

    if (!rectangles.length) {
      sourceInfoGeometry = null;
      return false;
    }

    const toGeometry = (rectangle) => rectangle
      ? {
          left: rectangle.left,
          width: rectangle.width,
          height: rectangle.height,
          pageTop: rectangle.top + window.scrollY
        }
      : null;
    sourceInfoGeometry = {
      modulePageTop: Math.min(
        ...rectangles.map((rectangle) => rectangle.top + window.scrollY)
      ),
      video: toGeometry(videoRectangle),
      up: toGeometry(upRectangle)
    };
    return true;
  }

  function getUsableRectangle(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const rectangle = element.getBoundingClientRect();
    return rectangle.width > 0 && rectangle.height > 0 ? rectangle : null;
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

  function handleViewportResize() {
    if (active) {
      scheduleModeRemeasure();
      return;
    }

    scheduleUpdate();
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

    const stickyTop = getStickyTop();

    if (active) {
      const modulePageTop = getModulePageTop();
      const releaseScrollY = Math.max(0, modulePageTop - stickyTop);
      if (window.scrollY <= releaseScrollY) {
        deactivate();
        return;
      }

      updateGeometry(stickyTop);
      return;
    }

    const playerRectangle = player.getBoundingClientRect();
    const screen = playerSurface?.dataset.screen;
    if (screen === "mini") {
      requestNativeMiniExit();
      return;
    }

    if (layoutApi.PAGE_MODES.includes(screen)) {
      preferredMode = screen;
    }

    rememberSourceGeometry(playerRectangle);
    rememberSourceInfoGeometry();
    const moduleTop = getModulePageTop() - window.scrollY;
    if (window.scrollY > 0 && moduleTop <= stickyTop) {
      activate(playerRectangle, stickyTop);
    }
  }

  function getModulePageTop() {
    return sourceInfoGeometry?.modulePageTop ?? sourceGeometry?.pageTop ?? 0;
  }

  function activate(playerRectangle, stickyTop) {
    if (active || !player) {
      return;
    }

    if (!rememberSourceGeometry(playerRectangle)) {
      return;
    }
    rememberSourceInfoGeometry();

    active = true;
    renderedMode = preferredMode;
    reservePlayerSpace();
    applyStickyInfoPresentation();
    player.classList.add(PLAYER_CLASS);
    document.documentElement.dataset.bttStickyActive = "true";

    updateGeometry(stickyTop);
  }

  function reservePlayerSpace() {
    if (!playerWrapper || !sourceGeometry) {
      return;
    }

    playerWrapper.classList.add(RESERVED_WRAPPER_CLASS);
    playerWrapper.style.setProperty(
      "--btt-player-space-height",
      `${sourceGeometry.height}px`
    );
    const videoSpace = sourceInfoGeometry?.video
      ? Math.max(0, sourceGeometry.pageTop - sourceInfoGeometry.video.pageTop)
      : 0;
    playerWrapper.style.setProperty(
      "--btt-video-info-space-height",
      `${videoSpace}px`
    );

    if (upInfoWrapper && sourceInfoGeometry?.up) {
      upInfoWrapper.classList.add(RESERVED_UP_WRAPPER_CLASS);
      upInfoWrapper.style.setProperty(
        "--btt-up-info-space-height",
        `${sourceInfoGeometry.up.height}px`
      );
    }
  }

  function applyStickyInfoPresentation() {
    if (!sourceInfoGeometry || !sourceGeometry) {
      return;
    }

    const positions = getModulePositions(getStickyTop());
    const background = window.getComputedStyle(document.body).backgroundColor;
    applyInfoGeometry(
      videoInfo,
      VIDEO_INFO_CLASS,
      sourceInfoGeometry.video,
      positions.videoInfoTop,
      background
    );
    applyInfoGeometry(
      upInfo,
      UP_INFO_CLASS,
      sourceInfoGeometry.up,
      positions.upInfoTop,
      background
    );
  }

  function applyInfoGeometry(
    element,
    className,
    geometry,
    top,
    background
  ) {
    if (!element || !geometry || top === null) {
      return;
    }

    element.classList.add(className);
    element.style.setProperty("--btt-info-top", `${top}px`);
    element.style.setProperty("--btt-info-left", `${geometry.left}px`);
    element.style.setProperty("--btt-info-width", `${geometry.width}px`);
    element.style.setProperty("--btt-info-height", `${geometry.height}px`);
    element.style.setProperty("--btt-info-background", background);
  }

  function getModulePositions(stickyTop) {
    return layoutApi.calculateStickyModulePositions({
      stickyTop,
      modulePageTop: getModulePageTop(),
      playerPageTop: sourceGeometry?.pageTop,
      videoInfoPageTop: sourceInfoGeometry?.video?.pageTop,
      upInfoPageTop: sourceInfoGeometry?.up?.pageTop
    });
  }

  function requestNativeMiniExit() {
    if (
      nativeMiniExitPending ||
      !settings.stickyPlayer.enabled ||
      playerSurface?.dataset.screen !== "mini"
    ) {
      return;
    }

    const closeButton = player?.querySelector(MINI_CLOSE_SELECTOR);
    if (!(closeButton instanceof HTMLElement)) {
      nativeMiniExitTimer = window.setTimeout(scheduleUpdate, 120);
      return;
    }

    nativeMiniExitPending = true;
    closeButton.click();
    nativeMiniExitTimer = window.setTimeout(() => {
      nativeMiniExitPending = false;
      scheduleUpdate();
    }, 250);
  }

  function updateGeometry(stickyTop) {
    if (!active || !player || !sourceGeometry) {
      return;
    }

    const positions = getModulePositions(stickyTop);
    const geometry = layoutApi.calculatePlayerGeometry({
      anchorLeft: sourceGeometry.left,
      anchorWidth: sourceGeometry.width,
      anchorHeight: sourceGeometry.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      maxViewportHeight: settings.stickyPlayer.maxViewportHeight,
      topOffset: positions.playerTop
    });

    updateInfoTops(positions);
    player.style.setProperty("--btt-player-top", `${geometry.top}px`);
    player.style.setProperty("--btt-player-left", `${geometry.left}px`);
    player.style.setProperty("--btt-player-width", `${geometry.width}px`);
    player.style.setProperty("--btt-player-height", `${geometry.height}px`);
  }

  function updateInfoTops(positions) {
    if (videoInfo && positions.videoInfoTop !== null) {
      videoInfo.style.setProperty(
        "--btt-info-top",
        `${positions.videoInfoTop}px`
      );
    }
    if (upInfo && positions.upInfoTop !== null) {
      upInfo.style.setProperty("--btt-info-top", `${positions.upInfoTop}px`);
    }
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
      activate(rectangle, getStickyTop());
    });
  }

  function deactivate() {
    if (!active) {
      return;
    }

    removeStickyPresentation();
  }

  function removeStickyPresentation() {
    active = false;
    player?.classList.remove(PLAYER_CLASS);
    player?.style.removeProperty("--btt-player-top");
    player?.style.removeProperty("--btt-player-left");
    player?.style.removeProperty("--btt-player-width");
    player?.style.removeProperty("--btt-player-height");
    playerWrapper?.classList.remove(RESERVED_WRAPPER_CLASS);
    playerWrapper?.style.removeProperty("--btt-player-space-height");
    playerWrapper?.style.removeProperty("--btt-video-info-space-height");
    upInfoWrapper?.classList.remove(RESERVED_UP_WRAPPER_CLASS);
    upInfoWrapper?.style.removeProperty("--btt-up-info-space-height");
    clearInfoPresentation(videoInfo, VIDEO_INFO_CLASS);
    clearInfoPresentation(upInfo, UP_INFO_CLASS);
    delete document.documentElement.dataset.bttStickyActive;
  }

  function clearInfoPresentation(element, className) {
    element?.classList.remove(className);
    element?.style.removeProperty("--btt-info-top");
    element?.style.removeProperty("--btt-info-left");
    element?.style.removeProperty("--btt-info-width");
    element?.style.removeProperty("--btt-info-height");
    element?.style.removeProperty("--btt-info-background");
  }

  function getStickyTop() {
    return layoutApi.calculateStickyTop({
      topOffset: settings.stickyPlayer.topOffset,
      avoidHeader: settings.stickyPlayer.avoidHeader,
      headerBottom: getVisibleHeaderBottom()
    });
  }

  function getVisibleHeaderBottom() {
    const headers = new Set(
      HEADER_SELECTORS.flatMap((selector) => [
        ...document.querySelectorAll(selector)
      ])
    );

    return [...headers].reduce((maximumBottom, header) => {
      if (!(header instanceof HTMLElement) || header.contains(player)) {
        return maximumBottom;
      }

      const rectangle = header.getBoundingClientRect();
      const style = window.getComputedStyle(header);
      const isTopBar =
        (style.position === "fixed" || style.position === "sticky") &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rectangle.top <= 32 &&
        rectangle.bottom > 0 &&
        rectangle.height <= 160 &&
        rectangle.width >= window.innerWidth * 0.5;

      return isTopBar
        ? Math.max(maximumBottom, rectangle.bottom)
        : maximumBottom;
    }, 0);
  }

  function detachPlayer() {
    deactivate();
    window.clearTimeout(nativeMiniExitTimer);
    nativeMiniExitPending = false;
    resizeObserver?.disconnect();
    screenObserver?.disconnect();
    resizeObserver = null;
    screenObserver = null;
    playerSurface = null;
    playerWrapper = null;
    videoInfo = null;
    upInfo = null;
    upInfoWrapper = null;
    player = null;
    sourceGeometry = null;
    sourceInfoGeometry = null;
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
