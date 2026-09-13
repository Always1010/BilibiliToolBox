(function initializeStickyLayout(globalScope) {
  "use strict";

  function calculatePlayerGeometry({
    anchorLeft,
    anchorWidth,
    aspectRatio,
    viewportWidth,
    viewportHeight,
    maxViewportHeight,
    topOffset
  }) {
    const safeRatio =
      Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
    const safeAnchorWidth = Math.max(0, Number(anchorWidth) || 0);
    const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
    const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
    const heightLimit = Math.min(
      80,
      Math.max(35, Number(maxViewportHeight) || 55)
    );
    const availableWidth = Math.min(safeAnchorWidth, safeViewportWidth);
    const height = Math.min(
      availableWidth / safeRatio,
      safeViewportHeight * (heightLimit / 100)
    );
    const width = Math.min(availableWidth, height * safeRatio);
    const left = Math.max(
      0,
      (Number(anchorLeft) || 0) + (safeAnchorWidth - width) / 2
    );

    return {
      top: Math.max(0, Number(topOffset) || 0),
      left,
      width,
      height,
      placeholderHeight: availableWidth / safeRatio
    };
  }

  const api = Object.freeze({ calculatePlayerGeometry });
  globalScope.BilibiliToolboxStickyLayout = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "undefined" ? self : globalThis);

