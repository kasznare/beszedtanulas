import { PROJECT_SUPABASE } from "./supabase-config.js";

import { words, wordCategories, twoWordPhrases, TODDLER_ALIASES } from "./game-data.js";
import { VOICE_CLIPS } from "./voice-library.js";
import { normalizeText, similarityScore, matchTwoWordPhrase } from "./speech-matching.js";
import { setupOffline } from "./offline-client.js";
import { snapshotProgress, normalizeUndo, replaceProgress } from "./progress-data.js";
import { setupProgressTools } from "./progress-tools.js";
import { setupListeningGame } from "./listening-game.js";
import { recognizeHungarianSpeech, SPEECH_TIMING, speechErrorMessage } from "./speech-recognition.js";
import { checkpointProfiles, normalizeProfileStore, switchProgressProfile, mergeWordProgress, isSharedProfileCode } from "./progress-profiles.js";
import { createCloudSaveQueue } from "./cloud-save-queue.js";

let selectedCategory = "all";

const STORAGE_KEY = "speech_game_progress_v1";
const WORD_LISTEN_WINDOW_MS = 18_000;
const CELEBRATION_MS = 1300;
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
  activeRole: PROJECT_SUPABASE?.activeRole === "admin" ? "admin" : "kid",
  syncPaused: false,
};
const SETTINGS_DEFAULTS = { roundLength: 5, spokenGuidance: true, wordVoice: "natural", numberLimit: 3, practiceTopic: "all", listeningChoices: 2 };
const state = loadProgress();
let currentScreen = "home";
let flipRoundToken = 0;
let flipRoundComplete = false;
let completedRoundKind = "imitate";
const screenInfo = {
  home: { title: "Játsszunk együtt!", guide: "welcome" },
  "picture-menu": { title: "Játsszunk a képekkel!", guide: "picture_menu" },
  topics: { title: "Mit nézzünk meg?", guide: "topics" },
  cards: { title: "Beszélő képek", guide: "cards" },
  "listening-game": { title: "Hol van?", guide: "listening_game" },
  "practice-menu": { title: "Mondd utánam", guide: "practice" },
  imitate: { title: "Mondd utánam", guide: "imitate" },
  "two-word": { title: "Két szó", guide: "phrase" },
  "number-menu": { title: "Számoljunk!", guide: "number_menu" },
  numbers: { title: "Számoljunk!", guide: "count" },
  flip: { title: "Mi bújt el?", guide: "flip" },
  parent: { title: "Szülői beállítások" },
};
const voiceByText = new Map(Object.values(VOICE_CLIPS).map(clip => [normalizeVoiceText(clip.text), clip]));
let currentImitate = 0;
let autoSessionToken = 0;
let autoSessionRunning = false;
let activeAttempt = null;
let playbackToken = 0;
let cancelPlayback = null;
let celebrationToken = 0;
let micMonitor = null;
let micRequest = null;
let micGeneration = 0;
let micError = "A mikrofon nem érhető el. Engedélyezd a böngészőben, majd próbáld újra!";
let sfxContext = null;
let supabaseClient = null;
let supabaseProfileId = null;
let supabaseReady = false;
let cloudQueue = null;
let cloudAbort = null;
let lastQueuedWords = "";
let cloudGeneration = 0;
let cloudResumePending = false;
let progressTools;
let listeningGame;
let externalProgressChanged = false;
const wordAudioBufferCache = new Map();
let currentPhrase = 0;
const numberNames = ["nulla", "egy", "kettő", "három", "négy", "öt", "hat", "hét", "nyolc", "kilenc", "tíz"];
const countingObjects = words.filter((word) => ["alma", "labda", "auto"].includes(word.id));
let currentNumber = 3;
let countingObject = countingObjects.find((word) => word.id === "alma");
let countedObjects = new Set();
let numberLimit = state.settings.numberLimit;
let numberMode = "count";
let quizTarget = 0;
let quizSolved = false;

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
  stopAutoImitateSession();
  primeSfx();
  currentImitate = (currentImitate + 1) % words.length;
  renderImitate();
});

listenBtn.addEventListener("click", () => {
  primeSfx();
  startListeningAttempt();
});

playPhraseBtn.addEventListener("click", () => {
  primeSfx();
  playPhrase(twoWordPhrases[currentPhrase]);
});

nextPhraseBtn.addEventListener("click", () => {
  stopAutoImitateSession();
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
  changeActiveProfile(supabaseRoleSelect.value);
});
document.querySelector("#start-active-game").addEventListener("click", () => showScreen("home"));
document.querySelectorAll("[data-return-child]").forEach(button => button.addEventListener("click", () => {
  if (changeActiveProfile("kid")) showScreen("home");
}));

function changeActiveProfile(role) {
  try {
    checkProgressRevision(localStorage.getItem(STORAGE_KEY));
    const next = switchProgressProfile(state, roleProfileConfig({ ...state.supabase, activeRole: role }));
    next.supabase.syncPaused = true;
    next.profileStore = checkpointProfiles(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    disconnectCloud();
    Object.assign(state, next);
    refreshStats();
    progressTools.refresh();
    syncSupabaseControls();
    setProfileStatus("");
    setSupabaseStatus("A profil helyi eredményei betöltve. A felhőkapcsolat külön indítható.");
    return true;
  } catch {
    syncSupabaseControls();
    const message = "Nem sikerült profilt váltani. Az előző profil aktív. A szülői oldalon mentsd fájlba az eredményeket, majd frissítsd az oldalt.";
    setProfileStatus(message);
    setSupabaseStatus(message);
    return false;
  }
}

function setProfileStatus(message) {
  for (const id of ["profile-status", "preview-profile-status"]) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.hidden = !message;
  }
}

function syncProfileControls() {
  const preview = state.supabase.activeRole === "admin";
  document.body.dataset.profile = preview ? "admin" : "kid";
  document.querySelector("#parent-preview").hidden = !preview;
  document.querySelector("#parent-return-child").hidden = !preview;
  document.querySelector("#start-active-game").textContent = preview ? "Próba indítása" : "Gyerekjáték indítása";
  document.querySelector("#profile-explainer").textContent = preview
    ? "Kipróbálhatod a játékokat: a próba eredményei külön maradnak. Ha végeztél, a Vissza a gyerekhez gombbal add át a játékot."
    : "A játék a gyerek eredményeit gyűjti. Saját kipróbáláshoz válaszd a Szülői próba profilt.";
  document.querySelector("#screen-kicker").textContent = currentScreen === "parent" ? "FELNŐTTEKNEK" : preview ? "SZÜLŐI PRÓBA" : "BESZÉDTANULÁS";
}

supabaseConnectBtn.addEventListener("click", () => {
  if (state.supabase.syncPaused) {
    progressTools.confirmCloudResume();
    return;
  }
  const connection = cloudGeneration + 1;
  connectSupabase().catch((err) => {
    if (connection === cloudGeneration) setSupabaseStatus(`Kapcsolódási hiba: ${String(err.message || err)}`);
  });
});

supabaseSyncNowBtn.addEventListener("click", () => {
  const connection = cloudGeneration;
  syncProgressToSupabase().catch((err) => {
    if (connection === cloudGeneration) setSupabaseStatus(`Szinkron hiba: ${String(err.message || err)}`);
  });
});

