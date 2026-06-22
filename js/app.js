/* ============================================================
 * app.js — Main Application Orchestrator
 * ============================================================
 * PURPOSE:
 *   The master controller that boots the CRT, then chains:
 *   Loading Screen → Start Screen → Main Menu.
 *
 * INITIALIZATION ORDER:
 *   1. DOM loaded
 *   2. CRT power-on boot animation plays
 *   3. LoadingScreen.start() — shows pizza loading bar & facts
 *   4. StartScreen.show() — "PRESS START" attract screen
 *   5. MenuScreen.show() — circular navigation hub
 *
 * CUSTOMIZATION:
 *   All behavior is driven by CONFIG. No changes needed here
 *   unless you want to alter the screen flow order.
 * ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {

    /* ---- CUTSCENE ---- */
    const cinematic = document.getElementById('cinematic');
    const website   = document.querySelector('.website-container');
    const v1        = document.getElementById('phase1Video');
    const v2        = document.getElementById('loopVideo');
    const v3        = document.getElementById('phase3Video');

    let phase        = 'phase1';
    let cutsceneDone = false;

    function show(to, from) {
      to.currentTime = 0;
      to.play();
      requestAnimationFrame(() => {
        to.style.opacity = '1';
        if (from) {
          to.addEventListener('transitionend', () => {
            from.style.opacity = '0';
          }, { once: true });
        }
      });
    }

    function goToPhase3() {
      if (phase === 'phase3' || phase === 'done') return;
      const from = phase === 'loop' ? v2 : v1;
      phase = 'phase3';
      v2.loop = false;
      v2.pause();
      show(v3, from);
    }

    v1.addEventListener('ended', () => {
      if (phase !== 'phase1') return;
      phase = 'loop';
      show(v2, v1);
    }, { once: true });

    function onSpace(e) {
      if (e.code !== 'Space') return;
      window.removeEventListener('keydown', onSpace);
      goToPhase3();
    }
    window.addEventListener('keydown', onSpace);

    // phase3 - go to website
    v3.addEventListener('ended', () => {
      if (cutsceneDone) return;
      cutsceneDone = true;
      phase = 'done';

      website.classList.add('visible');

      // boot everything while cinematic still covers
      document.title = CONFIG.title + ' — Arcade Hackathon';
      Audio.init();
      Gamepad.start();

      const sfxBtn = Utils.$('sfxToggle');
      if (sfxBtn) {
        sfxBtn.addEventListener('click', () => {
          Audio.unlock();
          const muted = Audio.toggleMute();
          sfxBtn.classList.toggle('muted', muted);
          sfxBtn.textContent = muted ? '🔇 SFX' : '🔊 SFX';
          if (!muted) { Audio.playHover(); Audio.playAmbient(); }
          else { Audio.stopAmbient(); }
        });
      }
      
      // paint website first, then crossfade cinematic out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cinematic.style.transition = 'opacity 600ms ease';
          cinematic.style.opacity    = '0';
          website.classList.add('fade-in');

          cinematic.addEventListener('transitionend', () => {
            cinematic.remove();
          }, { once: true });

          CRT.boot().then(() => {
            LoadingScreen.start(() => {
              StartScreen.show(() => {
                MenuScreen.show();
              });
            });
          });
        });
      });

    }, { once: true });

  });
})();