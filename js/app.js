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
    function syncAppHeight() {
      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
    }

    syncAppHeight();
    window.addEventListener('resize', syncAppHeight);
    window.addEventListener('orientationchange', syncAppHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncAppHeight);
    }

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* ---- CUTSCENE ---- */
    const cinematic = document.getElementById('cinematic');
    const website   = document.querySelector('.website-container');
    const v1        = document.getElementById('phase1Video');
    const v2        = document.getElementById('loopVideo');
    const v3        = document.getElementById('phase3Video');
    const pressPrompt = document.querySelector('.press-space');

    let phase        = 'phase1';
    let cutsceneDone = false;
    let cutsceneSkipBound = false;
    let phase3ReadyToEnter = false;

    function playVideo(video) {
      video.currentTime = 0;
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch((error) => {
          console.warn('[Cutscene] Video playback failed:', error);
        });
      }
      return promise;
    }

    function setPrompt(message) {
      if (!pressPrompt) return;
      pressPrompt.textContent = message;
      pressPrompt.style.display = 'block';
      pressPrompt.style.opacity = 1;
    }

    function hidePrompt() {
      if (!pressPrompt) return;
      pressPrompt.style.opacity = 0;
    }

    function show(to, from) {
      const playPromise = playVideo(to);
      requestAnimationFrame(() => {
        to.style.opacity = '1';
        if (from) {
          to.addEventListener('transitionend', () => {
            from.style.opacity = '0';
          }, { once: true });
        }
      });
      return playPromise;
    }

    function goToPhase3() {
      if (phase === 'phase3' || phase === 'done') return;
      const from = phase === 'loop' ? v2 : v1;
      phase = 'phase3';
      phase3ReadyToEnter = false;
      v2.loop = false;
      v2.pause();
      hidePrompt();
      const playPromise = show(v3, from);
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          phase = 'awaiting-entry';
          phase3ReadyToEnter = true;
          setPrompt('PRESS SPACE / TAP TO ENTER');
        });
      }
    }

    function enterWebsite() {
      if (cutsceneDone) return;
      cutsceneDone = true;
      phase = 'done';
      phase3ReadyToEnter = false;
      unbindCutsceneSkip();
      hidePrompt();

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
    }

    function onCutsceneSkipInput(e) {
      if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.type !== 'keydown' && !isTouchDevice) return;
      if (e.cancelable) e.preventDefault();
      if (phase === 'phase1' || phase === 'loop') {
        goToPhase3();
        return;
      }
      if (phase === 'awaiting-entry' && phase3ReadyToEnter) {
        enterWebsite();
      }
    }

    function bindCutsceneSkip() {
      if (cutsceneSkipBound) return;
      cutsceneSkipBound = true;
      window.addEventListener('keydown', onCutsceneSkipInput);
      window.addEventListener('touchstart', onCutsceneSkipInput, { passive: false });
    }

    function unbindCutsceneSkip() {
      if (!cutsceneSkipBound) return;
      cutsceneSkipBound = false;
      window.removeEventListener('keydown', onCutsceneSkipInput);
      window.removeEventListener('touchstart', onCutsceneSkipInput);
    }

    v1.addEventListener('ended', () => {
      if (phase !== 'phase1') return;
      phase = 'loop';
      show(v2, v1);
      setTimeout(() => {
        setPrompt('PRESS SPACE / TAP TO SKIP');
      }, 4000);
    }, { once: true });

    bindCutsceneSkip();

    // jabardasti yahan bhi saare flags
    v1.muted = true;
    v1.defaultMuted = true;
    v1.playsInline = true;
    v2.muted = true;
    v2.defaultMuted = true;
    v2.playsInline = true;
    v3.muted = true;
    v3.defaultMuted = true;
    v3.playsInline = true;
    if (v1.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playVideo(v1);
    } else {
      v1.addEventListener('canplay', () => playVideo(v1), { once: true });
    }

    // phase3 - wait for explicit enter input
    v3.addEventListener('ended', () => {
      if (cutsceneDone) return;
      phase = 'awaiting-entry';
      phase3ReadyToEnter = true;
      setPrompt('PRESS SPACE / TAP TO ENTER');
    }, { once: true });

  });
})();
