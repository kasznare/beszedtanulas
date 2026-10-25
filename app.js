import { nextTask, relatedTaskMarkup } from './next-task.js';
import { PHRASE_GROUPS, phraseIndexes, buildPhraseDeck } from './phrase-practice.js';
import { wordPicture, setWordPicture } from "./word-art.js";
import { normalizePracticeSettings } from "./portal-practice-data.js";
import { normalizeNumberSettings, normalizeNumberProgress } from "./number-data.js";
import { setupFlipGame } from "./flip-game.js";
import { setupNumberGames } from "./number-game.js";
import { PROJECT_SUPABASE } from "./supabase-config.js";

import { words, wordCategories, twoWordPhrases, TODDLER_ALIASES } from "./game-data.js";
import { VOICE_CLIPS } from "./voice-library.js";
import { VOICE_TIMING } from "./voice-timing.js";
import { createNarration } from "./narration.js";
import { narrationCue } from "./narration-cues.js";
import { normalizeText, similarityScore, matchTwoWordPhrase } from "./speech-matching.js";
import { setupOffline } from "./offline-client.js";
import { createSuccessDelay } from "./success-delay.js";
import { createInteractionAudio, normalizeEffectOptions, setupInterfaceEffects } from "./interaction-audio.js";
import { GROUPS, parentScreen, canonicalTrail, transitionTrail, createHistoryState, restoreHistoryState } from "./navigation.js";
import { snapshotProgress, normalizeUndo, replaceProgress } from "./progress-data.js";
import { setupProgressTools } from "./progress-tools.js";
import { setupListeningGame } from "./listening-game.js";
import { setupTeddyGame } from "./teddy-game.js";
import { setupDressGame } from "./dress-game.js";
import { setupMeadow } from "./meseliget-game.js";
import { setupLogic } from "./logic-game.js";
import { setupMemoryGame } from "./memory-game.js";
import { setupPuzzleGame } from "./puzzle-game.js";
import { setupCityStoryGame } from "./city-story-game.js";
import { setupDifferencesGame } from "./differences-game.js";
import { setupPatternsGame } from "./patterns-game.js";
import { setupChessGame } from "./chess-game.js";
import { setupEngineering } from "./engineering-game.js";
import { normalizePuzzleOptions } from "./puzzle-data.js";
import { setupMontessoriGame } from "./montessori-game.js";
import { normalizeMontessoriOptions } from "./montessori-data.js";
import { setupWorkshop } from "./workshop-game.js";
import { setupAnimalBook } from "./animal-book-game.js";
import { setupAudiobooks } from "./audiobook-game.js";
import { setupPourGame } from "./pour-game.js";
import { ANIMAL_BOOK_PAGES } from "./animal-book-data.js";
import { setupRPractice } from "./r-practice-game.js";
import { normalizeRProgress, matchRPracticeSpeech } from "./r-practice-data.js";
import { detectRVoiceActivity } from "./r-practice-media.js";
import { normalizeWorkshop, normalizeWorkshopOptions, WORKSHOP_LEVEL_KEYS, WORKSHOP_NAMES } from "./workshop-data.js";
import { normalizeLogic, LOGIC_NAMES } from "./logic-data.js";
import { normalizeMeadow } from "./meseliget-data.js";
import { recognizeHungarianSpeech, SPEECH_TIMING, speechErrorMessage } from "./speech-recognition.js";
import { checkpointProfiles, normalizeProfileStore, switchProgressProfile, mergeWordProgress, isSharedProfileCode, profileKey } from "./progress-profiles.js";
import { createCloudSaveQueue } from "./cloud-save-queue.js";
import { createPlayTimeLimit, PLAY_TIME_KEY, formatPlayTime } from "./play-time.js";

let selectedCategory = "all";
let practiceLaunchWordId = null;

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
const SETTINGS_DEFAULTS = { roundLength: 5, spokenGuidance: true, wordVoice: "natural", numberLimit: 3, practiceTopic: "all", listeningChoices: 2, mathLimit: 5, shopLevel: 1, machineLevel: 1, routeLevel: 1, routeView: "map", memoryPairs: 3, workshopLevel: 1, ...normalizeWorkshopOptions(), pourLevel: 1, ...normalizePuzzleOptions(), ...normalizeMontessoriOptions(), ...normalizeEffectOptions(), ...normalizePracticeSettings(), ...normalizeNumberSettings() };
const state = loadProgress();
let currentScreen = "home";
const roundSuccess = createSuccessDelay();
let appNavigation = restoreHistoryState(null);
let offlineClient;
let playTime;
let handlingPlayTime = false;
let parentGateUnlocksTime = false;
const timedScreens = new Set(['cards', 'numbers', 'imitate', 'two-word', 'flip', 'listening-game', 'teddy-game', 'dress-game', 'meseliget', 'furfangliget', 'memory', 'puzzle', 'differences', 'patterns', 'city-story', 'chess', 'engineering', 'montessori', 'workshop', 'animal-book', 'audiobooks', 'pour', 'r-practice']);
const innerBackSelectors = { meseliget: '#meadow-back', furfangliget: '#logic-back', workshop: '#ws-back', montessori: '#mo-back', engineering: '#en-back', 'r-practice': '[data-action="hub"]', audiobooks: '#story-back' };
const narration = createNarration({ getRoot: () => document.getElementById(currentScreen), getWords: id => VOICE_TIMING[id] });
let completedRoundKind = "imitate";
const screenInfo = {
  home: { title: "Játsszunk együtt!", guide: "welcome" },
  "picture-menu": { title: "Képek és hangok", guide: "menu_pictures" },
  "play-menu": { title: "Játék Macival" },
  // Menus whose recorded guide no longer matches their games fall back to the general welcome.
  "activity-menu": { title: "Kirakók és építés" },
  "shape-menu": { title: "Formák és minták" },
  "dress-game": { title: "Maci öltözik", guide: "dress" },
  meseliget: { title: "Meseliget" },
  furfangliget: { title: "Furfangliget" },
  memory: { title: "Képpárok" },
  puzzle: { title: "Képkirakó" },
  "city-story": { title: "A film utolsó jelenete" },
  differences: { title: "Találd meg a különbségeket!" },
  patterns: { title: "Folytasd a mintát!" },
  montessori: { title: "Montessori műhely" },
  chess: { title: "Sakkliget" },
  engineering: { title: "Építőliget" },
  workshop: { title: "Műhelyliget" },
  "animal-book": { title: "Állathangos könyv" },
  audiobooks: { title: "Mesetár" },
  pour: { title: "Töltsünk a barátainknak!" },
  "r-practice": { title: "Róka R-kalandja" },
  "teddy-game": { title: "Etesd meg a macit!", guide: "teddy" },
  topics: { title: "Mit nézzünk meg?", guide: "topics" },
  cards: { title: "Beszélő képek", guide: "cards" },
  "listening-game": { title: "Hol van?", guide: "listening_game" },
  "practice-menu": { title: "Mondd utánam", guide: "menu_speech" },
  imitate: { title: "Egy szó", guide: "imitate" },
  "two-word": { title: "Két szó", guide: "phrase" },
  "number-menu": { title: "Számok" },
  "big-menu": { title: "Fejtörők" },
  numbers: { title: "Számoljunk!", guide: "count" },
  flip: { title: "Mi bújt el?", guide: "flip" },
  parent: { title: "Szülői beállítások" },
  'play-break': { title: "Pihenőidő" },
};
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
let effects;
const playEffect = kind => effects?.play(kind);
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
let teddyGame;
let dressGame;
let meadowGame;
let logicGame;
let memoryGame;
let puzzleGame;
let differencesGame;
let cityStoryGame;
let patternsGame;
let montessoriGame;
let chessGame;
let engineeringGame;
// Keep experiments only for this page session, separated by the active profile.
const engineeringSessions = new Map();
const engineeringScope = () => state.profileStore?.activeKey || profileKey(state.supabase);
let workshopGame;
let animalBook;
let audiobooks;
let pourGame;
let rPractice;
let numberGame;
let flipGame;
let externalProgressChanged = false;
const wordAudioBufferCache = new Map();
let currentPhrase = 0;
let togetherWordRound=null, togetherWordStep=0, wordConfirmed=false;
let phraseStep=0, phraseConfirmed=false, phraseRound=null, phraseRoundStep=0;
let phraseGroup='all', phraseTopic='all', phraseQueue=[];
let numberMode = "count";
// True while the current game was opened straight into one exercise (a card with a kind).
let directEntry = false;

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
  const pool=getSpeechWords();
  currentImitate=words.findIndex(word=>word.id===pool[(pool.findIndex(w=>w.id===words[currentImitate].id)+1)%pool.length].id);
  renderImitate();
});

listenBtn.addEventListener("click", () => {
  primeSfx();
  startListeningAttempt();
});

playPhraseBtn.addEventListener("click", () => {
  primeSfx();
  playCurrentPhrase();
});

