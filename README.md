# Beszédtanulás

Magyar képes és hangos játék kisgyerekeknek, elsősorban iPhone Pro Max és iPad képernyőre. Négy nagy képes csempéről indul: beszélő képek, utánzás, számolás és meglepetéskártyák. Minden játékból a házikó vezet vissza a főképernyőre.

## Indítás

A projekt könyvtárában:

~~~bash
npm run start
~~~

Nyisd meg: <http://localhost:5173>. Python 3 és Node.js/npm szükséges. Nincs külön frontendfordítás; az indítóparancs automatikusan elkészíti az offline fájljegyzéket. A játék futtatásához nem kell npm-függőségeket telepíteni vagy hangszolgáltatási API-kulcsot megadni.

## Játék és beállítások

- **Képek:** nézegetés hat témakörrel és 24 magyar szóval, vagy a **Hol van?** hallás utáni választójáték. Elhangzik egy szó, és két vagy három nagy kép közül kell választani, olvasás és mikrofon nélkül. Hibás választás után újra megszólal a szó; a kör végén egy jutalom jár.
- **Mondd utánam:** egy vagy két szavas gyakorlás. A mikrofon gomb egy próbát, a nagy lejátszógomb egy vezetett szókört indít. A megállítás és a hazalépés leállítja a figyelést.
- **Számoljunk:** tárgyak egyenkénti megszámolása és képes mennyiségválasztás.
- **Mi bújt el?:** hat felfordítható, beszélő kép; mikrofon nélkül is játszható.

A főképernyő fogaskereke egy egyszerű felnőtt belépőt nyit. Itt választható 3 / 5 / 10 szavas kör, témakör, számolási nehézség, két/három képes választás, hang és hangos segítség. A számtani feladat véletlen belépés ellen szolgál, nem felhasználói hitelesítés.

A szülői oldal tetején a **Ki játszik?** rész választja ki a gyereket vagy a szülői próbát. A **Próba indítása** a játékokhoz vezet; közben a fejléc és a főképernyő is jelzi a próbát. A **Vissza a gyerekhez** gomb visszatölti a gyerek eredményeit és megnyitja a főmenüt. Sikertelen helyi mentésnél az előző profil marad aktív, a hiba a gomb mellett jelenik meg. A felhős kapcsolat technikai mezői a **Kapcsolat adatai** alatt nyithatók ki.

A rövidebb fekvő telefonos nézet külön tömör elrendezést kapott. A számolás tárgyválasztója és a meglepetésjáték újrakezdése oldalra kerül; a kör végi ablak mindkét nagy gombja görgetés nélkül elérhető. A 932 × 350-es nézetet szimulált oldalsó és alsó biztonsági térközzel is ellenőriztük.

A haladás a böngésző helyi tárolójába kerül. A **Gyerek** és a **Szülői próba** külön eredményt tárol; a szülői profilváltás újratöltés után is megmarad. A hang és a többi játékbeállítás az eszközön közös. A bátorító felismerési mód a megszólalást jutalmazza; nem ellenőrzi a kiejtés helyességét. A szófelismerő és két szavas mód a böngésző beszédfelismerését használja. A valódi iPhone/iPad mikrofonos működés még eszközön ellenőrzendő.

## Mikrofonos próbák

A villogó jelzés akkor indul, amikor a hangfigyelés ténylegesen készen áll. Egy szó kimondására 6,5 másodperc, két szóra 9 másodperc áll rendelkezésre; a felismert jó végleges eredmény hamarabb lezárhatja a próbát. A két külön részletként felismert szó összetartozhat, az ugyanarra a részletre adott egymást kizáró javaslatok nem számítanak két szónak. A később kijavított részeredmény nem marad a válaszok között.

A szófelismerő és két szavas mód a böngésző saját beszédfelismerőjét használja; külön hangenergia-mikrofont csak a bátorító mód nyit. Nincs automatikus angol nyelvű újrapróbálás. Engedélyezési, indítási vagy hálózati hiba esetén megjelenik a **Képekkel játszom** gomb, a szülői oldalon pedig az ok. Az indulás előtt meghiúsult kapcsolat nem számít gyermekpróbának. A házikó és a leállítás megszakítja a figyelést.

