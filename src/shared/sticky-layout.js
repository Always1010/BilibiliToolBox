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
    topOffset
  }) {
    const safeAnchorWidth = Math.max(0, Number(anchorWidth) || 0);
    const safeAnchorHeight = Math.max(0, Number(anchorHeight) || 0);
    const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
    const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
    const heightLimit = Math.min(
      80,
      Math.max(35, Number(maxViewportHeight) || 55)
    );
    const maxHeight = safeViewportHeight * (heightLimit / 100);
    const widthScale = safeAnchorWidth > 0
      ? Math.min(1, safeViewportWidth / safeAnchorWidth)
      : 0;
    const heightScale = safeAnchorHeight > 0
      ? Math.min(1, maxHeight / safeAnchorHeight)
      : 0;
    const scale = Math.min(widthScale, heightScale);
    const width = safeAnchorWidth * scale;
    const height = safeAnchorHeight * scale;
    const preferredLeft =
      (Number(anchorLeft) || 0) + (safeAnchorWidth - width) / 2;
    const left = Math.min(
      Math.max(0, preferredLeft),
      Math.max(0, safeViewportWidth - width)
    );

    return {
      top: Math.max(0, Number(topOffset) || 0),
      left,
      width,
      height,
      placeholderWidth: safeAnchorWidth,
      placeholderHeight: safeAnchorHeight
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

  const api = Object.freeze({
    PAGE_MODES,
    calculatePlayerGeometry,
    detectPlayerMode
  });
  globalScope.BilibiliToolboxStickyLayout = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "undefined" ? self : globalThis);
