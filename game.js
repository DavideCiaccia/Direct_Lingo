/**
 * Cassaforte • Sfide di parole tra amici + Parola del Giorno (IT/EN, 5-8 lettere)
 * Engine del gioco, logica di confronto, tastiera QWERTY e persistenza
 */

(function () {
  'use strict';

  // --- Costanti e Configurazione ---
  const MAX_ATTEMPTS = 6;
  const KEYBOARD_LAYOUT = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['CANC', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'INVIO']
  ];

  const ACCENT_MAP = {
    'À': 'A', 'Á': 'A',
    'È': 'E', 'É': 'E',
    'Ì': 'I', 'Í': 'I',
    'Ò': 'O', 'Ó': 'O',
    'Ù': 'U', 'Ú': 'U'
  };

  const LENGTHS = [5, 6, 7, 8];
  const LANG_LABELS = { it: 'Italiano', en: 'English' };
  const LANG_FLAGS = { it: '🇮🇹', en: '🇬🇧' };

  // --- Stato dell'Applicazione ---
  let currentLength = 5; // 5, 6, 7 oppure 8
  let currentLang = 'it'; // lingua delle parole: 'it' | 'en'
  let gameLang = 'it'; // lingua della partita in corso (in un duello è quella del link)
  let currentView = 'challenge-creator';
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
  let challengeAudience = 'single'; // 'single' (un amico) | 'group' (gruppo WhatsApp/Telegram)

  // --- Elementi DOM ---
  const boardEl = document.getElementById('board');
  const keyboardEl = document.getElementById('keyboard');
  const toastContainer = document.getElementById('toast-container');
  const currentDateBadge = document.getElementById('current-date-badge');
  const diffTabs = document.querySelectorAll('.diff-tab');

  // Viste Primarie (Redesign Social-First)
  const tabModeChallenge = document.getElementById('tab-mode-challenge');
  const tabModeDaily = document.getElementById('tab-mode-daily');
  const viewChallengeCreator = document.getElementById('view-challenge-creator');
  const viewGameplay = document.getElementById('view-gameplay');
  const dailyDiffNav = document.getElementById('daily-diff-nav');
  const quickInviteBanner = document.getElementById('quick-invite-banner');
  const btnOpenCreatorFromGame = document.getElementById('btn-open-creator-from-game');
  const btnTestChallenge = document.getElementById('btn-test-challenge');
  const btnShareDuelResult = document.getElementById('btn-share-duel-result');
  const counterChallengeTargetName2 = document.getElementById('counter-challenge-target-name-2');

  // Modali
  const modalHelp = document.getElementById('modal-help');
  const modalStats = document.getElementById('modal-stats');
  const btnHelp = document.getElementById('btn-help');
  const btnStats = document.getElementById('btn-stats');
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
  const challengeTitleSuffix = document.getElementById('challenge-title-suffix');
  const btnLang = document.getElementById('btn-lang');
  const langTabs = document.querySelectorAll('.lang-tab');
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
  const challengeDiffTabs = document.querySelectorAll('.challenge-diff-tab[data-diff]');
  const audienceTabs = document.querySelectorAll('.audience-tab');
  const targetBtns = document.querySelectorAll('.target-btn');

  // --- Testi in inglese per chi riceve una sfida in inglese ---
  // L'interfaccia passa in inglese SOLO durante un duello con parola inglese
  // (banner, tastiera, messaggi, esito finale). La creazione sfida resta in italiano.
  function isEnUi() {
    return !!(isChallengeMode && challengeData && !challengeData.isSelfTest && gameLang === 'en');
  }

  function tr(it, en) {
    return isEnUi() ? en : it;
  }

  function plural(n, it1, itN, en1, enN) {
    return n === 1 ? tr(it1, en1) : tr(itN, enN);
  }

  // Elementi statici dell'HTML con attributo data-en: salva il testo italiano e alterna
  function applyStaticUiLang() {
    const en = isEnUi();
    document.querySelectorAll('[data-en]').forEach(el => {
      if (el.dataset.it === undefined) el.dataset.it = el.textContent;
      el.textContent = en ? el.dataset.en : el.dataset.it;
    });
    document.documentElement.lang = en ? 'en' : 'it';
  }

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

  function getWordList(length, lang = gameLang) {
    return window.getAnswerList ? window.getAnswerList(length, lang) : [];
  }

  function getValidSet(length, lang = gameLang) {
    return window.getValidGuessSet ? window.getValidGuessSet(length, lang) : new Set();
  }

  function isValidWord(word, length, lang) {
    return word.length === length && getValidSet(length, lang).has(word);
  }

  function getDailyWord(length, lang = gameLang, date = new Date()) {
    const list = getWordList(length, lang);
    if (!list || list.length === 0) return 'PORTA'.slice(0, length);

    const dayIndex = getDayIndex(date);
    // Hash deterministico seeded per giorno, lunghezza e lingua
    // (l'italiano mantiene il seed originale per non cambiare la parola del giorno già in uso)
    const langSalt = lang === 'en' ? 374761393 : 0;
    let h = ((dayIndex + 19) * 2654435761 + length * 982451653 + langSalt) >>> 0;
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
      if (decoded && decoded.w && /^[A-Z]{5,8}$/i.test(decoded.w)) {
        startChallengeGame(decoded);
        return true;
      }
    }
    return false;
  }

  // --- Gestione delle Viste (Social Duel First Architecture) ---
  // Chiude lo stato di duello (senza cambiare vista): evita che la Parola del Giorno
  // venga giocata "dentro" un duello e che le statistiche non vengano salvate.
  function resetChallengeState() {
    if (!isChallengeMode && !challengeData) return;
    isChallengeMode = false;
    challengeData = null;
    challengeBanner.classList.add('hidden');
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', getCleanUrl());
    }    applyStaticUiLang();
  }

  function setViewMode(mode) {
    currentView = mode;
    if (mode !== 'gameplay-duel') {
      resetChallengeState();
      gameLang = currentLang;
    }
    updateLangUI();

    if (mode === 'challenge-creator') {
      viewChallengeCreator.classList.remove('hidden');
      viewGameplay.classList.add('hidden');
      tabModeChallenge.classList.add('active');
      tabModeDaily.classList.remove('active');
      currentDateBadge.textContent = 'SFIDA UN AMICO ⚔️';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mode === 'gameplay-daily') {
      viewChallengeCreator.classList.add('hidden');
      viewGameplay.classList.remove('hidden');
      tabModeChallenge.classList.remove('active');
      tabModeDaily.classList.add('active');
      dailyDiffNav.classList.remove('hidden');
      quickInviteBanner.classList.remove('hidden');
      challengeBanner.classList.add('hidden');
      currentDateBadge.textContent = getFormattedDate();
      isPracticeMode = false;
      initGameForCurrentDifficulty();
    } else if (mode === 'gameplay-duel') {
      viewChallengeCreator.classList.add('hidden');
      viewGameplay.classList.remove('hidden');
      tabModeChallenge.classList.remove('active');
      tabModeDaily.classList.remove('active');
      dailyDiffNav.classList.add('hidden');
      quickInviteBanner.classList.add('hidden');
      challengeBanner.classList.remove('hidden');
      currentDateBadge.textContent = tr('DUELLO IN CORSO ⚔️', 'CHALLENGE ⚔️');
    }
    applyStaticUiLang();
  }

  function startChallengeGame(data) {
    const lang = data.g === 'en' ? 'en' : 'it'; // link vecchi senza lingua = italiano
    isChallengeMode = true;
    challengeData = data;
    isPracticeMode = false;
    targetWord = data.w.toUpperCase();
    currentLength = targetWord.length;
    gameLang = lang;
    guesses = [];
    currentInput = '';
    gameStatus = 'IN_PROGRESS';
    isRevealing = false;

    // Aggiorna banner duello (testo ricostruito ogni volta: niente nodi "persi")
    const creator = data.c || (lang === 'en' && !data.isSelfTest ? 'A friend' : 'Un amico');
    const langNote = ` ${LANG_FLAGS[lang]} ${currentLength} lettere`;
    if (data.isSelfTest) {
      challengeCreatorName.textContent = 'Prova Personale';
      if (challengeTitleSuffix) challengeTitleSuffix.textContent = '';
      challengeTargetSub.textContent = `Indovina in meno tentativi possibili per fissare il tuo record! ·${langNote}`;
      challengeTargetSub.classList.remove('hidden');
    } else {
      challengeCreatorName.textContent = creator;
      const isGroup = data.m === 'g';
      if (challengeTitleSuffix) challengeTitleSuffix.textContent = isGroup
        ? tr(' ha sfidato il gruppo!', ' challenged the group!')
        : tr(' ti ha sfidato!', ' challenged you!');
      const targetT = parseInt(data.t, 10) || 0;
      const enNote = ` ${LANG_FLAGS[lang]} ${currentLength} letters`;
      if (isGroup) {
        challengeTargetSub.textContent = (targetT > 0 ? tr(`Record da battere: ${targetT} ·`, `Score to beat: ${targetT} ·`) : '') + tr(langNote, enNote);
      } else {
        challengeTargetSub.textContent = targetT > 0
          ? tr(`Obiettivo: battere ${targetT} tentativi! ·${langNote}`, `Goal: beat ${targetT} ${targetT === 1 ? 'guess' : 'guesses'}! ·${enNote}`)
          : tr(`Parola${langNote}`, `Word${enNote}`);
      }
      challengeTargetSub.classList.remove('hidden');
    }

    setViewMode('gameplay-duel');
    initBoard();
    initKeyboard();
    showToast(data.isSelfTest ? 'Gioca ora per stabilire il tuo record!'
      : data.m === 'g' ? tr(`Sfida di gruppo di ${creator}: in bocca al lupo!`, `${creator}'s group challenge: good luck!`)
      : tr(`Duello avviato contro ${creator}!`, `Challenge from ${creator}: good luck!`), 3000);
  }

  function exitChallengeMode() {
    resetChallengeState();
    setViewMode('challenge-creator');
    showToast('Tornato alla schermata di sfida');
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

        if (k === 'INVIO' || k === 'CANC' || k === '⌫') {
          keyBtn.classList.add('key-wide');
        }

        if (k === 'CANC') {
          keyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;margin-right:2px;"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg><span>' + tr('CANC', 'DEL') + '</span>';
          keyBtn.setAttribute('aria-label', 'Cancella lettera');
        } else {
          keyBtn.textContent = k === 'INVIO' ? tr('INVIO', 'ENTER') : k;
          if (k === 'INVIO') {
            keyBtn.setAttribute('aria-label', 'Invia tentativo');
          }
        }

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
      showToast(tr('Lettere insufficienti', 'Not enough letters'));
      return;
    }

    const guess = currentInput;

    // Verifica validità parola sul dizionario completo della lingua della partita.
    // La parola segreta è sempre accettata (es. sfide create prima di questa versione).
    if (guess !== targetWord && !isValidWord(guess, currentLength, gameLang)) {
      shakeCurrentRow();
      showToast(tr(gameLang === 'en' ? 'Parola non presente nel dizionario inglese' : 'Parola non presente nel dizionario', 'Not in word list'));
      return;
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

        const praises = isEnUi()
          ? ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!']
          : ['Magnifico!', 'Splendido!', 'Geniale!', 'Bravissimo!', 'Colpo Maestro!'];
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
          showToast(tr(`Peccato! La parola era ${targetWord}`, `So close! The word was ${targetWord}`), 4000);
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

    if (key === 'CANC' || key === '⌫' || key === 'BACKSPACE' || key === 'DELETE' || key === 'DEL') {
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

    // Se l'utente sta digitando in un campo di input (es. nel modale Sfida), non interferire
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Nella schermata di creazione la griglia è nascosta: non accumulare lettere "fantasma"
    if (currentView === 'challenge-creator') return;

    let key = e.key ? e.key.toUpperCase() : '';
    if (key === 'ENTER' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      key = 'INVIO';
    }
    if (key === 'BACKSPACE' || key === 'DELETE' || key === 'DEL' || e.code === 'Backspace' || e.code === 'Delete' || e.keyCode === 8 || e.keyCode === 46) {
      key = 'CANC';
    }

    handleKeyPress(key);
  });

  // --- Gestione Stato e Persistenza Locale (localStorage) ---
  // Le chiavi italiane restano quelle originali per non azzerare statistiche e strisce esistenti
  function getStorageKey(length, lang = gameLang) {
    return lang === 'en' ? `limbo_daily_en_${length}` : `limbo_daily_${length}`;
  }

  function getStatsKey(length, lang = gameLang) {
    return lang === 'en' ? `limbo_stats_en_${length}` : `limbo_stats_${length}`;
  }

  function saveDailyState() {
    if (isPracticeMode || isChallengeMode) return;
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

  function loadDailyState(length, lang = gameLang) {
    const today = getTodayString();
    try {
      const raw = localStorage.getItem(getStorageKey(length, lang));
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
    if (isPracticeMode || isChallengeMode) return;
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

    syncDiffTabs();
    currentDateBadge.textContent = getFormattedDate();

    // Inizializza partita per questa difficoltà
    initGameForCurrentDifficulty();
  }

  function syncDiffTabs() {
    diffTabs.forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.length, 10) === currentLength);
    });
  }

  function initGameForCurrentDifficulty() {
    currentInput = '';
    isRevealing = false;
    if (!LENGTHS.includes(currentLength)) currentLength = 5;
    syncDiffTabs();

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
    // L'allenamento si gioca sempre nella schermata di gioco, fuori da un eventuale duello
    if (isChallengeMode || currentView !== 'gameplay-daily') {
      resetChallengeState();
      currentView = 'gameplay-daily';
      gameLang = currentLang;
      viewChallengeCreator.classList.add('hidden');
      viewGameplay.classList.remove('hidden');
      tabModeChallenge.classList.remove('active');
      tabModeDaily.classList.add('active');
      dailyDiffNav.classList.remove('hidden');
      quickInviteBanner.classList.remove('hidden');
      currentDateBadge.textContent = 'ALLENAMENTO';
      updateLangUI();
    }
    if (currentLength < 5 || currentLength > 8) currentLength = 5;
    syncDiffTabs();
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
    LENGTHS.forEach(len => {
      const badge = document.getElementById(`badge-diff-${len}`);
      if (!badge) return;
      const state = loadDailyState(len, currentLang);
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
    statsTitle.textContent = tr(`Statistiche ${LANG_FLAGS[gameLang]} (${currentLength} Lettere)`, `Statistics ${LANG_FLAGS[gameLang]} (${currentLength} letters)`);
    applyStaticUiLang();
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
        document.getElementById('solution-label-text').textContent = tr('La parola segreta della sfida era:', 'The secret word was:');

        const creator = challengeData.c || 'Un amico';
        counterChallengeTargetName.textContent = creator;
        counterChallengeTargetName2.textContent = creator;
        const targetT = parseInt(challengeData.t, 10) || 0;
        const isSelfTest = !!challengeData.isSelfTest;
        const isGroup = challengeData.m === 'g';
        btnCounterChallenge.classList.toggle('hidden', isSelfTest);
        btnShareDuelResult.classList.toggle('hidden', isSelfTest);
        // In gruppo l'azione principale è pubblicare la griglia (la chat diventa la classifica)
        if (isGroup) {
          btnShareDuelResult.textContent = tr('📋 Pubblica la tua griglia nel gruppo', '📋 Post your grid in the group');
          btnShareDuelResult.className = 'btn btn-primary btn-whatsapp-group';
          btnCounterChallenge.textContent = tr('🔥 Lancia tu la prossima sfida al gruppo', '🔥 Set the next challenge for the group');
          btnCounterChallenge.className = 'btn btn-whatsapp-subtle';
          btnShareDuelResult.parentNode.insertBefore(btnShareDuelResult, btnCounterChallenge);
        } else {
          btnCounterChallenge.textContent = challengeData.c ? tr(`🔥 Lancia la Contro-Sfida a ${challengeData.c}`, `🔥 Challenge ${challengeData.c} back`) : tr('🔥 Lancia la Contro-Sfida', '🔥 Challenge them back');
          btnCounterChallenge.className = 'btn btn-primary btn-counter-challenge';
          btnShareDuelResult.textContent = challengeData.c ? tr(`💬 Invia il risultato su WhatsApp a ${challengeData.c}`, `💬 Send your result to ${challengeData.c} on WhatsApp`) : tr('💬 Invia il risultato su WhatsApp', '💬 Send your result on WhatsApp');
          btnShareDuelResult.className = 'btn btn-whatsapp-subtle';
          btnCounterChallenge.parentNode.insertBefore(btnCounterChallenge, btnShareDuelResult);
        }

        if (isSelfTest) {
          if (gameStatus === 'WON') {
            challengeOutcomeBadge.textContent = `🎯 Record: ${guesses.length} ${guesses.length === 1 ? "tentativo" : "tentativi"}`;
            challengeOutcomeDetail.textContent = `Torna su "Sfida un Amico": imposta ${guesses.length} come tentativi da battere e invia la sfida.`;
          } else {
            challengeOutcomeBadge.textContent = '😅 Non indovinata!';
            challengeOutcomeDetail.textContent = 'Forse è troppo difficile: perfetta per mettere in crisi i tuoi amici.';
          }
        } else if (gameStatus === 'WON') {
          if (targetT > 0) {
            if (guesses.length < targetT) {
              challengeOutcomeBadge.textContent = tr(`🏆 Hai Battuto ${creator}!`, `🏆 You beat ${creator}!`);
              challengeOutcomeDetail.textContent = tr(`Incredibile! Hai indovinato in ${guesses.length} tentativi contro i ${targetT} impiegati da ${creator}!`, `Amazing! You got it in ${guesses.length} vs ${creator}'s ${targetT}.`);
            } else if (guesses.length === targetT) {
              challengeOutcomeBadge.textContent = tr(`🤝 Pareggio con ${creator}!`, `🤝 It's a tie with ${creator}!`);
              challengeOutcomeDetail.textContent = tr(`Entrambi avete indovinato la parola esattamente in ${guesses.length} tentativi!`, `You both got it in exactly ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`);
            } else {
              challengeOutcomeBadge.textContent = tr('👍 Sfida Superata!', '👍 Solved!');
              challengeOutcomeDetail.textContent = tr(`Hai indovinato la parola in ${guesses.length} tentativi (${creator} era stato più veloce con ${targetT} tentativi).`, `You got it in ${guesses.length}, but ${creator} was faster with ${targetT}.`);
            }
          } else {
            challengeOutcomeBadge.textContent = tr('🏆 Sfida Superata!', '🏆 Solved!');
            challengeOutcomeDetail.textContent = tr(`Hai indovinato la parola segreta scelta da ${creator} in ${guesses.length} tentativi!`, `You guessed ${creator}'s secret word in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}!`);
          }
        } else {
          challengeOutcomeBadge.textContent = tr('💀 Sfida Persa!', '💀 Challenge lost!');
          challengeOutcomeDetail.textContent = tr(`Non sei riuscito a indovinare la parola in 6 tentativi. Questa volta il punto va a ${creator}!`, `You didn't get it in 6 guesses. This round goes to ${creator}!`);
        }
      } else {
        challengeOutcomeCard.classList.add('hidden');
        document.getElementById('daily-countdown-wrap').classList.toggle('hidden', isPracticeMode);
        document.getElementById('solution-label-text').textContent = isPracticeMode ? 'La parola era:' : 'La parola del giorno era:';
      }
    } else {
      endgamePanel.classList.add('hidden');
    }

    modalStats.classList.remove('hidden');
  }

  function closeAllModals() {
    modalHelp.classList.add('hidden');
    modalStats.classList.add('hidden');
  }

  // --- Condivisione Risultato con Emoji ---
  function buildEmojiGrid() {
    return guesses.map(g => evaluateGuess(g, targetWord)
      .map(r => r === 'correct' ? '🟩' : r === 'present' ? '🟨' : '⬛').join('')).join('\n');
  }

  // Link della sfida "pulito" (senza flag interni) da ricondividere: non contiene la parola in chiaro
  function getShareableChallengeUrl() {
    if (!challengeData) return getCleanUrl();
    const shareData = Object.assign({}, challengeData);
    delete shareData.isSelfTest;
    return generateChallengeUrl(shareData);
  }

  // Messaggio risultato SENZA SPOILER: mai la parola, solo esito + griglia
  function buildDuelResultMessage() {
    const creator = challengeData.c || '';
    const score = gameStatus === 'WON' ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    const grid = buildEmojiGrid();
    const en = isEnUi();
    const info = en ? `English, ${currentLength} letters` : `${gameLang === 'en' ? 'inglese' : 'italiano'}, ${currentLength} lettere`;
    if (challengeData.m === 'g') {
      const verdict = gameStatus === 'WON'
        ? (en ? `Solved in ${score}` : `Indovinata in ${score}`)
        : (en ? `Not solved (${score})` : `Non l'ho indovinata (${score})`);
      return en
        ? `${creator ? creator + "'s challenge" : 'Challenge'} on Cassaforte (${info})\n${verdict}\n\n${grid}\n\nCan you do better?\n${getShareableChallengeUrl()}`
        : `Sfida${creator ? ' di ' + creator : ''} su Cassaforte (${info})\n${verdict}\n\n${grid}\n\nChi fa meglio?\n${getShareableChallengeUrl()}`;
    }
    if (en) {
      const verdict = gameStatus === 'WON' ? `I got it in ${score}!` : `I didn't get it (${score}).`;
      return `Hi${creator ? ' ' + creator : ''}! I played your Cassaforte challenge (${info}).\n${verdict}\n\n${grid}\n\nWant a rematch? Create a new challenge here:\n${getCleanUrl()}`;
    }
    const verdict = gameStatus === 'WON' ? `L'ho indovinata in ${score}!` : `Non sono riuscito a indovinarla (${score}).`;
    return `Ciao${creator ? ' ' + creator : ''}! Ho giocato alla tua sfida su Cassaforte (${info}).\n${verdict}\n\n${grid}\n\nVuoi la rivincita? Crea una nuova sfida qui:\n${getCleanUrl()}`;
  }

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
      shareText = isEnUi()
        ? `${challengeData.c ? challengeData.c + "'s challenge" : 'Challenge'} on Cassaforte (English, ${currentLength} letters)\n${scoreStr}\n\n${emojiGrid}\nTake the challenge:\n${getShareableChallengeUrl()}`
        : `Sfida di ${creator} su Cassaforte ${LANG_FLAGS[gameLang]} (${currentLength} lettere)\n${scoreStr} tentativi\n\n${emojiGrid}\nAccetta la sfida anche tu:\n${getShareableChallengeUrl()}`;
    } else {
      const label = isPracticeMode ? 'Allenamento' : dateFormatted;
      shareText = `Cassaforte ${LANG_FLAGS[gameLang]} (${currentLength} lettere) • ${label}\n${scoreStr} tentativi\n\n${emojiGrid}\n${getCleanUrl()}`;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast(tr('Risultato copiato negli appunti! 📋', 'Result copied to clipboard! 📋'));
      }).catch(() => {
        promptFallbackShare(shareText);
      });
    } else {
      promptFallbackShare(shareText);
    }
  }

  function promptFallbackShare(text) {
    showToast(tr('Seleziona e copia il risultato', 'Select and copy your result'));
  }

  // --- Countdown alla Mezzanotte ---
  let lastDayString = getTodayString();

  function updateCountdown() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;

    // Cambio di data: aggiorna la Parola del Giorno solo se la si sta giocando
    // (mai durante un duello, un allenamento, un'animazione o nella schermata di creazione)
    const today = getTodayString();
    if (today !== lastDayString) {
      lastDayString = today;
      if (currentView === 'gameplay-daily' && !isChallengeMode && !isPracticeMode && !isRevealing) {
        currentDateBadge.textContent = getFormattedDate();
        initGameForCurrentDifficulty();
        showToast('È arrivata una nuova Parola del Giorno! 📅', 3000);
      }
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

  // --- Gestione Modale e Hub Crea Sfida ---
  function setShareBoxEnabled(enabled) {
    const shareBox = document.getElementById('challenge-share-box');
    shareBox.style.opacity = enabled ? '1' : '0.45';
    shareBox.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  function syncChallengeDiffTabs() {
    challengeDiffTabs.forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.diff, 10) === challengeDiffLength);
    });
    challengeInputWord.maxLength = challengeDiffLength;
    const sample = getWordList(challengeDiffLength, currentLang)[0];
    const examples = { it: { 5: 'CUORE', 6: 'CAMINO', 7: 'GIOVANE', 8: 'MONTAGNA' }, en: { 5: 'HEART', 6: 'GARDEN', 7: 'HISTORY', 8: 'MOUNTAIN' } };
    challengeInputWord.placeholder = `Es. ${(examples[currentLang] || {})[challengeDiffLength] || sample || ''}`;
  }

  function setAudience(audience) {
    challengeAudience = audience === 'group' ? 'group' : 'single';
    audienceTabs.forEach(t => t.classList.toggle('active', t.dataset.audience === challengeAudience));
    const waLabel = btnShareWhatsapp.querySelector('span');
    if (waLabel) waLabel.textContent = challengeAudience === 'group' ? 'Sfida il gruppo' : 'Sfida su WhatsApp';
    const hint = document.getElementById('audience-hint');
    if (hint) {
      hint.textContent = challengeAudience === 'group'
        ? '👥 Tutti giocano lo stesso link e pubblicano solo la griglia in chat: la chat diventa la classifica.'
        : '👤 Sfida uno-contro-uno: alla fine il tuo amico può lanciarti la contro-sfida.';
    }
  }

  function loadCreatorWithWord(prefillWord = '', prefillAttempts = 4, targetName = '', prefillLang = null, prefillAudience = null) {
    setViewMode('challenge-creator');
    if (prefillLang && prefillLang !== currentLang) setLanguage(prefillLang, { silent: true });
    if (prefillAudience) setAudience(prefillAudience);

    challengeDiffLength = prefillWord && LENGTHS.includes(prefillWord.length) ? prefillWord.length : 5;
    syncChallengeDiffTabs();
    challengeInputWord.value = prefillWord ? prefillWord.toUpperCase() : '';

    if (targetName) {
      challengeInputName.placeholder = `Es. Contro-sfida per ${targetName}`;
    } else {
      challengeInputName.placeholder = 'Es. Marco';
    }

    challengeTargetAttempts = Math.min(Math.max(parseInt(prefillAttempts, 10) || 0, 0), MAX_ATTEMPTS);
    targetBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.target, 10) === challengeTargetAttempts);
    });

    validateAndRefreshChallengeLink();
    if (!prefillWord) challengeInputWord.focus();
  }

  function playTestChallenge() {
    const word = challengeInputWord.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (!isValidWord(word, challengeDiffLength, currentLang)) {
      showToast('Inserisci prima una parola valida!');
      return;
    }

    startChallengeGame({
      w: word,
      c: challengeInputName.value.trim() || 'Tu',
      t: 0,
      l: challengeDiffLength,
      g: currentLang,
      isSelfTest: true
    });
  }

  function validateAndRefreshChallengeLink() {
    const word = challengeInputWord.value.toUpperCase().replace(/[^A-Z]/g, '');
    challengeInputWord.value = word;
    const langName = currentLang === 'en' ? 'inglese' : 'italiano';

    if (word.length === 0) {
      challengeWordValidation.textContent = `Digita una parola di ${challengeDiffLength} lettere (${LANG_FLAGS[currentLang]} ${langName})`;
      challengeWordValidation.className = 'validation-msg';
      challengeLinkInput.value = '';
      setShareBoxEnabled(false);
      return;
    }

    if (word.length !== challengeDiffLength) {
      challengeWordValidation.textContent = `Mancano ${challengeDiffLength - word.length} lettere`;
      challengeWordValidation.className = 'validation-msg invalid';
      challengeLinkInput.value = '';
      setShareBoxEnabled(false);
      return;
    }

    if (isValidWord(word, challengeDiffLength, currentLang)) {
      challengeWordValidation.textContent = `✓ Parola valida ${LANG_FLAGS[currentLang]} (${challengeDiffLength} lettere)`;
      challengeWordValidation.className = 'validation-msg valid';

      const payload = {
        w: word,
        c: challengeInputName.value.trim() || '',
        t: challengeTargetAttempts,
        l: challengeDiffLength,
        g: currentLang
      };
      if (challengeAudience === 'group') payload.m = 'g';

      challengeLinkInput.value = generateChallengeUrl(payload);
      setShareBoxEnabled(true);
    } else {
      challengeWordValidation.textContent = `✕ Parola non presente nel dizionario ${langName}`;
      challengeWordValidation.className = 'validation-msg invalid';
      challengeLinkInput.value = '';
      setShareBoxEnabled(false);
    }
  }

  function getChallengeShareMessage() {
    const isGroup = challengeAudience === 'group';
    const en = currentLang === 'en'; // sfida in inglese → invito in inglese
    const name = challengeInputName.value.trim();
    const target = challengeTargetAttempts;
    const url = challengeLinkInput.value;
    const len = challengeDiffLength;

    if (en) {
      const tentEn = n => `${n} ${n === 1 ? 'guess' : 'guesses'}`;
      if (isGroup) {
        let msg = `${name || 'Someone'} is challenging the group on Cassaforte (English, ${len} letters)\n`;
        msg += `I picked a secret word: who can guess it in the fewest tries?\n`;
        if (target > 0) msg += `🎯 Score to beat: ${tentEn(target)}\n`;
        msg += `\nPlay here:\n${url}`;
        return msg;
      }
      let msg = `${name || 'A friend'} challenged you on Cassaforte (English, ${len} letters)\n`;
      msg += target > 0
        ? `I picked a secret word: can you guess it in fewer than ${tentEn(target)}?\n\n`
        : `I picked a secret word: can you guess it?\n\n`;
      msg += `Play here:\n${url}`;
      return msg;
    }

    const tent = n => `${n} ${n === 1 ? 'tentativo' : 'tentativi'}`;
    if (isGroup) {
      let msg = `${name || 'Qualcuno'} sfida il gruppo su Cassaforte (italiano, ${len} lettere)\n`;
      msg += `Ho scelto una parola segreta: chi la indovina in meno tentativi?\n`;
      if (target > 0) msg += `🎯 Record da battere: ${tent(target)}\n`;
      msg += `\nGioca qui:\n${url}`;
      return msg;
    }

    let msg = `🔥 ${name || 'Un tuo amico'} ti ha sfidato su Cassaforte! (${LANG_FLAGS[currentLang]} ${len} lettere)\n`;
    if (target > 0) {
      msg += `"Ho scelto una parola segreta: riesci a indovinarla in meno di ${tent(target)}?"\n\n`;
    } else {
      msg += `"Ho scelto una parola segreta: riuscirai a indovinarla?"\n\n`;
    }
    msg += `👉 Clicca qui e accetta la sfida:\n${url}`;
    return msg;
  }

  // --- Lingua delle parole (IT / EN) ---
  function updateLangUI() {
    const inDuel = currentView === 'gameplay-duel';
    const shownLang = inDuel ? gameLang : currentLang;
    if (btnLang) {
      btnLang.textContent = `${LANG_FLAGS[shownLang]} ${shownLang.toUpperCase()}`;
      btnLang.disabled = inDuel;
      btnLang.title = inDuel ? 'La lingua del duello è decisa da chi ti ha sfidato' : `Lingua delle parole: ${LANG_LABELS[currentLang]} (clicca per cambiare)`;
    }
    langTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.lang === currentLang));
    document.documentElement.lang = currentLang;
  }

  function setLanguage(lang, opts = {}) {
    lang = lang === 'en' ? 'en' : 'it';
    if (isRevealing || currentView === 'gameplay-duel') return;
    const changed = lang !== currentLang;
    currentLang = lang;
    gameLang = lang;
    try { localStorage.setItem('limbo_lang', lang); } catch (e) {}
    updateLangUI();
    if (!changed) return;

    if (currentView === 'gameplay-daily') {
      isPracticeMode = false;
      currentDateBadge.textContent = getFormattedDate();
      initGameForCurrentDifficulty();
    } else if (currentView === 'challenge-creator' && !opts.silent) {
      syncChallengeDiffTabs();
      challengeInputWord.value = '';
      validateAndRefreshChallengeLink();
    }
    updateBadges();
    if (!opts.silent) showToast(`Parole in ${LANG_LABELS[lang]} ${LANG_FLAGS[lang]}`, 1600);
  }

  // --- Event Listeners UI ---
  // Navigazione Principale (Sfida un Amico vs Parola del Giorno)
  if (tabModeChallenge) {
    tabModeChallenge.addEventListener('click', () => setViewMode('challenge-creator'));
  }
  if (tabModeDaily) {
    tabModeDaily.addEventListener('click', () => setViewMode('gameplay-daily'));
  }
  if (btnOpenCreatorFromGame) {
    btnOpenCreatorFromGame.addEventListener('click', () => setViewMode('challenge-creator'));
  }
  if (btnTestChallenge) {
    btnTestChallenge.addEventListener('click', playTestChallenge);
  }

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

  // Azioni Post-Partita per Sfida Sociale
  if (btnChallengeWord) {
    btnChallengeWord.addEventListener('click', () => {
      closeAllModals();
      loadCreatorWithWord(targetWord, gameStatus === 'WON' ? guesses.length : 0, '', gameLang);
    });
  }
  if (btnCounterChallenge) {
    btnCounterChallenge.addEventListener('click', () => {
      closeAllModals();
      const opp = challengeData ? challengeData.c : '';
      const audience = challengeData && challengeData.m === 'g' ? 'group' : 'single';
      loadCreatorWithWord('', gameStatus === 'WON' ? guesses.length : 4, audience === 'group' ? '' : opp, gameLang, audience);
    });
  }
  if (btnShareDuelResult) {
    btnShareDuelResult.addEventListener('click', () => {
      if (!challengeData) return;
      const msg = buildDuelResultMessage();
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }
  if (btnExitChallenge) {
    btnExitChallenge.addEventListener('click', exitChallengeMode);
  }

  // Tabs difficoltà nella schermata creazione
  challengeDiffTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      challengeDiffLength = parseInt(tab.dataset.diff, 10);
      syncChallengeDiffTabs();
      challengeInputWord.value = '';
      validateAndRefreshChallengeLink();
    });
  });

  // Input parola e nome
  challengeInputWord.addEventListener('input', validateAndRefreshChallengeLink);
  challengeInputName.addEventListener('input', validateAndRefreshChallengeLink);

  // Parola casuale
  btnRandomChallengeWord.addEventListener('click', () => {
    const list = getWordList(challengeDiffLength, currentLang);
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
  [modalHelp, modalStats].forEach(m => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        closeAllModals();
      }
    });
  });

  // Selettore destinatari (amico singolo / gruppo)
  audienceTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setAudience(tab.dataset.audience);
      validateAndRefreshChallengeLink();
    });
  });

  // Selettore lingua (pill in header + tab nella schermata di creazione)
  if (btnLang) {
    btnLang.addEventListener('click', () => setLanguage(currentLang === 'it' ? 'en' : 'it'));
  }
  langTabs.forEach(tab => {
    tab.addEventListener('click', () => setLanguage(tab.dataset.lang));
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
    initTheme();
    initSound();
    try {
      const savedLang = localStorage.getItem('limbo_lang');
      if (savedLang === 'en' || savedLang === 'it') currentLang = savedLang;
    } catch (e) {}
    gameLang = currentLang;

    // Controlla se l'utente ha aperto un link di sfida (?sfida=... o #sfida=...)
    const hasChallenge = checkUrlForChallenge();
    if (!hasChallenge) {
      // Social First: Mostra subito la schermata di creazione sfida!
      setViewMode('challenge-creator');
      syncChallengeDiffTabs();
      setAudience('single');
      // Precompila con una bella parola suggerita
      const initialList = getWordList(5, currentLang);
      if (initialList && initialList.length > 0) {
        challengeInputWord.value = initialList[Math.floor(Math.random() * initialList.length)];
      }
      validateAndRefreshChallengeLink();
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
