# Beszédtanulás – folytatási terv

## 2026. október 3. – Magyar hangszövegek és GitHub Pages

**Aktuális közzététel:** a felhasználó kifejezett kérése alapján kizárólag a meglévő GitHub Pages folyamatot használjuk. `npm run build`, commit, majd push az `origin/main` ágra; a **pages build and deployment** automatikusan telepít. Éles cím: https://kasznare.github.io/beszedtanulas/ . A korábbi Sites-utasítások történeti bejegyzések. A helyi `.openai/hosting.json` kötést eltávolítottuk; a privát távoli másolatot nem töröltük és a hozzáférését nem módosítottuk.

A felhasználó pontosítása: az **sz** kiejtése alapvetően jó. A konkrét probléma például az „építsd meg a gépet” torlódó hangalakja és a kérdő mondatok gépi hangsúlya. A mesélőhang és tempó maradt `hu-HU-NoemiNeural`, `-6%`; nincs általános betűhelyettesítés vagy az sz-t érintő kiejtési átírás.

- 51 hangszöveg változott. Mind a 40 kérdő hangszöveg kijelentésre vagy egyszerű felszólításra cserélve. Példa: „Ezen a képen három alma van. Keresd meg!” Az „építsd” helyén „Most te rakod össze a gépet” szerepel; hasonló egyszerűsítés az állítsd/készítsd/gyűjtsd alakoknál. A számolási feladat közvetlen hangazonosítót használ, a kiírt szöveg ugyanabból a hangjegyzékből érkezik.
- Mind a 256 generált MP3 újragenerálva. A 24 saját felvétel változatlan. Az `audio/voice/generated.json` a szöveg/hang/tempó lenyomatát és a tényleges MP3 ellenőrzőösszegét tárolja. A generátor csak az igazoltan aktuális fájlt hagyja ki. Az ellenőrzés visszautasítja az elavult vagy eltérő hangfájlt; sikertelen letöltés megtartja a régi MP3-at. A következő generálás valódi no-op volt: 0 új, 256 változatlan fájl.
- A 12 másodperces lejátszási levágást kijavítottuk. Az MP3 lejátszásának védőideje a fájl hosszát követi, legfeljebb 60 másodpercig; a böngészős tartalék felolvasás a szöveghosszhoz igazodik. A kilépés és új koppintás továbbra is megszakítja a beszédet.
- Ellenőrzés: `npm run build` sikeres, 68 Node-teszt; minden generált MP3 hibamentesen dekódolható. A generátor 7 elkülönített próbája sikeres (első generálás, kihagyás, szöveg/tempó változása, sérült/hiányzó fájl, megszakadt csere).
- Chrome és WebKit: 13–13 ellenőrzés, teljes 13,656 másodperces MP3, gyors kilépési megszakítás, számolási válasz/továbblépés, 375×667 / 932×350 / 834×1194 nézet, offline újratöltés és mind a 256 hang gyorsítótárazása. Külön Chrome-próba az AudioContext nélküli HTML audio lejátszásra: a teljes hosszú hang ott is végigszól. Tartós tesztsegéd: `tests/browser/voice-playback.js`; kizárólag eldobható tesztböngészőben futtatható.
- A kiejtés és a hangsúly szubjektív minőségét a felhasználó következő meghallgatása erősítheti meg; a technikai hangteszt ezt nem helyettesíti. A szülői **Új verzió betöltése** gomb aktiválja az új offline csomagot a már telepített játékban.

## 2026. október 2. – Furfangliget, három összetettebb fejtörő

Önálló fejlesztés külön chatben, a korábbi 19 perces korlát nélkül. A régi játékok és a korábbi munkafaváltozás megmaradtak. Usage-reset kredit nem lett beváltva, automatizmus nem készült.

### Elkészült működés

- Játsszunk! → Furfangliget: Erdei bolt, Szabálygép, Csomagösvény, külön szülői nehézségekkel. A könnyű beszéd-, etetős-, öltözős- és Meseliget-játékok megmaradtak.
- Bolt: két egymásra épülő, két terméket kérő rendelés; a másodikban egy mennyiség változik. Képes cél, műveletes mód, valamint összeg és különbség szerinti következtetés. Almák és gesztenyék hozzáadása/visszavétele; külön 1–5 / 1–10 / 1–20 számkör.
- Gép: három példa, szabadon építhető műveletsor, kipróbálás, két új eset kiszámítása. A harmadik fokozat két, sorrendfüggő művelet; több matematikailag egyenértékű megoldás elfogadható. A géppróba önmagában nem ad jutalmat.
- Ösvény: előre összeállított, kipróbálható út, kerülendő kövek és egy/két csomag. Koppintás, nyílgombok, billentyűzet és folyamatos húzás. A szélességi keresés a felvett csomagok állapotát is figyeli; minden generált pálya megoldható, és több út elfogadható. A segítség a jelenlegi útból is tud folytatást ajánlani, vagy rövidebb újratervezést mutat.
- Három segítségfokozat, mozdulatonkénti visszavonás (legfeljebb 60 előzmény), kíméletes hibajelzés, nincs büntető időzítő vagy mikrofon. Egy feladat egyszer jutalmaz; a bolti első rész csak ellenőrzőpont.
- Profilonként három külön félbehagyott feladat. A feladat magja, szintje, munkája és segítsége mentődik, újratöltés után azonosan folytatható. A `logic` séma 1. verziójú, a feladatgenerátor determinisztikus. Ha a generátor később változik, a mentett seed jelentésének megőrzéséről/verziózásáról gondoskodni kell.
- Játékonként és szintenként külön önálló/segített matematikai eredmények. Beszédpróbák és szóeredmények érintetlenek. Profilváltás, JSON-export/import, nullázás és visszavonás kezeli az új adatokat. A helyi szülői összesítés külön mutatja őket; a fájl-visszaállítás előnézetében külön Fejtörő számláló van. Felhős matematikai szinkron ebben a körben nem készült.
- 74 új magyar statikus hang, saját hátizsákos róka, offline csomagban mindkettő. A csomag jelenleg 314 gyorsítótárazott fájl + sw.js, összesen 280 MP3. Az útvonal kirajzolása és a csomagok felvétele valódi jelenetváltozás.

### Rövid ManóMatek-kutatás és saját megoldás

