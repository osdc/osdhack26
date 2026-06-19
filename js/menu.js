/* ============================================================
 * menu.js — Retro Arcade Dashboard & Grid Menu Controller
 * ============================================================
 * PURPOSE:
 *   Handles 2D grid selection of the 12 hackathon modules,
 *   updates the Hero Select-style details panel with typewriter
 *   text and animated stat bars, and manages the OutRun HUD.
 * ============================================================ */

const MenuScreen = (() => {
  'use strict';

  const $ = Utils.$;
  let active = false;
  let currentIndex = 0;
  let previousIndex = -1;
  let activeIndex = -1;
  let exploredModules = new Set();
  let gridNodes = [];
  let countdownInterval = null;

  // Grid Dimensions: 5 columns, 3 rows (last row items calculated dynamically)
  const COLS = 5;
  const ROWS = 3;

  /* ---- SHOW MENU SCREEN ---- */
  function show() {
    const screen = $('menuScreen');
    if (!screen) return;

    // Apply config background if configured
    Utils.setBackground(screen, CONFIG.menuBackground);

    // Build the grid UI nodes
    buildGrid();

    // Init HUD
    updateHUD();
    updateCountdown();
    startCountdown();

    // Show screen
    screen.classList.add('active');
    active = true;

    // Focus initial node
    updateSelection();
    updateDetails(0);
    bindInputs();

    // Bind popup close button
    const closeBtn = $('popupCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = hidePopup;
    }

    // Close popup on overlay click (not on popup itself)
    const overlay = $('arcadePopupOverlay');
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) hidePopup();
      };
    }
  }

  /* ---- BUILD MODULE GRID ---- */
  function buildGrid() {
    const grid = $('arcadeGrid');
    if (!grid) return;
    grid.innerHTML = '';
    gridNodes = [];

    CONFIG.menuItems.forEach((item, i) => {
      const nodeClasses = ['grid-node'];
      const isFolder = item.id === 'games' || item.id === 'sponsors';
      if (isFolder) nodeClasses.push('folder-node');
      const node = Utils.createElement('div', nodeClasses.join(' '));
      node.style.setProperty('--node-color', item.color || '#ffd700');
      node.setAttribute('data-id', item.id);
      node.setAttribute('data-index', i);

      // Icon Wrapper
      const iconWrap = Utils.createElement('div', 'grid-node-icon');
      if (item.iconPath) {
        const img = Utils.createElement('img', 'grid-node-img');
        img.src = item.iconPath;
        img.draggable = false;
        iconWrap.appendChild(img);
      } else {
        iconWrap.innerHTML = item.svg || '⭐';
      }
      node.appendChild(iconWrap);

      // Label
      const label = Utils.createElement('div', 'grid-node-label');
      label.textContent = item.label;
      node.appendChild(label);

      // Mouse events
      node.addEventListener('mouseenter', () => {
        if (!active) return;
        if (i !== currentIndex) {
          previousIndex = currentIndex;
          currentIndex = i;
          updateSelection();
        }
      });

      node.addEventListener('click', () => {
        if (!active) return;
        currentIndex = i;
        selectCurrent();
      });

      // Restore explored state
      if (exploredModules.has(item.id)) {
        node.classList.add('explored');
      }

      grid.appendChild(node);
      gridNodes.push(node);
    });
  }

  /* ---- GRID NAVIGATION MATH ----
   * Grid dimensions: 5 columns, 3 rows.
   * Row 0: 0, 1, 2, 3, 4
   * Row 1: 5, 6, 7, 8, 9
   * Row 2: 10, 11
   */
  function navigateGrid(dx, dy) {
    if (!active) return;

    let row = Math.floor(currentIndex / COLS);
    let col = currentIndex % COLS;

    // Moving Left/Right
    const totalItems = CONFIG.menuItems.length;
    const lastRowCols = totalItems % COLS || COLS;
    if (dx !== 0) {
      col += dx;
      let colsInRow = (row === ROWS - 1) ? lastRowCols : COLS;
      if (col < 0) {
        col = colsInRow - 1;
      } else if (col >= colsInRow) {
        col = 0;
      }
    }

    // Moving Up/Down
    if (dy !== 0) {
      row += dy;
      if (row < 0) {
        row = ROWS - 1;
      } else if (row >= ROWS) {
        row = 0;
      }

      // Handle last-row column clamp
      let colsInRow = (row === ROWS - 1) ? lastRowCols : COLS;
      if (col >= colsInRow) {
        col = colsInRow - 1;
      }
    }

    previousIndex = currentIndex;
    currentIndex = row * COLS + col;
    updateSelection();
  }

  /* ---- UPDATE VISUAL SELECTION ONLY ---- */
  function updateSelection() {
    gridNodes.forEach((node, i) => {
      node.classList.toggle('selected', i === currentIndex);
    });

    const item = CONFIG.menuItems[currentIndex];
    if (!item) return;

    // Play hover SFX
    Audio.playHover();

    // Mark as explored if first time visiting
    if (!exploredModules.has(item.id)) {
      exploredModules.add(item.id);
      const node = gridNodes[currentIndex];
      if (node) node.classList.add('explored');
      updateHUD();
    }
  }

  /* ---- UPDATE DETAIL PANEL (on click/enter only) ---- */
  function updateDetails(index) {
    if (index === activeIndex) return;
    activeIndex = index;

    const item = CONFIG.menuItems[index];
    if (!item) return;

    const detailsPanel = $('arcadeDetailsPanel');
    const titleEl = $('detailsTitle');
    const iconEl = $('detailsIconWrapper');
    const statsEl = $('detailsStatsBlock');
    const infoEl = $('detailsInfoBox');
    const actionBtn = $('detailsActionBtn');

    if (detailsPanel) {
      detailsPanel.style.borderColor = item.color;
      detailsPanel.style.boxShadow = `0 0 15px ${item.color}5a, 0 0 40px ${item.color}1a, inset 0 0 15px ${item.color}26`;
      const headerBorder = detailsPanel.querySelector('.details-header-border');
      if (headerBorder) {
        headerBorder.style.borderColor = item.color;
        headerBorder.style.setProperty('--header-glow', item.color);
      }
      const headerText = detailsPanel.querySelector('.details-header');
      if (headerText) headerText.style.color = item.color;
    }

    if (titleEl) {
      titleEl.textContent = item.label;
      titleEl.style.color = item.color;
      titleEl.style.textShadow = `0 0 6px ${item.color}80, 0 0 15px ${item.color}40`;
    }

    if (iconEl) {
      iconEl.style.borderColor = item.color;
      iconEl.style.boxShadow = `0 0 8px ${item.color}40, inset 0 0 10px rgba(0,0,0,0.5)`;
      if (item.iconPath) {
        let img = iconEl.querySelector('.grid-node-img');
        if (!img) {
          iconEl.innerHTML = '';
          img = Utils.createElement('img', 'grid-node-img');
          img.draggable = false;
          iconEl.appendChild(img);
        }
        img.src = item.iconPath;
      } else {
        iconEl.innerHTML = item.svg || '⭐';
        const svg = iconEl.querySelector('svg');
        if (svg) svg.style.filter = `drop-shadow(0 0 3px ${item.color}) drop-shadow(0 0 8px ${item.color})`;
      }
    }

    // Typewriter info text
    if (infoEl && item.info) {
      typewriteInfo(infoEl, item.info, item.color);
    }

    if (actionBtn) {
      actionBtn.href = item.actionLink || '#';
      actionBtn.textContent = `[ ${item.actionText || 'SELECT'} ]`;
      actionBtn.style.color = item.color;
      actionBtn.style.borderColor = item.color;

      actionBtn.onmouseenter = () => {
        actionBtn.style.background = item.color;
        actionBtn.style.color = '#000';
        actionBtn.style.boxShadow = `0 0 10px ${item.color}, 0 0 30px ${item.color}40`;
      };
      actionBtn.onmouseleave = () => {
        actionBtn.style.background = 'rgba(10, 14, 26, 0.9)';
        actionBtn.style.color = item.color;
        actionBtn.style.boxShadow = 'none';
      };

      // If item has a popup, show it on action button click instead of navigating
      if (item.popup) {
        actionBtn.href = '#';
        actionBtn.onclick = (e) => {
          e.preventDefault();
          showPopup(item.popup);
        };
      } else {
        actionBtn.onclick = null;
      }
    }

    // Animated Stats
    if (statsEl && item.stats) {
      renderAnimatedStats(statsEl, item.stats, item.color);
    }
  }

  /* ---- TYPEWRITER INFO TEXT ---- */
  function typewriteInfo(infoEl, text, color) {
    // Cancel any ongoing typewriter
    if (infoEl._typewriterTimer) {
      clearInterval(infoEl._typewriterTimer);
    }
    if (infoEl._typewriterCleanup) {
      infoEl._typewriterCleanup();
    }

    infoEl.innerHTML = '';
    infoEl.style.color = '#fffdec';
    let idx = 0;
    const speed = 12;

    // Add cursor
    const cursor = Utils.createElement('span', 'cursor-blink');
    infoEl.appendChild(cursor);

    function tick() {
      if (idx >= text.length) {
        clearInterval(infoEl._typewriterTimer);
        cursor.remove();
        return;
      }
      // Insert cursor before the cursor element
      const char = document.createTextNode(text[idx]);
      infoEl.insertBefore(char, cursor);
      idx++;
    }

    infoEl._typewriterTimer = setInterval(tick, speed);
    infoEl._typewriterCleanup = () => {
      if (infoEl._typewriterTimer) {
        clearInterval(infoEl._typewriterTimer);
        infoEl._typewriterTimer = null;
      }
    };
  }

  /* ---- ANIMATED STAT BARS ---- */
  function renderAnimatedStats(statsEl, stats, color) {
    const entries = Object.entries(stats);
    let html = '';
    entries.forEach(([key, val], i) => {
      let bars = '';
      for (let b = 0; b < 5; b++) {
        const filled = b < val;
        bars += `<span style="animation-delay: ${(i * 0.08 + b * 0.04)}s; color: ${filled ? color : 'rgba(255,255,255,0.2)'}">${filled ? '■' : '□'}</span>`;
      }
      html += `
        <div class="stat-row" style="animation-delay: ${i * 0.06}s">
          <span class="stat-label">${key}</span>
          <span class="stat-bar" style="color: ${color}">${bars}</span>
        </div>
      `;
    });
    statsEl.innerHTML = html;
  }

  /* ---- SELECT CURRENT (ENTER/CLICK) ---- */
  function selectCurrent() {
    if (!active) return;
    const item = CONFIG.menuItems[currentIndex];
    if (!item) return;

    Audio.playSelect();

    // Trigger grid flash effect
    const node = gridNodes[currentIndex];
    if (node) {
      node.style.animation = 'none';
      void node.offsetWidth; // trigger reflow
      node.style.animation = 'glitchScanline 0.15s 2';
    }

    // Update detail panel to clicked item
    updateDetails(currentIndex);

    // Open action link if configured
    if (item.actionLink && item.actionLink !== '#') {
      setTimeout(() => {
        window.open(item.actionLink, '_blank');
      }, 300);
    }
  }

  /* ---- POPUP SHOW / HIDE ---- */
  function showPopup(popup) {
    const overlay = $('arcadePopupOverlay');
    const titleEl = $('popupTitlebarText');
    const bodyEl = $('popupBody');
    if (!overlay) return;
    if (titleEl) titleEl.textContent = popup.title;
    if (bodyEl) bodyEl.innerHTML = popup.body;
    // Scroll to top when opening
    if (bodyEl) bodyEl.scrollTop = 0;
    overlay.classList.add('active');
  }

  function hidePopup() {
    const overlay = $('arcadePopupOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  /* ---- COUNTDOWN ---- */
  function updateCountdown() {
    const el = $('hudCountdownVal');
    if (!el) return;
    const now = new Date();
    const event = new Date('2026-07-10T00:00:00');
    const diff = Math.ceil((event - now) / (1000 * 60 * 60 * 24));
    if (diff > 0) {
      el.textContent = diff + '  DAYS';
    } else if (diff === 0) {
      el.textContent = 'TODAY!';
    } else {
      el.textContent = 'LIVE!';
    }
  }

  function startCountdown() {
    stopCountdown();
    countdownInterval = setInterval(updateCountdown, 60000);
  }

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  /* ---- UPDATE TOP HUD DISPLAYS ---- */
  function updateHUD() {
    const exploredVal = $('hudExploredVal');

    if (exploredVal) {
      exploredVal.textContent = `${String(exploredModules.size).padStart(2, '0')}/${String(CONFIG.menuItems.length).padStart(2, '0')}`;
    }
  }

  /* ---- INPUT BINDING ---- */
  function bindInputs() {
    document.addEventListener('keydown', onKey);
    document.addEventListener('gamepad:left',  () => navigateGrid(-1, 0));
    document.addEventListener('gamepad:right', () => navigateGrid(1, 0));
    document.addEventListener('gamepad:up',    () => navigateGrid(0, -1));
    document.addEventListener('gamepad:down',  () => navigateGrid(0, 1));
    document.addEventListener('gamepad:a',     () => selectCurrent());
  }

  function onKey(e) {
    if (!active) return;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': e.preventDefault(); navigateGrid(-1, 0); break;
      case 'ArrowRight': case 'KeyD': e.preventDefault(); navigateGrid(1, 0); break;
      case 'ArrowUp': case 'KeyW': e.preventDefault(); navigateGrid(0, -1); break;
      case 'ArrowDown': case 'KeyS': e.preventDefault(); navigateGrid(0, 1); break;
      case 'Enter': case 'Space': e.preventDefault(); selectCurrent(); break;
      case 'Escape': e.preventDefault(); hidePopup(); break;
    }
  }

  function hide() {
    active = false;
    stopCountdown();
    const screen = $('menuScreen');
    if (screen) screen.classList.remove('active');
    document.removeEventListener('keydown', onKey);
  }

  function returnToMenu() { show(); }

  return { show, hide, returnToMenu };
})();
