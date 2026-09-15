(function initializeStickyLayout(globalScope) {
  "use strict";

  const PAGE_MODES = Object.freeze(["normal", "wide"]);

  function calculatePlayerGeometry({
    anchorLeft,
    anchorWidth,
    anchorHeight,
    viewportWidth,
    viewportHeight,
    maxViewportHeight,
    topOffset,
    minimumWidth = 0,
    alignToAnchorStart = false
  }) {
    const safeAnchorWidth = Math.max(0, Number(anchorWidth) || 0);
    const safeAnchorHeight = Math.max(0, Number(anchorHeight) || 0);
    const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
    const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
    const heightLimit = Math.min(
      80,
      Math.max(35, Number(maxViewportHeight) || 55)
    );
    const safeTop = Math.max(0, Number(topOffset) || 0);
    const availableHeight = Math.max(0, safeViewportHeight - safeTop);
    const configuredMaxHeight = safeViewportHeight * (heightLimit / 100);
    const safeMinimumWidth = Math.min(
      safeAnchorWidth,
      Math.max(0, Number(minimumWidth) || 0)
    );
    const minimumHeight = safeAnchorWidth > 0
      ? safeAnchorHeight * (safeMinimumWidth / safeAnchorWidth)
      : 0;
    const maxHeight = Math.min(
      availableHeight,
      Math.max(configuredMaxHeight, minimumHeight)
    );
    const widthScale = safeAnchorWidth > 0
      ? Math.min(1, safeViewportWidth / safeAnchorWidth)
      : 0;
    const heightScale = safeAnchorHeight > 0
      ? Math.min(1, maxHeight / safeAnchorHeight)
      : 0;
    const scale = Math.min(widthScale, heightScale);
    const width = safeAnchorWidth * scale;
    const height = safeAnchorHeight * scale;
    const preferredLeft = (Number(anchorLeft) || 0) +
      (alignToAnchorStart ? 0 : (safeAnchorWidth - width) / 2);
    const left = Math.min(
      Math.max(0, preferredLeft),
      Math.max(0, safeViewportWidth - width)
    );

    return {
      top: safeTop,
      left,
      width,
      height,
      placeholderWidth: safeAnchorWidth,
      placeholderHeight: safeAnchorHeight
    };
  }

  function calculateStickyModulePositions({
    stickyTop,
    modulePageTop,
    playerPageTop,
    videoInfoPageTop,
    upInfoPageTop
  }) {
    const safeStickyTop = Math.max(0, Number(stickyTop) || 0);
    const safeModulePageTop = Number(modulePageTop) || 0;
    const positionFor = (pageTop) => {
      if (pageTop === null || pageTop === undefined) {
        return null;
      }

      const numericPageTop = Number(pageTop);
      return Number.isFinite(numericPageTop)
        ? safeStickyTop + Math.max(0, numericPageTop - safeModulePageTop)
        : null;
    };

    return {
      videoInfoTop: positionFor(videoInfoPageTop),
      upInfoTop: positionFor(upInfoPageTop),
      playerTop: positionFor(playerPageTop) ?? safeStickyTop
    };
  }

  function detectPlayerMode({ screen, playerWidth, wrapperWidth }) {
    if (PAGE_MODES.includes(screen)) {
      return screen;
    }

    const safePlayerWidth = Math.max(0, Number(playerWidth) || 0);
    const safeWrapperWidth = Math.max(0, Number(wrapperWidth) || 0);
    return safePlayerWidth > safeWrapperWidth + 8 ? "wide" : "normal";
  }

  function calculateStickyTop({ topOffset, avoidHeader, headerBottom }) {
    const safeOffset = Math.min(32, Math.max(0, Number(topOffset) || 0));
    const safeHeaderBottom = avoidHeader
      ? Math.min(160, Math.max(0, Number(headerBottom) || 0))
      : 0;
    return safeHeaderBottom + safeOffset;
  }

  const api = Object.freeze({
    PAGE_MODES,
    calculatePlayerGeometry,
    calculateStickyModulePositions,
    calculateStickyTop,
    detectPlayerMode
  });
  globalScope.BilibiliToolboxStickyLayout = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "undefined" ? self : globalThis);
