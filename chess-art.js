// Original vector silhouettes stay crisp on phones and work offline.
const silhouettes = {
  rook: '<path d="M14 11h8v7h7v-7h8v7h7v-7h8v17H14zM19 28h28l-3 23H22z"/>',
  bishop: '<path d="M32 7c-3 6-14 13-14 22 0 7 7 11 14 11s14-4 14-11C46 20 35 13 32 7zM25 40h14l5 12H20z"/><path d="m34 16-8 14" fill="none"/>',
  knight: '<path d="m22 9 12 4 8-5 1 13c10 10 8 24 7 31H18c0-11 7-21 14-26l-14 7-7-8 8-8z"/><path d="m27 19 3 1" fill="none"/>',
  queen: '<path d="m15 22 8 6 9-12 9 12 8-6-7 29H22z"/><circle cx="14" cy="17" r="4"/><circle cx="32" cy="10" r="4"/><circle cx="50" cy="17" r="4"/>',
  king: '<path d="M29 6h6v7h7v6h-7v7h-6v-7h-7v-6h7zM18 31c0-8 9-10 14-4 5-6 14-4 14 4l-5 20H23z"/>',
  pawn: '<circle cx="32" cy="18" r="10"/><path d="M26 28h12l2 14 7 9H17l7-9z"/>',
};
export function chessArt(type, color = 'white') {
  return `<svg class="chess-piece chess-piece-${type} chess-piece-${color}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2.5">${silhouettes[type] || silhouettes.pawn}<path d="M17 51h30l4 7H13z"/></g></svg>`;
}
