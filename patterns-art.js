import { normalizePatternToken, PATTERN_COLOR_STYLES, tokenKey, tokenLabel } from './patterns-data.js';

// The same silhouette, scale and orientation are used everywhere a token is
// shown. The cards need no external images, fonts, SVG IDs or network resources.
const SILHOUETTES = {
  circle: '<circle r="43"/>',
  square: '<rect x="-39" y="-39" width="78" height="78" rx="7"/>',
  triangle: '<path d="M0-45 45 38H-45Z"/>',
  star: '<path d="M0-45 13-15 45-12 21 10 28 42 0 25-28 42-21 10-45-12-13-15Z"/>',
  diamond: '<path d="M0-46 42 0 0 46-42 0Z"/>',
  arrow: '<path d="M-14 40V0H-35L0-42 35 0H14V40Z"/>',
};
const HIGHLIGHTS = {
  circle: 'M-27-9A28 28 0 0 1-10-27',
  square: 'M-26-7V-26H-7',
  triangle: 'M-22 18-3-17',
  star: 'M-17-4-7-6-2-21',
  diamond: 'M-25 0-6-23',
  arrow: 'M-17-9 0-29 17-9',
};
// In an 80px card the usual (medium) silhouette is 43–50px across;
// size tasks still retain a clear small / medium / large separation.
const SCALES = { small: .45, medium: .82, large: 1.12 };
const ROTATIONS = { up: 0, right: 90, down: 180, left: 270 };
const escapeAttribute = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Dot groups for growing patterns, laid out like dice faces so they can be counted.
const DOT_LAYOUTS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  7: [[-1, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [1, 1]], 8: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
  9: [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
  10: [[-1.5, -1], [-.5, -1], [.5, -1], [1.5, -1], [-1, 0], [0, 0], [1, 0], [-1.5, 1], [-.5, 1], [1.5, 1]],
};

export function patternTokenArt(token) {
  const normalized = normalizePatternToken(token);
  const { shape, color, size, direction, count } = normalized;
  const palette = PATTERN_COLOR_STYLES[color];
  const label = escapeAttribute(tokenLabel(normalized));
  if (count) {
    const dots = DOT_LAYOUTS[count].map(([x, y]) => `<circle cx="${60 + x * (count === 10 ? 26 : 32)}" cy="${60 + y * 32}" r="${count === 10 ? 11 : 13}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="pattern-token-art" role="img" aria-label="${label}" focusable="false" data-pattern-token="${tokenKey(normalized)}"><title>${label}</title><g fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="3">${dots}</g></svg>`;
  }
  const rotation = shape === 'arrow' ? ROTATIONS[direction] : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="pattern-token-art" role="img" aria-label="${label}" focusable="false" data-pattern-token="${tokenKey(normalized)}"><title>${label}</title><g transform="translate(60 60) scale(${SCALES[size]}) rotate(${rotation})" stroke-linejoin="round" stroke-linecap="round"><g fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="3">${SILHOUETTES[shape]}</g><path d="${HIGHLIGHTS[shape]}" fill="none" stroke="${palette.light}" stroke-width="4"/></g></svg>`;
}