A böngészős ellenőrzés szimulált felismerési eseményekkel és szintetikus mikrofonjellel történt. A valódi gyerekbeszéd, a Bluetooth és az iPhone/iPad kezdőképernyős használat még készüléken ellenőrzendő.

## Eredmények mentése és visszaállítása

A szülői **Eredmények megőrzése** panel JSON-fájlba menti az aktív profil számlálóit és szóeredményeit. Az összesítő jelzi, melyik profil van kiválasztva. A fájl átvihető másik eszközre; a másik profil eredményeit, kapcsolatkulcsokat és játékbeállításokat nem tartalmazza. Visszaállítás előtt látható a mentés ideje és tartalma. A mentett eredmények az aktív profil mostani eredményei helyére kerülnek, nem adódnak hozzájuk. Hibás, ismeretlen verziójú vagy 1 MB-nál nagyobb fájl nem alkalmazható.

A **Helyi eredmények nullázása** külön megerősítést kér, és megtartja a játékbeállításokat, valamint a másik profil eredményeit. A legutóbbi nullázás vagy visszaállítás profilonként egyszer visszavonható; ez a lehetőség profilváltás és újratöltés után is megmarad. A visszavonás az azóta szerzett eredményeket is az előző állapotra cseréli.

Ezek a helyi műveletek és a profilváltás szüneteltetik a felhőszinkront. Újraindításához külön szülői megerősítés kell: az összevonás megtartja a magasabb számlálókat, ezért egy helyi nullázás előtti felhős eredmény visszakerülhet. A műveletek nem törölnek a felhőből. Másik játékablak mentése után a régi ablak további írás helyett frissítést kér; az ottani eredmény előbb fájlba menthető. Az export formátuma: `beszedtanulas-progress`, 1. verzió; megvalósítás: **progress-data.js**, **progress-tools.js**, **progress-profiles.js**.

## Offline játék és ikon a főképernyőn

Az oldal az első megnyitáskor letölti a felületet és mind a 151 hangfájlt. A szülői beállítások **Játék internet nélkül** részében várd meg a „Letöltve” visszajelzést. Ezután a képes játékok, a számolás és a hangok hálózat nélkül is használhatók. A szófelismerés a böngészőtől függően internetet kérhet.

