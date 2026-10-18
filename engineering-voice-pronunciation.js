// Scoped Eleven v4 IPA for the seven new engineering instructions.
// Keep the displayed Hungarian text in engineering-data.js unchanged.
export const ENGINEERING_PHONETIC_IDS = Object.freeze([
  'engineering_hub', 'engineering_drop', 'engineering_build',
  'engineering_bridge', 'engineering_water', 'engineering_success',
  'engineering_retry',
]);

// Selective IPA marks the Hungarian vowel lengths and cs/s/sz/gy/ny clusters
// that recur in these prompts. Untagged words retain their Hungarian spelling.
export const ENGINEERING_WORD_IPA = Object.freeze({
  építsünk: 'ˈeːpiːt͡ʃyŋk',
  építs: 'ˈeːpiːt͡ʃ',
  építményt: 'ˈeːpiːtmeːɲt',
  toronyra: 'ˈtoroɲrɒ',
  koppints: 'ˈkopːint͡ʃ',
  szigetre: 'ˈsiɡɛtrɛ',
  vízbe: 'ˈviːzbɛ',
  széles: 'ˈseːlɛʃ',
  rúddal: 'ˈruːdːɒl',
  csobbant: 'ˈt͡ʃobːɒnt',
  átért: 'ˈaːteːrt',
  híd: 'ˈhiːd',
  rakományt: 'ˈrɒkomaːɲt',
  átlós: 'ˈaːtloːʃ',
  rudakkal: 'ˈrudɒkːɒl',
});

const WORD = /[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu;
export function phoneticEngineeringText(id, text, commonWords = {}) {
  if (!ENGINEERING_PHONETIC_IDS.includes(id)) return null;
  return text.replace(WORD, word => {
    const key = word.toLocaleLowerCase('hu-HU');
    const ipa = ENGINEERING_WORD_IPA[key] || commonWords[key];
    return ipa ? `/${ipa}/` : word;
  });
}
