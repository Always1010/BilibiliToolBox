importScripts("../shared/settings.js");

const settingsApi = globalThis.BilibiliToolboxSettings;

chrome.runtime.onInstalled.addListener(() => {
  void ensureSettingsExist();
});

async function ensureSettingsExist() {
  const stored = await chrome.storage.sync.get(settingsApi.STORAGE_KEY);
  const current = stored[settingsApi.STORAGE_KEY];
  const normalized = settingsApi.sanitizeSettings(current);

  await chrome.storage.sync.set({
    [settingsApi.STORAGE_KEY]: normalized
  });
}

