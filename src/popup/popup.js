(function initializePopup() {
  "use strict";

  const api = globalThis.BilibiliToolboxSettings;
  const toggle = document.querySelector("#sticky-enabled");
  const status = document.querySelector("#feature-status");
  const optionsButton = document.querySelector("#open-options");
  let settings = api.cloneDefaults();

  void restore();

  toggle.addEventListener("change", async () => {
    settings.stickyPlayer.enabled = toggle.checked;
    settings = api.sanitizeSettings(settings);
    await chrome.storage.sync.set({ [api.STORAGE_KEY]: settings });
    render();
  });

  optionsButton.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage();
  });

  async function restore() {
    const stored = await chrome.storage.sync.get(api.STORAGE_KEY);
    settings = api.sanitizeSettings(stored[api.STORAGE_KEY]);
    render();
  }

  function render() {
    toggle.checked = settings.stickyPlayer.enabled;
    status.textContent = toggle.checked
      ? "标题、UP 主与播放器驻留"
      : "使用 B 站默认行为";
  }
})();
