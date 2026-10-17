# Beszédtanulás

Magyar képes és hangos játék kisgyerekeknek, elsősorban iPhone Pro Max és iPad képernyőre. Öt nagy képes csoportból indul. A visszanyíl az előző választóhoz vezet, a házikó közvetlenül a főképernyőre visz.

Éles oldal: [Beszédtanulás a GitHub Pagesen](https://kasznare.github.io/beszedtanulas/). Nincs szükség ChatGPT-bejelentkezésre. A `main` ágra küldött commitot a meglévő GitHub Pages **pages build and deployment** folyamata automatikusan kitelepíti. Közzététel előtt `npm run build` és `git diff --check`, utána commit és push; külön Sites-kitelepítés nem kell.

### A film utolsó jelenete

A **Mesék és Maci** menü új, választásokra épülő városi nyomozása 34 megírt jelenetből áll. A gyerek Mirával egy befejezetlen régi videó történetét fejti meg. Három nyomozási út — az utca, Dani műhelye, a könyvtári iratok — bármelyikéről elérhető a három folytatás: mai film, élő előadás, történetséta. A korábbi döntések későbbi szövegeket, segítőket, előkészületeket és képi részleteket változtatnak meg.

A feladatokban nyomokat vizsgálunk, fényképeket rendezünk időrendbe, a kocsi fordulójának megfelelő udvart próbálunk ki, és három kelléket választunk a mai filmhez. A hibás próbák után lehet javítani. A **Nyomok** füzet csak a valóban megszerzett ismereteket mutatja; a **Visszalépek** az előző döntést annak következményeivel együtt vonja vissza. Az újrakezdés külön megerősítést kér. Kilépés és visszatérés ugyanabban a megnyitásban folytatja a kalandot; újratöltés új történetet indít. Nincs új tartós haladás-, jutalom- vagy profilmentés. A közös pihenőidő-korlát itt is érvényes.

A kilenc SVG-helyszín, a három bizonyítékfotó, a szöveg, a játékvezérlés és a 243 új Jessa-hangklip az alap offline csomag része. A jelenetek, a választások és a feladatok hangjai a meglévő hangrendszerben játszhatók le; a korábbi döntésekre utaló szöveg több rögzített részletből áll össze. A játék nem vált automatikusan más felolvasóhangra.

Megvalósítás: `city-story-data.js`, `city-story-engine.js`, `city-story-game.js`, `city-story-art.js`, `city-story.css`. Az elfogadott történeti alap a `docs/city-story-approved.md` fájlban van. Ellenőrzések: `tests/city-story.test.mjs`, `tests/city-story-art.test.mjs`, `tests/browser/city-story.js`, `tests/browser/city-story-lifecycle.js`, `tests/browser/city-story-offline.js`, `tests/browser/city-story-audio.js`.

### Folytasd a mintát!

A **Számok és logika** menüből közvetlenül nyíló játékban egy végig látható mintasort kell három új elemmel folytatni. Öt család választható: **Vegyes**, **Formák**, **Színek**, **Méretek**, **Irányok**. A **Kezdő** két- és háromelemű ismétlődésekkel indul; a **Felfedező** páros és ismételt elemeket kever; a **Gondolkodó** visszatérő elemeket, vegyes módban külön ismétlődő szín- és formasort is ad. Alapból a Felfedező vegyes mintája indul.

Legalább két teljes ismétlődés látszik, és három következő helyet kell egymás után kitölteni. A helyes választás a sor végére kerül, a téves próbát nyugodtan újra lehet gondolni. A segítség előbb az ismétlődő egységet és az aktuális hely előzményét mutatja, majd kérésre a hozzá illő választást emeli ki. A visszavonás, az új kör és a körvégi **Még egy ilyen** is használható; a nehézség és család az aktuális megnyitásban megmarad. Az új kör változatos mintát ad ugyanazon a szinten. A méretes feladat három, a többi négy különböző választást kínál.

A játék csak a memóriában tartja az aktuális kört. Nem ír eredményt, játszásszámlálót vagy jutalmat; a régi mentések megmaradnak. A közös játékidő, navigáció, hangbeállítások és offline használat része. A saját SVG-formák külső képfájl nélkül jelennek meg, a négy rövid magyar hang a meglévő Jessa-felvételekből, helyben készült kivágás. A Szabálygép után kapcsolódó játékként ajánlható; innen a Mintaszövő hiányzóelemes feladataira lehet továbblépni.

Forrás: `patterns-data.js`, `patterns-art.js`, `patterns-game.js`, `patterns.css`, `patterns-voice.js`. Generátorteszt: `tests/patterns.test.mjs`; böngészős ellenőrzés: `tests/browser/patterns.js`.

### Találd meg a különbségeket!

A **Kirakók és ügyesség** menüből nyíló játék négy saját, részletes SVG-jelenetet használ: **Kerti piknik**, **Vidám kikötő**, **Játékműhely**, **Titkos télikert**. Jelenetenként 12 megtervezett részletből készülnek a képpárok. A **Felfedező** 5 látványosabb, a **Megfigyelő** 7, a **Nyomozó** 10 eltérést kér; alapból a Megfigyelő indul. A két kép ugyanabból a rajzból készül, csak a körben kiválasztott részletek változnak. Új körben a jelenet és a nehézség megmarad, az eltéréskészlet változik.

Bármelyik képen lehet találni, a megtalált részletek mindkettőn számozott zöld jelölést kapnak. A segítség előbb szöveges támpontot, majd tágabb, végül szűkebb környéket mutat; nem találja meg helyettünk a különbséget. Közös nagyító segít a kisebb kijelzőn, billentyűzettel mozgatható célkereszt és Enter/Space használható. Nincs hibapont vagy gyorsasági verseny. A közös portál játékideje, hangbeállításai, visszalépése és körvégi **Még egy ilyen / Kapcsolódó játék** lehetősége itt is működik.

A kör, a jelenet- és nehézségválasztás csak a megnyitott oldal memóriájában él. A játék nem ír eredménytörténetet, játszásszámlálót, jutalmat vagy új profiladatot. A meglévő játékmentésekhez nem nyúl. A rajzok, a vezérlés és a rövid magyar hangok a kötelező offline csomag részei. A hangok a meglévő Jessa-felvételek pontos időadatokkal kivágott részletei; elkészítésük nem használt új szolgáltatói kreditet.

Megvalósítás: `differences-data.js`, `differences-art.js`, `differences-game.js`, `differences.css`, `differences-voice.js`. Az adat- és renderinvariánsokat a `tests/differences.test.mjs`, a tényleges képpárok pixelkülönbségeit, a találati területeket, a játékmenetet és a mobilos/offline integrációt a `tests/browser/differences.js` ellenőrzi.


### Több változat ugyanazon a szinten – 2026. október 15.

A kör végén a **Még egy ilyen** azonos nehézségű új kört indít, a **Kapcsolódó játék** pedig az aktuális tevékenységhez választott következő játékot nyitja meg. Az ajánlás előre megírt kapcsolatokból készül, játékostörténet, eredménygyűjtés és automatikus nehezítés nélkül. A bingó, a hang–kép párok és az „Én kérek” mód nem ment új játszás- vagy jutalomszámlálót; választásuk és a kifejezésszűrők csak az aktuális megnyitásban élnek. A korábban meglévő játékmentések továbbra is használhatók.

- **Két szó együtt:** 27 természetes kifejezés, négy csoportban (kérés, ki mit csinál, tulajdonság, még/elég), témaszűréssel. A válogatás összes kifejezése sorra kerül az ismétlés előtt; a rövid kör ugyanebből a készletből épül. A javított minták: „még almát”, „apa autózik”.
- **Maci – Én kérek:** a gyerek ételt választ, egy vagy két szóval kér, jelzi, hogy kimondta, majd odaadja Macinak. A megkapott falatok a jelenetben maradnak. Mikrofon nélkül is teljesen játszható.
- **Hangos bingó:** a Hol van? új módjában a két/három kép végig ugyanott marad; a hallott szó képének megtalálása letakarja a megfelelő mezőt.
- **Hang–kép párok:** a Képpárok új módjában számozott hangkártyákhoz kell a látható képeket párosítani, a választott 2/3/4/6 párral. A hangkártya nem mutatja a megoldást.
- **R-kaland:** 18 további kétszavas jelenetminta és összesen 12 kétcsomagos postaküldetés; a szóhelyzet és a beszédmód megmarad. A friss jelenetminta lehetőség szerint eltér az előzőtől.
- **Logika és műhely:** változó kezdő- és végpontú, megoldható ösvények; több megkülönböztethető kétlépéses szabálygép; változatos szín/forma/méret válogatás, ismétlődő minták és kirakható egyensúlycélok. A választott nehézség nem vált automatikusan; az ösvény lépésráhagyása és a válogató/minták feladatmérete megmarad.
- **Formadoboz:** a kijelölt bábu mellett jelenik meg a két nagy forgatásnyíl, és maga a bábu fordul. A csak elfordításában eltérő forma külön visszajelzést kap.

Az új generált logikai feladatok `taskVersion: 2`, a műhelyfeladatok `taskVersion: 3` verzióval készülnek; a régi mentett magok és feladatok korábbi jelentése megmarad. Az új szövegekhez statikus Jessa-hang és offline csomag tartozik. Az ismételt/részszavas hangok a meglévő teljes felvételeket és hiteles karakteridőket használják újra.

### Mesetár kereső és a 2026. október 12-i válogatás

A „Keresés cím vagy szerző alapján” mező az összes betöltött mű címében, szerzőjében, gyűjteményében és kereshető leírásában szűr. Kis-/nagybetű, ékezet és többszörös szóköz nem számít; az „A fülemüle” címváltozat is megtalálja Arany **A fülemile** című versét. Törlés gomb és Escape üríti a mezőt. A keresés nem állítja le a lejátszást és nem változtatja a kiválasztott művet. A privát, helyi mesék címe és opcionális szerzője is kereshető, hálózati továbbítás nélkül. Az IndexedDB új importjai hangbájtokat tárolnak; a korábbi Blob-felvételek kompatibilisek maradnak.

| Kért mű | Teljes szöveg / szerkezet | Hangállapot | Tényleges új kredit |
| --- | --- | --- | ---: |
| Benedek Elek: Gyöngyvirág Palkó | 74 bekezdés, MEK 00232 HTML 02 #32 | Jessa, 15:04, külön MP3, 29 SVG-jelenet | 1 396 |
| Arany János: A fülemile | 160 nem üres sor, 10 blokk, a * elválasztóval | Jessa, 5:17, külön MP3, 21 SVG-jelenet | 428 |
| Petőfi Sándor: Arany Lacinak | 72 verssor, 2 versszak | Jessa, 1:53, külön MP3, 22 SVG-jelenet | 157 |
| Benedek Elek: A csillagszemű juhász | 57 bekezdés, MEK 04865 #100, közkincs | Jessa, 8:28, 84 mondatfelirat, 25 SVG-jelenet | 766 |
| Seprűkötő Jakab | 51 bekezdés és mindkét 4 soros versbetét; MEK 21111 #8, CC BY-SA 4.0 | Jessa, 14:02, 162 mondatfelirat, 34 SVG-jelenet | 1 256 |

A fiatal férfi főhősű székely válogatás két teljes meséből áll. A korábbi három helykitöltő (A fortélyos leány; Az egyszeri asszony meg az ördög; Három hazug mese) a felhasználó kérésére kikerült a kereshető katalógusból. Korábbi kutatási jegyzeteik, a teljes modern források és mindhárom hazug rész továbbra is a magán `~/.config/beszedtanulas/kriza-source-review/` cache-ben vannak; a kutatási leltár megmaradt a `content/stories/kriza-source-review.json` fájlban. Ezekre nem történt hangkérés. A `review-kriza.py` csak a kutatási leltárt frissíti, nem hozza vissza a kártyákat.

A két új mese teljes áras bemeneti leltára **18 389 karakter**, a bizonylatok szerinti tényleges fogyasztás **2 022 kredit** (766 + 1256). A generálást követő friss keret **5052 / 40 000 kredit** volt (34 948 felhasználva). A korábbi három klasszikus tényleges 1981 kreditjével e chat összes új felvétele **4003 kredit**. A szolgáltatói keretszámláló késhet; a friss lekérés már pontosan egyezett a 2022 kredites bizonylatösszeggel. Sikeres régi felvételt nem generáltunk újra.

Seprűkötő Jakab teljes szövege az 1937-es Székely népmesék MEK-21111 elektronikus kiadásából származik (Magyar Elektronikus Könyvtárért Egyesület / OSZK, 2021), az ott közölt [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.hu) szerint. Forrás, kiadói megnevezés, licenchivatkozás és változásjelzés a lejátszóban látható. A teljes szöveg, a Jessa-felolvasás és az új Jakab-jelenetek ugyanezen licenc alatt továbbadhatók; a hangfájl ID3-adatai is megőrzik a megnevezést és a licencet. Változás csak a HTML-formázás rendezése, gépi felolvasás és saját SVG-illusztráció/animáció; nincs rövidítés vagy önkényes szövegátírás. A csillagszemű juhász kötetzáró jegyzetjelei és szómagyarázatai nem kerültek a történetbe. Életkori ajánlást nem találtunk ki; az eredeti népmesei próbák a szövegben megmaradnak.

Import és ellenőrzés: `python3 scripts/import-requested-classics.py --check` és `python3 scripts/import-szekely.py --check`. Hangterv: `python3 scripts/generate-requested-classics.py` (csak leltár). Fizetett generálás csak kifejezett `--generate` kapcsolóval történik; minden új rész előtt friss kvótaolvasás és a Radó-kérések foglalásának levonása szükséges. Sikeres vagy bizonytalan kérést nem küldünk újra; fizetett válaszok, rész-MP3-ak, bizonylatok és függő naplók a repón kívüli `~/.config/beszedtanulas/requested-classics-audiobook-cache/` könyvtárban maradnak. Hiányos művet nem telepít a `--install`. Reset, vásárlás és előfizetés-változtatás nincs a folyamatban. Az IPA-kiejtési bemenet szóhelyei egy az egyben a megjelenített eredeti írásmód szóhelyeihez tartoznak; az ASR önmagában nem magánhangzóhossz-bizonyíték.

Az új hosszú MP3-ak kizárólag az opcionális offline listán szerepel, a játékcsomag telepítése nem tölti le őket. A 22 korábbi felvétel, a régi SVG-időleképezések, a rövid és családi hangok, valamint az állathangok változatlanok. A kereső gyűjteményadatokból épít, címek kézi listázása nélkül. Az 50 Radó-tétel is a közös keresőben szerepel; a külön gyűjteményi olvasó ugyanazt a keresést követi. A hiányzó hangok teljes áras becslése az összes nyilvános gyűjtemény generált karaktertervéből épülő `story-audio-requirements.js` adataiból származik, a privát böngészős importok nélkül.

## Indítás

A projekt könyvtárában:

~~~bash
npm run start
~~~

Nyisd meg: <http://localhost:5173>. Python 3 és Node.js/npm szükséges. Nincs külön frontendfordítás; az indítóparancs automatikusan elkészíti az offline fájljegyzéket. A játék futtatásához nem kell npm-függőségeket telepíteni vagy hangszolgáltatási API-kulcsot megadni.

## Játék és beállítások

Az első játék vagy mese indításakor közös **30 perces, folyamatos visszaszámlálás** indul. Sem tétlenség, sem menüben várakozás, szüneteltetett mese, szülői próba, háttérbe váltás vagy az oldal bezárása nem állítja meg. A határidőnél a hang és a mikrofon leáll, és **15 perces pihenőképernyő** jelenik meg. A pihenő végén automatikusan új 30 perces keret nyílik, amely a következő játék vagy mese indításával kezdődik. A **Szülői feloldás** a meglévő felnőtt belépőn keresztül hamarabb is új időkeretet ad; a szülői beállítások **Játékidő és pihenő** részében is indítható új 30 perc. Az abszolút határidő ugyanazon böngésző/eszköz helyi tárolójában megmarad frissítés és újranyitás után is; a párhuzamos ablakok közös keretet használnak. Ez nem eszközök közötti felhős korlát. Az eredmények visszaállítása és nullázása nem nullázza az időkeretet.

| Csoport | Játékok |
| --- | --- |
| **Képek és hangok** | Képes témák, Hol van?, Hangos állatkönyv |
| **Mondd utánam** | Egy szó, Két szó együtt, Róka R-kalandja |
| **Számok és logika** | Számoljuk meg!, Keresd meg!, Furfangliget, Műhelyliget, Sakkliget |
| **Mesék és Maci** | Mesetár, Etesd meg a macit!, Maci öltözik, Meseliget, A film utolsó jelenete |
| **Kirakók és ügyesség** | Találd meg a különbségeket!, Képpárok, Képkirakó, Montessori műhely, Töltsünk a barátainknak!, Mi bújt el? |

Minden játéknak egy helye van. A fejléc mutatja a csoportot; a visszanyíl megnevezi a célját. A többjátékos ligetekben és az R-kalandban először a saját választó nyílik meg, majd a csoport. A kör végi ablakból is vissza lehet lépni a csoporthoz. A böngésző vissza/előre gombja megtartja a kiválasztott képes témát és a számolási módot. A mentett ligetfeladatok és eredmények kilépés után is megmaradnak; az új körrel induló játékok visszatéréskor új kört kezdenek.

- **Képek és hangok:** hat témakör és 24 egységes, saját SVG-szókép. A meghallgatott képről ugyanazzal a szóval indítható a **Hol van?** vagy az **Egy szó**. A választójáték különböző vagy hasonló képekkel játszható; ismételt hibánál előbb újrahallgatás, majd kevesebb választás, végül képi segítség következik.
- **Hangos állatkönyv:** négy lap és tizenkét valódi állathang. Szabad lapozás mellett **Ki szólt?** és a részletes jelenetben keresés is választható. A név felolvasása külön bekapcsolható. A hangkérdés a válasz előtt nem emeli ki az állatot.
- **Róka R-kalandja:** Hangvadász, Robotpostás, Perecműhely, Mondókaliget és Saját visszhang. Harminc képes R-es szó, 18 további kétszavas jelenetminta, 12 postaküldetés és négy saját mondóka; közös, hangészlelős és magyar szófelismerős gyakorlás. A Mondd utánam menüből érhető el.
- **Mondd utánam:** egy- és kétszavas gyakorlás alapból **Együtt · mikrofon nélkül** móddal, felnőttel jelzett továbbhaladással. A kézi szóváltás megtartja a témakört; legfeljebb öt kedvenc szó gyakorolható külön. A 27 kifejezés csoport és téma szerint szűrhető; a két szó külön-külön, majd együtt is mondható, 3/5/10 feladatos körrel. Az opcionális mikrofonos próbát helyben meg lehet állítani; bátorító hangészlelés és szófelismerés is választható.
- **Számok és logika:** vezetett vagy önálló számlálás, a végén kimondott összesítéssel; soros vagy szétszórt tárgyak. A mennyiségkeresésben két távoli vagy három közeli válasz választható. Téves választásnál a játék megszámolja a választott csoportot, újabb tévedésnél párokban is összehasonlít. Rövid körök, félbehagyott feladat és mennyiségenkénti önálló/segített statisztika profilonként mentve.
- **Sakkliget:** hat sakkfigura lépésfelfedezése, három csillag gyűjtése és 22 sakkfeladat. A Kezdő szint tíz egylépéses helyzetet ad; a Gondolkodós és a Kihívás szint hat-hat, 2–4 lépéses fejtörőt. Akadálykerülés, több ütés, biztonságos királyút, figurák együttműködése, kötés és gyalogból vezér: a feladat az összes megfelelő útvonalat elfogadja a lépéskereten belül. Lépés- és ütésszámláló, pöttyös és szöveges segítség, visszavonás, magyar hang és billentyűzetes kezelés; nincs ellenfélkör vagy időkorlát. A sötét figurák és a feladatban meg nem nevezett világos figurák a helyükön maradnak. A nehézségi választás az eszközön megmarad. A feladvány sikerablakának Következő feladat gombja ugyanazon a nehézségen léptet tovább, az utolsó feladat után az elsőre.
- **Mi bújt el?:** szabad meglepetésképek, előzetes megfigyelés után név szerinti képkeresés vagy a hiányzó kép kiválasztása. A gyerek indítja a képek elbújását; a keresés sorrendje változik.
- **Képpárok:** 2/3/4/6 pár a választott témából, egységes szóképekkel; a Hang–kép párok módban hallott szót és látható képet párosítunk. A rossz pár visszafordításának és a teljes előnézetnek az ideje állítható; az előnézet kézi továbbindításig is nyitva maradhat. Párosítás után a billentyűzetfókusz a következő választható képre kerül.
- **Töltsünk a barátainknak!:** öntés döntéssel, nyomva tartott gombbal, a kancsó lehúzásával vagy nyílbillentyűkkel. Három szint, haladóknak változó célszintek és váltakozó nagyobb/kisebb adag. A kancsóból elfogy a víz, a pohár túlfolyhat. A teljes ürítés mellett kis adag is visszaönthető, így a túltöltés finoman javítható.
- **Képkirakó:** négy részletes jelenet és három egyszerű kép (nap, labda, alma), 2/4/6/8/10 darabbal. Az összecsukható kép- és méretválasztó helyet hagy a táblának. A félkész táblák minden kép–méret pároshoz profilonként megmaradnak; a kész táblához egyszer jár jutalom. A körvégi újrajátszás valóban újra kirakható táblát indít.
- **Montessori műhely:** öt nyugodt, húzással és két koppintással is játszható játék, összesen **26 szinttel** a **Kirakók és ügyesség** menüben. **Formadoboz (8):** szín, alak, méret, elfordítás és láthatóan félretolható akadályok; a szabadon tologatott bábuk megőrzik a helyüket. **Színtálcák (5):** színek, árnyalatok és pontos darabszámok, maradék golyókkal. **Építs tornyot! (5):** három–hét korong rendezése. **Rendezőrács (4):** sor és oszlop, majd szín, alak és méret együttes követése. **Mintaemlék (4):** négy–nyolc elem megfigyelése és kirakása emlékezetből. Profilonként és szintenként folytatható feladatok, visszavonás, Jessa magyar hangos segítsége és teljes offline működés.
- **Műhelyliget:** három Montessori ihlette, kézzel alakítható fejtörő, három választható szinten. **Válogatókert:** szinthez illő, változó szín-, forma- és méretszabályok, ugyanazon tárgyak újraválogatásával. **Mintaszövő:** egyszerű és összetett ismétlődések, a legnehezebb szinten külön szín- és formaszabály. **Egyensúlyműhely:** számbontás színes rudakkal; nehezebb szinten pontosan két/három különböző hosszúságú rúd szükséges. Minden mozdulat visszavonható; három fokozatú segítség, játékonként és szintenként külön mentett feladat és eredmény. A szín mellett jel is segít az azonosításban.

A Meseliget térképén az új piknik mérete választható, a szülői számolási tartományig, legfeljebb tíz szereplővel. A mentett kaland létszáma megmarad. Szabad játékban fix vagy váltakozó mennyiséggel is lehet gyakorolni; az utolsó lépés és a tálca újrakezdése is visszavonható. A Furfangliget helyben választható nehézséget, közvetlen számbemenetet, animált kosárszállítást, műveletenként lefutó géppróbát és mozgó rókával bejárható, számozott útitervet kapott.

A főképernyő fogaskereke egy egyszerű felnőtt belépőt nyit. Itt választható 3 / 5 / 10 szavas kör, témakör, számolási nehézség, két/három képes választás, hang és hangos segítség. A számtani feladat véletlen belépés ellen szolgál, nem felhasználói hitelesítés.

A szülői oldal tetején a **Ki játszik?** rész választja ki a gyereket vagy a szülői próbát. A **Próba indítása** a játékokhoz vezet; közben a fejléc és a főképernyő is jelzi a próbát. A **Vissza a gyerekhez** gomb visszatölti a gyerek eredményeit és megnyitja a főmenüt. Sikertelen helyi mentésnél az előző profil marad aktív, a hiba a gomb mellett jelenik meg. A felhős kapcsolat technikai mezői a **Kapcsolat adatai** alatt nyithatók ki.

A rövidebb fekvő telefonos nézet külön tömör elrendezést kapott. A számolás tárgyválasztója és a meglepetésjáték újrakezdése oldalra kerül; a kör végi ablak három nagy gombja görgetés nélkül elérhető. A 932 × 350-es nézetet szimulált oldalsó és alsó biztonsági térközzel is ellenőriztük.

A haladás a böngésző helyi tárolójába kerül. A **Gyerek** és a **Szülői próba** külön eredményt tárol; a szülői profilváltás újratöltés után is megmarad. A hang és a többi játékbeállítás az eszközön közös. A bátorító felismerési mód a megszólalást jutalmazza; nem ellenőrzi a kiejtés helyességét. A szófelismerő és két szavas mód a böngésző beszédfelismerését használja. A valódi iPhone/iPad mikrofonos működés még eszközön ellenőrzendő.

## További gyakorlási változatok

**Etesd meg a macit!**: saját ételképek és választható kétlépéses kérés. **Maci öltözik**: eredeti, esős és nyári öltözék, valamint szabad fel-/levételes szekrény. A Meseliget Maciháza külön is gyakorolható; a kaland külön folytatható. Az Almáskertben körték közül válogatás, egy hozzáadása/elvétele és rejtett számláló választható. A Piknikréten változó, megnevezett vendégek, névre szóló kérések és tányér–pohár feladat is van. A kosár, a terítés és az öltözés félkész állapota megmarad; a lapozható album tényleges dátumot, létszámot és vendégeket őriz.

**Erdei bolt**: közvetlen betétel/kivétel és a módosult rendelés összehasonlítása. **Szabálygép**: eredményenkénti javítás, lépéses segítség, saját bemenet és a műveleti sorrendek kipróbálása. **Csomagösvény**: újratervezés korábbi lépéstől, sebességválasztás, szünet és egyesével léptetés. A szintek félkész feladatai külön megmaradnak.

**Válogatókert**: ugyanazokkal a tárgyakkal két egymást követő szabály. **Mintaszövő**: változó hiányhelyek és a látható minta tényleges felolvasása. **Egyensúlyműhely**: külön jelzett összeg-, darabszám- és különbözőségi feltételek; több eltérő megoldás kereshető ugyanahhoz a célhoz, ismételt jutalom nélkül.

A `numbers` és `puzzles` mentési részek a profilváltásba, JSON-exportba, visszaállításba és nullázás/visszavonásba is bekerülnek. A Meseliget új mentési formátuma a korábbi adatokat migrálja; régi piknikhez nem talál ki emlékképet. A Furfangliget és Műhelyliget régi feladatai is visszaállíthatók.


## Állathangos képeskönyv

A könyv négy eredeti, 1536 × 1024-es illusztrációja a beépített képalkotóval készült. WebP formában, összesen kb. 2 MB mérettel kerülnek az offline csomagba. A képeken megnyomható területek a tényleges állatok helyéhez igazodnak; a hangpontok elrejthetők. A lapozás megszakítja az előző hangot. A könyvben nincs mikrofon, jutalom vagy pontozás; a beszédpróbák és a meglévő játékok mentése változatlan.

A tizenkét állathang rövid, 1,67–4,8 másodperces, mérsékelt hangerejű valódi felvétel. A hangok és a forrásjegyzék teljes letöltés után offline is elérhetők. A hanghibát a felület jelzi, és újra meg lehet nyomni az állatot; a játék nem helyettesíti az állathangot szövegfelolvasással. A szerzők, eredeti Commons-felvételek, közkincs/CC BY-SA licencek és az átalakítások a könyv **Képek és hangok forrása** gombján keresztül jelennek meg. A CC BY-SA kivágások az eredeti licencüket megtartják.

Megvalósítás: `animal-book-data.js`, `animal-book-game.js`, `animal-book.css`; források, kivágások és SHA256: `animal-book-audio.json`; képek és a végső promptkészlet: [assets/animal-book/README.md](assets/animal-book/README.md). Az utolsó lap és a jelölők külön eszközbeállításban (`beszedtanulas.animalBook.v1`) tárolódnak, nem eredményadatként.

## Róka R-kalandja

Öt önálló játék közös, nagy gombos felülettel:

- **Hangvadász:** három választható feladat: hallott szó képének keresése, R-t tartalmazó szó kiválasztása két/három meghallgatható kép közül, vagy az R helyének megtalálása három kis vagonon. A több helyen R-es szavaknál minden helyes helyet elfogadja, például a roller elejét és végét is. Téves választás után ténylegesen újrahallgatható; ismételt tévedésnél a két szó vezetett összehasonlítása segít. Három/öt feladatból álló körök.
- **Robotpostás:** hat összefüggő, kétcsomagos küldetés szavakkal vagy rövid kifejezésekkel. Kimondás után a gyerek kézzel kézbesít a kért házhoz. A választott címzett postaládájában megmarad a csomag képe. A felismert szó, a hang észlelése és a közös kimondás külön visszajelzés.
- **Perecműhely:** szóeleji, szóközi és szóvégi szócsoportra váltható gyakorlás, választható virágos, csillagos vagy leveles dísszel. A gyerek a dísz helyét is kiválasztja; a díszek szóhelyzet-váltáskor megmaradnak, az elkészült műhely a kör végén is látható.
- **Mondókaliget:** négy eredeti, négysoros mondóka. A teljes felolvasás és soronkénti közös vagy mikrofonos gyakorlás mellett az **Elbújt szó** játék mind a 16 sorhoz három képes választást ad. A megtalált szó visszakerül a mondatba, majd külön mintahang és a teljes sor is megszólal. A 32 rövid rész külön meghallgatható és kézzel indítható utánmondást kapott; a mondóka képei történetsorrendbe rendezhetők. Egy sor ismétlése nem számít új befejezett körnek.
- **Saját visszhang:** natív böngészős hangfelvétel, legfeljebb nyolc másodpercig. A **Minta → saját hangom** gomb egymás után lejátssza Jessa mintáját és a felvételt; külön is meghallgathatók. A sikertelen vagy megszakított újrafelvétel megőrzi az előző használható felvételt. Elutasított engedély vagy hiányzó felvevő esetén a közös gyakorlás elérhető marad.

Az új körök először az előző körben nem szereplő szavakból választanak, a kiválasztott szóhely szerinti csoporton belül. A **Lepj meg!** gomb a kevesebbet játszott kalandok közül választ, és elkerüli az előző játékot. A Hangvadász és a Mondókaliget játékmódját a gyerek is átválthatja; a választás az eszközön megmarad.

A felnőtt beállításai külön eszközbeállításban (`beszedtanulas.rPractice.v1`) őrzik a szócsoportra, szóra/kifejezésre, körhosszra, képszámra és gyakorlási módra vonatkozó választást. A csoportok a hang helyét jelzik, nem kötelező nehézségi sorrendet. A mintahangok gépi magyar felvételek. A szólistát a gyerekhez, szükség esetén logopédus útmutatásához lehet igazítani.

Alapból **Együtt · mikrofon nélkül** mód indul. A **Bátorító** mód elegendő ideig tartó hangot észlel; a **Szófelismerés** mód a magyar beszédfelismerő szövegét ellenőrzi teljes szavakkal, egyetlen felismerési változaton belül. Egyik sem minősíti az R hang képzését. Hiba vagy bizonytalan felismerés után új próba és közös továbbhaladás is választható. A szófelismerő böngészőszolgáltatása internetet használhat és feldolgozhatja a hangot; a közös mód, a mintahangok és a helyi felvevő offline is működnek.

A visszhang felvétele csak a nyitott oldal memóriájában marad: nincs feltöltés, fájlmentés, felhőszinkron vagy eredménymentés a hangból. Új szó, másik játék, kilépés, frissítés vagy elrejtett dokumentum elengedi a felvételt. Minden megszakítás leállítja a mikrofont, a késve megérkező engedélyhez tartozó streamet is. A visszajátszási Blob URL a lejátszás végén/megszakításakor visszavonódik. A rögzítés 2 MB fölött is leáll.

A közös körök, képes találatok/mikrofonos próbák, felismert szavak/sorok és felnőtt által jelzett gyakorlások profilonként kerülnek az eredménymentés `rPractice` részébe. Fájlmentés, visszaállítás és nullázás/visszavonás támogatott; a régi mentésekben hiányzó rész nulláról indul. Az alap beszédjáték szóeredményei és jutalomszámlálója ettől függetlenek. Saját felvétel és felismert szöveg nem kerül az eredménymentésbe.

Megvalósítás: `r-practice-data.js`, `r-practice-game.js`, `r-practice-media.js`, `r-practice-voice.js`, `r-practice.css`; célzott ellenőrzések: `tests/r-practice.test.mjs`, `tests/browser/r-practice.js`, `tests/browser/r-variety.js`. A saját mondókák, szavak és útmutatók lenyomattal és szóidőkkel hitelesített statikus hangokat használnak; a közös szavak a meglévő Jessa-felvételeket használják újra.

A körvégi sikerablak és a játékok saját lezáró kártyája körülbelül egy másodperc múlva jelenik meg, így a kész jelenet még látható marad. Rejtett ablaknál a várakozás szünetel; új kör vagy kilépés megszünteti a függő visszajelzést. A már megszerzett jutalom azonnal mentődik.

## Montessori műhely

Öt játék, 26 választható szint. A Formadoboz első négy szintjén a forma és a keret színe számít; az ötödiken a méret, a hatodiktól az elfordítás is. A háromszög négy, a hatszög két különböző irányba fordítható. A kijelölt elem mellett megjelenő két nagy nyílgomb magát a bábut fordítja, a billentyűzet nyilai tolják. A gombok a képernyőn belül maradnak, húzás közben eltűnnek, és a lerakott elem mellett újra megjelennek. A csökkentett mozgás beállítása kikapcsolja a forgatás animációját; a rossz elfordítás külön hangos segítséget kap. Az elemek a fa felületen szabadon elmozdíthatók: az elengedés helyén maradnak akkor is, ha még nem illenek lyukba. A megfelelő elem animálva átesik a lyukon. Az akadály a deszkán marad, és vissza is tolható; a nagy deszkákon függőlegesen csúszik a szabad területre.

A Színtálcák nehezebb szintjein a világos és sötét árnyalatot is meg kell különböztetni. Az utolsó szinten a pöttyök mutatják a szükséges darabszámot; maradhatnak golyók a tálcán. A Rendezőrácsban a sor alakja/mérete és az oszlop színe határozza meg a helyet. A Mintaemlékben a minta időkorlát nélkül megfigyelhető, majd kézzel elrejthető. A hosszú minták telefonon számozott sorokba törnek. Újra megnézhető a minta a kirakott elemek elvesztése nélkül.

A rács és a mintasor bármely szabad helyre fogad elemet, és a hibás kirakás is szerkeszthető marad. A lerakott elemek húzással vagy két koppintással áthelyezhetők; két foglalt hely elemei felcserélhetők. Az „Ellenőrzés” gomb lezárja a helyes megoldást. Minden mozdulat visszavonható az adott belépés során. Az „Új játék” új feladatot indít; a kilépés, szintváltás és oldalfrissítés megőrzi az előző feladatot, a bábuhelyeket, az elfordításokat és az akadályokat. A helyi mentés gyerekprofil és szint szerint elkülönül. A mentett feladatot magból újraépítjük, és a mentett mozdulatokat ellenőrizzük.

A műhely a közös 30 perces játékidő része. Elrejtéskor és kilépéskor leállnak a húzási előnézetek, animációk és hangok; a már elfogadott mozdulat megmarad. Csökkentett mozgás mellett nincs esési animáció. Egy befejezett feladat egy jutalmat ad; a visszavonás, újbóli ellenőrzés és oldalfrissítés nem jutalmazza meg ugyanazt a feladatot újra.

Megvalósítás: `montessori-data.js`, `montessori-game.js`, `montessori-art.js`, `montessori-session.js`, `montessori.css`. Szabályok és mentés: `tests/montessori.test.mjs`, `tests/montessori-session.test.mjs`. Böngészős ellenőrzés: `tests/browser/montessori.js`, `tests/browser/montessori-challenges.js`, `tests/browser/montessori-touch.js`, `tests/browser/montessori-drag-retention.js`. Az új útmutatók és visszajelzések a meglévő rögzített Jessa-hang- és offline rendszer részei.

## Képkirakó puzzle

A **Kirakók és ügyesség → Képkirakó** a hangos állatkönyv négy eredeti illusztrációját használja, külön képletöltés nélkül. A négy részletes jelenet mellett három egyszerű SVG-kép is választható. A kép 2 × 1, 2 × 2, 3 × 2, 4 × 2 vagy 5 × 2 négyszögletes darabra oszlik; a tálca minden új körben megkeveredik. Bármelyik mezőre lehet darabot tenni. A táblán lévő darabok újra megfoghatók; két foglalt mező között cserélődnek. Ha a tálcáról teszel darabot foglalt mezőre, az ott lévő visszakerül a tálcára. A **Vissza a tálcára** gomb vagy a tálcára húzás is segít átrendezni a képet. Billentyűzettel a Tab és Enter/Space választ darabot és helyet; az Escape megszünteti a kijelölést. A darab húzását a kilépés, az érintés megszakítása vagy az ablak elrejtése megszakítja.

Az utolsó kép és darabszám az eszköz közös játékbeállításaiban megmarad. Képváltás, darabszámváltás vagy újbóli belépés visszatölti az aktív profil adott kép–méret pároshoz mentett tábláját. Az újrakezdés és a körvégi újrajátszás friss táblát indít. Az összecsukható választó helyet hagy a kirakásnak. Egy befejezett tábla egy jutalmat ad az aktív gyerek/szülői próba profilnak, a beszédpróbák számlálóját nem módosítja. A magyar mintahangok teljes offline letöltés után hálózat nélkül is működnek. A helyes elhelyezés hangja csak valóban helyes mezőn szólal meg. A hangos útmutató az éppen említett részt finom, statikus zöld kerettel emeli ki.

Megvalósítás: `puzzle-data.js`, `puzzle-game.js`, `puzzle.css`; belépés, beállításmentés és jutalom: `app.js`, `index.html`. A képfeldarabolás, keverés, elhelyezés és beállításbetöltés ellenőrzése: `tests/puzzle.test.mjs`; a teljes böngészős próba: `tests/browser/puzzle.js`, elkülönített Playwright-munkamenetben.

## Öntős ügyességi játék

A **Kirakók és ügyesség → Töltsünk a barátainknak!** saját SVG-jelenetet, tizenhárom magyar hangot és halk, helyben előállított csobogást használ. A nagyobb kancsó finoman billen és mozog a kiválasztott pohárhoz; benne a fogyó víz felszíne döntés közben is vízszintes marad. A folyamatos vízsugár a valódi csőrtől a pohár emelkedő vízfelszínéig ér. A tele pohárból kétoldalt kifolyik a víz, az asztalon tócsa marad. A kancsó véges mennyiségű vizet tartalmaz; a **Feltöltöm** gomb megőrzi a poharak tartalmát. A kiválasztott pohár kiürítése a mellette levő tócsát is eltünteti. A **Kicsit visszaöntöm** gomb kis lépésekben korrigál; a haladó körök változó célszintet és felcserélhető kisebb/nagyobb adagot kínálnak.

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

Az oldal az első megnyitáskor letölti a felületet, a 743 Jessa-mintahangot, a 24 családi szófelvételt és a tizenkét állathangot. Ebbe beletartoznak a puzzle magyar segítségei, az öntős játék hangjai, az R-kaland mintahangjai, az öt csoport útmutatói és a sakk magyar hangjai is. A szülői beállítások **Játék internet nélkül** részében várd meg a „Letöltve” visszajelzést. Ezután a képes játékok, a számolás és a hangok hálózat nélkül is használhatók. A szófelismerés a böngészőtől függően internetet kérhet.

iPhone/iPad Safariban a Megosztás menü **Főképernyőhöz adás** pontjával hozható létre játékikon. Az új ikonnal először internet mellett indítsd el a játékot, és abban az ablakban is várd meg a letöltés végét. [Apple útmutató](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

A játék megnyitáskor, előtérbe kerüléskor és a főképernyőre visszatéréskor ellenőrzi a frissítést. A teljesen letöltött új verzió a látható főképernyőn automatikusan betöltődik, amikor nincs nyitott párbeszédablak. Játék közben és háttérben vár; másik nyitott játékablak mellett sem aktiválódik. A főképernyő jelzi a letöltést és az esetleges hibát. Sikertelen letöltés után a korábbi teljes verzió tovább használható; az eredményeket a frissítés megtartja. A szülői letöltési és újrapróbálási gombok megmaradtak. A böngésző a hely felszabadításakor törölheti a tárolt fájlokat; a hiányzó csomag a szülői felületen újra letölthető.

A főképernyő felső sorában lévő **Frissítés** gombja szülői belépő nélkül indít kézi frissítést. A külön frissítőoldal mindig hálózatról érkezik, megkeresi és teljesen letölti/ellenőrzi a legújabb csomagot, majd a főképernyőre tér vissza a régi `?v=` paraméter nélkül. A kézi művelet más nyitott játékablakokat is frissíthet; ezt az oldal előre jelzi. Automatikus frissítésnél megmarad a többablakos védelem. Az eredmények, profilok és beállítások megmaradnak; a frissítés nem törli a helyi tárolót. Hibánál újrapróbálás és visszalépés érhető el. Offline a főképernyő gombja a játszható változatban tart.

Ha a régi változatban még nincs Frissítés gomb, a [közvetlen frissítőoldal](https://kasznare.github.io/beszedtanulas/refresh.html) arról is használható, szülői mód nélkül. A sima újratöltés vagy egy új `?v=` paraméter önmagában nem kerüli meg a játék offline gyorsítótárát.

A service worker HTTPS vagy localhost címet igényel. A helyi hálózatos HTTP-cím önmagában nem biztosít offline telepítést és mikrofonhozzáférést. A [GitHub Pages-oldal](https://kasznare.github.io/beszedtanulas/) HTTPS-t használ.

Fejlesztés közben HTML-, JavaScript-, CSS- vagy hangmódosítás után:

~~~bash
npm run build-offline
npm run check
~~~

Ez frissíti a generált **sw.js** fájlt. A kézzel szerkesztendő működés a **service-worker-runtime.js**, a fájljegyzék összeállítása a **scripts/build-offline.mjs**, a frissítési vezérlés az **offline-client.js** fájlban van. A gyökérkönyvtár JavaScript- és CSS-fájljai automatikusan bekerülnek; új almappás modulok vagy képek esetén bővítsd a generátor fájllistáját is. A frissítés a főképernyőre visszatérve automatikusan alkalmazódik, ha a teljes csomag elkészült és nincs másik nyitott játékablak.

## Hanganyagok

A **Mesék és Maci → Mesetár** a korábbi huszonkét hangos mese és vers mellett a Radó-gyűjtemény elkészült felolvasásait is tartalmazza, ElevenLabs **Jessa – Easygoing and Effortless** hanggal, **Eleven v4** modellel, magyar nyelven. A nagy gomb lejátszást/szünetet vált, az **Elölről** újrakezd, a csúszkával bármelyik részhez vissza lehet térni. Mesénként megmarad a hallgatási pozíció és az utoljára választott történet. A meseválasztás és a menüváltás leállítja az előző felvételt; az app más hangjai szüneteltetik a mesét. A kész mesék nem váltanak böngészős szövegfelolvasásra. Az API-t csak a felvételek készítése használja; a lejátszás nem fogyaszt ElevenLabs-kreditet. A játékok rövid instrukcióit is ugyanez a Jessa-hang adja.

Öt közkincs magyar klasszikus került a nyilvános Mesetárba, teljes, animált SVG-illusztrációval: **A kis kakas gyémánt félkrajcárja**, **A vadgalamb és a szarka** (Arany László gyűjtése), **A só** (Benedek Elek), **A cinege cipője** (Móra Ferenc) és **Anyám tyúkja** (Petőfi Sándor). A cím alatt a szerző és a műfaj látható; a szöveg mellett az OSZK MEK forrása nyitható meg. A versek versszakai megmaradtak. A digitális forrás öt szóközhibáját javítottuk, ezeket a `content/stories/catalog.json` rögzíti. Az eredeti szövegek szerzői 1898-ban, 1929-ben, 1934-ben és 1849-ben hunytak el; az életük utáni 70 éves védelmi idő eltelt. A források és az életrajzi igazolások művenként a katalógusban találhatók. A [31. §](https://njt.jog.gov.hu/jogszabaly/1999-76-00-00) szerinti védelmi időt az eredeti magyar szövegekre ellenőriztük. A nyilvános MP3-ak külön letölthetők, és ugyanazt a lejátszást, csúszkát és könyvjelzőt használják, mint a korábbi mesék.

További öt klasszikus készült el fix Jessa-felolvasással: **A kóró és a kis madár** (Arany László gyűjtése), **A nyulacska harangocskája**, **A három kívánság** (Benedek Elek), **Altató** (József Attila) és **Iciri-piciri** (Móricz Zsigmond). Ezek egyelőre illusztráció nélkül hallgathatók, a teljes eredeti szöveggel és MEK-forráslinkkel; külön letölthetők offline hallgatáshoz. Az Altató hét versszaka és az Iciri-piciri eredeti verssorai megmaradtak. A nyulacska digitális szövegében egy hiányzó szóközt javítottunk („hajtania” → „hajtani a”); a javítást a katalógus rögzíti. József Attila 1937-ben, Móricz Zsigmond 1942-ben hunyt el; az életrajzi források és a közkincs státusz művenként szerepelnek a katalógusban.

Radó Vilmos **Magyar gyermek- és népmesék** I–II. kötetének mind az **50 teljes meséje** külön, kereshető kötetlistából olvasható, az eredeti sorrendben és helyesírással. Az első kötet 31, a második 19 mesét tartalmaz; az öt eredeti lábjegyzet és a MEK elektronikus kiadásának CC BY-SA 3.0 licence is látható. A kész Jessa-felolvasások a tényleges hangból kapnak szóidőket és kapcsolható sor-/bekezdésfeliratot, külön offline letöltést és könyvjelzőt. A még hiányzó hangoknál a felület egyértelműen jelzi, hogy a teljes szöveg már olvasható, a felolvasás még várakozik. A [mesénkénti lefedettség és kreditbizonylatok](content/stories/rado-coverage.md) mutatják az aktuális kész/várakozó állapotot és a pontos hátralévő bemenetet. Az eredeti archívumok megmaradtak; a képet nem tartalmazó források az illusztráció nélküli Mesetár-megoldást követik.

A **Saját mese hozzáadása** egy `.mese.json` fájlból helyi mesét tesz a listába, illusztráció nélkül. A fájl a szöveget és az MP3-at is tartalmazza; importálás előtt a hang méretét és SHA256-lenyomatát ellenőrizzük. A böngésző IndexedDB-tárhelyén mentődik, internet nélkül is lejátszható, és saját könyvjelzője van. A tartalom nem kerül a felhőszinkronba vagy a nyilvános katalógusba. Másik böngészőn/eszközön ugyanazt a fájlt kell importálni. Az **Eltávolítás** csak az adott böngészőből töröl; a böngészőadatok törlése is eltávolítja, ezért a forrásfájlt őrizd meg. A maximális MP3-méret 32 MB, a teljes importfájl legfeljebb 46 MB.

Saját, jogszerűen használható szövegből a `scripts/generate-private-audiobook.py /abs/path/mese.txt --title 'A mese címe' --generate` készít importfájlt. A szöveg és a kimenet a nyilvános repositoryn kívül legyen; az alapértelmezett kimenet `~/.local/share/beszedtanulas/private-audiobooks/`. A generátor a meglévő Jessa-beállításokat és a külön API-kulcsot használja, a sikeres fizetett hangot újrafelhasználja, a bizonytalan kérést nem ismétli meg automatikusan. Nem telepít saját szöveget/hangot a nyilvános fájljegyzékbe. Ellenőrzések: `tests/local-audiobooks.test.mjs`, `tests/browser/local-audiobooks.js`.

A katalógus első **17 teljes műve** animált SVG-illusztrációt kapott, összesen **549 jelenettel**. Az öt magyar klasszikus 151 új jelenete közvetlenül a kész Jessa-felvétel idejét követi; a korábbi tizenkét mese 398 jelenete és időleképezése megmaradt. A cinege és a tyúk verseinek képei a versszakok konkrét madarait, csizmáját, ládáját, kendermagját és tojásait követik. A gépek, a műhely, az alagút, az esős és hegyi kaland, az úszás, a havas út, a korcsolyázás, a sziget, Márk koronája és az ezüst autó saját történethez igazodó jelenetsort használ. A mozgó felhők, növények, pislogás és kerekek mellett eső, hó, hullámok, nádas, buborékok, gépkarok, darukötél és korcsolyázás is a kész MP3 idejét követi. Szüneteltetés, keresés és könyvjelzőből visszatérés a hozzá tartozó képet adja. A **Mozgás** kapcsoló és az operációs rendszer csökkentett mozgás beállítása jelenetenként álló illusztrációra vált.

A közös modellek és környezetek a **`story-art/`** könyvtárban vannak. Egy szereplő, autó vagy kellék javítása automatikusan megjelenik minden azt használó mesében. A jelenetek a `story-scenes/` modulokban, az első mese a `story-visuals.js` / `story-visual-data.js` fájlban él; a közös vezérlő a `story-visual-player.js`. Minden rajzmodul az alap offline csomag része. Helyi, jelenetenként bejárható előnézet: `output/story-library/`, a `python3 tests/browser/audiobooks-fixture.py 5187` szerverrel; cím: `http://127.0.0.1:5187/output/story-library/`.

A hosszú MP3-fájlok az oldal telepítésekor vagy puszta meseválasztáskor nem töltődnek le automatikusan. Az első **Meghallgatom** indításkor a kiválasztott felvétel lejátszás közben, a háttérben az eszköz külön mese-cache-ébe mentődik. A service worker a böngésző részleges hangkéréseit egy közös teljes letöltésből szolgálja ki; a **Letöltve** jelzés csak a teljes MP3 SHA256-ellenőrzése és sikeres tárolása után jelenik meg. A **Letöltés** gomb előzetes, idempotens offline mentésre megmarad. Az újrahallgatás és az offline visszatérés a mentett hangot használja. A cache a játék verziófrissítésekor megmarad; egy felvétel új ellenőrzőösszege új hangverziót jelent, a régi mentés csak az új, ellenőrzött hang sikeres tárolása után törlődik. Régi worker késői válasza nem törölheti a friss felvételt. Tárhelyhiba esetén a hálózati lejátszás működhet tovább, a felület a mentési hibát és az újrapróbálás lehetőségét jelzi. A kompatibilis böngészőktől az első hallgatáskor tartós tárhelyet kérünk; a böngészőadatok kézi törlése továbbra is eltávolítja a mentett meséket. A pozíció eszközbeállítás, nem gyermekeredmény; a profilváltás nem készít második mesekönyvjelzőt.

A változtatás nélkül kimentett eredeti szövegek a `content/stories/` könyvtárban vannak. Csak a cím és a mese szövege kerül a hangszolgáltatáshoz; a chat üzenetei és forrásadatai nem. A hangkészítés eltávolítja a formázási jeleket, de nem írja át a történetet. `python3 scripts/generate-elevenlabs-audiobooks.py` csak megmutatja a feladat méretét. A `npm run generate-audiobooks` generál, időzít és telepít; az új részek ElevenLabs-kreditet fogyasztanak. Python 3, internet és ffmpeg/ffprobe szükséges. Az API-kulcs a repón kívüli `~/.config/beszedtanulas/elevenlabs.env` fájlban van. A kész részek és időbélyegek az ignorált `output/elevenlabs-audiobooks/` könyvtárban maradnak, így a sikeres kérések ismételt futtatáskor nem kerülnek újra elküldésre. Bizonytalan hálózati megszakításkor a generátor megáll; az eredményt az ElevenLabs előzményekből kell visszanyerni újabb fizetős kérés előtt.

A Radó-kötetek külön, az új kiejtési szabályokat is alkalmazó feldolgozása: `npm run prepare-rado` importál és elkészíti mind az 50 kérési tervet fizetős hívás nélkül (az importhoz beautifulsoup4 szükséges); `npm run generate-rado` csak a meglévő keretbe férő teljes meséket készíti és telepíti. A keretellenőrzés kedvezmény nélkül 1 kredit/karakterrel és 10% tartalékkal számol, minden új mesénél friss egyenleget kér. A tartós kérési tervek, teljes nyers válaszok, fizetett cache és bizonylatok a repón kívüli `~/.config/beszedtanulas/rado-audiobook-cache/` könyvtárban maradnak. A bizonytalan kérést nem ismétli meg; resetkreditet nem vált be, nem vásárol, és nem módosít előfizetést. A régi generátor továbbra is a korábbi 22 művet kezeli, a Radó-hangokat és időzítéseket újratelepítéskor megőrzi.

Három mese készülhet egyszerre. A 10 000 karakternél hosszabb történet bekezdéshatáron több részre oszlik; a következő rész az előző kérés azonosítóját kapja a hang folytonosságához. Az MP3-ak veszteségmentesen fűződnek össze. A `scripts/align-elevenlabs-audiobooks.py` a karakteridőzítésből feliratokat és szóankorokhoz igazított időleképezést készít: a `story-playback-maps.js` az új felvétel idejét az eredeti SVG-akciók idejére fordítja. Így a jelenetek, szereplőmozgások és feliratok az új tempót követik. Az eredeti szóidőzítést a verziózott `content/stories/visual-timing/` könyvtár őrzi az ismételt futtatásokhoz; helyi másolata az `output/elevenlabs-audiobooks/original-timing/` archívum. Ezek a forrásfájlok nem kerülnek a publikált csomagba.

Az ellenőrzött MP3-ak az `audio/audiobooks/` könyvtárba, a hangkészítési bizonylat az ottani `generated.json` fájlba, a lejátszható jegyzék az `audiobook-data.js` fájlba kerül. A feliratok a `story-caption-timing.js`, az animációs időleképezések a `story-playback-maps.js` fájlban vannak; ezeket együtt kell menteni. A `scripts/check-audiobooks.mjs` a forrást, a szöveget, a generálási beállításokat és az MP3 ellenőrzőösszegét ellenőrzi. A forrásimport, az API-kulcs és a generálási cache nem része a publikált csomagnak.

Az alapértelmezett magyar mesélőhang minden modulban ElevenLabs **Jessa – Easygoing and Effortless**, Eleven v4 modellel és `hu` nyelvvel. A rövid felolvasások 845 azonosítóhoz és 706 különböző alapfelvételhez tartoznak: szavak, kifejezések, számok, mennyiségek, feladatok és rövid segítségek. A hangos feladatok rövid kijelentéseket és egyszerű felszólításokat használnak. A gyári hangok az **audio/voice/** könyvtárban találhatók. A meglévő 24 saját szófelvétel az **audio/** könyvtárban maradt, és a szülői beállításból visszaválasztható.

Új hangok készítése vagy hiányzó hangok pótlása:

~~~bash
npm run generate-voice
~~~

Ehhez Python 3, ffmpeg/ffprobe és az új hangokhoz internet szükséges. A `voice-config.json` rögzíti az összes beállítást: Jessa `yj30vwTGJxSHezdAGsv9`, `eleven_v4`, `hu`, stability 0.5, similarity_boost 0.75, `mp3_44100_128`, seed 42. Az API-kulcs a repón kívüli `~/.config/beszedtanulas/elevenlabs.env` fájlban van. Csak a rögzített szóanyag és a játék szövegei kerülnek a szolgáltatáshoz. A játék kész helyi MP3-akat játszik; teljes letöltés után internet nélkül működik, és a lejátszás nem fogyaszt API-kreditet.

A generátor a teljes beállítás és szöveg lenyomatát, az MP3 ellenőrzőösszegét, hosszát és az új felvételből számolt szóidőket az **audio/voice/generated.json** fájlba menti. Azonos szöveget és beállítást csak egyszer kér le, majd több azonosítóhoz újrahasználja. A lezáró pontot igénylő API-bemenetet a `spokenText` rögzíti, miközben a képernyőn megjelenő szöveg változatlan. Az önálló szavak és számok többsége magyar szövegkörnyezetben készül a biztosabb kiejtésért. A rögzített `extract` szabály csak a célszót vagy számot veszi át; a bevezető szavak nem kerülnek a kész mintahangba. A „barack” és egy mondóka „perec” szava ellenőrzött fonetikus API-bemenetet (`spokenTarget`) kap a c hang megtartásához; a megjelenített és gyakorolt szó változatlan. A 32 rövid mondókarész és a kétszavas kifejezések részei is a teljes mintafelvétel karakteridőiből készülnek, újabb fizetett kérés nélkül. A kivágott hang saját szóidőt kap, az aliasok szóhatárai az eredeti írásmódhoz kapcsolódnak. A lenyomat a kivágási szabályt és az alias eredeti szövegét is tartalmazza.

A fizetett cache, nyers API-válaszok, kérésnaplók és bizonylatok tartósan a repón kívüli `~/.config/beszedtanulas/jessa-voice-cache/` könyvtárban maradnak. Hiányzó vagy sérült helyi MP3-at ebből állít helyre újabb API-kérés nélkül. A `python3 scripts/generate-voice.py` csak leltárt mutat; a `--generate` kapcsoló engedélyezi a meglévő keret használatát. A generátor előfizetést és konzervatív, kedvezmény nélküli keretet ellenőriz; nem vásárol, nem módosít előfizetést, és nem vált be reset-kreditet. Bizonytalanul megszakadt fizetett kérést nem ismétel meg: a `.pending.json` alapján az ElevenLabs előzményekből kell helyreállítani.

Az `npm run check` a szöveget, beállításokat, ellenőrzőösszegeket és teljes szólefedést ellenőrzi. Az `npm run check-voice` ezen felül minden MP3-at végig dekódol, ellenőrzi a mért hosszát és a végső szó időzítését. A hangokat, jegyzékeket és a `voice-timing.js` fájlt együtt kell commitolni.

A 2026. október 12-i teljes átállás 472 rövid felolvasást, 439 különböző kész hangot és új szóidőzítést adott. A mintákkal és kiejtési javításokkal együtt 2 210 meglévő kredit fogyott, az API-bizonylatok és az előfizetés számlálója egyezett. A teljes újrafuttatás 0 új kéréssel ugyanazokat az MP3-ellenőrzőösszegeket és időzítéseket adta. A 22 kész mesét, az eredeti SVG-jeleneteket, a családi felvételeket és az állathangokat újrahasználtuk; ezek nem változtak.

Források:

- **game-data.js:** szavak, témák, kifejezések és elfogadott gyereknyelvi változatok.
- **scripts/build-voice-manifest.mjs:** segítségszövegek és hangjegyzék-generálás.
- **voice-library.js**, **audio/voice/manifest.json:** generált hangjegyzékek.
- **voice-pronunciation.json:** az Eleven v4 `/IPA/` kiejtési szabályai a hosszú é/í és a k–j kapcsolat egyértelmű megtartásához. A szabály minden előfordulásra érvényes, a megjelenített szavakat nem módosítja. A fonetikus jelölés teljes szóként kap időzítést, az `npm run check` pedig hiányzó alkalmazását is jelzi. A gépi szövegfelismerés önmagában nem igazolja a magánhangzó hosszúságát vagy a mássalhangzó pontos képzését; a javított minták külön meghallgathatók.

Hiányzó saját felvételnél a játék a kész Jessa-hangra vált. Ha a gyári MP3 sem indul, látható üzenet kéri az ismétlést; a játék nem vált másik böngészőhangra. A dinamikus szám- és mennyiségmondatokat is a teljes helyi hangjegyzék fedi le. A 24 családi szófelvétel, az R-kaland saját felvevője, az állathangok és a zörejek változatlanok.

## Hangeffektek a mozdulatokhoz

A koppintás és a kijelölés rövid közös jelzést kap. A Montessori megfogás, fa ütközés, átesés, forgatás, akadálycsúsztatás és golyólerakás külön hallható. A Rendezőrács és Mintaemlék lerakása illesztési, a minta elrejtése és újranézése papírhangot kap; az ellenőrzés külön sikert vagy újrapróbálást jelez. A sakkban külön figurakoppanás, ütési és visszavonási hang van; a képkirakó megfogást, illesztést és visszatételt jelez, a kártyák papírfordítást. A macis játékok étel- és ruhamozdulatai, a Meseliget almái/tányérjai, a Műhelyliget rudai és formái, a bolt, a szabálygép, a róka lépései és az R-kaland képes találatai is effektet kapnak. A meglévő vízöntési hang ugyanarra a külön szabályozható effektkimenetre kapcsolódik.

A szülői beállításokban a **Hangeffektek a mozdulatokhoz** kapcsoló, a külön hangerő (alapból 60%) és az **Effektek kipróbálása** gomb kezeli a jelzéseket. A hangerőcsúszka legalább 44 px magas érintési felületet ad. A hangos segítség kapcsolójától függetlenek. Nulla hangerő vagy kikapcsolás a vízöntést és a sikerhangot is elnémítja; a beszéd, mesék, saját felvételek és állathangok külön maradnak. A beállítás újratöltés után megmarad.

A rövid effektek helyben készülnek Web Audio tónusokból és szűrt zajból; nincs új MP3-letöltés vagy beszédgenerálás. Felolvasás mellett halkabbak, mikrofonos gyűjtés/felvétel közben nem szólnak. A meglévő rövid mikrofonindítási jel megmarad. Kilépés és oldalelrejtés megszünteti az aktív és időzített effekteket. Egy mozdulat saját hangja helyettesíti az általános kattintást, a húzás minden képkockája nem indít új hangot. Legfeljebb négy rövid effekt lehet egyszerre aktív. Sikertelen helyre tett elem finom újrapróbálási jelzést kap.

Megvalósítás: `interaction-audio.js`, játékok saját eseménykezelői, `app.js`, `index.html`. Ellenőrzés: `tests/interaction-audio.test.mjs` és `tests/browser/interaction-audio.js` valódi Web Audio forrásokkal, külön Chrome/WebKit tesztprofilokban.

## A hangot követő képi jelzések

A szabálygép példájára koppintva a bemeneti szám, a fogaskerék és a kimeneti szám a narráció sorrendjében kap finom, statikus zöld keretet. A hosszabb segítségek a felolvasott részt emelik ki: kosarak, plusz/mínusz gombok, csomag és ház, almáskert és kosár, állatok és tányérok. A képkártya, a megszámolt tárgy és a kétszavas gyakorlás képei is követik a hangot. A Képpárokban az éppen felfordított kép, a műhelyekben a tálcák, mintasorok, mérlegoldalak és a segítségben megnevezett rúd kap jelzést. A választós játékokban a beszélő figura vagy a hangszóró kap jelzést; a helyes választ a kiemelés nem mutatja meg előre.

A jelzés a tényleges lejátszás kezdetéhez és a hangfájlban rögzített szóidőkhöz igazodik. Kilépés és új hang indítása törli a korábbi jelzést. A keret minden játékban álló: nem pulzál, nem ugrál és nem villog. A Maci beszéd közbeni szájmozgását a készülék **Csökkentett mozgás** beállítása kikapcsolja. A működés internet nélkül is elérhető.

A játék saját állapotjelzései is ezt követik: a kiválasztott mondóka és sor, a szóban keresett R helye, a sakk kijelölt/cél/ütési mezői, a pohárjelölés, az útiterv és a műhely mintasegítsége zöld keretet kap. Az újrapróbálható válaszok szürkéskék jelölést használnak. A belső kijelölési keretet és a külső hangos kiemelést a `tests/browser/feedback-borders.js` külön ellenőrzi, hogy egy zöld narrációs kontúr alatt se maradjon narancssárga állapotkeret.

Fejlesztés: a `narration.js` vezérli a jelzések életciklusát, a `narration-cues.js` rendeli a mondatrészeket a jelenet elemeihez. A hanggenerátor az ElevenLabs `with-timestamps` karakteridőit az MP3-mal együtt kéri le, és az eredeti szövegből pontos szóhatárokat képez a `voice-timing.js` fájlhoz; ezt és az `audio/voice/generated.json` fájlt együtt kell menteni a hangokkal. A `speakVoiceSequence` elemei lehetnek sima hangazonosítók vagy `{id, cue: {target, motion, parts}}` objektumok. A célkiválasztók az aktív játékhoz tartoznak. A `parts` elemei `{at: "a felolvasott mondatrész", target: "CSS-kiválasztó", motion: "pulse"}` alakúak. A korábbi `motion` értékek (`pulse`, `input`, `output`, `machine`) kompatibilitásból megmaradtak, de mindegyik ugyanazt a statikus jelzést használja.

Más jelenetek a dokumentum `narrationstart`, `narrationword`, `narrationend` eseményeihez is kapcsolódhatnak. Az események `detail` mezőjében `id` és `text`, szóhatárnál `word`, `index`, `time`, befejezésnél `reason` érkezik. A családi szófelvételeknél a teljes szó lejátszását követi a képi jelzés.

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
