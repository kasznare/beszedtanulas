import { PROJECT_SUPABASE } from "./supabase-config.js";

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
  { id: "kutya", label: "kutya", emoji: "🐶" },
  { id: "baba", label: "baba", emoji: "👶" },
  { id: "nap", label: "nap", emoji: "☀️" },
  { id: "hold", label: "hold", emoji: "🌙" },
  { id: "fa", label: "fa", emoji: "🌳" },
  { id: "virag", label: "virág", emoji: "🌷" },
  { id: "kenyer", label: "kenyér", emoji: "🍞" },
  { id: "kanal", label: "kanál", emoji: "🥄" },
  { id: "cipo", label: "cipő", emoji: "👟" },
  { id: "sapka", label: "sapka", emoji: "🧢" },
  { id: "vonat", label: "vonat", emoji: "🚂" },
  { id: "busz", label: "busz", emoji: "🚌" },
];

const twoWordPhrases = [
  {
    id: "kerek_vizet",
    text: "kérek vizet",
    emojis: ["🙏", "💧"],
    targets: [
      { base: "kerek", aliases: ["kerek", "kerem", "ker"] },
      { base: "vizet", aliases: ["viz", "vizet", "vizet"] },
    ],
  },
  {
    id: "meg_alma",
    text: "még alma",
    emojis: ["➕", "🍎"],
    targets: [
      { base: "meg", aliases: ["meg", "meg"] },
      { base: "alma", aliases: ["ama", "alma", "amma"] },
    ],
  },
  {
    id: "anya_gyere",
    text: "anya gyere",
    emojis: ["👩", "👉"],
    targets: [
      { base: "anya", aliases: ["anya", "ana", "aja"] },
      { base: "gyere", aliases: ["gyere", "gyere", "gye"] },
    ],
  },
  {
    id: "apa_auto",
    text: "apa autó",
    emojis: ["👨", "🚗"],
    targets: [
      { base: "apa", aliases: ["apa", "aba", "appa"] },
      { base: "auto", aliases: ["ato", "otu", "auto"] },
    ],
  },
  {
    id: "nagy_labda",
    text: "nagy labda",
    emojis: ["📏", "⚽"],
    targets: [
      { base: "nagy", aliases: ["nagy", "nagyi", "nagi"] },
      { base: "labda", aliases: ["aba", "laba", "bada"] },
    ],
  },
  {
    id: "nem_kerem",
    text: "nem kérem",
    emojis: ["🚫", "🙏"],
    targets: [
      { base: "nem", aliases: ["nem", "neeem"] },
      { base: "kerem", aliases: ["kerem", "kerek", "kerem"] },
    ],
  },
];

const TODDLER_ALIASES = {
  viz: ["bi", "vi", "viz"],
  auto: ["ato", "otu", "auto"],
  labda: ["aba", "laba", "bada"],
  cica: ["cica", "sica", "tica"],
  anya: ["anya", "ana", "aja"],
  apa: ["apa", "aba", "appa"],
  alma: ["ama", "alma", "amma"],
  kifli: ["kifi", "ifli", "kifli"],
  tej: ["tej", "te", "dej"],
  furdokad: ["furdokad", "kadi", "kad"],
  maci: ["maci", "macii", "maci"],
  szia: ["szia", "sziaa", "sia"],
  kutya: ["kutya", "kuya", "tya"],
  baba: ["baba", "babaa", "aba"],
  nap: ["nap", "napp", "ap"],
  hold: ["hold", "hol", "old"],
  fa: ["fa", "faa", "a"],
  virag: ["virag", "vira", "rag"],
  kenyer: ["kenyer", "kener", "nyer"],
  kanal: ["kanal", "kana", "nal"],
  cipo: ["cipo", "cipoo", "ipo"],
  sapka: ["sapka", "sapkaa", "apka"],
  vonat: ["vonat", "vonat", "onat"],
  busz: ["busz", "bus", "usz"],
};

const STORAGE_KEY = "speech_game_progress_v1";
const WORD_LISTEN_WINDOW_MS = 30_000;
const CELEBRATION_MS = 1300;
const MIN_LISTEN_BEFORE_REJECT_MS = 2200;
const ASR_TIMEOUT_MS = 3800;
const ASR_EARLY_SETTLE_MS = 650;
const TWO_WORD_MATCH_THRESHOLD = 0.68;
const DETECTION_DEFAULTS = {
  mode: "encouraging",
  strictThreshold: 0.72,
};
const SUPABASE_CONFIG_DEFAULTS = {
  url: "",
  publishableKey: "",
  profileCode: "",
  childName: "",
  activeRole: "kid",
};
const state = loadProgress();
let currentImitate = 0;
let autoSessionToken = 0;
let micMonitor = null;
let sfxContext = null;
let supabaseClient = null;
let supabaseProfileId = null;
let supabaseReady = false;
let syncInFlight = false;
const wordAudioBufferCache = new Map();
let currentPhrase = 0;

