const words = [
  { id: "viz", label: "víz", emoji: "💧" },
  { id: "anya", label: "anya", emoji: "👩" },
  { id: "apa", label: "apa", emoji: "👨" },
  { id: "auto", label: "autó", emoji: "🚗" },
  { id: "labda", label: "labda", emoji: "⚽" },
  { id: "cica", label: "cica", emoji: "🐱" },
  { id: "alma", label: "alma", emoji: "🍎" },
  { id: "kifli", label: "kifli", emoji: "🥐" },
  { id: "tej", label: "tej", emoji: "🥛" },
  { id: "furdokad", label: "fürdőkád", emoji: "🛁" },
  { id: "maci", label: "maci", emoji: "🧸" },
  { id: "szia", label: "szia", emoji: "👋" },
];

const STORAGE_KEY = "speech_game_progress_v1";
const WORD_LISTEN_WINDOW_MS = 30_000;
const CELEBRATION_MS = 1300;
const state = loadProgress();
let currentImitate = 0;
let autoSessionToken = 0;
let micMonitor = null;
let sfxContext = null;

const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".panel")];
const cardsGrid = document.querySelector("#cards-grid");
const imitateEmoji = document.querySelector("#imitate-emoji");
const imitateWord = document.querySelector("#imitate-word");
const imitatePrompt = document.querySelector("#imitate-prompt");
const listenBtn = document.querySelector("#listen-btn");
const listenStatus = document.querySelector("#listen-status");
const successBadge = document.querySelector("#success-badge");
const listeningIndicator = document.querySelector("#listening-indicator");
const imitateWrap = document.querySelector(".imitate-wrap");
const confettiLayer = document.querySelector("#confetti-layer");
const playsCount = document.querySelector("#plays-count");
const attemptCount = document.querySelector("#attempt-count");
const rewardCount = document.querySelector("#reward-count");
let listening = false;

document.querySelector("#play-model").addEventListener("click", () => {
  primeSfx();
  playWord(words[currentImitate]);
});

document.querySelector("#next-word").addEventListener("click", () => {
  primeSfx();
  currentImitate = (currentImitate + 1) % words.length;
  renderImitate();
});

listenBtn.addEventListener("click", () => {
  primeSfx();
  startListeningAttempt();
});

document.querySelector("#reset-progress").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    primeSfx();
    tabs.forEach((btn) => btn.classList.remove("is-active"));
    panels.forEach((panel) => panel.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`#${tab.dataset.tab}`).classList.add("is-active");
    if (tab.dataset.tab === "imitate") {
      startAutoImitateSession();
    } else {
      stopAutoImitateSession();
    }
  });
});

renderCards();
renderImitate();
refreshStats();

function renderCards() {
  cardsGrid.innerHTML = "";
  words.forEach((word) => {
    const button = document.createElement("button");
    button.className = "card";
    button.innerHTML = `<div class="card-emoji">${word.emoji}</div><div class="card-word">${word.label}</div>`;
    button.addEventListener("click", () => {
      playWord(word);
      state.plays += 1;
      saveProgress();
      refreshStats();
    });
    cardsGrid.appendChild(button);
  });
}

function renderImitate() {
  const word = words[currentImitate];
  imitateEmoji.textContent = word.emoji;
  imitateWord.textContent = word.label;
  imitatePrompt.textContent = `Mondd: ${word.label}`;
  setListeningUi(false);
  listenStatus.textContent = "Nyomd meg a Figyelek gombot.";
  hideSuccessBadge();
}

function refreshStats() {
  playsCount.textContent = String(state.plays);
  attemptCount.textContent = String(state.attempts);
  rewardCount.textContent = String(state.rewards);
}

async function playWord(word) {
  const src = `./audio/${word.id}.mp3`;
  const ok = await tryPlayFile(src);
  if (!ok) {
    await speakHungarian(word.label);
  }
}

function tryPlayFile(src) {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      resolve(result);
    };

    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);

    audio.play().then(
      () => {
        const safety = Math.min((audio.duration || 2) * 1000 + 1200, 7000);
        setTimeout(() => finish(true), safety);
      },
      () => finish(false),
    );
  });
}

