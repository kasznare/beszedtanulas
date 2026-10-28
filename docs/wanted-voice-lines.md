# Wanted voice lines (not recorded yet)

The October 2026 game rework added modes whose instructions are shown as text only, because new recordings need ElevenLabs credit and the phonetic workflow in `AGENTS.md`. Nothing below has been generated. Each line lists the proposed clip id and the Hungarian text; before generating, write the phonetic input (`spokenText`/`spokenTarget`) as `AGENTS.md` requires and check the current ElevenLabs quota.

## Quota check, 2026-10-28

- Starter plan, 39 945 of 40 000 characters used: **55 characters left**, so no generation was attempted. The included quota renews on **2026-11-11, 18:43 UTC**. Reset credits are never redeemed (see `AGENTS.md`).
- Cost: 39 lines, 1 802 displayed characters. The paid input is longer (the `Mondjuk együtt: ` prefix and `/IPA/` words), roughly **3 300–4 000 characters**, well inside one month's budget.
- Before the run: add each id to its game's `*_CLIPS` object, give every new id a phonetic variant in a scoped `*-voice-pronunciation.js` (the chess and engineering files show the pattern), then `npm run generate-voice`, listen to a sample, and only then wire the games to play the clips.

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