nextPhraseBtn.addEventListener("click", () => {
  stopAutoImitateSession();
  primeSfx();
  phraseStep=0;phraseConfirmed=false;phraseRound=null;
  currentPhrase = nextPhraseIndex();
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
  // A game offered in several groups is labelled with the group it was opened from.
  const from = appNavigation?.trail?.at(-2)?.screen;
  const group = GROUPS.find(value => value.screen === currentScreen)
    || GROUPS.find(value => value.screen === from && value.screens.includes(currentScreen))
    || GROUPS.find(value => value.screen === parentScreen(currentScreen))
    || (currentScreen === 'cards' ? GROUPS.find(value => value.screen === 'picture-menu') : null);
  const kicker = document.querySelector("#screen-kicker");
  kicker.textContent = currentScreen === "parent" ? "FELNŐTTEKNEK" : preview ? "SZÜLŐI PRÓBA" : group?.title || "BESZÉDTANULÁS";
  // A category screen already shows its name as the title; repeating it above adds nothing.
  // Screens that open straight from home (Mesetár) have no group to name.
  kicker.hidden = kicker.textContent === document.querySelector("#screen-title").textContent || (!group && !preview && !["home", "parent"].includes(currentScreen));
  playTime?.tick();
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
// A long press during play opens no copy or image menu; fields and the parent page keep it.
document.addEventListener("contextmenu", event => {
  if (currentScreen !== "parent" && matchMedia("(pointer: coarse)").matches && !event.target.closest("input, textarea, select, [contenteditable='true']")) event.preventDefault();
});
effects = createInteractionAudio({
  getContext: getSfxContext, getOptions: () => state.settings,
  isHidden: () => document.hidden,
  isCapturing: () => listening || Boolean(rPractice?.isCapturing?.()),
  isNarrating: () => Boolean(cancelPlayback) || document.querySelector('#audiobooks')?.dataset.phase === 'playing' || Boolean(rPractice?.isReplaying?.()),
});
listeningGame = setupListeningGame({
  effect: playEffect,
  onRestart: () => roundSuccess.cancel(),
  getOptions: () => {
    const firstWordId=practiceLaunchWordId;practiceLaunchWordId=null;
    return { words:getPracticeWords(),length:state.settings.roundLength,choiceCount:state.settings.listeningChoices,difficulty:state.settings.listeningDifficulty,firstWordId };
  },
  setDifficulty: value => { state.settings.listeningDifficulty=value; saveProgress(); },
  speak: id => speakVoice(id),
  playPrompt: playListeningPrompt,
  playCorrect: () => { stopPlayback(); playSuccessSound(); speakGuide("good"); },
  stopPlayback,
  onComplete: (count, context = {}) => {
    if(context.mode!=="bingo"){state.rewards += 1;saveProgress();refreshStats();}
    celebrateRound("listening-game", count);
  },
});
teddyGame = setupTeddyGame({
  effect: playEffect,
  onRestart: () => roundSuccess.cancel(),
  getOptions: () => ({ length: state.settings.roundLength, choiceCount: state.settings.listeningChoices }),
  playPrompt: playTeddyPrompt,
  speak: id => speakVoice(id),
  playThanks: () => speakVoice("guide_teddy_thanks"),
  stopPlayback,
  onComplete: (count, context = {}) => {
    if(context.mode!=="expressive"){state.rewards += 1;saveProgress();refreshStats();}
    celebrateRound("teddy-game", count);
  },
});
dressGame = setupDressGame({
  effect: playEffect,
  onRestart: () => roundSuccess.cancel(),
  getChoiceCount: () => state.settings.listeningChoices,
  playPrompt: playDressPrompt,
  speak: id => speakVoice(id),
  playThanks: item => speakVoice(`dress_thanks_${item.id}`),
  stopPlayback,
  onComplete: count => {
    state.rewards += 1;
    saveProgress();
    refreshStats();
    celebrateRound("dress-game", count);
  },
});
meadowGame = setupMeadow({
  effect: playEffect,
  getProgress: () => state.meadow,
  getOptions: () => state.settings,
  speak: (id, cue) => speakVoice(id, undefined, cue), stopPlayback, openScreen: showScreen,
  updateProgress: (progress, reward) => {
    state.meadow = progress;
    if (reward) { state.rewards += 1; playEffect('success'); }
    saveProgress(); refreshStats();
  },
});
logicGame = setupLogic({
  effect: playEffect,
  getProgress: () => state.logic, getOptions: () => state.settings,
  speak: ids => speakVoiceSequence(ids), stopPlayback,
  setRouteView: view => {
    state.settings.routeView = view === 'steps' ? 'steps' : 'map';
    document.querySelector('#route-view').value = state.settings.routeView;
    saveProgress();
  },
  setLevel: (kind, level) => {
    if (!Object.hasOwn(LOGIC_NAMES, kind) || ![1, 2, 3].includes(level)) return;
    state.settings[`${kind}Level`] = level;
    document.querySelector(`#${kind}-level`).value = level;
    saveProgress();
  },
  updateProgress: (progress, reward) => {
    state.logic = progress;
    if (reward) { state.rewards += 1; playEffect('success'); }
    saveProgress(); refreshStats();
  },
});
memoryGame = setupMemoryGame({
  effect: playEffect,
  onRestart: () => roundSuccess.cancel(),
  getOptions: () => ({ words: getPracticeWords(), memoryPairs: state.settings.memoryPairs }),
  playWord: (word, cue) => playWord(word, undefined, cue), speak: id => speakVoice(id), stopPlayback,
  setPairs: pairs => {
    state.settings.memoryPairs = pairs;
    document.querySelector('#memory-pairs').value = pairs;
    saveProgress();
  },
  onComplete: (count, context = {}) => {
    if(context.mode!=='sound'){state.rewards += 1;saveProgress();refreshStats();}
    celebrateRound('memory', count);
  },
});
puzzleGame = setupPuzzleGame({
  effect: playEffect,
  onRestart: () => roundSuccess.cancel(),
  getOptions: () => state.settings,
  getProgress: () => state.puzzles,
  setProgress: progress => { state.puzzles = progress; saveProgress({sync:false}); },
  setOptions: options => { Object.assign(state.settings, normalizePuzzleOptions(options)); saveProgress(); },
  speak: id => speakVoice(id), stopPlayback,
  onComplete: count => {
    state.rewards += 1;
    saveProgress(); refreshStats(); celebrateRound('puzzle', count);
  },
});
cityStoryGame = setupCityStoryGame({
  effect: playEffect, stopPlayback,
  hasVoice: id => Boolean(VOICE_CLIPS[id]),
  speak: (ids, force = false) => { if (force || state.settings.spokenGuidance) return speakVoiceSequence(ids); },
  onHome: () => showScreen("big-menu"),
});
differencesGame = setupDifferencesGame({
  effect: playEffect,
  stopPlayback,
  speak: (id, force = false) => { if (force || state.settings.spokenGuidance) return speakVoice(id); },
  onRestart: () => roundSuccess.cancel(),
  onComplete: ({ count }) => celebrateRound('differences', count),
});
patternsGame = setupPatternsGame({
  effect: playEffect,
  stopPlayback,
  speak: (id, force = false) => { if (force || state.settings.spokenGuidance) return speakVoice(id); },
  onRestart: () => roundSuccess.cancel(),
  onComplete: ({ count }) => celebrateRound('patterns', count),
});
chessGame = setupChessGame({
  effect: playEffect,
  onRestart: () => roundSuccess.cancel(),
  speak: (id, force = false) => { if (force || state.settings.spokenGuidance) return speakVoice(id, undefined, { target: '.chess-rule', motion: 'pulse' }); }, stopPlayback,
  onComplete: count => {
    state.rewards += 1;
    saveProgress(); refreshStats(); celebrateRound("chess", count);
  },
});
engineeringGame = setupEngineering({
  getProgress: () => engineeringSessions.get(engineeringScope()),
  setProgress: progress => engineeringSessions.set(engineeringScope(), progress),
  speak: (id, force = false) => { if (force || state.settings.spokenGuidance) return speakVoice(id); },
  stopPlayback,
});
montessoriGame = setupMontessoriGame({
  getScope: () => state.profileStore?.activeKey || profileKey(state.supabase),
  effect: playEffect,
  getOptions: () => state.settings,
  setOptions: options => { Object.assign(state.settings, normalizeMontessoriOptions(options)); saveProgress(); },
  speak: (id, force) => { if (force || state.settings.spokenGuidance) return speakVoice(id); }, stopPlayback,
  onComplete: () => { state.rewards += 1; saveProgress(); refreshStats(); },
});
workshopGame = setupWorkshop({
  effect: playEffect,
  getProgress: () => state.workshop, getOptions: () => state.settings,
  speak: ids => speakVoiceSequence(ids), stopPlayback,
  setLevel: (level, kind) => {
    if (![1, 2, 3].includes(level)) return;
    if (WORKSHOP_LEVEL_KEYS[kind]) state.settings[WORKSHOP_LEVEL_KEYS[kind]] = level;
    else {
      state.settings.workshopLevel = level;
      Object.assign(state.settings, normalizeWorkshopOptions({ workshopLevel: level }));
      document.querySelector('#workshop-level').value = level;
    }
    saveProgress();
  },
  updateProgress: (progress, reward) => {
    state.workshop = progress;
    if (reward) { state.rewards += 1; playEffect('success'); }
    saveProgress(); refreshStats();
  },
});
animalBook = setupAnimalBook({
  playSound: async (id, { onStart } = {}) => {
    if (!ANIMAL_BOOK_PAGES.some(page => page.animals.some(animal => animal.id === id))) return false;
    const token = beginPlayback();
    const played = await tryPlayFile(`./audio/animals/${id}.mp3`, token, { start: () => onStart?.(), stop() {} });
    return token === playbackToken && played;
  },
  playName: id => speakVoice(`abk_name_${id}`),
  speak: id => speakVoice(id),
  stopPlayback,
  onShowCredits: showAnimalBookCredits,
});
audiobooks = setupAudiobooks({ stopPlayback, onListeningChange: playing => { if (playing) playTime?.start(); } });
pourGame = setupPourGame({
  effect: playEffect,
  onRestart: () => roundSuccess.cancel(),
  getOptions: () => state.settings,
  setLevel: level => { state.settings.pourLevel = level; saveProgress(); },
  speak: id => { if (state.settings.spokenGuidance) return speakVoice(id); },
  stopPlayback, getAudioContext: getSfxContext, getAudioDestination: () => effects.destination(),
  onComplete: count => {
    state.rewards += 1;
    saveProgress(); refreshStats(); celebrateRound('pour', count);
  },
});
rPractice = setupRPractice({
  effect: playEffect, quietEffects: () => effects.stop(),
  onRestart: () => roundSuccess.cancel(),
  getProgress: () => state.rPractice,
  updateProgress: progress => { state.rPractice=progress; saveProgress({sync:false}); refreshStats(); },
  speak: (id,cue) => speakVoice(id,undefined,cue), stopPlayback,
  listen: async ({text,mode,signal,onStart}) => {
    if(mode==='encouraging')return detectRVoiceActivity({signal,onStart});
    const speech=await recognizeHungarianSpeech({signal,onStart,timeoutMs:text.split(' ').length>1?SPEECH_TIMING.phrase:SPEECH_TIMING.word,isMatch:result=>matchRPracticeSpeech(text,result.alternatives)});
    if(speech.error&&speech.error!=='no-speech'&&speech.error!=='aborted')throw Error(speechErrorMessage(speech.error));
    return {matched:matchRPracticeSpeech(text,speech.alternatives),transcript:speech.transcript};
  },
});
flipGame=setupFlipGame({
  effect:playEffect,onRestart:()=>roundSuccess.cancel(),
  getOptions:()=>({words:getPracticeWords(),flipMode:state.settings.flipMode}),
  setMode:mode=>{state.settings.flipMode=mode;saveProgress();},
  playWord:(word,cue)=>playWord(word,undefined,cue),speak:ids=>Array.isArray(ids)?speakVoiceSequence(ids):speakVoice(ids),stopPlayback,
  onComplete:count=>{state.rewards++;saveProgress();refreshStats();celebrateRound("flip",count);},
});
numberGame = setupNumberGames({
  effect:playEffect,onRestart:()=>roundSuccess.cancel(),
  getProgress: () => state.numbers,
  setProgress: (progress,{reward=false}={}) => { state.numbers=progress;if(reward)state.rewards++;saveProgress({sync:false});refreshStats(); },
  getOptions: () => state.settings,
  setOptions: patch => { Object.assign(state.settings,patch); saveProgress({sync:false}); },
  speak: ids => speakVoiceSequence(ids), stopPlayback,
  onComplete: (mode,count) => celebrateRound(`numbers-${mode}`,count),
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
offlineClient = setupOffline({
  beforeReload: () => { stopAutoImitateSession(false); rPractice?.stop(); },
  isSafeToReload: () => currentScreen === 'home' && !document.hidden && !document.querySelector('dialog[open]'),
});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => offlineClient?.notifyScreenChange()));

document.querySelector("#auto-session").addEventListener("click", () => {
  primeSfx();
  if (autoSessionRunning) stopAutoImitateSession();
  else startAutoImitateSession();
});
document.querySelector("#stop-listening").addEventListener("click", stopAutoImitateSession);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && currentScreen !== "audiobooks") stopAutoImitateSession();
});
window.addEventListener("pagehide", stopAutoImitateSession);
window.addEventListener("pagehide", () => roundSuccess.cancel());

