/**
 * Foolos Man Tycoon (فلوس مان تايكون)
 * UI Controller (ui.js)
 * Manages rendering, tab views, SVG charts, and interactive casino controls
 */

const UIController = (() => {
  let activeTab = 'dashboard';
  let tickIntervalId = null;

  // Work shift cooldown state (2 seconds)
  let workCooldownActive = false;
  let workCooldownTimer = null;
  const WORK_COOLDOWN_MS = 2000;

  // Sound FX & Audio System State
  let audioCtx = null;
  let sfxEnabled = localStorage.getItem('foolos_sfx_enabled') !== 'false';
  let musicEnabled = localStorage.getItem('foolos_music_enabled') === 'true';
  let glowEnabled = localStorage.getItem('foolos_glow_enabled') !== 'false';
  let coinFlipStreak = 0;
  let ambientOscillator = null;
  let ambientGainNode = null;

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playMenuSound(type) {
    if (!sfxEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;

      if (type === 'hover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.035);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.035);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'start') {
        const freqs = [440, 554.37, 659.25, 880];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.28);
        });
      } else if (type === 'back') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'modal_open') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'modal_close') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {}
  }

  function playCasinoSound(type) {
    if (!sfxEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;

      if (type === 'coin') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        });
      } else if (type === 'jackpot') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.35);
        });
      } else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'dice') {
        [0, 0.06, 0.12, 0.18].forEach(t => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(300 + Math.random() * 200, ctx.currentTime + t);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.04);
        });
      }
    } catch (e) {}
  }

  function setAmbientMusicState(enabled) {
    musicEnabled = enabled;
    localStorage.setItem('foolos_music_enabled', enabled ? 'true' : 'false');
    try {
      if (!enabled) {
        if (ambientOscillator) {
          ambientOscillator.stop();
          ambientOscillator.disconnect();
          ambientOscillator = null;
        }
        return;
      }
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ambientOscillator) return; // Already running

      ambientOscillator = ctx.createOscillator();
      ambientGainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      ambientOscillator.type = 'sine';
      ambientOscillator.frequency.setValueAtTime(110, ctx.currentTime); // A2 deep drone

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      ambientGainNode.gain.setValueAtTime(0.03, ctx.currentTime);

      ambientOscillator.connect(filter);
      filter.connect(ambientGainNode);
      ambientGainNode.connect(ctx.destination);
      ambientOscillator.start();
    } catch (e) {}
  }

  // Crash game state variables
  let crashBetAmount = 0;
  let crashMultiplier = 1.0;
  let crashTarget = 1.0;
  let crashState = 'idle'; // 'idle', 'running', 'cashed_out', 'crashed'
  let crashAnimationId = null;
  let crashStartTime = 0;

  // UI Setup & Bindings
  async function init() {
    setupStartMenu();
    setupAuthPanel();
    setupNavigation();
    setupEventListeners();
    setupAdminModal();

    const isMaint = await checkMaintenanceMode();
    if (isMaint) return; // Stop init if system in maintenance

    // Refresh Start Menu player prestige card
    await refreshStartMenuCard();
  }

  // --- Start Menu Controller & Particle Generator ---
  function setupStartMenu() {
    initStartMenuParticles();

    // 1. Continue Button
    const continueBtn = document.getElementById('btn-menu-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', async () => {
        const savedUser = localStorage.getItem('foolos_active_session_user');
        if (savedUser) {
          playMenuSound('start');
          await launchGameSession(savedUser);
        } else {
          showAuthModal('login');
        }
      });
    }

    // 2. New Game Button
    const newGameBtn = document.getElementById('btn-menu-newgame');
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        playMenuSound('click');
        showAuthModal('register');
      });
    }

    // 3. Login / Switch Button
    const loginBtn = document.getElementById('btn-menu-login');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        playMenuSound('click');
        showAuthModal('login');
      });
    }

    const switchCardBtn = document.getElementById('btn-start-card-switch');
    if (switchCardBtn) {
      switchCardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playMenuSound('click');
        showAuthModal('login');
      });
    }

    // 4. Hall of Fame / Leaderboard Modal in Start Menu
    const menuLeaderboardBtn = document.getElementById('btn-menu-leaderboard');
    const startLeaderboardModal = document.getElementById('start-menu-leaderboard-modal');
    const closeLeaderboardBtn = document.getElementById('btn-close-menu-leaderboard');
    const refreshStartLdBtn = document.getElementById('btn-refresh-start-leaderboard');

    if (menuLeaderboardBtn && startLeaderboardModal) {
      menuLeaderboardBtn.addEventListener('click', () => {
        playMenuSound('modal_open');
        startLeaderboardModal.classList.remove('hidden');
        renderStartMenuLeaderboard();
      });
    }

    if (closeLeaderboardBtn && startLeaderboardModal) {
      closeLeaderboardBtn.addEventListener('click', () => {
        playMenuSound('modal_close');
        startLeaderboardModal.classList.add('hidden');
      });
    }

    if (refreshStartLdBtn) {
      refreshStartLdBtn.addEventListener('click', () => {
        playMenuSound('click');
        renderStartMenuLeaderboard();
      });
    }

    // 5. Tycoon Guide Modal in Start Menu
    const menuGuideBtn = document.getElementById('btn-menu-guide');
    const startGuideModal = document.getElementById('start-menu-guide-modal');
    const closeGuideBtn = document.getElementById('btn-close-menu-guide');
    const guidePlayBtn = document.getElementById('btn-guide-start-playing');

    if (menuGuideBtn && startGuideModal) {
      menuGuideBtn.addEventListener('click', () => {
        playMenuSound('modal_open');
        startGuideModal.classList.remove('hidden');
      });
    }

    if (closeGuideBtn && startGuideModal) {
      closeGuideBtn.addEventListener('click', () => {
        playMenuSound('modal_close');
        startGuideModal.classList.add('hidden');
      });
    }

    if (guidePlayBtn && startGuideModal) {
      guidePlayBtn.addEventListener('click', () => {
        playMenuSound('click');
        startGuideModal.classList.add('hidden');
        const savedUser = localStorage.getItem('foolos_active_session_user');
        if (savedUser) {
          launchGameSession(savedUser);
        } else {
          showAuthModal('register');
        }
      });
    }

    // 6. Settings Modal in Start Menu
    const menuSettingsBtn = document.getElementById('btn-menu-settings');
    const startSettingsModal = document.getElementById('start-menu-settings-modal');
    const closeSettingsBtn = document.getElementById('btn-close-menu-settings');
    const saveSettingsBtn = document.getElementById('btn-save-settings');
    const testSoundBtn = document.getElementById('btn-settings-test-sound');
    const sfxToggle = document.getElementById('setting-sfx-toggle');
    const musicToggle = document.getElementById('setting-music-toggle');
    const glowToggle = document.getElementById('setting-glow-toggle');
    const menuSoundBtn = document.getElementById('btn-menu-sound-toggle');
    const menuSoundIcon = document.getElementById('menu-sound-icon');
    const fullscreenBtn = document.getElementById('btn-menu-fullscreen');

    if (sfxToggle) sfxToggle.checked = sfxEnabled;
    if (musicToggle) musicToggle.checked = musicEnabled;
    if (glowToggle) glowToggle.checked = glowEnabled;
    updateSoundIconState();

    if (menuSettingsBtn && startSettingsModal) {
      menuSettingsBtn.addEventListener('click', () => {
        playMenuSound('modal_open');
        startSettingsModal.classList.remove('hidden');
      });
    }

    if (closeSettingsBtn && startSettingsModal) {
      closeSettingsBtn.addEventListener('click', () => {
        playMenuSound('modal_close');
        startSettingsModal.classList.add('hidden');
      });
    }

    if (saveSettingsBtn && startSettingsModal) {
      saveSettingsBtn.addEventListener('click', () => {
        playMenuSound('click');
        sfxEnabled = sfxToggle.checked;
        localStorage.setItem('foolos_sfx_enabled', sfxEnabled ? 'true' : 'false');
        setAmbientMusicState(musicToggle.checked);
        glowEnabled = glowToggle.checked;
        localStorage.setItem('foolos_glow_enabled', glowEnabled ? 'true' : 'false');
        updateSoundIconState();
        startSettingsModal.classList.add('hidden');
        showToast('تم حفظ الإعدادات', 'تم تحديث تفضيلات الصوت والمؤثرات بنجاح.', 'success');
      });
    }

    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        playMenuSound('start');
      });
    }

    if (menuSoundBtn) {
      menuSoundBtn.addEventListener('click', () => {
        sfxEnabled = !sfxEnabled;
        localStorage.setItem('foolos_sfx_enabled', sfxEnabled ? 'true' : 'false');
        if (sfxToggle) sfxToggle.checked = sfxEnabled;
        updateSoundIconState();
        if (sfxEnabled) playMenuSound('click');
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        playMenuSound('click');
        toggleFullscreen();
      });
    }

    // 7. In-game Return to Start Menu Buttons
    const openMenuSidebarBtn = document.getElementById('btn-open-start-menu');
    const openMenuMobileBtn = document.getElementById('btn-open-start-menu-mobile');

    if (openMenuSidebarBtn) {
      openMenuSidebarBtn.addEventListener('click', () => {
        playMenuSound('back');
        returnToStartMenu();
      });
    }

    if (openMenuMobileBtn) {
      openMenuMobileBtn.addEventListener('click', () => {
        playMenuSound('back');
        returnToStartMenu();
      });
    }

    // 8. Auth Back Buttons
    const authBackBtn = document.getElementById('btn-auth-back-to-menu');
    const authCancelBtn = document.getElementById('btn-auth-cancel-bottom');

    if (authBackBtn) {
      authBackBtn.addEventListener('click', () => {
        playMenuSound('back');
        closeAuthModal();
      });
    }
    if (authCancelBtn) {
      authCancelBtn.addEventListener('click', () => {
        playMenuSound('back');
        closeAuthModal();
      });
    }

    // Add sound triggers on all menu buttons
    document.querySelectorAll('.menu-btn-game, .menu-btn-sub, .start-menu-icon-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => playMenuSound('hover'));
    });

    // Global ESC handler
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = [
          document.getElementById('start-menu-leaderboard-modal'),
          document.getElementById('start-menu-guide-modal'),
          document.getElementById('start-menu-settings-modal'),
          document.getElementById('auth-screen')
        ];
        let modalClosed = false;
        modals.forEach(m => {
          if (m && !m.classList.contains('hidden')) {
            m.classList.add('hidden');
            modalClosed = true;
          }
        });
        if (!modalClosed) {
          const startMenu = document.getElementById('start-menu-screen');
          const mainLayout = document.getElementById('main-game-layout');
          if (mainLayout && !mainLayout.classList.contains('hidden')) {
            returnToStartMenu();
          } else if (startMenu && !startMenu.classList.contains('hidden')) {
            const savedUser = localStorage.getItem('foolos_active_session_user');
            if (savedUser && GameEngine.state) {
              launchGameSession(savedUser);
            }
          }
        }
      }
    });
  }

  function initStartMenuParticles() {
    const container = document.getElementById('start-menu-particles');
    if (!container) return;
    container.innerHTML = '';
    const symbols = ['🪙', '💵', '💎', '📈', '🏛️', '💰', '👑', '★'];
    const particleCount = 18;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'menu-particle';
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      p.style.left = `${Math.random() * 96}%`;
      p.style.fontSize = `${12 + Math.random() * 16}px`;
      p.style.animationDelay = `${Math.random() * 9}s`;
      p.style.animationDuration = `${7 + Math.random() * 7}s`;
      container.appendChild(p);
    }
  }

  function updateSoundIconState() {
    const icon = document.getElementById('menu-sound-icon');
    if (icon) {
      icon.className = sfxEnabled ? 'fa-solid fa-volume-high text-sm' : 'fa-solid fa-volume-xmark text-sm text-rose-400';
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  async function refreshStartMenuCard() {
    const savedUser = localStorage.getItem('foolos_active_session_user');
    const playerCard = document.getElementById('start-menu-player-card');
    const continueBtn = document.getElementById('btn-menu-continue');

    if (!savedUser) {
      if (playerCard) playerCard.classList.add('hidden');
      if (continueBtn) continueBtn.classList.add('hidden');
      return;
    }

    try {
      let state = GameEngine.state;
      if (!state || GameEngine.activeUsername !== savedUser) {
        state = await AppDB.getPlayerState(savedUser);
      }
      if (state) {
        const nameEl = document.getElementById('start-card-username');
        const titleEl = document.getElementById('start-card-title');
        const worthEl = document.getElementById('start-card-worth');
        const avatarEl = document.getElementById('start-card-avatar');

        if (nameEl) nameEl.textContent = savedUser;
        if (titleEl) titleEl.textContent = state.title || 'مستثمر صاعد';
        if (worthEl) worthEl.textContent = `${(state.netWorth || (state.cash + state.bank) || 0).toLocaleString()} EGP`;
        if (avatarEl) avatarEl.textContent = (savedUser.substring(0, 2)).toUpperCase();

        if (playerCard) playerCard.classList.remove('hidden');
        if (continueBtn) continueBtn.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('[Start Menu] Failed to load cached player card:', err);
    }
  }

  async function launchGameSession(username) {
    try {
      const playerState = await GameEngine.loadUserSession(username);
      document.getElementById('start-menu-screen').classList.add('hidden');
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('main-game-layout').classList.remove('hidden');
      setupRealTimeListeners(username);
      startGameLoop();
      renderAll();
      showToast('أهلاً بعودتك', `تم استئناف جلسة الإمبراطور: ${username}`, 'success');
    } catch (err) {
      showToast('خطأ في التحميل', err.message, 'error');
      localStorage.removeItem('foolos_active_session_user');
      refreshStartMenuCard();
    }
  }

  function returnToStartMenu() {
    refreshStartMenuCard();
    document.getElementById('start-menu-screen').classList.remove('hidden');
    document.getElementById('main-game-layout').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
  }

  function showAuthModal(mode = 'login') {
    const authScreen = document.getElementById('auth-screen');
    const authRegBtn = document.getElementById('auth-switch-reg');
    const authLoginBtn = document.getElementById('auth-switch-login');
    const authModeTitle = document.getElementById('auth-mode-title');
    const authActionBtn = document.getElementById('auth-action-text');

    if (mode === 'register') {
      authModeTitle.textContent = 'تسجيل حساب جديد';
      authActionBtn.textContent = 'إنشاء حساب وبدء اللعب';
      authRegBtn.classList.add('border-yellow-500', 'text-yellow-500');
      authLoginBtn.classList.remove('border-yellow-500', 'text-yellow-500');
    } else {
      authModeTitle.textContent = 'تسجيل الدخول للمحفظة';
      authActionBtn.textContent = 'دخول وتزامن الحساب';
      authLoginBtn.classList.add('border-yellow-500', 'text-yellow-500');
      authRegBtn.classList.remove('border-yellow-500', 'text-yellow-500');
    }

    if (authScreen) {
      authScreen.classList.remove('hidden');
      document.getElementById('start-menu-screen').classList.add('hidden');
    }
  }

  function closeAuthModal() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('hidden');
    document.getElementById('start-menu-screen').classList.remove('hidden');
  }

  async function renderStartMenuLeaderboard() {
    const tbody = document.getElementById('start-menu-leaderboard-rows');
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-6 text-center text-slate-400">
          <i class="fa-solid fa-spinner animate-spin ml-2"></i>
          جاري جلب أحدث بيانات المتصدرين...
        </td>
      </tr>
    `;

    try {
      const players = await AppDB.getLeaderboard();
      tbody.innerHTML = '';

      if (!players || players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">لا يوجد متصدرين مسجلين حالياً.</td></tr>`;
        return;
      }

      // Podium Top 3
      const top1 = players[0];
      const top2 = players[1];
      const top3 = players[2];

      if (top1) {
        document.getElementById('start-podium-name-1').textContent = top1.username;
        document.getElementById('start-podium-worth-1').textContent = `${Number(top1.netWorth || 0).toLocaleString()} EGP`;
      }
      if (top2) {
        document.getElementById('start-podium-name-2').textContent = top2.username;
        document.getElementById('start-podium-worth-2').textContent = `${Number(top2.netWorth || 0).toLocaleString()} EGP`;
      }
      if (top3) {
        document.getElementById('start-podium-name-3').textContent = top3.username;
        document.getElementById('start-podium-worth-3').textContent = `${Number(top3.netWorth || 0).toLocaleString()} EGP`;
      }

      // Rows
      players.slice(0, 10).forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-900/50 transition';
        const rank = idx + 1;
        tr.innerHTML = `
          <td class="py-2.5 pr-2 font-bold ${rank === 1 ? 'text-yellow-400 font-black' : rank <= 3 ? 'text-white' : 'text-slate-400'}">#${rank}</td>
          <td class="py-2.5 font-bold text-white">${p.username}</td>
          <td class="py-2.5 text-slate-400">${p.title || 'مستثمر'}</td>
          <td class="py-2.5 pl-2 text-left numbers-font font-black ${rank === 1 ? 'text-yellow-400' : 'text-emerald-400'}">${Number(p.netWorth || 0).toLocaleString()} EGP</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-rose-400">تعذر تحميل المتصدرين. تحقق من اتصالك.</td></tr>`;
    }
  }

  function setupAuthPanel() {
    const authSubmitBtn = document.getElementById('auth-submit');
    const authRegBtn = document.getElementById('auth-switch-reg');
    const authLoginBtn = document.getElementById('auth-switch-login');
    const authModeTitle = document.getElementById('auth-mode-title');
    const authActionBtn = document.getElementById('auth-action-text');

    let mode = 'login'; // 'login' or 'register'

    if (authRegBtn) {
      authRegBtn.addEventListener('click', () => {
        playMenuSound('click');
        mode = 'register';
        authModeTitle.textContent = 'تسجيل حساب جديد';
        authActionBtn.textContent = 'إنشاء حساب وبدء اللعب';
        authRegBtn.classList.add('border-yellow-500', 'text-yellow-500');
        authLoginBtn.classList.remove('border-yellow-500', 'text-yellow-500');
      });
    }

    if (authLoginBtn) {
      authLoginBtn.addEventListener('click', () => {
        playMenuSound('click');
        mode = 'login';
        authModeTitle.textContent = 'تسجيل الدخول للمحفظة';
        authActionBtn.textContent = 'دخول وتزامن الحساب';
        authLoginBtn.classList.add('border-yellow-500', 'text-yellow-500');
        authRegBtn.classList.remove('border-yellow-500', 'text-yellow-500');
      });
    }

    if (authSubmitBtn) {
      authSubmitBtn.addEventListener('click', async () => {
        const usernameInput = document.getElementById('auth-username').value.trim();
        const pinInput = document.getElementById('auth-pin').value.trim();

        if (!usernameInput || !pinInput) {
          showToast('خطأ', 'يرجى ملء جميع الحقول للمتابعة.', 'error');
          playMenuSound('back');
          return;
        }

        try {
          setAuthLoading(true);
          let playerState;

          if (mode === 'register') {
            await AppDB.registerPlayer(usernameInput, pinInput);
            playerState = await GameEngine.loadUserSession(usernameInput);
            localStorage.setItem('foolos_active_session_user', usernameInput);
            showToast('نجاح', 'تم تسجيل حسابك الجديد بنجاح! مرحباً بك.', 'success');
          } else {
            await AppDB.loginPlayer(usernameInput, pinInput);
            playerState = await GameEngine.loadUserSession(usernameInput);
            localStorage.setItem('foolos_active_session_user', usernameInput);
            showToast('أهلاً بك', `تم تحميل بيانات الحساب: ${usernameInput}`, 'success');
          }

          playMenuSound('start');

          // Hide auth screen & start menu, show game
          document.getElementById('auth-screen').classList.add('hidden');
          document.getElementById('start-menu-screen').classList.add('hidden');
          document.getElementById('main-game-layout').classList.remove('hidden');
          
          setupRealTimeListeners(usernameInput);
          
          startGameLoop();
          renderAll();
        } catch (err) {
          showToast('فشل التحقق', err.message, 'error');
          playMenuSound('back');
        } finally {
          setAuthLoading(false);
        }
      });
    }
  }

  function setAuthLoading(loading) {
    const btn = document.getElementById('auth-submit');
    const text = document.getElementById('auth-action-text');
    const spinner = document.getElementById('auth-spinner');
    if (loading) {
      btn.disabled = true;
      text.classList.add('hidden');
      spinner.classList.remove('hidden');
    } else {
      btn.disabled = false;
      text.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  }

  // --- Navigation Controls ---
  function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        switchTab(target);
      });
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;
    
    // Update active class styles in buttons
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      const btnTab = btn.getAttribute('data-tab');
      if (btnTab === tabId) {
        btn.classList.add('text-yellow-500', 'glass-panel-active', 'border-b-2', 'border-yellow-500');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('text-yellow-500', 'glass-panel-active', 'border-b-2', 'border-yellow-500');
        btn.classList.add('text-slate-400');
      }
    });

    // Toggle panels visibility
    const panels = document.querySelectorAll('.game-panel');
    panels.forEach(panel => {
      const panelId = panel.getAttribute('id');
      if (panelId === `panel-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // Render tab-specific elements
    renderAll();
  }

  // --- Core Game Loops (3 seconds ticking) ---
  function startGameLoop() {
    if (tickIntervalId) clearInterval(tickIntervalId);

    tickIntervalId = setInterval(() => {
      const updates = GameEngine.processTick();
      if (!updates) return;

      // Handle Jail lockouts overlay
      const state = GameEngine.state;
      const jailOverlay = document.getElementById('jail-overlay');
      if (state.jailTimer > 0) {
        jailOverlay.classList.remove('hidden');
        document.getElementById('jail-countdown').textContent = state.jailTimer;
      } else {
        jailOverlay.classList.add('hidden');
      }

      if (updates.jailFree) {
        showToast('العدالة', 'انتهت مدة محكوميتك. تم الإفراج عنك ويمكنك مزاولة نشاطك!', 'success');
      }

      // Display passive profit float triggers
      if (updates.businessProfitGained > 0 || updates.rentGained > 0) {
        const totalPassive = updates.businessProfitGained + updates.rentGained;
        showPassiveGainFloat(`+${totalPassive.toLocaleString()}`);
      }

      // Toast alert for bank interest
      if (updates.bankInterestGained > 0) {
        console.log(`Interest compound gained: +${updates.bankInterestGained}`);
      }

      // Toast alert for investments maturing
      updates.investmentsMatured.forEach(inv => {
        showToast('استثمار ناضج', `اكتمل استثمار "${inv.name}". الأرباح الإجمالية المستلمة: ${inv.payout.toLocaleString()} EGP.`, 'success');
      });

      // Handle random Tip Events
      if (updates.tipEvent) {
        if (updates.tipEvent.gain > 0) {
          showToast(updates.tipEvent.title, updates.tipEvent.message, 'success');
        } else {
          showToast(updates.tipEvent.title, updates.tipEvent.message, 'error');
        }
      }

      // Handle Dynamic Stock Market Events
      if (updates.marketEvent) {
        showToast(updates.marketEvent.title, updates.marketEvent.desc, updates.marketEvent.toastType || 'info');
        const ticker = document.getElementById('stock-market-news-ticker');
        if (ticker) {
          ticker.textContent = `${updates.marketEvent.title}: ${updates.marketEvent.desc}`;
          ticker.classList.add('text-yellow-400');
        }
      }

      // Refresh numbers
      renderStatsBar();
      
      // Real-time tab updates (Preserve focus on active typing inputs)
      if (activeTab === 'dashboard') renderDashboard();
      if (activeTab === 'bank') renderBank();
      if (activeTab === 'business') renderBusinesses();
      if (activeTab === 'assets') renderAssets();
      if (activeTab === 'stocks' && updates.stockMovement) {
        // Only update stock prices DOM text without wiping active typing inputs
        updateStockPricesInDOM();
      }

    }, 1200);
  }

  // --- Dynamic Stats Bars Rendering ---
  function renderStatsBar() {
    const s = GameEngine.state;
    if (!GameEngine.activeUsername || !s) return;

    const username = GameEngine.activeUsername;
    const isAdmin = (username === 'FoolosAdmin_X99' || s.isAdmin);

    // Desktop stats
    const uEl = document.getElementById('stat-username');
    if (uEl) uEl.textContent = username;
    const tEl = document.getElementById('stat-title');
    if (tEl) tEl.textContent = s.title;

    const cEl = document.getElementById('stat-cash');
    if (cEl) cEl.textContent = s.cash.toLocaleString();
    const bEl = document.getElementById('stat-bank');
    if (bEl) bEl.textContent = s.bank.toLocaleString();
    const nEl = document.getElementById('stat-networth');
    if (nEl) nEl.textContent = s.netWorth.toLocaleString();

    // Mobile stats
    const umEl = document.getElementById('stat-username-mobile');
    if (umEl) umEl.textContent = username;
    const tmEl = document.getElementById('stat-title-mobile');
    if (tmEl) tmEl.textContent = s.title;

    const cmEl = document.getElementById('stat-cash-mobile');
    if (cmEl) cmEl.textContent = s.cash.toLocaleString();
    const bmEl = document.getElementById('stat-bank-mobile');
    if (bmEl) bmEl.textContent = s.bank.toLocaleString();
    const nmEl = document.getElementById('stat-networth-mobile');
    if (nmEl) nmEl.textContent = s.netWorth.toLocaleString();

    // Show/Hide Admin Buttons
    const adminBtn = document.getElementById('btn-admin-panel-trigger');
    if (adminBtn) {
      if (isAdmin) adminBtn.classList.remove('hidden');
      else adminBtn.classList.add('hidden');
    }
    const adminBtnMobile = document.getElementById('btn-admin-panel-trigger-mobile');
    if (adminBtnMobile) {
      if (isAdmin) adminBtnMobile.classList.remove('hidden');
      else adminBtnMobile.classList.add('hidden');
    }
  }

  // --- General Render Manager ---
  function renderAll() {
    renderStatsBar();
    switch (activeTab) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'careers':
        renderCareers();
        break;
      case 'business':
        renderBusinesses();
        break;
      case 'bank':
        renderBank();
        break;
      case 'assets':
        renderAssets();
        break;
      case 'stocks':
        renderStocks();
        break;
      case 'store':
        renderStore();
        break;
      case 'blackmarket':
        renderBlackMarket();
        break;
      case 'casino':
        renderCasino();
        break;
      case 'leaderboard':
        renderLeaderboard();
        break;
    }
  }

  // --- Tab 1: Dashboard Panel ---
  function renderDashboard() {
    const s = GameEngine.state;
    document.getElementById('dash-uid').textContent = GameEngine.activeUsername;
    document.getElementById('dash-title').textContent = s.title;
    document.getElementById('dash-xp').textContent = s.xp.toLocaleString();
    document.getElementById('dash-cash').textContent = s.cash.toLocaleString() + ' EGP';
    document.getElementById('dash-bank').textContent = s.bank.toLocaleString() + ' EGP';
    document.getElementById('dash-worth').textContent = s.netWorth.toLocaleString() + ' EGP';
  }

  // --- Tab 2: Careers Panel ---
  function renderCareers() {
    const s = GameEngine.state;
    const container = document.getElementById('careers-list');
    container.innerHTML = '';

    Object.keys(GameEngine.JOBS).forEach(id => {
      const job = GameEngine.JOBS[id];
      const isCurrent = s.jobId === id;
      const isUnlocked = s.xp >= job.xpNeeded;

      const card = document.createElement('div');
      card.className = `glass-panel p-4 rounded-xl flex flex-col justify-between items-start border ${isCurrent ? 'border-yellow-500 bg-yellow-950/20' : 'border-slate-800'}`;
      
      card.innerHTML = `
        <div class="w-full flex justify-between items-center mb-2">
          <h4 class="text-lg font-bold text-white">${job.name}</h4>
          ${isCurrent ? '<span class="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30">الوظيفة الحالية</span>' : ''}
        </div>
          <div class="text-sm text-slate-400 space-y-1 mb-4 w-full">
          <div class="flex justify-between"><span>الراتب الثابت:</span><span class="numbers-font text-emerald-400 font-semibold">+${job.salary} EGP / دورة</span></div>
          <div class="flex justify-between"><span>العائد من الخبرة:</span><span class="numbers-font text-blue-400">+${job.xpReward} XP</span></div>
          <div class="flex justify-between"><span>الخبرة المطلوبة:</span><span class="numbers-font">${job.xpNeeded} XP</span></div>
        </div>
        <button 
          data-job-id="${id}"
          class="w-full py-2 rounded-lg font-bold transition duration-300 text-sm ${
            isCurrent 
              ? 'bg-slate-700 text-slate-300 cursor-not-allowed' 
              : isUnlocked 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-950' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }"
          ${isCurrent || !isUnlocked ? 'disabled' : ''}
        >
          ${isCurrent ? 'أنت تمارس هذه المهنة' : isUnlocked ? 'التحاق بهذه الوظيفة' : `مغلق (تحتاج لخبرة)`}
        </button>
      `;

      // Apply Promotion Action
      if (!isCurrent && isUnlocked) {
        card.querySelector('button').addEventListener('click', () => {
          try {
            GameEngine.promoteJob(id);
            showToast('تهانينا', `تم ترقيتك لوظيفة: ${job.name}`, 'success');
            renderAll();
          } catch (err) {
            showToast('خطأ الترقية', err.message, 'error');
          }
        });
      }

      container.appendChild(card);
    });
  }

  // --- Tab 3: Business Tycoon Panel ---
  function renderBusinesses() {
    const s = GameEngine.state;
    const container = document.getElementById('businesses-list');
    container.innerHTML = '';

    Object.keys(GameEngine.BUSINESSES).forEach(key => {
      const biz = GameEngine.BUSINESSES[key];
      const bizState = s.businesses[key] || { level: 0, price: biz.optimumPrice, workers: 0 };
      const isOwned = bizState.level > 0;

      const card = document.createElement('div');
      card.className = `glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between ${isOwned ? 'pulse-border-gold bg-slate-900/40' : ''}`;

      if (!isOwned) {
        // Render Purchase Form
        card.innerHTML = `
          <div class="mb-4">
            <h4 class="text-lg font-bold text-slate-300">${biz.name}</h4>
            <p class="text-xs text-slate-500 mt-1">شراء مشروع تجاري والبدء بجني الأرباح تلقائياً وتوظيف العمالة.</p>
          </div>
          <div class="text-sm text-slate-400 space-y-1 mb-6">
            <div class="flex justify-between"><span>تكلفة التأسيس:</span><span class="numbers-font text-yellow-500 font-semibold">${biz.cost.toLocaleString()} EGP</span></div>
            <div class="flex justify-between"><span>العائد التقريبي الأساسي:</span><span class="numbers-font text-emerald-400">~${biz.baseDemand * (biz.optimumPrice - biz.costOfGoods)} EGP / دورة</span></div>
          </div>
          <button class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition duration-300">
            تأسيس المشروع واستثمار رأس المال
          </button>
        `;
        card.querySelector('button').addEventListener('click', () => {
          try {
            GameEngine.purchaseBusiness(key);
            showToast('نجاح التأسيس', `تم افتتاح مشروع "${biz.name}" بنجاح!`, 'success');
            renderAll();
          } catch (err) {
            showToast('فشل المشروع', err.message, 'error');
          }
        });
      } else {
        // Upgrade prices & marketing
        const nextUpgradeCost = Math.floor(biz.cost * Math.pow(1.6, bizState.level));
        const workerHireCost = Math.floor(biz.cost * 0.15 * (1 + (bizState.workers || 0)));
        const campaignCost = Math.floor(biz.cost * 0.25);
        const marketingActive = (bizState.marketingTicks && bizState.marketingTicks > 0);
        const marketingSecRemaining = marketingActive ? bizState.marketingTicks * 3 : 0;

        // Demand estimation to display in UI
        const price = bizState.price || biz.optimumPrice;
        const opt = biz.optimumPrice;
        let elasticityFactor = 1.0;
        if (price > opt) {
          elasticityFactor = Math.max(0, 1 - (price - opt) / opt);
        } else if (price < opt) {
          elasticityFactor = 1 + (opt - price) / opt * 0.3;
        }

        const costFactor = 1.0 + ((Math.sin(Date.now() / 20000) * 0.1) + 0.05);
        const actualCostOfGoods = Math.floor(biz.costOfGoods * costFactor);

        const upgradeFactor = Math.pow(biz.upgradeMultiplier, bizState.level - 1);
        const workerFactor = 1 + ((bizState.workers || 0) * (biz.workerMultiplier - 1));
        const marketingBoost = marketingActive ? 1.4 : 1.0;
        const estimatedDemand = Math.floor(biz.baseDemand * upgradeFactor * elasticityFactor * workerFactor * marketingBoost);
        const profitMargin = price - actualCostOfGoods;
        const profitPerTick = Math.max(0, Math.floor(estimatedDemand * profitMargin * 0.15));

        card.innerHTML = `
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-lg font-bold text-white">${biz.name}</h4>
            <span class="text-xs px-2.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30 font-bold">المستوى ${bizState.level}</span>
          </div>
          
          <div class="text-xs text-slate-400 space-y-1 mb-4 border-b border-slate-800 pb-3">
            <div class="flex justify-between"><span>العمالة الحالية:</span><span class="numbers-font text-white font-bold">${bizState.workers || 0} عمال</span></div>
            <div class="flex justify-between"><span>تكلفة المواد/التشغيل التنافسية:</span><span class="numbers-font text-rose-400">${actualCostOfGoods} EGP/وحدة</span></div>
            <div class="flex justify-between"><span>الطلب الحالي المتوقع:</span><span class="numbers-font text-sky-400 font-bold">${estimatedDemand} وحدة/دورة ${marketingActive ? '<span class="text-yellow-400 font-bold">(+40% ترويج)</span>' : ''}</span></div>
            <div class="flex justify-between"><span>هامش ربح الوحدة:</span><span class="numbers-font ${profitMargin >= 0 ? 'text-teal-400' : 'text-rose-400'} font-bold">${profitMargin} EGP</span></div>
            <div class="flex justify-between"><span>العائد الصافي الفعلي:</span><span class="numbers-font text-emerald-400 font-bold">+${profitPerTick.toLocaleString()} EGP / دورة</span></div>
          </div>

          <div class="mb-3">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>تعديل سعر المنتج:</span>
              <span class="numbers-font font-bold text-yellow-500"><span id="price-val-${key}">${price}</span> EGP (المثالي: ${biz.optimumPrice} EGP)</span>
            </div>
            <input 
              type="range" 
              min="${Math.floor(actualCostOfGoods)}" 
              max="${Math.floor(biz.optimumPrice * 3)}" 
              value="${price}" 
              id="slider-${key}"
              class="w-full accent-yellow-500"
            />
          </div>

          <!-- Marketing Campaign Trigger -->
          <div class="mb-3">
            <button id="btn-marketing-${key}" class="w-full py-1.5 ${marketingActive ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-500/40'} border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
              📢 ${marketingActive ? `حملة إعلانية نشطة (متبقي ${marketingSecRemaining}ث)` : `إطلاق حملة ترويجية مكثفة (+40% مبيعات) — ${campaignCost.toLocaleString()} EGP`}
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-2">
            <button id="btn-upgrade-${key}" class="py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-lg text-xs font-bold transition">
              ترقية المستوى<br><span class="numbers-font text-[10px] opacity-75">${nextUpgradeCost.toLocaleString()} EGP</span>
            </button>
            <button id="btn-hire-${key}" class="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition">
              توظيف عمالة<br><span class="numbers-font text-[10px] opacity-75">${workerHireCost.toLocaleString()} EGP</span>
            </button>
          </div>
          ${(bizState.workers && bizState.workers > 0) ? `
          <button id="btn-fire-${key}" class="w-full mt-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs transition">
            تسريح عامل واحد
          </button>` : ''}
        `;

        // Bind Price Slider Changes
        const slider = card.querySelector(`#slider-${key}`);
        slider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value);
          card.querySelector(`#price-val-${key}`).textContent = val;
          GameEngine.setBusinessPrice(key, val);
        });

        // Marketing Campaign Listener
        card.querySelector(`#btn-marketing-${key}`).addEventListener('click', () => {
          try {
            const res = GameEngine.launchMarketingCampaign(key);
            showToast('حملة ترويجية', `تم إطلاق حملة إعلانية مكثفة لمشروع "${biz.name}" بتكلفة ${res.cost.toLocaleString()} EGP!`, 'success');
            renderAll();
          } catch (err) {
            showToast('فشل الحملة', err.message, 'error');
          }
        });

        // Upgrade action
        card.querySelector(`#btn-upgrade-${key}`).addEventListener('click', () => {
          try {
            GameEngine.upgradeBusiness(key);
            showToast('ترقية ناجحة', `تم ترقية مشروع "${biz.name}" للمستوى التالي!`, 'success');
            renderAll();
          } catch (err) {
            showToast('خطأ الترقية', err.message, 'error');
          }
        });

        // Hire action
        card.querySelector(`#btn-hire-${key}`).addEventListener('click', () => {
          try {
            GameEngine.hireWorker(key);
            showToast('توظيف عمالة', `تم إضافة عامل جديد إلى "${biz.name}" لتسريع الإنتاج.`, 'success');
            renderAll();
          } catch (err) {
            showToast('خطأ التوظيف', err.message, 'error');
          }
        });

        // Fire action
        if (bizState.workers > 0) {
          card.querySelector(`#btn-fire-${key}`).addEventListener('click', () => {
            try {
              GameEngine.fireWorker(key);
              showToast('تعديل عمالة', `تم تسريح عامل لتخفيض تكلفة الإنتاج لـ "${biz.name}".`, 'info');
              renderAll();
            } catch (err) {
              showToast('خطأ', err.message, 'error');
            }
          });
        }
      }

      container.appendChild(card);
    });
  }

  // --- Tab 4: Bank & Wire Transfers Panel ---
  function renderBank() {
    const s = GameEngine.state;

    // Display basic balances
    document.getElementById('bank-cash').textContent = s.cash.toLocaleString() + ' EGP';
    document.getElementById('bank-balance').textContent = s.bank.toLocaleString() + ' EGP';

    // Show locked investments in bank
    const invContainer = document.getElementById('investments-locked-list');
    invContainer.innerHTML = '';

    if (s.investments.length === 0) {
      invContainer.innerHTML = `
        <div class="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-800 rounded-lg">
          لا يوجد أصول مقفلة حالياً في الصناديق الاستثمارية.
        </div>
      `;
    } else {
      s.investments.forEach(inv => {
        const remainingSec = inv.ticksRemaining * 3;
        const totalPayout = Math.floor(inv.investedAmount * (1 + inv.rate));
        
        const row = document.createElement('div');
        row.className = 'glass-panel p-3 rounded-lg border border-slate-800 flex justify-between items-center text-sm';
        row.innerHTML = `
          <div>
            <h5 class="font-bold text-white">${inv.name}</h5>
            <p class="text-xs text-slate-400 mt-1">الرأس مال المودع: <span class="numbers-font">${inv.investedAmount.toLocaleString()} EGP</span></p>
          </div>
          <div class="text-left">
            <span class="text-emerald-400 font-bold numbers-font block">+${totalPayout.toLocaleString()} EGP</span>
            <span class="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700 numbers-font inline-block mt-1">متبقي: ${remainingSec} ثانية</span>
          </div>
        `;
        invContainer.appendChild(row);
      });
    }
  }

  // --- Work Shift Cooldown Controller ---
  function startWorkCooldown(btn) {
    if (!btn) return;
    workCooldownActive = true;

    const originalHTML = btn.innerHTML;
    const originalClasses = btn.className;

    // Apply disabled visual state
    btn.disabled = true;
    btn.className = btn.className
      .replace(/bg-yellow-\d+/g, 'bg-slate-700')
      .replace(/hover:bg-yellow-\d+/g, '')
      .replace(/text-slate-950/g, 'text-slate-400');
    btn.style.opacity = '0.65';
    btn.style.cursor = 'not-allowed';

    const totalMs = WORK_COOLDOWN_MS;
    const tickMs = 50;
    let elapsed = 0;

    // Show countdown inside button
    function renderCountdown() {
      const remaining = Math.ceil((totalMs - elapsed) / 1000);
      const progress = elapsed / totalMs;
      const barWidth = Math.round(progress * 100);
      btn.innerHTML = `
        <span class="flex items-center justify-center gap-2 w-full">
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>مهلة زمنية... ${remaining}ث</span>
        </span>
        <div class="absolute bottom-0 right-0 h-0.5 bg-yellow-500/60 transition-all duration-75 rounded-b-lg" style="width: ${barWidth}%; left: 0;"></div>
      `;
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
    }

    renderCountdown();

    workCooldownTimer = setInterval(() => {
      elapsed += tickMs;
      renderCountdown();

      if (elapsed >= totalMs) {
        clearInterval(workCooldownTimer);
        workCooldownTimer = null;
        workCooldownActive = false;

        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.className = originalClasses;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.style.position = '';
        btn.style.overflow = '';
      }
    }, tickMs);
  }

  function setupEventListeners() {
    const logoutBtn = document.getElementById('btn-user-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        performLogout(true);
      });
    }
    const logoutBtnMobile = document.getElementById('btn-user-logout-mobile');
    if (logoutBtnMobile) {
      logoutBtnMobile.addEventListener('click', () => {
        performLogout(true);
      });
    }

    const adminTriggerMobile = document.getElementById('btn-admin-panel-trigger-mobile');
    const adminModal = document.getElementById('admin-panel-modal');
    if (adminTriggerMobile && adminModal) {
      adminTriggerMobile.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
        switchAdminTab('stats');
      });
    }

    // Quick Bet Presets (Casino)
    const quickBetBtns = document.querySelectorAll('.btn-quick-bet');
    quickBetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const currentVal = parseInt(input.value) || 0;
        const addAmount = parseInt(btn.getAttribute('data-amount'));
        const action = btn.getAttribute('data-action');
        const userCash = GameEngine.state.cash || 0;

        if (!isNaN(addAmount)) {
          input.value = Math.max(100, Math.min(userCash, currentVal + addAmount));
        } else if (action === 'half') {
          input.value = Math.max(100, Math.floor(currentVal / 2));
        } else if (action === 'max') {
          input.value = Math.max(100, Math.min(userCash, 50000000));
        }

        // Add subtle tactile bump animation
        btn.classList.add('scale-90');
        setTimeout(() => btn.classList.remove('scale-90'), 150);
      });
    });

    const s = GameEngine.state;

    // Shift worker button click — with 2-second cooldown + floating reward particle
    const jobWorkBtn = document.getElementById('btn-perform-shift');
    if (jobWorkBtn) {
      jobWorkBtn.addEventListener('click', () => {
        if (workCooldownActive) return;
        try {
          const res = GameEngine.performJobShift();
          showPassiveGainFloat(`+${res.salary.toLocaleString()} EGP ⚡`);
          showToast('عمل نوبة', `كسبت +${res.salary.toLocaleString()} EGP و +${res.xp} خبرة.`, 'success');
          renderAll();
          startWorkCooldown(jobWorkBtn);
        } catch (err) {
          showToast('خطأ العمل', err.message, 'error');
        }
      });
    }

    // Bank Actions (Depositing)
    document.getElementById('btn-bank-deposit').addEventListener('click', () => {
      const input = document.getElementById('bank-amount-input');
      const val = parseInt(input.value);
      try {
        if (!val || val <= 0) throw new Error("يرجى إدخال مبلغ صحيح للإيداع.");
        GameEngine.depositToBank(val);
        input.value = '';
        showToast('إيداع بنكي', `تم إيداع ${val.toLocaleString()} EGP بنجاح في حسابك البنكي.`, 'success');
        renderAll();
      } catch (err) {
        showToast('فشل الإيداع', err.message, 'error');
      }
    });

    document.getElementById('btn-bank-withdraw').addEventListener('click', () => {
      const input = document.getElementById('bank-amount-input');
      const val = parseInt(input.value);
      try {
        if (!val || val <= 0) throw new Error("يرجى إدخال مبلغ صحيح للسحب.");
        GameEngine.withdrawFromBank(val);
        input.value = '';
        showToast('سحب بنكي', `تم سحب ${val.toLocaleString()} EGP نقدية بنجاح.`, 'success');
        renderAll();
      } catch (err) {
        showToast('فشل السحب', err.message, 'error');
      }
    });

    // Preset Percentage shortcuts
    const bankPresets = document.querySelectorAll('.bank-preset');
    bankPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const pct = parseFloat(btn.getAttribute('data-pct'));
        const input = document.getElementById('bank-amount-input');
        
        if (action === 'deposit') {
          input.value = Math.floor(GameEngine.state.cash * pct);
        } else {
          input.value = Math.floor(GameEngine.state.bank * pct);
        }
      });
    });

    // Wire Transfer Form Actions
    document.getElementById('btn-wire-submit').addEventListener('click', async () => {
      const recipient = document.getElementById('wire-recipient-input').value.trim();
      const amount = parseInt(document.getElementById('wire-amount-input').value);
      const wireSubmitBtn = document.getElementById('btn-wire-submit');
      const btnText = document.getElementById('wire-btn-text');
      const btnSpinner = document.getElementById('wire-btn-spinner');

      try {
        if (!recipient || isNaN(amount) || amount <= 0) {
          throw new Error("يرجى تعبئة حقل المستلم ومبلغ التحويل بشكل صحيح.");
        }

        // Show spinner
        wireSubmitBtn.disabled = true;
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');

        await AppDB.executeWireTransfer(GameEngine.activeUsername, recipient, amount);

        // Reset fields
        document.getElementById('wire-recipient-input').value = '';
        document.getElementById('wire-amount-input').value = '';

        showToast('حوالة صادرة', `تم تحويل مبلغ ${amount.toLocaleString()} EGP بنجاح إلى "${recipient}".`, 'success');
        
        // Log transaction locally
        addTransferHistoryRow(recipient, amount);

        renderAll();
      } catch (err) {
        showToast('فشل التحويل', err.message, 'error');
      } finally {
        wireSubmitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
      }
    });

    // Investment purchase
    const invButtons = document.querySelectorAll('.btn-invest-start');
    invButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const inputId = `invest-amount-${type}`;
        const amount = parseInt(document.getElementById(inputId).value);

        try {
          if (isNaN(amount) || amount <= 0) throw new Error("يرجى إدخال مبلغ استثمار صحيح.");
          GameEngine.startInvestment(type, amount);
          document.getElementById(inputId).value = '';
          showToast('استثمار مقفل', `تم قفل مبلغ الاستثمار في صندوق: ${GameEngine.INVESTMENTS[type].name}`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل الاستثمار', err.message, 'error');
        }
      });
    });

    // Quick-bet modifier buttons for all casino games
    document.querySelectorAll('.btn-quick-bet').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        let current = parseInt(input.value) || 0;
        if (btn.dataset.amount) {
          input.value = current + parseInt(btn.dataset.amount);
        } else if (btn.dataset.action === 'half') {
          input.value = Math.max(100, Math.floor(current / 2));
        } else if (btn.dataset.action === 'max') {
          input.value = Math.max(100, Math.floor(GameEngine.state.cash));
        }
        playCasinoSound('tick');
      });
    });

    // Sound toggle button
    const soundToggleBtn = document.getElementById('btn-casino-sound-toggle');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        casinoSoundEnabled = !casinoSoundEnabled;
        localStorage.setItem('foolos_casino_sound', casinoSoundEnabled);
        soundToggleBtn.innerHTML = casinoSoundEnabled 
          ? '<i class="fa-solid fa-volume-high"></i><span>المؤثرات الصوتية: مفعلة</span>'
          : '<i class="fa-solid fa-volume-xmark text-slate-500"></i><span class="text-slate-500">المؤثرات الصوتية: مكتومة</span>';
        if (casinoSoundEnabled) playCasinoSound('coin');
      });
    }

    // Casino Game 1: 3D Royal Coin Flip
    const coinFlipBtn = document.getElementById('btn-flip-coin');
    if (coinFlipBtn) {
      coinFlipBtn.addEventListener('click', () => {
        const betInput = document.getElementById('coin-bet-input');
        const choice = document.querySelector('input[name="coin-choice"]:checked').value;
        const bet = parseInt(betInput.value);

        try {
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى إدخال قيمة رهان صحيحة.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");
          
          coinFlipBtn.disabled = true;
          playCasinoSound('coin');

          const coinVisual = document.getElementById('coin-visual-3d') || document.getElementById('coin-visual');
          if (coinVisual) {
            coinVisual.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1)';
            coinVisual.style.transform = 'rotateY(1800deg) scale(1.1)';
          }
          
          setTimeout(() => {
            try {
              const res = GameEngine.playCoinFlip(bet, choice, coinFlipStreak);
              const isTails = (res.side === 'tails');
              if (coinVisual) {
                coinVisual.style.transition = 'transform 0.2s ease-out';
                coinVisual.style.transform = isTails ? 'rotateY(1980deg) scale(1)' : 'rotateY(1800deg) scale(1)';
              }

              const streakBadge = document.getElementById('coin-streak-badge');
              if (res.won) {
                coinFlipStreak = (coinFlipStreak || 0) + 1;
                playCasinoSound('win');
                if (streakBadge) {
                  streakBadge.textContent = `سلسلة الانتصارات: ${coinFlipStreak}x متتالية`;
                  streakBadge.className = 'text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse';
                }
                const multText = res.streakMultiplier > 1 ? ` (بونص سلسلة الفوز: ${res.streakMultiplier}x)` : '';
                showToast('ربح ملكي!', `صبت التخمين (${res.side === 'heads' ? 'التاج الملكي' : 'الدرع الدفاعي'})!${multText} كسبت +${res.profit.toLocaleString()} EGP.`, 'success');
              } else {
                coinFlipStreak = 0;
                playCasinoSound('lose');
                if (streakBadge) {
                  streakBadge.textContent = 'سلسلة الانتصارات: 0';
                  streakBadge.className = 'text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800';
                }
                showToast('خسارة الجولة', `لسوء الحظ، استقرت العملة على (${res.side === 'heads' ? 'التاج' : 'الدرع'}). خسرت -${res.loss.toLocaleString()} EGP.`, 'error');
              }
              renderAll();
            } catch (e) {
              showToast('خطأ رهان', e.message, 'error');
            } finally {
              coinFlipBtn.disabled = false;
            }
          }, 450);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
        }
      });
    }

    // Casino Game 2: Golden Neon Slots Machine
    const slotsSpinBtn = document.getElementById('btn-slots-spin');
    if (slotsSpinBtn) {
      slotsSpinBtn.addEventListener('click', () => {
        const betInput = document.getElementById('slots-bet-input');
        const bet = parseInt(betInput.value);

        try {
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");
          
          slotsSpinBtn.disabled = true;
          playCasinoSound('coin');

          const r1 = document.getElementById('slot-reel-1');
          const r2 = document.getElementById('slot-reel-2');
          const r3 = document.getElementById('slot-reel-3');

          r1.classList.add('slot-blur-spin');
          r2.classList.add('slot-blur-spin');
          r3.classList.add('slot-blur-spin');

          const tempIcons = ['CROWN', 'DIAMOND', 'GOLD', 'SACK', 'KEY'];
          const spinInterval = setInterval(() => {
            r1.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random()*tempIcons.length)]);
            r2.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random()*tempIcons.length)]);
            r3.innerHTML = getReelSymbolIcon(tempIcons[Math.floor(Math.random()*tempIcons.length)]);
          }, 45);

          setTimeout(() => {
            try {
              const res = GameEngine.playSlots(bet);
              clearInterval(spinInterval);

              r1.classList.remove('slot-blur-spin');
              r1.innerHTML = getReelSymbolIcon(res.reels[0]);
              playCasinoSound('tick');

              setTimeout(() => {
                r2.classList.remove('slot-blur-spin');
                r2.innerHTML = getReelSymbolIcon(res.reels[1]);
                playCasinoSound('tick');

                setTimeout(() => {
                  r3.classList.remove('slot-blur-spin');
                  r3.innerHTML = getReelSymbolIcon(res.reels[2]);

                  if (res.won) {
                    if (res.isJackpot) {
                      playCasinoSound('jackpot');
                      showToast('جاكبوت كاسح!', `🎉 مبروك! حصلت على الجاكبوت الذهبي الأقصى! ربحت +${res.profit.toLocaleString()} EGP!`, 'success');
                    } else {
                      playCasinoSound('win');
                      showToast('فوز الآلة', `${res.message} ربحت +${res.profit.toLocaleString()} EGP!`, 'success');
                    }
                  } else {
                    playCasinoSound('lose');
                    showToast('حظ أوفر', `${res.message} خسرت -${bet.toLocaleString()} EGP.`, 'error');
                  }
                  renderAll();
                  slotsSpinBtn.disabled = false;
                }, 140);
              }, 140);

            } catch (e) {
              clearInterval(spinInterval);
              showToast('خطأ الآلة', e.message, 'error');
              slotsSpinBtn.disabled = false;
            }
          }, 240);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
        }
      });
    }

    // Casino Game 3: Rocket Crash Bet Handlers
    const crashStartBtn = document.getElementById('btn-crash-start');
    if (crashStartBtn) {
      crashStartBtn.addEventListener('click', () => {
        runCrashBet();
      });
    }

    const crashCashoutBtn = document.getElementById('btn-crash-cashout');
    if (crashCashoutBtn) {
      crashCashoutBtn.addEventListener('click', () => {
        cashoutCrash();
      });
    }

    // Casino Game 4: European Roulette Handler
    const rouletteBtn = document.getElementById('btn-roulette-spin');
    if (rouletteBtn) {
      rouletteBtn.addEventListener('click', () => {
        const betInput = document.getElementById('roulette-bet-input');
        const bet = parseInt(betInput.value);
        const choice = document.querySelector('input[name="roulette-choice"]:checked').value;
        const wheel = document.getElementById('roulette-wheel');
        const resNum = document.getElementById('roulette-result-num');

        try {
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح للروليت.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          rouletteBtn.disabled = true;
          playCasinoSound('tick');
          wheel.style.transform = `rotate(${1800 + Math.floor(Math.random()*360)}deg)`;
          wheel.style.transition = 'all 0.6s cubic-bezier(0.15, 0.9, 0.25, 1)';

          setTimeout(() => {
            try {
              GameEngine.state.cash -= bet;

              // 0 to 36
              const landedNum = Math.floor(Math.random() * 37);
              resNum.textContent = landedNum;

              // Color determination
              let color = 'green';
              const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
              if (landedNum !== 0) {
                color = redNumbers.includes(landedNum) ? 'red' : 'black';
              }

              let won = false;
              let multiplier = 0;

              if (choice === 'green' && landedNum === 0) {
                won = true;
                multiplier = 35;
              } else if (choice === color && landedNum !== 0) {
                won = true;
                multiplier = 2;
              } else if (choice === 'even' && landedNum !== 0 && landedNum % 2 === 0) {
                won = true;
                multiplier = 2;
              } else if (choice === 'odd' && landedNum !== 0 && landedNum % 2 !== 0) {
                won = true;
                multiplier = 2;
              }

              if (won) {
                const winAmount = bet * multiplier;
                GameEngine.state.cash += winAmount;
                const profit = winAmount - bet;
                playCasinoSound('win');
                showToast('فوز الروليت!', `أصابت روليت الحظ رقم ${landedNum} (${color === 'red' ? 'أحمر' : color === 'black' ? 'أسود' : 'الصفر الأخضر'})! ربحت +${profit.toLocaleString()} EGP!`, 'success');
              } else {
                playCasinoSound('lose');
                showToast('خسارة الروليت', `استقرت العجلة على رقم ${landedNum} (${color === 'red' ? 'أحمر' : color === 'black' ? 'أسود' : 'الصفر الأخضر'}). خسرت -${bet.toLocaleString()} EGP.`, 'error');
              }

              GameEngine.forceSaveState();
              renderAll();
            } catch (e) {
              showToast('خطأ روليت', e.message, 'error');
            } finally {
              rouletteBtn.disabled = false;
              wheel.style.transform = 'rotate(0deg)';
              wheel.style.transition = 'none';
            }
          }, 600);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
        }
      });
    }

    // Casino Game 5: Wheel of Fortune Handler
    const wheelBtn = document.getElementById('btn-wheel-spin');
    if (wheelBtn) {
      wheelBtn.addEventListener('click', () => {
        const betInput = document.getElementById('wheel-bet-input');
        const bet = parseInt(betInput.value);
        const wheelVis = document.getElementById('wheel-of-fortune-visual');
        const resText = document.getElementById('wheel-multiplier-result');

        try {
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح لعجلة الحظ.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          wheelBtn.disabled = true;
          playCasinoSound('tick');
          wheelVis.style.transform = `rotate(${1440 + Math.floor(Math.random()*360)}deg)`;
          wheelVis.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.3, 1)';

          setTimeout(() => {
            try {
              GameEngine.state.cash -= bet;

              // Wheel Multipliers distribution table
              const multipliers = [0, 0.5, 1.2, 1.5, 2.0, 3.0, 5.0, 10.0];
              const weights     = [15, 25, 25, 15, 10,  6,   3,    1];
              
              let rand = Math.floor(Math.random() * 100);
              let cumulative = 0;
              let selectedMult = 1.2;

              for (let i = 0; i < multipliers.length; i++) {
                cumulative += weights[i];
                if (rand < cumulative) {
                  selectedMult = multipliers[i];
                  break;
                }
              }

              resText.textContent = `${selectedMult}x`;
              const payout = Math.floor(bet * selectedMult);
              GameEngine.state.cash += payout;

              if (selectedMult > 1.0) {
                playCasinoSound(selectedMult >= 5.0 ? 'jackpot' : 'win');
                showToast('ضربة عجلة الحظ!', `حصلت على مضاعف ${selectedMult}x! ربحت +${(payout - bet).toLocaleString()} EGP.`, 'success');
              } else if (selectedMult === 1.0) {
                showToast('استرداد الرهان', `حصلت على 1.0x واسترددت رهانك بالكامل.`, 'info');
              } else {
                playCasinoSound('lose');
                showToast('خسارة العجلة', `توقفت العجلة عند مضاعف ${selectedMult}x. خسرت -${(bet - payout).toLocaleString()} EGP.`, 'error');
              }

              GameEngine.forceSaveState();
              renderAll();
            } catch (e) {
              showToast('خطأ العجلة', e.message, 'error');
            } finally {
              wheelBtn.disabled = false;
              wheelVis.style.transform = 'rotate(0deg)';
              wheelVis.style.transition = 'none';
            }
          }, 600);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
        }
      });
    }

    // Casino Game 6: Lucky Royale Dice Handler
    const diceRollBtn = document.getElementById('btn-dice-roll');
    if (diceRollBtn) {
      diceRollBtn.addEventListener('click', () => {
        const betInput = document.getElementById('dice-bet-input');
        const bet = parseInt(betInput.value);
        const choice = document.querySelector('input[name="dice-choice"]:checked').value;
        const d1 = document.getElementById('dice-visual-1');
        const d2 = document.getElementById('dice-visual-2');
        const sumDisplay = document.getElementById('dice-sum-display');

        try {
          if (isNaN(bet) || bet <= 0) throw new Error("يرجى تحديد مبلغ رهان صحيح للنرد.");
          if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

          diceRollBtn.disabled = true;
          playCasinoSound('dice');

          d1.classList.add('dice-rolling');
          d2.classList.add('dice-rolling');

          setTimeout(() => {
            try {
              const res = GameEngine.playDice(bet, choice);
              d1.classList.remove('dice-rolling');
              d2.classList.remove('dice-rolling');

              d1.innerHTML = getDicePipIcon(res.die1);
              d2.innerHTML = getDicePipIcon(res.die2);
              if (sumDisplay) sumDisplay.textContent = res.sum;

              if (res.won) {
                playCasinoSound(res.multiplier >= 5 ? 'jackpot' : 'win');
                showToast('فوز النرد الملكي!', `${res.message} ربحت +${res.profit.toLocaleString()} EGP!`, 'success');
              } else {
                playCasinoSound('lose');
                showToast('خسارة النرد', `${res.message} خسرت -${res.loss.toLocaleString()} EGP.`, 'error');
              }

              renderAll();
            } catch (e) {
              showToast('خطأ النرد', e.message, 'error');
            } finally {
              diceRollBtn.disabled = false;
            }
          }, 350);

        } catch (err) {
          showToast('خطأ رهان', err.message, 'error');
        }
      });
    }

    // Leaderboard Manual Refresh Handler
    const lbRefreshBtn = document.getElementById('btn-leaderboard-refresh');
    if (lbRefreshBtn) {
      lbRefreshBtn.addEventListener('click', async () => {
        playCasinoSound('tick');
        showToast('تحديث الترتيب', 'جاري جلب أحدث بيانات المتصدرين...', 'info');
        await renderLeaderboard();
      });
    }
  }

  function getReelSymbolIcon(sym) {
    const map = {
      'CROWN': '<i class="fa-solid fa-crown text-yellow-400 text-2xl"></i>',
      'DIAMOND': '<i class="fa-solid fa-gem text-cyan-400 text-2xl"></i>',
      'GOLD': '<i class="fa-solid fa-coins text-amber-400 text-2xl"></i>',
      'SACK': '<i class="fa-solid fa-sack-dollar text-emerald-400 text-2xl"></i>',
      'KEY': '<i class="fa-solid fa-key text-sky-400 text-2xl"></i>'
    };
    return map[sym] || `<span class="text-xs font-bold text-slate-300">${sym}</span>`;
  }

  function getDicePipIcon(n) {
    const diceIcons = {
      1: '<i class="fa-solid fa-dice-one"></i>',
      2: '<i class="fa-solid fa-dice-two"></i>',
      3: '<i class="fa-solid fa-dice-three"></i>',
      4: '<i class="fa-solid fa-dice-four"></i>',
      5: '<i class="fa-solid fa-dice-five"></i>',
      6: '<i class="fa-solid fa-dice-six"></i>'
    };
    return diceIcons[n] || `<i class="fa-solid fa-dice-d6"></i>`;
  }

  function getReelSymbolText(sym) {
    // Emojis strictly forbidden, mapping representation texts instead
    const map = {
      'GOLD': 'ذهب [GOLD]',
      'DIAMOND': 'ألماس [DIAMOND]',
      'COIN': 'عملة [COIN]',
      'BAG': 'حقيبة [BAG]',
      'KEY': 'مفتاح [KEY]'
    };
    return map[sym] || sym;
  }

  function addTransferHistoryRow(recipient, amount) {
    const list = document.getElementById('wire-history-list');
    const emptyMsg = list.querySelector('.empty-wire-msg');
    if (emptyMsg) emptyMsg.remove();

    const row = document.createElement('div');
    row.className = 'flex justify-between items-center text-xs text-slate-400 py-1.5 border-b border-slate-800/50';
    row.innerHTML = `
      <span>حوالة صادرة إلى <strong class="text-white">${recipient}</strong></span>
      <span class="numbers-font text-rose-400">-${amount.toLocaleString()} EGP</span>
    `;
    list.prepend(row);
  }

  // --- Tab 5: Real Estate & Assets Panel ---
  function renderAssets() {
    const s = GameEngine.state;
    const container = document.getElementById('assets-list');
    container.innerHTML = '';

    Object.keys(GameEngine.ASSETS).forEach(key => {
      const asset = GameEngine.ASSETS[key];
      const owned = s.assets[key] || 0;
      
      const card = document.createElement('div');
      card.className = `glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between`;
      card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="text-lg font-bold text-white">${asset.name}</h4>
            <p class="text-xs text-slate-500 mt-1">توليد عائد مالي مستقر، وتقدير لقيمة العقار بمرور الوقت.</p>
          </div>
          <span class="text-xs px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-bold">مملوك: <span class="numbers-font">${owned}</span></span>
        </div>

        <div class="text-sm text-slate-400 space-y-1 mb-5 border-t border-b border-slate-800/80 py-3 my-2">
          <div class="flex justify-between"><span>القيمة السوقية الحالية:</span><span class="numbers-font text-yellow-500 font-semibold">${asset.cost.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>عائد الإيجار السلبي:</span><span class="numbers-font text-emerald-400">+${Math.floor(asset.rent * 0.1)} EGP / دورة</span></div>
          <div class="flex justify-between"><span>قيمة التسييل الفوري (85%):</span><span class="numbers-font text-amber-500/80">${Math.floor(asset.cost * 0.85).toLocaleString()} EGP</span></div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button id="btn-buy-asset-${key}" class="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">
            شراء وحدة إضافية
          </button>
          <button id="btn-sell-asset-${key}" class="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition" ${owned === 0 ? 'disabled' : ''}>
            تسييل وبيع وحدة
          </button>
        </div>
      `;

      // Event handlers
      card.querySelector(`#btn-buy-asset-${key}`).addEventListener('click', () => {
        try {
          GameEngine.buyAsset(key);
          showToast('عقود عقارية', `تم شراء عقار "${asset.name}" بنجاح وإضافته لمحفظتك.`, 'success');
          renderAll();
        } catch (err) {
          showToast('مرفوض', err.message, 'error');
        }
      });

      card.querySelector(`#btn-sell-asset-${key}`).addEventListener('click', () => {
        try {
          const cashBack = GameEngine.sellAsset(key);
          showToast('تسييل عقاري', `تم بيع العقار بنجاح وتسييل مبلغ بقيمة ${cashBack.toLocaleString()} EGP.`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل التسييل', err.message, 'error');
        }
      });

      container.appendChild(card);
    });
  }

  // --- Tab 6: Stock Market Panel ---
  function renderStocks() {
    const s = GameEngine.state;
    const container = document.getElementById('stocks-list');
    container.innerHTML = '';

    Object.keys(GameEngine.STOCKS).forEach(sym => {
      const stock = GameEngine.STOCKS[sym];
      const prices = GameEngine.stockPrices[sym] || [stock.basePrice];
      const currentPrice = prices[prices.length - 1];
      const prevPrice = prices[prices.length - 2] || currentPrice;
      
      const changePct = ((currentPrice - prevPrice) / prevPrice) * 100;
      const isUp = currentPrice >= prevPrice;

      const ownedData = s.stocks[sym] || { shares: 0, avgPrice: 0 };
      const totalWorth = ownedData.shares * currentPrice;
      const totalProfit = (currentPrice - ownedData.avgPrice) * ownedData.shares;

      const card = document.createElement('div');
      card.className = `glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between`;
      
      // Inline dynamic SVG sparkline logic
      const svgPath = generateSparklineSVG(prices);

      card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="text-md font-bold text-white">${stock.name}</h4>
            <span class="numbers-font text-xs text-slate-500 font-bold block mt-1">${stock.symbol}</span>
          </div>
          <div class="text-left">
            <span class="numbers-font font-bold block ${isUp ? 'text-emerald-400 glow-emerald' : 'text-rose-400 glow-rose'}">${currentPrice} EGP</span>
            <span class="numbers-font text-xs ${isUp ? 'text-emerald-500' : 'text-rose-500'} inline-block mt-0.5">${isUp ? '+' : ''}${changePct.toFixed(2)}%</span>
          </div>
        </div>

        <div class="w-full h-16 bg-slate-950/50 rounded-lg p-1 border border-slate-900/60 my-2 overflow-hidden">
          <svg viewBox="0 0 100 30" class="w-full h-full" preserveAspectRatio="none">
            <path d="${svgPath}" fill="none" stroke="${isUp ? '#10b981' : '#f43f5e'}" stroke-width="1.8" />
          </svg>
        </div>

        <div class="text-xs text-slate-400 space-y-1 mb-4 border-t border-slate-800 pt-3 mt-1">
          <div class="flex justify-between"><span>الأسهم المملوكة:</span><span class="numbers-font text-white">${ownedData.shares} سهم</span></div>
          <div class="flex justify-between"><span>متوسط سعر الشراء:</span><span class="numbers-font">${ownedData.avgPrice} EGP</span></div>
          <div class="flex justify-between"><span>قيمة الأسهم الكلية:</span><span class="numbers-font text-yellow-500 font-semibold">${totalWorth.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>ربح/خسارة المحفظة:</span><span class="numbers-font font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()} EGP</span></div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-2">
          <div class="flex flex-col">
            <div class="flex gap-1 mb-1">
              <button data-pct="0.25" class="btn-pct-buy flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-semibold">25%</button>
              <button data-pct="0.50" class="btn-pct-buy flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-semibold">50%</button>
              <button data-pct="1.00" class="btn-pct-buy flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-yellow-400 rounded font-bold">100%</button>
            </div>
            <input type="number" id="shares-buy-input-${sym}" placeholder="الكمية" class="glass-input w-full p-2 text-center text-xs rounded-lg mb-1.5" min="1" step="1"/>
            <button id="btn-buy-shares-${sym}" class="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">شراء الأسهم</button>
          </div>
          <div class="flex flex-col">
            <div class="flex gap-1 mb-1">
              <button id="btn-sell-all-${sym}" class="w-full py-0.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-[10px] text-rose-300 rounded font-bold" ${ownedData.shares === 0 ? 'disabled' : ''}>🔥 بيع كل الأسهم</button>
            </div>
            <input type="number" id="shares-sell-input-${sym}" placeholder="الكمية" class="glass-input w-full p-2 text-center text-xs rounded-lg mb-1.5" min="1" step="1"/>
            <button id="btn-sell-shares-${sym}" class="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition" ${ownedData.shares === 0 ? 'disabled' : ''}>بيع الأسهم</button>
          </div>
        </div>
      `;

      // Percentage Buy Click Listeners
      card.querySelectorAll('.btn-pct-buy').forEach(pctBtn => {
        pctBtn.addEventListener('click', () => {
          const pct = parseFloat(pctBtn.getAttribute('data-pct'));
          const availableCash = s.cash * pct;
          const maxSharesPossible = Math.floor(availableCash / currentPrice);
          const input = card.querySelector(`#shares-buy-input-${sym}`);
          if (input) input.value = maxSharesPossible > 0 ? maxSharesPossible : 1;
        });
      });

      // Sell All Shares trigger
      const sellAllBtn = card.querySelector(`#btn-sell-all-${sym}`);
      if (sellAllBtn) {
        sellAllBtn.addEventListener('click', () => {
          try {
            if (ownedData.shares <= 0) throw new Error("لا تملك أي أسهم في هذه الشركة لبيعها.");
            const res = GameEngine.sellStock(sym, ownedData.shares);
            showToast('بيع كلي', `تمت بيع وتسييل كامل الأسهم (${res.shares} سهم) بقيمة +${res.totalPayout.toLocaleString()} EGP.`, 'success');
            renderAll();
          } catch (err) {
            showToast('فشل البيع', err.message, 'error');
          }
        });
      }

      // Buy Shares trigger
      card.querySelector(`#btn-buy-shares-${sym}`).addEventListener('click', () => {
        const input = card.querySelector(`#shares-buy-input-${sym}`);
        const count = parseInt(input.value);
        try {
          if (!count || count <= 0) throw new Error("يرجى إدخال عدد أسهم صحيح.");
          const res = GameEngine.buyStock(sym, count);
          input.value = '';
          showToast('شراء أسهم', `تم شراء عدد ${res.shares} سهم من سهم "${stock.name}" بنجاح.`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل الشراء', err.message, 'error');
        }
      });

      // Sell Shares trigger
      card.querySelector(`#btn-sell-shares-${sym}`).addEventListener('click', () => {
        const input = card.querySelector(`#shares-sell-input-${sym}`);
        const count = parseInt(input.value);
        try {
          if (!count || count <= 0) throw new Error("يرجى إدخال عدد أسهم صحيح.");
          const res = GameEngine.sellStock(sym, count);
          input.value = '';
          showToast('بيع أسهم', `تمت تسييل عدد ${res.shares} سهم من سهم "${stock.name}" للسيولة.`, 'success');
          renderAll();
        } catch (err) {
          showToast('فشل البيع', err.message, 'error');
        }
      });

      container.appendChild(card);
    });
  }

  // Selective DOM price update to prevent input field re-creation/wiping while typing
  function updateStockPricesInDOM() {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      // User is currently typing inside an input field — skip DOM redraw to preserve focus
      return;
    }
    renderStocks();
  }

  // Draw Line Charts inside SVG
  function generateSparklineSVG(prices) {
    if (prices.length < 2) return "M 0 15 L 100 15";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min === 0 ? 1 : max - min;

    const width = 100;
    const height = 30;

    let path = "";
    prices.forEach((price, idx) => {
      const x = (idx / (prices.length - 1)) * width;
      // Invert Y axis since SVG 0 is top
      const y = height - ((price - min) / range) * (height - 6) - 3;
      path += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    return path;
  }

  // --- Tab 7: Store & Inventory Panel ---
  function renderStore() {
    const s = GameEngine.state;
    
    // Render store shelf
    const shelf = document.getElementById('store-shelf');
    shelf.innerHTML = '';

    Object.keys(GameEngine.STORE_ITEMS).forEach(id => {
      const item = GameEngine.STORE_ITEMS[id];
      const count = s.inventory[id] || 0;
      const ticksRemaining = (s.itemDurations && s.itemDurations[id]) ? s.itemDurations[id] : 0;
      const secRemaining = ticksRemaining * 3;

      const card = document.createElement('div');
      card.className = 'glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-start';
      card.innerHTML = `
        <div class="mb-3 w-full">
          <div class="flex justify-between items-center mb-1">
            <h4 class="font-bold text-white text-sm">${item.name}</h4>
            <span class="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full font-bold">متاح: <span class="numbers-font">${count}</span></span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed mb-2">${item.desc || 'مفعول خاص ومؤقت ينتهي ويدمر ذاته.'}</p>
        </div>
        <div class="w-full text-xs text-slate-400 space-y-1 mb-4 border-t border-slate-800/60 pt-2.5">
          <div class="flex justify-between"><span>سعر البيع:</span><span class="numbers-font text-yellow-500 font-bold">${item.cost.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>مدة الصلاحية:</span><span class="numbers-font text-rose-400 font-semibold">${item.durationTicks * 3} ثانية</span></div>
          ${count > 0 ? `<div class="flex justify-between"><span>عداد التدمير الذاتي:</span><span class="numbers-font text-yellow-400 font-bold animate-pulse">${secRemaining} ثانية متبقية</span></div>` : ''}
        </div>
        <button id="btn-buy-store-${id}" class="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg shadow-yellow-500/10">
          شراء وتفعيل المفعول
        </button>
      `;

      card.querySelector(`#btn-buy-store-${id}`).addEventListener('click', () => {
        try {
          GameEngine.buyStoreItem(id);
          showToast('فاتورة متجر', `تم شراء "${item.name}" ودفع القيمة النقود.`, 'success');
          renderAll();
        } catch (err) {
          showToast('رصيد معلق', err.message, 'error');
        }
      });

      shelf.appendChild(card);
    });

    // Render backpack inventory
    const bag = document.getElementById('backpack-inventory');
    bag.innerHTML = '';

    const usableItems = Object.keys(s.inventory).filter(id => s.inventory[id] > 0 && GameEngine.STORE_ITEMS[id]);

    if (usableItems.length === 0) {
      bag.innerHTML = `
        <div class="col-span-full text-center text-slate-500 text-xs py-4">
          حقيبة ظهرك فارغة تماماً. قم بزيارة الرف الأعلى لشراء عناصر الدعم والتعزيزات الفائقة.
        </div>
      `;
    } else {
      usableItems.forEach(id => {
        const item = GameEngine.STORE_ITEMS[id];
        const count = s.inventory[id];
        const ticksRemaining = (s.itemDurations && s.itemDurations[id]) ? s.itemDurations[id] : 0;
        const secRemaining = ticksRemaining * 3;

        const card = document.createElement('div');
        card.className = 'glass-panel p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs';
        card.innerHTML = `
          <div>
            <h5 class="font-bold text-white mb-0.5">${item.name}</h5>
            <p class="text-[10px] text-slate-400 leading-snug">${item.desc}</p>
          </div>
          <div class="text-left whitespace-nowrap mr-3">
            <span class="text-[10px] text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded bg-yellow-500/10 font-bold block mb-1">
              ⏳ تدمير ذاتي: <span class="numbers-font">${secRemaining}ث</span>
            </span>
          </div>
        `;

        bag.appendChild(card);
      });
    }
  }

  // --- Tab 8: Black Market Panel ---
  function renderBlackMarket() {
    const s = GameEngine.state;
    const container = document.getElementById('blackmarket-deals');
    container.innerHTML = '';

    Object.keys(GameEngine.BLACK_MARKET).forEach(id => {
      const deal = GameEngine.BLACK_MARKET[id];
      
      const card = document.createElement('div');
      card.className = 'glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between bg-gradient-to-br from-rose-950/10 to-slate-900/40';
      
      // Calculate active lawyer protection display
      let protectionText = "";
      let riskPct = Math.round((1 - deal.successChance) * 100);
      if (s.inventory.premium_lawyer > 0) {
        riskPct = Math.round(riskPct * (1 - GameEngine.STORE_ITEMS.premium_lawyer.value));
        protectionText = `<span class="text-[10px] px-1.5 py-0.5 bg-sky-500/20 text-sky-400 rounded border border-sky-500/30 font-semibold block mt-1 text-center">حماية المحامي نشطة (-35% خطورة)</span>`;
      }

      card.innerHTML = `
        <div class="mb-4">
          <h4 class="text-md font-bold text-rose-400">${deal.name}</h4>
          <p class="text-xs text-slate-500 mt-1">تجارة محظورة عالية المردود المالي ولكن تحمل مخاطرة المداهمة الأمنية والسجن.</p>
        </div>

        <div class="text-xs text-slate-400 space-y-1 mb-5 border-t border-b border-slate-800/80 py-3">
          <div class="flex justify-between"><span>رأس المال المطلوب:</span><span class="numbers-font text-white">${deal.cost.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>العائد الإجمالي (الفوز):</span><span class="numbers-font text-emerald-400 font-bold">+${deal.payout.toLocaleString()} EGP</span></div>
          <div class="flex justify-between"><span>نسبة الإيقاف (الشرطة):</span><span class="numbers-font text-rose-400 font-bold">${riskPct}%</span></div>
          <div class="flex justify-between"><span>عقوبة السجن:</span><span class="numbers-font text-amber-500">${deal.jailDuration * 3} ثانية</span></div>
          ${protectionText}
        </div>

        <button id="btn-run-deal-${id}" class="w-full py-2.5 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition">
          بدء المغامرة وتوقيع الصفقة
        </button>
      `;

      card.querySelector(`#btn-run-deal-${id}`).addEventListener('click', () => {
        try {
          const res = GameEngine.runBlackMarketDeal(id);
          if (res.success) {
            showToast('ضربة معلم!', `نجحت الصفقة المشبوهة! وحصلت على ربح صافٍ قدره +${res.profit.toLocaleString()} EGP.`, 'success');
          } else {
            showToast('مداهمة الشرطة!', `تم رصد عمليتك وضبطك من السلطات! مصادرة ${res.confiscation.toLocaleString()} EGP وإيداعك السجن.`, 'error');
          }
          renderAll();
        } catch (err) {
          showToast('فشل المداهمة', err.message, 'error');
        }
      });

      container.appendChild(card);
    });
  }

  // --- Tab 9: Casino Panel ---
  function renderCasino() {
    const vipBadge = document.getElementById('casino-vip-badge');
    if (vipBadge) {
      const hasVIP = GameEngine.state.inventory && GameEngine.state.inventory.vip_casino_pass > 0;
      if (hasVIP) {
        vipBadge.innerHTML = '<i class="fa-solid fa-crown text-amber-400"></i><span>عضوية VIP نشطة (+15% حظ)</span>';
        vipBadge.className = 'text-xs px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold shadow-sm flex items-center gap-1.5 glow-gold';
      } else {
        vipBadge.innerHTML = '<i class="fa-solid fa-gem text-slate-400"></i><span>عضو عادي (شراء تذكرة VIP من المتجر لرفع الحظ)</span>';
        vipBadge.className = 'text-xs px-3 py-1 bg-slate-800/80 text-slate-400 border border-slate-700/80 rounded-full font-bold flex items-center gap-1.5';
      }
    }
  }

  // --- Casino Game: Crash Multiplier (Classic Rocket Animation with Auto-Cashout) ---
  function runCrashBet() {
    const betInput = document.getElementById('crash-bet-input');
    const bet = parseInt(betInput.value);

    try {
      if (crashState === 'running') return;
      if (isNaN(bet) || bet <= 0) throw new Error("يرجى إدخال مبلغ رهان صحيح.");
      if (GameEngine.state.cash < bet) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

      playCasinoSound('tick');

      // Deduct cash immediately
      GameEngine.state.cash -= bet;
      crashBetAmount = bet;
      crashMultiplier = 1.0;
      crashState = 'running';

      // Predetermine crash point (VIP pass gives bonus endurance)
      const hasVIP = GameEngine.state.inventory && GameEngine.state.inventory.vip_casino_pass > 0;
      const instantCrashChance = hasVIP ? 0.02 : 0.05;

      if (Math.random() < instantCrashChance) {
        crashTarget = 1.0;
      } else {
        // Exponential distribution up to 15x
        crashTarget = parseFloat((1 + Math.pow(Math.random(), hasVIP ? 2.3 : 2.8) * 14).toFixed(2));
      }

      // Update Buttons & Visuals
      document.getElementById('btn-crash-start').classList.add('hidden');
      const cashoutBtn = document.getElementById('btn-crash-cashout');
      cashoutBtn.classList.remove('hidden');
      cashoutBtn.disabled = false;
      document.getElementById('crash-cashout-payout').textContent = bet.toLocaleString();

      const statusText = document.getElementById('crash-status-text');
      statusText.textContent = 'الصاروخ يرتفع...';
      statusText.className = 'text-[11px] text-yellow-400 font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-yellow-500/30 animate-pulse';

      // Reset Rocket SVG color
      const rocket = document.getElementById('crash-svg-rocket');
      if (rocket) rocket.setAttribute('fill', '#eab308');

      crashStartTime = Date.now();
      animateCrashGame();

    } catch (err) {
      showToast('خطأ رهان', err.message, 'error');
    }
  }

  function animateCrashGame() {
    if (crashState !== 'running') return;

    const elapsed = (Date.now() - crashStartTime) / 1000;
    crashMultiplier = parseFloat((Math.pow(1.14, elapsed * 3.2)).toFixed(2));

    const display = document.getElementById('crash-multiplier-display');
    if (display) display.textContent = `${crashMultiplier.toFixed(2)}x`;

    const curve = document.getElementById('crash-svg-curve');
    const rocket = document.getElementById('crash-svg-rocket');

    if (curve && rocket) {
      const x = Math.min(90, 10 + elapsed * 12);
      const y = Math.max(10, 80 - Math.pow(elapsed * 2.0, 1.6));
      curve.setAttribute('d', `M 10 80 Q 50 80 ${x} ${y}`);
      rocket.setAttribute('cx', x);
      rocket.setAttribute('cy', y);
    }

    const currentPayout = Math.floor(crashBetAmount * crashMultiplier);
    const payoutEl = document.getElementById('crash-cashout-payout');
    if (payoutEl) payoutEl.textContent = currentPayout.toLocaleString();

    // Check Auto-Cashout
    const autoInput = document.getElementById('crash-autocashout-input');
    const autoVal = autoInput ? parseFloat(autoInput.value) : NaN;
    if (!isNaN(autoVal) && autoVal > 1.0 && crashMultiplier >= autoVal) {
      cashoutCrash();
      return;
    }

    // Check if crash target hit
    if (crashMultiplier >= crashTarget) {
      triggerCrash();
      return;
    }

    crashAnimationId = requestAnimationFrame(animateCrashGame);
  }

  function triggerCrash() {
    cancelAnimationFrame(crashAnimationId);
    crashState = 'crashed';
    playCasinoSound('lose');
    
    const statusText = document.getElementById('crash-status-text');
    if (statusText) {
      statusText.textContent = `انفجر عند ${crashTarget.toFixed(2)}x !`;
      statusText.className = 'text-[11px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-500/40 animate-pulse';
    }

    const rocket = document.getElementById('crash-svg-rocket');
    if (rocket) rocket.setAttribute('fill', '#f43f5e');

    document.getElementById('btn-crash-start').classList.remove('hidden');
    document.getElementById('btn-crash-cashout').classList.add('hidden');

    GameEngine.state.netWorth = GameEngine.calculateNetWorth();
    AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);

    showToast('تحطم الصاروخ', `انفجر الصاروخ عند مضاعف ${crashTarget.toFixed(2)}x. خسرت رهانك -${crashBetAmount.toLocaleString()} EGP.`, 'error');
    renderAll();
  }

  function cashoutCrash() {
    if (crashState !== 'running') return;

    cancelAnimationFrame(crashAnimationId);
    crashState = 'cashed_out';

    const winAmount = Math.floor(crashBetAmount * crashMultiplier);
    GameEngine.state.cash += winAmount;

    playCasinoSound(crashMultiplier >= 5.0 ? 'jackpot' : 'win');

    const statusText = document.getElementById('crash-status-text');
    if (statusText) {
      statusText.textContent = `صُرفت الأرباح عند ${crashMultiplier.toFixed(2)}x !`;
      statusText.className = 'text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40';
    }

    document.getElementById('btn-crash-start').classList.remove('hidden');
    document.getElementById('btn-crash-cashout').classList.add('hidden');

    GameEngine.state.netWorth = GameEngine.calculateNetWorth();
    AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);

    showToast('صرف الأرباح بنجاح', `تم صرف الأرباح عند مضاعف ${crashMultiplier.toFixed(2)}x! ربحت +${(winAmount - crashBetAmount).toLocaleString()} EGP!`, 'success');
    renderAll();
  }

  // --- Tab 10: Leaderboard Panel (Grand Tycoon Leaderboard & Podium) ---
  async function renderLeaderboard() {
    const list = document.getElementById('leaderboard-rows');
    if (!list) return;

    list.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8 text-slate-400">
          <div class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></span>
            <span class="font-bold text-xs">جاري تحديث عرش الأثرياء المباشر...</span>
          </div>
        </td>
      </tr>
    `;

    try {
      const players = await AppDB.getLeaderboard();
      list.innerHTML = '';

      if (!players || players.length === 0) {
        list.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-8 text-slate-500 text-xs">
              لا توجد حسابات مسجلة حالياً في قائمة المتصدرين.
            </td>
          </tr>
        `;
        return;
      }

      // Update Podium Cards (Top 3)
      const top1 = players[0];
      const top2 = players[1];
      const top3 = players[2];

      // Podium 1 (Gold - 1st)
      if (top1) {
        const p1Name = document.getElementById('podium-name-1');
        const p1Title = document.getElementById('podium-title-1');
        const p1Worth = document.getElementById('podium-worth-1');
        const p1Avatar = document.getElementById('podium-avatar-1');
        if (p1Name) p1Name.textContent = top1.username;
        if (p1Title) p1Title.textContent = top1.title || 'إمبراطور المال';
        if (p1Worth) p1Worth.textContent = `${Number(top1.netWorth || 0).toLocaleString()} EGP`;
        if (p1Avatar) p1Avatar.textContent = (top1.username || 'P').substring(0, 2).toUpperCase();
      }

      // Podium 2 (Silver - 2nd)
      if (top2) {
        const p2Name = document.getElementById('podium-name-2');
        const p2Title = document.getElementById('podium-title-2');
        const p2Worth = document.getElementById('podium-worth-2');
        const p2Avatar = document.getElementById('podium-avatar-2');
        if (p2Name) p2Name.textContent = top2.username;
        if (p2Title) p2Title.textContent = top2.title || 'بارون التجارة';
        if (p2Worth) p2Worth.textContent = `${Number(top2.netWorth || 0).toLocaleString()} EGP`;
        if (p2Avatar) p2Avatar.textContent = (top2.username || 'P').substring(0, 2).toUpperCase();
      }

      // Podium 3 (Bronze - 3rd)
      if (top3) {
        const p3Name = document.getElementById('podium-name-3');
        const p3Title = document.getElementById('podium-title-3');
        const p3Worth = document.getElementById('podium-worth-3');
        const p3Avatar = document.getElementById('podium-avatar-3');
        if (p3Name) p3Name.textContent = top3.username;
        if (p3Title) p3Title.textContent = top3.title || 'رجل أعمال كبار';
        if (p3Worth) p3Worth.textContent = `${Number(top3.netWorth || 0).toLocaleString()} EGP`;
        if (p3Avatar) p3Avatar.textContent = (top3.username || 'P').substring(0, 2).toUpperCase();
      }

      // Update Self Rank indicator
      const activeUser = GameEngine.activeUsername;
      const selfIndex = players.findIndex(p => p.username === activeUser);
      const selfRankEl = document.getElementById('self-rank-num');
      if (selfRankEl) {
        selfRankEl.textContent = selfIndex !== -1 ? `#${selfIndex + 1}` : 'خارج قائمة الـ 25';
      }

      // Render Table Rows
      players.forEach((player, idx) => {
        const isSelf = player.username === activeUser;
        const rank = idx + 1;
        const initials = (player.username || 'P').substring(0, 2).toUpperCase();
        
        const row = document.createElement('tr');
        row.className = `border-b border-slate-800/40 text-xs transition duration-200 ${
          isSelf 
            ? 'bg-yellow-500/10 hover:bg-yellow-500/15 font-bold border-r-4 border-r-yellow-500' 
            : idx < 3 ? 'bg-slate-900/30 hover:bg-slate-900/60' : 'hover:bg-slate-900/40'
        }`;
        
        let rankBadge = '';
        if (rank === 1) {
          rankBadge = `<span class="w-8 h-8 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md glow-gold"><i class="fa-solid fa-crown text-[10px] ml-1"></i>1</span>`;
        } else if (rank === 2) {
          rankBadge = `<span class="w-8 h-8 rounded-xl bg-slate-700 border border-slate-400/60 text-slate-100 font-black flex items-center justify-center text-xs shadow"><i class="fa-solid fa-medal text-[10px] ml-1"></i>2</span>`;
        } else if (rank === 3) {
          rankBadge = `<span class="w-8 h-8 rounded-xl bg-amber-950 border border-amber-600/60 text-amber-400 font-black flex items-center justify-center text-xs shadow"><i class="fa-solid fa-award text-[10px] ml-1"></i>3</span>`;
        } else {
          rankBadge = `<span class="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs numbers-font">#${rank}</span>`;
        }

        row.innerHTML = `
          <td class="py-3.5 pr-5 pl-2 text-right">
            ${rankBadge}
          </td>
          <td class="py-3.5 px-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-300 numbers-font">
                ${initials}
              </div>
              <div>
                <span class="font-black ${isSelf ? 'text-yellow-400 glow-gold' : rank === 1 ? 'text-yellow-300' : 'text-white'} text-sm block">
                  ${player.username}
                </span>
                ${isSelf ? '<span class="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-bold inline-block border border-yellow-500/30">أنت (حسابك)</span>' : ''}
              </div>
            </div>
          </td>
          <td class="py-3.5 px-3 text-slate-400">
            <span class="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 inline-block">
              ${player.title || 'مستثمر'}
            </span>
          </td>
          <td class="py-3.5 pl-5 pr-3 text-left">
            <span class="numbers-font font-black ${rank === 1 ? 'text-yellow-400 text-sm glow-gold' : 'text-emerald-400 text-xs'}">
              ${Number(player.netWorth || 0).toLocaleString()} EGP
            </span>
          </td>
        `;
        list.appendChild(row);
      });

    } catch (err) {
      list.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-rose-400 text-xs">
            <i class="fa-solid fa-circle-exclamation text-base mb-1 block"></i>
            تعذر تحميل قائمة المتصدرين. تأكد من اتصالك بالإنترنت.
          </td>
        </tr>
      `;
    }
  }

  // --- Helper Elements: Toast Notifications ---
  function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
      error:   `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
      info:    `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      warning: `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
    };

    const colors = {
      success: { border: 'border-emerald-500/60', bg: 'bg-emerald-500/10', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
      error:   { border: 'border-rose-500/60',    bg: 'bg-rose-500/10',    icon: 'text-rose-400',    dot: 'bg-rose-400'    },
      info:    { border: 'border-sky-500/60',      bg: 'bg-sky-500/10',      icon: 'text-sky-400',     dot: 'bg-sky-400'     },
      warning: { border: 'border-yellow-500/60',  bg: 'bg-yellow-500/10',  icon: 'text-yellow-400',  dot: 'bg-yellow-400'  },
    };

    const c = colors[type] || colors.info;
    const icon = icons[type] || icons.info;

    const toast = document.createElement('div');
    toast.className = `w-full pointer-events-auto`;
    toast.style.cssText = 'transform: translateY(-16px); opacity: 0; transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease;';

    toast.innerHTML = `
      <div class="flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl border backdrop-blur-xl ${c.border} ${c.bg}"
           style="background: rgba(5,7,15,0.88); box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04);">
        <span class="mt-0.5 ${c.icon}">${icon}</span>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-white text-sm leading-tight">${title}</div>
          ${message ? `<div class="text-xs text-slate-300 leading-relaxed mt-0.5 break-words">${message}</div>` : ''}
        </div>
        <span class="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${c.dot}"></span>
      </div>
    `;

    container.prepend(toast);

    // Animate in from top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
      });
    });

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      toast.style.transform = 'translateY(-12px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Floating Passive indicators
  function showPassiveGainFloat(text) {
    const parent = document.getElementById('passive-float-spawn');
    if (!parent) return;

    const el = document.createElement('div');
    el.className = 'absolute text-emerald-400 font-bold text-sm numbers-font animate-float pointer-events-none glow-emerald';
    el.textContent = text;
    // Set random position inside spawn box
    el.style.left = `${Math.floor(Math.random() * 50) + 20}%`;
    el.style.top = `${Math.floor(Math.random() * 30) + 10}%`;

    parent.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 1200);
  }

  // --- Admin Panel Setup & Realtime Event Listeners ---

  let activeListeners = [];

  function setupRealTimeListeners(username) {
    // Clean up existing listeners
    activeListeners.forEach(unsub => unsub());
    activeListeners = [];

    // Show/Hide Admin Trigger Button
    const adminTrigger = document.getElementById('btn-admin-panel-trigger');
    if (adminTrigger) {
      const isAdmin = (username === 'FoolosAdmin_X99' || (GameEngine.state && GameEngine.state.isAdmin));
      if (isAdmin) {
        adminTrigger.classList.remove('hidden');
      } else {
        adminTrigger.classList.add('hidden');
      }
    }

    if (!AppDB.isFirebaseReady) return;

    const db = firebase.firestore();

    // 1. Broadcast Listener
    let lastBroadcastTime = Date.now();
    const unsubBroadcast = db.collection('globals').doc('broadcast')
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.timestamp > lastBroadcastTime) {
          lastBroadcastTime = data.timestamp;
          showToast('بث الإدارة', data.message, 'info');
        }
      }, (err) => console.error("Broadcast listen err: ", err));
    activeListeners.push(unsubBroadcast);

    // 2. Maintenance Listener
    const unsubMaintenance = db.collection('globals').doc('maintenance')
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.enabled) {
          const username = GameEngine.activeUsername;
          const isAdmin = (username === 'FoolosAdmin_X99' || (GameEngine.state && GameEngine.state.isAdmin));
          if (!isAdmin) {
            handleMaintenanceMode(data.message);
          }
        } else {
          hideMaintenanceOverlay();
        }
      }, (err) => console.error("Maintenance listen err: ", err));
    activeListeners.push(unsubMaintenance);

    // 3. Airdrop Listener
    let lastAirdropTime = Date.now();
    const unsubAirdrop = db.collection('globals').doc('airdrop')
      .onSnapshot(async (doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.timestamp > lastAirdropTime) {
          lastAirdropTime = data.timestamp;
          const s = GameEngine.state;
          s.cash += data.amount;
          GameEngine.forceSaveState();
          showToast('مكافأة عامة', `استلمت مكافأة عامة بقيمة +${data.amount.toLocaleString()} EGP!`, 'success');
          renderAll();
        }
      }, (err) => console.error("Airdrop listen err: ", err));
    activeListeners.push(unsubAirdrop);

    // 3. User document listener for ban & external edits
    let lastAdminActionTimestamp = Date.now();
    const unsubUser = db.collection('players').doc(username)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        // Ignore local pending writes to prevent circular sync loops
        if (doc.metadata && doc.metadata.hasPendingWrites) return;

        const data = doc.data();

        // Ban check
        if (data.isBanned) {
          unsubUser();
          handleBannedUser();
          return;
        }

        // Only process external admin modifications if explicitly timestamped
        if (data.adminModifiedTimestamp && data.adminModifiedTimestamp > lastAdminActionTimestamp) {
          lastAdminActionTimestamp = data.adminModifiedTimestamp;
          const s = GameEngine.state;
          let modified = false;
          if (data.cash !== undefined && data.cash !== s.cash) {
            s.cash = data.cash;
            modified = true;
          }
          if (data.bank !== undefined && data.bank !== s.bank) {
            s.bank = data.bank;
            modified = true;
          }
          if (data.jailTimer !== undefined && data.jailTimer !== s.jailTimer) {
            s.jailTimer = data.jailTimer;
            modified = true;
          }

          if (modified) {
            GameEngine.forceSaveState();
            showToast('إشعار النظام', 'تم تحديث بيانات حسابك من قبل الإدارة.', 'info');
            renderAll();
          }
        }
      }, (err) => console.error("User doc listen err: ", err));
    activeListeners.push(unsubUser);
  }

  async function checkMaintenanceMode() {
    try {
      const status = await AppDB.getMaintenanceStatus();
      if (status && status.enabled) {
        const username = localStorage.getItem('foolos_active_session_user') || GameEngine.activeUsername;
        const isAdmin = (username === 'FoolosAdmin_X99' || (GameEngine.state && GameEngine.state.isAdmin));
        if (!isAdmin) {
          handleMaintenanceMode(status.message);
          return true;
        }
      }
    } catch (e) { console.warn('Maintenance check err:', e); }
    return false;
  }

  function handleMaintenanceMode(customMsg) {
    const maintOverlay = document.getElementById('maintenance-overlay');
    const mainGameLayout = document.getElementById('main-game-layout');
    const authScreen = document.getElementById('auth-screen');
    const startMenu = document.getElementById('start-menu-screen');
    const msgText = document.getElementById('maintenance-msg-text');
    if (maintOverlay) maintOverlay.classList.remove('hidden');
    if (mainGameLayout) mainGameLayout.classList.add('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    if (startMenu) startMenu.classList.add('hidden');
    if (msgText && customMsg) msgText.textContent = customMsg;
  }

  function hideMaintenanceOverlay() {
    const maintOverlay = document.getElementById('maintenance-overlay');
    if (maintOverlay) maintOverlay.classList.add('hidden');
  }

  function updateMaintenanceUIState(isMaint) {
    const badge = document.getElementById('admin-maintenance-badge');
    const toggleBtn = document.getElementById('btn-admin-toggle-maintenance');
    if (badge) {
      if (isMaint) {
        badge.textContent = 'وضع الصيانة نشط 🚨';
        badge.className = 'text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 font-bold animate-pulse';
      } else {
        badge.textContent = 'النظام يعمل بشكل طبيعي';
        badge.className = 'text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-bold';
      }
    }
    if (toggleBtn) {
      if (isMaint) {
        toggleBtn.textContent = '✅ إنهاء وضع الصيانة والعودة للتشغيل الطبيعي للجميع';
        toggleBtn.className = 'w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs transition shadow-lg shadow-emerald-600/20';
      } else {
        toggleBtn.textContent = '🚨 إغلاق اللعبة وتفعيل وضع الصيانة الشامل للجميع';
        toggleBtn.className = 'w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg text-xs transition shadow-lg shadow-amber-600/10';
      }
    }
  }

  function handleBannedUser() {
    const banOverlay = document.getElementById('ban-overlay');
    const mainGameLayout = document.getElementById('main-game-layout');
    const authScreen = document.getElementById('auth-screen');
    const startMenu = document.getElementById('start-menu-screen');
    if (banOverlay) banOverlay.classList.remove('hidden');
    if (mainGameLayout) mainGameLayout.classList.add('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    if (startMenu) startMenu.classList.add('hidden');
    performLogout(false);
  }

  function performLogout(showToastMsg = true) {
    activeListeners.forEach(unsub => unsub());
    activeListeners = [];
    localStorage.removeItem('foolos_active_session_user');
    GameEngine.logoutUser();
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-game-layout').classList.add('hidden');
    document.getElementById('start-menu-screen').classList.remove('hidden');
    refreshStartMenuCard();
    if (showToastMsg) {
      showToast('تسجيل الخروج', 'تم تسجيل خروجك بنجاح وحفظ بيانات المحفظة.', 'info');
    }
  }

  function setupAdminModal() {
    const trigger = document.getElementById('btn-admin-panel-trigger');
    const modal = document.getElementById('admin-panel-modal');
    const closeBtn = document.getElementById('btn-admin-modal-close');

    if (!trigger || !modal || !closeBtn) return;

    // Trigger panel open
    trigger.addEventListener('click', () => {
      modal.classList.remove('hidden');
      switchAdminTab('stats');
    });

    // Close panel
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Tabs logic - bind all 6 subtabs
    const tabs = ['stats', 'transfers', 'players', 'market', 'broadcast', 'system'];
    tabs.forEach(t => {
      const tabEl = document.getElementById(`tab-admin-${t}`);
      if (tabEl) {
        tabEl.addEventListener('click', () => {
          switchAdminTab(t);
        });
      }
    });

    // Search Player logic
    let searchedUser = null;
    let searchedUserState = null;
    const searchBtn = document.getElementById('btn-admin-search');
    const searchInput = document.getElementById('admin-search-user');
    const resultBox = document.getElementById('admin-player-result');

    if (searchBtn && searchInput && resultBox) {
      searchBtn.addEventListener('click', async () => {
        const q = searchInput.value.trim();
        if (!q) {
          showToast('بحث الإدارة', 'يرجى إدخال اسم المستخدم للبحث.', 'error');
          return;
        }
        try {
          const state = await AppDB.adminGetPlayer(q);
          searchedUser = q;
          searchedUserState = state;

          document.getElementById('admin-p-username').textContent = q;
          document.getElementById('admin-p-worth').textContent = (state.netWorth || 0).toLocaleString();
          document.getElementById('admin-p-cash').textContent = (state.cash || 0).toLocaleString();
          document.getElementById('admin-p-bank').textContent = (state.bank || 0).toLocaleString();
          document.getElementById('admin-p-jail').textContent = (state.jailTimer > 0) ? `سجين (${state.jailTimer}ث)` : 'حر طليق';
          document.getElementById('admin-p-banned').textContent = state.isBanned ? 'محظور 🚫' : 'نشط';

          document.getElementById('admin-input-cash').value = state.cash || 0;
          document.getElementById('admin-input-bank').value = state.bank || 0;

          resultBox.classList.remove('hidden');
          logAdminAction(`تم البحث عن اللاعب: ${q}`);
        } catch (err) {
          resultBox.classList.add('hidden');
          showToast('بحث الإدارة', err.message, 'error');
        }
      });
    }

    // Save Balance Action
    const updateMoneyBtn = document.getElementById('btn-admin-update-money');
    if (updateMoneyBtn) {
      updateMoneyBtn.addEventListener('click', async () => {
        if (!searchedUser || !searchedUserState) return;
        const newCash = Number(document.getElementById('admin-input-cash').value);
        const newBank = Number(document.getElementById('admin-input-bank').value);
        try {
          searchedUserState.cash = newCash;
          searchedUserState.bank = newBank;
          
          // Recalculate netWorth on player state
          let worth = newCash + newBank;
          if (searchedUserState.assets) {
            Object.keys(searchedUserState.assets).forEach(k => {
              if (GameEngine.ASSETS[k]) worth += searchedUserState.assets[k] * GameEngine.ASSETS[k].cost;
            });
          }
          if (searchedUserState.stocks) {
            Object.keys(searchedUserState.stocks).forEach(sym => {
              const shares = searchedUserState.stocks[sym].shares || 0;
              const history = GameEngine.stockPrices[sym] || [GameEngine.STOCKS[sym].basePrice];
              const currentPrice = history[history.length - 1];
              worth += shares * currentPrice;
            });
          }
          if (searchedUserState.investments) {
            searchedUserState.investments.forEach(inv => worth += inv.investedAmount);
          }
          searchedUserState.netWorth = worth;

          await AppDB.adminSavePlayer(searchedUser, searchedUserState);
          showToast('إشراف الرصيد', 'تم حفظ وتحديث رصيد اللاعب بنجاح.', 'success');
          
          // Update view
          document.getElementById('admin-p-cash').textContent = newCash.toLocaleString();
          document.getElementById('admin-p-bank').textContent = newBank.toLocaleString();
          document.getElementById('admin-p-worth').textContent = worth.toLocaleString();

          logAdminAction(`تعديل رصيد اللاعب ${searchedUser} إلى: كاش ${newCash}، بنك ${newBank}`);
        } catch (err) {
          showToast('خطأ إشرافي', err.message, 'error');
        }
      });
    }

    // Release Jail Action
    const releaseJailBtn = document.getElementById('btn-admin-release-jail');
    if (releaseJailBtn) {
      releaseJailBtn.addEventListener('click', async () => {
        if (!searchedUser) return;
        try {
          await AppDB.adminReleaseJail(searchedUser);
          showToast('إفراج إداري', `تم العفو المالي والإفراج عن اللاعب ${searchedUser} بنجاح.`, 'success');
          document.getElementById('admin-p-jail').textContent = 'حر طليق';
          logAdminAction(`إفراج قانوني وعفو عن اللاعب: ${searchedUser}`);
        } catch (err) {
          showToast('خطأ إشرافي', err.message, 'error');
        }
      });
    }

    // Ban Action
    const banBtn = document.getElementById('btn-admin-ban');
    if (banBtn) {
      banBtn.addEventListener('click', async () => {
        if (!searchedUser) return;
        if (!confirm(`هل أنت متأكد من حظر حساب اللاعب ${searchedUser} نهائياً؟`)) return;
        try {
          await AppDB.adminBanPlayer(searchedUser);
          showToast('حظر الإدارة', `تم حظر حساب اللاعب ${searchedUser} نهائياً.`, 'success');
          document.getElementById('admin-p-banned').textContent = 'محظور 🚫';
          logAdminAction(`حظر نهائي لحساب اللاعب: ${searchedUser}`);
        } catch (err) {
          showToast('خطأ حظر', err.message, 'error');
        }
      });
    }

    // Send Broadcast
    const sendBroadcastBtn = document.getElementById('btn-admin-send-broadcast');
    if (sendBroadcastBtn) {
      sendBroadcastBtn.addEventListener('click', async () => {
        const msg = document.getElementById('admin-broadcast-msg').value.trim();
        if (!msg) {
          showToast('بث الإدارة', 'يرجى كتابة نص الرسالة أولاً.', 'error');
          return;
        }
        try {
          await AppDB.sendBroadcast(msg);
          if (AppDB.isFirebaseReady) {
            showToast('نجاح البث', 'تم إرسال البث لجميع المشتركين بنجاح.', 'success');
          } else {
            showToast('بث محلي', `[بدون إنترنت] الرسالة ستُرسل عند الاتصال: "${msg}"`, 'info');
          }
          document.getElementById('admin-broadcast-msg').value = '';
          logAdminAction(`إرسال إشعار عام: "${msg}"`);
        } catch (err) {
          showToast('فشل البث', err.message, 'error');
        }
      });
    }

    // Maintenance Mode Toggle Button
    const maintToggleBtn = document.getElementById('btn-admin-toggle-maintenance');
    if (maintToggleBtn) {
      // Refresh badge state on load
      AppDB.getMaintenanceStatus().then(st => {
        updateMaintenanceUIState(st && st.enabled);
      });

      maintToggleBtn.addEventListener('click', async () => {
        const currentSt = await AppDB.getMaintenanceStatus();
        const nextState = !Boolean(currentSt && currentSt.enabled);
        
        const confirmMsg = nextState 
          ? "هل أنت متأكد من رغبتك في إغلاق اللعبة وتفعيل وضع الصيانة لجميع اللاعبين؟"
          : "هل تريد إنهاء وضع الصيانة وإتاحة اللعبة للجميع مجدداً؟";

        if (!confirm(confirmMsg)) return;

        try {
          await AppDB.setMaintenanceMode(nextState);
          updateMaintenanceUIState(nextState);
          if (nextState) {
            showToast('وضع الصيانة نشط', 'تم إغلاق الخوادم واللعبة ورسم شاشة الصيانة لجميع اللاعبين.', 'warning');
            logAdminAction('تفعيل وضع الصيانة الفنية الشاملة وإغلاق الخوادم');
          } else {
            showToast('إنهاء الصيانة', 'تم إنهاء وضع الصيانة وفتح الخوادم للجميع.', 'success');
            logAdminAction('إلغاء وضع الصيانة وإعادة فتح الخوادم للجميع');
          }
        } catch (err) {
          showToast('فشل وضع الصيانة', err.message, 'error');
        }
      });
    }

    // Send Airdrop
    const sendAirdropBtn = document.getElementById('btn-admin-send-airdrop');
    if (sendAirdropBtn) {
      sendAirdropBtn.addEventListener('click', async () => {
        const amount = Number(document.getElementById('admin-airdrop-amount').value);
        if (isNaN(amount) || amount <= 0) {
          showToast('مكافأة الإدارة', 'يرجى إدخال مبلغ صحيح أكبر من صفر.', 'error');
          return;
        }
        try {
          await AppDB.sendAirdrop(amount);
          if (AppDB.isFirebaseReady) {
            showToast('نجاح التوزيع', 'تم توزيع المكافأة العامة على جميع اللاعبين بنجاح.', 'success');
          } else {
            showToast('مكافأة محلية', `[بدون إنترنت] ستُرسل المكافأة (+${amount} EGP) عند الاتصال.`, 'info');
          }
          document.getElementById('admin-airdrop-amount').value = '';
          logAdminAction(`توزيع مكافأة عامة بقيمة: +${amount} EGP`);
        } catch (err) {
          showToast('فشل التوزيع', err.message, 'error');
        }
      });
    }

    // Wipe Leaderboard
    const wipeLeaderboardBtn = document.getElementById('btn-admin-wipe-leaderboard');
    if (wipeLeaderboardBtn) {
      wipeLeaderboardBtn.addEventListener('click', async () => {
        if (!confirm("تحذير: هل أنت متأكد من تصفير قائمة المتصدرين ومسح جميع الحسابات عدا حساب الإدارة؟")) return;
        try {
          await AppDB.adminWipeLeaderboard();
          showToast('مسح المتصدرين', 'تم إعادة ضبط قائمة المتصدرين ومسح البيانات بنجاح.', 'success');
          renderAll();
          logAdminAction('إعادة ضبط وتصفير قائمة المتصدرين واللاعبين');
        } catch (err) {
          showToast('خطأ ضبط', err.message, 'error');
        }
      });
    }

    // Refresh Leaderboard / Cache
    const refreshLeaderboardBtn = document.getElementById('btn-admin-refresh-leaderboard');
    if (refreshLeaderboardBtn) {
      refreshLeaderboardBtn.addEventListener('click', async () => {
        try {
          renderAll();
          showToast('تحديث كاش', 'تم تحديث قائمة المتصدرين والبورصة بنجاح.', 'success');
          logAdminAction('تحديث كاش البورصة والمتصدرين يدوياً');
        } catch (err) {
          showToast('خطأ تحديث', err.message, 'error');
        }
      });
    }

    // Admin Event Triggers Buttons
    const eventBtns = document.querySelectorAll('.btn-admin-trigger-event');
    eventBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const evType = btn.getAttribute('data-event');
        const eventsMap = {
          tech_boom: {
            title: '🚀 طفرة تقنية وانتعاش الذكاء الاصطناعي',
            desc: 'ارتفعت أرباح شركة فوري وصندوق CASH نتيجة استثمارات هائلة في الذكاء الاصطناعي!',
            targetStocks: ['FWRY', 'CASH'],
            multiplier: 1.25,
            toastType: 'success'
          },
          cbe_rate_hike: {
            title: '🏛️ قرار المركزي: رفع الفائدة 200 نقطة',
            desc: 'البنك المركزي يرفع الفائدة! ارتفاع قوي لسهم CIB وانتكاسة خفيفة باقي الأسهم.',
            targetStocks: ['COMI'],
            multiplier: 1.30,
            negativeTargets: ['EAST', 'FWRY'],
            negativeMultiplier: 0.88,
            toastType: 'warning'
          },
          telecom_expansion: {
            title: '📶 رخصة 5G للمصرية للاتصالات',
            desc: 'حصول المصرية للاتصالات على رخصة الجيل الخامس تطلق موجة شراء قياسية!',
            targetStocks: ['ETEL'],
            multiplier: 1.35,
            toastType: 'success'
          },
          tobacco_monopoly: {
            title: '🚬 اتفاقية احتكار وتصدير للشرقية للدخان',
            desc: 'توقع عقد احتكاري ضخم لتصدير المنتجات للشرق الأوسط يطير بالسهم فوق 40%!',
            targetStocks: ['EAST'],
            multiplier: 1.40,
            toastType: 'success'
          },
          tech_hack_scandal: {
            title: '⚠️ ثغرة وأزمة حماية لشركة فوري',
            desc: 'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع مكثفة ومخاوف استثمارية!',
            targetStocks: ['FWRY'],
            multiplier: 0.70,
            toastType: 'error'
          },
          rate_cut_rally: {
            title: '📈 خفض الفائدة وانتعاش حركة الاستثمار',
            desc: 'البنك المركزي يخفض الفائدة لدعم حركة التجارة والإنتاج! صعود متزامن لكل الأسهم.',
            targetStocks: ['COMI', 'FWRY', 'CASH', 'EAST', 'ETEL'],
            multiplier: 1.20,
            toastType: 'success'
          },
          oil_scandal: {
            title: '📉 أزمة سلاسل الإمداد والشحن',
            desc: 'تأخر شحنات التبغ والمواد الخام يؤدي لربكة ومبيعات مكثفة على سهم الشرقية للدخان!',
            targetStocks: ['EAST'],
            multiplier: 0.75,
            toastType: 'error'
          },
          market_crash: {
            title: '💥 ذعر اقتصادي وتصحيح هابط للبورصة',
            desc: 'موجة بيع جني أرباح مكثفة تهبط بأغلب أسهم السوق بنسب متفاوتة!',
            targetStocks: ['COMI', 'FWRY', 'CASH', 'EAST', 'ETEL'],
            multiplier: 0.85,
            toastType: 'error'
          }
        };

        const ev = eventsMap[evType];
        if (!ev) return;

        ev.targetStocks.forEach(sym => {
          if (GameEngine.stockPrices[sym]) {
            const lastP = GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1];
            const newP = Math.max(GameEngine.STOCKS[sym].floor, Math.floor(lastP * ev.multiplier));
            GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1] = newP;
          }
        });

        if (ev.negativeTargets) {
          ev.negativeTargets.forEach(sym => {
            if (GameEngine.stockPrices[sym]) {
              const lastP = GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1];
              const newP = Math.max(GameEngine.STOCKS[sym].floor, Math.floor(lastP * ev.negativeMultiplier));
              GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1] = newP;
            }
          });
        }

        showToast(ev.title, ev.desc, ev.toastType || 'info');
        const ticker = document.getElementById('stock-market-news-ticker');
        if (ticker) {
          ticker.textContent = `${ev.title}: ${ev.desc}`;
        }
        logAdminAction(`افتعال حدث اقتصادي: ${ev.title}`);
        renderAll();
      });
    });

    // Refresh transfers audit button
    const refreshTransfersBtn = document.getElementById('btn-admin-refresh-transfers');
    if (refreshTransfersBtn) {
      refreshTransfersBtn.addEventListener('click', () => {
        renderAdminTransfersMonitor();
        showToast('تحديث التحويلات', 'تم جلب أحدث سجلات التحويلات المالية.', 'success');
      });
    }
  }

  async function renderAdminAnalyticsDashboard() {
    try {
      const stats = await AppDB.getSystemStats();
      document.getElementById('adm-stat-players').textContent = stats.totalPlayers.toLocaleString();
      document.getElementById('adm-stat-cash').textContent = `${stats.totalCash.toLocaleString()} EGP`;
      document.getElementById('adm-stat-bank').textContent = `${stats.totalBank.toLocaleString()} EGP`;
      document.getElementById('adm-stat-networth').textContent = `${stats.totalNetWorth.toLocaleString()} EGP`;
      document.getElementById('adm-stat-jailed').textContent = stats.jailedCount.toLocaleString();
      document.getElementById('adm-stat-banned').textContent = stats.bannedCount.toLocaleString();
      logAdminAction(`تم تحديث لوحة الإحصائيات الشاملة — إجمالي الحسابات: ${stats.totalPlayers} | الثروة المنظومية: ${stats.totalNetWorth.toLocaleString()} EGP`);
    } catch (e) {
      console.warn('[Admin Dashboard] Failed to load stats:', e);
    }
  }

  async function renderAdminTransfersMonitor() {
    const tbody = document.getElementById('admin-transfers-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
      const transfers = await AppDB.adminGetTransfers();
      if (!transfers || transfers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد عمليات تحويل مالية مسجلة حالياً.</td></tr>`;
        return;
      }

      transfers.forEach(trf => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-900/50 transition';
        const dateStr = new Date(trf.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        tr.innerHTML = `
          <td class="py-2.5 font-bold text-white">${trf.sender}</td>
          <td class="py-2.5 font-bold text-yellow-400">${trf.recipient}</td>
          <td class="py-2.5 text-center numbers-font font-bold text-emerald-400">+${trf.amount.toLocaleString()} EGP</td>
          <td class="py-2.5 text-center numbers-font text-slate-400">${dateStr}</td>
          <td class="py-2.5 text-left"><span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px]">${trf.status || 'مكتملة'}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل سجل التحويلات.</td></tr>`;
    }
  }

  function switchAdminTab(tabId) {
    const subtabs = ['stats', 'transfers', 'players', 'market', 'broadcast', 'system'];
    subtabs.forEach(t => {
      const btn = document.getElementById(`tab-admin-${t}`);
      const panel = document.getElementById(`admin-subpanel-${t}`);
      if (!btn || !panel) return;
      if (t === tabId) {
        btn.classList.add('border-yellow-500', 'text-yellow-500');
        btn.classList.remove('border-transparent', 'text-slate-400');
        panel.classList.remove('hidden');
      } else {
        btn.classList.remove('border-yellow-500', 'text-yellow-500');
        btn.classList.add('border-transparent', 'text-slate-400');
        panel.classList.add('hidden');
      }
    });

    if (tabId === 'stats') {
      renderAdminAnalyticsDashboard();
    } else if (tabId === 'transfers') {
      renderAdminTransfersMonitor();
    }
  }

  function logAdminAction(msg) {
    const targets = [
      document.getElementById('admin-action-logs'),
      document.getElementById('admin-stats-live-log')
    ];

    const time = new Date().toLocaleTimeString('ar-EG');
    targets.forEach(logBox => {
      if (!logBox) return;
      if (logBox.innerHTML.includes("لا يوجد عمليات مسجلة") || logBox.innerHTML.includes("Dyn live logs")) {
        logBox.innerHTML = '';
      }
      const entry = document.createElement('div');
      entry.className = 'border-b border-slate-900/50 pb-1 mb-1';
      entry.innerHTML = `<span class="text-yellow-500 font-bold ml-1">[${time}]</span> ${msg}`;
      logBox.insertBefore(entry, logBox.firstChild);
    });
  }

  return {
    init,
    switchTab,
    showToast,
    returnToStartMenu,
    playMenuSound
  };
})();

// Export globally
window.UIController = UIController;