[Móricz Attila: Tanulás számítógéppel, PC World, 2000. március, 15. oldal](https://www.doksi.net/hu/get.php?lid=11016) a kisebb/több/páros fogalmakat, játékos számolást és átváltási feladatokat emeli ki, az első részben 20-as, a másodikban 100-as számkörrel. Ez képességfejlesztő szervezésre utal, nem pusztán egymás utáni számpéldákra. [Az 1999-es Könyv és Nevelés ismertető](https://epa.oszk.hu/04200/04290/00002/cikk15.html) kereshető kivonata több témakör könnyebb-nehezebb feladatait és hangos kalauzolást ír le; a teljes oldal most nem töltődött be. [Elek Elemérné tanulmánya, 92. oldal](https://publikacio.uni-eszterhazy.hu/6537/1/89_96_Elek.pdf) a ManóMatek képes/animált tartalomközvetítését mutatja példaként. Az eredeti CD teljes feladatkatalógusát nem sikerült közvetlenül ellenőrizni, ezért konkrét minijátékokat nem tulajdonítunk neki.

A saját bővítés ezeket az elveket viszi tovább: megváltoztatható tárgymennyiségek, példákból kikövetkeztetett szabály, tervezés és végrehajtás. Nem másolja a régi program jeleneteit, képeit vagy hangjait. A falu, a hosszabb kirándulástörténet és további műhelyek későbbi munka.

### Saját kép

`assets/furfang-fox.png`: beépített image_gen, egyetlen generálás, valódi átlátszóság, 1254×1254 PNG. Az eredeti saját generált fájl másolata, nincs külső karakterreferencia. A prompt: „Use case: illustration-story. Asset type: original transparent PNG character illustration for a Hungarian children's math game, readable as an 80px menu icon and a 40px board piece. One small friendly orange fox wearing a teal backpack, whole body in a friendly seated three-quarter view, welcoming expression, simple large eyes, cream muzzle and chest, bushy tail beside the body. Genuinely transparent background, no setting. Simple warm storybook gouache, crisp clean cutout edges, broad expressive shapes, restrained painted texture, strong readable silhouette. Square composition, centered character filling the canvas with small safe margins; entire ears, paws, backpack and tail inside. Warm orange and cream fox, teal backpack. Wholly original design; no existing character copying or ManóMatek assets; no text, numbers, letters, logos, watermark, other props, scene, ground or cast shadows.”

### Ellenőrzés és használhatóság

- 68 Node-teszt: 8 új célzott teszt, ezen belül 2700 bolti, 900 gépes és 1200 útvonalas generált eset; minden szint és bolti számkör. Külön többmegoldásos elfogadás, egyszeri jutalom, segítség, mentésvalidálás és profil/reset/undo.
- Chrome és WebKit: motoronként 146 játékmeneti és elrendezési ellenőrzés a három játék mindhárom szintjén. Hiányos válasz, három segítségfok, visszavonás, újratöltés, ismételt koppintás, egyszeri jutalom, újrajátszás, 430×932, 932×430, 834×1194, 1194×834, 430×740, 932×350 és 375×667. Vízszintes kilógás nincs. Rövid képernyőn a hosszabb fejtörők függőlegesen görgethetők.
- Chrome: 19 további ellenőrzés a folyamatos húzásra, koppintásos visszalépésre, billentyűzetre, animációból kilépésre, profilváltásra, tényleges fájlletöltés/import/reset/undo folyamatra, mind a 74 hang és a róka cache-elésére, offline újratöltésre és teljes útvonalmegoldásra. Az új magyar MP3 offline dekódolása sikeres. 200%-os szövegmérettel a gép nem lóg ki vízszintesen.
- WebKit: a korábbi Meseliget 23 ellenőrzése sikeres, teljes piknik, album, mentett folytatás, régi hét elrendezés. Chrome és WebKit: 8–8 további régi játékellenőrzés – teljes öltözés/etetés, meglepetéskör, eredményelkülönítés, képes és számolási menü.
- Használhatósági javítások: a 🌰 képet gesztenyének nevezzük, új magyar menühang segít megtalálni a kirakós kaput, a szülői profilválasztó továbbra is felül van, a kisebb gép számos kimenete mellett pöttyök is vannak, a kereszteződő útvonal segítsége sorrendi nyilakat kapott, a húzás tartós mutatófogást használ. A megoldott út újbóli megnyitásakor a róka a célban marad.
- A tesztböngészők elkülönültek a felhasználó saját böngészőjétől. A fejlesztés közbeni régi HTTP/cache állapot miatt egy próba régi JS-t töltött; friss tesztböngészővel az exportelőnézet és az új csomag ellenőrzése is sikeres. Az egyik régi meglepetésteszt az aszinkron jutalom előtt ellenőrzött; a befejező ablak megvárásával sikeres. Ezek tesztsegéd-javítások, a régi játékok kódját nem módosítottuk.
- A végső szülői offline-verziófrissítés 13 további Chrome-ellenőrzése sikeres: megmarad a haladás és a jutalom, a kész pályán a róka a célban van, az ösvény öt célméreten kilógás nélkül és legalább 44 px-es gombokkal működik.
- Tesztsegédek: `tests/browser/furfang-core.js`, `furfang-extra.js`, `furfang-update.js`, `old-games.js`; csak eldobható Playwright CLI-munkamenetben futtatandók. Képernyőképek: `output/playwright/logic-*`.

### Közzététel és következő lépések

Történeti állapot, a 2026. október 3-i GitHub Pages-döntés felülírja. A korábbi privát Sites-projekt: `appgprj_6abff9957a30819186ffcc2af5d90a9e`, `static.directory: dist`, cím: https://meseliget-beszedjatek.kasznare.chatgpt.site/ . Az új csomag közzétételének végállapotát ennek a fejlesztési chatnek a záró válasza rögzíti. A korábbi éles forrás `1b1edabd7ac995834499664ade1fc163cd29bd0e`; a hozzáférési beállításokat változatlanul kell hagyni. `npm run build` végzi a csomagolás előtti teljes ellenőrzést.

Későbbre: fizikai iPhone/iPad próba gyerekkel és valódi érintéses húzással, hanghossz/pedagógiai nehézség finomítása visszajelzésből; további szabálycsaládok, nagy kirándulás, műhely és saját falu. Nincs új többeszközös felhőszinkron vagy automatikus nehézségváltás. Böngészős WebKit-próba nem fizikai iOS-próba.


## 2026. október 2. – Privát HTTPS-közzététel

A Sites-közzététel sikeres. Éles cím: https://meseliget-beszedjatek.kasznare.chatgpt.site/ . A tulajdonos ChatGPT-fiókja fér hozzá; a megnyitott alkalmazásbeli böngészőn az éles főképernyő ellenőrizve. A Mac futtatása nem szükséges a webes változathoz.

Történeti állapot: a .openai/hosting.json ekkor a Sites projektet rögzítette. A 2026. október 3-i döntés szerint a további kitelepítés kizárólag a GitHub Pages folyamatával történik. Az npm run build a 60 ellenőrzést és az offline csomagot futtatja, majd a scripts/build-site.mjs kizárólag a hitelesített futtatási fájlokat másolja a dist/ könyvtárba. A publikált csomag 236 futtatási fájl, a Sites-csomagolás a tárhelymetaadatot is hozzáadja. Dokumentáció, helyi mentés és nyers hanganyag nincs a kiszolgált csomagban.

A localhost és az éles cím külön böngészős tárhelyet használ. A korábbi eredményeket JSON-exporttal és az éles oldalon történő visszaállítással lehet átvinni. A korábbi munkanapló közzététel nélküli állapota történeti bejegyzés.


## 2026. október 2. – Meseliget első játszható változat

A felhasználó 19 perces megvalósítási kört kért a ManóMatek ihlette terv első változatára. A korábbi macis fejlesztések megmaradtak.

- Játsszunk! → Meseliget: négy képes hely (Maciház, Almáskert, Piknikrét, Emlékalbum), valamint vezetett piknikkaland.
- A kaland három állomás: sapka/cipő, három alma, három állat megterítése. A már befejezett állomások mentődnek, újratöltés után folytatható. Egy teljes történet egy jutalmat és egy albumemléket ad.
- Külön szabad almaszedés és terítés 1–3 / 1–5 / 1–10 számkörben, 3 / 5 / 10 feladatos körrel. Koppintásos, visszavonható tárgykezelés; Kész gombbal ellenőrzés; hangos és képes segítség. A szabad játék nem lépteti előre a mentett kalandot.
- 35 új statikus magyar MP3. Offline csomag 235 fájl. Minden hangszöveg bekerült a tartalomellenőrzésbe.
- Új meadow eredménymező a meglévő profil-, export-, import-, reset- és undo-folyamatban. Régi mentésnél üres Meseliget-adatok. Szülői összesítés: önálló/segített almaszedés és terítés, piknikek száma. A felhő továbbra is csak a meglévő szóeredményeket tárolja.
- Új fájlok: meseliget-data.js, meseliget-game.js, meseliget.css, tests/meseliget.test.mjs. A dress-art.js macija opcionális célkonténerrel újrahasznosítható, a meglévő öltözős játék hívása változatlanul működik.
- Böngészős próbák: teljes történet, kevés/sok alma, javítás, egyszeri jutalom dupla koppintás mellett, visszavonható tányér, újratöltéses folytatás, album, szabad játék és történet elkülönítése; hét telefon/tablet méretben vízszintes elférés. A 932×350 nézetben külön egymás melletti alma/kosár elrendezés készült.
- Ellenőrzés: 60 Node-teszt sikeres, 23 fő játékmeneti/böngészős ellenőrzés, valamint 12 további menü-, kompakt nézet- és offline ellenőrzés. A teljes háromállomásos kaland offline, újratöltés után is befejezhető; mind a 35 új hang gyorsítótárazva, a záró MP3 dekódolása hálózat nélkül sikeres. Ezek Chrome-próbák; új WebKit és fizikai eszközpróba még nincs.
- Képek: output/playwright/meseliget-*.png. Helyi tesztsegédek: /tmp/meadow-qa.js és /tmp/meadow-final-qa.js.

Következő kör: fizikai iPad/iPhone próba gyerekkel; további történetek; híd/formák és sorozatok; készségenkénti alkalmazkodás. A mostani első változatban a nehézséget a szülő állítja, az album a piknikek számát és egy közös emlékképet tárolja. A terv nagyobb bővítései még nem készültek el. Nem történt commit, push vagy külső publikálás.


## 2026. október 2. – Második kör: Maci öltözik

Az újabb fejlesztési kérésre elkészült a **Főképernyő → Játsszunk! → Maci öltözik** játék. A négy főmenücsempe megmaradt; a közös játékmenü három nagy választást kínál. Telefonon a két macis játék alatt széles meglepetéskártya van, tableten és fekvő telefonon a három választás egy sorba rendeződik.

- Egy kör egy teljes öltözet: sapka, póló, sál, cipő. A sorrend változik, minden darabot pontosan egyszer kér a maci. A helyesen választott ruhák láthatóan rajta maradnak a kör végéig; két cipő kerül a lábára.
- Saját SVG-ruharajzok a választógombokon és a macin; egyező színek és formák, nagy érintési felületek. A korábbi macirajzot használjuk újra, ütköző DOM-azonosítók nélkül.
- Négy teljes magyar kérés és négy külön válasz, például „Kérem a sapkát.” / „Meleg a sapkám!” Összesen 11 új generált magyar MP3 az új menühanggal, bevezetéssel és búcsúval együtt. A családi hangok megmaradtak.
- A szülői két/három képes beállítás működik. Az öltözés mindig négy kérés, a beszédgyakorlás 3/5/10 szavas körétől és témájától függetlenül. Ezt a szülői leírás is jelzi.
- Téves választás újrahallgatható, a második téves választás képes segítséget ad. Olvasás és mikrofon nélkül játszható. A befejezett kör egyszer ad jutalmat, a beszédpróbákat és szóeredményeket nem módosítja.
- Újrajátszás és visszanavigálás tiszta öltözettel kezd. Kilépés megszakítja a hangot; későn befejeződő hangletöltés sem szólalhat meg másik képernyőn. Csökkentett mozgásnál a ruhák animáció nélkül jelennek meg.
- A kör végi ablak címe „Indulhat a séta!”; más játékban visszaáll az eredeti cím.

Ellenőrzés: `npm run check` **56 sikeres Node-teszt**, köztük három új öltözős körteszt. A tartalomellenőrzés az új mondatokat és hangfájlokat is vizsgálja. Chrome-ban és WebKitben motoronként **35 játékmenet- és 13 beállítás/hangmegszakítási ellenőrzés** sikeres. A meglévő etetős játék 25 böngészős ellenőrzését is sikeresen újrafuttattuk mindkét motorral. A teljes felöltözésnél tényleges MP3-dekódolást és lejátszást figyeltünk; a csökkentett mozgást és a késleltetett letöltés utáni kilépést is ellenőriztük.

Elrendezés: mindkét motorban **56 állapot**, összesen 112: főmenü, háromjátékos menü, etetős és öltözős játék, két/három képes beállítással, 430 × 932, 932 × 430, 834 × 1194, 1194 × 834, 430 × 740, 932 × 350 és 1024 × 768 méretben. Nincs túllógás, a vizsgált gombok legalább 44 × 44 px méretűek. A teljes ruhát és a kompakt nézetet képen is ellenőriztük.

Offline csomag: **197 fájl, 6dc695e2ec767371**, összesen 171 MP3. Chrome-ban nyolc offline ellenőrzés sikeres: teljes új csomag és 11 hang, hálózat nélküli újratöltés, új menühang, egyszer megszólaló bevezetés után érkező kérés, teljes öltözés és hangos befejezés, újratöltés után megőrzött egyszeri jutalom. A WebKit ellenőrzés emuláció; fizikai iPhone/iPad próbát nem helyettesít. A felhő a külön tesztprofilban szünetelt, a külső SDK helyettesítve volt.

Fájlok: `dress-data.js`, `dress-art.js`, `dress-game.js`, `dress-game.css`, `tests/dress-game.test.mjs`; navigáció és hang az `app.js`-ben. A két új, csak öltözős szó (póló, sál) nem módosítja a beszédgyakorlás mentett szókészletét. Helyi tesztsegédek: `/tmp/dress-play-qa.js`, `/tmp/dress-options-qa.js`, `/tmp/dress-layout-qa.js`, `/tmp/dress-offline-qa.js`; képek: `output/playwright/dress-*.png`. A változtatások még helyben vannak, nincs új commit vagy push.

Következő lépés: valódi iPaden közösen kipróbálni a ruhaválasztást és a hangot. Új tartalomként állathangos kereső vagy egyszerű színválogatás jöhet; a főképernyő négy választása maradjon áttekinthető. A következő fejlesztés előtt nézd meg, melyik játékot használja szívesen a gyerek.

## Korábbi kör, 2026. október 2. – Etesd meg a macit!

Új felhasználói kérésre elkészült a magyar etetős játék. A korábbi szeptemberi határidő lezárva marad; nincs újraindított automatizmus. Az alábbi szeptemberi munkanapló történeti állapotot ír le.

### Most elkészült

- **Főképernyő → Játsszunk! → Etesd meg a macit!** A négy főmenücsempe megmaradt, a negyedik most két játékhoz vezet: a macihoz és a meglévő Mi bújt el? kártyáihoz.
- Saját SVG-maci, piknikterítő, nagy ételtányérok. A jó választás a maci szájához repül, utána mosoly és magyar köszönet következik. A továbbnyíl kézzel indítja a következő kérést.
- Öt helyesen ragozott kérés: „Kérek almát / kiflit / kenyeret / tejet / vizet.” Kilenc új, előre generált hu-HU-NoemiNeural MP3; a saját családi felvételek változatlanok. A mondatos kéréseket a mesélőhang mondja a családi szóhang választása mellett is.
- Olvasás és mikrofon nélkül játszható. Téves választás megismétli a kérést, a második téves választás kiemeli a keresett ételt. Nincs levont pont vagy büntetés.
- Meglévő szülői beállítások: 3 / 5 / 10 kérés és 2 / 3 választás. A maci témája mindig az öt finomság. Egy ciklus mindegyiket lefedi, közvetlen szóismétlés nélkül.
- Egy teljes piknik egyszer ad jutalmat. A beszédpróbák és szóeredmények nem változnak. Kilépés leállítja a hangot és az animációt; háttérbe tett, majd visszahozott játék folytatható. Csökkentett mozgásnál nincs repülő étel vagy fejbólintás.
- Álló tableten függőleges, fekvő tableten kéthasábos elrendezés; kompakt fekvő telefonon egy sorban maradnak a tányérok. A kisebb 1024 × 768-as tabletnél is megszűnt a túllógás.
- Offline csomag: **182 fájl, 32fa7be51a506e30**; összesen 160 MP3. Korábban telepített játékban a szülői felület frissítésgombja tölti be az új változatot.

### Ellenőrzés

- `npm run check`: 53 meglévő Node-teszt, szintaxis-, tartalom- és offlinejegyzék-ellenőrzés. A tartalomellenőrzés az új ételhivatkozásokat, mondatokat és MP3-akat is védi.
- Chrome és WebKit: motoronként 25 játékmenet-ellenőrzés, valódi MP3-dekódolással és lejátszással. Téves válasz, segítség, ismételt koppintás, egyszeri jutalom, újrakezdés, animáció közbeni kilépés, háttérbe tétel/visszatérés, mikrofonhívások hiánya.
- Motoronként további 29 ellenőrzés: újratöltés után megőrzött szülői beállítások, teljes tízes kör, két választás, minden ételt lefedő ciklus, csökkentett mozgás, családi szóhang és állatos gyakorlótéma melletti működés, meglévő kártyajáték és böngészős visszalépés.
- Elrendezés: főmenü, új játékválasztó és macis játék a 430 × 932, 932 × 430, 834 × 1194, 1194 × 834, 430 × 740, 932 × 350 és 1024 × 768 méretekben. Mindkét motoron sikeres a két- és háromválasztásos próba: összesen 84 elrendezési állapot. Nincs oldalirányú/függőleges túllógás, minden vizsgált gomb legalább 44 × 44 px.
- Chrome-ban hét új offline ellenőrzés: mind a 182 fájl és kilenc új hang gyorsítótárazva, hálózat nélkül újratöltött főmenü, tízételes kör tényleges hanggal, egyszeri jutalom és újratöltés után megőrzött eredmény.
- A tesztek külön böngészőprofilban futottak, szüneteltetett felhőszinkronnal és a külső SDK helyettesítésével. Fizikai iPhone/iPad és a hang szubjektív minősége még közös kipróbálásra vár. A WebKit-próba böngészőemuláció, az új offline próba csak Chrome-ban futott.
- Helyi tesztsegédek: `/tmp/teddy-play-qa.js`, `/tmp/teddy-options-qa.js`, `/tmp/teddy-layout-qa.js`, `/tmp/teddy-offline-qa.js`. Képek: `output/playwright/teddy-*.png` (gitből kizárva).

### Következő értelmes lépések

1. Gyerekkel próbálni, hogy a két választás, a maci beszédtempója és a továbbnyíl érthető-e. Valódi iPaden álló/fekvő fordítás, hang megszakítása és offline visszatérés.
2. A **Maci öltözik** játék az október 2-i második fejlesztési körben elkészült; részletek a dokumentum elején.
3. Később **Állathangok** vagy egyszerű **Színválogató**, külön rövid körként. Az új ötletek ne növeljék a főképernyő választásainak számát.

Új kód: `teddy-game.js`, `teddy-game.css`; tartalom: `game-data.js`; bekötés: `index.html`, `app.js`; hanggenerálás: `scripts/build-voice-manifest.mjs`. A fejlesztői kiszolgáló az 5173-as porton elindítva. Ez a fejlesztési kör még nincs commitolva vagy GitHubra küldve.

## Korábbi fejlesztési kör – 2026. szeptember

Lezárva: 2026. szeptember 8., 02:02 UTC / 04:02 Budapest. Az utolsó fejlesztési kör 01:20 UTC körül elkészült; a határidő utáni futás csak a lezárást végezte.

## A felhasználó célja és a határidő

Kevés olvasással, gyerekek által is használható játék. A zsúfolt fülek helyett képes főképernyő, ahova mindig vissza lehet lépni. Elsődleges cél az iPhone Pro Max és az iPad; a hang legyen kellemesebb, kevésbé robotos.

Önálló fejlesztésre adott idő: szeptember 7. 18:00 PST. A határidőt szó szerinti PST-ként kezeltük: **2026-09-08 02:00 UTC / 04:00 Budapest**. A nyári csendes-óceáni idő szerinti értelmezés egy órával korábbi lett volna; az opcionális pontosításra nem érkezett módosítás.

Az óránkénti folytatás leállítva. A besz-dj-t-k-fejleszt-se-a-hat-rid-ig automatizmus állapota **PAUSED**; további fejlesztés új felhasználói kérésre induljon. **Usage-reset kreditet soha nem szabad beváltani.**

A lezáráskor a munkafa megmaradt, a git diff --check és az offline fájljegyzék ellenőrzése sikeres. A csomag változatlan: **171 fájl, f825c1414274bb45**. A legutóbbi teljes npm run check mind az 53 tesztje sikeres; a böngészős ellenőrzések részletei alább találhatók. A fejlesztői kiszolgáló az 5173-as porton tovább fut, a külön tesztböngészők és tesztkiszolgálók bezárva. Commit és közzététel nem történt.

A következő közös lépés: valódi iPhone/iPad próba, különösen a magyar gyerekhang felismerése és a hang kellemes volta. A személyes felhős hozzáférés és a pontos többeszközös összesítés külön későbbi feladat.

## Jelenlegi működő változat

Statikus alkalmazás, külön frontendfordítás nélkül. Az indítóparancs automatikusan frissíti az offline fájljegyzéket. Indítás a projekt könyvtárából:

~~~bash
npm run start
~~~

Előnézet: <http://localhost:5173>. A fejlesztői kiszolgáló jelenleg fut; ha már van folyamat az 5173-as porton, ne indíts másikat.

### Gyerekfelület

- Négy nagy, képes főmenücsempe; a korábbi fülsor megszűnt.
- Házikó minden játéknál, működő böngésző-visszalépés, képernyőnként újrajátszható hangos segítség.
- Hat képes témaválasztó; témánként legfeljebb öt szó látszik a kártyákon.
- Külön választó az egy/két szavas játékhoz és a két számolós játékhoz.
- Nagy ikonok és érintési felületek, kevés gyerekszöveg, nyugodt színek, álló és fekvő telefonos/tabletes elrendezés.
- 3 / 5 / 10 szavas vezetett kör, választható téma, pontokkal jelzett előrehaladás, kör végi újrakezdés vagy hazalépés. Alapértelmezés: öt szó, 1–3 közötti számolás.
- A meglepetésjáték hat képet fordít fel és mond ki; mikrofon nélkül játszható. A teljes kör egyszer ad jutalmat.
- Beállítások, statisztikák és technikai részletek a szülői felületen. Egyszerű számtani belépő a véletlen koppintás ellen; ez nem hitelesítés.

### Szülői próba és visszatérés a gyerekhez

- A profilválasztó a szülői oldal tetején, a Ki játszik? részben van. A Próba indítása / Gyerekjáték indítása gomb a kiválasztott profil főmenüjét nyitja meg.
- Szülői próba közben a fejléc ezt jelzi, a főmenü külön sávot és Vissza a gyerekhez gombot mutat. Ugyanez a gomb a szülői beállításokban is elérhető; a gyerek eredményeit visszatölti, majd a főmenüre lép. A gyerek négy csempés menüjében nincs próbasáv.
- A visszatérés ugyanazt az egyetlen helyi írással végzett profilváltást használja. Tárolási hiba vagy másik ablak módosítása esetén az előző profil marad aktív, a hiba közvetlenül a gomb mellett látható; nem jelzünk sikeres átadást.
- A technikai felhőmezők a Kapcsolat adatai lenyitható részbe kerültek. A kapcsolódás és annak állapota továbbra is elérhető.

### Alacsonyabb fekvő telefonos nézet

- A 932 × 350-es nézetben kezdetben hat játék túlnyúlt az ablak magasságán. Külön CSS-szabályok készültek legfeljebb 390 px magas, legalább 650 px széles fekvő ablakra.
- Rövidebb fejléc, kisebb felesleges térközök; a számolás tárgyválasztója oldalra került. A tíz tárgy két sorban is elfér. A meglepetésjáték újrakezdése a kártyasor mellett van.
- A kör végi ablak kompaktabb; a házikó és az újrakezdés is látható, belső görgetés nélkül. A mikrofonos hibából kivezető képes gomb továbbra is elfér.
- A kompakt próbában 59–59 px oldalsó és 21 px alsó térközt is szimuláltunk. Ez reszponzív böngészőteszt, nem a Safari valós kezelősávjainak vagy fizikai készüléknek az ellenőrzése.

### Hang és működés

- 127 új magyar MP3: 24 szó, 6 kifejezés, 10 szám, 60 mennyiség/kérdés és 27 segítség. Összesen kb. 1,7 MB tartalom az audio/voice könyvtárban.
- Az új, géppel készült hu-HU-NoemiNeural hang az alapértelmezés. A 24 meglévő saját felvétel sértetlen, visszaválasztható. A hangos segítség kikapcsolható.
- Egyszerre egy beszédhang szól; új koppintás, hazalépés és megállítás megszakítja a korábbit. A későn letöltött hang sem indulhat el egy másik játékban.
- Mikrofon csak külön indításkor nyílik meg. Navigáció és leállítás megszakítja a figyelést; későn érkező engedély sem nyitja újra a megszakított próbát.
- A szópróba és a siker a rögzített célszóhoz kerül. A két szavas próbák nem módosítják másik szó eredményeit. A lejátszásszámlálás közös helyre került.
- Két szavas sikerhez egy felismerési javaslatban két külön szó kell. Külön alternatívákból nem rakható össze siker, ugyanaz a szó nem számolható kétszer. A sorrend rugalmas, a gyereknyelvi változatok megmaradtak.
- Régi helyi eredmények betöltése megőrzi a számlálókat és kiegészíti az új beállításokat. A felhős SDK késése nem blokkolja az indulást.
- Szóanyag külön game-data.js modulban; felismerési összehasonlítás külön speech-matching.js modulban. Friss README és npm run check parancs.

### Javított beszédfelismerési folyamat

- Új speech-recognition.js modul. A böngésző aktuális eredménylistáját dolgozza fel: a felülírt vagy eltávolított részeredmény nem marad meg. Az egymás utáni beszédrészletek összefűzhetők, az egy részleten belüli alternatívák egymást kizárják. Legfeljebb tíz teljes javaslatot tartunk meg.
- Megszűnt az első végleges részlet utáni és a 650 ms-os részeredmény utáni azonnali leállás. Egy szónál 6,5 s, két szónál 9 s a válaszablak; az indításra legfeljebb 4 s várakozás jut. A jó végleges találat hamarabb lezár, lejáratkor a stop() után még legfeljebb 900 ms-ig befogadjuk a végleges választ.
- Csak hu-HU, illetve kifejezett language-not-supported hibánál egyszer hu. Csend, engedélyezési és hálózati hiba nem indít új nyelvi próbákat; angol fallback nincs.
- A jelzés és a próbák számlálása a szolgáltatás tényleges indulásához kötött. A nyelvi fallback sem számol kétszer. Indulás előtti hiba nem gyermekpróba; szolgáltatáshiba nem nullázza a szó sikersorozatát.
- Szófelismerő és két szavas módban csak a SpeechRecognition fogja a mikrofont; nincs párhuzamos getUserMedia/energiafeltétel. Emiatt a két szavas eredményt már nem utasítja el egy korán véget ért, csendes hangenergia-minta. A bátorító mód önálló energiafigyelése legfeljebb 6,5 s-ig vár a megszólalásra, a rövid indítóhang után.
- Hálózati, engedélyezési vagy indítási hibánál képes átjáró a „Hol van?” játékba. Az ok a szülői oldalon látható. Hibánál a képes gomb a vezetett kör indítója helyén jelenik meg, így fekvő telefonon is elfér; új mikrofonos próba vagy következő szó visszaállítja a szokásos vezérlőket.
- Megszakításkor minden felismerési eseménykezelőt és időzítőt leválasztunk, majd abortáljuk a szolgáltatást. Késői eredmény és indulási jelzés nem módosíthat haladást.
- A megvalósításhoz ellenőrzött API-források: [az eredménylista és a részeredmények cseréje](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionEvent/results), [a stop() utáni végleges válasz](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/stop), [indulási esemény](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start_event).

### Elkészült „Hol van?” hallás utáni játék

- A négy főmenücsempe megmaradt. A Képek alatt két illusztrált választás: nézegetés vagy hallás utáni keresés. A témaválasztó a nézegetésből érhető el.
- Elhangzik egy szó, két nagy kép közül kell választani. A szülő három képre is állíthatja; a két szavas állattéma ilyenkor is két külön választást ad. A keresett szó nem jelenik meg szövegként vagy kiemeléssel.
- A kör a szülői 3 / 5 / 10 szavas beállítást és témát követi. Egy témakör szavai körbejárnak, közvetlen célszóismétlés nincs; a válaszok sorrendje keveredik.
- Rossz válasz nem léptet tovább, a szó újra elhangzik. Hangszóróval bármikor újrahallgatható. Helyes válasz után nagy nyíl léptet; a kör vége egyszer ad jutalmat, újrakezdhető vagy hazaléphető.
- A játék soha nem kér mikrofont, és nem módosítja a szófelismerési próbákat vagy szóeredményeket. A szólejátszás beleszámít a lejátszásba, a lezárt kör a jutalmakba.
- Saját családi szóhanggal is működik. Két új magyar segítséghang készült; a hangok és modulok az offline csomag részei.
- Forrás: listening-game.js. Négy Node-teszt védi a témák, körhosszok, válaszok egyediségét, a célszóismétlés elkerülését és a keverést.

### Elkészült offline használat

- Webmanifest, saját SVG-ikon és 180 / 192 / 512 px PNG-ikonok, kezdőképernyős megnyitáshoz.
- Az első megnyitáskor a service worker letölti a 171 helyi fájlt, köztük mind a 151 MP3-at. A szülői felületen letöltési állapot és rövid iPhone/iPad útmutató látható.
- A fájlonkénti SHA-256 ellenőrzés megakadályozza a hiányos vagy különböző verziókból összekeveredett új csomag aktiválását. Sikertelen új letöltés nem törli a korábbi verziót.
- Az új verzió várakozik. A szülői „Új verzió betöltése” gomb aktiválja és a főmenüre tölt újra; másik nyitott játékablak mellett megvárja annak bezárását.
- A részben elveszett gyorsítótár javítható. Sikertelen javítás megtartja a még meglevő fájlokat. A hangokhoz szükséges részleges bájtkérések is a gyorsítótárból működnek.
- A Supabase és más külső kérések nem kerülnek a gyorsítótárba. A szófelismerés eszközfüggő internetigénye a szülői felületen szerepel.

**Fontos a további fejlesztésnél:** minden HTML/JS/CSS/hangváltozás után futtasd az npm run build-offline parancsot. Az npm run check észleli az elavult csomagot. A gyökérkönyvtár JS/CSS-fájljai automatikusan bekerülnek; új almappás modult vagy képet a scripts/build-offline.mjs listájába is fel kell venni. A sw.js generált fájl, a működés forrása a service-worker-runtime.js.

Már megnyitott böngészőben az új felület a szülői frissítésgombbal alkalmazható. A további automatizált felülettesztekhez friss böngészőprofilt használj, vagy számolj a korábbi offline verzióval. Éles közzététel és valódi iPhone/iPad kezdőképernyős telepítési próba nem történt.

### Elkészült szülői eredménykezelés

- JSON-export csak az aktív profil számlálóival és a 24 szó eredményével; a másik profil adatai, beállítások és kapcsolatkulcsok nélkül. Verziózott formátum, legfeljebb 1 MB; hibás dátumok, számlálók és ismeretlen szavak elutasítása.
- Visszaállítás előtt dátum és számlálók előnézete. A helyi nullázás külön megerősítést kér, a beállítások megmaradnak.
- Egy lépésnyi visszavonás, újratöltés után is. Az eredmény és a visszavonási pillanatkép egyetlen helyi írással kerül tárolásba; írási hiba esetén a képernyő és az adatok változatlanok.
- Nullázás, visszaállítás és visszavonás szünetelteti a felhőszinkront, újratöltés után is. Későn érkező felhős letöltés nem írhatja felül a módosított eredményt. Külön megerősítés engedi vissza a felhős kapcsolatot; megszakított újracsatlakozás sem alkalmazhat késői választ.
- Másik ablakban megváltozott adatokra régi megerősítés nem alkalmazható. A gyermek főképernyőjére visszalépve későn beolvasott fájl nem nyithat szülői ablakot.
- A nullázás, visszaállítás és visszavonás csak az aktív profil eredményeit módosítja. A szülői összesítő jelzi a kiválasztott profilt.

### Elkészült helyi profilok és felhős eredménymegőrzés

- A Gyerek és Szülői próba profilonként őrzi a számlálókat, szóeredményeket, visszavonást és szinkronszünetet. A beállítások eszközönként közösek. A kiválasztott szerep újratöltés után is megmarad; a projekt alapértelmezése nem kényszeríti vissza a gyerekprofilt.
- A tárolókulcs a szervercím, szerep és profilkód együttese. A régi eredmény az eredeti azonosítójához kerül; másik profil vagy szerver üresen indul, az előző eredmény megmarad. A korábban összekeveredett történeti adatot nem próbáljuk utólag kitalálni.
- Profilváltás egyetlen helyi írás után lép életbe. Betelt tárolónál a korábbi profil marad aktív. A felhőkapcsolat megszakad, az új profilhoz csak külön kérésre indul.
- A felhős összevonás a magasabb próbálkozás- és sikerszámot tartja meg; a sikersorozat a frissebb dátumhoz tartozik. A késői letöltés a válasz beérkezésekor aktuális helyi eredménnyel egyesül. Az ismételt letöltés nem adja hozzá újra ugyanazt az eredményt.
- Soros, összevont feltöltések; a folyamatban levő küldés közben szerzett haladás következő küldést indít. Sikertelen írás után a helyi eredmény megmarad, hálózatvisszatérés vagy kézi kérés újrapróbálja. A kérések 12 másodperc után lejárnak; profilváltás AbortSignallal megszakítja őket. A késői válaszokat a kapcsolati generáció is kizárja.
- A közös kid / admin mintakódokkal automatikus és kézi kapcsolódás sem indul. Ezek nem személyes felhős profilok. A projekt jelenlegi konfigurációjával a helyi játék és a JSON-mentés használható; éles felhős beállítás nem készült.
- Másik ablak mentése után a régi ablak normál játékmentése, profilváltása és kézi újracsatlakozása sem írhatja felül az újabb adatot. Frissítés szükséges; az addigi memóriabeli eredmény fájlba exportálható. Ez egy aktív játékablakra építő védelem, nem atomikus többablakos összevonás.
- Források: progress-profiles.js, cloud-save-queue.js és az app.js kapcsolati folyamatai. A Supabase SDK kérésmegszakításához ellenőrzött [hivatalos API-leírás](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal).

## Következő feladatok, ajánlott sorrendben

A szülői használhatósági és a kompakt telefonos kör elkészült, az önálló fejlesztés a határidőnél lezárult. Fizikai iOS-próba készüléket, éles személyes felhő külön beállítást igényel. Új felhasználói kérés esetén a következő sorrend javasolt.

### 1. Beszéd és hang finomítása valódi iPhone/iPad próbával

A szimulált mikrofon a vezérlést ellenőrzi, nem a gyerekbeszéd felismerését. Fizikai eszközön még szükséges: engedélyezés/elutasítás, készülék lezárása és visszatérés, Safari vagy kezdőképernyős mód, néma kapcsoló/hangerő, Bluetooth, halk gyerekhang és háttérbeszéd. Az új offline csomagot kezdőképernyős indítással és repülőmóddal is ki kell próbálni.

A fenti időzítési és nyelvi hibák már javítva. Készüléken vizsgáld a hangminta, az indítási jelzés és a tényleges felismerő indulásának sorrendjét. A 6,5 / 9 másodperces ablak kiinduló beállítás; valós gyerekbeszéddel még nincs hangolva. Ha a szolgáltatás maga lezárja a munkamenetet az első szó után, azt a kliens továbbra is lezárt próbának veszi; automatikus újraindítás nincs. A bátorító mód csak hangenergiát figyel, küszöbei és az indítóhang kiszűrése fizikai eszközön még ellenőrzendők. A gépi hangról a felhasználó visszajelzését érdemes beépíteni.

**Kész, ha:** ismert a valós eszközön működő folyamat, hibánál könnyű visszatérni a mikrofon nélküli játékhoz. Ne állítsd, hogy valódi iOS-eszközön teszteltük, ha csak WebKit-emuláció futott.

### 2. Személyes felhős profil és pontos többeszközös haladás

A helyi profilok, az elavult letöltés elleni védelem és az el nem küldött változások sora elkészült. A mostani maximumalapú összevonás nem tudja pontosan összeadni két eszköz egyszerre szerzett eredményét, és a szerveroldali utolsó írás miatti versenyhelyzetet sem oldja meg. Azonosítható gyakorlási események, szerveroldali tranzakció és migráció szükséges. A felhő ma csak szóeredményeket tárol; az összes lejátszás/próba/jutalom a helyi mentésben és a JSON-ban van.

A közös mintakódokat a kliens letiltja. Személyes használathoz hitelesítés, gyermekenkénti jogosultságok és Supabase hozzáférési szabályok kellenek. Az egyedi profilkód önmagában nem hitelesítés. Ehhez külön terv és elkülönített tesztadat szükséges; az éles felhős adatokon ne kísérletezz.

**Kész, ha:** két teszteszköz offline gyakorlása egyszer és hiánytalanul összegződik, és másik család eredménye nem olvasható vagy módosítható. Ezt a jelenlegi szimulált kliensellenőrzés még nem igazolja.

### 3. Későbbi tartalom és szülői áttekintés

Valódi napi/összesített haladás, játéktípusonkénti eredmények; több állat és mindennapi két szavas kifejezés; saját családi képek és hangok felvételi felülete. Ezeket az egyszerű gyerekmenü megtartásával érdemes hozzáadni. A CSS később összevonható, a tárolás/hangkezelés külön modulba szervezhető.

## Ellenőrzés és fontos korlátok

~~~bash
npm run build-offline
npm run check
git diff --check
~~~

- A tartalomellenőrzés azonosítókat, témákra hivatkozásokat, a két hangjegyzék egyezését és 151 MP3-fájl meglétét nézi. Öt célzott Node-teszt védi a kétszavas összehasonlítást.
- A teljes npm run check 53 tesztje sikeres: öt szövegegyezési, 16 felismerési esemény-, hét offline, nyolc eredménykezelési, négy képes választójáték-, kilenc profil- és négy feltöltésisor-teszt. Az offline tesztek a hibás letöltést, tartalmi hash-eltérést, bájttartományokat, gyorsítótár-javítást és többablakos frissítést is ellenőrzik.
- A korábbi, 163 fájlos változaton Chrome-ban sikeres a 23 lépéses offline ellenőrzés: hiányzó hang miatti hibás telepítés, újrapróbálás, mind a 163 fájl letöltése, hálózat nélkül újratöltött főmenü, hangdekódolás/lejátszás, mind a 149 MP3 elérése, számolás és meglepetéskör, várakozó frissítés, többablakos védelem, aktiválás és részleges gyorsítótár javítása.
- WebKitben ugyanezek a folyamatok sikeresek a játék kiszolgálói kapcsolatának tényleges megszakítását szimulálva (a tesztkiszolgáló válasz helyett lezárja az alkalmazáskérések kapcsolatát). A Playwright setOffline + reload útvonala belső hibát/időtúllépést adott, ezért a WebKitnél a kiszolgálói hiba és az oldalból indított újratöltés volt az ellenőrzési módszer. Ez nem helyettesíti a fizikai iOS-eszköz repülőmódos próbáját.
- Offline teszteszközök: /tmp/beszed-offline-server.py (külön 5174-es port), /tmp/beszed-offline-qa.js (Chrome), /tmp/beszed-offline-webkit-server-qa.js (WebKit). A tesztek csak a külön tesztböngésző 5174-es eredetű workerét/gyorsítótárát törlik. Képernyőkép: output/playwright/offline-parent.png.
- Chrome és WebKit alatt egyaránt sikeres 25 alapfolyamat: képes menük, témák, játékok, számolási hibajavítás, szülői belépő, beállítások és hangválasztás.
- Chrome és WebKit alatt is sikeres további 15 szimulált mikrofonos/körkezelési ellenőrzés: tiltott mikrofon, saját szó eredménye, háromszavas kör lezárása, leállítás, stream-ek elengedése, két szavas eredmények elkülönítése és meglepetéskör. WebKitben a mockot a MediaDevices.prototype szintjén kell megadni; a példányra tett felülírás nem maradt meg. A működő változat: /tmp/childhome-webkit-speech-checks.js.
- További nyolc ellenőrzés: régi adatok migrációja, új alapértelmezett hang, külön választott saját hang megőrzése, szülői belépő a böngésző vissza gombjával, fekvő telefonos kvíz és késlekedő felhős SDK.
- Chrome-ban és WebKitben is sikeres 30 eredménykezelési ellenőrzés: tényleges letöltött JSON, hibás/nagy fájl, előnézet és megszakítás, nullázás és egyszeri visszavonás, beállításmegőrzés, betelt tároló, késői felhős válasz és fájlolvasás, tartós szinkronszünet, megerősített felhőfolytatás és többablakos ütközés. A két exportfájlt lemezről is ellenőriztük.
- A WebKit adatkezelési próba külön 5175-ös kiszolgálót használt: külső SDK helyett szimulált szolgáltatás, cloud.invalid cím, erre a próbára kikapcsolt offline kliens. Az eredeti útvonalon a CDN-könyvtár felülírta a tesztpéldányt, egy kérés DNS-hibával meghiúsult; a sikeres ellenőrzés a teljesen elkülönített kiszolgálón futott. Ez az adatkezelési próba nem új offline igazolás. Eszközök: /tmp/beszed-data-qa-server.py, /tmp/beszed-progress-qa.js, /tmp/beszed-progress-webkit-qa.js.
- Az eredménykezelő ablakot iPhone méretben Chrome/WebKit képpel is ellenőriztük; fekvő telefonon és mindkét tabletes méretben az ablak és a műveletgomb is elérhető. Képek: output/playwright/restore-preview-webkit.png, progress-tools-chrome.png.
- A felismerési javításokhoz Chrome-ban és WebKitben egyaránt 23 új ellenőrzés sikeres: késői indulás, kijavított részeredmény, 2,6 másodperces szünet két végleges szó között, egymást kizáró alternatívák, leállítás utáni végleges eredmény a tényleges 6,5 s határidőnél, megszakítás, hiányzó API, hálózati és nyelvi hiba, próbák/sikersorozat megőrzése, három másodperc után érkező szintetikus hang, stream-ek lezárása. A korábbi 15 mikrofonos/körkezelési tesztet is újrafuttattuk mindkét motorral, sikeresen.
- A beszédfelismerési kör akkori 169 fájlos csomagjával további kilenc offline ellenőrzés sikeres Chrome/WebKit alatt: újratöltött főmenü, új felismerési modul elérése, szimulált hálózati ASR-hiba utáni képes továbblépés, valódi hangdekódolás és lezárt mikrofon nélküli kör. A játék kiszolgálói kapcsolata végig megszakítva volt. Teszt: /tmp/beszed-speech-offline-qa.js.
- Mindkét hibaképernyő elfér mind a négy célméreten Chrome/WebKit alatt. A fekvő telefonos hibagombot képen is ellenőriztük. Fájlok: /tmp/beszed-speech-session-qa.js, /tmp/beszed-speech-recovery-layout-final.js, output/playwright/speech-recovery-932x430.png.
- Az új hallás utáni játék 28 ellenőrzése Chrome-ban és WebKitben is sikeres. A teszt valódi MP3-dekódolást és AudioBufferSource-lejátszást figyelt, a hallott fájl alapján választott képet. Vizsgáltuk a téves választást, az újrajátszást, az egyszeri jutalmat, a mikrofonhívások hiányát, a családi hangot, a mentett szülői beállítást, a böngésző-visszalépést és a késői hangindítás megszakítását.
- Chrome-ban és WebKitben egyaránt további 30 ellenőrzés sikeres a teljes alkalmazáskiszolgálói kapcsolat megszakításával: az akkori 168 fájlos változat gyorsítótárazva, az új játék és mindkét új hang betöltődik, a teljes képes játék és újratöltés működik. A tesztek indulás előtt helyben szüneteltetik a felhőszinkront. A kézi segítséggomb kikapcsolt automatikus segítség mellett is elmondja az utasítást; ennek megszakítását külön, friss változaton ellenőriztük Chrome/WebKit alatt.
- Az új képes menüvel együtt 11 gyereknézetet ellenőriztünk mind a négy célméreten: nincs vízszintes vagy függőleges túllógás. A háromválasztásos játékot külön is megmértük és képen átnéztük; a telefonos kártyák 192 × 155 px méretűek, fekvő helyzetben egy sorba rendeződnek.
- A képes játék tesztje: /tmp/beszed-listening-qa.js; az aktuális offline csomaghoz /tmp/beszed-listening-offline-qa.js. Elrendezés: /tmp/childhome-layout-listening.js. Képek: output/playwright/listening-three-430x932.png, listening-three-932x430.png, picture-menu-iphone.png.
- Aktuális elrendezési ellenőrzés: **12 játéknézet × 6 méret × 2 böngészőmotor**, mind sikeres. Méretek: 430 × 932, 932 × 430, 834 × 1194, 1194 × 834, 430 × 740 és 932 × 350. A számjáték választómenüje is bekerült a vizsgált nézetek közé. Nincs vízszintes vagy függőleges túllógás az ellenőrzött alapállapotokban. A szülői beállítások szándékosan görgethetők.
- Képernyőképek: output/playwright (helyi, gitből kizárt anyagok). A legutóbbi főmenü: home-iphone-final.png. Ideiglenes CLI-ellenőrzések: /tmp/childhome-checks.js, /tmp/childhome-speech-checks.js, /tmp/childhome-layout.js, /tmp/childhome-last-checks.js.
- A böngészős tesztek felhős válaszokat szimulálnak vagy a kéréseket blokkolják; a WebKit adatkezelési kivételt és elkülönítést fent dokumentáltuk. A teszt nem igazolja az éles felhős szinkront; a felhasználó normál böngészőjének tárolóját nem módosítottuk.
- Az új profilkezelés 23 böngészős ellenőrzése Chrome-ban és WebKitben is sikeres: régi mentés migrációja, magasabb helyi eredmény megőrzése, ismételt összevonás, küldés közbeni gyakorlás, késői letöltés/feltöltés, profilváltás, visszavonás, újratöltés, betelt helyi tároló, sikertelen feltöltés és hálózatvisszatérés. Az aktív szülői profil két letöltött exportját lemezről is ellenőriztük; másik profil és kulcs nem került bele.
- A korábbi 30 eredménykezelési böngészőtesztet az új profiltárolással mindkét motoron újrafuttattuk, sikeresen. Külön Chrome-próba igazolja: másik ablak mentése után a még nem szüneteltetett régi kapcsolat kézi indítása sem ír helyi adatot vagy kér felhős profilt.
- A profilkezelési kör **171 fájlos, 2da09dd84e8727b3** offline csomagjával mindkét motoron 16 ellenőrzés sikeres. A kiszolgáló kapcsolatának megszakítása után újratöltés, profilváltás, JSON-visszaállítás és visszavonás, valódi hangdekódolás és teljes képes kör működött. A változatlan projektkonfiguráció közös mintakódját automatikus és kézi indítás is elutasította a szimulált SDK meghívása előtt.
- A profiltesztek eszközei: /tmp/beszed-cloud-profiles-qa.js (5175, fiktív cloud.invalid és szimulált SDK), /tmp/beszed-profiles-offline-qa.js (5174, változatlan alkalmazásfájlok, kizárólag ellenőrzéshez rögzített SDK-helyettesítő). A tesztsegédek első futásának kétértelmű szelektorait és ismételt init-scriptjét javítottuk; a fent felsorolt sikeres eredmények a javított futásokból származnak.
- A szülői próba és átadás 25 böngészőtesztje Chrome-ban és WebKitben is sikeres. Külön ellenőriztük a profiljelzést, újratöltést, visszalépést, elkülönült próbát, tárolási hibát, újrapróbálást és másik ablak adatainak védelmét. A szülői profil- és indítógombok a négy fő célméretben az első nézetben elérhetők.
- A kompakt nézetben további teljes játékteszt sikeres mindkét motoron: tíz tárgy végigszámolása, tíz tárgyat tartalmazó kvízválasz, háromképes kör, mindkét mikrofonos hibaképernyő, meglepetéskör és újrakezdés, szülői próba és visszatérés. A vizsgált gombok legalább 44 × 44 px méretűek és teljesen a nézetben vannak; a kör végi ablaknak nincs belső görgetése.
- Az utolsó böngészős ellenőrzés fájljegyzéke: **171 fájl, f825c1414274bb45**. A szülői átadás utáni, kompakt CSS előtti változaton 19 offline teszt sikeres volt mindkét motoron. A végleges csomaggal további **13 frissítési és offline ellenőrzés sikeres Chrome-ban és WebKitben**: várakozó csomag, szülői aktiválás, korábbi gyorsítótár leváltása, mindkét profil változatlan megőrzése, 171 fájl és 151 MP3, kiszolgáló nélküli újratöltés, kompakt CSS, szülői átadás, tízig számolás valódi hanglejátszással és meglepetéskör jól elérhető befejező gombokkal.
- Új tesztsegédek: /tmp/beszed-parent-handoff-qa.js, /tmp/beszed-compact-layout-qa.js, /tmp/beszed-compact-play-qa.js, /tmp/beszed-parent-offline-qa.js és /tmp/beszed-final-update-qa.js. A képernyőképeken ellenőrzött új elrendezések: output/playwright/parent-settings-chrome-430x932.png, parent-trial-webkit-1194x834.png, count-ten-compact-webkit.png, quiz-ten-compact-webkit.png, round-complete-compact-webkit.png. A tesztkiszolgálók továbbra is elkülönített 5174/5175 portot és szimulált felhőt használnak.
- A WebKit-emuláció nem fizikai iPhone/iPad. A mikrofonos teszt szintetikus jelet használ; magyar gyerekhanggal még nincs hitelesített eredmény.

## Hasznos fájlok és folytatási tudnivalók

- index.html, child-ui.css: gyerekfelület és szülői beállítások. Az eredeti styles.css alapstílusait a child-ui.css egészíti ki.
- app.js: navigáció, játékkörök, hang és mikrofon életciklusa, eredmények.
- progress-data.js, progress-tools.js, tests/progress-data.test.mjs: ellenőrzött helyi eredménymentés és szülői műveletek.
- progress-profiles.js, cloud-save-queue.js és a hozzájuk tartozó tests/*.test.mjs: profilok, összevonás és a feltöltések sora.
- listening-game.js, tests/listening-game.test.mjs: hallás utáni képes választás és körösszeállítás.
- speech-recognition.js, tests/speech-recognition.test.mjs: felismerési események, nyelvválasztás, határidők és megszakítás.
- game-data.js, speech-matching.js: tartalom és szövegegyezés.
- scripts/build-voice-manifest.mjs, scripts/generate-voice.py: hanggenerálás, npm run generate-voice. Csak a generált könyvtárba írnak; a régi saját felvételekhez nem nyúlnak.
- tests/speech-matching.test.mjs, scripts/check-content.mjs: célzott ellenőrzések.
- offline-client.js, service-worker-runtime.js, scripts/build-offline.mjs, tests/offline-worker.test.mjs: offline felület, gyorsítótár, verziózás és ellenőrzések. app.webmanifest és icons/: kezdőképernyős megjelenés.

A szeptember 8-i lezáráskor a változtatások még nem voltak commitolva. Szeptember 14-én a felhasználó kérte a teljes fejlesztési kör commitolását és GitHubra küldését. Az éles webes közzététel és a fizikai iPhone/iPad próba külön későbbi feladat.

A commit előkészítésekor a game-data.js végéről egy felesleges üres sort eltávolítottunk. A működés változatlan; az újragenerált offline csomag **171 fájl, 86516897a38d9018**. A teljes npm run check 53 tesztje és a commitra előkészített fájlok whitespace-ellenőrzése ismét sikeres.