setupNavigation();
setupParentSettings();
listeningGame = setupListeningGame({
  getOptions: () => ({ words: getPracticeWords(), length: state.settings.roundLength, choiceCount: state.settings.listeningChoices }),
  playPrompt: playListeningPrompt,
  playCorrect: () => { stopPlayback(); playSuccessSound(); speakGuide("good"); },
  stopPlayback,
  onComplete: count => {
    state.rewards += 1;
    saveProgress();
    refreshStats();
    celebrateRound("listening-game", count);
  },
});
progressTools = setupProgressTools({
  getState: () => state,
  getRevision: () => localStorage.getItem(STORAGE_KEY),
  applyProgress: applyLocalProgress,
  resumeCloud: async revision => {
    checkProgressRevision(revision);
    const connection = cloudGeneration + 1;
    cloudResumePending = true;
    try { await connectSupabase(false, true); }
    finally { if (connection === cloudGeneration) cloudResumePending = false; }
  },
  cancelCloud: () => {
    if (!cloudResumePending) return;
    disconnectCloud();
    syncSupabaseControls();
    setSupabaseStatus("A felhőszinkron szünetel. A helyi eredmények megmaradtak.");
  },
  isParentScreen: () => currentScreen === "parent",
});
window.addEventListener("storage", event => {
  if (event.storageArea === localStorage && (event.key === STORAGE_KEY || event.key === null)) {
    externalProgressChanged = true;
    disconnectCloud();
    setSupabaseStatus("Másik játékablak módosította a mentést. Frissítsd ezt az oldalt a további mentéshez; az itteni eredményeket előbb fájlba mentheted.");
  }
});
setupOffline({ beforeReload: () => stopAutoImitateSession(false) });

document.querySelector("#auto-session").addEventListener("click", () => {
  primeSfx();
  if (autoSessionRunning) stopAutoImitateSession();
  else startAutoImitateSession();
});
document.querySelector("#stop-listening").addEventListener("click", stopAutoImitateSession);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAutoImitateSession();
});
window.addEventListener("pagehide", stopAutoImitateSession);

setupCategories();
renderRoundProgress();
renderCards();
setupNumbers();
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
if (window.supabase) trySupabaseAutoconnect();
else document.querySelector("#supabase-sdk").addEventListener("load", trySupabaseAutoconnect, { once: true });

function numberQuantityLabel(number = currentNumber) {
  return `${number === 2 ? "két" : numberNames[number]} ${countingObject.label}`;
}

function setupNumbers() {
  const picker = document.querySelector("#number-picker");
  for (let number = 1; number <= 10; number += 1) {
    const button = document.createElement("button");
    button.className = "number-choice";
    button.textContent = number;
    button.setAttribute("aria-label", `${number} – ${numberNames[number]}`);
    button.addEventListener("click", () => {
      currentNumber = number;
      renderNumbers();
      speakHungarian(numberNames[number]);
    });
    picker.appendChild(button);
  }
  countingObjects.forEach((object) => {
    const button = document.createElement("button");
    button.className = "number-object-choice";
    button.textContent = object.emoji;
    button.setAttribute("aria-label", object.label);
    button.addEventListener("click", () => {
      countingObject = object;
      renderNumbers();
      if (numberMode === "quiz") {
        renderNumberQuiz();
        speakNumberQuestion();
      } else {
        speakHungarian(numberQuantityLabel());
      }
    });
    document.querySelector("#number-object-picker").appendChild(button);
  });
  document.querySelector("#number-model").addEventListener("click", () => {
    speakVoiceSequence([`number_${currentNumber}`, `quantity_${countingObject.id}_${currentNumber}`]);
  });
  document.querySelector("#number-restart").addEventListener("click", renderNumbers);
  document.querySelector("#number-next").addEventListener("click", () => {
    currentNumber = currentNumber % numberLimit + 1;
    renderNumbers();
    speakHungarian(numberNames[currentNumber]);
  });
  document.querySelectorAll(".number-mode").forEach((button) => {
    button.addEventListener("click", () => {
      numberMode = button.dataset.mode;
      document.querySelectorAll(".number-mode").forEach((modeButton) => {
        modeButton.setAttribute("aria-pressed", String(modeButton === button));
      });
      document.querySelector("#number-count-view").hidden = numberMode !== "count";
      document.querySelector("#number-quiz-view").hidden = numberMode !== "quiz";
      showScreen("numbers", { announce: numberMode === "count" });
      if (numberMode === "quiz") {
        renderNumberQuiz();
        speakNumberQuestion();
      }
    });
  });
  document.querySelector("#number-level").addEventListener("change", (event) => {
    numberLimit = Number(event.target.value);
    state.settings.numberLimit = numberLimit;
    saveProgress();
    currentNumber = Math.min(currentNumber, numberLimit);
    renderNumbers();
    if (numberMode === "quiz") {
      renderNumberQuiz();
      if (currentScreen === "numbers") speakNumberQuestion();
    }
  });
  document.querySelector("#number-question-play").addEventListener("click", speakNumberQuestion);
  document.querySelector("#number-quiz-next").addEventListener("click", () => {
    if (!quizSolved) return;
    renderNumberQuiz();
    speakNumberQuestion();
  });
  renderNumbers();
}

function speakNumberQuestion() {
  speakHungarian(document.querySelector("#number-question").textContent);
}

