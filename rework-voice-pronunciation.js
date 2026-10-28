// Scoped Eleven v4 IPA for the instructions added with the October 2026 game rework.
// The displayed Hungarian text stays in each game's own *_CLIPS object; this file
// only decides how those new recordings are pronounced. Old paid inputs never change.
export const REWORK_PHONETIC_IDS = Object.freeze([
  'listening_bingo_none', 'listening_bingo_win', 'listening_phrase_start', 'flip_missing_two', 'counting_how_many', 'cards_peek_intro',
  'memory_sound_name_start', 'abk_quiz_intro', 'r_post_wishes', 'teddy_expressive_intro',
  'pour_exact_start', 'pour_exact_empty',
  'patterns_gap', 'patterns_odd', 'patterns_odd_fix', 'patterns_grow',
  'montessori_grid_missing', 'montessori_grid_odd', 'montessori_tower_lean',
  'workshop_balance_missing', 'workshop_balance_fewest', 'workshop_design_build',
  'puzzle_strict_on', 'differences_closer',
  'logic_route_bump', 'logic_route_shortest', 'logic_route_2', 'logic_machine_locked', 'logic_shop_next', 'logic_shop_same',
  'city_story_new_stamp', 'city_story_locked',
  // Chess and engineering keep their own lists for the older recordings; adding words
  // there would alter those paid inputs, so the new lines are pronounced from here.
  'chess_tactics_intro', 'chess_tactic_failed', 'chess_mate', 'chess_pawns_intro',
  'engineering_flag', 'engineering_challenge', 'engineering_bar_broke',
]);

