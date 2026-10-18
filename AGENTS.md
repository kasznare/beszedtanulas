# Projektutasítások

Az alábbi felületi követelmények minden új játékra és a meglévő játékok bővítésére érvényesek. A játék elsősorban iPhone-on és iPaden, kisgyerekeknek készül.

## Egyetlen cím, kevés szöveg

- Az aktuális játék neve egyszer, a közös felső sávban jelenjen meg. Például játék közben **Formadoboz**, a saját választóban **Montessori műhely** legyen a cím.
- Ne adj külön felső címkét, ismételt játékcímet, alcímet vagy állandó bevezető bekezdést a játéktérhez. A lehető legkevesebb szöveget használd; ha rövid útmutatás szükséges, a játék fölé kerüljön.
- A feladat megértéséhez szükséges jelölések, rövid visszajelzések és gombfeliratok maradjanak meg. A hosszabb magyarázat legyen lenyitható vagy a közös hangos segítségből elérhető.
- Használd a `game-heading.js` `setGameTitle(root, title)` függvényét minden belső nézetnél, a választóhoz visszatéréskor is. Nézetváltáskor a `focusGameTitle(root)` a látható felső címre vigye a billentyűzetfókuszt; ne fókuszálj elrejtett belső címre.
- Használd a közös felső visszanyilat, házikót és hanggombot. Ne jeleníts meg még egy azonos visszagombot a játéktérben. A meglévő, delegált visszalépési célpontokat csak az `app.js` navigációjával együtt módosítsd.

## A játéktér férjen el iPaden

- A normál játékhoz szükséges teljes játéktér és minden fő vezérlő férjen el álló és fekvő iPaden, oldalirányú és függőleges oldalgörgetés nélkül. A nehezebb, több elemes pályákra és a játék közben megjelenő visszajelzésekre is tervezz.
- A ténylegesen rendelkezésre álló magasságból indulj ki: `100dvh`, a felső sáv, a böngésző eszköztárai és a `safe-area-inset-*` térközök is számítanak. Ne csak a teljes kijelző névleges méretén ellenőrizz.
- Először a fölösleges szöveget és térközt csökkentsd; tableten használj egymás melletti játékteret és vezérlőket, arányosan méretezett táblát, összecsukható másodlagos választókat. Az érintési célterületek maradjanak legalább **44 × 44 CSS-pixelesek**.
- Ne globális `overflow: hidden` beállítással vagy az egész felület lekicsinyítésével tüntesd el a hibát: tartalom és gomb nem vágható le. A szülői beállítások és a kinyitott részletes segítség szükség esetén görgethetők.
- A közös szabályok a legutoljára betöltött `play-layout.css` fájlban vannak. Új játékot eleve ezekhez tervezz; ne készíts ismétlődő címeket arra számítva, hogy a CSS majd elrejti őket.

## Érintéses használat

- Mobilon és tableten a játék szövege és képei ne legyenek kijelölhetők, és hosszú nyomásra ne nyíljon másolási vagy képi helyi menü. Őrizd meg a `play-layout.css` közös `user-select`, `-webkit-user-select`, `-webkit-touch-callout` és képhúzást tiltó szabályait, valamint az `app.js` érintéses `contextmenu` kezelését.
- A beviteli mezők, a szerkeszthető tartalom és a szülői oldal megtartják a natív kijelölést és szerkesztést. Asztali gépen ne tiltsd le általánosan a kijelölést.
- A játékbeli húzás és koppintás működjön a kijelölés tiltása mellett is. A húzás ne görgesse el a játékot; a szükséges `touch-action` szabályt a húzható elemre vagy játéktérre korlátozd. Ne tiltsd le globálisan a böngésző nagyítását.

## Ellenőrzés új játék vagy felületi módosítás után

