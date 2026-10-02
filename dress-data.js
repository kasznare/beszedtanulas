export const dressItems = [
  { id: "sapka", label: "sapka", request: "Kérem a sapkát.", thanks: "Meleg a sapkám!" },
  { id: "polo", label: "póló", request: "Kérem a pólót.", thanks: "Jó puha a pólóm!" },
  { id: "sal", label: "sál", request: "Kérem a sálat.", thanks: "Meleg a sálam!" },
  { id: "cipo", label: "cipő", request: "Kérem a cipőt.", thanks: "Kényelmes a cipőm!" },
];

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

// Every round makes one complete outfit, independent of the speech-round length.
export function buildDressRound(choiceCount = 2, random = Math.random) {
  const count = choiceCount === 3 ? 3 : 2;
  return shuffle(dressItems, random).map(target => ({
    target,
    choices: shuffle([target, ...shuffle(dressItems.filter(item => item.id !== target.id), random).slice(0, count - 1)], random),
  }));
}