// Every content word is reviewed for vowel length, c/cs/s/sz/zs, gy/ty/ny and the
// assimilations Hungarian speech applies across consonant clusters (sd → zsd,
// dt → tt, kd → gd, zh → sh, tj → tty). Articles keep their native spelling.
export const REWORK_WORD_IPA = Object.freeze({
  // Képek és hangok
  ha: 'hɒ', nincs: 'nint͡ʃ', ilyen: 'ˈijɛn', képed: 'ˈkeːpɛd', koppints: 'ˈkopːint͡ʃ', nálam: 'ˈnaːlɒm', gombra: 'ˈɡombrɒ',
  bingó: 'ˈbiŋɡoː', megvan: 'ˈmɛɡvɒn', egy: 'ɛɟ', teljes: 'ˈtɛjɛʃ', sor: 'ʃor',
  hallgasd: 'ˈhɒlːɡɒʒd', meg: 'mɛɡ', mit: 'mit', mondok: 'ˈmondok', és: 'eːʃ', keresd: 'ˈkɛrɛʒd',
  most: 'moʃt', két: 'keːt', kép: 'keːp', bújik: 'ˈbuːjik', el: 'ɛl', melyik: 'ˈmɛjik', kettő: 'ˈkɛtːøː', hiányzik: 'ˈhijaːɲzik',
  hány: 'haːɲ', van: 'vɒn', számra: 'ˈsaːmrɒ', kukucs: 'ˈkukut͡ʃ', hol: 'hol',
  fordíts: 'ˈfordiːt͡ʃ', fel: 'fɛl', kártyát: 'ˈkaːrcaːt', az: 'ɒz', állat: 'ˈaːlːɒt', hangját: 'ˈhɒŋɡjaːt', nevét: 'ˈnɛveːt',
  állatkvíz: 'ˈaːlːɒtkviːz', ki: 'ki', szól: 'soːl', rá: 'raː',
  minden: 'ˈmindɛn', ház: 'haːz', mást: 'maːʃt', kér: 'keːr', mondd: 'mondː', szót: 'soːt', aztán: 'ˈɒstaːn', vidd: 'vidː',
  csomagot: 'ˈt͡ʃomɒɡot', ahhoz: 'ˈɒhːoz', aki: 'ˈɒki', kérte: 'ˈkeːrtɛ',
  // Játék Macival, Számok
  te: 'tɛ', kérsz: 'keːrs', macitól: 'ˈmɒt͡sitoːl', válassz: 'ˈvaːlɒsː', finomságot: 'ˈfinomʃaːɡot',
  pont: 'pont', elég: 'ˈɛleːɡ', kancsóban: 'ˈkɒnt͡ʃoːbɒn', vigyázz: 'ˈviɟaːzː', ne: 'nɛ', folyjon: 'ˈfojːon',
  elfogyott: 'ˈɛlfoɟotː', kezdjük: 'ˈkɛzɟːyk', újra: 'ˈuːjrɒ', új: 'uːj', poharakkal: 'ˈpohɒrɒkːɒl',
  // Formák és minták
  nem: 'nɛm', sorból: 'ˈʃorboːl', illik: 'ˈilːik', sorba: 'ˈʃorbɒ', megtaláltad: 'ˈmɛɡtɒlaːltɒd', mi: 'mi', helyére: 'ˈhɛjeːrɛ',
  pötty: 'pøcː', jön: 'jøn', ezután: 'ˈɛzutaːn', számoljuk: 'ˈsaːmojuk',
  rácsból: 'ˈraːt͡ʃboːl', tedd: 'tɛdː', rácsba: 'ˈraːt͡ʃbɒ', jót: 'joːt',
  billeg: 'ˈbilːɛɡ', torony: 'ˈtoroɲ', felső: 'ˈfɛlʃøː', korongra: 'ˈkoroŋɡrɒ', vedd: 'vɛdː', le: 'lɛ',
  jobb: 'jobː', oldalon: 'ˈoldɒlon', már: 'maːr', rúd: 'ruːd', egyetlen: 'ˈɛɟɛtlɛn', rúddal: 'ˈruːdːɒl', egyensúlyba: 'ˈɛɟɛnʃuːjbɒ', mérleget: 'ˈmeːrlɛɡɛt',
  rakd: 'rɒɡd', ugyanannyit: 'ˈuɟɒnɒɲːit', minél: 'ˈmineːl', kevesebb: 'ˈkɛvɛʃɛbː',
  tervezd: 'ˈtɛrvɛzd', saját: 'ˈʃɒjaːt', mintádat: 'ˈmintaːdɒt', vagy: 'vɒɟ', három: 'ˈhaːrom', formát: 'ˈformaːt', fonal: 'ˈfonɒl', majd: 'mɒjd', ismétli: 'ˈiʃmeːtli', őket: 'ˈøːkɛt',
  // Kirakók és építés
  csak: 't͡ʃɒk', jó: 'joː', helyre: 'ˈhɛjrɛ', kerülhet: 'ˈkɛrylhɛt', darab: 'ˈdɒrɒb',
  kisebb: 'ˈkiʃɛbː', jelölésen: 'ˈjɛløleːʃɛn', belül: 'ˈbɛlyl', nézd: 'neːzd', jól: 'joːl', részleteket: 'ˈreːslɛtɛkɛt',
  // Fejtörők
  hoppá: 'ˈhopːaː', róka: 'ˈroːkɒ', itt: 'itː', elakadt: 'ˈɛlɒkɒtː', innen: 'ˈinːɛn', utat: 'ˈutɒt',
  legrövidebb: 'ˈlɛɡrøvidɛbː', út: 'uːt', ennyi: 'ˈɛɲːi', lépés: 'ˈleːpeːʃ', volt: 'volt',
  mindkét: 'ˈmintkeːt', házhoz: 'ˈhaːshoz', köveket: 'ˈkøvɛkɛt', kerüld: 'ˈkɛryld', egész: 'ˈɛɡeːs', próbáld: 'ˈproːbaːld',
  visszavonással: 'ˈvisːɒvonaːʃːɒl', javíthatsz: 'ˈjɒviːthɒt͡s',
  előbb: 'ˈɛløːbː', gépet: 'ˈɡeːpɛt', géppróba: 'ˈɡeːpːroːbɒ', gombbal: 'ˈɡombːɒl',
  következő: 'ˈkøvɛtkɛzøː', vevő: 'ˈvɛvøː', ez: 'ɛz', kosár: 'ˈkoʃaːr', maradhat: 'ˈmɒrɒthɒt', így: 'iːɟ',
  történet: 'ˈtørteːnɛt', gyűjteményben: 'ˈɟyːjtɛmeːɲbɛn', zárva: 'ˈzaːrvɒ', korábbi: 'ˈkoraːbːi', nyom: 'ɲom', nyithatja: 'ˈɲithɒcːɒ',
  // Sakkliget
  sötét: 'ˈʃøteːt', is: 'iʃ', lép: 'leːp', gondold: 'ˈɡondold', át: 'aːt', válaszol: 'ˈvaːlɒsol',
  visszaütött: 'ˈvisːɒytøtː', vond: 'vond', vissza: 'ˈvisːɒ', keress: 'ˈkɛrɛʃː', lépést: 'ˈleːpeːʃt',
  matt: 'mɒtː', király: 'ˈkiraːj', tud: 'tud', elmenekülni: 'ˈɛlmɛnɛkylni',
  gyalogcsata: 'ˈɟɒloɡt͡ʃɒtɒ', juttasd: 'ˈjutːɒʒd', gyalogodat: 'ˈɟɒloɡodɒt', tábla: 'ˈtaːblɒ', túlsó: 'ˈtuːlʃoː', végére: 'ˈveːɡeːrɛ',
  // Építőliget
  elérted: 'ˈɛleːrtɛd', zászlót: 'ˈzaːsloːt', kész: 'keːs', ügyesen: 'ˈyɟɛʃɛn', építettél: 'ˈeːpiːtɛtːeːl',
  eltört: 'ˈɛltørt', erősítsd: 'ˈɛrøːʃiːd͡ʒd', háromszögekkel: 'ˈhaːromsøɡɛkːɛl',
});

const WORD = /[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu;
export function phoneticReworkText(id, text, commonWords = {}) {
  if (!REWORK_PHONETIC_IDS.includes(id)) return null;
  return text.replace(WORD, word => {
    const key = word.toLocaleLowerCase('hu-HU');
    const ipa = REWORK_WORD_IPA[key] || commonWords[key];
    return ipa ? `/${ipa}/` : word;
  });
}