function speakHungarian(text) {
  if (!("speechSynthesis" in window)) return Promise.resolve();
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    utterance.lang = "hu-HU";
    utterance.rate = 0.82;
    utterance.pitch = 1;
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
    setTimeout(done, 4500);
  });
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || baseProgress();
  } catch {
    return baseProgress();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function baseProgress() {
  return { plays: 0, attempts: 0, rewards: 0 };
}

function burstConfettiOverlay(durationMs) {
  if (!confettiLayer) return Promise.resolve();
  confettiLayer.innerHTML = "";
  confettiLayer.classList.add("is-active");

  const icons = ["🎉", "✨", "🎊", "⭐", "💫"];
  const pieces = 48;
  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.textContent = icons[Math.floor(Math.random() * icons.length)];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    piece.style.animationDuration = `${0.9 + Math.random() * 0.55}s`;
    piece.style.transform = `translateY(-18vh) rotate(${Math.random() * 180}deg)`;
    confettiLayer.appendChild(piece);
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      confettiLayer.classList.remove("is-active");
      confettiLayer.innerHTML = "";
      resolve();
    }, durationMs);
  });
}

async function startListeningAttempt() {
  if (listening) return false;
  listening = true;
  setListeningUi(true);
  listenStatus.textContent = "Hallgatlak... mondd ki a szót.";
  hideSuccessBadge();
  playListeningStartSound();
  await sleep(180);
  await ensureMicMonitor();

  state.attempts += 1;
  saveProgress();
  refreshStats();

  let heard = false;
  try {
    heard = await detectSpeech(words[currentImitate].label);
  } catch {
    heard = false;
  }

  if (heard) {
    await onListeningSuccess();
  } else {
    listenStatus.textContent = "Nem hallottam jól. Próbáljuk újra!";
  }

  setListeningUi(false);
  listening = false;
  return heard;
}

async function onListeningSuccess() {
  listenStatus.textContent = "Ügyes volt! Hallottam valamit.";
  showSuccessBadge();
  playSuccessSound();
  state.rewards += 1;
  saveProgress();
  refreshStats();
  await burstConfettiOverlay(CELEBRATION_MS);
}

function showSuccessBadge() {
  successBadge.classList.remove("is-hidden");
}

function hideSuccessBadge() {
  successBadge.classList.add("is-hidden");
}

async function detectSpeech(targetWord) {
  // Fast first pass: toddler vocalization often works better than exact ASR.
  const quickEnergy = await detectVoiceEnergy({
    durationMs: 1300,
    threshold: 8,
    minHits: 3,
    minConsecutive: 3,
    minActiveMs: 180,
  });
  if (quickEnergy) return true;

  const hasRecognition =
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  if (hasRecognition) {
    const transcript = await recognizeHungarianSpeech(2600);
    if (transcript) {
      const normalizedTranscript = normalizeText(transcript);
      const normalizedTarget = normalizeText(targetWord);
      if (
        normalizedTranscript.includes(normalizedTarget) ||
        normalizedTranscript.length > 0
      ) {
        return true;
      }
    }
  }

  // Second short energy pass catches late responses.
  return detectVoiceEnergy({
    durationMs: 1200,
    threshold: 8,
    minHits: 3,
    minConsecutive: 3,
    minActiveMs: 180,
  });
}

function recognizeHungarianSpeech(timeoutMs = 4500) {
  return new Promise((resolve) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    let settled = false;

    recognition.lang = "hu-HU";
    recognition.maxAlternatives = 1;
    recognition.interimResults = false;
    recognition.continuous = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        recognition.stop();
        resolve("");
      }
    }, timeoutMs);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(transcript);
      }
    };

    recognition.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve("");
      }
    };

    recognition.onend = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve("");
      }
    };

    recognition.start();
  });
}