const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".panel")];
const cardsGrid = document.querySelector("#cards-grid");
const flipGrid = document.querySelector("#flip-grid");
const flipStatus = document.querySelector("#flip-status");
const imitateEmoji = document.querySelector("#imitate-emoji");
const imitateWord = document.querySelector("#imitate-word");
const imitatePrompt = document.querySelector("#imitate-prompt");
const listenBtn = document.querySelector("#listen-btn");
const listenStatus = document.querySelector("#listen-status");
const successBadge = document.querySelector("#success-badge");
const listeningIndicator = document.querySelector("#listening-indicator");
const imitateWrap = document.querySelector(".imitate-wrap");
const confettiLayer = document.querySelector("#confetti-layer");
const phraseEmoji = document.querySelector("#phrase-emoji");
const phraseText = document.querySelector("#phrase-text");
const phrasePrompt = document.querySelector("#phrase-prompt");
const playPhraseBtn = document.querySelector("#play-phrase");
const listenPhraseBtn = document.querySelector("#listen-phrase-btn");
const nextPhraseBtn = document.querySelector("#next-phrase");
const phraseStatus = document.querySelector("#phrase-status");
const phraseSuccessBadge = document.querySelector("#phrase-success-badge");
const phraseListeningIndicator = document.querySelector("#phrase-listening-indicator");
const phraseWrap = document.querySelector(".phrase-wrap");
const playsCount = document.querySelector("#plays-count");
const attemptCount = document.querySelector("#attempt-count");
const rewardCount = document.querySelector("#reward-count");
const detectionModeSelect = document.querySelector("#detection-mode");
const strictThresholdInput = document.querySelector("#strict-threshold");
const strictThresholdValue = document.querySelector("#strict-threshold-value");
const supabaseUrlInput = document.querySelector("#supabase-url");
const supabasePublishableKeyInput = document.querySelector("#supabase-publishable-key");
const supabaseRoleSelect = document.querySelector("#supabase-role");
const supabaseProfileCodeInput = document.querySelector("#supabase-profile-code");
const supabaseChildNameInput = document.querySelector("#supabase-child-name");
const supabaseConnectBtn = document.querySelector("#supabase-connect");
const supabaseSyncNowBtn = document.querySelector("#supabase-sync-now");
const supabaseStatus = document.querySelector("#supabase-status");
const debugEngine = document.querySelector("#debug-engine");
const debugStage = document.querySelector("#debug-stage");
const debugDecision = document.querySelector("#debug-decision");
const debugReason = document.querySelector("#debug-reason");
const debugTranscript = document.querySelector("#debug-transcript");
const debugRaw = document.querySelector("#debug-raw");
const debugScore = document.querySelector("#debug-score");
const debugEnergy = document.querySelector("#debug-energy");
const liveEngine = document.querySelector("#live-engine");
const liveStage = document.querySelector("#live-stage");
const liveTranscript = document.querySelector("#live-transcript");
const liveRaw = document.querySelector("#live-raw");
const liveReason = document.querySelector("#live-reason");
let listening = false;
let flipBusy = false;

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

playPhraseBtn.addEventListener("click", () => {
  primeSfx();
  playPhrase(twoWordPhrases[currentPhrase]);
  state.plays += 1;
  saveProgress();
  refreshStats();
});

nextPhraseBtn.addEventListener("click", () => {
  primeSfx();
  currentPhrase = (currentPhrase + 1) % twoWordPhrases.length;
  renderTwoWordMode();
});

listenPhraseBtn.addEventListener("click", () => {
  primeSfx();
  startPhraseListeningAttempt();
});

detectionModeSelect.addEventListener("change", () => {
  state.detection.mode = detectionModeSelect.value;
  saveProgress();
  syncDetectionControls();
});

strictThresholdInput.addEventListener("input", () => {
  const value = Number(strictThresholdInput.value);
  state.detection.strictThreshold = Number.isFinite(value)
    ? Number(value.toFixed(2))
    : DETECTION_DEFAULTS.strictThreshold;
  saveProgress();
  syncDetectionControls();
});

supabaseRoleSelect.addEventListener("change", () => {
  state.supabase.activeRole = supabaseRoleSelect.value;
  applyRoleProfileToState();
  saveProgress();
  syncSupabaseControls();
  if (supabaseReady) {
    connectSupabase().catch((err) => {
      setSupabaseStatus(`Profil váltás hiba: ${String(err.message || err)}`);
    });
  }
});

supabaseConnectBtn.addEventListener("click", () => {
  connectSupabase().catch((err) => {
    setSupabaseStatus(`Kapcsolódási hiba: ${String(err.message || err)}`);
  });
});

supabaseSyncNowBtn.addEventListener("click", () => {
  syncProgressToSupabase().catch((err) => {
    setSupabaseStatus(`Szinkron hiba: ${String(err.message || err)}`);
  });
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
      if (tab.dataset.tab === "flip") {
        flipStatus.textContent = "Koppints egy kártyára, mondd ki a szót.";
      }
    }
  });
});

renderCards();
renderFlipGame();
renderImitate();
renderTwoWordMode();
refreshStats();
syncDetectionControls();
syncSupabaseControls();
renderDebug({
  engine: "idle",
  stage: "idle",
  decision: "-",
  reason: "-",
  transcript: "-",
  raw: "-",
  score: null,
  energy: null,
});
applyProjectSupabaseConfig();
trySupabaseAutoconnect();

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

function renderFlipGame() {
  flipGrid.innerHTML = "";
  words.forEach((word) => {
    const card = document.createElement("button");
    card.className = "flip-card";
    card.innerHTML = `
      <div class="flip-card-face flip-card-back">❓</div>
      <div class="flip-card-face flip-card-front">
        <div class="card-emoji">${word.emoji}</div>
        <div class="card-word">${word.label}</div>
      </div>
    `;
    card.addEventListener("click", () => runFlipCardAttempt(card, word));
    flipGrid.appendChild(card);
  });
}

