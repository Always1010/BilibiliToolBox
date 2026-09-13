(function initializeSettings(globalScope) {
  "use strict";

  const STORAGE_KEY = "settings";
  const DEFAULT_SETTINGS = Object.freeze({
    schemaVersion: 3,
    defaultWideMode: Object.freeze({
      enabled: false
    }),
    stickyPlayer: Object.freeze({
      enabled: false,
      avoidHeader: true,
      topOffset: 0,
      maxViewportHeight: 55
    })
  });

  function clampInteger(value, minimum, maximum, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, Math.round(number)));
  }

  function sanitizeSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    const defaultWideMode =
      source.defaultWideMode && typeof source.defaultWideMode === "object"
        ? source.defaultWideMode
        : {};
    const stickyPlayer =
      source.stickyPlayer && typeof source.stickyPlayer === "object"
        ? source.stickyPlayer
        : {};

    return {
      schemaVersion: DEFAULT_SETTINGS.schemaVersion,
      defaultWideMode: {
        enabled:
          typeof defaultWideMode.enabled === "boolean"
            ? defaultWideMode.enabled
            : DEFAULT_SETTINGS.defaultWideMode.enabled
      },
      stickyPlayer: {
        enabled:
          typeof stickyPlayer.enabled === "boolean"
            ? stickyPlayer.enabled
            : DEFAULT_SETTINGS.stickyPlayer.enabled,
        avoidHeader:
          typeof stickyPlayer.avoidHeader === "boolean"
            ? stickyPlayer.avoidHeader
            : DEFAULT_SETTINGS.stickyPlayer.avoidHeader,
        topOffset: clampInteger(
          stickyPlayer.topOffset,
          0,
          32,
          DEFAULT_SETTINGS.stickyPlayer.topOffset
        ),
        maxViewportHeight: clampInteger(
          stickyPlayer.maxViewportHeight,
          35,
          80,
          DEFAULT_SETTINGS.stickyPlayer.maxViewportHeight
        )
      }
    };
  }

  function cloneDefaults() {
    return sanitizeSettings(DEFAULT_SETTINGS);
  }

  const api = Object.freeze({
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    sanitizeSettings,
    cloneDefaults
  });

  globalScope.BilibiliToolboxSettings = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "undefined" ? self : globalThis);
