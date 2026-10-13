export const dressItems = [
  { id: "sapka", label: "sapka", request: "Kérem a sapkát.", thanks: "Meleg a sapkám!" },
  { id: "polo", label: "póló", request: "Kérem a pólót.", thanks: "Jó puha a pólóm!" },
  { id: "sal", label: "sál", request: "Kérem a sálat.", thanks: "Meleg a sálam!" },
  { id: "cipo", label: "cipő", request: "Kérem a cipőt.", thanks: "Kényelmes a cipőm!" },
];

export const weatherDressItems = [
  { id: 'esokabat', label: 'esőkabát', request: 'Kérem az esőkabátot.', thanks: 'Az esőkabát szárazon tart!' },
  { id: 'gumicsizma', label: 'gumicsizma', request: 'Kérem a gumicsizmát.', thanks: 'A gumicsizmában léphetek a pocsolyába!' },
  { id: 'napkalap', label: 'napkalap', request: 'Kérem a napkalapot.', thanks: 'A napkalap árnyékot ad!' },
  { id: 'rovidnadrag', label: 'rövidnadrág', request: 'Kérem a rövidnadrágot.', thanks: 'Jó könnyű a rövidnadrágom!' },
  { id: 'szandal', label: 'szandál', request: 'Kérem a szandált.', thanks: 'Szellős a szandálom!' },
];
export const allDressItems = [...dressItems, ...weatherDressItems];
export const DRESS_OUTFITS = {
  classic: { label: 'Séta', emoji: '🍂', text: 'Hűvös időben sétálunk.', items: dressItems.map(item => item.id) },
  rain: { label: 'Esőben', emoji: '🌧️', text: 'Esik az eső. Készüljünk a pocsolyákhoz!', items: ['polo', 'esokabat', 'gumicsizma'] },
  summer: { label: 'Nyáron', emoji: '☀️', text: 'Süt a nap. Könnyű ruhát vegyünk fel!', items: ['polo', 'napkalap', 'rovidnadrag', 'szandal'] },
};
export const DRESS_SLOTS = { sapka: 'head', napkalap: 'head', polo: 'body', esokabat: 'coat', sal: 'neck', cipo: 'feet', gumicsizma: 'feet', szandal: 'feet', rovidnadrag: 'legs' };
export function toggleDressItem(worn, id) {
  const next = new Set(worn);
  if (!DRESS_SLOTS[id]) return next;
  if (next.has(id)) next.delete(id);
  else { for (const item of next) if (DRESS_SLOTS[item] === DRESS_SLOTS[id]) next.delete(item); next.add(id); }
  return next;
}
export const DRESS_CLIPS = {
  dress_weather_classic: DRESS_OUTFITS.classic.text,
  dress_weather_rain: DRESS_OUTFITS.rain.text,
  dress_weather_summer: DRESS_OUTFITS.summer.text,
  dress_wardrobe: 'Válassz ruhát a macinak! Ha újra rákoppintasz, leveszem.',
};
for (const item of allDressItems) {
  DRESS_CLIPS[`dress_request_${item.id}`] = item.request;
  DRESS_CLIPS[`dress_thanks_${item.id}`] = item.thanks;
  DRESS_CLIPS[`dress_name_${item.id}`] = item.label;
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

// Every round makes one complete outfit, independent of the speech-round length.
export function buildDressRound(choiceCount = 2, random = Math.random, outfit = 'classic') {
  const count = choiceCount === 3 ? 3 : 2;
  const pool = outfit === 'classic' || !DRESS_OUTFITS[outfit] ? dressItems : allDressItems;
  const targets = (DRESS_OUTFITS[outfit] || DRESS_OUTFITS.classic).items.map(id => allDressItems.find(item => item.id === id));
  return shuffle(targets, random).map(target => ({
    target,
    choices: shuffle([target, ...shuffle(pool.filter(item => item.id !== target.id), random).slice(0, count - 1)], random),
  }));
}