async function runFlipCardAttempt(card, word) {
  if (flipBusy || listening) return;
  flipBusy = true;
  primeSfx();
  card.classList.remove("is-success", "is-fail");
  card.classList.add("is-open");
  flipStatus.textContent = `Mondd: ${word.label}`;
  setEngineState("listening", "Hallgatlak...");
  await playWord(word);
  playListeningStartSound();
  await sleep(120);

  state.attempts += 1;
  registerWordAttempt(word.id);
  saveProgress();
  refreshStats();

  const result = await detectSpeech(word);
  renderDebug(result);

  if (result.success) {
    setEngineState("success", "Szuper!");
    state.rewards += 1;
    registerWordSuccess(word.id);
    saveProgress();
    refreshStats();
    playSuccessSound();
    card.classList.add("is-success");
    flipStatus.textContent = `Ügyes! ${word.label}`;
    await burstConfettiOverlay(650);
    await sleep(260);
  } else {
    registerWordFailure(word.id);
    saveProgress();
    refreshStats();
    setEngineState("rejected", "Próbáljuk újra.");
    card.classList.add("is-fail");
    flipStatus.textContent = `Nem baj, próbáljuk újra: ${word.label}`;
    await sleep(500);
  }

  card.classList.remove("is-open", "is-success", "is-fail");
  setEngineState("idle", "Készen áll.");
  flipBusy = false;
}

function renderImitate() {
  const word = words[currentImitate];
  imitateEmoji.textContent = word.emoji;
  imitateWord.textContent = word.label;
  imitatePrompt.textContent = `Mondd: ${word.label}`;
  setListeningUi(false);
  setEngineState("idle", "Készen áll.");
  listenStatus.textContent = "Nyomd meg a Figyelek gombot.";
  hideSuccessBadge();
}

function renderTwoWordMode() {
  const phrase = twoWordPhrases[currentPhrase];
  phraseEmoji.textContent = phrase.emojis.join(" ");
  phraseText.textContent = phrase.text;
  phrasePrompt.textContent = `Mondd: ${phrase.text}`;
  setPhraseListeningUi(false);
  setPhraseState("idle", "Készen áll.");
  phraseStatus.textContent = "Nyomd meg a Figyelek gombot.";
  hidePhraseSuccessBadge();
}

async function playPhrase(phrase) {
  const src = `./audio/phrases/${phrase.id}.mp3`;
  const ok = await tryPlayFile(src);
  if (!ok) {
    await speakHungarian(phrase.text);
  }
}

async function startPhraseListeningAttempt() {
  if (listening || flipBusy) return false;
  listening = true;
  setPhraseListeningUi(true);
  setPhraseState("listening", "Figyelek...");
  phraseStatus.textContent = "Hallgatlak... mondd ki a két szót.";
  hidePhraseSuccessBadge();
  playListeningStartSound();
  await sleep(180);
  await ensureMicMonitor();

  state.attempts += 1;
  registerWordAttempt(words[currentImitate].id);
  saveProgress();
  refreshStats();

  const result = await detectTwoWordPhrase(twoWordPhrases[currentPhrase]);
  if (result.success) {
    setPhraseState("success", "Szuper!");
    phraseStatus.textContent = "Ügyes! Megvolt a két szó.";
    showPhraseSuccessBadge();
    playSuccessSound();
    state.rewards += 1;
    saveProgress();
    refreshStats();
    await burstConfettiOverlay(900);
    setPhraseState("idle", "Készen áll.");
  } else {
    setPhraseState("rejected", "Próbáljuk újra.");
    phraseStatus.textContent = result.reason || "Nem volt meg mindkét szó. Próbáljuk újra!";
    await sleep(260);
    setPhraseState("idle", "Készen áll.");
  }

  setPhraseListeningUi(false);
  listening = false;
  return result.success;
}

async function detectTwoWordPhrase(phrase) {
  const energyPromise = detectVoiceEnergy({
    durationMs: MIN_LISTEN_BEFORE_REJECT_MS,
    threshold: 8,
    minHits: 5,
    minConsecutive: 5,
    minActiveMs: 580,
  });

  setPhraseState("processing", "Beszédfelismerés...");
  const speech = await recognizeHungarianSpeech(ASR_TIMEOUT_MS + 1000);
  const energy = await energyPromise;

  if (!energy.detected) {
    return {
      success: false,
      reason: "Nem hallottam tiszta beszédet.",
    };
  }

  const candidates = collectPhraseCandidates(speech.alternatives);
  if (candidates.length === 0) {
    return {
      success: false,
      reason: "Nem kaptam értelmezhető szavakat.",
    };
  }

  const scores = phrase.targets.map((target) => getPhraseTargetScore(target, candidates));
  const allMatched = scores.every((score) => score >= TWO_WORD_MATCH_THRESHOLD);

  if (allMatched) {
    return { success: true, reason: "Mindkét szó megvan." };
  }

  return {
    success: false,
    reason: `Még nincs meg mindkét szó (${scores.map((s) => s.toFixed(2)).join(" / ")}).`,
  };
}

function collectPhraseCandidates(alternatives) {
  const candidates = [];
  for (const alt of alternatives || []) {
    const normalized = normalizeText(stripHungarianSuffixes(alt));
    if (!normalized) continue;
    candidates.push(normalized);
    const tokens = normalized.split(/\s+/).filter(Boolean);
    candidates.push(...tokens);
    for (let i = 0; i < tokens.length; i += 1) {
      candidates.push(tokens.slice(i, i + 2).join(" ").trim());
    }
  }
  return dedupeStrings(candidates);
}

function getPhraseTargetScore(target, candidates) {
  const norms = [target.base, ...(target.aliases || [])]
    .map((item) => normalizeText(item))
    .filter(Boolean);

  let best = 0;
  for (const candidate of candidates) {
    for (const norm of norms) {
      best = Math.max(best, similarityScore(norm, candidate));
    }
  }
  return best;
}

function syncDetectionControls() {
  detectionModeSelect.value = state.detection.mode;
  strictThresholdInput.value = String(state.detection.strictThreshold);
  strictThresholdValue.textContent = state.detection.strictThreshold.toFixed(2);
  strictThresholdInput.disabled = state.detection.mode !== "strictish";
}

