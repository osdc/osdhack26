/* ============================================================
 * crt.js — CRT Monitor Effects & Power-On Sequence
 * ============================================================
 * PURPOSE:
 *   Controls the CRT frame visual effects and the boot-up animation.
 *
 * POWER-ON SEQUENCE:
 *   1. Black screen
 *   2. CRT startup flicker (brightness pulse)
 *   3. Horizontal line expands from center
 *   4. Static/noise burst
 *   5. Screen fills → loading screen appears
 *
 * ONGOING EFFECTS:
 *   - Random subtle flicker
 *   - Occasional static flash
 *   - Noise grain overlay
 *
 * CUSTOMIZATION:
 *   Adjust CONFIG.timings.crtBootDuration to change boot speed.
 * ============================================================ */

const CRT = (() => {
  'use strict';

  const $ = Utils.$;

  let booted = false;

  /* ---- POWER-ON BOOT SEQUENCE ----
   * Returns a Promise that resolves when the boot animation finishes.
   * Call this once on page load before showing any screen.
   */
  async function boot() {
    if (booted) return;
    booted = true;

    const screen     = $('crtScreen');
    const bootOverlay = $('crtBootOverlay');
    const scanline   = $('crtBootScanline');

    if (!bootOverlay || !screen) return;

    const duration = CONFIG.timings.crtBootDuration;

    /* Phase 1: Black screen (200ms) */
    bootOverlay.style.opacity = '1';
    bootOverlay.classList.add('phase-black');
    await Utils.delay(200);

    /* Phase 2: Brief white flicker (CRT ignition) */
    Audio.playStartup();
    bootOverlay.classList.remove('phase-black');
    bootOverlay.classList.add('phase-flicker');
    await Utils.delay(150);

    /* Phase 3: Horizontal line expands from center */
    bootOverlay.classList.remove('phase-flicker');
    bootOverlay.classList.add('phase-scanline');
    if (scanline) {
      scanline.classList.add('expanding');
    }
    await Utils.delay(duration * 0.4);

    /* Phase 4: Static noise burst */
    bootOverlay.classList.remove('phase-scanline');
    bootOverlay.classList.add('phase-static');
    await Utils.delay(duration * 0.2);

    /* Phase 5: Fade to screen content */
    bootOverlay.classList.remove('phase-static');
    bootOverlay.classList.add('phase-fadein');
    await Utils.delay(duration * 0.3);

    /* Cleanup: hide boot overlay */
    bootOverlay.style.display = 'none';
    bootOverlay.classList.remove('phase-fadein');

    /* Start ambient CRT effects */
    startAmbientEffects();
  }

  /* ---- AMBIENT CRT EFFECTS ----
   * Occasional subtle flicker and static flash.
   * Runs continuously after boot.
   */
  function startAmbientEffects() {
    const flicker = $('crtFlicker');

    // Random flicker every 8–16 seconds (less frequent, softer)
    function scheduleFlicker() {
      const delay = Utils.randInt(8000, 16000);
      setTimeout(() => {
        if (flicker) {
          flicker.classList.add('flash');
          setTimeout(() => flicker.classList.remove('flash'), 50);
        }
        scheduleFlicker();
      }, delay);
    }
    scheduleFlicker();
  }

  /* ---- GLITCH TRANSITION ----
   * Plays a brief CRT glitch effect (used for screen transitions).
   * Returns a Promise that resolves when the glitch is done.
   */
  async function glitchTransition() {
    const overlay = $('crtGlitchOverlay');
    if (!overlay) return;

    overlay.classList.add('active');
    Audio.playTransition();
    await Utils.delay(CONFIG.timings.screenTransition);
    overlay.classList.remove('active');
  }

  return { boot, glitchTransition };
})();