function shuffleNumbers(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

function renderNumberQuiz() {
  quizSolved = false;
  const candidates = Array.from({ length: numberLimit }, (_, index) => index + 1);
  quizTarget = shuffleNumbers(candidates.filter((number) => number !== quizTarget))[0];
  const alternatives = shuffleNumbers(candidates.filter((number) => number !== quizTarget)).slice(0, 2);
  const choices = shuffleNumbers([quizTarget, ...alternatives]);
  document.querySelector("#number-question").textContent = `Hol van ${numberQuantityLabel(quizTarget)}?`;
  document.querySelector("#number-quiz-status").textContent = "";
  document.querySelector("#number-quiz-next").disabled = true;
  const answers = document.querySelector("#number-answers");
  answers.replaceChildren();
  choices.forEach((quantity) => {
    const button = document.createElement("button");
    button.className = "number-answer";
    button.setAttribute("aria-label", numberQuantityLabel(quantity));
    const group = document.createElement("span");
    group.className = "number-answer-objects";
    group.setAttribute("aria-hidden", "true");
    for (let index = 0; index < quantity; index += 1) {
      const object = document.createElement("span");
      object.textContent = countingObject.emoji;
      group.appendChild(object);
    }
    button.appendChild(group);
    button.addEventListener("click", () => {
      if (quizSolved) return;
      const status = document.querySelector("#number-quiz-status");
      if (quantity !== quizTarget) {
        status.textContent = "Még egyszer?";
        speakGuide("again");
        return;
      }
      quizSolved = true;
      button.classList.add("is-correct");
      status.textContent = "⭐";
      speakVoiceSequence(["guide_good", `quantity_${countingObject.id}_${quizTarget}`]);
      document.querySelector("#number-quiz-next").disabled = false;
    });
    answers.appendChild(button);
  });
}

function renderNumbers() {
  stopPlayback();
  countedObjects = new Set();
  document.querySelectorAll("#number-picker .number-choice").forEach((button, index) => {
    button.hidden = index + 1 > numberLimit;
    button.setAttribute("aria-pressed", String(index + 1 === currentNumber));
  });
  document.querySelectorAll("#number-object-picker .number-object-choice").forEach((button, index) => {
    button.setAttribute("aria-pressed", String(countingObjects[index] === countingObject));
  });
  document.querySelector("#number-symbol").textContent = currentNumber;
  document.querySelector("#number-name").textContent = numberQuantityLabel();
  document.querySelector("#number-model").setAttribute("aria-label", `${numberNames[currentNumber]}, ${numberQuantityLabel()} meghallgatása`);
  const status = document.querySelector("#number-status");
  status.textContent = "";
  const objects = document.querySelector("#number-objects");
  objects.replaceChildren();
  for (let index = 0; index < currentNumber; index += 1) {
    const button = document.createElement("button");
    button.className = "counting-object";
    button.setAttribute("aria-label", `${index + 1}. ${countingObject.label}`);
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<span aria-hidden="true">${countingObject.emoji}</span><span class="counting-order" aria-hidden="true"></span>`;
    button.addEventListener("click", () => {
      if (countedObjects.has(index)) return;
      countedObjects.add(index);
      const count = countedObjects.size;
      button.setAttribute("aria-pressed", "true");
      button.querySelector(".counting-order").textContent = count;
      button.setAttribute("aria-label", `${index + 1}. ${countingObject.label}, megszámolva: ${count}`);
      const complete = count === currentNumber;
      status.textContent = complete ? "⭐" : `${count} / ${currentNumber}`;
      speakVoiceSequence(complete ? [`number_${count}`, "guide_good"] : [`number_${count}`]);
    });
    objects.appendChild(button);
  }
}

function setupCategories() {
  const picker = document.querySelector("#category-picker");
  wordCategories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-choice";
    button.textContent = category.label;
    button.dataset.category = category.id;
    button.addEventListener("click", () => {
      stopPlayback();
      selectedCategory = category.id;
      renderCards();
    });
    picker.appendChild(button);
  });
}

function renderCards() {
  cardsGrid.innerHTML = "";
  const category = wordCategories.find((entry) => entry.id === selectedCategory);
  const visibleWords = words.filter((word) => category.words.includes(word.id));
  document.querySelectorAll(".category-choice").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === selectedCategory));
  });
  document.querySelector("#cards-count").textContent = `${visibleWords.length} szó`;
  visibleWords.forEach((word) => {
    const button = document.createElement("button");
    button.className = "card";
    button.innerHTML = `<div class="card-emoji">${word.emoji}</div><div class="card-word">${word.label}</div>`;
    button.setAttribute("aria-label", `${word.label} meghallgatása`);
    button.addEventListener("click", async () => {
      const playback = playWord(word);
      const token = playbackToken;
      cardsGrid.querySelectorAll(".card").forEach((card) => card.classList.remove("is-speaking"));
      button.classList.add("is-speaking");
      await playback;
      if (token === playbackToken) button.classList.remove("is-speaking");
    });
    cardsGrid.appendChild(button);
  });
}

function renderFlipGame() {
  flipRoundToken += 1;
  flipRoundComplete = false;
  flipGrid.replaceChildren();
  const deck = shuffleNumbers([...getPracticeWords()]).slice(0, 6);
  deck.forEach((word, index) => {
    const card = document.createElement("button");
    card.className = "flip-card";
    card.setAttribute("aria-label", `Meglepetés ${index + 1}`);
    card.setAttribute("aria-pressed", "false");
    card.innerHTML = `<span class="flip-card-face flip-card-back" aria-hidden="true">✦</span><span class="flip-card-face flip-card-front" aria-hidden="true"><span class="card-emoji">${word.emoji}</span><span class="card-word">${word.label}</span></span>`;
    card.addEventListener("click", async () => {
      if (flipRoundComplete) return;
      const token = flipRoundToken;
      card.classList.add("is-open");
      card.setAttribute("aria-label", `${word.label} meghallgatása`);
      card.setAttribute("aria-pressed", "true");
      const found = flipGrid.querySelectorAll(".is-open").length;
      flipStatus.textContent = `${found} / ${deck.length}`;
      const completed = found === deck.length;
      if (completed) flipRoundComplete = true;
      await playWord(word);
      if (completed && token === flipRoundToken && currentScreen === "flip") {
        state.rewards += 1;
        saveProgress();
        refreshStats();
        celebrateRound("flip", deck.length);
      }
    });
    flipGrid.appendChild(card);
  });
  flipStatus.textContent = `0 / ${deck.length}`;
}

function renderImitate() {
  const word = words[currentImitate];
  imitateEmoji.textContent = word.emoji;
  imitateWord.textContent = word.label;
  imitatePrompt.textContent = `Mondd: ${word.label}`;
  setListeningUi(false);
  setEngineState("idle", "Készen áll.");
  listenStatus.textContent = autoSessionRunning ? "Hallgassuk meg!" : "🔊 → 🎤";
  hideSuccessBadge();
  setSpeechRecovery("word", false);
}

function renderTwoWordMode() {
  const phrase = twoWordPhrases[currentPhrase];
  phraseEmoji.textContent = phrase.emojis.join(" ");
  phraseText.textContent = phrase.text;
  phrasePrompt.textContent = `Mondd: ${phrase.text}`;
  setPhraseListeningUi(false);
  setPhraseState("idle", "Készen áll.");
  phraseStatus.textContent = "🔊 → 🎤";
  hidePhraseSuccessBadge();
  setSpeechRecovery("phrase", false);
}

async function playPhrase(phrase) {
  registerPlay();
  await speakVoice(`phrase_${phrase.id}`);
}

async function startPhraseListeningAttempt() {
  const phrase = twoWordPhrases[currentPhrase];
  return runListeningTask("phrase", async (signal) => {
    setPhraseListeningUi(true, false);
    setPhraseState("preparing", "A beszédfelismerés előkészítése.");
    setSpeechRecovery("phrase", false);
    hidePhraseSuccessBadge();
    if (state.settings.spokenGuidance) await speakVoice("guide_listening");
    signal.throwIfAborted();
    const result = await detectTwoWordPhrase(phrase, signal, () => {
      state.attempts += 1;
      saveProgress();
      refreshStats();
      setPhraseListeningUi(true);
      setPhraseState("listening", "Most te jössz!");
      playListeningStartSound();
    });
    signal.throwIfAborted();
    if (result.success) {
      setPhraseState("success", "Ügyes! Megvolt a két szó.");
      showPhraseSuccessBadge();
      playSuccessSound();
      state.rewards += 1;
      saveProgress();
      refreshStats();
      await burstConfettiOverlay(900);
    } else {
      setPhraseState("rejected", result.reason || "Próbáljuk meg együtt még egyszer!");
      await sleep(260);
    }
    signal.throwIfAborted();
    setPhraseState("idle", "");
    return result.success;
  });
}

async function detectTwoWordPhrase(phrase, signal, onStart) {
  const speech = await recognizeHungarianSpeech({
    timeoutMs: SPEECH_TIMING.phrase, signal, onStart,
    isMatch: result => matchTwoWordPhrase(phrase.targets, result.alternatives, TWO_WORD_MATCH_THRESHOLD).success,
  });
  signal.throwIfAborted();
  if (speech.error && speech.error !== "no-speech") throw new Error(speechErrorMessage(speech.error));
  const { success, scores } = matchTwoWordPhrase(phrase.targets, speech.alternatives, TWO_WORD_MATCH_THRESHOLD);
  return { success, reason: success ? "Mindkét szó megvan." : `Még nincs meg mindkét szó (${scores.map(score => score.toFixed(2)).join(" / ")}).` };
}

function syncDetectionControls() {
  detectionModeSelect.value = state.detection.mode;
  strictThresholdInput.value = String(state.detection.strictThreshold);
  strictThresholdValue.textContent = state.detection.strictThreshold.toFixed(2);
  strictThresholdInput.disabled = state.detection.mode !== "strictish";
}

function syncSupabaseControls() {
  syncProfileControls();
  supabaseConnectBtn.textContent = state.supabase.syncPaused ? "Felhőszinkron folytatása" : "Kapcsolódás";
  supabaseSyncNowBtn.disabled = state.supabase.syncPaused || !supabaseReady;
  document.querySelector("#active-progress-label").textContent = `Eredmények: ${state.supabase.activeRole === "admin" ? "szülői próba" : "gyerek"}`;
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

function roleProfileConfig(config) {
  const role = config.activeRole || "kid";
  const profile = PROJECT_SUPABASE?.profiles?.[role];
  return { ...config, profileCode: profile?.profileCode || config.profileCode || role, childName: profile?.childName || config.childName || role };
}

function applyProjectSupabaseConfig() {
  const config = roleProfileConfig({ ...state.supabase,
    url: PROJECT_SUPABASE?.url || state.supabase.url,
    publishableKey: PROJECT_SUPABASE?.publishableKey || state.supabase.publishableKey,
  });
  Object.assign(state, switchProgressProfile(state, config));
  saveProgress({ sync: false });
  refreshStats();
  progressTools.refresh();
  syncSupabaseControls();
}

function disconnectCloud() {
  cloudGeneration += 1;
  cloudResumePending = false;
  cloudQueue?.stop();
  cloudQueue = null;
  cloudAbort?.abort();
  cloudAbort = null;
  supabaseReady = false;
  supabaseClient = null;
  supabaseProfileId = null;
  lastQueuedWords = "";
  syncSupabaseControls();
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

async function playWord(word, token = beginPlayback()) {
  registerPlay();
  if (state.settings.wordVoice === "natural") return speakVoice(`word_${word.id}`, token);
  const src = `./audio/${word.id}.mp3`;
  const ok = await tryPlayFile(src, token);
  if (!ok && token === playbackToken) {
    await speakHungarian(word.label, token);
  }
}

async function playListeningPrompt(word, { intro = false, retry = false, force = false } = {}) {
  const token = beginPlayback();
  if ((state.settings.spokenGuidance || force) && (intro || retry)) {
    await speakVoice(retry ? "guide_again" : "guide_listening_game", token);
  }
  if (token !== playbackToken || currentScreen !== "listening-game" || document.hidden) return;
  await playWord(word, token);
}

function stopPlayback() {
  playbackToken += 1;
  cancelPlayback?.();
  cancelPlayback = null;
  window.speechSynthesis?.cancel();
  cardsGrid.querySelectorAll(".is-speaking").forEach((card) => card.classList.remove("is-speaking"));
}

function beginPlayback() {
  stopPlayback();
  return playbackToken;
}

async function tryPlayFile(src, token) {
  const ok = await tryPlayFileWithBuffer(src, token).catch(() => false);
  if (token !== playbackToken) return true;
  return ok || tryPlayFileWithElement(src, token);
}

async function tryPlayFileWithBuffer(src, token) {
  const context = getSfxContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume().catch(() => {});
  if (token !== playbackToken) return true;
  if (context.state !== "running") return false;
  const buffer = await loadWordBuffer(src, context);
  if (token !== playbackToken) return true;
  if (!buffer) return false;
  return new Promise((resolve) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    let done = false;
    let timer;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      source.onended = null;
      try { source.stop(); source.disconnect(); } catch {}
      if (cancelPlayback === cancel) cancelPlayback = null;
      resolve(result);
    };
    const cancel = () => finish(true);
    cancelPlayback = cancel;
    source.onended = () => finish(true);
    try {
      source.start();
      timer = setTimeout(() => finish(true), Math.min(buffer.duration * 1000 + 700, 12000));
    } catch {
      finish(false);
    }
  });
}

function tryPlayFileWithElement(src, token) {
  if (token !== playbackToken) return Promise.resolve(true);
  return new Promise((resolve) => {
    const audio = new Audio(src);
    let done = false;
    let timer;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      if (cancelPlayback === cancel) cancelPlayback = null;
      resolve(result);
    };
    const cancel = () => finish(true);
    cancelPlayback = cancel;
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    timer = setTimeout(() => finish(false), 12000);
    audio.play().then(() => {
      if (done) return;
      clearTimeout(timer);
      timer = setTimeout(() => finish(true), Math.min((audio.duration || 2) * 1000 + 1200, 12000));
    }, () => finish(false));
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

function speakWithBrowser(text, token = beginPlayback()) {
  if (!("speechSynthesis" in window) || token !== playbackToken) return Promise.resolve();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    let finished = false;
    let timer;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (cancelPlayback === done) cancelPlayback = null;
      resolve();
    };
    cancelPlayback = done;
    utterance.lang = "hu-HU";
    const voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith("hu"));
    utterance.voice = voices.find(voice => /premium|enhanced|neural/i.test(voice.name)) || voices[0] || null;
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = done;
    utterance.onerror = done;
    timer = setTimeout(() => {
      if (token === playbackToken) window.speechSynthesis.cancel();
      done();
    }, 12000);
    window.speechSynthesis.speak(utterance);
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

function saveProgress({ sync = true } = {}) {
  if (externalProgressChanged) {
    setSupabaseStatus("Másik játékablak módosította a mentést. Frissítsd az oldalt; az itteni eredményeket előbb fájlba mentheted.");
    return;
  }
  state.profileStore = checkpointProfiles(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    setSupabaseStatus("A böngésző nem enged helyi mentést. Az eredmények most csak a megnyitott játékban maradnak meg.");
  }
  if (sync) scheduleSupabaseSync();
}

function checkProgressRevision(revision) {
  if (externalProgressChanged || localStorage.getItem(STORAGE_KEY) !== revision) {
    throw new Error("Az eredmények közben megváltoztak. Frissítsd az oldalt, és ellenőrizd újra őket a módosítás előtt.");
  }
}

function applyLocalProgress(progress, kind, revision) {
  checkProgressRevision(revision);
  const next = replaceProgress(state, progress, kind);
  next.profileStore = checkpointProfiles(next);
  // The result and its one-step undo snapshot are committed in a single write.
  // A storage failure must leave the in-memory result unchanged too.
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { throw new Error("Nem sikerült helyben menteni. Az eredmények változatlanok maradtak; előbb mentsd őket fájlba."); }
  disconnectCloud();
  stopAutoImitateSession(false);
  Object.assign(state, next);
  refreshStats();
  syncSupabaseControls();
  setSupabaseStatus("A felhőszinkron szünetel. A helyi eredmények módosultak, a felhőben tároltak megmaradtak.");
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
    settings: { ...SETTINGS_DEFAULTS },
    detection: { ...DETECTION_DEFAULTS },
    supabase: { ...SUPABASE_CONFIG_DEFAULTS },
    undoProgress: null,
    profileStore: null,
    wordStats,
  };
}

function normalizeState(input) {
  const base = baseProgress();
  if (!input || typeof input !== "object") return base;
  return {
    ...snapshotProgress(input),
    undoProgress: normalizeUndo(input.undoProgress),
    profileStore: normalizeProfileStore(input.profileStore),
    settings: {
      roundLength: [3, 5, 10].includes(input.settings?.roundLength) ? input.settings.roundLength : 5,
      spokenGuidance: input.settings?.spokenGuidance !== false,
      wordVoice: input.settings?.wordVoice === "family" ? "family" : "natural",
      numberLimit: [3, 5, 10].includes(input.settings?.numberLimit) ? input.settings.numberLimit : 3,
      listeningChoices: input.settings?.listeningChoices === 3 ? 3 : 2,
      practiceTopic: wordCategories.some(category => category.id === input.settings?.practiceTopic) ? input.settings.practiceTopic : "all",
    },
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
        ["kid", "admin"].includes(input.supabase?.activeRole) ? input.supabase.activeRole : SUPABASE_CONFIG_DEFAULTS.activeRole,
      syncPaused: input.supabase?.syncPaused === true,
    },
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

function getPracticeWords() {
  const category = wordCategories.find(entry => entry.id === state.settings.practiceTopic) || wordCategories[0];
  return words.filter(word => category.words.includes(word.id));
}

function buildAdaptiveSessionWords() {
  const ranked = shuffleNumbers([...getPracticeWords()])
    .map(word => ({ word, score: getWordDifficultyScore(word) }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.word);
  return Array.from({ length: state.settings.roundLength }, (_, index) => ranked[index % ranked.length]);
}

function scheduleSupabaseSync() {
  if (state.supabase.syncPaused || !supabaseReady || !cloudQueue) return;
  const current = JSON.stringify(state.wordStats);
  if (current === lastQueuedWords) return;
  lastQueuedWords = current;
  cloudQueue.request();
}

window.addEventListener("online", () => {
  if (supabaseReady && !state.supabase.syncPaused) cloudQueue?.request();
});

async function trySupabaseAutoconnect() {
  if (state.supabase.syncPaused) {
    setSupabaseStatus("A felhőszinkron szünetel. A helyi eredmények megőrzéséhez csak külön kérésre kapcsolódunk újra.");
    return;
  }
  if (isSharedProfileCode(state.supabase.profileCode)) {
    setSupabaseStatus("A felhős kapcsolat még nincs személyes profilhoz beállítva. Az eredmények helyben menthetők.");
    return;
  }
  if (!state.supabase.url || !state.supabase.publishableKey || !state.supabase.profileCode) {
    setSupabaseStatus("Nincs csatlakoztatva.");
    return;
  }
  const generation = cloudGeneration;
  try { await connectSupabase(true); }
  catch {
    if (cloudGeneration === generation + 1) setSupabaseStatus("A felhőkapcsolat nem érhető el. A helyi eredmények megmaradtak.");
  }
}

async function cloudRequest(query, signal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  let timeout;
  const expired = new Promise((_, reject) => {
    timeout = setTimeout(() => { controller.abort(); reject(new Error("A felhő nem válaszolt időben. Próbáld újra; a helyi eredmények megmaradtak.")); }, 12000);
  });
  try { return await Promise.race([typeof query.abortSignal === "function" ? query.abortSignal(controller.signal) : query, expired]); }
  finally { clearTimeout(timeout); signal?.removeEventListener("abort", cancel); }
}

async function connectSupabase(isAuto = false, resumePaused = false) {
  if (state.supabase.syncPaused && !resumePaused) return;
  const resuming = cloudResumePending;
  disconnectCloud();
  cloudResumePending = resuming;
  const connection = cloudGeneration;
  const config = roleProfileConfig({ ...state.supabase,
    url: PROJECT_SUPABASE?.lockConnection ? PROJECT_SUPABASE.url : supabaseUrlInput.value.trim(),
    publishableKey: PROJECT_SUPABASE?.lockConnection ? PROJECT_SUPABASE.publishableKey : supabasePublishableKeyInput.value.trim(),
  });
  if (!config.url || !config.publishableKey || !config.profileCode) throw new Error("Hiányzó felhős kapcsolati adatok.");
  if (isSharedProfileCode(config.profileCode)) throw new Error("A közös mintaprofilhoz nem kapcsolódunk. Személyes felhős profil beállítása szükséges; addig mentsd fájlba a helyi eredményeket.");
  const otherRole = config.activeRole === "admin" ? "kid" : "admin";
  if (PROJECT_SUPABASE?.profiles?.[otherRole]?.profileCode === config.profileCode) throw new Error("A gyerek és a szülői próba külön felhős profilkódot igényel.");
  if (config.publishableKey.startsWith("sb_secret_")) throw new Error("Titkos szerverkulcs nem használható a böngészőben.");
  const supaFactory = window.supabase?.createClient;
  if (typeof supaFactory !== "function") throw new Error("A felhős kapcsolat még nem érhető el. Ellenőrizd az internetkapcsolatot, majd próbáld újra.");
  checkProgressRevision(localStorage.getItem(STORAGE_KEY));
  const next = switchProgressProfile(state, config);
  // Connection/profile changes are committed locally before any network work.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  Object.assign(state, next);
  refreshStats(); progressTools.refresh(); syncSupabaseControls();
  if (!isAuto) setSupabaseStatus("Kapcsolódás…");
  cloudAbort = new AbortController();
  const signal = cloudAbort.signal;
  const client = supaFactory(config.url, config.publishableKey);
  supabaseClient = client;
  const profilePayload = { profile_code: config.profileCode, child_name: config.childName || config.profileCode };
  const { data: profileRow, error: profileError } = await cloudRequest(client.from("profiles").upsert(profilePayload, { onConflict: "profile_code" }).select("id").single(), signal);
  if (connection !== cloudGeneration) return;
  if (profileError || !profileRow?.id) throw new Error(profileError?.message || "Profil létrehozási hiba");
  supabaseProfileId = profileRow.id;
  if (!await pullProgressFromSupabase(client, profileRow.id, connection, signal)) return;
  if (resumePaused) state.supabase.syncPaused = false;
  supabaseReady = true;
  saveProgress({ sync: false });
  syncSupabaseControls();
  setSupabaseStatus(`Kapcsolódva. Profil: ${config.profileCode}`);
  cloudQueue = createCloudSaveQueue({
    run: () => pushMergedProgress(client, profileRow.id, connection, signal),
    onError: error => {
      if (connection !== cloudGeneration) return;
      lastQueuedWords = "";
      setSupabaseStatus(`A felhős mentés várakozik: ${error.message || error}`);
    },
  });
  scheduleSupabaseSync();
}

async function pullProgressFromSupabase(client, profileId, connection, signal) {
  const { data, error } = await cloudRequest(client.from("word_progress").select("word_id,attempts,successes,streak,last_seen_at").eq("profile_id", profileId), signal);
  if (connection !== cloudGeneration || signal.aborted) return false;
  if (error) throw new Error(error.message || "Eredmények letöltési hibája");
  if (externalProgressChanged) throw new Error("Másik játékablak módosította az eredményeket. Frissítsd az oldalt a szinkron előtt.");
  state.wordStats = mergeWordProgress(state.wordStats, data);
  saveProgress({ sync: false });
  return true;
}

async function pushMergedProgress(client, profileId, connection, signal) {
  if (connection !== cloudGeneration || state.supabase.syncPaused) return;
  if (!await pullProgressFromSupabase(client, profileId, connection, signal)) return;
  const rows = words.map(word => ({
    profile_id: profileId, word_id: word.id, attempts: state.wordStats[word.id].attempts,
    successes: state.wordStats[word.id].successes, streak: state.wordStats[word.id].streak,
    last_seen_at: state.wordStats[word.id].lastSeenAt || null, updated_at: new Date().toISOString(),
  }));
  const { error } = await cloudRequest(client.from("word_progress").upsert(rows, { onConflict: "profile_id,word_id" }), signal);
  if (connection !== cloudGeneration || signal.aborted || state.supabase.syncPaused) return;
  if (error) throw new Error(error.message || "Mentési hiba");
  setSupabaseStatus(`Szinkron kész: ${new Date().toLocaleTimeString("hu-HU")}`);
}

async function syncProgressToSupabase() {
  if (state.supabase.syncPaused || !supabaseReady || !cloudQueue) return;
  return cloudQueue.flush();
}

function burstConfettiOverlay(durationMs) {
  if (!confettiLayer) return Promise.resolve();
  const token = ++celebrationToken;
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
      if (token === celebrationToken) {
        confettiLayer.classList.remove("is-active");
        confettiLayer.innerHTML = "";
      }
      resolve();
    }, durationMs);
  });
}

async function startListeningAttempt() {
  const word = words[currentImitate];
  return runListeningTask("word", async (signal) => {
    setListeningUi(true, false);
    setEngineState("preparing", "A hang előkészítése.");
    setSpeechRecovery("word", false);
    hideSuccessBadge();
    if (state.settings.spokenGuidance) await speakVoice("guide_listening");
    signal.throwIfAborted();
    const result = await detectSpeech(word, signal, () => {
      state.attempts += 1;
      registerWordAttempt(word.id);
      saveProgress();
      refreshStats();
      setListeningUi(true);
      setEngineState("listening", "Most te jössz!");
      playListeningStartSound();
    });
    signal.throwIfAborted();
    renderDebug(result);
    if (result.success) {
      setEngineState("success", "Ügyes vagy! Hallottalak.");
      showSuccessBadge();
      playSuccessSound();
      state.rewards += 1;
      registerWordSuccess(word.id);
    } else {
      registerWordFailure(word.id);
      setEngineState("rejected", "Nem hallottam jól. Próbáljuk újra!");
    }
    saveProgress();
    refreshStats();
    if (result.success) await burstConfettiOverlay(CELEBRATION_MS);
    else await sleep(220);
    signal.throwIfAborted();
    setEngineState("idle", "");
    return result.success;
  });
}

async function runListeningTask(kind, task) {
  if (listening || flipBusy) return false;
  stopPlayback();
  const controller = new AbortController();
  activeAttempt = controller;
  listening = true;
  flipBusy = kind === "flip";
  document.querySelector("#stop-listening").hidden = kind !== "word" || autoSessionRunning;
  try {
    return await task(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) return false;
    const status = kind === "phrase" ? phraseStatus : kind === "flip" ? flipStatus : listenStatus;
    document.querySelector("#device-status").textContent = error.message || "A mikrofon nem érhető el.";
    if (autoSessionRunning) stopAutoImitateSession(false);
    status.textContent = "Kérj segítséget egy felnőttől. 🔒";
    setSpeechRecovery(kind, true);
    speakGuide("mic_help");
    return false;
  } finally {
    if (activeAttempt === controller) {
      // Release any remaining operation before another attempt can start.
      controller.abort();
      activeAttempt = null;
      listening = false;
      flipBusy = false;
      setListeningUi(false);
      setPhraseListeningUi(false);
      setEngineState("idle", "");
      setPhraseState("idle", "");
      document.querySelector("#stop-listening").hidden = true;
      flipGrid.querySelectorAll(".is-open").forEach((card) => card.classList.remove("is-open", "is-success", "is-fail"));
      teardownMicMonitor();
    }
  }
}

async function requireMicrophone(signal) {
  const monitor = await ensureMicMonitor();
  signal.throwIfAborted();
  if (!monitor) throw new Error(micError);
}

function setSpeechRecovery(kind, visible) {
  document.querySelector(kind === "phrase" ? "#phrase-recovery" : "#word-recovery").hidden = !visible;
  if (kind !== "phrase") document.querySelector(".session-controls").hidden = visible;
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

async function detectSpeech(targetWord, signal, onStart) {
  const targetNorm = normalizeText(targetWord.label);
  const mode = state.detection.mode;
  const threshold = getEffectiveThreshold(targetNorm, state.detection.strictThreshold);
  if (mode === "encouraging") {
    await requireMicrophone(signal);
    onStart();
    // Let the short readiness tones finish before the energy sampler starts.
    await sleep(220);
    signal.throwIfAborted();
    const energy = await detectVoiceEnergy({
      durationMs: SPEECH_TIMING.word, threshold: 8,
      minHits: 6, minConsecutive: 6, minActiveMs: 650, signal,
    });
    signal.throwIfAborted();
    return {
      success: energy.detected, engine: energy.detected ? "success" : "rejected", stage: "vad",
      decision: energy.detected ? "beszéd észlelve" : "nincs beszéd",
      reason: energy.detected ? "encouraging mód" : energy.maxRms >= 8 ? "hang volt, de túl rövid" : "csend vagy háttérzaj",
      transcript: "", raw: "", score: null, energy: energy.maxRms,
    };
  }

  const scoreFor = result => getBestMatchScore(targetNorm, result.alternatives, targetWord.id);
  const speech = await recognizeHungarianSpeech({
    timeoutMs: SPEECH_TIMING.word, signal, onStart,
    isMatch: result => scoreFor(result) >= threshold,
    onPartial: partial => renderDebug({
      engine: "listening", stage: "asr-stream", decision: partial.isFinal ? "végleges részlet" : "részeredmény",
      reason: "a teljes, aktuális felismerési javaslatot figyeljük", transcript: partial.transcript,
      raw: partial.raw, score: scoreFor(partial), energy: null,
    }),
  });
  signal.throwIfAborted();
  if (speech.error && speech.error !== "no-speech") throw new Error(speechErrorMessage(speech.error));
  const score = scoreFor(speech);
  const success = Boolean(speech.transcript) && score >= threshold;
  return {
    success, engine: success ? "success" : "rejected", stage: "asr",
    decision: success ? `jó közelítés (>=${threshold.toFixed(2)})` : "még nincs meg a szó",
    reason: success ? "aktuális felismerési javaslat" : `match ${score.toFixed(2)} < ${threshold.toFixed(2)}`,
    transcript: speech.transcript, raw: speech.alternatives.join(" | "), score, energy: null,
  };
}

async function detectVoiceEnergy({
  durationMs = 2000,
  threshold = 9,
  minHits = 4,
  minConsecutive = 4,
  minActiveMs = 220,
  signal,
} = {}) {
  if (signal?.aborted) return { detected: false, maxRms: 0 };
  const monitor = await ensureMicMonitor();
  if (!monitor || signal?.aborted) return { detected: false, maxRms: 0 };

  let hits = 0;
  let consecutive = 0;
  let activeMs = 0;
  let maxRms = 0;
  const stepMs = 30;
  const start = performance.now();

  while (performance.now() - start < durationMs) {
    if (signal?.aborted) return { detected: false, maxRms };
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

function stripHungarianSuffixes(text) {
  const normalized = normalizeText(text);
  return normalized.replace(
    /(ban|ben|nak|nek|val|vel|rol|rol|tol|tol|ra|re|ba|be|at|et|ot|ut|t)$/g,
    "",
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setEngineState(kind, text) {
  imitateWrap.classList.remove("is-preparing", "is-listening", "is-processing", "is-success", "is-rejected");
  if (kind !== "idle") {
    imitateWrap.classList.add(`is-${kind}`);
  }
  debugEngine.textContent = kind;
  if (text && kind !== "idle") {
    listenStatus.textContent = childStatus(kind);
  }
}

function setListeningUi(active, ready = active) {
  listenBtn.disabled = active || autoSessionRunning;
  document.querySelector("#play-model").disabled = active || autoSessionRunning;
  document.querySelector("#next-word").disabled = active || autoSessionRunning;
  setButtonIcon(listenBtn, "mic");
  const label = active ? ready ? "Hallgatlak" : "Hang előkészítése" : "Most én mondom";
  listenBtn.setAttribute("aria-label", label);
  listenBtn.setAttribute("title", label);
  listeningIndicator.classList.toggle("is-hidden", !ready);
}

function setPhraseListeningUi(active, ready = active) {
  listenPhraseBtn.disabled = active;
  playPhraseBtn.disabled = active;
  nextPhraseBtn.disabled = active;
  setButtonIcon(listenPhraseBtn, "mic");
  const label = active ? ready ? "Hallgatlak" : "Hang előkészítése" : "Most én mondom";
  listenPhraseBtn.setAttribute("aria-label", label);
  listenPhraseBtn.setAttribute("title", label);
  phraseListeningIndicator.classList.toggle("is-hidden", !ready);
}

function setPhraseState(kind, text) {
  phraseWrap.classList.remove("is-preparing", "is-listening", "is-processing", "is-success", "is-rejected");
  if (kind !== "idle") {
    phraseWrap.classList.add(`is-${kind}`);
  }
  if (text && kind !== "idle") {
    phraseStatus.textContent = childStatus(kind);
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
  master.gain.value = 0.12;
  master.connect(context.destination);

  // Bright "clink" style hit with short layered tones.
  playTone(context, master, 1318, now, 0.08, "triangle", 0.23);
  playTone(context, master, 1568, now + 0.06, 0.13, "sine", 0.12);
  playTone(context, master, 2637, now + 0.015, 0.06, "sine", 0.13);
  playTone(context, master, 1568, now + 0.11, 0.11, "triangle", 0.18);
  playTone(context, master, 2093, now + 0.15, 0.18, "sine", 0.09);

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
  stopAutoImitateSession(false);
  document.querySelector("#round-complete").close();
  autoSessionRunning = true;
  const token = autoSessionToken;
  const button = document.querySelector("#auto-session");
  const status = document.querySelector("#session-status");
  setButtonIcon(button, "stop");
  button.setAttribute("aria-label", "Gyakorlás megállítása");
  button.setAttribute("aria-pressed", "true");
  const sessionWords = buildAdaptiveSessionWords();
  for (let i = 0; i < sessionWords.length && token === autoSessionToken; i += 1) {
    const currentWord = sessionWords[i];
    currentImitate = words.findIndex(word => word.id === currentWord.id);
    renderImitate();
    renderRoundProgress(i, sessionWords.length);
    status.textContent = `${i + 1} / ${sessionWords.length} szó`;
    playTransitionCue();
    await sleep(180);
    if (token !== autoSessionToken) return;
    await playWord(currentWord);
    if (token !== autoSessionToken) return;
    const wordEndAt = Date.now() + WORD_LISTEN_WINDOW_MS;
    let success = false;
    let attempts = 0;
    while (token === autoSessionToken && Date.now() < wordEndAt && !success && attempts < 2) {
      attempts += 1;
      success = await startListeningAttempt();
      if (!success && attempts < 2 && token === autoSessionToken) {
        if (state.settings.spokenGuidance) await speakVoice("guide_again");
        if (token !== autoSessionToken) return;
        await playWord(currentWord);
      }
    }
    if (token === autoSessionToken) await sleep(220);
  }
  if (token === autoSessionToken) {
    stopAutoImitateSession(false);
    renderRoundProgress(sessionWords.length, sessionWords.length);
    celebrateRound("imitate", sessionWords.length);
  }
}

function stopAutoImitateSession(showStatus = true) {
  autoSessionToken += 1;
  autoSessionRunning = false;
  activeAttempt?.abort();
  activeAttempt = null;
  listening = false;
  flipBusy = false;
  stopPlayback();
  teardownMicMonitor();
  setListeningUi(false);
  setPhraseListeningUi(false);
  setEngineState("idle", "");
  setPhraseState("idle", "");
  setButtonIcon(document.querySelector("#auto-session"), "play");
  document.querySelector("#auto-session").setAttribute("aria-label", "Közös gyakorlás indítása");
  document.querySelector("#auto-session").setAttribute("aria-pressed", "false");
  document.querySelector("#stop-listening").hidden = true;
  document.querySelector("#session-status").textContent = "Együtt is gyakorolhattok, szóról szóra.";
  if (showStatus) listenStatus.textContent = "🔊 → 🎤";
  flipRoundToken += 1;
  celebrationToken += 1;
  confettiLayer.classList.remove("is-active");
  confettiLayer.replaceChildren();
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
  if (micRequest) return micRequest;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices?.getUserMedia || !AudioContext) return null;
  const generation = micGeneration;
  const request = (async () => {
    let stream;
    let context;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== micGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyzer = context.createAnalyser();
      analyzer.fftSize = 1024;
      source.connect(analyzer);
      const data = new Uint8Array(analyzer.frequencyBinCount);
      micMonitor = { stream, context, analyzer, data };
      return micMonitor;
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      context?.close().catch(() => {});
      if (generation === micGeneration) {
        micError = error.name === "NotFoundError"
          ? "Nem találok mikrofont. Csatlakoztass egyet, és próbáld újra!"
          : "A mikrofon nem érhető el. Engedélyezd a böngészőben, majd próbáld újra!";
      }
      return null;
    }
  })();
  micRequest = request;
  try {
    return await request;
  } finally {
    if (micRequest === request) micRequest = null;
  }
}

function teardownMicMonitor() {
  micGeneration += 1;
  micRequest = null;
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

function setButtonIcon(button, icon) {
  button.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${icon}"></use></svg>`;
}

function childStatus(kind) {
  return { preparing: "Mindjárt…", listening: "Most te jössz!", processing: "Hallgatlak…", success: "Ügyes vagy!", rejected: "Még egyszer?" }[kind] || "";
}

function registerPlay() {
  state.plays += 1;
  saveProgress();
  refreshStats();
}

function normalizeVoiceText(text) {
  return text.toLowerCase().replace(/[.!?…⭐]/g, "").replace(/\s+/g, " ").trim();
}

async function speakHungarian(text, token = beginPlayback()) {
  const clip = voiceByText.get(normalizeVoiceText(text));
  if (clip) {
    const played = await tryPlayFile(`./${clip.file}`, token);
    if (played || token !== playbackToken) return;
  }
  await speakWithBrowser(text, token);
}

async function speakVoice(id, token = beginPlayback()) {
  const clip = VOICE_CLIPS[id];
  if (!clip || token !== playbackToken) return;
  const played = await tryPlayFile(`./${clip.file}`, token);
  if (!played && token === playbackToken) await speakWithBrowser(clip.text, token);
}

async function speakVoiceSequence(ids) {
  const token = beginPlayback();
  for (const id of ids) {
    if (token !== playbackToken) return;
    await speakVoice(id, token);
  }
}

function speakGuide(id, force = false) {
  if (!force && !state.settings.spokenGuidance) return Promise.resolve();
  return speakVoice(`guide_${id}`);
}

function setupNavigation() {
  document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => showScreen(button.dataset.open));
  });
  document.querySelector("#home-button").addEventListener("click", () => showScreen("home"));
  document.querySelector("#help-button").addEventListener("click", () => {
    if (listening || autoSessionRunning) stopAutoImitateSession(false);
    primeSfx();
    if (currentScreen === "numbers" && numberMode === "quiz") speakNumberQuestion();
    else if (currentScreen === "listening-game") listeningGame.repeat({ intro: true, force: true });
    else speakGuide(screenInfo[currentScreen]?.guide || "welcome", true);
  });
  document.querySelector("#parent-button").addEventListener("click", showParentGate);
  document.querySelector("#close-parent-gate").addEventListener("click", () => document.querySelector("#parent-gate").close());
  document.querySelector("#flip-new").addEventListener("click", () => {
    stopPlayback();
    renderFlipGame();
    speakGuide("flip");
  });
  document.querySelector("#round-home").addEventListener("click", () => showScreen("home"));
  document.querySelector("#round-replay").addEventListener("click", () => {
    document.querySelector("#round-complete").close();
    if (completedRoundKind === "flip") showScreen("flip");
    else if (completedRoundKind === "listening-game") showScreen("listening-game");
    else startAutoImitateSession();
  });
  const icons = { family: "👨‍👩‍👧", animals: "🐶", food: "🍎", play: "🧸", nature: "🌳", home: "🏡" };
  const tones = ["peach", "yellow", "mint", "blue", "mint", "peach"];
  wordCategories.filter(category => category.id !== "all").forEach((category, index) => {
    const button = document.createElement("button");
    button.className = `topic-tile tone-${tones[index]}`;
    const title = category.label.slice(category.label.indexOf(" ") + 1);
    button.setAttribute("aria-label", title);
    button.dataset.topic = category.id;
    button.innerHTML = `<span class="topic-emoji" aria-hidden="true">${icons[category.id]}</span><span>${title}</span>`;
    button.addEventListener("click", () => {
      selectedCategory = category.id;
      renderCards();
      showScreen("cards");
    });
    document.querySelector("#topic-grid").appendChild(button);
  });
  history.replaceState({ screen: "home", category: selectedCategory }, "");
  window.addEventListener("popstate", event => {
    if (wordCategories.some(category => category.id === event.state?.category)) selectedCategory = event.state.category;
    showScreen(screenInfo[event.state?.screen] ? event.state.screen : "home", { pushHistory: false, announce: false });
  });
}