function syncSupabaseControls() {
  supabaseRoleSelect.value = state.supabase.activeRole || "kid";
  supabaseUrlInput.value = state.supabase.url;
  supabasePublishableKeyInput.value = state.supabase.publishableKey;
  supabaseProfileCodeInput.value = state.supabase.profileCode;
  supabaseChildNameInput.value = state.supabase.childName;
  supabaseProfileCodeInput.disabled = true;
  supabaseChildNameInput.disabled = true;

  const locked = Boolean(PROJECT_SUPABASE?.lockConnection);
  supabaseUrlInput.disabled = locked;
  supabasePublishableKeyInput.disabled = locked;
  if (locked) {
    supabaseUrlInput.title = "Projekt konfigurációból töltve";
    supabasePublishableKeyInput.title = "Projekt konfigurációból töltve";
  }
}

function setSupabaseStatus(text) {
  supabaseStatus.textContent = text;
}

function applyProjectSupabaseConfig() {
  if (!PROJECT_SUPABASE || typeof PROJECT_SUPABASE !== "object") return;

  if (PROJECT_SUPABASE.url) {
    state.supabase.url = PROJECT_SUPABASE.url;
  }
  if (PROJECT_SUPABASE.publishableKey) {
    state.supabase.publishableKey = PROJECT_SUPABASE.publishableKey;
  }
  if (PROJECT_SUPABASE.activeRole) {
    state.supabase.activeRole = PROJECT_SUPABASE.activeRole;
  }
  applyRoleProfileToState();
  saveProgress();
  syncSupabaseControls();
}

function applyRoleProfileToState() {
  const role = state.supabase.activeRole || "kid";
  const profile = PROJECT_SUPABASE?.profiles?.[role];
  if (!profile) return;
  state.supabase.profileCode = profile.profileCode || role;
  state.supabase.childName = profile.childName || role;
}

function renderDebug(result) {
  debugEngine.textContent = result.engine ?? "idle";
  debugStage.textContent = result.stage ?? "idle";
  debugDecision.textContent = result.decision ?? "-";
  debugReason.textContent = result.reason ?? "-";
  debugTranscript.textContent =
    result.transcript && result.transcript.length > 0 ? result.transcript : "-";
  debugRaw.textContent =
    result.raw && result.raw.length > 0 ? result.raw : "-";
  debugScore.textContent =
    typeof result.score === "number" ? result.score.toFixed(2) : "-";
  debugEnergy.textContent =
    typeof result.energy === "number" ? `${result.energy.toFixed(1)} rms` : "-";

  liveEngine.textContent = result.engine ?? "idle";
  liveStage.textContent = result.stage ?? "idle";
  liveTranscript.textContent =
    result.transcript && result.transcript.length > 0 ? result.transcript : "-";
  liveRaw.textContent =
    result.raw && result.raw.length > 0 ? result.raw : "-";
  liveReason.textContent = result.reason ?? result.decision ?? "-";
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
  return tryPlayFileWithBuffer(src).catch(() => tryPlayFileWithElement(src));
}

async function tryPlayFileWithBuffer(src) {
  const context = getSfxContext();
  if (!context) return false;
  if (context.state === "suspended") {
    await context.resume().catch(() => {});
  }
  if (context.state !== "running") return false;

  const buffer = await loadWordBuffer(src, context);
  if (!buffer) return false;

  return new Promise((resolve) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      try {
        source.disconnect();
      } catch {}
      resolve(result);
    };

    source.onended = () => finish(true);
    source.start();
    setTimeout(() => finish(true), Math.min(buffer.duration * 1000 + 700, 12000));
  });
}

