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

const byId = id => allDressItems.find(item => item.id === id);
// Maci dresses from the inside out: póló, then trousers or coat, scarf, hat, and shoes last.
export const DRESS_BODY_ORDER = ['body', 'legs', 'coat', 'neck', 'head', 'feet'];
const NEIGHBOUR_SLOTS = { legs: ['coat'], coat: ['legs'], head: ['neck'], neck: ['head'], body: [], feet: [] };
export const DRESS_WEATHERS = ['classic', 'rain', 'summer'];
export const DRESS_WEATHER_TITLE = 'Milyen idő van?';

export function sortByBody(items) {
  return [...items].sort((a, b) => DRESS_BODY_ORDER.indexOf(DRESS_SLOTS[a.id]) - DRESS_BODY_ORDER.indexOf(DRESS_SLOTS[b.id]));
}

// Distractors are never already on Maci; garments for the same place come first,
// so the child has to tell a sapka from a napkalap rather than a hat from a shoe.
export function pickDressDistractors(target, { count = 1, exclude = [], random = Math.random } = {}) {
  const blocked = new Set([target.id, ...exclude]);
  const slot = DRESS_SLOTS[target.id];
  const rank = item => DRESS_SLOTS[item.id] === slot ? 0 : NEIGHBOUR_SLOTS[slot]?.includes(DRESS_SLOTS[item.id]) ? 1 : 2;
  return shuffle(allDressItems.filter(item => !blocked.has(item.id)), random).sort((a, b) => rank(a) - rank(b)).slice(0, Math.max(0, count));
}

// Every round makes one complete outfit in body order, independent of the speech-round length.
export function buildDressRound(choiceCount = 2, random = Math.random, outfit = 'classic') {
  const count = choiceCount === 3 ? 3 : 2;
  const worn = [];
  return sortByBody((DRESS_OUTFITS[outfit] || DRESS_OUTFITS.classic).items.map(byId)).map(target => {
    const choices = shuffle([target, ...pickDressDistractors(target, { count: count - 1, exclude: worn, random })], random);
    worn.push(target.id);
    return { target, choices };
  });
}

export function nextDressOutfit(outfit) {
  const index = DRESS_WEATHERS.indexOf(outfit);
  return index < 0 ? outfit : DRESS_WEATHERS[(index + 1) % DRESS_WEATHERS.length];
}

export function pickWeather(previous = null, random = Math.random) {
  const options = DRESS_WEATHERS.filter(id => id !== previous);
  return options[Math.floor(random() * options.length)];
}

// "Milyen idő van?": Maci already wears his póló; for every other place only one
// garment fits the weather that is heard, the others belong to a different day.
export function buildWeatherRound(weather, choiceCount = 2, random = Math.random) {
  const outfit = DRESS_OUTFITS[weather] || DRESS_OUTFITS.classic;
  const count = choiceCount === 3 ? 3 : 2;
  const preWorn = outfit.items.filter(id => DRESS_SLOTS[id] === 'body');
  const steps = sortByBody(outfit.items.filter(id => !preWorn.includes(id)).map(byId)).map(target => ({
    target,
    choices: shuffle([target, ...pickDressDistractors(target, { count: count - 1, exclude: outfit.items, random })], random),
  }));
  return { weather: DRESS_OUTFITS[weather] ? weather : 'classic', preWorn, steps };
}

// The free wardrobe earns a star only for an outfit that exactly fits one of the weather cards.
export function matchingWeather(worn) {
  const set = new Set(worn);
  return DRESS_WEATHERS.find(id => DRESS_OUTFITS[id].items.length === set.size && DRESS_OUTFITS[id].items.every(item => set.has(item))) || null;
}

export function dressStars(clean, total) {
  if (!total) return 1;
  return Math.min(5, Math.max(1, Math.round(5 * Math.min(clean, total) / total)));
}