function showScreen(screen, { announce = true, pushHistory = true, allowParent = false } = {}) {
  if (!screenInfo[screen]) return;
  if (screen === "parent" && !allowParent) {
    showParentGate();
    return;
  }
  stopAutoImitateSession(false);
  listeningGame?.stop();
  if (cloudResumePending) disconnectCloud();
  progressTools?.cancelPending();
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
  primeSfx();
  const previousScreen = currentScreen;
  currentScreen = screen;
  document.body.dataset.screen = screen;
  panels.forEach(panel => panel.classList.toggle("is-active", panel.id === screen));
  const title = document.querySelector("#screen-title");
  title.textContent = screen === "cards"
    ? wordCategories.find(category => category.id === selectedCategory).label
    : screenInfo[screen].title;
  syncProfileControls();
  document.querySelector("#help-button").hidden = screen === "parent";
  if (screen === "cards") renderCards();
  if (screen === "imitate") { renderImitate(); renderRoundProgress(); }
  if (screen === "two-word") renderTwoWordMode();
  if (screen === "flip") renderFlipGame();
  if (screen === "listening-game") listeningGame.start({ announce });
  if (screen === "numbers" && numberMode === "count") renderNumbers();
  if (pushHistory && previousScreen !== screen) history.pushState({ screen, category: selectedCategory }, "");
  title.tabIndex = -1;
  title.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (announce && screen !== "listening-game" && screenInfo[screen].guide) speakGuide(screenInfo[screen].guide);
}

