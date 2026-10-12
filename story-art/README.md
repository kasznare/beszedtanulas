# Közös SVG-rajztár

Mind a 17 teljes mű ugyanebből a könyvtárból rajzol. Egy modell javítása a következő betöltéskor minden azt használó jelenetben megjelenik; nincs mesénként másolt autó- vagy szereplőfájl.

- `base.js`: a közös Boribon-, Annipanni-, állat-, rendőrautó-, mentő-, tűzoltó-, kotró- és darumodellek; növények, házak, kert és út.
- `vehicles.js`: Villám, Turbó, Pötty és az ezüst autó közös formája. Szín, hátsó szárny és úszó/korcsolya/sí kiegészítők.
- `animate.js`: felhősodródás, növényringás, pislogás, madarak, pillangók, kerekek és jelzőfények.
- `workshop.js`: munkagépek és mechanikai bemutatók; műhely, emelő, szerszámok; emberek, korona, vár és vásár.
- `routes.js`: hegy, alagút, próbalabor, híd, garázs, térkép, busz, mentés, üzemanyag és eső.
- `seasons.js`: tó, medence, sziget, barlang, kunyhó, havas táj, jégpálya, nádas és vízi/téli kellékek.

- `classic-birds.js`: közös kiskakas, tyúk, cinege, galamb, szarka, varjú, daru, gólya, bölömbika és búbos banka.
- `classic-people.js`: az öreg király, királyfi, királykisasszonyok, császár, anya, szolgáló és Morzsa kutya.
- `classic-settings.js`: palota, erdei odú, fűzfa, szoba, fészek, kút, kemence, kas, kincsek, asztal, csizma és más kellékek.
- `classic-motion.js`: légzés, szárny, láb, csőr, kar, levél és kutyafarok mozgása ugyanabban a felvételhez kötött időben.

A gyárfüggvények SVG-karakterláncokat adnak. A `createBaseArt(prefix)` egyedi azonosítókat biztosít; minden festék- és gradient-hivatkozás ezekhez az azonosítókhoz kapcsolódik. Az animált résznek külön belső csoportja van, a helyét meghatározó külső transzformáció megmarad.

A jelenetek és történetspecifikus mozgások a `../story-scenes/` modulokban élnek. A `../story-visual-player.js` az MP3 tényleges lejátszási idejével hívja őket. Az öt klasszikus jelenete a kész Jessa-felvétel másodperceiben készült (`visualClock: recording` a katalógusban); a korábbi tizenkét mese meglévő időleképezése megmarad. Minden mozgás az idő tiszta függvénye: kereséskor nem kell végigjátszani a korábbi jeleneteket. `scene.rolling` adja a kerékforgást (szám: fok/másodperc; `true`: 180); a `scene.stillTime` a csökkentett mozgású állókép időpontja. Részletes interfész: `CONTRACT.md`.

Új vagy módosított modell után: `npm run build`. A teljes jelenet- és szöveglefedettség, valamint a közös modulok offline csomagba kerülése automatikusan ellenőrzött. Böngészős próba: `tests/browser/story-library.js`; helyi előnézet: `http://127.0.0.1:5187/output/story-library/` (`python3 tests/browser/audiobooks-fixture.py 5187`). A PNG-k az `output/playwright/` könyvtárban vannak.
