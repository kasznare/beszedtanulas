export const POUR_LEVELS = [
  { id: 1, name: 'Felfedező', targets: [.72, .72], rate: .18, tolerance: .11 },
  { id: 2, name: 'Ügyes öntő', targets: [.72, .72], rate: .25, tolerance: .065 },
  { id: 3, name: 'Kétféle adag', targets: [.45, .78], rate: .25, tolerance: .05 },
];
export const JUG_CAPACITY = 2.6;
export const POUR_CLIPS = {
  pour_start: 'Kínáljuk meg a barátainkat! Válassz poharat, és tartsd nyomva az öntés gombot! A jelzésig tölts, utána engedd el! Ha tovább öntesz, kicsordul a víz.',
  pour_tilt: 'Tartsd kényelmesen a telefont! Döntsd balra a macihoz, jobbra a nyuszihoz! Középen megáll az öntés.',
  pour_centre: 'Hozd vissza középre a telefont! Utána tölthetünk a másik pohárba.',
  pour_manual: 'Lassan önts a jelzésig! Amikor elengedjük a gombot, megáll a víz.',
  pour_two: 'A macinak kevesebb, a nyuszinak több víz kell. Figyeld a jelzéseket!',
  pour_bear_done: 'A maci pohara elkészült! Köszönöm!',
  pour_rabbit_done: 'A nyuszi pohara elkészült! Köszönöm!',
  pour_more: 'Még egy kicsi víz kell. Töltsünk a jelzésig!',
  pour_over: 'Kicsit sok lett. Ürítsd ki ezt a poharat, és próbáljuk újra!',
  pour_spill: 'Hopp, kicsordult a víz! Állítsd meg az öntést, és ürítsd ki a poharat!',
  pour_empty: 'Elfogyott a víz a kancsóból. A feltöltöm gombbal hozhatunk még vizet!',
  pour_refill: 'Újra tele a kancsó! Folytathatjuk az öntést.',
  pour_done: 'Mindkét barátunk kapott inni! Kezdődhet a piknik!',
};

export function newPourRound(level = 1) {
  const rule = POUR_LEVELS.find(item => item.id === level) || POUR_LEVELS[0];
  return { level: rule.id, targets: [...rule.targets], fills: [0, 0], done: [false, false], remaining: JUG_CAPACITY, spills: [0, 0] };
}

export function pourFeedback(round, cup) {
  const { tolerance } = POUR_LEVELS[round.level - 1];
  if (round.fills[cup] > round.targets[cup] + tolerance) return 'over';
  return round.fills[cup] >= round.targets[cup] - tolerance ? 'ready' : 'more';
}

// Cap elapsed time so a stalled or hidden page never pours a large extra amount.
export function advancePour(round, cup, strength, seconds) {
  if (![0, 1].includes(cup) || !Number.isFinite(strength) || !Number.isFinite(seconds)) return round;
  const amount = Math.min(round.remaining, Math.max(0, Math.min(1, strength)) * POUR_LEVELS[round.level - 1].rate * Math.max(0, Math.min(.08, seconds)));
  if (!amount) return round;
  const next = { ...round, fills: [...round.fills], done: [...round.done], spills: [...round.spills], remaining: Math.max(0, round.remaining - amount) };
  next.spills[cup] += Math.max(0, next.fills[cup] + amount - 1);
  next.fills[cup] = Math.min(1, next.fills[cup] + amount);
  next.done[cup] = false;
  return next;
}

export function refillPour(round) { return { ...round, remaining: JUG_CAPACITY }; }

// Clip the jug interior below a gravity plane. Matching the polygon area keeps
// the same amount of liquid visible when the jug rotates; its surface stays level.
export const JUG_INTERIOR = [[-52, -77], [31, -77], [41, -57], [74, -64], [60, -40], [44, -31], [53, 65], [20, 80], [-20, 80], [-53, 65]];
export const JUG_SPOUT = [74, -64];
export function polygonArea(points) {
  return Math.abs(points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0)) / 2;
}
function belowPlane(normal, height) {
  const points = [], surface = [], dot = p => p[0] * normal[0] + p[1] * normal[1];
  JUG_INTERIOR.forEach((p, i) => {
    const q = JUG_INTERIOR[(i + 1) % JUG_INTERIOR.length], a = dot(p), b = dot(q);
    if (a >= height) points.push(p);
    if ((a >= height) !== (b >= height)) {
      const t = (height - a) / (b - a), cross = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      points.push(cross); surface.push(cross);
    }
  });
  return { points, surface, height };
}
export function jugLiquid(fraction, degrees) {
  const radians = degrees * Math.PI / 180, normal = [Math.sin(radians), Math.cos(radians)];
  const area = polygonArea(JUG_INTERIOR) * .88 * Math.max(0, Math.min(1, fraction));
  let low = -140, high = 140;
  for (let i = 0; i < 30; i++) {
    const middle = (low + high) / 2;
    if (polygonArea(belowPlane(normal, middle).points) > area) low = middle; else high = middle;
  }
  return belowPlane(normal, (low + high) / 2);
}
const angles = new Map();
export function jugPourAngle(fraction) {
  const key = Math.max(1, Math.min(100, Math.round(fraction * 100)));
  if (!angles.has(key)) {
    let low = 0, high = 104;
    for (let i = 0; i < 12; i++) {
      const angle = (low + high) / 2, radians = angle * Math.PI / 180;
      const outlet = JUG_SPOUT[0] * Math.sin(radians) + JUG_SPOUT[1] * Math.cos(radians);
      if (outlet < jugLiquid(key / 100, angle).height) low = angle; else high = angle;
    }
    angles.set(key, (low + high) / 2);
  }
  return angles.get(key);
}

export function settlePour(round, cup) {
  if (![0, 1].includes(cup) || pourFeedback(round, cup) !== 'ready') return round;
  const next = { ...round, done: [...round.done] };
  next.done[cup] = true;
  return next;
}

export function relativeTilt(current, reference) {
  return ((current - reference + 540) % 360) - 180;
}

// Orientation events use device axes; remap them to the visible screen.
export function screenTilt(beta, gamma, angle = 0) {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  const orientation = ((angle % 360) + 360) % 360;
  return orientation === 90 ? beta : orientation === 270 ? -beta : orientation === 180 ? -gamma : gamma;
}

export function tiltPourInput(degrees) {
  if (!Number.isFinite(degrees) || Math.abs(degrees) < 8) return { cup: null, strength: 0 };
  return { cup: degrees < 0 ? 0 : 1, strength: Math.min(1, .18 + (Math.abs(degrees) - 8) / 24) };
}