setupBasicPractice();
setupCategories();
renderRoundProgress();
renderCards();
setupNumbers();
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
setupPlayTime();
setupInterfaceEffects({ audio: effects, skipSelector: '[data-mo-piece], [data-mo-target], [data-mo-blocker], .puzzle-piece, .puzzle-slot, .differences-picture, [data-pattern-choice], #patterns-undo, .chess-square, .memory-card, .teddy-plate, .dress-choice, .listening-answer' });
document.addEventListener("visibilitychange", () => { if (document.hidden) effects.stop(); else effects.sync(); });
window.addEventListener("pagehide", () => effects.stop());

function renderPlayTime(status) {
  document.querySelector('#home-play-time').textContent = status.started ? `Játékidő: ${formatPlayTime(status.remainingMs)} · utána 15 perc pihenő` : '30 perc játék · utána 15 perc pihenő';
  document.querySelector('#parent-play-time').textContent = status.locked
    ? `Pihenő: még ${formatPlayTime(status.breakRemainingMs)}`
    : `Hátralévő játékidő: ${formatPlayTime(status.remainingMs)} / 30:00`;
  document.querySelector('#break-countdown').textContent = formatPlayTime(status.breakRemainingMs);
  document.querySelector('#play-time-storage-error').hidden = !status.storageError;
  if (handlingPlayTime) return;
  handlingPlayTime = true;
  // Playback callbacks also run inside navigation. Reconcile after that
  // transition finishes, so an expiring budget cannot restart a stopped game.
  queueMicrotask(() => {
    try {
      const latest = playTime.snapshot();
      if (latest.locked && !['parent', 'play-break'].includes(currentScreen)) {
        showScreen('play-break', { announce: false });
      } else if (!latest.locked && currentScreen === 'play-break') {
        showScreen('home', { announce: false });
      }
    } finally { handlingPlayTime = false; }
  });
}

