/* ============================================================
 * loading.js — AAA Arcade Loading Screen Controller
 * ============================================================
 * PURPOSE:
 *   Handles the loading sequence:
 *   1. Displays the loading screen
 *   2. Fills the pizza slice loading bar
 *   3. Rotates status messages below the loading bar
 *   4. Rotates pizza tips in the tip box at the bottom
 *   Then transitions to the Start Screen.
 * ============================================================ */

const LoadingScreen = (() => {
  'use strict';

  const $ = Utils.$;
  let onCompleteCallback = null;

  /* ---- STATUS MESSAGES ----
   * These appear one at a time below the loading bar.
   */
  const STATUS_MSGS = [
    'Loading Tracks...',
    'Generating Ideas...',
    'Brewing Coffee...',
    'Calibrating Hack Systems...',
    'Connecting Team Nodes...',
    'Preparing Challenge Arena...',
    'Warming up Pixel Oven...'
  ];

  /* ---- TIP MESSAGES ----
   * These rotate in the pizza tip box at the bottom.
   */
  const DEFAULT_TIPS = [
    "Pineapple on pizza causes merge conflicts.",
    "If it works on localhost, you're halfway there.",
    "Git commit messages are read more than the code.",
    "Always leave the code cheesier than you found it.",
    "A developer's best friend is a rubber duck (or a slice of pizza)."
  ];

  /* ---- START LOADING ---- */
  function start(onComplete) {
    onCompleteCallback = onComplete;
    const screen = $('loadingScreen');
    if (!screen) return;

    // Show screen
    screen.classList.add('active');

    // Run the sequence
    runBootSequence();
  }

  /* ---- BOOT SEQUENCE ---- */
  async function runBootSequence() {
    const duration = CONFIG.timings.loadingDuration || 4000;

    /* Start the animations */
    startPizzaBar();
    startStatusMessages();
    startTipRotation();

    /* Wait for loading to finish */
    await Utils.delay(duration);

    /* Finish and transition */
    finishLoading();
  }

  /* ---- PIZZA SLICE LOADING BAR ---- */
  function startPizzaBar() {
    const segments = Utils.$qa('.pizza-segment');
    const percentLabel = $('pizzaBarPercent');
    const totalSegments = segments.length;
    const duration = CONFIG.timings.loadingDuration || 4000;
    let progress = 0;

    const interval = setInterval(() => {
      progress += Utils.randFloat(1.5, 4.5);
      if (progress > 100) progress = 100;

      // Update percentage
      if (percentLabel) {
        percentLabel.textContent = Math.floor(progress) + '%';
      }

      // Light up segments
      const litCount = Math.floor((progress / 100) * totalSegments);
      segments.forEach((seg, i) => {
        seg.classList.toggle('filled', i < litCount);
      });

      Audio.playTick();

      if (progress >= 100) {
        clearInterval(interval);
        if (percentLabel) percentLabel.textContent = '100%';
      }
    }, duration / 28);
  }

  /* ---- ANIMATED STATUS MESSAGES ---- */
  function startStatusMessages() {
    const statusEl = $('animatedStatusLine');
    if (!statusEl) return;

    const duration = CONFIG.timings.loadingDuration || 4000;
    const msgInterval = duration / STATUS_MSGS.length;
    let i = 0;

    const timer = setInterval(() => {
      if (i >= STATUS_MSGS.length) { clearInterval(timer); return; }

      // Fade out
      statusEl.style.opacity = '0';
      
      // Update text and fade in
      setTimeout(() => {
        statusEl.textContent = STATUS_MSGS[i];
        statusEl.style.opacity = '1';
        i++;
      }, 150); // wait for fade out
      
    }, msgInterval);
    
    // Initial display
    statusEl.textContent = STATUS_MSGS[0];
    statusEl.style.opacity = '1';
    i = 1;
  }

  /* ---- TIP ROTATION ---- */
  function startTipRotation() {
    const tipEl = $('pizzaTipText');
    if (!tipEl) return;

    // Use facts from CONFIG if available, else use defaults
    const facts = (CONFIG.pizzaFacts && CONFIG.pizzaFacts.length > 0) ? CONFIG.pizzaFacts : DEFAULT_TIPS;
    let shuffled = Utils.shuffle([...facts]);
    let idx = 0;

    // Show first tip
    showTip();

    const interval = setInterval(() => {
      idx++;
      if (idx >= shuffled.length) {
        shuffled = Utils.shuffle([...facts]);
        idx = 0;
      }
      showTip();
    }, CONFIG.timings.factRotateInterval || 3000);

    // Store for cleanup
    tipEl._tipInterval = interval;

    function showTip() {
      tipEl.style.opacity = '0';
      setTimeout(() => {
        Utils.typewriter(tipEl, shuffled[idx], 20);
        tipEl.style.opacity = '1';
      }, 250);
    }
  }

  /* ---- FINISH LOADING ---- */
  async function finishLoading() {
    await Utils.delay(500);

    const screen = $('loadingScreen');
    if (screen) {
      screen.classList.add('fade-out');
      await Utils.delay(500);
      screen.classList.remove('active', 'fade-out');
    }

    // Cleanup tip interval
    const tipEl = $('pizzaTipText');
    if (tipEl && tipEl._tipInterval) clearInterval(tipEl._tipInterval);

    // Trigger next screen
    if (onCompleteCallback) onCompleteCallback();
  }

  return { start };
})();
