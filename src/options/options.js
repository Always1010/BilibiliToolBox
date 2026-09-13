(function initializeOptionsPage() {
  "use strict";

  const api = globalThis.BilibiliToolboxSettings;
  const elements = {
    defaultWideEnabled: document.querySelector("#default-wide-enabled"),
    enabled: document.querySelector("#sticky-enabled"),
    details: document.querySelector("#sticky-details"),
    maxHeight: document.querySelector("#max-height"),
    maxHeightValue: document.querySelector("#max-height-value"),
    avoidHeader: document.querySelector("#avoid-header"),
    topOffset: document.querySelector("#top-offset"),
    topOffsetValue: document.querySelector("#top-offset-value"),
    resetButton: document.querySelector("#reset-button"),
    saveStatus: document.querySelector("#save-status")
  };

  let settings = api.cloneDefaults();
  let saveTimer = 0;
  let statusTimer = 0;

  void restore();

  elements.defaultWideEnabled.addEventListener("change", handleInput);
  elements.enabled.addEventListener("change", handleInput);
  elements.maxHeight.addEventListener("input", handleInput);
  elements.avoidHeader.addEventListener("change", handleInput);
  elements.topOffset.addEventListener("input", handleInput);
  elements.resetButton.addEventListener("click", resetSettings);

  async function restore() {
    const stored = await chrome.storage.sync.get(api.STORAGE_KEY);
    settings = api.sanitizeSettings(stored[api.STORAGE_KEY]);
    render();
  }

  function handleInput() {
    readForm();
    renderValues();
    scheduleSave();
  }

  function readForm() {
    settings = api.sanitizeSettings({
      ...settings,
      defaultWideMode: {
        enabled: elements.defaultWideEnabled.checked
      },
      stickyPlayer: {
        enabled: elements.enabled.checked,
        avoidHeader: elements.avoidHeader.checked,
        maxViewportHeight: elements.maxHeight.value,
        topOffset: elements.topOffset.value
      }
    });
  }

  function render() {
    const sticky = settings.stickyPlayer;
    elements.defaultWideEnabled.checked = settings.defaultWideMode.enabled;
    elements.enabled.checked = sticky.enabled;
    elements.avoidHeader.checked = sticky.avoidHeader;
    elements.maxHeight.value = String(sticky.maxViewportHeight);
    elements.topOffset.value = String(sticky.topOffset);
    renderValues();
  }

  function renderValues() {
    const disabled = !elements.enabled.checked;
    elements.details.setAttribute("aria-disabled", String(disabled));
    elements.maxHeight.disabled = disabled;
    elements.avoidHeader.disabled = disabled;
    elements.topOffset.disabled = disabled;
    elements.maxHeightValue.value = `${elements.maxHeight.value}%`;
    elements.maxHeightValue.textContent = `${elements.maxHeight.value}%`;
    elements.topOffsetValue.value = `${elements.topOffset.value} px`;
    elements.topOffsetValue.textContent = `${elements.topOffset.value} px`;
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    showStatus("正在保存…");
    saveTimer = window.setTimeout(save, 180);
  }

  async function save() {
    await chrome.storage.sync.set({ [api.STORAGE_KEY]: settings });
    showStatus("设置已保存");
  }

  async function resetSettings() {
    settings = api.cloneDefaults();
    render();
    await chrome.storage.sync.set({ [api.STORAGE_KEY]: settings });
    showStatus("已恢复默认设置");
  }

  function showStatus(message) {
    window.clearTimeout(statusTimer);
    elements.saveStatus.textContent = message;
    statusTimer = window.setTimeout(() => {
      elements.saveStatus.textContent = "";
    }, 1800);
  }
})();
