// The browser's result list is a current snapshot, not an append-only history.
// Each index is a consecutive spoken segment; alternatives within an index
// are mutually exclusive. See MDN SpeechRecognitionEvent.results.
export function collectSpeechResults(results) {
  let candidates = [{ text: "", confidence: 0 }];
  let segments = 0;
  let isFinal = true;
  for (const result of Array.from(results || [])) {
    const alternatives = Array.from(result || []).slice(0, 5)
      .filter(alt => typeof alt?.transcript === "string" && alt.transcript.trim())
      .map(alt => ({ text: alt.transcript.trim(), confidence: Number.isFinite(alt.confidence) ? alt.confidence : 0 }));
    if (!alternatives.length) continue;
    segments += 1;
    isFinal &&= result.isFinal === true;
    const combined = candidates.flatMap(prefix => alternatives.map(alt => ({
      text: `${prefix.text} ${alt.text}`.trim(), confidence: prefix.confidence + alt.confidence,
    }))).sort((a, b) => b.confidence - a.confidence);
    const seen = new Set();
    candidates = combined.filter(candidate => {
      if (seen.has(candidate.text)) return false;
      seen.add(candidate.text);
      return true;
    }).slice(0, 10);
  }
  const alternatives = segments ? candidates.map(candidate => candidate.text) : [];
  return { transcript: alternatives[0] || "", alternatives, confidence: segments ? candidates[0].confidence / segments : 0, isFinal: segments > 0 && isFinal };
}

export const SPEECH_TIMING = { word: 6500, phrase: 9000, startup: 4000, finalResult: 900 };

export async function recognizeHungarianSpeech({
  SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition,
  timeoutMs = SPEECH_TIMING.word, onPartial, onStart, isMatch = () => true, signal,
  startupMs = SPEECH_TIMING.startup, finalResultMs = SPEECH_TIMING.finalResult,
} = {}) {
  const empty = { transcript: "", alternatives: [], confidence: 0, isFinal: false };
  if (signal?.aborted) return { ...empty, error: "aborted" };
  if (!SpeechRecognition) return { ...empty, error: "unsupported" };
  let readyNotified = false;
  const notifyStart = () => {
    if (readyNotified) return;
    readyNotified = true;
    onStart?.();
  };
  const options = { SpeechRecognition, timeoutMs, onPartial, onStart: notifyStart, isMatch, signal, startupMs, finalResultMs };
  const result = await recognizeOnce({ ...options, lang: "hu-HU" });
  // Silence and network/permission errors are not reasons to switch languages.
  if (result.error !== "language-not-supported" || signal?.aborted) return result;
  return recognizeOnce({ ...options, lang: "hu" });
}

function recognizeOnce({ SpeechRecognition, lang, timeoutMs, onPartial, onStart, isMatch, signal, startupMs, finalResultMs }) {
  return new Promise(resolve => {
    let recognition;
    let current = collectSpeechResults([]);
    let settled = false, started = false, stopping = false;
    let startupTimer, listenTimer, finalTimer;
    const finish = (error = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(startupTimer); clearTimeout(listenTimer); clearTimeout(finalTimer);
      signal?.removeEventListener("abort", cancel);
      if (recognition) {
        recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
        try { recognition.abort(); } catch {}
      }
      resolve({ ...current, error, lang });
    };
    const cancel = () => finish("aborted");
    const stopAndWait = () => {
      if (settled || stopping) return;
      stopping = true;
      // stop() may deliver the final transcript asynchronously. Keep handlers
      // attached until end, a matching final result, or this bounded grace time.
      finalTimer = setTimeout(() => finish(), finalResultMs);
      try { recognition.stop(); } catch { finish(); }
    };
    const ready = () => {
      if (settled || started || signal?.aborted) return;
      started = true;
      clearTimeout(startupTimer);
      listenTimer = setTimeout(stopAndWait, timeoutMs);
      onStart?.();
    };
    if (signal?.aborted) { finish("aborted"); return; }
    try {
      recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.maxAlternatives = 5;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onstart = ready;
      recognition.onresult = event => {
        if (settled || signal?.aborted) return;
        ready();
        if (settled || signal?.aborted) return;
        current = collectSpeechResults(event.results);
        onPartial?.({ ...current, raw: `[${lang}] ${current.alternatives.join(" | ")}` });
        if (current.isFinal && isMatch(current)) finish();
      };
      recognition.onerror = event => finish(event?.error || "recognition-error");
      recognition.onend = () => finish(started ? "" : "start-error");
      signal?.addEventListener("abort", cancel, { once: true });
      startupTimer = setTimeout(() => finish("start-timeout"), startupMs);
      recognition.start();
    } catch (error) {
      finish(error?.name === "NotAllowedError" ? "not-allowed" : "start-error");
    }
  });
}

export function speechErrorMessage(code) {
  if (["not-allowed", "service-not-allowed"].includes(code)) return "A böngésző nem engedélyezi a beszédfelismerést. Ellenőrizd a mikrofon és a beszédfelismerés engedélyeit a készüléken.";
  if (code === "network") return "A beszédfelismerő szolgáltatás nem érhető el. Ellenőrizd az internetkapcsolatot; addig a képes játékok használhatók.";
  if (code === "language-not-supported") return "A böngésző most nem támogatja a magyar beszédfelismerést. Próbáld a bátorító módot vagy a képes játékot.";
  if (code === "unsupported") return "Ebben a böngészőben nincs beszédfelismerés. A bátorító mód és a képes játékok továbbra is használhatók.";
  if (code === "audio-capture") return "A beszédfelismerő nem fér hozzá a mikrofonhoz. Ellenőrizd az engedélyeket és a csatlakoztatott hangeszközt.";
  return "A beszédfelismerő nem indult el vagy megszakadt. Indíts új próbát, vagy válaszd a képes játékot.";
}
