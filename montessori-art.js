import { MONTESSORI_COLORS, MONTESSORI_SHAPES, montessoriColorHex, montessoriWrongTargets } from './montessori-data.js';
export const colorOf = id => MONTESSORI_COLORS.find(color => color.id === id);
const paths = {
  circle: '<circle cx="50" cy="50" r="38"/>', square: '<rect x="14" y="14" width="72" height="72" rx="7"/>',
  triangle: '<path d="M50 9 93 85H7Z" stroke-linejoin="round"/>', hexagon: '<path d="M28 12H72L94 50 72 88H28L6 50Z" stroke-linejoin="round"/>',
};
export const shapeArt = (shape, hole = false, color = 'coral', size = 1, rotation = 0) => `<svg class="mo-shape-art ${hole ? 'mo-hole-art' : ''}" style="--mo-scale:${size === 0 ? .62 : 1}" viewBox="0 0 100 100" aria-hidden="true" fill="${hole ? '#624b36' : montessoriColorHex(color)}" stroke="${hole ? montessoriColorHex(color) : '#00000026'}" stroke-width="${hole ? 8 : 4}"><g transform="rotate(${rotation * 90} 50 50)">${paths[shape]}</g></svg>`;
export const pieceName = (piece, kind) => kind === 'colors' ? `${piece.shade === null ? '' : piece.shade === 0 ? 'világos ' : 'sötét '}${colorOf(piece.color).name.toLowerCase()} golyó` : kind === 'tower' ? `${piece.size}. méretű korong` : `${piece.size === 0 ? 'kicsi ' : ''}${colorOf(piece.color).name.toLowerCase()} ${MONTESSORI_SHAPES[piece.shape]}${piece.rotation ? `, ${piece.rotation * 90} fokkal elfordítva` : ''}`;
export const pieceArt = (piece, kind) => kind === 'colors' ? `<span class="mo-ball" style="--mo-color:${montessoriColorHex(piece.color, piece.shade)}" aria-hidden="true"></span>` : kind === 'tower' ? `<span class="mo-disc" style="--mo-size:${piece.size}" aria-hidden="true"></span>` : shapeArt(piece.shape, false, piece.color, piece.size, piece.rotation);
export function holeClip(shape, rotation = 0) {
  if (shape === 'circle') return 'circle(38%)';
  if (shape === 'square') return 'inset(14% round 7%)';
  const points = shape === 'triangle' ? [[50, 9], [93, 85], [7, 85]] : [[28, 12], [72, 12], [94, 50], [72, 88], [28, 88], [6, 50]];
  return `polygon(${points.map(([x, y]) => { for (let i = 0; i < rotation; i++) [x, y] = [100 - y, x]; return `${x}% ${y}%`; }).join(',')})`;
}
export function challengeBoard(round, selected) {
  const wrong = montessoriWrongTargets(round);
  const slot = (target, index) => {
    const move = round.placements.find(move => move.target === target.id), piece = round.pieces.find(piece => piece.id === move?.piece);
    const fixed = !!round.mode && round.fixed.includes(piece?.id) && round.phase === 'fix';
    return `<button class="mo-slot ${piece ? 'mo-piece' : ''} ${piece?.id === selected ? 'is-selected' : ''} ${wrong.includes(target.id) ? 'is-wrong' : ''} ${fixed ? 'is-fixed' : ''} ${round.mode && !piece ? 'is-gap' : ''}" data-mo-target="${target.id}" ${piece ? `data-mo-piece="${piece.id}" aria-pressed="${selected === piece.id}"` : ''} aria-label="${round.kind === 'grid' ? `${target.row + 1}. sor, ${target.column + 1}. oszlop` : `${index + 1}. hely`}${piece ? `: ${pieceName(piece, round.kind)}` : ', üres'}${wrong.includes(target.id) ? ', nem jó' : ''}" ${round.checked ? 'disabled' : ''}>${piece ? pieceArt(piece, round.kind) : '<span aria-hidden="true">·</span>'}${round.kind === 'memory' ? `<small class="mo-slot-number">${index + 1}</small>` : ''}</button>`;
  };
  if (round.kind === 'grid') return `<div class="mo-grid-board" style="--mo-columns:${round.columns.length}" role="group" aria-label="Sor és oszlop szerint rendezhető rács"><span></span>${round.columns.map(color => `<span class="mo-column-label" aria-label="${colorOf(color).name} oszlop"><i style="background:${montessoriColorHex(color)}"></i>${colorOf(color).name}</span>`).join('')}${round.rows.map((row, r) => `<span class="mo-row-label" aria-label="${row.size === 0 ? 'Kicsi' : 'Nagy'} ${MONTESSORI_SHAPES[row.shape]} sor">${shapeArt(row.shape, true, 'coral', row.size)}<small>${round.level === 4 ? row.size === 0 ? 'Kicsi' : 'Nagy' : ''}</small></span>${round.targets.filter(target => target.row === r).map(slot).join('')}`).join('')}</div>`;
  return `<div class="mo-memory-board" style="--mo-count:${round.total}" data-mo-phase="${round.phase}"><p class="mo-tray-label">${round.phase === 'preview' ? 'Figyeld meg a sorrendet!' : 'Rakd ki emlékezetből!'}</p>${round.phase === 'preview' ? `<div class="mo-memory-pattern" role="group" aria-label="Megfigyelhető minta">${round.targets.map((target, i) => `<span aria-label="${i + 1}. ${pieceName(target.expected, 'memory')}">${pieceArt(target.expected, 'memory')}<small>${i + 1}</small></span>`).join('')}</div><button id="mo-hide-pattern" class="mo-next">Elrejtem a mintát →</button>` : `<div class="mo-memory-slots" role="group" aria-label="Kirakható mintasor">${round.targets.map(slot).join('')}</div><button id="mo-show-pattern" class="mo-soft-button" ${round.checked || round.peekLimit != null && round.peeks >= round.peekLimit ? 'disabled' : ''}>Megnézem újra${round.peekLimit != null ? ` (${Math.max(0, round.peekLimit - round.peeks)})` : ''}</button>`}</div>`;
}
