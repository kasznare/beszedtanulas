import { R_PHRASE_VARIANTS, R_WORDS, R_DISTRACTORS, R_RHYMES, R_RHYME_EXTRA_WORDS, R_POST_MISSIONS, R_RHYME_PARTS } from './r-practice-data.js';

export const R_CLIPS = {
  r_post_wishes: 'Minden ház mást kér. Mondd a szót, aztán vidd a csomagot ahhoz, aki kérte!',
  r_hub:'Róka és robot vár rád! Hallgassunk szavakat, mondjunk mondókát, és játsszunk együtt!',
  r_hunter:'Hallgasd meg a szót! Koppints a képére!',
  r_hunter_sound:'Hallgasd meg a képek nevét! Keresd meg azt, amelyikben hallod az R hangot!',
  r_hunter_position:'Hallgasd meg a szót! Mutasd meg, hol hallod az R hangot: az elején, a közepén vagy a végén!',
  r_position_initial:'A szó elején hallod az R hangot.',
  r_position_medial:'A szó közepén hallod az R hangot.',
  r_position_final:'A szó végén hallod az R hangot.',
  r_post:'Két összetartozó csomagot kézbesítünk. Mondd a szót, aztán válassz egy házat!',
  r_workshop:'Díszítsük fel a perecműhelyt! Mondd utánam a szót, válassz díszt, és tedd a műhelybe!',
  r_rhyme:'Hallgassunk mondókát! Koppints egy sorra, és mondd utánam!',
  r_rhyme_gap:'Elbújt egy szó a mondókából. Hallgasd meg a sort, és keresd meg a hiányzó szó képét!',
  r_echo:'Hallgasd meg a mintát! A mikrofon gombbal felveheted a saját hangodat.',
  r_try:'Most te jössz!',
  r_compare:'Hallgassuk meg ezt a két szót! Figyeld a világító képet!',
  r_post_ready:'Kész a csomag! Koppints annak a házára, akinek küldöd!',
  r_decorate_choose:'Válassz egy díszt! Utána koppints egy helyre a műhelyben!',
  r_rhyme_repeat:'Most mondjátok ti! Ha készen vagytok, jöhet a következő rész.',
  r_story:'Tegyük sorba a mondóka képeit! Melyik volt először?',
  r_story_retry:'Nézzük meg újra! Meghallgathatod a képet a hanggombjával.',
  r_story_done:'Sorba rendeztük a mondóka képeit!',
  r_echo_compare:'Először a minta, utána a saját hangod szól.',
  r_echo_yours:'Most a saját hangod következik.',
  r_retry:'Hallgassuk meg még egyszer! Próbálhatjuk együtt is.',
  r_found:'Megtaláltad a képet!',
  r_try_thanks:'Köszönöm, hogy próbálkoztál!',
  r_delivered:'Megérkezett a csomag! Köszönöm a kézbesítést.',
  r_decorated:'Új dísz került a műhelybe!',
  r_round_done:'Elkészült a közös játék! Jöhet egy újabb kaland.',
};
for (const word of [...R_WORDS,...R_DISTRACTORS]) R_CLIPS[`r_word_${word.id}`]=word.text;
for (const word of R_WORDS) R_CLIPS[`r_phrase_${word.id}`]=word.phrase;
for (const word of R_RHYME_EXTRA_WORDS) R_CLIPS[`r_puzzle_word_${word.id}`]=word.text;
for (const rhyme of R_RHYMES) rhyme.lines.forEach(([text],i)=>{R_CLIPS[`r_rhyme_${rhyme.id}_${i}`]=text;});

for (const mission of R_POST_MISSIONS) R_CLIPS[`r_mission_${mission.id}`]=mission.text;
for (const [id,lines] of Object.entries(R_RHYME_PARTS)) lines.forEach((parts,line)=>parts.forEach((text,part)=>{R_CLIPS[`r_rhyme_part_${id}_${line}_${part}`]=text;}));

for (const variant of R_PHRASE_VARIANTS) R_CLIPS[variant.clip]=variant.text;
