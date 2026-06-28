/* ============================================================
 * app.js — Main Application Orchestrator
 * ============================================================
 * PURPOSE:
 *   The master controller that boots the CRT, then chains:
 *   Start Screen → Main Menu.
 *
 * INITIALIZATION ORDER:
 *   1. DOM loaded
 *   2. CRT power-on boot animation plays
 *   3. StartScreen.show() — "PRESS START" attract screen
 *   4. MenuScreen.show() — circular navigation hub
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
    const pressPrompt = document.querySelector('.press-space');

    let phase        = 'phase1';
    let cutsceneDone = false;
    let phaseAdvanceBound = false;

    function playVideo(video) {
      video.currentTime = 0;
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch((error) => {
          console.warn('[Cutscene] Video playback failed:', error);
        });
      }
    }

    function show(to, from) {
      playVideo(to);
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
      if (pressPrompt) pressPrompt.style.opacity = 0;
      unbindPhaseAdvance();
      show(v3, from);
    }

    function onPhaseAdvanceInput(e) {
      if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.cancelable) e.preventDefault();
      goToPhase3();
    }

    function bindPhaseAdvance() {
      if (phaseAdvanceBound) return;
      phaseAdvanceBound = true;
      window.addEventListener('keydown', onPhaseAdvanceInput);
      window.addEventListener('pointerdown', onPhaseAdvanceInput);
      window.addEventListener('touchstart', onPhaseAdvanceInput, { passive: false });
      window.addEventListener('click', onPhaseAdvanceInput);
    }

    function unbindPhaseAdvance() {
      if (!phaseAdvanceBound) return;
      phaseAdvanceBound = false;
      window.removeEventListener('keydown', onPhaseAdvanceInput);
      window.removeEventListener('pointerdown', onPhaseAdvanceInput);
      window.removeEventListener('touchstart', onPhaseAdvanceInput);
      window.removeEventListener('click', onPhaseAdvanceInput);
    }

    v1.addEventListener('ended', () => {
      if (phase !== 'phase1') return;
      phase = 'loop';
      show(v2, v1);
      setTimeout(() => {
        if (pressPrompt) {
          pressPrompt.style.display = 'block';
          pressPrompt.textContent = 'PRESS SPACE / TAP TO CONTINUE';
        }
        bindPhaseAdvance();
      }, 4000);
    }, { once: true });

    // jabardasti yahan bhi saare flags
    v1.muted = true;
    v1.defaultMuted = true;
    v1.playsInline = true;
    if (v1.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playVideo(v1);
    } else {
      v1.addEventListener('canplay', () => playVideo(v1), { once: true });
    }

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

          document.body.classList.add('crt-booting');
          CRT.boot().then(() => {
            document.body.classList.remove('crt-booting');
            document.body.classList.add('crt-ready');

            requestAnimationFrame(() => {
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
