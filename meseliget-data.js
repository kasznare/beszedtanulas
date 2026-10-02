const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export const MESE_WORDS = ['nulla', 'egy', 'két', 'három', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc', 'tíz'];
export function normalizeMeadow(value = {}) {
  const skill = key => ({ independent: count(value?.[key]?.independent), assisted: count(value?.[key]?.assisted) });
  const adventure = value?.adventure;
  return { version: 1, journeys: count(value?.journeys), collect: skill('collect'), serve: skill('serve'),
    adventure: adventure && Number.isInteger(adventure.step) && adventure.step >= 0 && adventure.step <= 2 && Number.isInteger(adventure.target) && adventure.target >= 1 && adventure.target <= 10
      ? { step: adventure.step, target: adventure.target } : null };
}
export function validateMeadow(value) {
  if (value === undefined) return normalizeMeadow();
  if (!value || value.version !== 1 || JSON.stringify(value) !== JSON.stringify(normalizeMeadow(value))) {
    // Compare fields rather than property order in imported JSON.
    const normal = normalizeMeadow(value);
    if (!value || value.version !== 1 || value.journeys !== normal.journeys ||
      ['collect', 'serve'].some(k => !value[k] || value[k].independent !== normal[k].independent || value[k].assisted !== normal[k].assisted) ||
      (value.adventure !== null && (!normal.adventure || value.adventure.step !== normal.adventure.step || value.adventure.target !== normal.adventure.target)))
      throw new Error('A Meseliget mentése hibás. Nem módosítottam a játékot.');
  }
  return normalizeMeadow(value);
}
export function recordMeadowTask(value, kind, assisted) {
  const next = normalizeMeadow(value);
  if (kind === 'collect' || kind === 'serve') next[kind][assisted ? 'assisted' : 'independent'] += 1;
  if (next.adventure) next.adventure.step += 1;
  const finished = next.adventure?.step === 3;
  if (finished) { next.journeys += 1; next.adventure = null; }
  return { progress: next, finished };
}
export function countFeedback(actual, target) {
  return actual === target ? 'correct' : actual < target ? 'more' : 'less';
}
export const MESE_CLIPS = {
  mese_map: 'Szia! Ez itt Meseliget. Szedjünk almát, terítsünk meg, vagy induljunk együtt piknikezni!',
  mese_start: 'Piknikezni indulunk! Először adjuk fel a maci sapkáját és cipőjét!',
  mese_dressed: 'Felöltöztem! Most szedjünk almát a barátainknak!',
  mese_serve: 'Adj minden állatnak egy tányért! Koppints az állatok elé!',
  mese_served: 'Mindenkinek jutott tányér! Kezdődhet a piknik!',
  mese_more: 'Még kell alma a kosárba. Tegyél bele még!',
  mese_less: 'Kicsit sok lett! Koppints a kosárban egy almára, és tedd vissza!',
  mese_count_help: 'Számoljunk együtt! A pöttyök mutatják, hány alma kell a kosárba.',
  mese_plate_help: 'Nézd, kinek nincs még tányérja! Koppints elé, és adj neki egyet!',
  mese_plate_more: 'Valakinek még nincs tányérja. Nézzük meg együtt!',
  mese_finish: 'Elkészült a piknik! Köszönöm a segítséget! Ezt a képet eltesszük emlékbe.',
  mese_free_finish: 'Ügyesen segítettél! Pihenjünk meg, vagy játsszunk még!',
  mese_album: 'Ezek a közös piknikjeink emlékei!',
  mese_empty_album: 'Itt lesz a közös piknikünk képe. Induljunk el egy kalandra!',
  mese_play_menu: 'Etessük meg a macit, öltöztessük fel, keressünk képeket, vagy kiránduljunk Meseligetben!',
};
for (let n = 1; n <= 10; n++) {
  MESE_CLIPS[`mese_collect_${n}`] = `Tegyél ${MESE_WORDS[n]} almát a kosárba!`;
  MESE_CLIPS[`mese_collected_${n}`] = `Megvan ${n === 1 ? 'az' : 'a'} ${MESE_WORDS[n]} alma! Köszönöm!`;
}
