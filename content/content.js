(() => {
  'use strict';

  const EXTENSION_PREFIX = 'gdte';
  const BUTTONS_CONFIG = {
    strikethrough: { id: `${EXTENSION_PREFIX}-strikethrough` },
    changeCase: { id: `${EXTENSION_PREFIX}-change-case` }
  };

  let settings = {};
  let injectedButtons = {};
  let changeCaseDropdownOpen = false;
  let menuBusy = false;

  // --- Settings ---

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ enabledButtons: { strikethrough: true, changeCase: true } }, (result) => {
        settings = result.enabledButtons;
        resolve(settings);
      });
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabledButtons) {
      settings = changes.enabledButtons.newValue;
      updateButtonVisibility();
    }
  });

  // --- Google Docs Menu Automation ---
  // Google Docs uses Google Closure Library for menus.
  // - Top-level menus open on mousedown
  // - Submenu parents open their submenu on mouseover/mouseenter (NOT click)
  // - Leaf menu items activate on click
  // - We only search within visible .goog-menu popups

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getCenter(el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function mouseOpts(el, extra = {}) {
    const { x, y } = getCenter(el);
    return { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, ...extra };
  }

  function hoverItem(el) {
    // Hover to highlight and open submenu (Closure pattern)
    el.dispatchEvent(new MouseEvent('mouseover', mouseOpts(el)));
    el.dispatchEvent(new MouseEvent('mouseenter', mouseOpts(el)));
    el.dispatchEvent(new MouseEvent('mousemove', mouseOpts(el)));
  }

  function clickItem(el) {
    // Full click sequence for leaf menu items
    const opts = mouseOpts(el);
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function pressEscape() {
    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true
    }));
  }

  function findVisibleMenuItem(label) {
    // Search menus that are in the DOM and not display:none
    // (we use opacity:0 to hide them visually, so skip visibility check)
    const menus = document.querySelectorAll('.goog-menu');
    for (const menu of menus) {
      const style = window.getComputedStyle(menu);
      if (style.display === 'none') continue;

      const items = menu.querySelectorAll('.goog-menuitem');
      for (const item of items) {
        const content = item.querySelector('.goog-menuitem-content');
        if (!content) continue;
        const firstChild = content.firstChild;
        const text = firstChild ? firstChild.textContent.trim() : content.textContent.trim();
        if (text === label) return item;
      }
    }

    // Partial match fallback
    for (const menu of document.querySelectorAll('.goog-menu')) {
      const style = window.getComputedStyle(menu);
      if (style.display === 'none') continue;

      const items = menu.querySelectorAll('.goog-menuitem');
      for (const item of items) {
        const content = item.querySelector('.goog-menuitem-content');
        if (!content) continue;
        if (content.textContent.trim().includes(label)) return item;
      }
    }

    return null;
  }

  function hideMenus() {
    // Inject a style to make menus invisible while we automate them.
    // Uses opacity:0 so elements stay in the DOM and receive events,
    // but the user sees no menu flicker.
    const style = document.createElement('style');
    style.id = `${EXTENSION_PREFIX}-menu-cloak`;
    style.textContent = `
      .goog-menu { opacity: 0 !important; }
      .goog-menubar .goog-control-open,
      .goog-menubar .goog-control-hover {
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    return style;
  }

  function showMenus(style) {
    if (style && style.parentNode) style.remove();
  }

  async function navigateMenu(...labels) {
    if (menuBusy) return false;
    menuBusy = true;

    // Hide all menus visually so the user sees nothing
    const cloak = hideMenus();

    try {
      // Step 1: Open the top-level menu
      const topLabel = labels[0];
      const topMenu = document.getElementById(`docs-${topLabel.toLowerCase()}-menu`);
      if (!topMenu) {
        console.warn('[GDTE] Top menu not found:', topLabel);
        return false;
      }

      topMenu.dispatchEvent(new MouseEvent('mousedown', mouseOpts(topMenu)));
      await sleep(350);

      // Step 2: Navigate through items
      for (let i = 1; i < labels.length; i++) {
        const label = labels[i];
        const isLast = i === labels.length - 1;

        const item = findVisibleMenuItem(label);
        if (!item) {
          console.warn('[GDTE] Item not found:', label);
          pressEscape();
          return false;
        }

        if (isLast) {
          hoverItem(item);
          await sleep(100);
          clickItem(item);
        } else {
          hoverItem(item);
          await sleep(400);
        }
      }

      return true;
    } finally {
      showMenus(cloak);
      menuBusy = false;
    }
  }

  // --- Toolbar Detection & Injection ---

  function getInsertionReference() {
    const underlineBtn = document.querySelector('[aria-label*="Underline"]');
    if (underlineBtn) {
      return { reference: underlineBtn.nextElementSibling, parent: underlineBtn.parentElement };
    }

    const boldBtn = document.querySelector('[aria-label*="Bold"]');
    if (boldBtn) {
      let node = boldBtn;
      while (node.nextElementSibling) {
        const label = node.nextElementSibling.getAttribute('aria-label') || '';
        if (label.includes('Italic') || label.includes('Underline')) {
          node = node.nextElementSibling;
        } else {
          break;
        }
      }
      return { reference: node.nextElementSibling, parent: node.parentElement };
    }

    return null;
  }

  function injectButtons() {
    if (document.getElementById(BUTTONS_CONFIG.strikethrough.id)) return true;

    const insertion = getInsertionReference();
    if (!insertion || !insertion.parent) return false;

    const container = document.createElement('div');
    container.className = `${EXTENSION_PREFIX}-container`;

    const separator = document.createElement('div');
    separator.className = `${EXTENSION_PREFIX}-separator`;
    container.appendChild(separator);

    const strikeBtn = createStrikethroughButton();
    injectedButtons.strikethrough = strikeBtn;
    container.appendChild(strikeBtn);

    const caseBtn = createChangeCaseButton();
    injectedButtons.changeCase = caseBtn;
    container.appendChild(caseBtn);

    if (insertion.reference) {
      insertion.parent.insertBefore(container, insertion.reference);
    } else {
      insertion.parent.appendChild(container);
    }

    updateButtonVisibility();
    return true;
  }

  // --- Strikethrough Button ---

  function createStrikethroughButton() {
    const btn = document.createElement('div');
    btn.id = BUTTONS_CONFIG.strikethrough.id;
    btn.className = `${EXTENSION_PREFIX}-btn`;
    btn.setAttribute('role', 'button');
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    const shortcut = isMac ? '⌘⇧X' : 'Alt+Shift+5';
    btn.setAttribute('data-tooltip', `Strikethrough (${shortcut})`);
    btn.setAttribute('aria-label', `Strikethrough (${shortcut})`);
    btn.setAttribute('tabindex', '0');

    btn.innerHTML = `
      <svg viewBox="0 0 24 24" class="${EXTENSION_PREFIX}-icon" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 12.5h19v-1.2h-19v1.2z" fill="currentColor"/>
        <text x="12" y="12.2" text-anchor="middle" dominant-baseline="central"
              font-family="Arial, sans-serif" font-size="19" font-weight="700"
              fill="currentColor">S</text>
      </svg>
    `;

    // Prevent mousedown from stealing focus/selection from the document
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateMenu('Format', 'Text', 'Strikethrough');
    });

    return btn;
  }

  // --- Change Case Button ---

  function createChangeCaseButton() {
    const wrapper = document.createElement('div');
    wrapper.id = BUTTONS_CONFIG.changeCase.id;
    wrapper.className = `${EXTENSION_PREFIX}-case-wrapper`;

    const btn = document.createElement('div');
    btn.className = `${EXTENSION_PREFIX}-btn ${EXTENSION_PREFIX}-case-btn`;
    btn.setAttribute('role', 'button');
    btn.setAttribute('data-tooltip', 'Change case');
    btn.setAttribute('aria-label', 'Change case');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');

    btn.innerHTML = `
      <span class="${EXTENSION_PREFIX}-case-label">Aa</span>
      <svg class="${EXTENSION_PREFIX}-dropdown-arrow" viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    wrapper.appendChild(btn);

    const dropdown = createChangeCaseDropdown();
    wrapper.appendChild(dropdown);

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleChangeCaseDropdown(dropdown, btn);
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target) && changeCaseDropdownOpen) {
        closeChangeCaseDropdown(dropdown, btn);
      }
    });

    return wrapper;
  }

  function createChangeCaseDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = `${EXTENSION_PREFIX}-dropdown`;

    const options = [
      { label: 'UPPERCASE', icon: 'AA' },
      { label: 'lowercase', icon: 'aa' },
      { label: 'Title Case', icon: 'Ab' },
    ];

    options.forEach((opt) => {
      const item = document.createElement('div');
      item.className = `${EXTENSION_PREFIX}-dropdown-item`;

      const icon = document.createElement('span');
      icon.className = `${EXTENSION_PREFIX}-dropdown-icon`;
      icon.textContent = opt.icon;
      item.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = opt.label;
      item.appendChild(label);
      item.setAttribute('role', 'menuitem');

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeChangeCaseDropdown(dropdown, dropdown.previousElementSibling);
        navigateMenu('Format', 'Text', 'Capitalization', opt.label);
      });
      dropdown.appendChild(item);
    });

    return dropdown;
  }

  function toggleChangeCaseDropdown(dropdown, btn) {
    if (changeCaseDropdownOpen) {
      closeChangeCaseDropdown(dropdown, btn);
    } else {
      dropdown.classList.add(`${EXTENSION_PREFIX}-dropdown-open`);
      btn.setAttribute('aria-expanded', 'true');
      changeCaseDropdownOpen = true;
    }
  }

  function closeChangeCaseDropdown(dropdown, btn) {
    dropdown.classList.remove(`${EXTENSION_PREFIX}-dropdown-open`);
    btn?.setAttribute('aria-expanded', 'false');
    changeCaseDropdownOpen = false;
  }

  // --- Visibility ---

  function updateButtonVisibility() {
    if (injectedButtons.strikethrough) {
      injectedButtons.strikethrough.style.display = settings.strikethrough !== false ? '' : 'none';
    }
    if (injectedButtons.changeCase) {
      injectedButtons.changeCase.style.display = settings.changeCase !== false ? '' : 'none';
    }
  }

  // --- Toolbar Observer (debounced) ---

  let observerTimer = null;

  function startObserver() {
    injectButtons();

    const observer = new MutationObserver(() => {
      if (observerTimer) return;
      observerTimer = setTimeout(() => {
        observerTimer = null;
        if (!document.getElementById(BUTTONS_CONFIG.strikethrough.id)) {
          injectButtons();
        }
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // --- Init ---

  async function init() {
    await loadSettings();

    if (document.readyState === 'complete') {
      startObserver();
    } else {
      window.addEventListener('load', startObserver);
    }
  }

  init();
})();