iPhone/iPad Safariban a Megosztás menü **Főképernyőhöz adás** pontjával hozható létre játékikon. Az új ikonnal először internet mellett indítsd el a játékot, és abban az ablakban is várd meg a letöltés végét. [Apple útmutató](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

A hibás vagy megszakadt letöltés újrapróbálható. Az új verzió a szülői felületen indítható; másik nyitott játékablak mellett nem aktiválódik. A böngésző a hely felszabadításakor törölheti a tárolt fájlokat; a hiányzó csomag a szülői felületen újra letölthető.

A service worker HTTPS vagy localhost címet igényel. A helyi hálózatos HTTP-cím önmagában nem biztosít offline telepítést és mikrofonhozzáférést. A projekt ebben a fejlesztési körben nem lett közzétéve.

Fejlesztés közben HTML-, JavaScript-, CSS- vagy hangmódosítás után:

~~~bash
npm run build-offline
npm run check
~~~

Ez frissíti a generált **sw.js** fájlt. A kézzel szerkesztendő működés a **service-worker-runtime.js**, a fájljegyzék összeállítása a **scripts/build-offline.mjs**, a szülői vezérlés az **offline-client.js** fájlban van. A gyökérkönyvtár JavaScript- és CSS-fájljai automatikusan bekerülnek; új almappás modulok vagy képek esetén bővítsd a generátor fájllistáját is. A már megnyitott játékban a szülői **Új verzió betöltése** gombbal alkalmazható a frissítés.

## Hanganyagok

Az alapértelmezett új magyar mesélőhang 127 statikus MP3-fájlból áll: szavak, kifejezések, számok, mennyiségek, kérdések és rövid segítségek. A géppel készült hangok az **audio/voice/** könyvtárban találhatók. A meglévő 24 saját szófelvétel az **audio/** könyvtárban maradt, és a szülői beállításból visszaválasztható.

Új hangok készítése vagy hiányzó hangok pótlása:

~~~bash
npm run generate-voice
~~~

Ehhez uv, internetkapcsolat és az elkülönítve futtatott edge-tts 7.2.8 szükséges. A generátor csak a rögzített szóanyagot és a játék szövegeit küldi a hangszolgáltatáshoz. A lejátszás már a helyi MP3-fájlokat használja. A generátor kihagyja a meglévő hangfájlokat; megváltoztatott szövegnél az adott generált fájlt előbb külön el kell távolítani.

Források:

- **game-data.js:** szavak, témák, kifejezések és elfogadott gyereknyelvi változatok.
- **scripts/build-voice-manifest.mjs:** segítségszövegek és hangjegyzék-generálás.
- **voice-library.js**, **audio/voice/manifest.json:** generált hangjegyzékek.

Hiányzó saját felvételnél az új hangra, hiányzó generált hangnál a böngésző magyar felolvasására vált a játék. A felolvasás minősége ilyenkor eszközfüggő.

## Saját felvételek

Az audio könyvtár szóazonosító szerint elnevezett MP3-fájljai cserélhetők saját hangra. A beállításban válaszd a „Meglévő saját felvételek” lehetőséget.

~~~bash
npm install
npm run record-words
npm run convert-raw-audio
~~~

A record-words interaktívan rögzít; a convert-raw-audio a rawaudio könyvtár felvételeit alakítja MP3-fájlokká. Ezekhez ffmpeg szükséges. Új szót a game-data.js megfelelő témájába is fel kell venni. A régi generate-audio parancs az audio könyvtár fájljait készíti el; a saját felvételek megtartásához az új generate-voice parancsot használd.

## Ellenőrzés

~~~bash
npm run check
git diff --check
~~~

Az ellenőrzés a JavaScript szintaxisát, a hang- és tartalomjegyzék konzisztenciáját, az offline csomag frissességét, valamint a kétszavas felismerés, a felismerési események és megszakítások, képes választójáték, offline letöltés, eredmény-visszaállítás, profilváltás és felhős mentési sor fontos eseteit vizsgálja. A böngészős és eszközön végzendő ellenőrzések a continuation.md fájlban szerepelnek.

## Opcionális felhős mentés

A meglévő Supabase-kapcsolat beállításai a supabase-config.js fájlban és a szülői felületen vannak. A beépített közös `kid` / `admin` mintakódokkal a játék nem indít felhős kapcsolatot. A helyi játék, a két profil és a fájlmentés ettől függetlenül működik. Személyes felhős használat előtt külön profilok, hitelesítés és hozzáférési szabályok szükségesek; önmagában az egyedi profilkód nem hitelesítés.

A helyi tárolás a szervercím, szerep és profilkód alapján különíti el az eredményeket. A korábbi mentés az eredeti profilnál marad; másik szerver vagy profil nem kap belőle automatikus másolatot. A régebben összekeveredett gyerek/szülői eredmény utólag nem választható szét megbízhatóan.

A jelenlegi számlálós séma összevonása szavanként a nagyobb próbálkozás- és sikerszámot tartja meg; a sikersorozat a frissebb dátumhoz tartozik. Egy ismételt letöltés nem adja hozzá újra ugyanazt az eredményt. A feltöltés közben szerzett haladás következő küldésbe kerül, hálózatvisszatéréskor a várakozó mentés újrapróbálkozik. Egy kérés legfeljebb 12 másodpercig vár; profilváltás megszakítja a kapcsolatot, a késői válasz nem kerülhet a másik profilba.

Ez az összevonás megőrzi a helyi számlálókat, de több eszköz párhuzamos gyakorlását nem összegzi pontosan, és a szerver két egyidejű írását sem teszi atomivá. Ehhez azonosítható gyakorlási események és szerveroldali tranzakció szükséges. A felhő jelenleg csak szóeredményeket tárol; a lejátszás-, összpróba- és jutalomszámlálók a helyi mentésben és a JSON-fájlban vannak.

A böngészős szinkront elkülönített, szimulált szolgáltatással ellenőriztük; éles adatokon nem történt próba. A részletes folytatási terv: [continuation.md](continuation.md).
