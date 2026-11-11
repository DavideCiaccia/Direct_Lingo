/**
 * Daily LINGO • Il gioco quotidiano delle parole
 * Engine del gioco, logica di confronto, tastiera QWERTY e persistenza
 */

(function () {
  'use strict';

  // --- Costanti e Configurazione ---
  const MAX_ATTEMPTS = 6;
  const KEYBOARD_LAYOUT = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['INVIO', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
  ];

  const ACCENT_MAP = {
    'À': 'A', 'Á': 'A',
    'È': 'E', 'É': 'E',
    'Ì': 'I', 'Í': 'I',
    'Ò': 'O', 'Ó': 'O',
    'Ù': 'U', 'Ú': 'U'
  };

  // --- Stato dell'Applicazione ---
  let currentLength = 5; // 5, 6, oppure 7
  let isPracticeMode = false;
  let isChallengeMode = false;
  let challengeData = null; // { w: 'PORTA', c: 'Marco', t: 4, l: 5 }
  let targetWord = '';
  let guesses = []; // Array di parole provate
  let currentInput = '';
  let gameStatus = 'IN_PROGRESS'; // 'IN_PROGRESS', 'WON', 'LOST'
  let isRevealing = false;
  let soundEnabled = true;

  // Stato Modale Crea Sfida
  let challengeDiffLength = 5;
  let challengeTargetAttempts = 4;

  // --- Elementi DOM ---
  const boardEl = document.getElementById('board');
  const keyboardEl = document.getElementById('keyboard');
  const toastContainer = document.getElementById('toast-container');
  const currentDateBadge = document.getElementById('current-date-badge');
  const diffTabs = document.querySelectorAll('.diff-tab');

  // Modali
  const modalHelp = document.getElementById('modal-help');
  const modalStats = document.getElementById('modal-stats');
  const modalChallenge = document.getElementById('modal-challenge');
  const btnHelp = document.getElementById('btn-help');
  const btnStats = document.getElementById('btn-stats');
  const btnChallenge = document.getElementById('btn-challenge');
  const btnChallengeWord = document.getElementById('btn-challenge-word');
  const btnCounterChallenge = document.getElementById('btn-counter-challenge');
  const btnSound = document.getElementById('btn-sound');
  const btnTheme = document.getElementById('btn-theme');
  const btnShare = document.getElementById('btn-share');
  const btnPractice = document.getElementById('btn-practice');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');
  const endgamePanel = document.getElementById('endgame-panel');
  const solutionWordReveal = document.getElementById('solution-word-reveal');
  const nextWordCountdown = document.getElementById('next-word-countdown');
  const statsTitle = document.getElementById('stats-title');

  // Elementi Sfida Asimmetrica
  const challengeBanner = document.getElementById('challenge-banner');
  const challengeCreatorName = document.getElementById('challenge-creator-name');
  const challengeTargetSub = document.getElementById('challenge-target-sub');
  const challengeTargetNum = document.getElementById('challenge-target-num');
  const btnExitChallenge = document.getElementById('btn-exit-challenge');
  const challengeOutcomeCard = document.getElementById('challenge-outcome-card');
  const challengeOutcomeBadge = document.getElementById('challenge-outcome-badge');
  const challengeOutcomeDetail = document.getElementById('challenge-outcome-detail');
  const counterChallengeTargetName = document.getElementById('counter-challenge-target-name');
  const challengeInputWord = document.getElementById('challenge-input-word');
  const challengeInputName = document.getElementById('challenge-input-name');
  const challengeWordValidation = document.getElementById('challenge-word-validation');
  const challengeLinkInput = document.getElementById('challenge-link-input');
  const btnCopyChallengeLink = document.getElementById('btn-copy-challenge-link');
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  const btnShareTelegram = document.getElementById('btn-share-telegram');
  const btnRandomChallengeWord = document.getElementById('btn-random-challenge-word');
  const challengeDiffTabs = document.querySelectorAll('.challenge-diff-tab');
  const targetBtns = document.querySelectorAll('.target-btn');

  // --- Web Audio API (Sintetizzatore Sonoro) ---
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'key') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'delete') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'flip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.setValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'win') {
        // Arpeggio di vittoria
        const freqs = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
        freqs.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.type = 'triangle';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          noteGain.gain.setValueAtTime(0.12, now + idx * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
          noteOsc.start(now + idx * 0.1);
          noteOsc.stop(now + idx * 0.1 + 0.35);
        });
      }
    } catch (e) {
      // Ignora errori audio in browser che limitano autoplay
    }
  }

  // --- Funzioni Data e Parola del Giorno ---
  function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getFormattedDate(date = new Date()) {
    const months = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function getDayIndex(date = new Date()) {
    const anchor = new Date(2024, 0, 1);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((target - anchor) / 86400000);
  }

  function getWordList(length) {
    if (length === 5) return window.WORDS_5 || [];
    if (length === 6) return window.WORDS_6 || [];
    if (length === 7) return window.WORDS_7 || [];
    return [];
  }

  function getValidSet(length) {
    if (length === 5) return window.VALID_GUESSES_5 || new Set();
    if (length === 6) return window.VALID_GUESSES_6 || new Set();
    if (length === 7) return window.VALID_GUESSES_7 || new Set();
    return new Set();
  }

  function getDailyWord(length, date = new Date()) {
    const list = getWordList(length);
    if (!list || list.length === 0) return 'PORTA';

    const dayIndex = getDayIndex(date);
    // Hash deterministico seeded per giorno e lunghezza
    let h = ((dayIndex + 19) * 2654435761 + length * 982451653) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const rand = (h ^ (h >>> 16)) >>> 0;

    return list[rand % list.length];
  }

  // --- Codifica / Decodifica Sfida Asimmetrica (Zero-Backend) ---
  const CHALLENGE_XOR = 0x5a;

  function encodeChallenge(data) {
    const jsonStr = JSON.stringify(data);
    let bytes = [];
    for (let i = 0; i < jsonStr.length; i++) {
      bytes.push(jsonStr.charCodeAt(i) ^ CHALLENGE_XOR);
    }
    const bin = String.fromCharCode.apply(null, bytes);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeChallenge(token) {
    try {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const bin = atob(base64);
      let chars = [];
      for (let i = 0; i < bin.length; i++) {
        chars.push(String.fromCharCode(bin.charCodeAt(i) ^ CHALLENGE_XOR));
      }
      const jsonStr = chars.join('');
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('Errore decodifica sfida', e);
      return null;
    }
  }

  function getCleanUrl() {
    return window.location.href.split('#')[0].split('?')[0];
  }

  function generateChallengeUrl(data) {
    const token = encodeChallenge(data);
    const base = getCleanUrl();
    const sep = window.location.protocol === 'file:' ? '#sfida=' : '?sfida=';
    return `${base}${sep}${token}`;
  }

  function checkUrlForChallenge() {
    let token = null;

    if (window.location.hash && window.location.hash.includes('sfida=')) {
      const match = window.location.hash.match(/sfida=([A-Za-z0-9_-]+)/);
      if (match) token = match[1];
    }

    if (!token && window.location.search && window.location.search.includes('sfida=')) {
      const match = window.location.search.match(/sfida=([A-Za-z0-9_-]+)/);
      if (match) token = match[1];
    }

    if (token) {
      const decoded = decodeChallenge(token);
      if (decoded && decoded.w && /^[A-Z]{5,7}$/i.test(decoded.w)) {
        startChallengeGame(decoded);
        return true;
      }
    }
    return false;
  }

  function startChallengeGame(data) {
    isChallengeMode = true;
    challengeData = data;
    isPracticeMode = false;
    currentLength = data.l || data.w.length;
    targetWord = data.w.toUpperCase();
    guesses = [];
    currentInput = '';
    gameStatus = 'IN_PROGRESS';
    isRevealing = false;

    // Aggiorna banner sfida
    const creator = data.c || 'Un amico';
    challengeCreatorName.textContent = creator;
    const targetT = parseInt(data.t, 10) || 0;
    if (targetT > 0) {
      challengeTargetNum.textContent = targetT;
      challengeTargetSub.classList.remove('hidden');
    } else {
      challengeTargetSub.classList.add('hidden');
    }
    challengeBanner.classList.remove('hidden');

    // Aggiorna bottoni tabs
    diffTabs.forEach(tab => {
      const tabLen = parseInt(tab.dataset.length, 10);
      if (tabLen === currentLength) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    initBoard();
    initKeyboard();
    showToast(`⚔️ Sfida di ${creator} avviata!`, 3000);
  }

  function exitChallengeMode() {
    isChallengeMode = false;
    challengeData = null;
    challengeBanner.classList.add('hidden');

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', getCleanUrl());
    }

    initGameForCurrentDifficulty();
    showToast('Tornato al Daily LINGO del giorno');
  }

  // --- Notifiche Toast ---
  function showToast(message, duration = 2200) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px) scale(0.95)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // --- Valutazione Indizio (Codice Colore Wordle con Gestione Duplicati) ---
  function evaluateGuess(guess, target) {
    const len = target.length;
    const result = Array(len).fill('absent');
    const targetLetterCounts = {};

    // 1. Conta frequenza di ogni lettera nella parola target
    for (let i = 0; i < len; i++) {
      const char = target[i];
      targetLetterCounts[char] = (targetLetterCounts[char] || 0) + 1;
    }

    // 2. Primo passaggio: trova lettere corrette al posto giusto (VERDE)
    for (let i = 0; i < len; i++) {
      if (guess[i] === target[i]) {
        result[i] = 'correct';
        targetLetterCounts[guess[i]]--;
      }
    }

    // 3. Secondo passaggio: trova lettere presenti ma in un altro posto (GIALLO)
    for (let i = 0; i < len; i++) {
      if (result[i] === 'correct') continue;
      const char = guess[i];
      if (targetLetterCounts[char] && targetLetterCounts[char] > 0) {
        result[i] = 'present';
        targetLetterCounts[char]--;
      }
    }

    return result;
  }

  // --- Inizializzazione e Rendering del Tabellone ---
  function initBoard() {
    boardEl.innerHTML = '';
    boardEl.className = `board length-${currentLength}`;

    for (let r = 0; r < MAX_ATTEMPTS; r++) {
      const row = document.createElement('div');
      row.className = 'tile-row';
      row.dataset.row = r;

      for (let c = 0; c < currentLength; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.row = r;
        tile.dataset.col = c;
        row.appendChild(tile);
      }
      boardEl.appendChild(row);
    }
  }

  // --- Inizializzazione Tastiera Virtuale QWERTY ---
  function initKeyboard() {
    keyboardEl.innerHTML = '';

    KEYBOARD_LAYOUT.forEach(rowKeys => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';

      rowKeys.forEach(k => {
        const keyBtn = document.createElement('button');
        keyBtn.className = 'key';
        keyBtn.dataset.key = k;

        if (k === 'INVIO' || k === '⌫') {
          keyBtn.classList.add('key-wide');
        }
        keyBtn.textContent = k;

        keyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          handleKeyPress(k);
        });

        rowEl.appendChild(keyBtn);
      });

      keyboardEl.appendChild(rowEl);
    });
  }

  // --- Aggiornamento Lettere Utilizzate sulla Tastiera ---
  function applyKeyStatus(char, newStatus) {
    const keyBtn = keyboardEl.querySelector(`.key[data-key="${char}"]`);
    if (!keyBtn) return;

    const currentStatus = keyBtn.dataset.status;

    if (newStatus === 'correct') {
      keyBtn.classList.remove('key-present', 'key-absent');
      keyBtn.classList.add('key-correct');
      keyBtn.dataset.status = 'correct';
    } else if (newStatus === 'present') {
      if (currentStatus !== 'correct') {
        keyBtn.classList.remove('key-absent');
        keyBtn.classList.add('key-present');
        keyBtn.dataset.status = 'present';
      }
    } else if (newStatus === 'absent') {
      if (!currentStatus) {
        keyBtn.classList.add('key-absent');
        keyBtn.dataset.status = 'absent';
      }
    }
  }

  function updateKeyboardColors() {
    const keyStatuses = {}; // 'correct' > 'present' > 'absent'

    guesses.forEach(guess => {
      const evaluation = evaluateGuess(guess, targetWord);
      for (let i = 0; i < guess.length; i++) {
        const char = guess[i];
        const status = evaluation[i];
        const currentBest = keyStatuses[char];

        if (status === 'correct') {
          keyStatuses[char] = 'correct';
        } else if (status === 'present' && currentBest !== 'correct') {
          keyStatuses[char] = 'present';
        } else if (status === 'absent' && !currentBest) {
          keyStatuses[char] = 'absent';
        }
      }
    });

    // Applica colori ai tasti
    const keys = keyboardEl.querySelectorAll('.key');
    keys.forEach(keyBtn => {
      const char = keyBtn.dataset.key;
      keyBtn.classList.remove('key-correct', 'key-present', 'key-absent');
      delete keyBtn.dataset.status;

      const st = keyStatuses[char];
      if (st === 'correct') {
        keyBtn.classList.add('key-correct');
        keyBtn.dataset.status = 'correct';
      } else if (st === 'present') {
        keyBtn.classList.add('key-present');
        keyBtn.dataset.status = 'present';
      } else if (st === 'absent') {
        keyBtn.classList.add('key-absent');
        keyBtn.dataset.status = 'absent';
      }
    });
  }

  // --- Rendering Riga Corrente in Tempo Reale ---
  function updateCurrentRow() {
    const currentRowIndex = guesses.length;
    if (currentRowIndex >= MAX_ATTEMPTS) return;

    for (let c = 0; c < currentLength; c++) {
      const tile = boardEl.querySelector(`.tile[data-row="${currentRowIndex}"][data-col="${c}"]`);
      if (!tile) continue;

      const letter = currentInput[c] || '';
      tile.textContent = letter;

      if (letter) {
        tile.classList.add('filled');
      } else {
        tile.classList.remove('filled');
      }
    }
  }

  // --- Disegna i Tentativi Passati dal Salvataggio ---
  function renderPastGuesses() {
    guesses.forEach((guess, rowIndex) => {
      const evaluation = evaluateGuess(guess, targetWord);
      for (let c = 0; c < currentLength; c++) {
        const tile = boardEl.querySelector(`.tile[data-row="${rowIndex}"][data-col="${c}"]`);
        if (!tile) continue;

        tile.textContent = guess[c];
        tile.classList.remove('tile-correct', 'tile-present', 'tile-absent');
        tile.classList.add(`tile-${evaluation[c]}`);
      }
    });

    updateKeyboardColors();
  }

  // --- Animazione di Scuotimento (Errore) ---
  function shakeCurrentRow() {
    playSound('error');
    const currentRowIndex = guesses.length;
    const tiles = boardEl.querySelectorAll(`.tile[data-row="${currentRowIndex}"]`);
    tiles.forEach(t => t.classList.add('shake'));
    setTimeout(() => {
      tiles.forEach(t => t.classList.remove('shake'));
    }, 450);
  }

  // --- Animazione di Vittoria (Onda Salterina) ---
  function bounceWinningRow(rowIndex) {
    playSound('win');
    launchConfetti();
    const tiles = boardEl.querySelectorAll(`.tile[data-row="${rowIndex}"]`);
    tiles.forEach((tile, idx) => {
      setTimeout(() => {
        tile.classList.add('bounce');
      }, idx * 100);
    });
  }

  // --- Invio Tentativo ---
  function submitGuess() {
    if (isRevealing) return;
    if (gameStatus !== 'IN_PROGRESS') return;

    if (currentInput.length < currentLength) {
      shakeCurrentRow();
      showToast('Lettere insufficienti');
      return;
    }

    const guess = currentInput;
    const validSet = getValidSet(currentLength);

    // Verifica validità parola (accetta dizionario curato o parole coerenti)
    if (validSet.size > 0 && !validSet.has(guess)) {
      // Se non è nella lista principale, controlla se ha vocali
      const hasVowel = /[AEIOU]/.test(guess);
      if (!hasVowel) {
        shakeCurrentRow();
        showToast('Parola non valida');
        return;
      }
    }

    isRevealing = true;
    const currentRowIndex = guesses.length;
    const evaluation = evaluateGuess(guess, targetWord);

    // Animazione di rotazione tessera per tessera
    for (let c = 0; c < currentLength; c++) {
      const tile = boardEl.querySelector(`.tile[data-row="${currentRowIndex}"][data-col="${c}"]`);
      setTimeout(() => {
        playSound('flip');
        tile.classList.add('flip');

        setTimeout(() => {
          tile.classList.remove('filled');
          tile.classList.add(`tile-${evaluation[c]}`);
          applyKeyStatus(guess[c], evaluation[c]);
        }, 250);
      }, c * 250);
    }

    const totalRevealTime = currentLength * 250 + 260;

    setTimeout(() => {
      guesses.push(guess);
      currentInput = '';
      isRevealing = false;
      updateKeyboardColors(); // Sincronizzazione immediata completa tastiera

      // Controllo Vittoria o Sconfitta
      if (guess === targetWord) {
        gameStatus = 'WON';
        if (!isChallengeMode) {
          saveDailyState();
          recordGameResult(true, guesses.length);
          updateBadges();
        }
        bounceWinningRow(currentRowIndex);

        const praises = ['Magnifico!', 'Splendido!', 'Geniale!', 'Bravissimo!', 'Colpo Maestro!'];
        const praise = praises[Math.min(guesses.length - 1, praises.length - 1)];
        setTimeout(() => {
          showToast(praise, 3000);
          setTimeout(openStatsModal, 1500);
        }, 800);
      } else if (guesses.length >= MAX_ATTEMPTS) {
        gameStatus = 'LOST';
        if (!isChallengeMode) {
          saveDailyState();
          recordGameResult(false, MAX_ATTEMPTS);
          updateBadges();
        }

        setTimeout(() => {
          showToast(`Peccato! La parola era ${targetWord}`, 4000);
          setTimeout(openStatsModal, 1800);
        }, 800);
      } else {
        if (!isChallengeMode) {
          saveDailyState();
        }
      }
    }, totalRevealTime);
  }

  // --- Gestione Input Caratteri ---
  function handleKeyPress(key) {
    if (isRevealing) return;

    if (key === 'INVIO' || key === 'ENTER') {
      submitGuess();
      return;
    }

    if (key === '⌫' || key === 'BACKSPACE') {
      if (currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1);
        playSound('delete');
        updateCurrentRow();
      }
      return;
    }

    // Normalizza accento se presente
    const cleanKey = ACCENT_MAP[key] || key;

    if (/^[A-Z]$/.test(cleanKey)) {
      if (currentInput.length < currentLength && gameStatus === 'IN_PROGRESS') {
        currentInput += cleanKey;
        playSound('key');
        updateCurrentRow();
      }
    }
  }

  // --- Listener Tastiera Fisica ---
  window.addEventListener('keydown', (e) => {
    // Se c'è un modale aperto, ESC lo chiude
    if (e.key === 'Escape') {
      closeAllModals();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    let key = e.key.toUpperCase();
    if (key === 'ENTER') key = 'INVIO';
    if (key === 'BACKSPACE') key = '⌫';

    handleKeyPress(key);
  });

  // --- Gestione Stato e Persistenza Locale (localStorage) ---
  function getStorageKey(length) {
    return `limbo_daily_${length}`;
  }

  function getStatsKey(length) {
    return `limbo_stats_${length}`;
  }

  function saveDailyState() {
    if (isPracticeMode) return;
    const today = getTodayString();
    const state = {
      date: today,
      word: targetWord,
      guesses: guesses,
      gameStatus: gameStatus
    };
    try {
      localStorage.setItem(getStorageKey(currentLength), JSON.stringify(state));
    } catch (e) {
      console.warn('Errore salvataggio localStorage', e);
    }
  }

  function loadDailyState(length) {
    const today = getTodayString();
    try {
      const raw = localStorage.getItem(getStorageKey(length));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.date === today) {
        return data;
      }
    } catch (e) {
      console.warn('Errore lettura localStorage', e);
    }
    return null;
  }

  function loadStats(length) {
    try {
      const raw = localStorage.getItem(getStatsKey(length));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      distribution: [0, 0, 0, 0, 0, 0]
    };
  }

  function saveStats(length, stats) {
    try {
      localStorage.setItem(getStatsKey(length), JSON.stringify(stats));
    } catch (e) {}
  }

  function recordGameResult(isWin, attemptCount) {
    if (isPracticeMode) return;
    const stats = loadStats(currentLength);
    stats.played += 1;

    if (isWin) {
      stats.wins += 1;
      stats.currentStreak += 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
      const idx = Math.min(Math.max(attemptCount - 1, 0), 5);
      stats.distribution[idx] += 1;
    } else {
      stats.currentStreak = 0;
    }

    saveStats(currentLength, stats);
  }

  // --- Cambio Difficoltà (5, 6, 7 Lettere) ---
  function switchDifficulty(newLength) {
    if (isRevealing) return;
    currentLength = newLength;
    isPracticeMode = false;

    // Aggiorna bottoni tabs
    diffTabs.forEach(tab => {
      const tabLen = parseInt(tab.dataset.length, 10);
      if (tabLen === currentLength) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Inizializza partita per questa difficoltà
    initGameForCurrentDifficulty();
  }

  function initGameForCurrentDifficulty() {
    currentInput = '';
    isRevealing = false;

    const savedState = loadDailyState(currentLength);
    if (savedState) {
      targetWord = savedState.word;
      guesses = savedState.guesses || [];
      gameStatus = savedState.gameStatus || 'IN_PROGRESS';
    } else {
      targetWord = getDailyWord(currentLength);
      guesses = [];
      gameStatus = 'IN_PROGRESS';
      saveDailyState();
    }

    initBoard();
    initKeyboard();
    renderPastGuesses();
    updateBadges();
  }

  function startPracticeGame() {
    isPracticeMode = true;
    currentInput = '';
    isRevealing = false;
    guesses = [];
    gameStatus = 'IN_PROGRESS';

    const list = getWordList(currentLength);
    targetWord = list[Math.floor(Math.random() * list.length)] || 'PORTA';

    initBoard();
    initKeyboard();
    closeAllModals();
    showToast(`Modalità Allenamento (${currentLength} Lettere)`, 2000);
  }

  function updateBadges() {
    [5, 6, 7].forEach(len => {
      const badge = document.getElementById(`badge-diff-${len}`);
      if (!badge) return;
      const state = loadDailyState(len);
      if (state && state.gameStatus === 'WON') {
        badge.textContent = '✓';
        badge.style.color = '#ffffff';
      } else if (state && state.gameStatus === 'LOST') {
        badge.textContent = '✕';
        badge.style.color = '#ef4444';
      } else {
        badge.textContent = '';
      }
    });
  }

  // --- Modali: Regole e Statistiche ---
  function openHelpModal() {
    modalHelp.classList.remove('hidden');
  }

  function openStatsModal() {
    statsTitle.textContent = `Statistiche (${currentLength} Lettere)`;
    const stats = loadStats(currentLength);

    document.getElementById('stat-played').textContent = stats.played;
    const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById('stat-winrate').textContent = `${winRate}%`;
    document.getElementById('stat-streak').textContent = stats.currentStreak;
    document.getElementById('stat-max-streak').textContent = stats.maxStreak;

    // Distribuzione
    const distContainer = document.getElementById('guess-distribution');
    distContainer.innerHTML = '';
    const maxVal = Math.max(...stats.distribution, 1);

    stats.distribution.forEach((count, idx) => {
      const row = document.createElement('div');
      row.className = 'dist-row';

      const label = document.createElement('span');
      label.className = 'dist-label';
      label.textContent = idx + 1;

      const barWrap = document.createElement('div');
      barWrap.className = 'dist-bar-wrapper';

      const bar = document.createElement('div');
      bar.className = 'dist-bar';
      const pct = Math.max((count / maxVal) * 100, 8);
      bar.style.width = `${pct}%`;
      bar.textContent = count;

      // Evidenzia se questa è l'ultima riga vinta oggi
      if (gameStatus === 'WON' && guesses.length === idx + 1) {
        bar.classList.add('highlight');
      }

      barWrap.appendChild(bar);
      row.appendChild(label);
      row.appendChild(barWrap);
      distContainer.appendChild(row);
    });

    // Se la partita è terminata, mostra pannello risultato
    if (gameStatus !== 'IN_PROGRESS') {
      endgamePanel.classList.remove('hidden');
      solutionWordReveal.textContent = targetWord;

      // Se la partita era una Sfida Asimmetrica
      if (isChallengeMode && challengeData) {
        challengeOutcomeCard.classList.remove('hidden');
        document.getElementById('daily-countdown-wrap').classList.add('hidden');
        document.getElementById('solution-label-text').textContent = 'La parola segreta della sfida era:';

        const creator = challengeData.c || 'Un amico';
        counterChallengeTargetName.textContent = creator;
        const targetT = parseInt(challengeData.t, 10) || 0;

        if (gameStatus === 'WON') {
          if (targetT > 0) {
            if (guesses.length < targetT) {
              challengeOutcomeBadge.textContent = '🏆 Hai Battuto ' + creator + '!';
              challengeOutcomeDetail.textContent = `Incredibile! Hai indovinato in ${guesses.length} tentativi contro i ${targetT} impiegati da ${creator}!`;
            } else if (guesses.length === targetT) {
              challengeOutcomeBadge.textContent = '🤝 Pareggio con ' + creator + '!';
              challengeOutcomeDetail.textContent = `Entrambi avete indovinato la parola esattamente in ${guesses.length} tentativi!`;
            } else {
              challengeOutcomeBadge.textContent = '👍 Sfida Superata!';
              challengeOutcomeDetail.textContent = `Hai indovinato la parola in ${guesses.length} tentativi (${creator} era stato più veloce con ${targetT} tentativi).`;
            }
          } else {
            challengeOutcomeBadge.textContent = '🏆 Sfida Superata!';
            challengeOutcomeDetail.textContent = `Hai indovinato la parola segreta scelta da ${creator} in ${guesses.length} tentativi!`;
          }
        } else {
          challengeOutcomeBadge.textContent = '💀 Sfida Persa!';
          challengeOutcomeDetail.textContent = `Non sei riuscito a indovinare la parola in 6 tentativi. Questa volta il punto va a ${creator}!`;
        }
      } else {
        challengeOutcomeCard.classList.add('hidden');
        document.getElementById('daily-countdown-wrap').classList.remove('hidden');
        document.getElementById('solution-label-text').textContent = 'La parola del giorno era:';
      }
    } else {
      endgamePanel.classList.add('hidden');
    }

    modalStats.classList.remove('hidden');
  }

  function closeAllModals() {
    modalHelp.classList.add('hidden');
    modalStats.classList.add('hidden');
    modalChallenge.classList.add('hidden');
  }

  // --- Condivisione Risultato con Emoji ---
  function shareResult() {
    const today = new Date();
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const scoreStr = gameStatus === 'WON' ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;

    let emojiGrid = '';
    guesses.forEach(guess => {
      const evalRow = evaluateGuess(guess, targetWord);
      evalRow.forEach(res => {
        if (res === 'correct') emojiGrid += '🟩';
        else if (res === 'present') emojiGrid += '🟨';
        else emojiGrid += '⬛';
      });
      emojiGrid += '\n';
    });

    let shareText;
    if (isChallengeMode && challengeData) {
      const creator = challengeData.c || 'un amico';
      shareText = `⚔️ Sfida di ${creator} su Daily LINGO (${currentLength} lettere)\n${scoreStr} tentativi\n\n${emojiGrid}\nAccetta la sfida anche tu:\n${generateChallengeUrl(challengeData)}`;
    } else {
      shareText = `Daily LINGO (${currentLength} lettere) • ${dateFormatted}\n${scoreStr} tentativi\n\n${emojiGrid}`;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Risultato copiato negli appunti! 📋');
      }).catch(() => {
        promptFallbackShare(shareText);
      });
    } else {
      promptFallbackShare(shareText);
    }
  }

  function promptFallbackShare(text) {
    showToast('Seleziona e copia il risultato');
  }

  // --- Countdown alla Mezzanotte ---
  function updateCountdown() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diff = midnight - now;
    if (diff <= 0) {
      nextWordCountdown.textContent = '00:00:00';
      // Ricarica la parola del giorno se cambia la data
      const today = getTodayString();
      const saved = loadDailyState(currentLength);
      if (!saved || saved.date !== today) {
        initGameForCurrentDifficulty();
      }
      return;
    }

    const hrs = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
    const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

    nextWordCountdown.textContent = `${hrs}:${mins}:${secs}`;
  }
  setInterval(updateCountdown, 1000);
  updateCountdown();

  // --- Effetto Coriandoli (Confetti Canvas Puro) ---
  function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#10b981', '#eab308', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: Math.random() * 9 + 5,
        h: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    let frame = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45; // gravità
        p.rot += p.vrot;
        p.opacity -= 0.012;

        if (p.opacity > 0) {
          active = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.globalAlpha = Math.max(p.opacity, 0);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      frame++;
      if (active && frame < 140) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(render);
  }

  // --- Toggle Tema Chiaro / Scuro ---
  function initTheme() {
    const savedTheme = localStorage.getItem('limbo_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
      localStorage.setItem('limbo_theme', 'light');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
      localStorage.setItem('limbo_theme', 'dark');
    }
  }

  // --- Toggle Suono ---
  function initSound() {
    const savedSound = localStorage.getItem('limbo_sound');
    soundEnabled = savedSound !== 'false';
    updateSoundIcon();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('limbo_sound', soundEnabled);
    updateSoundIcon();
    showToast(soundEnabled ? 'Suono attivato 🔊' : 'Suono disattivato 🔇', 1500);
  }

  function updateSoundIcon() {
    if (soundEnabled) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
    }
  }

  // --- Gestione Modale Crea Sfida ---
  function openChallengeModal(prefillWord = '', prefillAttempts = 4, targetName = '') {
    challengeDiffLength = prefillWord ? prefillWord.length : currentLength;
    challengeDiffTabs.forEach(tab => {
      if (parseInt(tab.dataset.diff, 10) === challengeDiffLength) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    challengeInputWord.maxLength = challengeDiffLength;
    challengeInputWord.value = prefillWord ? prefillWord.toUpperCase() : '';

    if (targetName) {
      challengeInputName.placeholder = `Es. Contro-sfida per ${targetName}`;
    } else {
      challengeInputName.placeholder = 'Es. Marco';
    }

    challengeTargetAttempts = prefillAttempts !== undefined ? prefillAttempts : 4;
    targetBtns.forEach(btn => {
      if (parseInt(btn.dataset.target, 10) === challengeTargetAttempts) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    validateAndRefreshChallengeLink();
    modalChallenge.classList.remove('hidden');
  }

  function validateAndRefreshChallengeLink() {
    let word = challengeInputWord.value.toUpperCase().replace(/[^A-Z]/g, '');
    challengeInputWord.value = word;

    const validSet = getValidSet(challengeDiffLength);
    const isValidLen = word.length === challengeDiffLength;
    const isWordInDict = validSet.has(word);
    const hasVowels = /[AEIOU]/.test(word);

    const shareBox = document.getElementById('challenge-share-box');

    if (word.length === 0) {
      challengeWordValidation.textContent = `Digita una parola di ${challengeDiffLength} lettere`;
      challengeWordValidation.className = 'validation-msg';
      challengeLinkInput.value = '';
      shareBox.style.opacity = '0.45';
      shareBox.style.pointerEvents = 'none';
      return;
    }

    if (!isValidLen) {
      challengeWordValidation.textContent = `Mancano ${challengeDiffLength - word.length} lettere`;
      challengeWordValidation.className = 'validation-msg invalid';
      challengeLinkInput.value = '';
      shareBox.style.opacity = '0.45';
      shareBox.style.pointerEvents = 'none';
      return;
    }

    if (isWordInDict || (isValidLen && hasVowels)) {
      challengeWordValidation.textContent = `✓ Parola valida della lingua italiana (${challengeDiffLength} lettere)`;
      challengeWordValidation.className = 'validation-msg valid';

      const creator = challengeInputName.value.trim() || '';
      const payload = {
        w: word,
        c: creator,
        t: challengeTargetAttempts,
        l: challengeDiffLength
      };

      const url = generateChallengeUrl(payload);
      challengeLinkInput.value = url;
      shareBox.style.opacity = '1';
      shareBox.style.pointerEvents = 'auto';
    } else {
      challengeWordValidation.textContent = `✕ Parola non riconosciuta nel dizionario italiano`;
      challengeWordValidation.className = 'validation-msg invalid';
      challengeLinkInput.value = '';
      shareBox.style.opacity = '0.45';
      shareBox.style.pointerEvents = 'none';
    }
  }

  function getChallengeShareMessage() {
    const creator = challengeInputName.value.trim() || 'Un tuo amico';
    const target = challengeTargetAttempts;
    const url = challengeLinkInput.value;

    let msg = `🔥 ${creator} ti ha sfidato a Daily LINGO!\n`;
    if (target > 0) {
      msg += `"Ho scelto una parola segreta: riuscirai a indovinarla in meno di ${target} tentativi?"\n\n`;
    } else {
      msg += `"Ho scelto una parola segreta: riuscirai a indovinarla?"\n\n`;
    }
    msg += `👉 Accetta la sfida qui:\n${url}`;
    return msg;
  }

  // --- Event Listeners UI ---
  diffTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const len = parseInt(tab.dataset.length, 10);
      switchDifficulty(len);
    });
  });

  btnHelp.addEventListener('click', openHelpModal);
  btnStats.addEventListener('click', openStatsModal);
  btnTheme.addEventListener('click', toggleTheme);
  btnSound.addEventListener('click', toggleSound);
  btnShare.addEventListener('click', shareResult);
  btnPractice.addEventListener('click', startPracticeGame);

  // Event Listeners Sfida Asimmetrica
  btnChallenge.addEventListener('click', () => openChallengeModal('', 4, ''));
  if (btnChallengeWord) {
    btnChallengeWord.addEventListener('click', () => {
      closeAllModals();
      openChallengeModal(targetWord, guesses.length, '');
    });
  }
  if (btnCounterChallenge) {
    btnCounterChallenge.addEventListener('click', () => {
      closeAllModals();
      const opp = challengeData ? challengeData.c : '';
      openChallengeModal('', guesses.length, opp);
    });
  }
  if (btnExitChallenge) {
    btnExitChallenge.addEventListener('click', exitChallengeMode);
  }

  // Modale creazione sfida: tabs difficoltà
  challengeDiffTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      challengeDiffLength = parseInt(tab.dataset.diff, 10);
      challengeDiffTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      challengeInputWord.maxLength = challengeDiffLength;
      challengeInputWord.value = '';
      validateAndRefreshChallengeLink();
    });
  });

  // Modale creazione sfida: input parola e nome
  challengeInputWord.addEventListener('input', validateAndRefreshChallengeLink);
  challengeInputName.addEventListener('input', validateAndRefreshChallengeLink);

  // Parola casuale
  btnRandomChallengeWord.addEventListener('click', () => {
    const list = getWordList(challengeDiffLength);
    if (list && list.length > 0) {
      challengeInputWord.value = list[Math.floor(Math.random() * list.length)];
      validateAndRefreshChallengeLink();
      playSound('key');
    }
  });

  // Selettore tentativi bersaglio
  targetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      challengeTargetAttempts = parseInt(btn.dataset.target, 10);
      targetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      validateAndRefreshChallengeLink();
    });
  });

  // Copia link sfida
  btnCopyChallengeLink.addEventListener('click', () => {
    if (!challengeLinkInput.value) return;
    const msg = getChallengeShareMessage();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(() => {
        showToast('Link e messaggio di sfida copiati! 📋');
      }).catch(() => {
        promptFallbackShare(msg);
      });
    } else {
      promptFallbackShare(msg);
    }
  });

  // Condivisione WhatsApp
  btnShareWhatsapp.addEventListener('click', () => {
    if (!challengeLinkInput.value) return;
    const msg = getChallengeShareMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });

  // Condivisione Telegram
  btnShareTelegram.addEventListener('click', () => {
    if (!challengeLinkInput.value) return;
    const msg = getChallengeShareMessage();
    const linkUrl = challengeLinkInput.value;
    const url = `https://t.me/share/url?url=${encodeURIComponent(linkUrl)}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });

  // Chiusura modali
  document.querySelectorAll('.modal-close-btn, [data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.dataset.close;
      if (targetId) {
        document.getElementById(targetId).classList.add('hidden');
      } else {
        closeAllModals();
      }
    });
  });

  // Chiusura al click sul backdrop
  [modalHelp, modalStats, modalChallenge].forEach(m => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        closeAllModals();
      }
    });
  });

  // Mostra regole al primo accesso assoluto
  function checkFirstVisit() {
    const visited = localStorage.getItem('limbo_visited');
    if (!visited) {
      openHelpModal();
      localStorage.setItem('limbo_visited', 'true');
    }
  }

  // --- Avvio Iniziale ---
  function start() {
    currentDateBadge.textContent = getFormattedDate();
    initTheme();
    initSound();

    // Controlla se l'utente ha aperto un link di sfida (?sfida=... o #sfida=...)
    const hasChallenge = checkUrlForChallenge();
    if (!hasChallenge) {
      initGameForCurrentDifficulty();
      checkFirstVisit();
    }
  }

  // Avvio al caricamento della pagina
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