function tryPlayFileWithElement(src) {
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

async function loadWordBuffer(src, context) {
  if (wordAudioBufferCache.has(src)) {
    return wordAudioBufferCache.get(src);
  }

  const response = await fetch(src, { cache: "force-cache" });
  if (!response.ok) return null;
  const audioData = await response.arrayBuffer();
  const buffer = await decodeAudioData(context, audioData);
  if (!buffer) return null;
  wordAudioBufferCache.set(src, buffer);
  return buffer;
}

function decodeAudioData(context, audioData) {
  return new Promise((resolve) => {
    context.decodeAudioData(
      audioData.slice(0),
      (buffer) => resolve(buffer),
      () => resolve(null),
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
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeState(parsed);
  } catch {
    return baseProgress();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleSupabaseSync();
}

function baseProgress() {
  const wordStats = {};
  for (const word of words) {
    wordStats[word.id] = baseWordStats();
  }
  return {
    plays: 0,
    attempts: 0,
    rewards: 0,
    detection: { ...DETECTION_DEFAULTS },
    supabase: { ...SUPABASE_CONFIG_DEFAULTS },
    wordStats,
  };
}

function normalizeState(input) {
  const base = baseProgress();
  if (!input || typeof input !== "object") return base;
  return {
    plays: Number.isFinite(input.plays) ? input.plays : base.plays,
    attempts: Number.isFinite(input.attempts) ? input.attempts : base.attempts,
    rewards: Number.isFinite(input.rewards) ? input.rewards : base.rewards,
    detection: {
      mode:
        input.detection?.mode === "strictish" ? "strictish" : DETECTION_DEFAULTS.mode,
      strictThreshold: Number.isFinite(input.detection?.strictThreshold)
        ? Math.min(0.95, Math.max(0.55, Number(input.detection.strictThreshold)))
        : DETECTION_DEFAULTS.strictThreshold,
    },
    supabase: {
      url: typeof input.supabase?.url === "string" ? input.supabase.url : "",
      publishableKey:
        typeof input.supabase?.publishableKey === "string"
          ? input.supabase.publishableKey
          : typeof input.supabase?.anonKey === "string"
            ? input.supabase.anonKey
            : "",
      profileCode:
        typeof input.supabase?.profileCode === "string" ? input.supabase.profileCode : "",
      childName:
        typeof input.supabase?.childName === "string" ? input.supabase.childName : "",
      activeRole:
        input.supabase?.activeRole === "admin" ? "admin" : SUPABASE_CONFIG_DEFAULTS.activeRole,
    },
    wordStats: normalizeWordStats(input.wordStats),
  };
}

function baseWordStats() {
  return {
    attempts: 0,
    successes: 0,
    streak: 0,
    lastSeenAt: "",
  };
}

function normalizeWordStats(inputStats) {
  const stats = {};
  for (const word of words) {
    const raw = inputStats?.[word.id] || {};
    stats[word.id] = {
      attempts: Number.isFinite(raw.attempts) ? raw.attempts : 0,
      successes: Number.isFinite(raw.successes) ? raw.successes : 0,
      streak: Number.isFinite(raw.streak) ? raw.streak : 0,
      lastSeenAt: typeof raw.lastSeenAt === "string" ? raw.lastSeenAt : "",
    };
  }
  return stats;
}

function registerWordAttempt(wordId) {
  const stats = state.wordStats[wordId] || baseWordStats();
  stats.attempts += 1;
  stats.lastSeenAt = new Date().toISOString();
  state.wordStats[wordId] = stats;
}

function registerWordSuccess(wordId) {
  const stats = state.wordStats[wordId] || baseWordStats();
  stats.successes += 1;
  stats.streak += 1;
  stats.lastSeenAt = new Date().toISOString();
  state.wordStats[wordId] = stats;
}

function registerWordFailure(wordId) {
  const stats = state.wordStats[wordId] || baseWordStats();
  stats.streak = 0;
  stats.lastSeenAt = new Date().toISOString();
  state.wordStats[wordId] = stats;
}

function getWordDifficultyScore(word) {
  const stats = state.wordStats[word.id] || baseWordStats();
  const attempts = Math.max(stats.attempts, 1);
  const successRate = stats.successes / attempts;
  const lowAttemptBoost = stats.attempts < 2 ? 0.22 : 0;
  const streakPenalty = Math.min(stats.streak * 0.03, 0.15);
  return Math.max(0, 1 - successRate + lowAttemptBoost - streakPenalty);
}

function buildAdaptiveSessionWords() {
  const ranked = [...words]
    .map((word) => ({ word, score: getWordDifficultyScore(word) }))
    .sort((a, b) => b.score - a.score);

  const baseSequence = ranked.map((entry) => entry.word);
  const repeats = ranked
    .slice(0, Math.max(4, Math.floor(words.length / 4)))
    .filter((entry) => entry.score >= 0.35)
    .map((entry) => entry.word);

  return [...baseSequence, ...repeats];
}

function scheduleSupabaseSync() {
  if (!supabaseReady || syncInFlight) return;
  window.setTimeout(() => {
    if (!supabaseReady || syncInFlight) return;
    syncProgressToSupabase().catch(() => {});
  }, 120);
}

async function trySupabaseAutoconnect() {
  if (!state.supabase.url || !state.supabase.publishableKey || !state.supabase.profileCode) {
    setSupabaseStatus("Nincs csatlakoztatva.");
    return;
  }
  try {
    await connectSupabase(true);
  } catch {
    setSupabaseStatus("Supabase automatikus csatlakozás sikertelen.");
  }
}

async function connectSupabase(isAuto = false) {
  state.supabase.activeRole = supabaseRoleSelect.value || state.supabase.activeRole;
  const locked = Boolean(PROJECT_SUPABASE?.lockConnection);
  if (!locked) {
    state.supabase.url = supabaseUrlInput.value.trim();
    state.supabase.publishableKey = supabasePublishableKeyInput.value.trim();
  } else {
    state.supabase.url = PROJECT_SUPABASE?.url || state.supabase.url;
    state.supabase.publishableKey =
      PROJECT_SUPABASE?.publishableKey || state.supabase.publishableKey;
  }
  applyRoleProfileToState();
  saveProgress();
  syncSupabaseControls();

  if (!state.supabase.url || !state.supabase.publishableKey || !state.supabase.profileCode) {
    supabaseReady = false;
    setSupabaseStatus("Hiányzó Supabase adatok.");
    return;
  }

  if (state.supabase.publishableKey.startsWith("sb_secret_")) {
    supabaseReady = false;
    setSupabaseStatus("Hiba: secret kulcs nem használható frontendben.");
    return;
  }

  const supaFactory = window.supabase?.createClient;
  if (typeof supaFactory !== "function") {
    supabaseReady = false;
    setSupabaseStatus("Supabase kliens nincs betöltve.");
    return;
  }

  if (!isAuto) setSupabaseStatus("Kapcsolódás...");
  supabaseClient = supaFactory(state.supabase.url, state.supabase.publishableKey);

  const profilePayload = {
    profile_code: state.supabase.profileCode,
    child_name: state.supabase.childName || state.supabase.profileCode,
  };

  const { data: profileRow, error: profileError } = await supabaseClient
    .from("profiles")
    .upsert(profilePayload, { onConflict: "profile_code" })
    .select("id")
    .single();

  if (profileError || !profileRow?.id) {
    throw new Error(profileError?.message || "Profil létrehozás hiba");
  }

  supabaseProfileId = profileRow.id;
  supabaseReady = true;
  await pullProgressFromSupabase();
  setSupabaseStatus(`Kapcsolódva. Profil: ${state.supabase.profileCode}`);
}

async function pullProgressFromSupabase() {
  if (!supabaseReady || !supabaseProfileId) return;
  const { data, error } = await supabaseClient
    .from("word_progress")
    .select("word_id,attempts,successes,streak,last_seen_at")
    .eq("profile_id", supabaseProfileId);

  if (error) {
    throw new Error(error.message || "Progress letöltési hiba");
  }

  const merged = { ...state.wordStats };
  for (const row of data || []) {
    if (!merged[row.word_id]) continue;
    merged[row.word_id] = {
      attempts: Number.isFinite(row.attempts) ? row.attempts : 0,
      successes: Number.isFinite(row.successes) ? row.successes : 0,
      streak: Number.isFinite(row.streak) ? row.streak : 0,
      lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : "",
    };
  }
  state.wordStats = merged;
  saveProgress();
}

async function syncProgressToSupabase() {
  if (!supabaseReady || !supabaseProfileId || !supabaseClient || syncInFlight) return;
  syncInFlight = true;
  try {
    const rows = words.map((word) => {
      const stats = state.wordStats[word.id] || baseWordStats();
      return {
        profile_id: supabaseProfileId,
        word_id: word.id,
        attempts: stats.attempts,
        successes: stats.successes,
        streak: stats.streak,
        last_seen_at: stats.lastSeenAt || null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabaseClient
      .from("word_progress")
      .upsert(rows, { onConflict: "profile_id,word_id" });

    if (error) {
      throw new Error(error.message || "Mentési hiba");
    }

    setSupabaseStatus(`Szinkron kész: ${new Date().toLocaleTimeString("hu-HU")}`);
  } finally {
    syncInFlight = false;
  }
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
  setEngineState("listening", "Figyelek...");
  listenStatus.textContent = "Hallgatlak... mondd ki a szót.";
  hideSuccessBadge();
  renderDebug({
    engine: "listening",
    stage: "listen-start",
    decision: "figyel",
    reason: "várja a beszédet",
    transcript: "",
    raw: "",
    score: null,
    energy: null,
  });
  playListeningStartSound();
  await sleep(180);
  await ensureMicMonitor();

  state.attempts += 1;
  saveProgress();
  refreshStats();

  let result = null;
  try {
    result = await detectSpeech(words[currentImitate]);
  } catch {
    result = {
      success: false,
      engine: "rejected",
      stage: "error",
      decision: "hiba",
      reason: "belső kivétel",
      transcript: "",
      raw: "",
      score: null,
      energy: null,
    };
  }
  renderDebug(result);

  if (result.success) {
    await onListeningSuccess();
  } else {
    registerWordFailure(words[currentImitate].id);
    saveProgress();
    refreshStats();
    setEngineState("rejected", "Észlelve, de nem elég jó.");
    listenStatus.textContent = "Nem hallottam jól. Próbáljuk újra!";
    await sleep(220);
    setEngineState("idle", "Készen áll.");
  }

  setListeningUi(false);
  listening = false;
  return result.success;
}

async function onListeningSuccess() {
  listenStatus.textContent = "Ügyes volt! Hallottam valamit.";
  setEngineState("success", "Talált! Szuper!");
  showSuccessBadge();
  playSuccessSound();
  state.rewards += 1;
  registerWordSuccess(words[currentImitate].id);
  saveProgress();
  refreshStats();
  await burstConfettiOverlay(CELEBRATION_MS);
  setEngineState("idle", "Készen áll.");
}

function showSuccessBadge() {
  successBadge.classList.remove("is-hidden");
}

function hideSuccessBadge() {
  successBadge.classList.add("is-hidden");
}

function showPhraseSuccessBadge() {
  phraseSuccessBadge.classList.remove("is-hidden");
}

function hidePhraseSuccessBadge() {
  phraseSuccessBadge.classList.add("is-hidden");
}

async function detectSpeech(targetWord) {
  const startedAt = performance.now();
  const targetNorm = normalizeText(targetWord.label);
  const mode = state.detection.mode;
  const threshold = getEffectiveThreshold(targetNorm, state.detection.strictThreshold);

  setEngineState("listening", "Hang detektálás...");
  renderDebug({
    engine: "listening",
    stage: "vad-pass-1",
    decision: "hang ellenőrzés",
    reason: "első figyelési ablak",
    transcript: "",
    raw: "",
    score: null,
    energy: null,
  });
  const energyPromise = detectVoiceEnergy({
    durationMs: MIN_LISTEN_BEFORE_REJECT_MS,
    threshold: 8,
    minHits: 6,
    minConsecutive: 6,
    minActiveMs: 650,
  });

  if (mode === "encouraging") {
    const energy1 = await energyPromise;
    if (!energy1.detected) {
      await waitRemainingDecisionTime(startedAt);
      return {
        success: false,
        engine: "rejected",
        stage: "vad",
        decision: "nincs beszéd",
        reason: energy1.maxRms >= 8 ? "hang volt, de túl rövid" : "csend vagy háttérzaj",
        transcript: "",
        raw: "",
        score: null,
        energy: energy1.maxRms,
      };
    }
    renderDebug({
      engine: "success",
      stage: "vad-pass-1",
      decision: "beszéd észlelve",
      reason: "encouraging mód",
      transcript: "",
      raw: "",
      score: null,
      energy: energy1.maxRms,
    });
    return {
      success: true,
      engine: "success",
      stage: "vad",
      decision: "beszéd észlelve",
      reason: "encouraging mód",
      transcript: "",
      raw: "",
      score: null,
      energy: energy1.maxRms,
    };
  }

  setEngineState("processing", "Beszédfelismerés...");
  renderDebug({
    engine: "processing",
    stage: "asr",
    decision: "feldolgozás",
    reason: "szófelismerés fut (átfedő minták)",
    transcript: "",
    raw: "",
    score: null,
    energy: null,
  });
  let earlyAsrMatch = null;
  const speech = await recognizeHungarianSpeech(ASR_TIMEOUT_MS, (partial) => {
    const partialScore = getBestMatchScore(
      targetNorm,
      [partial.transcript || "", ...(partial.alternatives || [])],
      targetWord.id,
    );
    const shouldEarlyAccept = partialScore >= threshold;
    renderDebug({
      engine: "processing",
      stage: "asr-stream",
      decision: "részeredmény",
      reason: shouldEarlyAccept
        ? `erős találat (${partialScore.toFixed(2)})`
        : "dekódolás folyamatban",
      transcript: partial.transcript || "",
      raw: partial.raw || "",
      score: partialScore,
      energy: null,
    });
    if (shouldEarlyAccept) {
      earlyAsrMatch = {
        success: true,
        engine: "success",
        stage: "asr-early",
        decision: `gyors találat (>=${threshold.toFixed(2)})`,
        reason: "teljes szó felismerve, azonnali elfogadás",
        transcript: partial.transcript || "",
        raw: partial.raw || "",
        score: partialScore,
        energy: null,
      };
      return true;
    }
    return false;
  });

  if (earlyAsrMatch) {
    return earlyAsrMatch;
  }

  const energy1 = await energyPromise;
  if (!energy1.detected) {
    await waitRemainingDecisionTime(startedAt);
    return {
      success: false,
      engine: "rejected",
      stage: "vad",
      decision: "nincs beszéd",
      reason: energy1.maxRms >= 8 ? "hang volt, de túl rövid" : "csend vagy háttérzaj",
      transcript: speech.transcript || "",
      raw: speech.alternatives.join(" | "),
      score: null,
      energy: energy1.maxRms,
    };
  }

  if (speech.error && !speech.transcript) {
    return {
      success: false,
      engine: "rejected",
      stage: "asr-error",
      decision: "ASR hiba",
      reason: `ASR nem működik: ${speech.error}`,
      transcript: "",
      raw: speech.alternatives.join(" | "),
      score: null,
      energy: energy1.maxRms,
    };
  }
  const bestScore = getBestMatchScore(targetNorm, speech.alternatives, targetWord.id);

  if (speech.transcript && bestScore >= threshold) {
    return {
      success: true,
      engine: "success",
      stage: "asr-match",
      decision: `jó közelítés (>=${threshold.toFixed(2)})`,
      reason: "fuzzy találat",
      transcript: speech.transcript,
      raw: speech.alternatives.join(" | "),
      score: bestScore,
      energy: energy1.maxRms,
    };
  }

  const energy2 = await detectVoiceEnergy({
    durationMs: 1200,
    threshold: 8,
    minHits: 4,
    minConsecutive: 4,
    minActiveMs: 420,
  });

  await waitRemainingDecisionTime(startedAt);

  return {
    success: false,
    engine: "rejected",
    stage: "asr-reject",
    decision: speech.transcript ? "nem elég közeli szó" : "nincs értelmezhető szó",
    reason: speech.transcript
      ? `match ${bestScore.toFixed(2)} < ${threshold.toFixed(2)} (${speech.transcript})`
      : `ASR nem adott használható szót${speech.error ? ` (${speech.error})` : ""}`,
    transcript: speech.transcript,
    raw: speech.alternatives.join(" | "),
    score: Number.isFinite(bestScore) ? bestScore : null,
    energy: Math.max(energy1.maxRms, energy2.maxRms),
  };
}

async function recognizeHungarianSpeech(timeoutMs = 4500, onPartial) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return {
      transcript: "",
      alternatives: [],
      confidence: 0,
      error: "nincs SpeechRecognition API ebben a böngészőben",
    };
  }

  const langs = ["hu-HU", "hu", "en-US"];
  let last = {
    transcript: "",
    alternatives: [],
    confidence: 0,
    error: "nincs eredmény",
  };

  for (const lang of langs) {
    const result = await recognizeSpeechOnce(SpeechRecognition, lang, timeoutMs, onPartial);
    if (result.transcript || result.alternatives.length > 0) {
      return result;
    }
    last = result;
  }
  return last;
}

function recognizeSpeechOnce(SpeechRecognition, lang, timeoutMs, onPartial) {
  return new Promise((resolve) => {
    const recognition = new SpeechRecognition();
    let settled = false;
    let lastError = "";
    let earlySettleTimer = null;

    recognition.lang = lang;
    recognition.maxAlternatives = 5;
    recognition.interimResults = true;
    recognition.continuous = true;
    let allAlternatives = [];
    let latestTranscript = "";
    let bestConfidence = 0;

    const finalize = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(earlySettleTimer);
      const alternatives = dedupeStrings(allAlternatives);
      resolve({
        transcript: latestTranscript || alternatives[0] || "",
        alternatives,
        confidence: bestConfidence,
        error: lastError,
        lang,
      });
    };

    const timer = setTimeout(() => {
      try {
        recognition.stop();
      } catch {}
      finalize();
    }, timeoutMs);

    recognition.onresult = (event) => {
      let hasFinal = false;
      let hasNewSpeech = false;
      for (let r = 0; r < event.results.length; r += 1) {
        const result = event.results[r];
        if (!result) continue;
        if (result.isFinal) hasFinal = true;
        for (let i = 0; i < result.length; i += 1) {
          const alt = result[i];
          if (alt?.transcript) {
            const text = alt.transcript.trim();
            if (text.length > 0) hasNewSpeech = true;
            allAlternatives.push(text);
            latestTranscript = text;
            if (typeof alt.confidence === "number") {
              bestConfidence = Math.max(bestConfidence, alt.confidence);
            }
          }
        }
      }
      const deduped = dedupeStrings(allAlternatives);
      if (typeof onPartial === "function") {
        const shouldStop = onPartial({
          transcript: latestTranscript || deduped[0] || "",
          alternatives: deduped,
          raw: `[${lang}] ${deduped.join(" | ")}`,
        });
        if (shouldStop) {
          try {
            recognition.stop();
          } catch {}
          finalize();
          return;
        }
      }

      if (hasFinal && (latestTranscript || deduped.length > 0)) {
        try {
          recognition.stop();
        } catch {}
        finalize();
        return;
      }

      if (hasNewSpeech) {
        clearTimeout(earlySettleTimer);
        earlySettleTimer = setTimeout(() => {
          try {
            recognition.stop();
          } catch {}
          finalize();
        }, ASR_EARLY_SETTLE_MS);
      }
    };

    recognition.onerror = (event) => {
      lastError = event?.error ? `${event.error} @${lang}` : `ismeretlen hiba @${lang}`;
      try {
        recognition.stop();
      } catch {}
      finalize();
    };

    recognition.onend = () => {
      finalize();
    };

    try {
      recognition.start();
    } catch (err) {
      lastError = err instanceof Error ? `${err.message} @${lang}` : `start hiba @${lang}`;
      finalize();
    }
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
  if (!monitor) return { detected: false, maxRms: 0 };

  let hits = 0;
  let consecutive = 0;
  let activeMs = 0;
  let maxRms = 0;
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
    maxRms = Math.max(maxRms, rms);
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
      return { detected: true, maxRms };
    }

    await sleep(stepMs);
  }

  return {
    detected: hits >= minHits || consecutive >= minConsecutive || activeMs >= minActiveMs,
    maxRms,
  };
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function getBestMatchScore(target, alternatives, wordId) {
  const aliasList = TODDLER_ALIASES[wordId] || [];
  const normalizedAliases = aliasList.map((alias) => normalizeText(alias));
  const candidates = [];

  for (const alt of alternatives || []) {
    const normalized = normalizeText(stripHungarianSuffixes(alt));
    if (!normalized) continue;
    candidates.push(normalized);
    const tokens = normalized.split(/\s+/).filter(Boolean);
    candidates.push(...tokens);
    for (let i = 0; i < tokens.length; i += 1) {
      candidates.push(tokens.slice(i, i + 2).join(" ").trim());
      candidates.push(tokens.slice(i, i + 3).join(" ").trim());
    }
  }

  let best = 0;
  for (const candidate of candidates) {
    best = Math.max(best, similarityScore(target, candidate));
    for (const alias of normalizedAliases) {
      best = Math.max(best, similarityScore(alias, candidate));
    }
  }
  return best;
}

function getEffectiveThreshold(target, baseThreshold) {
  if (target.length <= 3) return Math.max(baseThreshold, 0.7);
  if (target.length <= 5) return Math.max(baseThreshold, 0.72);
  return baseThreshold;
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    const shortLen = Math.min(a.length, b.length);
    const longLen = Math.max(a.length, b.length);
    return shortLen / longLen;
  }
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length, 1);
}

function stripHungarianSuffixes(text) {
  const normalized = normalizeText(text);
  return normalized.replace(
    /(ban|ben|nak|nek|val|vel|rol|rol|tol|tol|ra|re|ba|be|at|et|ot|ut|t)$/g,
    "",
  );
}

function dedupeStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[rows - 1][cols - 1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitRemainingDecisionTime(startedAt) {
  const elapsed = performance.now() - startedAt;
  const remaining = MIN_LISTEN_BEFORE_REJECT_MS - elapsed;
  if (remaining > 0) {
    await sleep(remaining);
  }
}

function setEngineState(kind, text) {
  imitateWrap.classList.remove("is-listening", "is-processing", "is-success", "is-rejected");
  if (kind !== "idle") {
    imitateWrap.classList.add(`is-${kind}`);
  }
  debugEngine.textContent = kind;
  if (text && kind !== "idle") {
    listenStatus.textContent = text;
  }
}

function setListeningUi(active) {
  listenBtn.disabled = active;
  listenBtn.textContent = active ? "🎙️" : "🎤";
  listenBtn.setAttribute("aria-label", active ? "Figyelek..." : "Figyelek");
  listenBtn.setAttribute("title", active ? "Figyelek..." : "Figyelek");
  listeningIndicator.classList.toggle("is-hidden", !active);
}

function setPhraseListeningUi(active) {
  listenPhraseBtn.disabled = active;
  listenPhraseBtn.textContent = active ? "🎙️" : "🎤";
  listenPhraseBtn.setAttribute("aria-label", active ? "Figyelek..." : "Figyelek");
  listenPhraseBtn.setAttribute("title", active ? "Figyelek..." : "Figyelek");
  phraseListeningIndicator.classList.toggle("is-hidden", !active);
}

function setPhraseState(kind, text) {
  phraseWrap.classList.remove("is-listening", "is-processing", "is-success", "is-rejected");
  if (kind !== "idle") {
    phraseWrap.classList.add(`is-${kind}`);
  }
  if (text && kind !== "idle") {
    phraseStatus.textContent = text;
  }
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
  const sessionWords = buildAdaptiveSessionWords();

  for (let i = 0; i < sessionWords.length && token === autoSessionToken; i += 1) {
    const currentWord = sessionWords[i];
    currentImitate = words.findIndex((w) => w.id === currentWord.id);
    if (currentImitate < 0) currentImitate = 0;
    renderImitate();
    playTransitionCue();
    await sleep(200);
    await playWord(currentWord);

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
