export const POUR_LEVELS = [
  { id: 1, name: 'Felfedező', targets: [.72, .72], automatic: true },
  { id: 2, name: 'Ügyes öntő', targets: [.72, .72], automatic: false },
  { id: 3, name: 'Kétféle adag', targets: [.45, .78], automatic: false },
];
export const POUR_TOLERANCE = .065;
export const POUR_CLIPS = {
  pour_start: 'Kínáljuk meg a barátainkat! Válassz poharat, és tartsd nyomva az öntés gombot! Tölts a jelzésig!',
  pour_tilt: 'Tartsd kényelmesen a telefont! Döntsd balra a macihoz, jobbra a nyuszihoz! Középen megáll az öntés.',
  pour_centre: 'Hozd vissza középre a telefont! Utána tölthetünk a másik pohárba.',
  pour_manual: 'Lassan önts a jelzésig! Amikor elengedjük a gombot, megáll a víz.',
  pour_two: 'A macinak kevesebb, a nyuszinak több víz kell. Figyeld a jelzéseket!',
  pour_bear_done: 'A maci pohara elkészült! Köszönöm!',
  pour_rabbit_done: 'A nyuszi pohara elkészült! Köszönöm!',
  pour_more: 'Még egy kicsi víz kell. Töltsünk a jelzésig!',
  pour_over: 'Kicsit sok lett. Ürítsd ki ezt a poharat, és próbáljuk újra!',
  pour_done: 'Mindkét barátunk kapott inni! Kezdődhet a piknik!',
};

export function newPourRound(level = 1) {
  const rule = POUR_LEVELS.find(item => item.id === level) || POUR_LEVELS[0];
  return { level: rule.id, targets: [...rule.targets], fills: [0, 0], done: [false, false] };
}

export function pourFeedback(round, cup) {
  if (round.fills[cup] > round.targets[cup] + POUR_TOLERANCE) return 'over';
  return round.fills[cup] >= round.targets[cup] - POUR_TOLERANCE ? 'ready' : 'more';
}

// Cap elapsed time so a stalled or hidden page never pours a large extra amount.
export function advancePour(round, cup, strength, seconds) {
  if (![0, 1].includes(cup) || round.done[cup] || !Number.isFinite(strength) || !Number.isFinite(seconds)) return round;
  const amount = Math.max(0, Math.min(1, strength)) * .23 * Math.max(0, Math.min(.08, seconds));
  const next = { ...round, fills: [...round.fills], done: [...round.done] };
  const automatic = POUR_LEVELS[round.level - 1].automatic;
  next.fills[cup] = Math.min(automatic ? round.targets[cup] : 1, next.fills[cup] + amount);
  if (automatic && next.fills[cup] >= round.targets[cup]) next.done[cup] = true;
  return next;
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
