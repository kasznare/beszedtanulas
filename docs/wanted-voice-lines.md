# Voice lines of the 2026 game rework

The October 2026 game rework added modes whose instructions were first shown as text only. All 39 lines below were recorded on **2026-10-28** and the games now play them. Their pronunciation comes from `rework-voice-pronunciation.js` (scoped IPA, one spoken token per displayed word); the displayed text lives in each game's `*_CLIPS` object.

## The recording run

- The default account (`~/.config/beszedtanulas/elevenlabs.env`) had 55 characters left until 2026-11-11, so the run used the second account's key, `~/.config/elevenlabs/api-key-new.txt`, through `ELEVENLABS_API_KEY_FILE=… npm run generate-voice`. Jessa was added to that account's library first (same voice id, same owner), so the voice is unchanged. No reset credit was redeemed.
- Cost: 3 209 characters; 29 980 remain on the second account.
- `chess_mate` was generated alone as a sample and transcribed before the bulk run.

## Listen to these

`scripts/transcribe-voice.py` (local faster-whisper, no network) read all 39 clips back. A difference is a flag, not a proven error, and the recognizer misspells common words (koppints → "koppincs", rúd → "ród"). These transcripts were far enough from the text that a person should listen to them:

- `counting_how_many` — heard "Hávon, kapj nincs a számra".
- `logic_route_bump` — heard "Énen terves túlra az utat" for „Innen tervezd újra az utat".
- `chess_pawns_intro` — heard "Jutta azat" for „Juttasd át".
- `engineering_bar_broke` — heard "Erőségy meg három sögekkel" for „Erősítsd meg háromszögekkel".
- `patterns_grow` — heard "Hanykat jön ezután" for „Hány pötty jön ezután".
- `logic_route_2` — heard "hásozs" for „házhoz" and "Visszavonáson".
- `patterns_odd_fix`, `workshop_balance_fewest` — single words heard oddly („illik", „ugyanannyit").

To reject one: add it to `voice-rejections.json` with the fingerprints from `audio/voice/generated.json`, change its IPA in `rework-voice-pronunciation.js`, and rerun `npm run generate-voice --ids <id>`; the rejected input can never be reused.

## The lines

## Sakkliget
- `chess_tactics_intro` — „Most a sötét is lép! Gondold át, mit válaszol.”
- `chess_tactic_failed` — „A sötét visszaütött. Vond vissza, és keress jobb lépést!”
- `chess_mate` — „Matt! A sötét király nem tud elmenekülni.”
- `chess_pawns_intro` — „Gyalogcsata! Juttasd át egy gyalogodat a tábla túlsó végére!”

## Képek és hangok
- `listening_bingo_none` — „Ha nincs ilyen képed, koppints a „Nincs nálam” gombra!”
- `listening_bingo_win` — „Bingó! Megvan egy teljes sor!”
- `listening_phrase_start` — „Hallgasd meg, mit mondok, és keresd meg a képét!”
- `flip_missing_two` — „Most két kép bújik el. Melyik kettő hiányzik?”
- `memory_sound_name_start` — „Fordíts fel két kártyát! Keresd meg az állat hangját és a nevét!”
- `abk_quiz_intro` — „Állatkvíz! Hallgasd meg, ki szól, és koppints rá!”
- `cards_peek_intro` — „Kukucs! Hol van? Keresd meg a képet!”
- `r_post_wishes` — „Minden ház mást kér. Mondd a szót, aztán vidd a csomagot ahhoz, aki kérte!”

## Játék Macival, Számok
- `teddy_expressive_intro` — „Most te kérsz a macitól! Válassz egy finomságot!”
- `counting_how_many` — „Hány van? Koppints a számra!”
- `pour_exact_start` — „Pont elég víz van a kancsóban. Vigyázz, ne folyjon ki!”
- `pour_exact_empty` — „Elfogyott a víz. Kezdjük újra új poharakkal!”

## Formák és minták
- `patterns_gap` — „Melyik hiányzik a sorból?”
- `patterns_odd` — „Melyik nem illik a sorba? Koppints rá!”
- `patterns_odd_fix` — „Megtaláltad! Mi illik a helyére?”
- `patterns_grow` — „Hány pötty jön ezután? Számoljuk meg!”
- `montessori_grid_missing` — „Melyik hiányzik a rácsból? Tedd a helyére!”
- `montessori_grid_odd` — „Melyik nem illik a rácsba? Koppints rá, aztán tedd a helyére a jót!”
- `montessori_tower_lean` — „Billeg a torony! Koppints a felső korongra, és vedd le!”
- `workshop_balance_missing` — „A jobb oldalon már van egy rúd. Egyetlen rúddal tedd egyensúlyba a mérleget!”
- `workshop_balance_fewest` — „Rakd ki ugyanannyit minél kevesebb rúddal!”
- `workshop_design_build` — „Tervezd meg a saját mintádat! Válassz két vagy három formát, a fonal majd ismétli őket.”

## Kirakók és építés
- `puzzle_strict_on` — „Most csak a jó helyre kerülhet a darab.”
- `differences_closer` (re-record; today it repeats the hint) — „A kisebb jelölésen belül nézd meg jól a részleteket!”
- `engineering_flag` — „Elérted a zászlót!”
- `engineering_challenge` — „Kész! Ügyesen építettél!”
- `engineering_bar_broke` — „Eltört egy rúd! Erősítsd meg háromszögekkel!”

## Fejtörők
- `logic_route_bump` — „Hoppá, a róka itt elakadt! Innen tervezd újra az utat!”
- `logic_route_shortest` — „A legrövidebb út ennyi lépés volt:” (followed by `logic_n_*`)
- `logic_route_2` (re-record; level 2 now has two parcels) — „Vidd el mindkét csomagot a házhoz! A köveket kerüld meg! Írd meg az egész utat, aztán próbáld ki!”
- `logic_machine_locked` — „Előbb próbáld ki a gépet a Géppróba gombbal!”
- `logic_shop_next` — „Itt a következő vevő!”
- `logic_shop_same` — „Ez a kosár maradhat így.”
- `city_story_new_stamp` — „Új történet a gyűjteményben!”
- `city_story_locked` — „Ez az út most zárva van. Egy korábbi nyom nyithatja ki.”