function setupPlayTime() {
  playTime = createPlayTimeLimit({
    storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
    onChange: renderPlayTime,
  });
  playTime.tick();
  document.querySelector('#break-parent-unlock').addEventListener('click', () => showParentGate({ unlockTime: true }));
  document.querySelector('#parent-renew-play-time').addEventListener('click', () => {
    if (currentScreen === 'parent') playTime.renew();
  });
  for (const type of ['pointerdown', 'keydown', 'click']) {
    document.addEventListener(type, event => {
      const status = playTime.tick();
      if (status.locked && currentScreen !== 'parent' && !event.target.closest?.('#play-break, #parent-gate, #parent-button')) {
        if (event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }, { capture: true, passive: false });
  }
  document.addEventListener('visibilitychange', () => playTime.tick());
  window.addEventListener('pageshow', () => playTime.tick());
  window.addEventListener('focus', () => playTime.tick());
  window.addEventListener('storage', event => {
    if (event.key === PLAY_TIME_KEY || event.key === null) playTime.tick();
  });
  setInterval(() => playTime.tick(), 1000);
}

function setupNumbers() {
  document.querySelectorAll('.number-mode').forEach(button => button.addEventListener('click', () => {
    numberMode=button.dataset.mode; showScreen('numbers', {announce:false});
  }));
  document.querySelector('#number-level').addEventListener('change', event => {
    state.settings.numberLimit=Number(event.target.value);saveProgress();numberGame.setLimit();
  });
}
function renderNumbers() { numberGame.start('count'); }
function renderNumberQuiz() { numberGame.start('quiz'); }
function speakNumberQuestion() { return numberGame.repeat(); }

function shuffleNumbers(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
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

function setupBasicPractice() {
  document.querySelector('#card-find').addEventListener('click',()=>launchCardPractice('listening-game'));
  document.querySelector('#card-say').addEventListener('click',()=>launchCardPractice('imitate'));
  document.querySelectorAll('[data-word-mode]').forEach(button=>button.addEventListener('click',()=>{
    stopAutoImitateSession(false);state.settings.wordPracticeMode=button.dataset.wordMode;saveProgress();renderImitate();
  }));
  document.querySelectorAll('[data-phrase-mode]').forEach(button=>button.addEventListener('click',()=>{
    stopAutoImitateSession(false);state.settings.phrasePracticeMode=button.dataset.phraseMode;saveProgress();renderTwoWordMode();
  }));
  const favorites=document.querySelector('#word-favorites');
  favorites.innerHTML=words.map(word=>`<button data-favorite="${word.id}" aria-label="${word.label} a kedvencek közé" aria-pressed="${state.settings.favoriteWords.includes(word.id)}">${wordPicture(word)}<span>${word.label}</span></button>`).join('');
  favorites.addEventListener('click',event=>{
    const button=event.target.closest('[data-favorite]');if(!button)return;
    const selected=new Set(state.settings.favoriteWords),id=button.dataset.favorite;
    if(selected.has(id))selected.delete(id);else if(selected.size<5)selected.add(id);else{document.querySelector('#favorite-status').textContent='Öt képet választhatunk. Előbb vegyél ki egy másikat!';return;}
    stopAutoImitateSession(false);state.settings.favoriteWords=[...selected];
    if(!selected.size)state.settings.useFavorites=false;
    const pool=getSpeechWords();
    if(!pool.some(word=>word.id===words[currentImitate].id)){currentImitate=words.findIndex(word=>word.id===pool[0].id);renderImitate();}
    saveProgress();syncBasicPractice();
  });
  document.querySelector('#use-favorites').addEventListener('click',()=>{
    stopAutoImitateSession(false);state.settings.useFavorites=!state.settings.useFavorites;saveProgress();
    const pool=getSpeechWords();currentImitate=words.findIndex(w=>w.id===pool[0].id);renderImitate();
  });
  document.querySelector('#word-confirm').addEventListener('click',confirmTogetherWord);
  document.querySelector('#phrase-confirm').addEventListener('click',()=>{if(!listening&&!phraseConfirmed)completePhraseStep();});
  document.querySelector('#phrase-stop').addEventListener('click',()=>{stopAutoImitateSession(false);phraseStatus.textContent='Megálltunk. Folytathatjuk együtt.';});
  document.querySelector('#phrase-parts-toggle').addEventListener('click',()=>{
    stopAutoImitateSession(false);state.settings.phraseParts=!state.settings.phraseParts;phraseStep=0;phraseConfirmed=false;saveProgress();renderTwoWordMode();
  });
  document.querySelector('#phrase-round-start').addEventListener('click',startPhraseRound);
  const groups=document.querySelector('#phrase-group'), topics=document.querySelector('#phrase-topic');
  groups.replaceChildren(...Object.entries(PHRASE_GROUPS).map(([id,label])=>new Option(label,id)));
  topics.replaceChildren(...wordCategories.filter(c=>c.id==='all'||twoWordPhrases.some(p=>p.topic===c.id)).map(c=>new Option(c.label,c.id)));
  groups.addEventListener('change',()=>changePhraseFilter('group',groups.value));
  topics.addEventListener('change',()=>changePhraseFilter('topic',topics.value));
}
function nextPhraseIndex() {
  const pool=phraseIndexes({group:phraseGroup,topic:phraseTopic});
  if(!phraseQueue.length)phraseQueue=buildPhraseDeck(pool,pool.length,pool.find(i=>i!==currentPhrase)??pool[0]);
  return phraseQueue.shift();
}
function changePhraseFilter(key,value) {
  roundSuccess.cancel();stopAutoImitateSession(false);stopPlayback();
  if(key==='group')phraseGroup=value;else phraseTopic=value;
  if(!phraseIndexes({group:phraseGroup,topic:phraseTopic}).length){if(key==='group')phraseTopic='all';else phraseGroup='all';}
  phraseQueue=[];currentPhrase=nextPhraseIndex();phraseStep=0;phraseConfirmed=false;phraseRound=null;renderTwoWordMode();
}
function launchCardPractice(screen) {
  const word=words.find(w=>w.id===practiceLaunchWordId);if(!word)return;
  state.settings.practiceTopic=selectedCategory;state.settings.useFavorites=false;saveProgress();
  currentImitate=words.indexOf(word);showScreen(screen);
}
function syncBasicPractice() {
  const wordTogether=state.settings.wordPracticeMode==='together',phraseTogether=state.settings.phrasePracticeMode==='together';
  document.querySelectorAll('[data-word-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.wordMode==='together')===wordTogether)));
  document.querySelectorAll('[data-phrase-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.phraseMode==='together')===phraseTogether)));
  listenBtn.hidden=wordTogether;document.querySelector('#word-confirm').hidden=!wordTogether;document.querySelector('#word-confirm').disabled=wordConfirmed;
  listenPhraseBtn.hidden=phraseTogether;document.querySelector('#phrase-confirm').hidden=!phraseTogether;document.querySelector('#phrase-confirm').disabled=phraseConfirmed;
  document.querySelectorAll('[data-favorite]').forEach(b=>b.setAttribute('aria-pressed',String(state.settings.favoriteWords.includes(b.dataset.favorite))));
  document.querySelector('#use-favorites').setAttribute('aria-pressed',String(state.settings.useFavorites));
  document.querySelector('#use-favorites').disabled=state.settings.favoriteWords.length===0;
  document.querySelector('#favorite-status').textContent=`${state.settings.favoriteWords.length} / 5 kedvenc szó`;
  const parts=state.settings.phraseParts,phrase=twoWordPhrases[currentPhrase];
  document.querySelector('#phrase-parts-toggle').setAttribute('aria-pressed',String(parts));
  const panel=document.querySelector('#phrase-parts');panel.hidden=!parts;
  panel.innerHTML=parts?[...phrase.text.split(' '),'Együtt'].map((text,i)=>`<button class="upgrade-action" data-practice-part="${i}" aria-pressed="${phraseStep===i}" aria-label="${i<2?text+' külön meghallgatása':'Teljes kifejezés meghallgatása'}">${i+1}. ${text} 🔊</button>`).join(''):'';
  panel.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(listening)return;phraseStep=Number(b.dataset.practicePart);phraseConfirmed=false;syncBasicPractice();playCurrentPhrase();}));
  document.querySelector('#phrase-round-status').textContent=phraseRound?`${phraseRoundStep} / ${phraseRound.length} kifejezés megvan`:parts?`Most: ${phraseStep<2?phrase.text.split(' ')[phraseStep]:'a két szó együtt'}`:'Hallgassuk meg, és mondjuk együtt!';
  if(wordTogether&&!autoSessionRunning)listenStatus.textContent=wordConfirmed?'Együtt kimondtátok!':'Hallgassuk meg, és mondjuk együtt!';
  if(phraseTogether)phraseStatus.textContent=phraseConfirmed?'Együtt kimondtátok!':parts&&phraseStep<2?'Először ezt a szót mondjuk!':'Most a két szót együtt!';
}
function startTogetherWordRound() {
  roundSuccess.cancel();
  stopAutoImitateSession(false);togetherWordRound=buildAdaptiveSessionWords();togetherWordStep=0;autoSessionRunning=true;
  document.querySelector('#round-complete').close();
  setButtonIcon(document.querySelector('#auto-session'),'stop');
  document.querySelector('#auto-session').setAttribute('aria-label','Gyakorlás megállítása');document.querySelector('#auto-session').setAttribute('aria-pressed','true');
  currentImitate=words.findIndex(w=>w.id===togetherWordRound[0].id);renderImitate();renderRoundProgress(0,togetherWordRound.length);playWord(words[currentImitate]);
}
function confirmTogetherWord() {
  if(currentScreen!=='imitate'||wordConfirmed||listening)return;
  wordConfirmed=true;stopPlayback();showSuccessBadge();playSuccessSound();
  if(togetherWordRound){
    togetherWordStep++;
    if(togetherWordStep===togetherWordRound.length){const count=togetherWordStep;stopAutoImitateSession(false);state.rewards++;saveProgress();refreshStats();renderRoundProgress(count,count);celebrateRound('imitate',count);return;}
    currentImitate=words.findIndex(w=>w.id===togetherWordRound[togetherWordStep].id);renderImitate();renderRoundProgress(togetherWordStep,togetherWordRound.length);playWord(words[currentImitate]);
  }else{state.rewards++;saveProgress();refreshStats();syncBasicPractice();document.querySelector('#next-word').focus({preventScroll:true});}
}
function playCurrentPhrase() {
  const phrase=twoWordPhrases[currentPhrase];
  if(state.settings.phraseParts&&phraseStep<2)return speakVoice(`phrase_part_${phrase.id}_${phraseStep}`,undefined,{target:`[data-phrase-part="${phraseStep}"]`});
  return playPhrase(phrase);
}
function startPhraseRound() {
  roundSuccess.cancel();
  stopAutoImitateSession(false);phraseRound=buildPhraseDeck(phraseIndexes({group:phraseGroup,topic:phraseTopic}),state.settings.roundLength,currentPhrase);phraseQueue=[];phraseRoundStep=0;phraseStep=0;phraseConfirmed=false;
  renderTwoWordMode();playCurrentPhrase();
}
function completePhraseStep() {
  if(currentScreen!=='two-word'||phraseConfirmed)return;
  if(state.settings.phraseParts&&phraseStep<2){phraseStep++;syncBasicPractice();playCurrentPhrase();return;}
  phraseConfirmed=true;showPhraseSuccessBadge();
  if(phraseRound){
    phraseRoundStep++;
    if(phraseRoundStep===phraseRound.length){const count=phraseRound.length;phraseRound=null;state.rewards++;saveProgress();refreshStats();syncBasicPractice();celebrateRound('two-word',count);return;}
    currentPhrase=phraseRound[phraseRoundStep];phraseStep=0;phraseConfirmed=false;renderTwoWordMode();playCurrentPhrase();
  }else{state.rewards++;saveProgress();refreshStats();syncBasicPractice();nextPhraseBtn.focus({preventScroll:true});}
}

function renderCards() {
  cardsGrid.innerHTML = "";
  const category = wordCategories.find((entry) => entry.id === selectedCategory);
  document.querySelector('#card-followup').hidden=!category.words.includes(practiceLaunchWordId);
  if(!category.words.includes(practiceLaunchWordId))practiceLaunchWordId=null;
  const visibleWords = words.filter((word) => category.words.includes(word.id));
  document.querySelectorAll(".category-choice").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === selectedCategory));
  });
  document.querySelector("#cards-count").textContent = `${visibleWords.length} szó`;
  visibleWords.forEach((word) => {
    const button = document.createElement("button");
    button.className = "card";
    button.dataset.word = word.id;
    button.innerHTML = `<div class="card-emoji">${wordPicture(word)}</div><div class="card-word">${word.label}</div>`;
    button.setAttribute("aria-label", `${word.label} meghallgatása`);
    button.addEventListener("click", async () => {
      practiceLaunchWordId=word.id;
      const followup=document.querySelector("#card-followup");followup.hidden=false;
      document.querySelector("#card-selected").textContent=`Ezzel játszunk: ${word.label}`;
      const playback = playWord(word, undefined, {target:`.card[data-word="${word.id}"] .card-emoji`});
      const token = playbackToken;
      cardsGrid.querySelectorAll(".card").forEach((card) => card.classList.remove("is-speaking"));
      button.classList.add("is-speaking");
      await playback;
      if (token === playbackToken) button.classList.remove("is-speaking");
    });
    cardsGrid.appendChild(button);
  });
}

