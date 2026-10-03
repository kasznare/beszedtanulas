export const MEMORY_CLIPS = {
  memory_start: 'Keress egyforma képeket! Fordíts fel két kártyát!',
  memory_hint: 'Nézzük meg együtt a képeket! Jegyezd meg, melyik hol van!',
  memory_match: 'Ez egy pár! A két kép egyforma.',
  memory_done: 'Minden pár megvan! Szép munka!',
};

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
