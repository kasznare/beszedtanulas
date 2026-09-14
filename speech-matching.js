export function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function similarityScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

// Two different spoken tokens must occur in ONE recognition alternative.
// Word order is deliberately flexible; toddler aliases remain accepted.
export function matchTwoWordPhrase(targets, alternatives, threshold = 0.68) {
  let best = { success: false, scores: [0, 0], transcript: "" };
  if (targets.length !== 2) return best;
  const forms = targets.map(target =>
    [...new Set([target.base, ...(target.aliases || [])].map(normalizeText).filter(Boolean))],
  );
  for (const transcript of alternatives || []) {
    const tokens = normalizeText(transcript).split(" ").filter(Boolean);
    if (tokens.length < 2) continue;
    const scores = forms.map(aliases => tokens.map(token =>
      Math.max(0, ...aliases.map(alias => similarityScore(alias, token))),
    ));
    for (let first = 0; first < tokens.length; first += 1) {
      for (let second = 0; second < tokens.length; second += 1) {
        if (first === second) continue;
        const pair = [scores[0][first], scores[1][second]];
        if (pair.every(score => score >= threshold)) {
          return { success: true, scores: pair, transcript };
        }
        if (Math.min(...pair) > Math.min(...best.scores)) {
          best = { success: false, scores: pair, transcript };
        }
      }
    }
  }
  return best;
}