function renderFlipGame() { flipGame.start(); }

function renderImitate() {
  roundSuccess.cancel();
  const word = words[currentImitate];
  setWordPicture(imitateEmoji,word);
  imitateWord.textContent = word.label;
  imitatePrompt.textContent = `Mondd: ${word.label}`;
  setListeningUi(false);
  setEngineState("idle", "Készen áll.");
  listenStatus.textContent = autoSessionRunning ? "Hallgassuk meg!" : "🔊 → 🎤";
  hideSuccessBadge();
  wordConfirmed=false;
  syncBasicPractice();
  setSpeechRecovery("word", false);
}

function renderTwoWordMode() {
  const pool=phraseIndexes({group:phraseGroup,topic:phraseTopic});
  if(!pool.includes(currentPhrase))currentPhrase=pool[0];
  document.querySelector('#phrase-group').value=phraseGroup;document.querySelector('#phrase-topic').value=phraseTopic;
  document.querySelector('#phrase-content-count').textContent=`${pool.length} kifejezés ebben a válogatásban`;
  const phrase = twoWordPhrases[currentPhrase];
  phraseEmoji.replaceChildren(...phrase.emojis.map((emoji, i) => {
    const picture = document.createElement('span'); picture.className = 'phrase-picture';
    picture.dataset.phrasePart = i;
    const word=words.find(word=>word.emoji===emoji);
    if(word)setWordPicture(picture,word);else picture.textContent=emoji;
    return picture;
  }));
  phraseText.textContent = phrase.text;
  phrasePrompt.textContent = `Mondd: ${phrase.text}`;
  setPhraseListeningUi(false);
  setPhraseState("idle", "Készen áll.");
  phraseStatus.textContent = "🔊 → 🎤";
  hidePhraseSuccessBadge();
  setSpeechRecovery("phrase", false);
  syncBasicPractice();
}

async function playPhrase(phrase) {
  registerPlay();
  await speakVoice(`phrase_${phrase.id}`, undefined, {parts:phrase.text.split(' ').map((at, i) => ({at, target:`[data-phrase-part="${i}"]`}))});
}

async function startPhraseListeningAttempt() {
  const wholePhrase = twoWordPhrases[currentPhrase];
  const targetStep=state.settings.phraseParts?phraseStep:2;
  const phrase = targetStep<2 ? {...wholePhrase,text:wholePhrase.text.split(" ")[targetStep],targets:[wholePhrase.targets[targetStep]]} : wholePhrase;
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
      setPhraseState("success", state.detection.mode==='encouraging'?"Hallottuk a hangodat.":"Megvan a kifejezés!");
      showPhraseSuccessBadge();
      playSuccessSound();
      saveProgress();
      refreshStats();
      await burstConfettiOverlay(900);
      signal.throwIfAborted();
      completePhraseStep();
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
  if(state.detection.mode==='encouraging'){
    const result=await detectRVoiceActivity({signal,onStart});
    return {success:result.detected,reason:result.detected?'Hallottuk a hangodat.':'Próbáljuk meg együtt!'};
  }
  const matches=alternatives=>phrase.targets.length===2?matchTwoWordPhrase(phrase.targets,alternatives,TWO_WORD_MATCH_THRESHOLD).success:(alternatives||[]).some(text=>normalizeText(text).split(' ').some(token=>[phrase.targets[0].base,...phrase.targets[0].aliases].some(form=>similarityScore(normalizeText(form),token)>=TWO_WORD_MATCH_THRESHOLD)));
  const speech = await recognizeHungarianSpeech({
    timeoutMs: SPEECH_TIMING.phrase, signal, onStart,
    isMatch: result => matches(result.alternatives),
  });
  signal.throwIfAborted();
  if (speech.error && speech.error !== "no-speech") throw new Error(speechErrorMessage(speech.error));
  const success=matches(speech.alternatives);
  return {success, reason:success?"Megvan a kifejezés!":"Próbáljuk meg együtt még egyszer!"};
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
  const numberSummary=document.querySelector('#number-summary');
  if(numberSummary){
    const data=normalizeNumberProgress(state.numbers);
    const summaries=['count','quiz'].map(mode=>{
      const results=Object.entries(data.stats[mode]).filter(([,v])=>v.independent+v.helped).map(([n,v])=>`${n}-es mennyiség: ${v.independent} önálló, ${v.helped} segítséggel`).join('; ');
      return results?`${mode==='count'?'Számlálás':'Mennyiségkeresés'}: ${results}`:'';
    }).filter(Boolean);
    numberSummary.textContent=summaries.length?summaries.join('. '):'A befejezett számolási feladatok eredménye itt jelenik meg, mennyiségenként.';
  }

  const rSummary = document.querySelector('#r-practice-summary');
  if(rSummary){const games=Object.values(normalizeRProgress(state.rPractice).games);rSummary.textContent=`Közös körök: ${games.reduce((sum,game)=>sum+game.rounds,0)}. Mikrofonos próbák és képes találatok: ${games.reduce((sum,game)=>sum+game.practices,0)}. Felismert szavak vagy sorok: ${games.reduce((sum,game)=>sum+game.recognized,0)}. Közösen jelzett gyakorlások: ${games.reduce((sum,game)=>sum+game.confirmed,0)}.`;}
  const workshop = normalizeWorkshop(state.workshop);
  const workshopSummary = document.querySelector('#workshop-summary');
  if (workshopSummary) workshopSummary.textContent = Object.entries(WORKSHOP_NAMES).map(([kind, name]) => {
    const totals = workshop.games[kind].reduce((sum, result) => [sum[0] + result.independent, sum[1] + result.assisted], [0, 0]);
    return `${name}: ${totals[0]} önálló, ${totals[1]} segítséggel. `;
  }).join('');
  const logic = normalizeLogic(state.logic);
  const logicSummary = document.querySelector('#logic-summary');
  if (logicSummary) logicSummary.textContent = Object.entries(LOGIC_NAMES).map(([kind, name]) => {
    const totals = logic.games[kind].reduce((s,v) => [s[0]+v.independent,s[1]+v.assisted],[0,0]);
    return `${name}: ${totals[0]} önálló, ${totals[1]} segítséggel. `;
  }).join('');
  const meadow = normalizeMeadow(state.meadow);
  const summary = document.querySelector('#meadow-summary');
  if (summary) summary.textContent = `Almagyűjtés: ${meadow.collect.independent} önálló, ${meadow.collect.assisted} segítséggel. Terítés: ${meadow.serve.independent} önálló, ${meadow.serve.assisted} segítséggel. Közös piknikek: ${meadow.journeys}.`;
  playsCount.textContent = String(state.plays);
  attemptCount.textContent = String(state.attempts);
  rewardCount.textContent = String(state.rewards);
}

async function playWord(word, token = beginPlayback(), cue = narrationCue(`word_${word.id}`, currentScreen)) {
  registerPlay();
  if (state.settings.wordVoice === "natural") return speakVoice(`word_${word.id}`, token, cue);
  const src = `./audio/${word.id}.mp3`;
  const visual = narration.prepare(`word_${word.id}`, word.label, cue);
  const ok = await tryPlayFile(src, token, visual);
  if (!ok && token === playbackToken) {
    await speakVoice(`word_${word.id}`, token, cue);
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

async function playTeddyPrompt(word, { intro = false, force = false } = {}) {
  const token = beginPlayback();
  if (intro && (state.settings.spokenGuidance || force)) await speakVoice("guide_teddy", token);
  if (token !== playbackToken || currentScreen !== "teddy-game" || document.hidden) return;
  registerPlay();
  await speakVoice(`teddy_${word.id}`, token);
}

async function playDressPrompt(item, { intro = false, force = false } = {}) {
  const token = beginPlayback();
  if (intro && (state.settings.spokenGuidance || force)) await speakVoice("guide_dress", token);
  if (token !== playbackToken || currentScreen !== "dress-game" || document.hidden) return;
  registerPlay();
  await speakVoice(`dress_request_${item.id}`, token);
}

function stopPlayback() {
  audiobooks?.pause();
  playbackToken += 1;
  narration.stop();
  cancelPlayback?.();
  cancelPlayback = null;
  effects?.sync();
  cardsGrid.querySelectorAll(".is-speaking").forEach((card) => card.classList.remove("is-speaking"));
}

function beginPlayback() {
  stopPlayback();
  document.querySelector('#voice-status').hidden = true;
  return playbackToken;
}

async function tryPlayFile(src, token, visual) {
  const ok = await tryPlayFileWithBuffer(src, token, visual).catch(() => false);
  if (token !== playbackToken) return true;
  return ok || tryPlayFileWithElement(src, token, visual);
}

async function tryPlayFileWithBuffer(src, token, visual) {
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
      visual?.stop();
      try { source.stop(); source.disconnect(); } catch {}
      if (cancelPlayback === cancel) cancelPlayback = null;
      effects?.sync();
      resolve(result);
    };
    const cancel = () => finish(true);
    cancelPlayback = cancel;
    effects?.sync();
    source.onended = () => finish(true);
    try {
      source.start();
      const started = context.currentTime;
      visual?.start(() => context.currentTime - started);
      timer = setTimeout(() => finish(true), Math.min(buffer.duration * 1000 + 700, 60000));
    } catch {
      finish(false);
    }
  });
}

