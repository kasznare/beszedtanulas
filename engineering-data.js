export const BUILD_PIECES = Object.freeze([
  { id: 'block', name: 'Kocka', width: 64, height: 64, color: '#e5ab50', mark: '▦', volume: 4 },
  { id: 'plank', name: 'Hosszú gerenda', width: 128, height: 32, color: '#67a897', mark: '▬', volume: 4 },
  { id: 'pillar', name: 'Oszlop', width: 32, height: 96, color: '#8b9ec7', mark: '▥', volume: 3 },
  { id: 'roof', name: 'Háromszög', width: 96, height: 64, color: '#dc8871', mark: '▲', volume: 3 },
  { id: 'ball', name: 'Henger', width: 64, height: 64, color: '#a5b879', mark: '●', volume: Math.PI },
]);
export const BRIDGE_LEVELS = Object.freeze([
  { name: 'Kis patak', spans: 3, budget: 24, load: 0.65, vehicle: 'Kisautó', lesson: 'A háromszög megtartja az alakját. Próbálj átlós rudakat is!' },
  { name: 'Széles folyó', spans: 4, budget: 34, load: 0.85, vehicle: 'Kisteherautó', lesson: 'A hosszabb híd több helyen hajolhat meg. Támaszd meg a közepét is!' },
  { name: 'Nehéz rakomány', spans: 4, budget: 30, load: 1.65, vehicle: 'Rakott teherautó', lesson: 'Kevés anyagból is lehet erős hidat építeni. Figyeld, hol hajlik meg!' },
]);
export const ENGINEERING_CLIPS = {
  engineering_hub: 'Építsünk együtt! Ejts elemeket a toronyra, tervezz saját építményt, vagy építs hidat!',
  engineering_drop: 'Az elem ide-oda mozog. Koppints, és leesik! Építs a szigetre! A vízbe ne essen!',
  engineering_build: 'Válassz egy elemet, és koppints oda, ahová tennéd! El is forgathatod. Próbálj széles alapot építeni!',
  engineering_bridge: 'Építs hidat! Koppints két pontra, és összekötjük egy rúddal. A végén engedd át az autót!',
  engineering_water: 'Csobbant! Próbáld beljebb tenni! Vissza is vonhatod az utolsó lépést.',
  engineering_success: 'Átért az autó! A híd megtartotta a rakományt!',
  engineering_retry: 'A híd meghajlott. Próbáld átlós rudakkal megerősíteni!',
};

export function bridgeLayout(level = 0) {
  const info = BRIDGE_LEVELS[level] || BRIDGE_LEVELS[0];
  const step = 480 / info.spans;
  return { ...info, step, nodes: Array.from({ length: (info.spans + 1) * 2 }, (_, i) => {
    const row = i > info.spans ? 1 : 0, col = i % (info.spans + 1);
    return { id: `${row ? 't' : 'd'}${col}`, x: 160 + col * step, y: 360 - row * 140, fixed: row === 0 && (col === 0 || col === info.spans) };
  }) };
}
export function beamKey(a, b) { return [a, b].sort().join(':'); }
export function beamCost(layout, a, b) {
  const p = layout.nodes.find(n => n.id === a), q = layout.nodes.find(n => n.id === b);
  if (!p || !q || a === b) return 0;
  const colA = Number(a.slice(1)), colB = Number(b.slice(1));
  if (Math.abs(colA - colB) > 1) return 0;
  return a[0] !== b[0] && colA !== colB ? 3 : 2;
}
export function bridgeSpent(layout, beams) { return beams.reduce((sum, [a, b]) => sum + beamCost(layout, a, b), 0); }
export function editBridge(layout, beams, a, b) {
  const cost = beamCost(layout, a, b);
  if (!cost) return { beams, error: 'Szomszédos pontokat köss össze! Átlósan is lehet.' };
  const key = beamKey(a, b), exists = beams.some(pair => beamKey(...pair) === key);
  if (exists) return { beams: beams.filter(pair => beamKey(...pair) !== key) };
  if (bridgeSpent(layout, beams) + cost > layout.budget) return { beams, error: 'Elfogyott az anyagkeret. Vegyél ki egy rudat, vagy vond vissza az utolsót!' };
  return { beams: [...beams, [a, b]] };
}
export function hasBridgeRoad(layout, beams) {
  const keys = new Set(beams.map(pair => beamKey(...pair)));
  return Array.from({ length: layout.spans }, (_, i) => keys.has(beamKey(`d${i}`, `d${i + 1}`))).every(Boolean);
}
export function normalizeEngineering(value = {}) {
  const best = v => Number.isFinite(v) && v >= 0 && v <= 1000 ? Math.round(v * 10) / 10 : 0;
  return {
    dropBest: best(value?.dropBest), buildBest: best(value?.buildBest),
    bridges: BRIDGE_LEVELS.map((_, level) => {
      const raw = value?.bridges?.[level], layout = bridgeLayout(level);
      let beams = [];
      for (const pair of (Array.isArray(raw?.beams) ? raw.beams.slice(0, 40) : [])) {
        if (!Array.isArray(pair) || pair.length !== 2 || pair.some(id => typeof id !== 'string')) continue;
        if (beams.some(p => beamKey(...p) === beamKey(...pair))) continue;
        beams = editBridge(layout, beams, ...pair).beams;
      }
      return { beams, completed: raw?.completed === true };
    }),
  };
}
export function validateEngineering(value) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(normalizeEngineering(value)) !== JSON.stringify({dropBest:value.dropBest,buildBest:value.buildBest,bridges:value.bridges})) {
    throw new Error('Az Építőliget mentése hibás. Nem módosítottam a játékot.');
  }
}
