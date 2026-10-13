import { words, twoWordPhrases } from './game-data.js';

export const PORTAL_CLIPS = {
  practice_together: 'Hallgassuk meg, és mondjuk együtt! Ha kimondtátok, koppints a pipára!',
  practice_parts: 'Először külön a szavakat, aztán együtt a kifejezést!',
  practice_part_done: 'Ez a szó megvan. Most jöhet a következő!',
  practice_round_done: 'Elkészült a közös gyakorlókör!',
  counting_total: 'Megszámoltuk! Összesen:',
  counting_self: 'Számold meg a tárgyakat! A végén megmutatjuk, hány van összesen.',
  counting_compare: 'Nézzük meg párokban! Az egyik sor a választott kép, a másik a kért mennyiség.',
  counting_retry: 'Számoljuk meg együtt a választott képet!',
  counting_more: 'Ennél több tárgyat keresünk.',
  counting_less: 'Ennél kevesebb tárgyat keresünk.',
  flip_preview: 'Nézd meg, melyik kép hol bújik meg! Ha készen állsz, takarjuk le!',
  flip_missing: 'Nézd meg a képeket! Azután egy elbújik. Melyik hiányzik?',
  flip_choose_missing: 'Egy kép elbújt. Válaszd ki alul, melyik hiányzik!',
  flip_retry: 'Ez most nem az a kép. Nézzük meg újra!',
  flip_find: 'Hol bújt el? Keresd meg a képét!',
  listening_help: 'Nézzük meg együtt! Ez a kép tartozik a hallott szóhoz.',
};
for (const phrase of twoWordPhrases) phrase.text.split(' ').forEach((part,i) => { PORTAL_CLIPS[`phrase_part_${phrase.id}_${i}`] = part; });

export function practiceWordPool(settings = {}) {
  const favoriteIds = Array.isArray(settings.favoriteWords) ? settings.favoriteWords : [];
  return words.filter(word => favoriteIds.includes(word.id));
}
export function normalizePracticeSettings(settings = {}) {
  return {
    wordPracticeMode: settings.wordPracticeMode === 'microphone' ? 'microphone' : 'together',
    phrasePracticeMode: settings.phrasePracticeMode === 'microphone' ? 'microphone' : 'together',
    phraseParts: settings.phraseParts === true,
    favoriteWords: [...new Set(Array.isArray(settings.favoriteWords) ? settings.favoriteWords.filter(id => words.some(w=>w.id===id)) : [])].slice(0,5),
    useFavorites: settings.useFavorites === true,
    listeningDifficulty: settings.listeningDifficulty === 'similar' ? 'similar' : 'different',
    flipMode: ['free','find','missing'].includes(settings.flipMode) ? settings.flipMode : 'free',
  };
}
