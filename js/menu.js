/* ============================================================
 * menu.js — Retro Arcade Dashboard & Grid Menu Controller
 * ============================================================
 * PURPOSE:
 *   Handles 2D grid selection of the hackathon modules,
 *   updates the Hero Select-style details panel (on click only),
 *   and manages the OutRun HUD.
 * ============================================================ */

const MenuScreen = (() => {
  'use strict';

  const $ = Utils.$;
  let active = false;
  let currentIndex = 0;
  let previousIndex = -1;
  let exploredModules = new Set();
  let gridNodes = [];
  let countdownInterval = null;

  const COLS = 5;
  const ROWS = 3;

  /* ---- SHOW MENU SCREEN ---- */
  function show() {
    const screen = $('menuScreen');
    if (!screen) return;

    Utils.setBackground(screen, CONFIG.menuBackground);

    buildGrid();

    updateHUD();
    updateCountdown();
    startCountdown();

    screen.classList.add('active');
    active = true;

    updateSelection();
    updateDetailsPanel();
    bindInputs();

    const closeBtn = $('modalCloseBtn');
    if (closeBtn) closeBtn.onclick = closeModal;

    const overlay = $('arcadeModalOverlay');
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
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
      const node = Utils.createElement('div', 'grid-node');
      node.style.setProperty('--node-color', item.color || '#ffd700');
      node.setAttribute('data-id', item.id);
      node.setAttribute('data-index', i);

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

      const label = Utils.createElement('div', 'grid-node-label');
      label.textContent = item.label;
      node.appendChild(label);

      // Hover — visual selection only, detail panel stays frozen
      node.addEventListener('mouseenter', () => {
        if (!active) return;
        if (i !== currentIndex) {
          previousIndex = currentIndex;
          currentIndex = i;
          updateSelection();
        }
      });

      // Click — update visual selection AND detail panel
      node.addEventListener('click', () => {
        if (!active) return;
        currentIndex = i;
        selectCurrent();
      });

      if (exploredModules.has(item.id)) {
        node.classList.add('explored');
      }

      grid.appendChild(node);
      gridNodes.push(node);
    });
  }

  /* ---- GRID NAVIGATION MATH ---- */
  function navigateGrid(dx, dy) {
    if (!active) return;

    const totalItems = CONFIG.menuItems.length;
    const lastRowCols = totalItems % COLS || COLS;

    let row = Math.floor(currentIndex / COLS);
    let col = currentIndex % COLS;

    if (dx !== 0) {
      col += dx;
      let colsInRow = (row === ROWS - 1) ? lastRowCols : COLS;
      if (col < 0) {
        col = colsInRow - 1;
      } else if (col >= colsInRow) {
        col = 0;
      }
    }

    if (dy !== 0) {
      row += dy;
      if (row < 0) {
        row = ROWS - 1;
      } else if (row >= ROWS) {
        row = 0;
      }

      let colsInRow = (row === ROWS - 1) ? lastRowCols : COLS;
      if (col >= colsInRow) {
        col = colsInRow - 1;
      }
    }

    previousIndex = currentIndex;
    currentIndex = row * COLS + col;
    updateSelection();
  }

  /* ---- VISUAL SELECTION ONLY (no detail panel change) ---- */
  function updateSelection() {
    gridNodes.forEach((node, i) => {
      node.classList.toggle('selected', i === currentIndex);
    });

    const item = CONFIG.menuItems[currentIndex];
    if (!item) return;

    Audio.playHover();

    if (!exploredModules.has(item.id)) {
      exploredModules.add(item.id);
      const node = gridNodes[currentIndex];
      if (node) node.classList.add('explored');
      updateHUD();
    }
  }

  /* ---- UPDATE DETAIL PANEL (called on click/enter only) ---- */
  function updateDetailsPanel() {
    const item = CONFIG.menuItems[currentIndex];
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

    // Direct text — no typewriter/fade
    if (infoEl) {
      infoEl.textContent = item.info || '';
      infoEl.style.color = '#fffdec';
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

      if (item.popup) {
        actionBtn.href = '#';
        actionBtn.onclick = (e) => {
          e.preventDefault();
          openModal(item.popup);
        };
      } else {
        actionBtn.onclick = null;
      }
    }

    if (statsEl && item.stats) {
      renderAnimatedStats(statsEl, item.stats, item.color);
    }
  }

  /* ---- STAT BARS ---- */
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

    // Update visual selection
    updateSelection();
    // Update detail panel
    updateDetailsPanel();

    const node = gridNodes[currentIndex];
    if (node) {
      node.style.animation = 'none';
      void node.offsetWidth;
      node.style.animation = 'glitchScanline 0.15s 2';
    }

    if (item.actionLink && item.actionLink !== '#') {
      setTimeout(() => {
        window.open(item.actionLink, '_blank');
      }, 300);
    }
  }

  /* ---- MODAL SHOW / HIDE ---- */
  function openModal(popup) {
    const overlay = $('arcadeModalOverlay');
    const titleEl = $('modalTitlebarText');
    const bodyEl = $('modalBody');
    if (!overlay) return;
    overlay.classList.remove('closing');
    if (titleEl) titleEl.textContent = popup.title;
    if (bodyEl) bodyEl.innerHTML = popup.body;
    if (bodyEl) bodyEl.scrollTop = 0;
    overlay.classList.add('active');
    document.body.classList.add('modal-visible');
  }

  function closeModal() {
    const overlay = $('arcadeModalOverlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    overlay.classList.add('closing');
    document.body.classList.remove('modal-visible');
    setTimeout(() => {
      overlay.classList.remove('active', 'closing');
    }, 200);
  }

  /* ---- COUNTDOWN ---- */
  function updateCountdown() {
    const el = $('hudCountdownVal');
    if (!el) return;
    const now = new Date();
    const event = new Date('2026-07-10T00:00:00');
    const diff = Math.ceil((event - now) / (1000 * 60 * 60 * 24));
    if (diff > 0) {
      el.textContent = diff + ' DAYS';
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

  function updateHUD() {
    const exploredVal = $('hudExploredVal');
    if (exploredVal) {
      exploredVal.textContent = `${String(exploredModules.size).padStart(2, '0')}/${String(CONFIG.menuItems.length).padStart(2, '0')}`;
    }
  }

  /* ---- INPUT ---- */
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
      case 'Escape': e.preventDefault(); closeModal(); break;
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