async function detectVoiceEnergy({
  durationMs = 2000,
  threshold = 9,
  minHits = 4,
  minConsecutive = 4,
  minActiveMs = 220,
} = {}) {
  const monitor = await ensureMicMonitor();
  if (!monitor) return false;

  let hits = 0;
  let consecutive = 0;
  let activeMs = 0;
  const stepMs = 30;
  const start = performance.now();

  while (performance.now() - start < durationMs) {
    monitor.analyzer.getByteTimeDomainData(monitor.data);
    let sum = 0;
    for (let i = 0; i < monitor.data.length; i += 1) {
      const centered = monitor.data[i] - 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / monitor.data.length);
    if (rms > threshold) {
      hits += 1;
      consecutive += 1;
      activeMs += stepMs;
    } else {
      consecutive = 0;
    }

    if (
      hits >= minHits ||
      consecutive >= minConsecutive ||
      activeMs >= minActiveMs
    ) {
      return true;
    }

    await sleep(stepMs);
  }

  return (
    hits >= minHits || consecutive >= minConsecutive || activeMs >= minActiveMs
  );
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setListeningUi(active) {
  listenBtn.disabled = active;
  listenBtn.textContent = active ? "Figyelek..." : "Figyelek 🎤";
  imitateWrap.classList.toggle("is-listening", active);
  listeningIndicator.classList.toggle("is-hidden", !active);
}

function playSuccessSound() {
  const context = getSfxContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.value = 0.48;
  master.connect(context.destination);

  // Bright "clink" style hit with short layered tones.
  playTone(context, master, 1318, now, 0.08, "triangle", 0.23);
  playTone(context, master, 1760, now + 0.01, 0.07, "square", 0.15);
  playTone(context, master, 2637, now + 0.015, 0.06, "sine", 0.13);
  playTone(context, master, 1568, now + 0.11, 0.11, "triangle", 0.18);
  playTone(context, master, 2093, now + 0.12, 0.09, "square", 0.12);

  setTimeout(() => {
    try {
      master.disconnect();
    } catch {}
  }, 700);
}

function playTone(
  context,
  destination,
  freq,
  startAt,
  duration,
  waveType = "triangle",
  peak = 0.16,
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function playListeningStartSound() {
  const context = getSfxContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.value = 0.02;
  master.connect(context.destination);

  playTone(context, master, 520, now, 0.09);
  playTone(context, master, 620, now + 0.1, 0.1);

  setTimeout(() => {
    try {
      master.disconnect();
    } catch {}
  }, 550);
}

async function startAutoImitateSession() {
  autoSessionToken += 1;
  const token = autoSessionToken;
  listenStatus.textContent = "Kezdjük! Hallgasd és mondd utána.";
  currentImitate = 0;
  await ensureMicMonitor();

  for (let i = 0; i < words.length && token === autoSessionToken; i += 1) {
    currentImitate = i;
    renderImitate();
    playTransitionCue();
    await sleep(200);
    await playWord(words[currentImitate]);

    const wordEndAt = Date.now() + WORD_LISTEN_WINDOW_MS;
    let success = false;
    while (token === autoSessionToken && Date.now() < wordEndAt && !success) {
      success = await startListeningAttempt();
      if (!success) {
        await sleep(120);
      }
    }
    if (token === autoSessionToken && success) {
      await sleep(220);
    }
  }

  if (token === autoSessionToken) {
    setListeningUi(false);
    listening = false;
    listenStatus.textContent = "Kör vége. Koppints a Mondd utána fülre újrakezdéshez.";
  }
}

function stopAutoImitateSession() {
  autoSessionToken += 1;
  teardownMicMonitor();
}

function playTransitionCue() {
  imitateWrap.classList.remove("is-transitioning");
  requestAnimationFrame(() => {
    imitateWrap.classList.add("is-transitioning");
    setTimeout(() => imitateWrap.classList.remove("is-transitioning"), 450);
  });
}

async function ensureMicMonitor() {
  if (micMonitor) return micMonitor;
  if (!navigator.mediaDevices?.getUserMedia) return null;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyzer = context.createAnalyser();
    analyzer.fftSize = 1024;
    source.connect(analyzer);
    const data = new Uint8Array(analyzer.frequencyBinCount);
    micMonitor = { stream, context, analyzer, data };
    return micMonitor;
  } catch {
    return null;
  }
}

function teardownMicMonitor() {
  if (!micMonitor) return;
  micMonitor.stream.getTracks().forEach((track) => track.stop());
  micMonitor.context.close().catch(() => {});
  micMonitor = null;
}

function getSfxContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!sfxContext) {
    sfxContext = new AudioContext();
  }
  return sfxContext;
}

function primeSfx() {
  const context = getSfxContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
}