function tryPlayFileWithElement(src, token, visual) {
  if (token !== playbackToken) return Promise.resolve(true);
  return new Promise((resolve) => {
    const audio = new Audio(src);
    let visualStarted = false;
    let done = false;
    let timer;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      visual?.stop();
      audio.pause();
      if (cancelPlayback === cancel) cancelPlayback = null;
      effects?.sync();
      resolve(result);
    };
    const cancel = () => finish(true);
    cancelPlayback = cancel;
    effects?.sync();
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.onplaying = () => {
      if (!visualStarted && token === playbackToken) { visualStarted = true; visual?.start(() => audio.currentTime); }
    };
    timer = setTimeout(() => finish(false), 12000);
    audio.play().then(() => {
      if (done) return;
      clearTimeout(timer);
      timer = setTimeout(() => finish(true), Math.min((audio.duration || 2) * 1000 + 1200, 60000));
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
    meadow: normalizeMeadow(),
    logic: normalizeLogic(),
    workshop: normalizeWorkshop(),
    rPractice: normalizeRProgress(),
    numbers: normalizeNumberProgress(),
    puzzles: {},
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
      mathLimit: [5, 10, 20].includes(input.settings?.mathLimit) ? input.settings.mathLimit : 5,
      ...Object.fromEntries(['shopLevel','machineLevel','routeLevel'].map(key => [key, [1,2,3].includes(input.settings?.[key]) ? input.settings[key] : 1])),
      routeView: input.settings?.routeView === 'steps' ? 'steps' : 'map',
      spokenGuidance: input.settings?.spokenGuidance !== false,
      wordVoice: input.settings?.wordVoice === "family" ? "family" : "natural",
      numberLimit: [3, 5, 10].includes(input.settings?.numberLimit) ? input.settings.numberLimit : 3,
      listeningChoices: input.settings?.listeningChoices === 3 ? 3 : 2,
      memoryPairs: [2, 3, 4, 6].includes(input.settings?.memoryPairs) ? input.settings.memoryPairs : 3,
      ...normalizePuzzleOptions(input.settings),
      ...normalizeMontessoriOptions(input.settings),
      ...normalizeEffectOptions(input.settings),
      ...normalizePracticeSettings(input.settings),
      ...normalizeNumberSettings(input.settings),
      workshopLevel: [1, 2, 3].includes(input.settings?.workshopLevel) ? input.settings.workshopLevel : 1,
      ...normalizeWorkshopOptions(input.settings),
      pourLevel: [1, 2, 3].includes(input.settings?.pourLevel) ? input.settings.pourLevel : 1,
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

function getSpeechWords() {
  const favorites=words.filter(word=>state.settings.favoriteWords.includes(word.id));
  return state.settings.useFavorites && favorites.length ? favorites : getPracticeWords();
}

function buildAdaptiveSessionWords() {
  const ranked = shuffleNumbers([...getSpeechWords()])
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
  roundSuccess.cancel();
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
  effects.stop();
  listening = true;
  effects.sync();
  flipBusy = kind === "flip";
  document.querySelector("#stop-listening").hidden = kind !== "word" || autoSessionRunning;
  try {
    return await task(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) return false;
    const status = kind === "phrase" ? phraseStatus : kind === "flip" ? document.querySelector('#flip-status') : listenStatus;
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
      effects.sync();
      flipBusy = false;
      setListeningUi(false);
      setPhraseListeningUi(false);
      setEngineState("idle", "");
      setPhraseState("idle", "");
      document.querySelector("#stop-listening").hidden = true;

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
  if(autoSessionRunning&&state.settings.wordPracticeMode==='together')document.querySelector("#play-model").disabled=false;
  document.querySelector("#word-confirm").disabled=active||wordConfirmed;
  setButtonIcon(listenBtn, "mic");
  const label = active ? ready ? "Hallgatlak" : "Hang előkészítése" : "Most én mondom";
  listenBtn.setAttribute("aria-label", label);
  listenBtn.setAttribute("title", label);
  listeningIndicator.classList.toggle("is-hidden", !ready);
}

function setPhraseListeningUi(active, ready = active) {
  listenPhraseBtn.disabled = active || phraseConfirmed;
  playPhraseBtn.disabled = active;
  nextPhraseBtn.disabled = active;
  setButtonIcon(listenPhraseBtn, "mic");
  const label = active ? ready ? "Hallgatlak" : "Hang előkészítése" : "Most én mondom";
  listenPhraseBtn.setAttribute("aria-label", label);
  listenPhraseBtn.setAttribute("title", label);
  phraseListeningIndicator.classList.toggle("is-hidden", !ready);
  document.querySelector("#phrase-stop").hidden=!active;
  document.querySelector("#phrase-confirm").disabled=active||phraseConfirmed;
  document.querySelector("#phrase-round-start").disabled=active;
  document.querySelectorAll("#phrase-parts button").forEach(b=>b.disabled=active);
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

function playSuccessSound() { playEffect('success'); }
function playListeningStartSound() { playEffect('listen'); }

async function startAutoImitateSession() {
  roundSuccess.cancel();
  if(state.settings.wordPracticeMode==='together')return startTogetherWordRound();
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
  togetherWordRound=null;
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
  if (showStatus) listenStatus.textContent = state.settings.wordPracticeMode==='together'?"Mondjuk együtt!":"🔊 → 🎤";
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
  if(currentScreen==='listening-game'&&listeningGame?.getContext?.().mode==='bingo'||currentScreen==='memory'&&memoryGame?.getContext?.().mode==='sound'||currentScreen==='teddy-game'&&teddyGame?.getContext?.().mode==='expressive')return;
  state.plays += 1;
  saveProgress();
  refreshStats();
}

async function speakVoice(id, token = beginPlayback(), cue = narrationCue(id, currentScreen)) {
  const clip = VOICE_CLIPS[id];
  if (!clip || token !== playbackToken) return;
  const visual = narration.prepare(id, clip.text, cue);
  const played = await tryPlayFile(`./${clip.file}`, token, visual);
  if (!played && token === playbackToken) {
    visual.stop('unavailable');
    const status = document.querySelector('#voice-status');
    status.textContent = 'A hang most nem indul. Koppints újra a hangszóróra!';
    status.hidden = false;
  }
  return played;
}

async function speakVoiceSequence(ids) {
  const token = beginPlayback();
  for (const entry of ids) {
    if (token !== playbackToken) return;
    const {id, cue} = typeof entry === 'string' ? {id:entry} : entry;
    if (await speakVoice(id, token, cue) === false) return;
  }
}

function speakGuide(id, force = false) {
  if (!force && !state.settings.spokenGuidance) return Promise.resolve();
  if (id === "play_menu_more") return speakVoice("logic_play_menu");
  return speakVoice(`guide_${id}`);
}

async function showAnimalBookCredits() {
  roundSuccess.cancel();
  stopPlayback();
  const dialog = document.querySelector('#animal-book-credits');
  if (!dialog.open) dialog.showModal();
  const list = document.querySelector('#animal-book-credit-list');
  if (list.dataset.loaded) return;
  try {
    const response = await fetch('./animal-book-audio.json');
    if (!response.ok) throw new Error('Missing animal sound sources');
    const { sounds } = await response.json();
    const fragment = document.createDocumentFragment();
    const link = (text, url) => {
      const element = document.createElement('a');
      element.textContent = text;
      if (typeof url === 'string' && url.startsWith('https://')) {
        element.href = url;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
      }
      return element;
    };
    for (const sound of sounds) {
      const article = document.createElement('article');
      const title = document.createElement('h3');
      title.textContent = sound.label;
      const source = document.createElement('p');
      source.append(link(sound.title, sound.sourceUrl), ` — ${sound.author}`);
      const license = document.createElement('p');
      license.append('Licenc: ', link(sound.derivedLicense || sound.license, sound.licenseUrl));
      const changes = document.createElement('p');
      changes.textContent = sound.changes;
      article.append(title, source, license, changes);
      fragment.append(article);
    }
    list.replaceChildren(fragment);
    list.dataset.loaded = 'true';
  } catch {
    list.textContent = 'A hangok forrásjegyzékét most nem sikerült betölteni. Próbáld meg újra!';
  }
}

function innerBackButton() {
  // An exercise opened straight from a skill menu goes back to that menu, not to its game's own chooser.
  if (directEntry) return null;
  return innerBackSelectors[currentScreen] && document.getElementById(currentScreen)?.querySelector(innerBackSelectors[currentScreen]);
}
function updateBackButton() {
  // Once a directly opened game shows its own chooser, its exercises go back to that chooser again.
  if (directEntry && document.getElementById(currentScreen)?.matches('[data-game="menu"], [data-game="hub"], [data-mode="hub"]')) directEntry = false;
  const button = document.querySelector('#back-button');
  button.hidden = currentScreen === 'home';
  const destination = innerBackButton() ? screenInfo[currentScreen].title : screenInfo[appNavigation.trail.at(-2)?.screen || parentScreen(currentScreen)]?.title;
  button.setAttribute('aria-label', `Vissza: ${destination || 'Főképernyő'}`);
  button.title = `Vissza: ${destination || 'Főképernyő'}`;
}
function goBack() {
  if (document.querySelector('#back-button').disabled) return;
  roundSuccess.cancel();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  const internal = innerBackButton();
  if (internal) { internal.click(); updateBackButton(); window.scrollTo(0, 0); return; }
  if (appNavigation.ownedDepth > 0) { document.querySelector('#back-button').disabled = true; history.back(); return; }
  const route = { screen: parentScreen(currentScreen), category: selectedCategory, numberMode };
  appNavigation = restoreHistoryState(createHistoryState(canonicalTrail(route), 0));
  history.replaceState(createHistoryState(appNavigation.trail, 0), '');
  showScreen(route.screen, { pushHistory: false });
}
function syncNumberMode() {
  document.querySelectorAll('.number-mode').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === numberMode)));
  document.querySelector('#number-count-view').hidden = numberMode !== 'count';
  document.querySelector('#number-quiz-view').hidden = numberMode !== 'quiz';
}

// The skill menus come from GROUPS. A card opens its game, straight into one exercise when it names a kind.
function renderMenus() {
  for (const group of GROUPS) {
    const panel = document.getElementById(group.screen);
    panel.dataset.cards = String(group.cards.length);
    panel.dataset.sections = String(group.sections.length);
    panel.innerHTML = group.sections.map(entry => `${entry.title ? `<h2 class="menu-section-title">${entry.title}</h2>` : ''}<div class="game-menu-grid">${entry.cards.map(item => {
      const target = item.mode
        ? `class="game-menu-card number-mode" data-mode="${item.mode}" aria-pressed="false"`
        : `class="game-menu-card" data-open="${item.screen}"${item.kind ? ` data-kind="${item.kind}"` : ''}`;
      return `<button ${target} aria-label="${item.title}"><span class="game-menu-icon" aria-hidden="true">${item.icon}</span><span><strong>${item.title}</strong><small>${item.note}</small></span><span class="game-age" aria-hidden="true">${item.ages} év</span><span class="game-menu-arrow" aria-hidden="true">→</span></button>`;
    }).join('')}</div>`).join('');
  }
}

function setupNavigation() {
  renderMenus();
  document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => showScreen(button.dataset.open, button.dataset.kind ? { gameOptions: { kind: button.dataset.kind, mode: button.dataset.kind } } : {}));
  });
  document.querySelector("#home-button").addEventListener("click", () => showScreen("home"));
  document.querySelector('#back-button').addEventListener('click', goBack);
  for (const screen of Object.keys(innerBackSelectors)) {
    new MutationObserver(updateBackButton).observe(document.getElementById(screen), { childList: true });
  }
  document.querySelector("#help-button").addEventListener("click", () => {
    if (listening || autoSessionRunning) stopAutoImitateSession(false);
    primeSfx();
    if (currentScreen === "numbers" && numberMode === "quiz") speakNumberQuestion();
    else if (currentScreen === "flip") flipGame.repeat();
    else if (currentScreen === "numbers") numberGame.repeat();
    else if (currentScreen === "meseliget") meadowGame.repeat();
    else if (currentScreen === "furfangliget") logicGame.repeat();
    else if (currentScreen === "memory") memoryGame.repeat();
    else if (currentScreen === "pour") pourGame.repeat();
    else if (currentScreen === "puzzle") puzzleGame.repeat();
    else if (currentScreen === "city-story") cityStoryGame.repeat();
    else if (currentScreen === "differences") differencesGame.repeat();
    else if (currentScreen === "patterns") patternsGame.repeat();
    else if (currentScreen === "montessori") montessoriGame.repeat();
    else if (currentScreen === "chess") chessGame.repeat();
    else if (currentScreen === "engineering") engineeringGame.repeat();
    else if (currentScreen === "workshop") workshopGame.repeat();
    else if (currentScreen === "animal-book") animalBook.repeat();
    else if (currentScreen === "audiobooks") audiobooks.repeat();
    else if (currentScreen === "r-practice") rPractice.repeat();
    else if (currentScreen === "dress-game") dressGame.repeat({ intro: true, force: true });
    else if (currentScreen === "teddy-game") teddyGame.repeat({ intro: true, force: true });
    else if (currentScreen === "listening-game") listeningGame.repeat({ intro: true, force: true });
    else speakGuide(screenInfo[currentScreen]?.guide || "welcome", true);
  });
  document.querySelector("#parent-button").addEventListener("click", showParentGate);
  document.querySelector("#close-parent-gate").addEventListener("click", () => document.querySelector("#parent-gate").close());
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-related-source]');
    if(!button||document.hidden)return;
    const source=button.dataset.relatedSource;
    if((source.startsWith('numbers-')?'numbers':source)!==currentScreen)return;
    const task=nextTask(source,button.dataset.relatedKind);if(!task)return;
    if(source==='two-word'&&task.screen==='teddy-game')task.phraseId=twoWordPhrases[currentPhrase].id;
    if(task.numberMode)numberMode=task.numberMode;
    if(task.screen==='two-word'){phraseTopic=task.topic||'all';phraseGroup='all';phraseQueue=[];currentPhrase=nextPhraseIndex();}
    showScreen(task.screen,{announce:task.screen==='listening-game',gameOptions:task});
  });
  document.querySelector("#round-home").addEventListener("click", () => showScreen("home"));
  document.querySelector('#round-back').addEventListener('click', goBack);
  document.querySelector("#round-replay").addEventListener("click", () => {
    document.querySelector("#round-complete").close();
    if (completedRoundKind === "flip") showScreen("flip");
    else if (completedRoundKind === "dress-game") showScreen("dress-game");
    else if (completedRoundKind === "teddy-game") showScreen("teddy-game",{gameOptions:teddyGame.getContext?.()||{}});
    else if (completedRoundKind === "listening-game") showScreen("listening-game",{gameOptions:listeningGame.getContext?.()||{}});
    else if (completedRoundKind === "memory") showScreen("memory",{gameOptions:memoryGame.getContext?.()||{}});
    else if (completedRoundKind === "pour") showScreen("pour");
    else if (completedRoundKind === "puzzle") {showScreen("puzzle");puzzleGame.restart();}
    else if (completedRoundKind === "differences") showScreen("differences", { gameOptions: differencesGame.getContext() });
    else if (completedRoundKind === "patterns") showScreen("patterns", { gameOptions: patternsGame.getContext() });
    else if (completedRoundKind.startsWith("numbers-")) { numberMode=completedRoundKind.slice(8); showScreen("numbers",{announce:false}); numberGame.start(numberMode,{fresh:true}); }
    else if(completedRoundKind==='two-word'){currentPhrase=nextPhraseIndex();showScreen('two-word');startPhraseRound();}
    else if (completedRoundKind === "chess") { if (!chessGame.nextPuzzle()) showScreen("chess"); }
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
  history.replaceState(createHistoryState(appNavigation.trail, 0), "");
  updateBackButton();
  window.addEventListener("popstate", event => {
    document.querySelector('#back-button').disabled = false;
    appNavigation = restoreHistoryState(event.state);
    selectedCategory = appNavigation.route.category;
    numberMode = appNavigation.route.numberMode;
    if (appNavigation.route.screen === 'parent') {
      appNavigation = restoreHistoryState(null);
      history.replaceState(createHistoryState(appNavigation.trail, 0), '');
      showScreen('home', { pushHistory: false, announce: false });
      showParentGate();
      return;
    }
    showScreen(appNavigation.route.screen, { pushHistory: false, announce: false });
  });
}

function showScreen(screen, { announce = true, gameOptions = {}, pushHistory = true, allowParent = false } = {}) {
  if (!screenInfo[screen]) return;
  roundSuccess.cancel();
  if (screen === "parent" && !allowParent) {
    showParentGate();
    return;
  }
  if (playTime?.tick({ notify: false }).locked && screen !== 'parent') {
    screen = 'play-break'; announce = false;
  }
  stopAutoImitateSession(false);
  effects?.stop();
  listeningGame?.stop();
  teddyGame?.stop();
  dressGame?.stop();
  meadowGame?.stop();
  logicGame?.stop();
  memoryGame?.stop();
  puzzleGame?.stop();
  differencesGame?.stop();
  cityStoryGame?.stop();
  patternsGame?.stop();
  montessoriGame?.stop();
  chessGame?.stop();
  engineeringGame?.stop();
  workshopGame?.stop();
  animalBook?.stop();
  audiobooks?.stop();
  pourGame?.stop();
  rPractice?.stop();
  numberGame?.stop();
  flipGame?.stop();
  if (cloudResumePending) disconnectCloud();
  progressTools?.cancelPending();
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
  primeSfx();
  const previousScreen = currentScreen;
  currentScreen = screen;
  directEntry = Boolean(gameOptions.kind);
  if (pushHistory) {
    const trail = transitionTrail(appNavigation.trail, { screen, category: selectedCategory, numberMode });
    const depth = screen === 'home' ? 0 : previousScreen === screen ? appNavigation.ownedDepth : appNavigation.ownedDepth + 1;
    const next = createHistoryState(trail, depth);
    appNavigation = restoreHistoryState(next);
    if (previousScreen !== screen) history.pushState(next, '');
    else history.replaceState(next, '');
  }
  document.body.dataset.screen = screen;
  panels.forEach(panel => panel.classList.toggle("is-active", panel.id === screen));
  const title = document.querySelector("#screen-title");
  title.textContent = screen === "cards"
    ? wordCategories.find(category => category.id === selectedCategory).label
    : screen === 'numbers' ? numberMode === 'quiz' ? 'Keresd meg!' : 'Számoljuk meg!' : screenInfo[screen].title;
  syncProfileControls();
  syncNumberMode();
  updateBackButton();
  document.querySelector("#help-button").hidden = ['parent', 'play-break'].includes(screen);
  if (screen === "cards") renderCards();
  if (screen === "imitate") { const pool=getSpeechWords();if(!pool.some(w=>w.id===words[currentImitate].id))currentImitate=words.findIndex(w=>w.id===pool[0].id);renderImitate(); renderRoundProgress(); }
  if (screen === "two-word") {phraseRound=null;phraseStep=0;phraseConfirmed=false;renderTwoWordMode();}
  if (screen === "flip") renderFlipGame();
  if (screen === "listening-game") listeningGame.start({ ...gameOptions, announce });
  if (screen === "teddy-game") teddyGame.start({ ...gameOptions, announce });
  if (screen === "dress-game") dressGame.start({ announce });
  if (screen === "meseliget") meadowGame.start({ announce });
  if (screen === "furfangliget") logicGame.start(gameOptions);
  if (screen === "memory") memoryGame.start(gameOptions);
  if (screen === "puzzle") puzzleGame.start();
  if (screen === "city-story") cityStoryGame.start({ announce });
  if (screen === "differences") differencesGame.start(gameOptions);
  if (screen === "patterns") patternsGame.start({ ...gameOptions, announce });
  if (screen === "montessori") montessoriGame.start(gameOptions);
  if (screen === "chess") chessGame.start();
  if (screen === "engineering") engineeringGame.start(gameOptions);
  if (screen === "workshop") workshopGame.start(gameOptions);
  if (screen === "animal-book") animalBook.start();
  if (screen === "audiobooks") audiobooks.start();
  if (screen === "pour") pourGame.start();
  if (screen === "r-practice") {rPractice.start();if(gameOptions.kind)rPractice.open(gameOptions.kind);}
  if (screen === "numbers" && numberMode === "count") renderNumbers();
  if (screen === 'numbers' && numberMode === 'quiz') renderNumberQuiz();
  title.tabIndex = -1;
  title.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (announce && !["listening-game", "teddy-game", "dress-game", "numbers", "flip"].includes(screen) && screenInfo[screen].guide) speakGuide(screenInfo[screen].guide);
  offlineClient?.notifyScreenChange();
  if (timedScreens.has(screen) && screen !== 'audiobooks') playTime?.start();
  else playTime?.tick();
}

function showParentGate({ unlockTime = false } = {}) {
  roundSuccess.cancel();
  stopPlayback();
  parentGateUnlocksTime = unlockTime;
  const dialog = document.querySelector("#parent-gate");
  // Two-digit sums and six choices; a wrong tap draws a new question, so guessing does not open it.
  const ask = () => {
    const a = 14 + Math.floor(Math.random() * 25);
    const b = 12 + Math.floor(Math.random() * 25);
    const correct = a + b;
    document.querySelector("#parent-gate-question").textContent = `Mennyi ${a} + ${b}?`;
    const answers = document.querySelector("#parent-gate-answers");
    answers.replaceChildren();
    shuffleNumbers([correct, correct - 10, correct + 10, correct - 1, correct + 1, correct + 2]).forEach(value => {
      const button = document.createElement("button");
      button.textContent = value;
      button.addEventListener("click", () => {
        if (value === correct) {
          if (parentGateUnlocksTime) {
            dialog.close();
            playTime.renew();
            showScreen('home', { announce: false });
          } else showScreen("parent", { announce: false, allowParent: true });
          return;
        }
        document.querySelector("#parent-gate-status").textContent = "Ez nem jó. Itt egy új kérdés.";
        ask();
      });
      answers.appendChild(button);
    });
  };
  document.querySelector("#parent-gate-status").textContent = "";
  ask();
  dialog.showModal();
}

function setupParentSettings() {
  const routeView = document.querySelector('#route-view');
  routeView.value = state.settings.routeView;
  routeView.addEventListener('change', () => { state.settings.routeView = routeView.value === 'steps' ? 'steps' : 'map'; saveProgress(); });
  for (const [id,key] of [['math-limit','mathLimit'],['shop-level','shopLevel'],['machine-level','machineLevel'],['route-level','routeLevel'],['memory-pairs','memoryPairs'],['workshop-level','workshopLevel']]) {
    const select = document.querySelector(`#${id}`); select.value = state.settings[key];
    select.addEventListener('change', () => {state.settings[key] = Number(select.value); saveProgress();});
  }
  // The parent choice sets all three workshops; each game can still change its own level.
  document.querySelector('#workshop-level').addEventListener('change', () => { Object.assign(state.settings, normalizeWorkshopOptions({ workshopLevel: state.settings.workshopLevel })); saveProgress(); });
  const roundLength = document.querySelector("#round-length");
  const topic = document.querySelector("#practice-topic");
  const wordVoice = document.querySelector("#word-voice");
  const guidance = document.querySelector("#spoken-guidance");
  const effectsEnabled = document.querySelector('#sound-effects');
  const effectsVolume = document.querySelector('#effects-volume');
  const effectsPreview = document.querySelector('#effects-preview');
  const syncEffectsControls = () => {
    effectsEnabled.checked = state.settings.soundEffects;
    effectsVolume.value = Math.round(state.settings.effectsVolume * 100);
    document.querySelector('#effects-volume-value').textContent = `${effectsVolume.value}%`;
    effectsVolume.disabled = !state.settings.soundEffects;
    effectsPreview.disabled = !state.settings.soundEffects || state.settings.effectsVolume === 0;
    effects?.sync();
  };
  syncEffectsControls();
  effectsEnabled.addEventListener('change', () => { state.settings.soundEffects = effectsEnabled.checked; effects.stop(); syncEffectsControls(); saveProgress(); });
  effectsVolume.addEventListener('input', () => { state.settings.effectsVolume = Number(effectsVolume.value) / 100; syncEffectsControls(); });
  effectsVolume.addEventListener('change', () => { saveProgress(); playEffect('wood'); });
  effectsPreview.addEventListener('click', () => effects.preview());
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
  document.querySelector("#number-level").value = state.settings.numberLimit;
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
  roundSuccess.schedule(() => {
    const screen = kind.startsWith('numbers-') ? 'numbers' : kind;
    if (currentScreen !== screen || document.querySelector('dialog[open]')) return;
    completedRoundKind = kind;
    playSuccessSound();
    burstConfettiOverlay(1000);
    document.querySelector("#complete-stars").textContent = "⭐".repeat(Math.min(count, 5));
    document.querySelector("#round-complete-title").textContent = kind === "dress-game" ? "Indulhat a séta!" : kind === "memory" ? "Minden pár megvan!" : kind === "puzzle" ? "Elkészült a kép!" : kind === "differences" ? "Minden különbséget megtaláltál!" : kind === "patterns" ? "Sikerült folytatnod a mintát!" : kind === "chess" ? count === 3 ? "Megvan a három csillag!" : "Szép sakkmegoldás!" : "De jó volt együtt!";
    const nextPuzzle = kind === 'chess' && chessGame.canAdvance();
    const continueButton = document.querySelector('#round-replay');
    continueButton.classList.add('round-next');
    continueButton.setAttribute('aria-label', nextPuzzle ? 'Következő feladat' : 'Még egy ilyen');
    setButtonIcon(continueButton, nextPuzzle ? 'next' : 'repeat');
    {
      const label = document.createElement('span');
      label.textContent = nextPuzzle?'Következő feladat':'Még egy ilyen';
      continueButton.append(label);
    }
    document.querySelector("#round-related").innerHTML=relatedTaskMarkup(kind);
    document.querySelector("#round-complete").showModal();
    if (nextPuzzle) continueButton.focus({ preventScroll: true });
    if (kind === "pour") speakVoice('pour_done');
    else if (kind === "memory") speakVoice('memory_done');
    else if (kind === "puzzle") speakVoice('puzzle_done');
    else if (kind === "differences" && state.settings.spokenGuidance) speakVoice('differences_done');
    else if (kind === "patterns" && state.settings.spokenGuidance) speakVoice('patterns_done');
    else if (kind === "chess" && state.settings.spokenGuidance) speakVoice(count === 3 ? 'chess_done' : 'chess_solved');
    else if (kind === "chess") return;
    else if ((kind === "differences" || kind === "patterns") && !state.settings.spokenGuidance) return;
    else speakGuide(kind === "dress-game" ? "dress_finished" : kind === "teddy-game" ? "teddy_finished" : "finished");
  });
}
