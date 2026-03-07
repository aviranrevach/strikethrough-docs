(() => {
  'use strict';

  const DEFAULTS = { strikethrough: true, changeCase: true };
  const toggles = {};
  const statusEl = () => document.getElementById('status');

  function init() {
    toggles.strikethrough = document.getElementById('toggle-strikethrough');
    toggles.changeCase = document.getElementById('toggle-changeCase');

    // Load saved settings
    chrome.storage.sync.get({ enabledButtons: DEFAULTS }, (result) => {
      const saved = result.enabledButtons;
      toggles.strikethrough.checked = saved.strikethrough !== false;
      toggles.changeCase.checked = saved.changeCase !== false;
    });

    // Listen for changes
    Object.keys(toggles).forEach((key) => {
      toggles[key].addEventListener('change', saveSettings);
    });
  }

  function saveSettings() {
    const enabledButtons = {
      strikethrough: toggles.strikethrough.checked,
      changeCase: toggles.changeCase.checked
    };

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
