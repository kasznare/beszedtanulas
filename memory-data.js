export const MEMORY_CLIPS = {
  memory_start: 'Keress egyforma képeket! Fordíts fel két kártyát!',
  memory_hint: 'Nézzük meg együtt a képeket! Jegyezd meg, melyik hol van!',
  memory_match: 'Ez egy pár! A két kép egyforma.',
  memory_done: 'Minden pár megvan! Szép munka!',
};
export const MEMORY_TIMING_KEY = 'beszedtanulas.memoryTiming.v1';
export function normalizeMemoryTiming(value) {
  return {
    mismatchMs: [1100, 2000, 3500].includes(value?.mismatchMs) ? value.mismatchMs : 1100,
    previewMs: [3500, 7000, 0].includes(value?.previewMs) ? value.previewMs : 3500,
  };
}

export function buildMemoryDeck(pool, pairCount = 3, random = Math.random) {
  const unique = [...new Map(pool.map(word => [word.id, word])).values()];
  if (unique.length < 2) throw new Error('A párosítóhoz legalább két külön kép kell.');
  const shuffle = items => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const count = Math.min(unique.length, [2, 3, 4, 6].includes(pairCount) ? pairCount : 3);
  return shuffle(shuffle(unique).slice(0, count).flatMap(word => [0, 1].map(copy => ({ key: `${word.id}-${copy}`, word }))));
}
