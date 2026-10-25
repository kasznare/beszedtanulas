// Eleven v4 IPA for the new, multi-step chess puzzle instructions only.
// Display text stays in chess-data.js; old chess recordings keep their inputs.
export const CHESS_PHONETIC_IDS = Object.freeze([
  'chess_rook_three', 'chess_bishop_three', 'chess_knight_three',
  'chess_queen_open', 'chess_pawn_three', 'chess_rook_pin_three',
  'chess_rook_knight_open', 'chess_bishop_pawn_open', 'chess_queen_four',
  'chess_knight_four', 'chess_promotion_four', 'chess_king_five',
  'chess_rook_master', 'chess_bishop_master', 'chess_knight_master',
  'chess_queen_master', 'chess_pawn_master', 'chess_rook_pawn_master',
  'chess_rook_knight_master', 'chess_rook_pin_master', 'chess_king_master',
  'chess_queen_pawn_master', 'chess_bishop_knight_master', 'chess_promotion_master',
]);

// Stress, vowel length and Hungarian cs/s/sz/gy/ty clusters are explicit where
// the same word recurs in many instructions. Untagged words retain their
// native Hungarian spelling, as recommended for selective v4 IPA prompting.
export const CHESS_WORD_IPA = Object.freeze({
  csillagra: 'ˈt͡ʃilːɒɡrɒ',
  bástyával: 'ˈbaːʃcaːvɒl',
  bástyának: 'ˈbaːʃcaːnɒk',
  bástya: 'ˈbaːʃcɒ',
  bástyát: 'ˈbaːʃcaːt',
  futóval: 'ˈfutoːvɒl',
  huszárugrással: 'ˈhusaːruɡraːʃːɒl',
  huszárral: 'ˈhusaːrːɒl',
  gyaloggal: 'ˈɟɒloɡːɒl',
  vezérrel: 'ˈvɛzeːrːɛl',
  vezérré: 'ˈvɛzeːrːeː',
  vezérként: 'ˈvɛzeːrkeːnt',
  királyt: 'ˈkiraːjt',
  átlóját: 'ˈaːtloːjaːt',
});

const WORD = /[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu;
export function phoneticChessText(id, text, commonWords = {}) {
  if (!CHESS_PHONETIC_IDS.includes(id)) return null;
  return text.replace(WORD, word => {
    const key = word.toLocaleLowerCase('hu-HU');
    const ipa = CHESS_WORD_IPA[key] || commonWords[key];
    return ipa ? `/${ipa}/` : word;
  });
}
