# Tizenkét teljes, animált SVG-mese

Indítás a munkafa gyökeréből:

```sh
python3 tests/browser/audiobooks-fixture.py 5187
```

Megtekintés: http://127.0.0.1:5187/output/story-library/
Egy mese közvetlenül: `?story=story-07`.

Az előnézet és a Mesetár ugyanazt a közös SVG-rajztárat, jelenetadatokat és lejátszót használja. A 12 teljes eredeti Noémi-felvétel szól; új hanggenerálás nincs. A jelenetválasztó, a csúszka és a nyilak bármelyik részhez ugranak. A Mozgás kapcsoló álló illusztrációkra vált, a Nagy kép gomb teljes képernyőre nyitja a mesét, ahol a böngésző ezt támogatja.

Rajztár: `story-art/`. Jelenetek: `story-scenes/`, első mese: `story-visual-data.js` és `story-visuals.js`. Közös vezérlő: `story-visual-player.js`; jegyzék: `story-visual-library.js`. A bekezdések idősora `story-caption-timing.js`; a teljes eredeti szöveg továbbra is `audiobook-data.js`.

Időadatok újraépítése a meglevő helyi szóhatár-cache-ből, hangkészítés nélkül: `python3 scripts/extract-story-timing.py`, majd `node scripts/build-story-captions.mjs`. A generált részletes szóadatok helyi segédanyagok (`output/story-timing/`), nem részei a futtatási csomagnak.

Az előnézet helyi bemutató. A Mesetár beépített változatát a normál webhely buildje tartalmazza.