- Ellenőrizd az álló **768 × 900** és a fekvő **1024 × 680** tablet-nézetet Chromium- és WebKit-motorral. Telefonon legalább **390 × 844** álló és **932 × 430** fekvő méretet nézz meg: ne legyen vízszintes túlcsordulás, levágott vagy elérhetetlen vezérlő.
- Egészítsd ki a `tests/browser/ipad-layout.js` bejárását az új játék belső módjaival. Az alapnézet mellett próbáld ki a legsűrűbb pályát, a sikeres és hibás lépés utáni állapotot, a címváltást és a visszalépést is. Az új belső módok nem kerülnek automatikusan a tesztbe.
- Vizsgáld meg a képernyőképet is: a görgetési méret ellenőrzése önmagában nem veszi észre az egymást takaró vagy levágott elemeket. Ellenőrizd az érintéses kijelölést, a hosszú nyomást, a húzást és a szerkeszthető mezők kivételét.
- Böngészős próbát csak elkülönített tesztprofilban futtass. Megvalósítás módosítása után futtasd az `npm run build` és `git diff --check` ellenőrzést; csak dokumentáció módosításához nem kell a teljes játéktesztet újrafuttatni. A böngészős emulációt ne nevezd valódi iPad-próbának.

## Magyar felolvasás és kiejtés

- Mostantól minden újonnan generált vagy újragenerált beszédhanghoz kötelező fonetikus bemenetet használni. Ez minden játékhangra, rövid instrukcióra és teljes mesefelolvasásra érvényes. Generálás előtt a teljes felolvasási szöveget nézd át kiejtés szempontjából, készíts hozzá fonetikus változatot, és ténylegesen ezt küldd a hanggenerátornak.
- Ez a szabály a következő hanggenerálásokra vonatkozik, önmagában nem kérés a meglévő felvételek újragenerálására. A már elkészült mesék hangját a játékhangok javításakor ne generáld újra; ehhez külön, konkrét kérés szükséges.
- A megjelenített, helyesen írt magyar szöveg és a hanggenerátornak küldött fonetikus bemenet külön adat legyen (`text`, illetve `spokenText`/`spokenTarget`). A mesék eredeti szövegét, cselekményét és feliratait kiejtési javítás miatt ne írd át.
- Az adott hangmodell által támogatott fonetikus jelölést használd. Eleven v4 esetén használható a `/IPA/` bemenet; a meglévő `voice-pronunciation.json` közös szólistáját hasznosítsd újra, ahol elérhető. Teljes mondat átírásakor is őrizd meg a szóhelyek és az eredeti írásmód közötti leképezést.
- A modell jelöléseit a [hivatalos ElevenLabs kiejtési útmutató](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices) alapján ellenőrizd; más hangmodellre ne vidd át automatikusan ugyanazt a jelölést.
- Külön ellenőrizd a magyar rövid és hosszú magánhangzókat, a c/cs/s/sz/zs, gy/ty/ny hangokat, a mássalhangzó-kapcsolatokat, valamint a mondathangsúlyt és a szüneteket. A fonetikus átírás önmagában nem bizonyítja, hogy az új hang jobb lett; a gépi visszaírás sem igazolja a hanghosszúságot.
- Tömeges újragenerálás előtt készíts összehasonlítható mintát az érintett szavakból és mondatokból. Az új hanggal együtt készüljenek új szóidők, kivágási adatok és ellenőrzőösszegek; a régi hang csak a teljes, ellenőrzött helyettesítő elkészülte után cserélhető.
- A felhasználó által hibásnak jelzett kiejtési próbát jelöld elutasítottnak, és ne használd elfogadott mintaként vagy újragenerálási szabályként. Konkrét ellenpélda: a „Kérem a sapkát.” első IPA-próbájában a `sapkát` á-ja továbbra is rövidnek hallatszott; a bemenetben szereplő hosszúságjel nem volt elég.
- A mesefelolvasásokat, a családi felvételeket, az állathangokat és a zörejeket kezeld külön a játék szöveges hangjaitól. A Meseliget rövid játékinstrukciói nem azonosak a Mesetár teljes mesefelolvasásaival.
- Generálás előtt ellenőrizd a friss ElevenLabs-keretet és a tényleges fonetikus bemenet költségét. Elégtelen keretnél készíts előkészítési listát, és jelezd, hogy a hanggenerálás még nem történt meg. Ne ígérj automatikus későbbi futtatást külön kérés nélkül.

## Fiókhasználati korlát

Soha ne válts be usage-reset kreditet. A felhasználó ezt kifejezetten tiltja és vásárlásnak tekinti. A fennmaradó kvóta használatára, a munka folytatására vagy a következő visszaállításig történő kredithasználatra vonatkozó kérés sem engedély a resetkredit beváltására.