function showParentGate() {
  stopPlayback();
  const dialog = document.querySelector("#parent-gate");
  const a = 6 + Math.floor(Math.random() * 5);
  const b = 3 + Math.floor(Math.random() * 5);
  const correct = a + b;
  document.querySelector("#parent-gate-question").textContent = `Mennyi ${a} + ${b}?`;
  document.querySelector("#parent-gate-status").textContent = "";
  const answers = document.querySelector("#parent-gate-answers");
  answers.replaceChildren();
  shuffleNumbers([correct, correct - 2, correct + 3]).forEach(value => {
    const button = document.createElement("button");
    button.textContent = value;
    button.addEventListener("click", () => {
      if (value === correct) showScreen("parent", { announce: false, allowParent: true });
      else document.querySelector("#parent-gate-status").textContent = "Próbáld újra!";
    });
    answers.appendChild(button);
  });
  dialog.showModal();
}

function setupParentSettings() {
  const roundLength = document.querySelector("#round-length");
  const topic = document.querySelector("#practice-topic");
  const wordVoice = document.querySelector("#word-voice");
  const guidance = document.querySelector("#spoken-guidance");
  const listeningChoices = document.querySelector("#listening-choices");
  wordCategories.forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    topic.appendChild(option);
  });
  roundLength.value = state.settings.roundLength;
  topic.value = state.settings.practiceTopic;
  wordVoice.value = state.settings.wordVoice;
  guidance.checked = state.settings.spokenGuidance;
  listeningChoices.value = state.settings.listeningChoices;
  document.querySelector("#number-level").value = numberLimit;
  roundLength.addEventListener("change", () => { state.settings.roundLength = Number(roundLength.value); saveProgress(); renderRoundProgress(); });
  topic.addEventListener("change", () => { state.settings.practiceTopic = topic.value; saveProgress(); });
  wordVoice.addEventListener("change", () => { state.settings.wordVoice = wordVoice.value; saveProgress(); });
  guidance.addEventListener("change", () => { state.settings.spokenGuidance = guidance.checked; stopPlayback(); saveProgress(); });
  listeningChoices.addEventListener("change", () => { state.settings.listeningChoices = Number(listeningChoices.value); saveProgress(); });
  document.querySelector("#voice-preview").addEventListener("click", () => {
    primeSfx();
    speakVoiceSequence(["guide_welcome", "phrase_kerek_vizet", "number_3"]);
  });
}

function renderRoundProgress(current = 0, total = state.settings.roundLength) {
  const progress = document.querySelector("#round-progress");
  progress.replaceChildren();
  progress.setAttribute("aria-label", `${Math.min(current, total)} / ${total} szó`);
  for (let index = 0; index < total; index += 1) {
    const dot = document.createElement("span");
    dot.className = `progress-dot${index < current ? " is-done" : index === current && autoSessionRunning ? " is-current" : ""}`;
    dot.setAttribute("aria-hidden", "true");
    progress.appendChild(dot);
  }
}

function celebrateRound(kind, count) {
  completedRoundKind = kind;
  playSuccessSound();
  burstConfettiOverlay(1000);
  document.querySelector("#complete-stars").textContent = "⭐".repeat(Math.min(count, 5));
  document.querySelector("#round-complete").showModal();
  speakGuide("finished");
}
