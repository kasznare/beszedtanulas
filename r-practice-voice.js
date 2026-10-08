import { R_WORDS, R_DISTRACTORS, R_RHYMES } from './r-practice-data.js';

export const R_CLIPS = {
  r_hub:'Róka és robot vár rád! Hallgassunk szavakat, mondjunk mondókát, és játsszunk együtt!',
  r_hunter:'Hallgasd meg a szót! Koppints a képére!',
  r_hunter_sound:'Hallgasd meg a képek nevét! Keresd meg azt, amelyikben hallod az R hangot!',
  r_post:'Robot csomagot vár. Hallgasd meg a szót, és mondd utánam!',
  r_workshop:'Díszítsük fel a perecműhelyt! Hallgasd meg a szót, és mondd utánam!',
  r_rhyme:'Hallgassunk mondókát! Koppints egy sorra, és mondd utánam!',
  r_echo:'Hallgasd meg a mintát! A mikrofon gombbal felveheted a saját hangodat.',
  r_try:'Most te jössz!',
  r_retry:'Hallgassuk meg még egyszer! Próbálhatjuk együtt is.',
  r_found:'Megtaláltad a képet!',
  r_try_thanks:'Köszönöm, hogy próbálkoztál!',
  r_delivered:'Elindult a csomag! Robot örül neki.',
  r_decorated:'Új dísz került a műhelybe!',
  r_round_done:'Elkészült a közös játék! Jöhet egy újabb kaland.',
};
for (const word of [...R_WORDS,...R_DISTRACTORS]) R_CLIPS[`r_word_${word.id}`]=word.text;
for (const word of R_WORDS) R_CLIPS[`r_phrase_${word.id}`]=word.phrase;
for (const rhyme of R_RHYMES) rhyme.lines.forEach(([text],i)=>{R_CLIPS[`r_rhyme_${rhyme.id}_${i}`]=text;});
