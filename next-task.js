// Recommendations depend only on the activity on screen. No player history,
// scores, storage, network calls, or automatic difficulty changes are involved.
const destinations = {
  'listening-game': { screen: 'memory', mode: 'sound', title: 'Hang–kép párok', reason: 'Keresd meg a hallott szó képét a kártyák között!' },
  memory: { screen: 'listening-game', mode: 'bingo', title: 'Hangos bingó', reason: 'Hallgasd meg a szavakat, és gyűjtsd össze a képeket!' },
  'two-word': { screen: 'teddy-game', mode: 'expressive', title: 'Én kérek', reason: 'Válassz ennivalót, mondd ki, és add oda Macinak!' },
  'teddy-game': { screen: 'two-word', topic: 'food', title: 'Két szó együtt', reason: 'Gyakoroljunk még néhány kérést!' },
  imitate: { screen: 'listening-game', mode: 'classic', title: 'Hol van?', reason: 'Most keresd meg a hallott szó képét!' },
  'numbers-count': { screen: 'numbers', numberMode: 'quiz', title: 'Keresd meg!', reason: 'Mutasd meg a kért mennyiséget!' },
  'numbers-quiz': { screen: 'numbers', numberMode: 'count', title: 'Számoljuk meg!', reason: 'Számoljuk meg együtt a tárgyakat!' },
  puzzle: { screen: 'memory', mode: 'classic', title: 'Képpárok', reason: 'Most képek párját keressük!' },
  'dress-game': { screen: 'teddy-game', mode: 'single', title: 'Macietetés', reason: 'Öltözés után kínáljuk meg Macit!' },
  pour: { screen: 'numbers', numberMode: 'count', title: 'Számoljuk meg!', reason: 'Nézzük meg, hány tárgy van előttünk!' },
  'furfangliget:shop': { screen: 'numbers', numberMode: 'quiz', title: 'Keresd meg!', reason: 'A bolt után keressük meg a kért mennyiséget!' },
  'furfangliget:machine': { screen: 'workshop', kind: 'balance', title: 'Egyensúly', reason: 'A számokból építsünk egyensúlyt!' },
  'furfangliget:route': { screen: 'workshop', kind: 'pattern', title: 'Mintaszövő', reason: 'A lépések után folytassunk egy mintát!' },
  'workshop:sort': { screen: 'listening-game', mode: 'classic', title: 'Hol van?', reason: 'A válogatás után keressünk képeket!' },
  'workshop:pattern': { screen: 'furfangliget', kind: 'route', title: 'Csomagösvény', reason: 'Tervezzünk egy útvonalat lépésről lépésre!' },
  'workshop:balance': { screen: 'furfangliget', kind: 'shop', title: 'Erdei bolt', reason: 'Állítsuk össze a kért mennyiségeket!' },
};
const rNext = {hunter:['post','Robotpostás'],post:['workshop','Perecműhely'],workshop:['echo','Saját visszhang'],rhyme:['post','Robotpostás'],echo:['hunter','Hangvadász']};

export function nextTask(source, kind = '') {
  if (source === 'r-practice' && Object.hasOwn(rNext,kind)) return {screen: source, kind:rNext[kind][0], title:rNext[kind][1], reason:'Folytassuk ugyanazzal a szócsoporttal!'};
  const key=`${source}:${kind}`;
  const task = Object.hasOwn(destinations,key)?destinations[key]:Object.hasOwn(destinations,source)?destinations[source]:null;
  return task ? {...task} : null;
}

export function relatedTaskMarkup(source, kind = '') {
  const task = nextTask(source, kind);
  // Only fixed, authored source keys are allowed into attributes and text.
  if (!task) return '';
  kind = Object.hasOwn(destinations,`${source}:${kind}`) || source==='r-practice'&&Object.hasOwn(rNext,kind) ? kind : '';
  return `<div class="next-task-card"><p>${task.reason}</p><button class="next-task-button" data-related-source="${source}" data-related-kind="${kind}"><span>Kapcsolódó játék</span><strong>${task.title} →</strong></button></div>`;
}
