# Beszédtanulás

Magyar képes és hangos játék kisgyerekeknek, elsősorban iPhone Pro Max és iPad képernyőre. Öt nagy képes csoportból indul. A visszanyíl az előző választóhoz vezet, a házikó közvetlenül a főképernyőre visz.

Éles oldal: [Beszédtanulás a GitHub Pagesen](https://kasznare.github.io/beszedtanulas/). Nincs szükség ChatGPT-bejelentkezésre. A `main` ágra küldött commitot a meglévő GitHub Pages **pages build and deployment** folyamata automatikusan kitelepíti. Közzététel előtt `npm run build` és `git diff --check`, utána commit és push; külön Sites-kitelepítés nem kell.

## Indítás

A projekt könyvtárában:

~~~bash
npm run start
~~~

Nyisd meg: <http://localhost:5173>. Python 3 és Node.js/npm szükséges. Nincs külön frontendfordítás; az indítóparancs automatikusan elkészíti az offline fájljegyzéket. A játék futtatásához nem kell npm-függőségeket telepíteni vagy hangszolgáltatási API-kulcsot megadni.

## Játék és beállítások

| Csoport | Játékok |
| --- | --- |
| **Képek és hangok** | Képes témák, Hol van?, Hangos állatkönyv |
| **Mondd utánam** | Egy szó, Két szó együtt, Róka R-kalandja |
| **Számok és logika** | Számoljuk meg!, Keresd meg!, Furfangliget, Műhelyliget, Sakkliget |
| **Mesék és Maci** | Mesetár, Etesd meg a macit!, Maci öltözik, Meseliget |
| **Kirakók és ügyesség** | Képpárok, Képkirakó, Töltsünk a barátainknak!, Mi bújt el? |

Minden játéknak egy helye van. A fejléc mutatja a csoportot; a visszanyíl megnevezi a célját. A többjátékos ligetekben és az R-kalandban először a saját választó nyílik meg, majd a csoport. A kör végi ablakból is vissza lehet lépni a csoporthoz. A böngésző vissza/előre gombja megtartja a kiválasztott képes témát és a számolási módot. A mentett ligetfeladatok és eredmények kilépés után is megmaradnak; az új körrel induló játékok visszatéréskor új kört kezdenek.

- **Képek és hangok:** nézegetés hat témakörrel és 24 magyar szóval, vagy a **Hol van?** hallás utáni választójáték. Elhangzik egy szó, és két vagy három nagy kép közül kell választani, olvasás és mikrofon nélkül. Hibás választás után újra megszólal a szó; a kör végén egy jutalom jár.
- **Hangos állatkönyv:** négy részletes, lapozható jelenet: tanya, kert, tópart és erdő. Tizenkét valódi állathang; a képen lévő állat és az alsó szimbólumgomb is megszólaltatja. Gombbal, nyílbillentyűvel vagy vízszintes húzással lapozható, az utolsó lap és a hangpontok beállítása megmarad. A megnyomott állat a hang tényleges indulásától a végéig kap jelzést. A Képek és hangok menüből érhető el.
- **Róka R-kalandja:** Hangvadász, Robotpostás, Perecműhely, Mondókaliget és Saját visszhang. Harminc képes R-es szó, rövid kifejezések, négy saját mondóka; közös, hangészlelős és magyar szófelismerős gyakorlás. A Mondd utánam menüből érhető el.
- **Mondd utánam:** egy vagy két szavas gyakorlás. A mikrofon gomb egy próbát, a nagy lejátszógomb egy vezetett szókört indít. A megállítás és a hazalépés leállítja a figyelést.
- **Számok és logika:** tárgyak egyenkénti megszámolása és képes mennyiségválasztás, valamint a Furfangliget és Műhelyliget fejtörői.
- **Sakkliget:** hat sakkfigura lépésfelfedezése, három csillag gyűjtése és tíz egyetlen lépéssel megoldható kis helyzet. Az útban álló figurák, az ütés, a huszár ugrása, a gyalog első kettős lépése és a király biztonsága is gyakorolható. Pöttyös segítség, visszavonás, magyar hang és billentyűzetes kezelés; nincs ellenfélkör vagy időkorlát.
- **Mi bújt el?:** hat felfordítható, beszélő kép; mikrofon nélkül is játszható.
- **Képpárok:** animált képes memóriajáték 2 / 3 / 4 / 6 párral, a választott témakörből. A képes segítség röviden megmutatja a teljes táblát, a rossz párosítás javítható, a teljes kör egyszer ad jutalmat. A párok száma a játékban és a szülői beállításban is választható.
- **Töltsünk a barátainknak!:** öntős ügyességi játék Macival és Nyuszival, két jelölt pohárral. Telefonon balra/jobbra döntve, érintéssel vagy egérrel az öntésgombot nyomva tartva, gépen a bal/jobb nyíllal játszható. Három szint: automatikus megállás, önálló adagolás, két különböző mennyiség. Túltöltés után egyetlen pohár újrapróbálható; a befejezett piknik egyszer ad jutalmat.
- **Képkirakó:** négy részletes puzzle kép (tanya, kert, tópart, erdő), képenként 6 / 8 / 10 darabbal. Koppints egy darabra, majd bármelyik mezőre, vagy húzd oda egérrel/érintéssel. A lerakott darabok áthelyezhetők, cserélhetők és visszatehetők a tálcára. A **Mutasd a képet!** kapcsolható halvány mintaképet ad. Csak a helyesen összeállított kép ad jutalmat; a kész kép a sikerablak előtt még körülbelül egy másodpercig látszik.
- **Műhelyliget:** három Montessori ihlette, kézzel alakítható fejtörő, három választható szinten. **Válogatókert:** szín, majd szín és forma, végül méret szerinti válogatás. **Mintaszövő:** egyszerű és összetett ismétlődések, a legnehezebb szinten külön szín- és formaszabály. **Egyensúlyműhely:** számbontás színes rudakkal; nehezebb szinten pontosan két/három különböző hosszúságú rúd szükséges. Minden mozdulat visszavonható; három fokozatú segítség, játékonként és szintenként külön mentett feladat és eredmény. A szín mellett jel is segít az azonosításban.

A Meseliget térképén az új piknik mérete választható, a szülői számolási tartományig, legfeljebb tíz szereplővel. A mentett kaland létszáma megmarad. Szabad játékban fix vagy váltakozó mennyiséggel is lehet gyakorolni; az utolsó lépés és a tálca újrakezdése is visszavonható. A Furfangliget helyben választható nehézséget, közvetlen számbemenetet, animált kosárszállítást, műveletenként lefutó géppróbát és mozgó rókával bejárható, számozott útitervet kapott.

A főképernyő fogaskereke egy egyszerű felnőtt belépőt nyit. Itt választható 3 / 5 / 10 szavas kör, témakör, számolási nehézség, két/három képes választás, hang és hangos segítség. A számtani feladat véletlen belépés ellen szolgál, nem felhasználói hitelesítés.

A szülői oldal tetején a **Ki játszik?** rész választja ki a gyereket vagy a szülői próbát. A **Próba indítása** a játékokhoz vezet; közben a fejléc és a főképernyő is jelzi a próbát. A **Vissza a gyerekhez** gomb visszatölti a gyerek eredményeit és megnyitja a főmenüt. Sikertelen helyi mentésnél az előző profil marad aktív, a hiba a gomb mellett jelenik meg. A felhős kapcsolat technikai mezői a **Kapcsolat adatai** alatt nyithatók ki.

A rövidebb fekvő telefonos nézet külön tömör elrendezést kapott. A számolás tárgyválasztója és a meglepetésjáték újrakezdése oldalra kerül; a kör végi ablak három nagy gombja görgetés nélkül elérhető. A 932 × 350-es nézetet szimulált oldalsó és alsó biztonsági térközzel is ellenőriztük.

A haladás a böngésző helyi tárolójába kerül. A **Gyerek** és a **Szülői próba** külön eredményt tárol; a szülői profilváltás újratöltés után is megmarad. A hang és a többi játékbeállítás az eszközön közös. A bátorító felismerési mód a megszólalást jutalmazza; nem ellenőrzi a kiejtés helyességét. A szófelismerő és két szavas mód a böngésző beszédfelismerését használja. A valódi iPhone/iPad mikrofonos működés még eszközön ellenőrzendő.

## Állathangos képeskönyv

A könyv négy eredeti, 1536 × 1024-es illusztrációja a beépített képalkotóval készült. WebP formában, összesen kb. 2 MB mérettel kerülnek az offline csomagba. A képeken megnyomható területek a tényleges állatok helyéhez igazodnak; a hangpontok elrejthetők. A lapozás megszakítja az előző hangot. A könyvben nincs mikrofon, jutalom vagy pontozás; a beszédpróbák és a meglévő játékok mentése változatlan.

A tizenkét állathang rövid, 1,67–4,8 másodperces, mérsékelt hangerejű valódi felvétel. A hangok és a forrásjegyzék teljes letöltés után offline is elérhetők. A hanghibát a felület jelzi, és újra meg lehet nyomni az állatot; a játék nem helyettesíti az állathangot szövegfelolvasással. A szerzők, eredeti Commons-felvételek, közkincs/CC BY-SA licencek és az átalakítások a könyv **Képek és hangok forrása** gombján keresztül jelennek meg. A CC BY-SA kivágások az eredeti licencüket megtartják.

Megvalósítás: `animal-book-data.js`, `animal-book-game.js`, `animal-book.css`; források, kivágások és SHA256: `animal-book-audio.json`; képek és a végső promptkészlet: [assets/animal-book/README.md](assets/animal-book/README.md). Az utolsó lap és a jelölők külön eszközbeállításban (`beszedtanulas.animalBook.v1`) tárolódnak, nem eredményadatként.

## Róka R-kalandja

Öt önálló játék közös, nagy gombos felülettel:

- **Hangvadász:** hallott szó képének keresése, vagy R-t tartalmazó szó kiválasztása két/három meghallgatható kép közül. Téves választás után újrapróbálható; három/öt képből álló körök.
- **Robotpostás:** szavak vagy rövid kifejezések utánmondása, majd a csomag elküldése. A felismert szó, a hang észlelése és a közös kimondás külön visszajelzés.
- **Perecműhely:** szóeleji, szóközi és szóvégi szócsoportra váltható gyakorlás. Minden továbbjelzett feladat új díszt ad a műhelyhez.
- **Mondókaliget:** négy eredeti, négysoros mondóka. Teljes felolvasás, sorválasztás, soronkénti közös vagy mikrofonos gyakorlás; a hanghoz igazodó képes jelzés. Egy sor ismétlése nem számít új befejezett körnek.
- **Saját visszhang:** natív böngészős hangfelvétel, legfeljebb nyolc másodpercig, majd saját hang és mintahang felváltva hallgatható. Elutasított engedély vagy hiányzó felvevő esetén a közös gyakorlás elérhető marad.

A felnőtt beállításai külön eszközbeállításban (`beszedtanulas.rPractice.v1`) őrzik a szócsoportra, szóra/kifejezésre, körhosszra, képszámra és gyakorlási módra vonatkozó választást. A csoportok a hang helyét jelzik, nem kötelező nehézségi sorrendet. A mintahangok gépi magyar felvételek. A szólistát a gyerekhez, szükség esetén logopédus útmutatásához lehet igazítani.

Alapból **Együtt · mikrofon nélkül** mód indul. A **Bátorító** mód elegendő ideig tartó hangot észlel; a **Szófelismerés** mód a magyar beszédfelismerő szövegét ellenőrzi teljes szavakkal, egyetlen felismerési változaton belül. Egyik sem minősíti az R hang képzését. Hiba vagy bizonytalan felismerés után új próba és közös továbbhaladás is választható. A szófelismerő böngészőszolgáltatása internetet használhat és feldolgozhatja a hangot; a közös mód, a mintahangok és a helyi felvevő offline is működnek.

A visszhang felvétele csak a nyitott oldal memóriájában marad: nincs feltöltés, fájlmentés, felhőszinkron vagy eredménymentés a hangból. Új szó, másik játék, kilépés, frissítés vagy elrejtett dokumentum elengedi a felvételt. Minden megszakítás leállítja a mikrofont, a késve megérkező engedélyhez tartozó streamet is. A visszajátszási Blob URL a lejátszás végén/megszakításakor visszavonódik. A rögzítés 2 MB fölött is leáll.

A közös körök, képes találatok/mikrofonos próbák, felismert szavak/sorok és felnőtt által jelzett gyakorlások profilonként kerülnek az eredménymentés `rPractice` részébe. Fájlmentés, visszaállítás és nullázás/visszavonás támogatott; a régi mentésekben hiányzó rész nulláról indul. Az alap beszédjáték szóeredményei és jutalomszámlálója ettől függetlenek. Saját felvétel és felismert szöveg nem kerül az eredménymentésbe.

Megvalósítás: `r-practice-data.js`, `r-practice-game.js`, `r-practice-media.js`, `r-practice-voice.js`, `r-practice.css`; célzott ellenőrzések: `tests/r-practice.test.mjs`, `tests/browser/r-practice.js`. A saját mondókák, szavak és útmutatók 96 új, lenyomattal és szóidőkkel hitelesített statikus hangot kaptak.

A körvégi sikerablak és a játékok saját lezáró kártyája körülbelül egy másodperc múlva jelenik meg, így a kész jelenet még látható marad. Rejtett ablaknál a várakozás szünetel; új kör vagy kilépés megszünteti a függő visszajelzést. A már megszerzett jutalom azonnal mentődik.

## Képkirakó puzzle

A **Kirakók és ügyesség → Képkirakó** a hangos állatkönyv négy eredeti illusztrációját használja, külön képletöltés nélkül. A kép 3 × 2, 4 × 2 vagy 5 × 2 négyszögletes darabra oszlik; a tálca minden új körben megkeveredik. Bármelyik mezőre lehet darabot tenni. A táblán lévő darabok újra megfoghatók; két foglalt mező között cserélődnek. Ha a tálcáról teszel darabot foglalt mezőre, az ott lévő visszakerül a tálcára. A **Vissza a tálcára** gomb vagy a tálcára húzás is segít átrendezni a képet. Billentyűzettel a Tab és Enter/Space választ darabot és helyet; az Escape megszünteti a kijelölést. A darab húzását a kilépés, az érintés megszakítása vagy az ablak elrejtése megszakítja.

Az utolsó kép és darabszám az eszköz közös játékbeállításaiban megmarad. Képváltás, darabszámváltás, újrakezdés vagy újbóli belépés új táblát indít; félbehagyott táblát nem mentünk. Egy befejezett tábla egy jutalmat ad az aktív gyerek/szülői próba profilnak, a beszédpróbák számlálóját nem módosítja. A magyar mintahangok teljes offline letöltés után hálózat nélkül is működnek. A helyes elhelyezés hangja csak valóban helyes mezőn szólal meg. A hangos útmutató az éppen említett részt finom, statikus zöld kerettel emeli ki.

Megvalósítás: `puzzle-data.js`, `puzzle-game.js`, `puzzle.css`; belépés, beállításmentés és jutalom: `app.js`, `index.html`. A képfeldarabolás, keverés, elhelyezés és beállításbetöltés ellenőrzése: `tests/puzzle.test.mjs`; a teljes böngészős próba: `tests/browser/puzzle.js`, elkülönített Playwright-munkamenetben.

## Öntős ügyességi játék

A **Kirakók és ügyesség → Töltsünk a barátainknak!** saját SVG-jelenetet, tizenhárom magyar hangot és halk, helyben előállított csobogást használ. A nagyobb kancsó finoman billen és mozog a kiválasztott pohárhoz; benne a fogyó víz felszíne döntés közben is vízszintes marad. A folyamatos vízsugár a valódi csőrtől a pohár emelkedő vízfelszínéig ér. A tele pohárból kétoldalt kifolyik a víz, az asztalon tócsa marad. A kancsó véges mennyiségű vizet tartalmaz; a **Feltöltöm** gomb megőrzi a poharak tartalmát. A kiválasztott pohár kiürítése a mellette levő tócsát is eltünteti.

Mindhárom szinten a játékos állítja meg az öntést; a kezdőszint lassabb és szélesebb elfogadó sávot ad. A jelnél elengedett pohár elkészül, de továbbra is tölthető és túltölthető. Két megfelelő pohár után a **Kész a piknik!** ad egyszeri jutalmat az aktív profilnak, a beszédpróbákat nem növeli. Egérrel vagy ujjal a kancsót lefelé húzva is önthetünk: a húzás mértéke adja a folyás erősségét, az elengedés/megszakítás megállítja a vizet. A nyomva tartott gomb és a bal/jobb nyíl megmarad. A szint az eszköz közös beállításaiban megmarad.

A **Döntögetéssel** gomb indítja a mozgásengedély kérését, ha a böngésző igényli. HTTPS és használható orientációs adatok szükségesek. A kényelmes kezdő kéztartást fél másodperc alatt kalibrálja; a kis mozdulatokat figyelmen kívül hagyja, az adatokat simítja. Másik pohárra váltás előtt középhelyzet szükséges. Álló/fekvő képernyőváltás új kalibrálást indít. Elutasított engedély vagy elmaradó szenzoradat esetén a gombos mód elérhető. Háttérbe lépés, ablakfókusz-vesztés és kilépés leállítja a folyást és a csobogást; visszatérés nem folytatja a nyomva tartott gombot. Mozgásengedélyt minden új belépéskor a játékos kezdeményez. A fizikai iPhone/iPad Safari és főképernyős döntésvezérlés még készüléken ellenőrizendő.

Megvalósítás: `pour-data.js`, `pour-game.js`, `pour.css`; hangjegyzék és narráció a meglévő rendszerben. A szabályok ellenőrzése: `tests/pour.test.mjs`; a billentyűzetes, egérrel végzett, szimulált szenzoros és offline folyamat: `tests/browser/pour.js`, külön Playwright-munkamenetben. A játék és hangjai az offline csomag részei.

## Mikrofonos próbák

A statikus zöld pontok akkor jelennek meg, amikor a hangfigyelés ténylegesen készen áll. Egy szó kimondására 6,5 másodperc, két szóra 9 másodperc áll rendelkezésre; a felismert jó végleges eredmény hamarabb lezárhatja a próbát. A két külön részletként felismert szó összetartozhat, az ugyanarra a részletre adott egymást kizáró javaslatok nem számítanak két szónak. A később kijavított részeredmény nem marad a válaszok között.

A szófelismerő és két szavas mód a böngésző saját beszédfelismerőjét használja; külön hangenergia-mikrofont csak a bátorító mód nyit. Nincs automatikus angol nyelvű újrapróbálás. Engedélyezési, indítási vagy hálózati hiba esetén megjelenik a **Képekkel játszom** gomb, a szülői oldalon pedig az ok. Az indulás előtt meghiúsult kapcsolat nem számít gyermekpróbának. A visszanyíl, a házikó és a leállítás megszakítja a figyelést.

A böngészős ellenőrzés szimulált felismerési eseményekkel és szintetikus mikrofonjellel történt. A valódi gyerekbeszéd, a Bluetooth és az iPhone/iPad kezdőképernyős használat még készüléken ellenőrzendő.

## Eredmények mentése és visszaállítása

A szülői **Eredmények megőrzése** panel JSON-fájlba menti az aktív profil számlálóit és szóeredményeit. Az összesítő jelzi, melyik profil van kiválasztva. A fájl átvihető másik eszközre; a másik profil eredményeit, kapcsolatkulcsokat és játékbeállításokat nem tartalmazza. Visszaállítás előtt látható a mentés ideje és tartalma. A mentett eredmények az aktív profil mostani eredményei helyére kerülnek, nem adódnak hozzájuk. Hibás, ismeretlen verziójú vagy 1 MB-nál nagyobb fájl nem alkalmazható.

A **Helyi eredmények nullázása** külön megerősítést kér, és megtartja a játékbeállításokat, valamint a másik profil eredményeit. A legutóbbi nullázás vagy visszaállítás profilonként egyszer visszavonható; ez a lehetőség profilváltás és újratöltés után is megmarad. A visszavonás az azóta szerzett eredményeket is az előző állapotra cseréli.

Ezek a helyi műveletek és a profilváltás szüneteltetik a felhőszinkront. Újraindításához külön szülői megerősítés kell: az összevonás megtartja a magasabb számlálókat, ezért egy helyi nullázás előtti felhős eredmény visszakerülhet. A műveletek nem törölnek a felhőből. Másik játékablak mentése után a régi ablak további írás helyett frissítést kér; az ottani eredmény előbb fájlba menthető. Az export formátuma: `beszedtanulas-progress`, 1. verzió; megvalósítás: **progress-data.js**, **progress-tools.js**, **progress-profiles.js**.

## Offline játék és ikon a főképernyőn

Az oldal az első megnyitáskor letölti a felületet és mind a 495 hangfájlt, köztük a tizenkét állathangot, a puzzle öt magyar segítségét, az öntős játék tizenhárom hangját, az R-kaland 96 mintahangját, az öt csoport új útmutatóját és a sakk 26 magyar hangját. A szülői beállítások **Játék internet nélkül** részében várd meg a „Letöltve” visszajelzést. Ezután a képes játékok, a számolás és a hangok hálózat nélkül is használhatók. A szófelismerés a böngészőtől függően internetet kérhet.

iPhone/iPad Safariban a Megosztás menü **Főképernyőhöz adás** pontjával hozható létre játékikon. Az új ikonnal először internet mellett indítsd el a játékot, és abban az ablakban is várd meg a letöltés végét. [Apple útmutató](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

A játék megnyitáskor, előtérbe kerüléskor és a főképernyőre visszatéréskor ellenőrzi a frissítést. A teljesen letöltött új verzió a látható főképernyőn automatikusan betöltődik, amikor nincs nyitott párbeszédablak. Játék közben és háttérben vár; másik nyitott játékablak mellett sem aktiválódik. A főképernyő jelzi a letöltést és az esetleges hibát. Sikertelen letöltés után a korábbi teljes verzió tovább használható; az eredményeket a frissítés megtartja. A szülői letöltési és újrapróbálási gombok megmaradtak. A böngésző a hely felszabadításakor törölheti a tárolt fájlokat; a hiányzó csomag a szülői felületen újra letölthető.

A főképernyő jól látható **Frissítés** gombja szülői belépő nélkül indít kézi frissítést. A külön frissítőoldal mindig hálózatról érkezik, megkeresi és teljesen letölti/ellenőrzi a legújabb csomagot, majd a főképernyőre tér vissza a régi `?v=` paraméter nélkül. A kézi művelet más nyitott játékablakokat is frissíthet; ezt az oldal előre jelzi. Automatikus frissítésnél megmarad a többablakos védelem. Az eredmények, profilok és beállítások megmaradnak; a frissítés nem törli a helyi tárolót. Hibánál újrapróbálás és visszalépés érhető el. Offline a főképernyő gombja a játszható változatban tart.

Ha a régi változatban még nincs Frissítés gomb, a [közvetlen frissítőoldal](https://kasznare.github.io/beszedtanulas/refresh.html) arról is használható, szülői mód nélkül. A sima újratöltés vagy egy új `?v=` paraméter önmagában nem kerüli meg a játék offline gyorsítótárát.

A service worker HTTPS vagy localhost címet igényel. A helyi hálózatos HTTP-cím önmagában nem biztosít offline telepítést és mikrofonhozzáférést. A [GitHub Pages-oldal](https://kasznare.github.io/beszedtanulas/) HTTPS-t használ.

Fejlesztés közben HTML-, JavaScript-, CSS- vagy hangmódosítás után:

~~~bash
npm run build-offline
npm run check
~~~

Ez frissíti a generált **sw.js** fájlt. A kézzel szerkesztendő működés a **service-worker-runtime.js**, a fájljegyzék összeállítása a **scripts/build-offline.mjs**, a frissítési vezérlés az **offline-client.js** fájlban van. A gyökérkönyvtár JavaScript- és CSS-fájljai automatikusan bekerülnek; új almappás modulok vagy képek esetén bővítsd a generátor fájllistáját is. A frissítés a főképernyőre visszatérve automatikusan alkalmazódik, ha a teljes csomag elkészült és nincs másik nyitott játékablak.

## Hanganyagok

A **Mesék és Maci → Mesetár** tizenkét előre elkészített hangos mesét tartalmaz. A magyar Noémi mesélőhang és a lassított tempó megegyezik a játékokéval. A nagy gomb lejátszást/szünetet vált, az **Elölről** újrakezd, a csúszkával bármelyik részhez vissza lehet térni. Mesénként megmarad a hallgatási pozíció és az utoljára választott történet. A meseválasztás és a menüváltás leállítja az előző felvételt; az app más hangjai szüneteltetik a mesét. A kész mesék nem váltanak böngészős szövegfelolvasásra.

A hosszú MP3-fájlok az oldal telepítésekor nem töltődnek le automatikusan. A **Letöltés** gomb az adott mesét ellenőrzőösszeggel ellenőrzi és külön helyi cache-be menti; a **Letöltve** jelzés után hálózat nélkül is hallgatható. Ez a cache a játékok verziófrissítésekor megmarad. Böngészős tárhelytörlés után újra le kell tölteni a meséket. A pozíció eszközbeállítás, nem gyermekeredmény; a profilváltás nem készít második mesekönyvjelzőt.

A változtatás nélkül kimentett eredeti szövegek a `content/stories/` könyvtárban vannak. Csak a cím és a mese szövege kerül a hangszolgáltatáshoz; a chat üzenetei és forrásadatai nem. A hangkészítés eltávolítja a formázási jeleket, de nem írja át a történetet. Újragenerálás: `npm run generate-audiobooks` (uv, internet és ffmpeg/ffprobe szükséges). Az ellenőrzött MP3-ak az `audio/audiobooks/` könyvtárba, a hangkészítési bizonylat az ottani `generated.json` fájlba, a lejátszható jegyzék az `audiobook-data.js` fájlba kerül. Mindhármat együtt kell menteni. A generátor rövid szövegrészekből készít ellenőrzött hangot, majd veszteségmentesen fűzi össze; megszakítás után újrafuttatható. A `scripts/check-audiobooks.mjs` a forrást, a szöveget, a hangot, a tempót és az MP3 ellenőrzőösszegét ellenőrzi. A forrásimport és a chat adatai nem részei a publikált csomagnak.

Az alapértelmezett magyar mesélőhang 459 statikus MP3-fájlból áll: szavak, kifejezések, számok, mennyiségek, feladatok és rövid segítségek. A hangos feladatok rövid kijelentéseket és egyszerű felszólításokat használnak. Kerüljük a gépi hangon nehezen érthető kérdő hangsúlyt és az „építsd” jellegű torlódó alakokat. A géppel készült hangok az **audio/voice/** könyvtárban találhatók. A meglévő 24 saját szófelvétel az **audio/** könyvtárban maradt, és a szülői beállításból visszaválasztható.

Új hangok készítése vagy hiányzó hangok pótlása:

~~~bash
npm run generate-voice
~~~

Ehhez uv, internetkapcsolat és az elkülönítve futtatott edge-tts 7.2.8 szükséges. A generátor csak a rögzített szóanyagot és a játék szövegeit küldi a hangszolgáltatáshoz. A lejátszás már a helyi MP3-fájlokat használja. A generátor a szöveg, a hang és a tempó lenyomatát, valamint az MP3 ellenőrzőösszegét menti az **audio/voice/generated.json** fájlba. Csak az ezekkel egyező hangot hagyja ki; szövegváltozás, hiányzó vagy sérült fájl esetén új hangot készít. Sikertelen letöltéskor a korábbi MP3 megmarad. Az `npm run check` az elavult vagy nem igazolt hangot is jelzi. A generált hangokat, hangjegyzékeket és ellenőrzőösszegeket együtt kell commitolni.

Források:

- **game-data.js:** szavak, témák, kifejezések és elfogadott gyereknyelvi változatok.
- **scripts/build-voice-manifest.mjs:** segítségszövegek és hangjegyzék-generálás.
- **voice-library.js**, **audio/voice/manifest.json:** generált hangjegyzékek.

Hiányzó saját felvételnél az új hangra, hiányzó generált hangnál a böngésző magyar felolvasására vált a játék. A felolvasás minősége ilyenkor eszközfüggő.

## A hangot követő képi jelzések

A szabálygép példájára koppintva a bemeneti szám, a fogaskerék és a kimeneti szám a narráció sorrendjében kap finom, statikus zöld keretet. A hosszabb segítségek a felolvasott részt emelik ki: kosarak, plusz/mínusz gombok, csomag és ház, almáskert és kosár, állatok és tányérok. A képkártya, a megszámolt tárgy és a kétszavas gyakorlás képei is követik a hangot. A Képpárokban az éppen felfordított kép, a műhelyekben a tálcák, mintasorok, mérlegoldalak és a segítségben megnevezett rúd kap jelzést. A választós játékokban a beszélő figura vagy a hangszóró kap jelzést; a helyes választ a kiemelés nem mutatja meg előre.

A jelzés a tényleges lejátszás kezdetéhez és a hangfájlban rögzített szóidőkhöz igazodik. Kilépés és új hang indítása törli a korábbi jelzést. A keret minden játékban álló: nem pulzál, nem ugrál és nem villog. A Maci beszéd közbeni szájmozgását a készülék **Csökkentett mozgás** beállítása kikapcsolja. A működés internet nélkül is elérhető.

Fejlesztés: a `narration.js` vezérli a jelzések életciklusát, a `narration-cues.js` rendeli a mondatrészeket a jelenet elemeihez. A hanggenerátor a `WordBoundary` adatokat az MP3-mal együtt kéri le, majd elkészíti a `voice-timing.js` fájlt; ezt és az `audio/voice/generated.json` fájlt együtt kell menteni a hangokkal. A `speakVoiceSequence` elemei lehetnek sima hangazonosítók vagy `{id, cue: {target, motion, parts}}` objektumok. A célkiválasztók az aktív játékhoz tartoznak. A `parts` elemei `{at: "a felolvasott mondatrész", target: "CSS-kiválasztó", motion: "pulse"}` alakúak. A korábbi `motion` értékek (`pulse`, `input`, `output`, `machine`) kompatibilitásból megmaradtak, de mindegyik ugyanazt a statikus jelzést használja.

Más jelenetek a dokumentum `narrationstart`, `narrationword`, `narrationend` eseményeihez is kapcsolódhatnak. Az események `detail` mezőjében `id` és `text`, szóhatárnál `word`, `index`, `time`, befejezésnél `reason` érkezik. A böngészős tartalék felolvasás a `boundary` eseményt használja, ha elérhető; a családi szófelvételeknél a teljes szó lejátszását követi a képi jelzés.

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

## Meseliget

A **Mesék és Maci → Meseliget** új térképéről rövid piknikkaland indul: sapka és cipő feladása, három alma összegyűjtése, majd tányér minden állatnak. A befejezett állomások mentődnek; újratöltés után a **Folytassuk a kalandot!** gomb vezet tovább. Egy kaland egyszer ad jutalmat és egy emléket az albumba.

Az **Almáskert** és a **Piknikrét** szabad játéka a szülői 1–3 / 1–5 / 1–10 számolási szintet és a 3 / 5 / 10 feladatos körhosszt használja. Az almák koppintással betehetők és visszavehetők, a tányérok is visszavonhatók. A **Kész!** ellenőrzi a választ; a **Segíts!** mennyiségjelölést vagy a hiányzó tányérok kiemelését adja. Mikrofon nem kell.

35 új magyar hang tartozik a játékhoz. Teljes letöltés után offline is játszható. Az önálló és segítséggel befejezett feladatok, az album és az aktív kaland profilonként külön, a meglévő mentésben tárolódnak, és a JSON-export, visszaállítás, nullázás és visszavonás is kezeli őket. Ezek az új adatok a jelenlegi szóeredmény-alapú felhőszinkronba nem kerülnek.

## Furfangliget – nagyobbaknak is

A **Számok és logika → Furfangliget** három új, saját tempóban játszható fejtörőt kínál. A korábbi egyszerű játékok megmaradtak.

- **Erdei bolt:** almás és gesztenyés kosár összeállítása, majd egy megváltozott rendelés teljesítése. Mindkét mennyiség szabadon módosítható. A három fokozat képes célokat, hozzáadást/elvételt, végül összegből és különbségből kikövetkeztethető mennyiségeket ad. A szülő 1–5, 1–10 vagy 1–20 bolti számkört állíthat.
- **Szabálygép:** három megfigyelhető bemenet–kimenet példa alapján egy- vagy kétlépéses gépet kell építeni. A géppróba megmutatja, mit csinál a saját szabály; utána két új bemenet eredményét is a játékos állítja össze. A fokozatok ±1-et, több műveletet és duplázást, majd sorrendfüggő kétlépéses szabályokat adnak, 5-ös, 10-es és 20-as tartományban, nullával is.
- **Csomagösvény:** 3×3, 4×4 vagy 5×5 mezőn teljes útvonalat kell tervezni, egy vagy két csomagot felvenni, a köveket elkerülni, és eljutni a házhoz. A róka a próba indításakor járja be a tervet. Több helyes út is elfogadható; a generátor minden pálya megoldhatóságát ellenőrzi. A lépésszám a terv hossza, nem időkorlát.
  A **Csak lépések – kép nélkül** változat mindhárom szinten választható a játékban vagy a szülői beállításoknál. A térképet szöveges pályaleírás helyettesíti (sorok és oszlopok, indulás, csomagok, kövek, ház). Az útiterv számozott iránylista; nem jelzi előre a csomagfelvételt vagy az aktuális helyet. A próba az éppen végrehajtott lépést emeli ki. A nézetváltás megtartja a feladatot és a lépéseket, az eszköz megjegyzi a választást. Nyílgombokkal és billentyűzettel is kezelhető, a visszavonás és a fokozatos szöveges segítség megmarad. A térképes nézet az alapértelmezés.

Koppintás és billentyűzet mindenhol használható; az ösvény húzással is rajzolható. Háromfokozatú hangos segítség, visszavonás és újrajátszás van. Egy feladat egyszer ad jutalmat, a boltban csak a második rendelés után. Nincs pontlevonás, időzítő vagy mikrofonkérés. Az új 74 magyar MP3 és a saját rókarajz az offline csomag része.

A szintek külön állíthatók a szülői felületen. A félbehagyott munka – kosarak, műveletek, útiterv és visszavonási előzmények – játékonként és profilonként mentődik. A szintváltás az érintett játékban új feladatot kezd. A `logic` eredménymező játékonként és szintenként külön önálló/segített számlálót tartalmaz; a segítséget vagy javító ellenőrzést használó megoldás a segített csoportba kerül. A beszédpróbák és szóeredmények nem változnak. Az export/import, nullázás és visszavonás az új adatokat is kezeli, a régi mentések üres fejtörőadatokkal tölthetők be. A felhő továbbra is csak szóeredményeket szinkronizál.

Források: `logic-data.js` (generátorok, ellenőrzés, mentés), `logic-game.js`, `logic-voice.js`, `logic.css`, `tests/logic.test.mjs`. A `tests/browser/` fájlok Playwright CLI-függvények: csak külön, eldobható tesztböngészőben futtasd őket, mert annak helyi tesztadatait módosítják. A részletes ellenőrzések és a referencia kutatási jegyzete a continuation.md elején található.

## Sakkliget – az első sakkfigurák

A **Számok és logika → Sakkliget** három rövid, önálló gyakorlási módot ad:

- **Lépések:** válassz bástyát, futót, huszárt, vezért, királyt vagy gyalogot. A pöttyök mutatják a szabályos mezőket; a figura szabadon mozgatható és minden lépés visszavonható.
- **Csillagok:** egy figurával három kijelölt mezőre kell eljutni, akár több lépéssel. A gyalog csak előre halad; a harmadik csillag egy jutalmat ad.
- **Kis feladatok:** tíz választható helyzet ütést, szabad utat, gyaloglépést és biztonságos királylépést tanít. A sötét figurák helyben maradnak. Csak a szabályos, célhoz vezető lépés zárja le a feladatot; más választás után újra lehet próbálni.

A király nem léphet támadott mezőre vagy a másik király mellé; a királyt védő figura sem teheti szabaddá a támadás útját. A gyalog a tábla végén automatikusan vezérré változik. Sáncolás, menet közbeni ütés és teljes parti nincs ezekben a kezdőfeladatokban. A sakkfigurák saját SVG-rajzok; a teljes modul és a 26 magyar MP3 az offline csomag része.

Koppintás, Tab és Enter/Space használható; a táblán a nyilak mozgatják a fókuszt, az Escape törli a kijelölést. A mód és a figura az eszköz közös `beszedtanulas.chess.v1` beállításában megmarad, belépéskor friss feladat indul. A felfedezés nem ad jutalmat; a befejezett csillagkör vagy kis feladat egyszer ad jutalmat az aktív gyerek/szülői próba profilnak. A beszédpróbákat nem módosítja. A közös sikerablak az elkészült tábla egy másodperces megtekintése után nyílik; újrakezdés, módváltás vagy kilépés megszakítja a várakozást.

Források: `chess-data.js`, `chess-art.js`, `chess-game.js`, `chess.css`; célzott szabálytesztek: `tests/chess.test.mjs`; böngészős ellenőrzés: `tests/browser/chess.js`, `tests/browser/chess-lifecycle.js`.
