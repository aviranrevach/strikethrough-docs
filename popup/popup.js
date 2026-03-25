(() => {
  'use strict';

  const DEFAULTS = {
    strikethrough: true,
    changeCase: true,
    insertImageDrive: true,
    randomizeRange: true
  };
  const KEYS = Object.keys(DEFAULTS);
  const toggles = {};
  const statusEl = () => document.getElementById('status');

  function init() {
    KEYS.forEach((key) => {
      toggles[key] = document.getElementById(`toggle-${key}`);
    });

    chrome.storage.sync.get({ enabledButtons: DEFAULTS }, (result) => {
      const saved = result.enabledButtons;
      KEYS.forEach((key) => {
        toggles[key].checked = saved[key] !== false;
      });
    });

    KEYS.forEach((key) => {
      toggles[key].addEventListener('change', saveSettings);
    });
  }

  function saveSettings() {
    const enabledButtons = {};
    KEYS.forEach((key) => {
      enabledButtons[key] = toggles[key].checked;
    });

    chrome.storage.sync.set({ enabledButtons }, () => {
      showStatus('Settings saved');
    });
  }

  function showStatus(message) {
    const el = statusEl();
    el.textContent = message;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 1500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
