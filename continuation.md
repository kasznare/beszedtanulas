## 2026. október 13. – Hangeffektek az alkalmazás műveleteihez

A felhasználó külön pontosította: a meglévő beszédhangok jók, a kattintás, megfogás, lerakás és siker hangeffektjeit kéri minden játékhoz. „Mehet tedd bele” engedéllyel folytattuk a montessori-release managed munkafában, codex/interaction-sounds ágon. A közös checkout érintetlen. A közben megjelent b186e34 főági Montessori-bővítés integrálva; mind az öt játék, 26 szint, profilonként mentett tábla és új Jessa-klip megmaradt.

Új interaction-audio.js: rövid Web Audio tónusok és szűrt zajok, közös effektkimenet, legfeljebb négy aktív hang, 45 ms ismétlésvédelem. Kattintás/kijelölés, megfogás, fakoppanás/átesés/csúszás/forgatás, golyó, papír, illesztés, sakk lépés/ütés, ruha, kínálás, gyűjtés, lépés, gép, visszavonás, újrapróbálás és siker. A játékok saját eseményei indítják; a mozdulathang helyettesíti az általános kattintást. A rács és mintamemória külön lerakás-, ellenőrzés- és mintafordítás-hangot is kap. A folyamatos vízöntési hang ugyanarra a hangerőszabályozható buszra kapcsolódik.

A szülői beállításban Hangeffektek a mozdulatokhoz kapcsoló, 60%-os alap hangerő és Effektek kipróbálása gomb. A csúszka 44 px magas érintési felület; telefonon és tableten ellenőrizve. A beállítás a hangos segítségtől független és újratöltés után megmarad. Felolvasás közben halkulás, mikrofonos felvétel/gyűjtés alatt némítás, kilépés/oldalelrejtés után aktív és késleltetett hangok megszüntetése. A halk mikrofonindítási jel megmaradt. Beszéd-/mese-/családi hangfájl nem változott; nincs új hanggenerálási API-kérés vagy kredithasználat.

Ellenőrzés: teljes npm build, 269 JavaScript- és 17 Python-teszt sikeres, ebből kilenc új hangeffekt-modulteszt. Chrome és WebKit motoronként 40 valódi Web Audio böngészős próba: első kattintás, duplázás nélküli megfogás/lerakás, animáció és megszakítás, forgatás/billentyűzet, rács- és mintamemória, sakk lépés/ütés/visszavonás, puzzle, kártya, műhely, bolt, számolás, macietetés/öltözés, szintetikus bemenettel végzett mikrofonos felvétel és némítás, hangerő/némítás tartós mentése, előnézet, háttérbe váltás és offline újratöltés. További két-két elrendezési próba 390/1194 px méreten, képek: output/playwright/effects-controls-*. A WebKit motorpróba nem fizikai iPhone-teszt. Végleges offline csomag: 679 alapfájl, bd46e1eaa11f6a07; a statikus kiadás 733 runtime fájl. Közzététel a már engedélyezett main → GitHub Pages folyamattal.

## 2026. október 13. – Formadoboz: egy közös felület, szín és alak, megmaradó akadályok

## 2026. október 13. – Montessori: 26 szint, szabadon tologatható bábuk és két összetettebb játék

A felhasználó több szintet, helyükön maradó tologatható bábukat és nehezebb Montessori játékokat kért. Az előző élesítésre adott commit/push engedéllyel folytattuk. Új managed munkafa: montessori-challenges, ág codex/montessori-challenges, alap cfe8695. A montessori-release munkafát közben másik chat használta interakciós hangokhoz; annak változtatásait érintetlenül hagytuk. Az origin/main a kiadás előtti fetch szerint nem változott.

Öt játék, összesen 26 szint: Formadoboz 8 (méret, forgatás, ismétlődő alak/szín, 6/8 elemes deszkák és több akadály), Színtálcák 5 (világos/sötét árnyalat és pontos darabszám, maradék golyókkal), torony 5 (3–7 korong), új Rendezőrács 4 (sor alakja/mérete + oszlop színe), új Mintaemlék 4 (4/5/6/8 elem, elrejthető, időkorlát nélküli minta). A minták telefonon számozott sorokra törnek. A rács és a mintasor hibás kirakást is elfogad; a gyerek áthelyezhet és felcserélhet lerakott elemeket, majd külön ellenőrizhet. A minta újranézése megőrzi a kirakást.

A formák a deszkán szabadon eltolhatók; rossz lyukra ejtéskor is megőrzik az elengedés helyét. A forgatásgombok és billentyűzetnyilak a kijelölt bábun hatnak. A bábu alatt lévő lyukba is lehet ejteni forgatás után: a húzott eredeti elem nem fogja el a cél hit-tesztjét. Húzás közben a képernyő szélén automatikus görgetés segít; elengedéskor/megszakításkor leáll. Az akadályok megmaradnak a deszkán és visszatolhatók; az összetett deszkákon függőlegesen parkolnak a lyukak fölötti területen.

Új montessori-art.js és montessori-session.js. Magból újragenerált feladat + ellenőrzött mozdulatok mentése helyben, profilonként és szintenként, beszedtanulas.montessori.v2 kulcsokon. Kilépés, szintváltás és újratöltés megőrzi a pozíciót, elfordítást, akadályt és kirakást. Az Új játék új magot ad. Visszavonás az adott belépés utolsó 40 lépéséig. A már jutalmazott kör újratöltése/visszavonása/újraellenőrzése nem jutalmaz újra. Az új útmutatók a rögzített Jessa/Eleven v4 rendszerben: 11 új klip és friss műhelymenü, összesen 1064 karakter. A privát, már megfizetett cache-ből helyreálltak; quotaDelta=0, visszaállító kreditet nem váltottunk be.

Ellenőrzés: teljes npm build, 260 JavaScript- és 17 Python-teszt sikeres, 732 runtime fájl. Alap Montessori böngészős próba: 97 Chromium / 98 WebKit. Új teljes 26 szintes próba: 92 Chromium / 92 WebKit; teljes hibás rács/minta javítása, csere, profil/szint szerinti folytatás, újratöltés, képernyőméretek és új játékok/hangok offline működése. További 4/4 húzási regresszió: lyukra parkolt bábu forgatás utáni bedobása és képernyőszéli görgetés/leállás. Natív Chromium érintés: 22 ellenőrzés, szabad parkolással és helyzetmegőrzéssel. Képek: output/playwright/challenges-*. Közzététel a meglévő main → GitHub Pages folyamattal.


A felhasználó pontosította a mintát: a formák már a játék felületén feküdtek; a félretolt akadály ugyanott megmaradt; a különböző színű formákat a velük egyező színű keretű, megfelelő alakú lyukakba kellett tenni. A montessori-release munkafát és codex/montessori-games ágat folytattuk az éles b0e7c5e változatról.

A formadoboz külön tálcája megszűnt. A formák és a színes keretű lyukak közös fa felületen vannak, stabil, egymástól elkülönülő helyeken. A szín és az alak egyaránt kötelező: a 2. szinten a megfelelő forma mellett ugyanaz az alak más színnel és ugyanaz a szín más alakkal is megjelenik; a 3–4. szinten ezek saját lyukat kapnak. Az első szint továbbra is egy forma/egy lyuk. A tárgyak szemléltető színe a doboz ablakában és a húzási/átesési animációban is megmarad.

A két akadály teljes méretben és teljes fedettséggel a deszkán marad félretolás után, telefonon is. Ugyanazon vízszintes útvonalon vissza is húzható a lyuk elé; koppintás/Enter is váltja a két helyzetet. A kis mozdulat az eredeti állapotba tér vissza. Mindkét irány visszavonható, a lefedett lyuk továbbra sem fogad formát. Az akadály mozgatása nem ad új jutalmat. A színtálcák, torony, játékidő és többi játék megmaradt.

Négy módosított Jessa-útmutató azonos voice-config.json beállítással, 440 új bemeneti karakter, bizonylat szerint 177 normál használati kredit. Az összes többi kész hangot újrahasználtuk, reset vagy vásárlás nélkül. A narráció a deszkán fekvő formákhoz és az új szín/alak útmutatókhoz igazodik.

Ellenőrzés: teljes build, 251 JavaScript- és 17 Python-teszt sikeres; a kibővített teljes böngészős próba 97 Chromium / 98 WebKit ellenőrzése sikeres. Külön ellenőrzi a közös fa felületet, az egyező alak/eltérő szín és egyező szín/eltérő alak elutasítását, a tényleges keretszíneket, az akadály oda-vissza húzását és teljes láthatóságát 320/390/932 szélességben. További 20 natív érintéses, megszakítási, hang- és játékidő-próba sikeres. A közös button:active szabály centerező/akadály-transzformációját felülíró ütközést javítottuk, így lenyomáskor sem ugranak el a felületi tárgyak. Offline lenyomat: 5c15b53e9c03fa36; 665 alapfájl, 53 opcionális mesehang; dist: 719 fájl. Képek: output/playwright/montessori-shapes-*. Közzététel a meglévő main → GitHub Pages folyamattal.

## 2026. október 13. – Montessori játékok az aktuális éles ágon

A felhasználó az elkészült Montessori játékok commitját, pushát és éles kipróbálását kérte. A közös checkout az induláskor 31 committal volt az origin/main mögött; a korábbi, külön Csomagösvény-módosítások és a helyi content/ fájlok ott megmaradtak. A kiadáshoz a 271e872 alapból külön managed munkafa készült (montessori-release), codex/montessori-games ágon. A jelenlegi Mesetár, sakk, Jessa hangok és játékidő-kezelés megőrzésével illesztettük be a Montessori fejlesztést.

Új bejárat: Kirakók és ügyesség → Montessori műhely. Formadoboz négy szinten (egy forma/egy lyuk; választás három formából; három forma/három lyuk; négy forma/négy lyuk/két csúszó akadály), Színtálcák három szinten (két/három/négy szín, színenként két golyó), Toronyépítés három szinten (három/négy/öt korong, nagytól kicsiig). Egér- és érintéses húzás, két koppintás, billentyűzet, visszavonás és önállóan választott továbblépés. A forma a lyuk körvonalán átesve a doboz ablakába kerül. Téves választásnál az elem a tálcán marad. Ugyanaz a befejezett kör visszavonás/újbóli befejezés után sem ad új jutalmat. A nehézségek az eszköz beállításaiban mentődnek; új belépés új kör. Az új képernyő elindítja a közös 30 perces időkeretet, és része a szüneteltetésnek. A visszajelzés a jelenlegi statikus, nyugodt jelzésekhez igazodik.

15 új rövid Jessa-felvétel és a frissített ügyességmenü-hang a változatlan voice-config.json beállításaival készült. A régi 16 Noémi-felvétel nem került a kiadásba. A szolgáltatói új bemenet 1167 karakter, a sikeres bizonylatok összesen 469 normál használati kreditet jeleznek; sikeres kérések, MP3-ak és hiteles szóidők a meglévő generálóval, a fizetett cache a repón kívül. Nem történt reset, vásárlás vagy előfizetés-változtatás. A többi kész felvételt nem generáltuk újra.

Modulok: montessori-data.js, montessori-game.js, montessori.css. Szabályteszt: tests/montessori.test.mjs (hat teszt); teljes böngészős próba: tests/browser/montessori.js; natív érintéses húzás, elrejtés/folytatás és kézi hangsegítség: tests/browser/montessori-touch.js. A korábbi helyi változaton 161 Node-teszt, 79 Chromium + 80 WebKit teljes ellenőrzés és 18 további érintéses/layout ellenőrzés sikeres. A friss éles alappal egyesített változat teljes buildje sikeres: 248 JavaScript- és 17 Python-teszt, 79 Chromium + 80 WebKit teljes játékellenőrzés és 20 további natív érintéses/layout/időkeret-ellenőrzés. A Montessori képernyő elindítja a közös időkeretet, annak lejárta a pihenőképernyőre lép és leállítja a játékot. Offline lenyomat: 68181994ea466b94, 665 alapfájl és 53 opcionális mesehang; statikus dist: 719 fájl. Közzététel a meglévő main → GitHub Pages folyamattal.

## 2026. október 12. – Két fiatal férfi főhősű székely mese

Az `eee6c04` legfrissebb main fast-forward integrálva, a közös piszkos checkout és Radó-munkafa továbbra is érintetlen. A felhasználó pontosítása szerint a három korábbi székely helykitöltőt két teljes történet váltja: A csillagszemű juhász (Benedek Elek, MEK 04865 #100, közkincs), Seprűkötő Jakab (1937-es Székely népmesék, MEK 21111 #8, CC BY-SA 4.0). 77 aktív katalógustétel: 53 kész MP3, 24 hangra váró teljes Radó-szöveg. A korábbi Kriza-kutatás és privát teljes források megőrizve; nincs aktív Kriza-helykitöltő, a Három hazug mese nincs az új csomagban. A kutatóscript nem módosítja többé az aktív választékot.

Jessa eleven_v4, eredeti teljes szöveg és az aktuális kiejtési szabályok: juhász 6961 szolgáltatói karakter, két rész, 508,034 mp, 84 mondatfelirat, 25 jelenet, **766 kredit**; Jakab 11 428 karakter, három rész, 842,460 mp, 162 mondatfelirat, 34 jelenet, **1256 kredit**. Az eredeti két négysoros versbetét megmarad. Mind az öt fizetett válasz, szó/karakteridő, rész-MP3, forráshash és bizonylat tartós privát cache-ben. Összes új fogyasztás e körben **2022 kredit**, friss accountkeret **5052** (34948/40000). Korábbi három klasszikussal e chat felvételösszege **4003 kredit**. Nincs reset, vásárlás vagy előfizetés-módosítás.

Szövegforrások: a meglévő privát eredeti HTML-ekből saját címhorgony-kivonat, csak formázás rendezése. Jegyzetek, script és kötetvégi glosszárium nélkül. Életkort nem találunk ki. Forrás/kiadó/licenc/változásjelzés látható; Jakab szövege, hangja és új illusztrációja CC BY-SA 4.0, a hang ID3-ja is megőrzi a licencadatot. A mondatfeliratok a végleges szóhatárokból készülnek, az eredeti olvasószöveg bekezdései változatlanok. A jelenetek az eredeti bekezdés kezdő mondatfeliratának idejéhez kötődnek; minden animáció kizárólag a hang idejének függvénye. A hosszú MP3-ak opcionálisak, az első hallgatás megőrzi őket offline. Mind az 51 korábbi felvétel rekordja, hanghash-e, feliratidői és bizonylatai változatlanok.

Ellenőrzés: `npm run build`, **232 Node-teszt**, 5 meglévő hanggenerálási, 7 Radó- és **5 saját generálásbiztonsági Python-próba**. Chromium és WebKit motoronként **75 böngészőpróba**, új teljes szövegek/licenc, valós Jessa-MP3, szóhoz/mondathoz igazított jelenet, automatikus offline mentés, offline újratöltés/lejátszás/keresés, privát import, 320/375/834 px és billentyűzet. Az új 59 jelenet **118 mozgó/álló állapotát** a tényleges rendererrel ellenőriztük és képes áttekintésben átnéztük. Mind az 51 régi rekord, MP3-hash és felirat változatlansága, a két új MP3 és mind az öt rész teljes dekódolása, Jakab hangjának ID3-attribúciója és licence ellenőrizve. A teljes hanganyag hallásalapú kiejtésellenőrzése és fizikai iPhone/Safari-próba továbbra sincs elvégezve.

## 2026. október 12. – A közös Mesetár-kereső végső integrálása

A Radó-chat ellenőrzött `2e5354d` főági változata a saját managed munkafába fast-forward integrálva; a Radó-munkafa és a közös checkout továbbra is érintetlen. 78 nyilvános katalógustétel: 51 kész MP3, 24 Radó-hangra váró teljes szöveg, 3 Kriza-forrásellenőrzésre váró cím. A kereső mind az 50 Radó-címet és az azonos című külön változatokat megtalálja, valamint helyben a privát műveket is. A fő kereső az első mező a kártyák előtt; a kiegészítő Radó-olvasó is ezt a szűrést követi, olvasási kiválasztásának változtatása nélkül. A függő felvételeknél „Hangra vár” gomb és a generált tervből vett pontos teljes áras karakterbecslés látszik. A `build-offline` a nyilvános katalógushoz tartozó tervekből építi a `story-audio-requirements.js` metaadatot; privát import nincs benne, címlista nincs kézzel beírva.

Végső ellenőrzés: 226 Node-teszt és a Python-biztonsági ellenőrzések, Chrome/WebKit motoronként **59** közös keresős böngészőpróba. Mind az 50 Radó-tétel ékezet nélküli szerzőre, minden új klasszikus a saját címére/szerzőjére/aliasára kereshető; szűrés nem állítja le a hangot, másik találat megállítja; nincs-találat esetén a külön gyűjtemény sem hagy idegen kártyákat. Teljes pending szöveg, precíz keretbecslés, offline mind az 50 Radó-cím, privát szerző, tényleges offline MP3 és mobil/billentyűzet ellenőrizve. Az integrálás és a metaadatjavítás új API-kérést nem indított: e chat továbbra is **1 981 új kreditet** fogyasztott a három klasszikus hangjára. Az accountdelta a párhuzamos munkák miatt nem saját költségadat.

A Domokos Mariann-kutatás 100. és 466. oldala kézirati jelzetet és kiadástörténetet közöl, a kért Kriza-szövegek teljes átírását nem. A kutatási PDF a magán `kriza-source-review/` cache-ben megőrizve. A három Kriza-tétel továbbra is `rights-pending`, nem tekintjük elkészültnek.

## 2026. október 12. – Mesetár-kereső és három teljes klasszikus

Saját managed munkafa: `mesetar-three-and-search`, friss `f3bf89a` origin/main alapján. A közös checkout és a Radó-munkafa nem módosult. Gyöngyvirág Palkó teljes szövege a MEK-kötet HTML 02 #32 részéből származik; A fülemile (A fülemüle keresési alias) 160 sora / 10 blokkja és Arany Lacinak 72 sora / 2 versszaka változatlan. Jessa, eleven_v4, hu: 904,193 + 317,120 + 113,360 másodperc, 29 + 21 + 22 SVG-jelenet. A felirat- és jelenetidők a végleges karakteridőkből készültek. Szóhely-azonos leképezés az IPA-input és az eredeti írás között. Teljes áras karakterbecslés: 18 015; valódi bizonylatok: **1 981 kredit** (1396 + 428 + 157). A párhuzamos accountdelta eltérhet ettől, ezért nem használjuk a saját költség bizonyítékának. Resetkredit, vásárlás, előfizetés-módosítás nem történt.

A felhasználó később három Kriza-címet is kért: A fortélyos leány, Az egyszeri asszony meg az ördög, Három hazug mese. Az 1961-es MEK-forrás Kovács Ágnes stiláris átdolgozása; a teljes források és mindhárom hazug rész a `~/.config/beszedtanulas/kriza-source-review/` magán cache-ben megmaradnak. A katalógusban a három tétel **rights-pending**, a nyilvános modul csak cím/metaadat és állapot, sem átdolgozott szöveg, sem hang nincs publikálva. Nyitott feladat: az eredeti közkincs lejegyzés beszerzése vagy a konkrét változat publikálási engedélyének ellenőrzése. MTA-kéziratnyom: A fortélyos leány Irod. 4-r. 412, 46–51 és 58–59 (Domokos Mariann forráskutatása). A régi 1882/1900/1937 kötetek nem azonosak a kért három teljes változattal; nem történt helyettesítés. Kriza teljes áras bemeneti leltára 25 033 karakter, hangköltség **0 kredit**.

A magyar kereső cím/szerző/gyűjtemény/leírás/alias alapján, ékezet és betűméret nélkül, helyben szűr. A keresés csak kártyákat rejt, megőrzi a kiválasztást és a futó hangot. Törlés és Escape, nincs-találat állapot, 44 px kezelők. Privát szerzőmetaadat opcionálisan importálható; WebKitben ArrayBuffer kerül IndexedDB-be, régi Blob-hang továbbra is olvasható. A hash nélküli várakozó tétel könyvjelzőbetöltési kivételét javítottuk.

Ellenőrzés: teljes build; Chrome és WebKit motoronként **52** új böngészős próba: valódi cím/szerző/alias, lejátszás megőrzése és másik találat miatti megállás, teljes szöveg, valós MP3, szóhoz igazított SVG, külön ellenőrzött offline letöltés, IndexedDB privát mű, offline újratöltés/lejátszás/keresés, 320/375/834 px, billentyűzet és privát tartalom hálózati kiszivárgásának hiánya. 22 eredeti mű teljes rekordegyezése és régi időleképezések változatlansága ellenőrizve; három új MP3 és fizetett részek teljes ffmpeg-dekódolása sikeres. Az új MP3-ak opcionálisak, nem az alap játékcsomag részei. A WebKit automatizált motorpróba, nem fizikai Safari-készülékpróba. Közzététel a meglévő GitHub Pages main-folyamatával, friss remote integrálásával.

# Beszédtanulás – folytatási terv

## 2026. október 11. – Sakkfeladat utáni továbblépés a sikerablakból

A felhasználó jelezte, hogy a sikerablak ismétlésgombja a megoldott sakkfeladványt újrapróbáltatja. Feladat módban most a fő gomb **Következő feladat** felirattal és előrenyíllal jelenik meg, megkapja a billentyűzetes fókuszt, és a megoldott állás után a következő feladványt nyitja. A választott nehézség megmarad, a szint utolsó feladata után az első következik. A következő tábla és a hozzá tartozó magyar utasítás frissen indul, további jutalom vagy beszédpróba nélkül. A Csillagok és más játékok sikerablaka továbbra is új kört indít; a közös ablak minden megnyitáskor visszaállítja a megfelelő ikont, feliratot és elrendezést.

A sakkmodul védett `canAdvance` / `nextPuzzle` műveletet ad az alkalmazásnak; csak aktív, megoldott feladványból léptet. A táblán lévő következő/előző gombok ugyanazt a váltást használják. A feliratos gomb álló nézetben külön széles sorban, alacsony fekvő telefonon a többi gomb mellett látszik. A meglévő sakkböngésző-fixture-ök elvárásai az új továbblépéshez igazítva.

Ellenőrzés: teljes build, **199 sikeres Node-teszt**; Chrome és WebKit motoronként **37 célzott böngészős ellenőrzés**. Mindhárom nehézség első/utolsó feladata, billentyűzet, egyszeri jutalom, megmaradt nehézség, Csillagok ismétlése, másik játék közös sikerablakának helyreállítása, 6 képernyőméret, tényleges offline továbblépés és a következő magyar hang indulása, változatlan visszaút igazolva. Az első próbában a 932×350 nézet belső görgetést okozott; a végleges kompakt gombsorral mindkét motorban javítva. Telefonos és fekvő képek átnézve. A WebKit emuláció, nem fizikai készülékpróba.

Kiindulás `6502971`, a chat meglévő `sakkliget` managed munkafája; a közös checkout más munkájához nem nyúltunk. Új hang, alügynök és usage-reset kredit nem volt. Forrás: `app.js`, `chess-game.js`, `child-ui.css`; célzott próba: `tests/browser/chess-next.js`. Offline lenyomat: `1b19f367d4426678`, 600 kötelező + 12 opcionális hang, 613 futtatási fájl. Közzététel a meglévő GitHub Pages main-folyamatával.

## 2026. október 11. – Tizenkét több lépéses sakkfeladat

A felhasználó bonyolultabb sakkfeladatokat kért. A Sakkliget Feladatok módja három nehézséget ad: **Kezdő** (a meglévő 10 egylépéses helyzet), **Gondolkodós** (6 új helyzet, 2–3 lépés), **Kihívás** (6 új helyzet, 2–4 lépés). Bástya- és futókerülő, két huszárugrás, több figura leütése, biztonságos királyút, gyalogütések, a bástyának/futónak utat nyitó segítő figura, kötött bástya, huszárhármas, gyalogátváltozás utáni vezérütés és közös bástya–király feladat. A sötét figurák továbbra sem lépnek; csak a feladatban megnevezett világos figurák mozgathatók. Teljes sakkparti nem került be.

A megoldás célfeltételből ellenőrzött, több szabályos út is elfogadott. Stabil figuraazonosító követi a fő figurát és a gyalogból lett vezért; minden megjelölt ütést és a megfelelő figura végső célmezőjét ellenőrizzük. A lépésszámláló csak elfogadott lépést számít. Elfogyott keretnél a tábla megmarad, visszavonható vagy újrakezdhető; a visszavonás az ütéseket, átváltozást és lépéskeretet is helyreállítja. A segítség a szabályos mezők mellett egy rövid feladatötletet és a mozgatható figurákat jelöli. Nehézségválasztás a közös eszközbeállításban megmarad, régi mentés Kezdő szintre migrál. A teljes feladat egyszer jutalmazza az aktív profilt; részmegoldás és elfogyott keret nem. Szintváltás is törli a függő, egy másodperces sikerablakot.

13 új, statikus magyar Noémi-MP3 hiteles hash-sel és szóidőkkel: 12 feladat és a lépéskeret utáni útmutató. A hanggenerálás egy átmeneti szolgáltatáshiba után a meglévő részfelvételekből folytatódott, minden új hang elkészült. Kiindulás az aktuális `ebbf825` főág, a chat meglévő managed `sakkliget` munkafájában (`codex/sakkliget`). A közös checkout más chatek félkész munkájához nem nyúltunk; alügynök és usage-reset kredit nem volt.

Ellenőrzés: teljes build és **199 sikeres Node-teszt**. A sakkmodell minden új állás szélességi bejárásával igazolja a megoldhatóságot és azt, hogy a feladatok nem oldhatók meg kevesebb lépésből. Alternatív kerülők, rögzített akadály, kötelező ütések, a fő figura azonossága és átváltozás is védett. Chrome és WebKit motoronként **120 új böngészős ellenőrzés**: mind a 12 feladat, illegális lépés/veszély/kötés, lépéskeret, segítő figura, ütés- és átváltozás-visszavonás, egyszeri jutalom, újratöltött nehézség, szintváltás alatti sikertörlés, 6 telefon/tablet/fekvő méret, tényleges új narrációindulás offline, minden új MP3 cache-e és teljes offline feladat. A meglévő sakkregresszió további **91 ellenőrzése motoronként** sikeres: hat csillagkör, tíz kezdő helyzet, billentyűzet, gyalogátváltozás, újrajátszás, reszponzivitás és offline működés. Összesen **211 böngészős ellenőrzés motoronként**. Telefonos/tabletes képernyőképek átnézve. A WebKit emuláció; fizikai iPhone/iPad próba nem történt.

Forrás: `chess-data.js`, `chess-game.js`, `chess.css`; tesztek: `tests/chess.test.mjs`, `tests/browser/chess-complex.js`. Offline csomag: **600 kötelező + 12 opcionális hang**, **613 futtatási fájl**, 472 rövid gépi magyar hang, lenyomat `03666d9d6a1c53be`. A közzététel a meglévő GitHub Pages main-folyamatával történik.

## 2026. október 11. – A tizenkét SVG-mese közzététele

A felhasználó kifejezetten kérte a feltöltést. Az animációk két commitját (`02a64d0`, `8f56306`) összevezettük az aktuális `c842137` főággal: megmaradtak a nyugodt zöld jelzések és a fejléc Frissítés gombja. A dokumentáció két változata együtt megmaradt; az offline csomag az összevezetett forrásból újraépült. Kiadás: 12 teljes animált mese, 398 jelenet; 587 kötelező és 12 opcionális hangfájl, 600 futtatási fájl, lenyomat `8a9ad269aa0d5b1a`. Teljes build és 195 Node-teszt sikeres; Chrome/WebKit motoronként 21 Mesetár-integrációs ellenőrzés minden mese választásával és keresésével. Közzététel az `origin/main` ágon, a meglévő GitHub Pages folyamattal. A közös checkout más chatek munkájával érintetlen maradt.

## 2026. október 10. – Frissítés a felső sorban, egyszerűbb főképernyő

A felhasználó kérésére a meglévő Frissítés link a főképernyő fejlécébe került, a hangos segítség mellé. Keskeny, legfeljebb 600 px széles nézetben 44 × 44 px ikonként látszik, hozzáférhető neve és tooltipje Frissítés; nagyobb képernyőn a felirat is látható. Más képernyőkön továbbra sem jelenik meg. A „Mivel játsszunk?” sor és díszei, valamint az elavult stílusai és narrációs célja megszűntek. A Válassz hangrész továbbra is a játékkártyákat jelöli. A kézi frissítés meglévő működése megmaradt.

Kiindulás `7fde870`, külön managed `home-header-refresh` munkafa, ág `codex/home-header-refresh`. A közös checkout más chatek munkája érintetlen. Ellenőrzés: teljes build, 189 sikeres Node-teszt, 585 futtatási fájl. Chrome és WebKit motoronként 30 ellenőrzés hét képernyőméretben (320–1440 px): egy sorban lévő fejléc, legalább 44 px frissítésgomb, átfedés és vízszintes túlcsordulás nélkül, felirat törlése, menü/játék/szülői oldal elrejtése, hazatérés, offline hibaüzenet és online frissítőlink. A böngészőpróba saját, service worker nélküli kontextust használ; az online útvonal egy rövid fixture-rel igazolt, a közzétett teljes frissítést külön az éles oldalon ellenőrizzük. Böngészőszkript-hiba nincs. Offline lenyomat: `608e5c9b04cd4b83`. Közzététel a meglévő GitHub Pages main-folyamatával.

## 2026. október 10. – A megmaradt kiválasztási és segítségkeretek javítása

A felhasználó a narancssárga kereteket továbbra is látta. Az éles `3277381` kiadásban reprodukáltuk az R-mondóka kettős keretét: a külső narrációs kontúr már zöld, de a kiválasztott mondóka és az aktuális sor belső borderje még aranybarna volt. Az előző audit a `.is-narrated` külső outline-ját ellenőrizte, a saját kiválasztási állapotok egy részét kihagyta. Ez ténylegesen megmaradt stílus volt; a felhasználó másik böngészőjének gyorsítótárát nem igazoltuk hibaforrásként.

Külön managed `highlight-version-check` munkafa, ág `codex/highlight-version-check`, kiindulás `3277381`. Zöld lett az R-helyválasztó, a mondókaválasztó és az aktuális sor belső kerete; az állatkönyv hover/aktuális lapja; a műhely mintasegítsége; a rókás útiterv; a sakk kijelölés/cél/ütési gyűrű/kész tábla; a kijelölt pohár és az SVG pohárjelölés/célvonal. Az előrehaladás jelzői is zöldek. A próbálkozást jelölő keretek szürkéskékek; a műhelyben ezek specifikusabb szabályt kaptak, hogy a mintamező alapkerete ne írja felül őket. A régi portál és az önálló frissítőoldal narancssárga fókuszkerete is zöld. A régi alapstílus feldolgozási/elutasítási árnyékából is eltűnt a meleg szín. A játékmenethez és a hangokhoz nem nyúltunk; a közös checkout többi chatjének munkája érintetlen. Usage-reset kredit nem lett beváltva.

A `tests/browser/feedback-borders.js` a belső border, a külső outline, az inset shadow, az SVG stroke és a pszeudoelem keretét külön vizsgálja. Chrome és WebKit alatt motoronként 47 sikeres ellenőrzés: tényleges mondókaváltás és sorválasztás, hang közbeni kettős keret három elrendezésben, újrapróbált hallásfeladat, négy állatkönyvlap, mintasegítség/próbálkozás, útépítés, sakk kijelölés/ütés/befejezés, pohárváltás, kalandjelző, portálfókusz és a frissítőoldal billentyűzetes fókusza. Rövid hangfixture-t és elkülönített, service worker nélküli kontextust használ, személyes mentéshez nem nyúl. Böngészőszkript-hiba nincs.

Végső ellenőrzés: teljes build, 189 sikeres Node-teszt, 585 futtatási fájl. A közös `calm-highlights.js` is sikeres mindkét motorban: motoronként 84 ellenőrzés, 46 nézet, 3500 Chrome és 3508 WebKit narrációs elem. Az új állapotpróbákkal együtt motoronként 131 böngészős ellenőrzés. Offline lenyomat: `61310630bb7f65e5`; 572 kötelező offline fájl. A közzététel a meglévő GitHub Pages main-folyamatával történik.

## 2026. október 10. – Nyugodt kiemelés minden játékban

A felhasználó az egész oldalon megmaradt narancssárga villogás átnézését kérte. Az előző javítás csak a kirakóban írta felül a közös narrációs stílust; most a `narration.css` minden hangos segítséghez 2 px statikus zsályazöld keretet ad, a korábbi input/output/machine jelzésekhez is. A puzzle és R-kaland helyi narrációs kivétele megszűnt, a csökkentett mozgás melletti Maci-jelzés is zöld. A saját figyelemjelzések is rendezve: a mikrofon kész állapotának pontjai álló zöldek; az állatkönyv hanggombja, az R-visszhang aktív kerete és a szabálygép működésjelzése nem pulzál. A billentyűzetes fókusz, a kirakó kijelölése/húzási célja és a segítségkeretek sötétzöldek. A szóváltás utáni narancssárga szövegfény megszűnt.

Kiindulás `5edfe92`, külön managed `calm-highlights` munkafa, ág `codex/calm-highlights`. A highlight_audit alügynök a teljes CSS/JS/SVG auditot és a célzott böngészős regressziót készítette; a root a közös és helyi stílusokat javította. A közös checkout más chatek félkész munkájához nem nyúltunk. A narráció hanghoz és szóidőkhöz kötött életciklusa, a válaszok elrejtése, a Maci szájmozgása, a lapozás és a játékmenethez tartozó animációk megmaradnak. Usage-reset kredit nem lett beváltva.

Ellenőrzés: teljes build és 189 sikeres Node-teszt. Chrome és WebKit motoronként 84 célzott ellenőrzés, 46 nézet; 3520, illetve 3516 narrációs elem statikus zöld stílusa és változatlan vezérlő-/képmérete. A CSS-végigjárás rövid hangfixture-t használ, majd újratöltés után a valódi gép-, R-, memória-, puzzle- és Maci-hangokat ellenőrzi. Külön motoronként 28 eredeti narrációs és 16 műhely-/memória-narrációs próba sikeres, benne szóidős célváltás, rejtett helyes válaszok védelme, késő hangválasz törlése, Maci szájmozgása és offline újratöltés. Kirakó kijelölés/húzási cél/előnézet, állathang-jelző, mikrofonpontok, R-visszhang és csökkentett mozgás ellenőrizve. Böngészőhiba nincs. Offline lenyomat: `522494ad6a3ef38e`; 585 futtatási fájl. Közzététel a meglévő GitHub Pages main-folyamatával.

## 2026. október 10. – Tizenkét mese közös SVG-rajztárral

A felhasználó párhuzamos alügynököket kért a további tizenegy meséhez, több mozgással és közös, később minden mesét javító modellekkel. A négy engedélyezett aktív szálból három alügynök a történetcsoportokat, a fő szál a rajztárat, időadatokat, lejátszót és integrációt készítette. Eredmény: **12 teljes mese, 398 jelenet, 163,43 perc**. Jelenetszámok sorrendben: **14, 24, 27, 29, 32, 33, 40, 34, 38, 47, 38, 42**. Az eredeti szövegek és fix Noémi-MP3-ak változatlanok.

Közös SVG-factoryk a `story-art/` könyvtárban: `base.js` a Boribon-szereplők és gépek; `vehicles.js` a piros Villám, sárga szárnyas Turbó, kék Pötty és ezüst autó; `animate.js` közös felhősodródás, növényringás, pislogás, madarak, pillangók és kerekek; `workshop.js`, `routes.js`, `seasons.js` az újrahasznált helyszínek és kellékek. Egy modell javítása minden használó jelenetet javít. A `story-scenes/` három modulja teljes időzített jelenetsorokat exportál. Interfész: `story-art/README.md`, `CONTRACT.md`.

A `story-visual-player.js` az MP3 aktuális idejével rajzol, mesét vált és reduced-motion állóképet ad; a `story-visual-library.js` mind a tizenkét mesét összeköti. A Mesetár minden felvételéhez van kép. Felhők, eső, hó, hullámok, nádas, halak, buborékok, gépkarok, buszmentés, műhely-mechanika, érzékelők, korcsolyázás, vihar és korona mozog a narrációhoz igazodva. Az első mese régi előnézete és videója megmaradt, rajzai már a közös könyvtárból jönnek.

Az eredeti részfelvételek szóhatáradatait a `scripts/extract-story-timing.py` fűzi össze; a `scripts/build-story-captions.mjs` exportálja a bekezdésidőket. Mind a 3107 eredeti bekezdés azonosítva, a részfelvételek időösszege minden mesénél megegyezik a végleges MP3-mal. Részletes helyi adatok: `output/story-timing/`; futtatási idősor: `story-caption-timing.js`, szöveg: `audiobook-data.js`.

Végleges ellenőrzés: teljes build és **195 Node-teszt**. Chrome és WebKit motoronként **42 könyvtári ellenőrzés**, ezen belül **398 jelenet / 1194 póz**, minden jelenet determinisztikus előre-vissza keresése és állóképe; **21 Mesetár-integrációs ellenőrzés** minden mese választásával és keresésével; **32 hangosmese-ellenőrzés**, benne letöltés, könyvjelző, offline újratöltés és a második mese új illusztrációjának offline hanglejátszása. Az első mese 43 próbája ismét sikeres mindkét motoron. A WebKit szünetpróbája kivárja a natív médiaóra véglegesítését. Fizikai iPhone/iPad próba nincs. Átnézett 36 fő mintakép és az alügynökök célzott kontaktlapjai. Javítva a kellékek attribútum-visszaállítása, hengerforgás, külön vizsgált kerék, koronafelhelyezés, figurák rétegezése, buszkihelyezés és az ezüst autó visszahúzott kereke.

Offline csomag: **587 kötelező + 12 opcionális hang**, **600 futtatási fájl**, lenyomat `26801df9d89171bd`. A build a két új könyvtár JS-fájljait automatikusan csomagolja. Helyi előnézet: **http://127.0.0.1:5187/output/story-library/**, forrás: `output/story-library/`, közvetlen mese: `?story=story-07`. Szerver: `python3 tests/browser/audiobooks-fixture.py 5187`. A saját QA-böngészők lezárva; a kiszolgáló megmaradt. Nyers chat/cache, képernyőképek és szóadatok nem részei a futtatási csomagnak.

Managed munkafa: `/Users/celestial/.codex/worktrees/fixed-audiobooks/beszedtanulas`, ág `codex/fixed-audiobooks`. A közös checkout más chatekhez tartozó munkája érintetlen. Ebben a körben helyi változat és commit készült; push és éles közzététel nincs. Usage-reset kreditet nem váltottunk be.

## 2026. október 10. – Egy teljes, animált SVG-mese

A felhasználó a három rövid látványminta közül az SVG-t választotta: jobb formák, egységesebb részletek, sok apró mozgás, visszafogott mesekönyves minőség. A **Boribon és a rendőrautó** teljes **246,168 másodperces** fix Noémi-felvételéhez **14 jelenet** készült. Kert, üldözés, kanyar és baleset, markoló érkezése/munkája, tűzoltók/vízsugár, mentő, daru, köszönet, közös segítség, Annipanni, rendeződés és zárókép. A `story-visual-data.js` jelenet- és bekezdésidői az eredeti MP3 WordBoundary adataiból származnak; a teljes szöveg és hang változatlan.

A `story-visuals.js` natív SVG-rajzai javított arcokat, arányokat, járműtesteket, ablakokat, kerekeket és színezett árnyalatokat használnak. Artikulált markolókar/kanál, darukar/kötél/horog, vízsugár/tömlő, hordágy/mentőajtó, pislogás, integetés, növényringás, felhők, madarak, pillangók, szélforgó és finom jelzőfény. A róka kiszáll a versenyautóból, majd a hordágyon és a mentőben jelenik meg, egyidejű másolat nélkül. Minden mozgás az audio.currentTime függvénye; szünet és keresés nem hagy futó vagy elcsúszott animációt. A Mozgás kapcsoló és a rendszer reduced-motion beállítása jelenetenként álló, értelmes képet ad.

A Mesetár első felvételének helyi változatába beépítve, a meglévő lejátszóval és könyvjelzővel. A player `getPosition()` a rAF számára tényleges, folyamatos hangpozíciót ad. Más mese választása, kilépés és újranyitás kezeli a rajz életciklusát. Az új JS/CSS az alap offline csomag része, rasterkép és további hanggenerálás nincs. Elkülönített munkafa továbbra is `/Users/celestial/.codex/worktrees/fixed-audiobooks/beszedtanulas`; a közös checkout más chatekhez tartozó munkája érintetlen.

Ellenőrzés: teljes build, **192 sikeres Node-teszt**. Chrome és WebKit motoronként **43 előnézeti + 11 Mesetár-ellenőrzés**, minden jelenet, valódi hanglejátszás/befejezés, megálló és visszaállítható SVG, csökkentett mozgás, könyvjelző és 375/834/1280 px elrendezés. A korábbi Mesetár-próba WebKit alatt további **31 ellenőrzésen** ment át, benne valódi offline újratöltés és ellenőrzött hangletöltés. WebKit emuláció, fizikai iPhone/iPad teszt nincs. Browser-szkriptek: `tests/browser/story-visuals.js`, `tests/browser/story-visuals-integration.js`. Offline csomag **575 kötelező + 12 opcionális hang**, **588 futtatási fájl**; lenyomat `3ffb6a21f500d7cf`.

Önálló előnézet és a teljes hangos videó forrása: `output/story-svg-full/`; helyi cím `http://127.0.0.1:5187/output/story-svg-full/`. Szerver: `python3 tests/browser/audiobooks-fixture.py 5187`. A videó `boribon-rendorauto-teljes.mp4`, böngészős SVG-rögzítés, 1280×720/25 fps, az eredeti fix hanggal. Export: `record.js`, `export-video.py`; ellenőrzési adatok `video-export.json`. A PNG-k az `output/playwright/story-svg-full-*.png` fájlokban vannak.

Ez a helyi, megtekinthető változat; ebben a körben nem történt push vagy éles közzététel. A felhasználó most egy teljes mese elkészítését és az SVG-minőség javítását kérte. A többi mese animálása későbbi feladat.

## 2026. október 10. – Nyugodt hangos segítség a kirakóban

A felhasználó a kirakó elemei körüli narancssárga villogásra kérdezett rá, majd jóváhagyta a finom, statikus kiemelést. A `puzzle.css` a kirakó narrációs jelzéseit 2 px zsályazöld kontúrra állítja, animáció nélkül. A hanghoz kötött jelzés és a darabkijelölés, húzás, billentyűzetes fókusz működése megmarad. Kiindulás `3d3548d`, elkülönített `puzzle-gentle-cues` munkafa; a közös checkout többi chatből származó munkája érintetlen. Ellenőrzés: teljes build és 189 sikeres Node-teszt. Chrome és WebKit alatt a tényleges puzzle_start/puzzle_hint lejátszás közben az animationName none, a kontúr 2 px és rgb(120,149,127); a tábla helye/mérete két időpontban azonos, a billentyűzetes kijelölés és az elrendezés megfelelő. A képernyőkép ellenőrizve. Offline lenyomat a8d8f13d698f1dbd; 585 futtatási fájl. A változtatás négy fájlban: puzzle.css, generált sw.js, README.md és continuation.md.

## 2026. október 10. – Tizenkét fix hangos mese a Mesetárban

A felhasználó jóváhagyta a Safariból korábban kimentett tizenkét mese hanganyagának elkészítését és beépítését. **Mesék és Maci → Mesetár**: a játékokkal egyező `hu-HU-NoemiNeural` magyar hang, `-6%` tempó; tizenkét ellenőrzött statikus MP3, összesen **163,43 perc / 58,84 MB**. A szöveg csak a formázási jelektől tisztult, átírás nem történt. A teljes helyi forrásimport megmaradt; a chat URL-je és a forrásüzenetek nem kerültek a Git-commitba. A Pages `_config.yml` kizárja a `content/` forráskönyvtárat a webhelyről, a dist is csak a futtatási fájlokat tartalmazza.

- Saját hosszú lejátszó, egyperces korlát nélkül: lejátszás/szünet, folytatás, újrakezdés, időcsúszka, olvasható meseszöveg. Mesénként megmaradó, a felvétel hash-éhez kötött pozíció és utolsó választás; újratöltés után a Mesetár újranyitásával visszaáll, automatikus lejátszás nélkül. Menüváltás leállítja a felvételt; későn megérkező forrás/indítás nem hozza vissza az elhagyott mesét. A háttérbe váltás nem szakítja meg a mesét: az app és az inaktív Furfangliget korábbi globális leállítása javítva.
- Mesénkénti Letöltés: teljes SHA-256 ellenőrzés után külön, scope szerinti audiobook-cache; a játékok frissítése megőrzi. A hosszú felvételek nem részei az automatikus offline telepítésnek. Hibás/betelt letöltés újrapróbálható; megmarad a korábbi ép felvétel. Letöltött mese offline újratöltés után blob URL-ről játszik, a nem mentett mese érthető újrapróbálást kínál. Nincs dinamikus beszédszintézisre váltás.
- A generátor rövid, ellenőrzött szövegrészeket készít és ffmpeg streamcopyval fűz össze. Minden végleges felvétel teljes ffmpeg-dekódolása sikeres, szóhatár/duráció/forráshash ellenőrzéssel. A részek helyi cache-e megszakítás után újrahasználható. Generálás: `npm run generate-audiobooks`; forrás és hang ellenőrzése a teljes buildben.

Külön managed munkafa: `fixed-audiobooks`, ág `codex/fixed-audiobooks`. A közös checkout más chatből származó tracked munkája érintetlen; az eredeti forrásmentés ott is megmaradt. A legfrissebb publikált `840fdef`, `e37ed41` és `24f9324` módosítások összevezetve, így a szabad kirakó, késleltetett sikerjelzés, látható túlcsordulásos öntés és Sakkliget megmaradt. Usage-reset kredit nem lett beváltva.

Ellenőrzés: teljes összevezetett build, **189 sikeres Node-teszt**; Chrome és WebKit motoronként **31 sikeres böngészős ellenőrzés**: valódi MP3-lejátszás, 125 másodperces pozíció, szünet/folytatás, késői indítás, mesénkénti könyvjelző, kilépés, újratöltés, ellenőrzött letöltés, valódi offline újratöltés és lejátszás, hibás letöltés és hálózati visszatérés, dinamikus hang nélküli működés, négy telefon/tablet elrendezés és legalább 44px gombok. Játékszkript-hiba nincs. A láthatósági próba szimulált document-esemény, a WebKit emuláció; fizikai készülékes lezárt képernyős próbát nem állítunk. Teszt: `tests/browser/audiobooks.js`; a hosszú MP3 időcsúszkájához byte-range kiszolgálást adó helyi fixture: `tests/browser/audiobooks-fixture.py` (5187). A sima Python http.server nem támogatja ezt; a produkciós Pages támogatja. Képek: `output/playwright/audiobooks-375-chromium.png`, `audiobooks-834-webkit.png`. Offline lenyomat: `761ebe045de3fd83`; **572 kötelező offline + 12 opcionális hangfájl**, összesen **585 futtatási fájl** a distben. Közzététel a meglévő GitHub Pages main-folyamatával.

## 2026. október 10. – Látható öntés, fogyó kancsó és valódi túlcsordulás

A felhasználó jelezte, hogy az öntés alig látszik, és nem lehet túltölteni. Külön managed munkafa: `pour-real-water`, ág `codex/pour-real-water`, kiindulás `4975c2a`; a közös checkout más chatek tracked/untracked munkája érintetlen. A javítás a később közzétett `840fdef` főágra került át, megőrizve a szabad kirakót és az egy másodperces közös sikerjelzést. A `setupPourGame` `onRestart` callbackje az új poharaknál és szintváltásnál is törli a függő sikerablakot.

- Nagyobb poharak és kancsó, finom átmozgatás és billenés. A kancsó vízpoligonja gravitációs sík alatti, területet megőrző metszet: a felszín döntéskor is vízszintes, a látható víz elfogy. A folyamatos, csillogó vízsugár a kancsó tényleges csőrétől a pohár aktuális felszínéig ér; csak a csőrig érő víznél és a pohár fölötti helyzetben folyik.
- Véges, 2,6 pohárnyi víz; az átfolyt mennyiség a pohárban vagy a túlcsordulásban jelenik meg. Tele pohár két szélén víz és cseppek, utána is megmaradó tócsa. A Feltöltöm csak a kancsót tölti; a kiválasztott pohár ürítése a saját tócsáját is eltünteti. Mindhárom szint túltölthető: a kezdőszint automatikus megállás helyett lassabb folyást és szélesebb elfogadó sávot ad. A kész pohár tovább tölthető és elveszítheti a kész állapotot; jutalom csak két megfelelő pohár explicit befejezésekor.
- Közvetlen kancsóhúzás egérrel/ujjal: lefelé mozdítás mértéke vezérli az erősséget, elengedés és pointercancel leállít. Gomb, nyilak, Enter/Space, kisegítő kattintás és kalibrált telefonos döntés megmarad. Fókuszvesztés/háttér/kilépés leállítja a vizet és a hangot. Nyolc telefon/tablet/asztali méretben nincs kilógás, a gombok legalább 44px méretűek.
- Három új statikus magyar MP3: kicsordulás, üres kancsó, újratöltés; a kezdő útmutató az önálló megállást mondja. Tizenhárom öntős hang, hiteles lenyomat és szóidők, hozzájuk narrációs kiemelés. A játék és minden új hang offline is elérhető.

Ellenőrzés: teljes összevezetett build, 173 sikeres Node-teszt; Chrome és WebKit motoronként 44 öntős és 49 közös körlezárási ellenőrzés. A vízmennyiség megmaradása, horizontális felszín, csőrhöz csatlakozó sugár, kezdőszint fizikai túlcsordulása, tócsa, kiürülés/újratöltés, kész pohár újratöltése, húzás és megszakítás, szimulált szenzor/engedélyéletciklus, nyolc elrendezés, offline játék és az új hangok cache-e ellenőrizve. Az öntés sikerablaka mindkét motorban kb. 1004–1008ms után nyílt; közbeni új poharak törlik, az egyszer mentett jutalom megmarad. Játékszkript-hiba nincs. A böngészős döntéspróba szimuláció; fizikai készülékes ellenőrzést nem állítunk. Offline lenyomat: `614eb945d7ff4d39`; 538 offline fájl / 539 futtatási fájl a distben, 433 gépi magyar hang. A közzététel a meglévő GitHub Pages main-folyamatával történik.
## 2026. október 10. – Sakkliget, első sakkfigurák és kis helyzetek

A felhasználó a figurák lépéseit és egyszerű pozíciókat tanító sakkjátékot kért. **Számok és logika → Sakkliget**: Lépések, Csillagok és Kis feladatok mód, mind a hat figura saját SVG-rajzzal, nagy vezérlőkkel, nyolcszor nyolcas táblával és 26 új statikus magyar hanggal. Kiindulás `4975c2a`, külön managed munkafa `sakkliget`, ág `codex/sakkliget`; a közös checkout mesetárhoz tartozó tracked/untracked munkájához nem nyúltunk. A fejlesztés közben megjelent `840fdef` és `e37ed41` main-változat beépült, a szabad kirakó és a közös 1000 ms látható idejű sikerjelzés megmaradt. Usage-reset kreditet nem váltottunk be; nem használtunk alügynököt.

A Lépések szabad, visszavonható mozgás, alapból látható, kikapcsolható lépésjelöléssel. A Csillagok figuránként három elérhető célt ad; a gyalog egyik céljához két egyes lépés szükséges. A tíz kis helyzet ütést, akadályt, első kettős gyaloglépést és királybiztonságot tanít; szabályos, de nem célba vezető választásnál a feladat megmarad. A sötét figurák nem kapnak ellenfélkört. A mozgásmodell figyelembe veszi a saját/idegen figurákat, az út lezárását, a huszár ugrását, a gyalog átlós ütését, a támadott királymezőt és a kötést. A király nem üthető; a gyalog az utolsó soron automatikusan vezérré válik. Sáncolás, en passant és teljes sakkparti nincs.

Beállítás: `beszedtanulas.chess.v1`, közös eszközszintű mód és figura, sérült/tiltott tárolásnál memóriában használható. Újbóli belépés friss táblát indít. A felfedezés nem jutalmaz; három csillag vagy egy kis feladat egyszer ad jutalmat az aktív profilnak, a beszédszámlálókhoz nem ad próbát. Az elkészült tábla megmarad a közös sikerablakig, a mentés azonnali; új kör, feladat-/mód-/figuraváltás és kilépés törli a függő sikert. Kézi Hallgasd meg! a kikapcsolt automatikus útmutatónál is használható. A szabálykártya jelzése a tényleges narrációt követi; kilépés és háttér leállítja a hangot. Tab/Enter/Space, iránybillentyűk és Escape támogatott, csökkentett mozgásnál nincs érkezési animáció.

Ellenőrzés: 182 sikeres Node-teszt, benne 9 új sakkmodell-próba; Chrome és WebKit motoronként 91 teljes játék-/elrendezés-/offline-ellenőrzés és 13 sikeridőzítés-/profil-/valódi narrációindulás-/szimulált érintés-próba. Mind a hat csillagkör és mind a tíz kis helyzet végigjátszva, egyszeri jutalom, újrajátszás, hibás és veszélyes lépés, visszavonás, billentyűzet, gyalogátváltozás és beállítás-visszatöltés igazolva. Három mód × hat elrendezés (320×568–1194×834, köztük 932×350), négyzetes tábla, vízszintes túlcsordulás nélkül; a táblán kívüli vezérlők legalább 44 px méretűek. Safari gridméretezési eltérés explicit táblaaránnyal és sorokkal javítva. A szülői próba nem módosítja a gyerek jutalmát/próbáit; az offline magyar bástyanarráció ténylegesen elindul. Saját tesztböngészőkben történt az ellenőrzés, a felhasználó böngészőadatait nem módosítottuk. Fizikai iPhone/iPad próba külön végezhető. A végső közös build az új öntős hangokat is tartalmazza: 569 futtatási fájl, 495 MP3 (459 gépi magyar + 24 saját + 12 állathang), offline lenyomat `ad3e71861e801762`.

Források: `chess-data.js`, `chess-art.js`, `chess-game.js`, `chess.css`; integráció app/index/navigation és a közös hangjegyzékben. Tesztek: `tests/chess.test.mjs`, `tests/browser/chess.js`, `tests/browser/chess-lifecycle.js`. Közzététel a meglévő GitHub Pages main-folyamatával. A közös checkout main ága a más chatek félkész munkája miatt nem lett átállítva vagy stash-elve; további integráláskor az origin/main aktuális állapotát kell figyelembe venni.

## 2026. október 10. – Szabad kirakó és közös, későbbi sikerjelzés

A felhasználó kérésére bármelyik kirakómezőre lerakhatók a darabok, és a kész kép rövid ideig látszik a lezárás előtt. Pontosítása alapján a sikerjelzés várakozása közös szabály: **1000 ms ténylegesen látható idő**. Kiindulás `4975c2a`; külön managed munkafa `puzzle-free-placement`, ág `codex/puzzle-free-placement`. Párhuzamosan a navigation_model agent a Map-alapú kirakómodellt, az offline_refresh agent a közös modált és időzítőt, a montessori agent a négy saját befejező felületet alakította; a root a kirakó vezérlését, felületét és integrációját készítette.

A kirakótábla `Map<mező,darab>` állapotú. A lerakott darab újra kijelölhető, húzható vagy billentyűzettel mozgatható. Két foglalt mező darabjai cserélődnek; tálcáról foglalt mezőre helyezéskor a régi darab visszakerül a tálcára. Új **Vissza a tálcára** gomb és tálcára ejtés segíti az átrendezést. A telített, rosszul rendezett tábla még nem kész, nem ad jutalmat; csak a helyesen összeállított teljes kép zárja le a kört. A lerakási mintahang kizárólag valóban helyes pozíción szólal meg. A meglévő képek és hanganyag változatlanok.

A `success-delay.js` közös időzítő kezeli a látható időt, a rejtett ablak alatti szünetet és a késő válaszok törlését. A közös `celebrateRound` sikerhangja, konfettije, narrációja és modalja 1 mp késéssel jelenik meg; a jutalom mentése azonnali. A Furfangliget, Műhelyliget, Meseliget és R-kaland saját lezáró visszajelzése is megtartja a kész jelenetet. A sikerre váró feladat már nem szerkeszthető vagy jutalmazható újra; kilépés, belső választó, új kör vagy módváltás törli a várakozást. Nyitott dialog mögött késő lezáró narráció nem indul.

Ellenőrzés: 169 sikeres Node-teszt (11 kirakómodell-próba és 8 közös időzítő-életcikluspróba). Chrome és WebKit motoronként 172 teljes kirakó-, 6 tényleges érintéses és 85 navigációs ellenőrzés: mind a 12 kép/darabszám-kombináció, szabad elhelyezés, áthelyezés/csere/visszaadás, egér és billentyűzet, egyszeri jutalom, kész kép a modal előtt, kilépési/újrakezdési törlés, hat elrendezés legalább 44 px kezelőkkel és teljes offline kirakás. A memória, öntés, Hol van?, etetés és öltöztetés közös sikerablak-próbái motoronként 47/47 sikeresek; a valódi modalnyitás 1002–1008 ms, a konfetti/narráció sem korai. A memória újrakezdési, kilépési és védett szülői kapus törlése megőrzi az azonnal mentett jutalmat. A `success-scenes.js` külön modulfixture-ben a tényleges felületeken motoronként 53/53 sikeres próbával ellenőrzi a saját lezárásokat, egyszeri jutalmat, késleltetett narrációt, új szint/kör és kilépés miatti törlést, Meseliget/R látható időt, a nyitott kapu védelmét és az R-kaland végén a régi megállási üzenet eltűnését. Játékszkript-hiba nincs. A build 536 futtatási fájlt készít; offline lenyomat `1d43308e660cfcd0`. A közzététel a meglévő GitHub Pages main-folyamatával történik.

## 2026. október 10. – Látható Frissítés gomb és régi cache-ből átállás

A felhasználó kézi refresh gombot kért, mert a `b009234` változat továbbra is túl gyakran megjelenik. Kiindulás `cf183c7`; külön managed munkafa `manual-refresh`, a közös checkout `content/` munkája érintetlen. A főképernyőn **Frissítés** link; a külön `refresh.html` inline, önálló bootstrap, amely régi `app.js` és szülői belépő nélkül is működik. Mindig hálózatról töltődik (`cache: no-store`), akkor is, ha a hiteles build/receipt jegyzékben szerepel. A main-link időbélyeggel kerül megnyitásra, a sikeres művelet a kanonikus főképernyőre tér vissza régi `?v=` nélkül.

A frissítő új SW-ellenőrzést indít, megvárja a teljes, SHA256-tal ellenőrzött csomagot, majd kifejezett kézi aktiválást kér. A manual bypass kizárólag ténylegesen listázott, same-scope `refresh.html` kliensről, boolean `manual: true` üzenetből engedélyezett. Más nyitott játékablak is frissülhet; ezt a frissítőoldal előre jelzi. Az automatikus többablakos védelem megmarad. Nincs unregister, cache-törlés a kliensből vagy helyitároló-törlés. Sikertelen letöltés után a régi teljes cache és az eredmények megmaradnak, újrapróbálás és visszalépés lehetséges; offline a home gombja a játszható home-on tart. A szülői régi gomb megmarad.

Az offline_refresh agent a SW guardot és 6 új worker-tesztet készítette, a root a gombot, önálló frissítőoldalt, 2 kliens-tesztet, legacy fixture-t és böngészős életcikluspróbát. Tesztsegéd: `tests/browser/manual-refresh.js`; `offline-update-fixture.py --legacy` tényleges git-archivált `b009234` kiadást szolgál A-ként, a későbbi változatokat a friss distből. A hanganyag változatlan. Usage-reset kredit nem lett beváltva. Ellenőrzés: 155 sikeres Node-teszt; Chrome és WebKit motoronként 17 sikeres teljes böngészős próba a valódi b009234-ről, másik nyitott régi ablak mellett, valamint automatikus guard, közvetlen és home-gombos kézi frissítés, három elrendezés és legalább 44px cél, offline gomb, hibás letöltés/visszatérés, sikeres retry és már aktuális verzió ellenőrzésével. Játékszkript-hiba nincs. Csomag: 535 futtatási fájl; offline lenyomat `9a5fb09670de243e`. A közzététel a meglévő GitHub Pages main-folyamatával történik.

## 2026. október 8. – Visszalépés, öt játékcsoport és automatikus frissítés

A felhasználó jóváhagyta a főképernyőn automatikusan alkalmazódó verziófrissítést, és az előző választóhoz visszalépést, valamint rendezettebb csoportosítást kért. Kiindulás: `d30c479`. Külön managed munkafa: `navigation-and-updates`, ág `codex/navigation-and-updates`; a közös checkout más chatből származó `content/` munkája érintetlen. A navigation_model agent készítette a navigációs modellt és a régi böngészős segédek átvezetését; az offline_refresh agent az offline kliens életciklusát. A root a felületet, integrációt, öt menühangot és valós böngészős ellenőrzéseket készítette. Usage-reset kredit nem lett beváltva.

- Öt egyértelmű csoport: **Képek és hangok** (témák, hallás utáni választás, állatkönyv), **Mondd utánam** (egy/két szó, R-kaland), **Számok és logika** (számolás/mennyiségválasztás, Furfangliget, Műhelyliget), **Mesék és Maci** (etetős/öltözős Maci, Meseliget), **Kirakók és ügyesség** (memória, puzzle, öntés, meglepetésképek). Minden játéknak egy helye van; az öt csoport új statikus magyar útmutatót kapott.
- Fejlécben külön visszanyíl és házikó. A nyíl a tényleges előző választóhoz vezet; az R-kaland és a három liget belső feladatából először a saját választóhoz. A kör végi ablakban is külön visszalépés. A házikó közvetlenül home-ra visz. A böngésző vissza/előre visszaállítja a témakört és a count/quiz módot. Validált route/trail állapot és tényleges history-depth külön tárolva, idegen vagy régi history nem léptet ki az alkalmazásból. Szülői oldal history-visszatéréskor új belépőt kér.
- `offline-client.js`: frissítésellenőrzés indításkor, screen/focus/visibility/online eseményekből, a hálózati ellenőrzések között 60 másodperc korláttal. Teljesen letöltött waiting SW csak látható home-on, nyitott dialog nélkül aktiválódik. Játék közben megérkező controllerchange is home-ig vár az újratöltéssel. A meglévő többablakos SW-védelem megmarad; a bezárás után későn eltűnő WebKit client kezelésére eseményenként legfeljebb egy késleltetett próbálkozás. Hiba után a korábbi teljes cache használható, nincs eredménytörlés. A főképernyő csak érdemi letöltési/frissítési/hibajelzést mutat.
- A régi cache-ben nyitva maradt változat még a korábbi klienssel fut: az új automatikához egyszer szükséges a régi szülői **Új verzió betöltése** gomb. A worker nem erőlteti az új verziót a régi, játszó ablakokra. A URL `?v=` nem önmagában cache-törlés.

Megvalósítás: `navigation.js`, `navigation.css`, `app.js`, `index.html`, `offline-client.js`; célzott Node-tesztek: `tests/navigation.test.mjs`, `tests/offline-client.test.mjs`. Teljes headless Chrome/WebKit navigációs teszt: `tests/browser/navigation.js`. Valós SW-telepítés, aktiválás, megszakadt fájlletöltés és többablakos védelem: `tests/browser/offline-update.js`, elkülönített localhost fixture-rel (`offline-update-fixture.py`, két motorhoz külön port). A régi `furfang-update.js` a mentett ligetfeladat újranyitási regresszióját ellenőrzi; a frissítés életciklusát az új külön teszt fedi. A hangpróba a mindenkori manifestet használja a korábbi 256-os fix darabszám helyett.

Ellenőrzés: teljes build, 147 sikeres Node-teszt; Chrome és WebKit motoronként 85 navigációs és 17 valós offline-frissítési ellenőrzés sikeres. Minden játék bejárata, visszalépés, nested választók, témakör és számolási mód history-visszaállítása, mentett ligetfeladatok, egyszeri puzzle-jutalom, három látható körvégi gomb, telefon/tablet/kompakt fekvő nézet, offline újratöltés és változatlan eredmények ellenőrizve. A frissítési fixture igazolja a játék és nyitott dialog alatti várakozást, home-on automatikus betöltést, többablakos blokkolást és ablakbezárás utáni folytatást, hibás letöltésből ép cache-visszatérést és sikeres újrapróbát. Játékszkript-hiba nincs. Offline lenyomat: `e39004208394f3f8`. A közzététel a meglévő GitHub Pages main-folyamatával történik. Hangjegyzék: 430 gépi magyar + 24 családi + 12 állathang, összesen 466 MP3. A csomag 534 futtatási fájl. A WebKit böngészős teszt emuláció; a felhasználó saját Chrome-ablakaihoz nem nyúltunk.

## 2026. október 8. – Róka R-kalandja, öt játék

A felhasználó jóváhagyta az öt javasolt R-hang gyakorló játékot, és sorrendben kérte a megépítésüket, majd a teljes kész állapot commitját/pushát. Hangvadász → Robotpostás → Perecműhely → Mondókaliget → Saját visszhang sorrendben készült. Kiindulás `b009234`; a közös checkoutban közben más chatek puzzle- és öntésmodult fejlesztettek, ezért a négy saját untracked kezdeti R-fájl külön managed munkafába került: `r-practice-five-games`, ág `codex/r-practice-five-games`. Más chat munkájához nem nyúltunk. Usage-reset kreditet nem váltottunk be.

A modul a Mondd utánam / Játsszunk! menüből indul. 30 képes szó, 30 rövid kifejezés, 6 R nélküli hangvadász-ellenpélda, 4 saját négysoros mondóka, 96 új gépi magyar MP3 hiteles szóidőkkel. A meglévő rókaillusztrációt, emoji képeket és kódban rajzolt díszletet használja. A R betűk kiemelve, a hang közbeni jelzés a közös narrációs órához kötve; csökkentett mozgás támogatott.

Közös mód alapértelmezésként; opcionális helyi hangészlelés és a meglévő magyar SpeechRecognition adapter. A felismert szót/sort jelzi, R-artikulációt nem pontoz. Teljes tokenegyezés, sorrend és egyetlen felismerési alternatíva szükséges; R→L szöveges csere vagy alternatívák összemosása nem ad szóegyezést. Hiba után felnőttel jelzett továbbhaladás elérhető.

A Saját visszhang MediaRecorderrel a natív támogatott MIME-formátumot használja. 8 másodperc / 2 MB korlát; rögzítés vége/megszakítása leállítja a saját streamet, késői engedélyválasz is bezáródik. Felvétel csak memóriában, nincs feltöltés vagy haladásmentés a hangból. Szóváltás, modulváltás, kilépés, elrejtett lap elengedi; minden visszajátszási URL végül visszavonódik. A szófelismerő szolgáltatás külön, böngészőfüggő hálózati feldolgozás lehet; ezt a felnőtt beállításai jelzik.

Beállítások: `beszedtanulas.rPractice.v1`. Haladás: `rPractice` a közös eredménysémában, profilonként, fájlmentéssel/reset/undo támogatással. `rounds`, `practices`, `recognized`, `confirmed` külön számláló minden játékhoz. Régi beszédszóeredmények, próbák és jutalmak külön maradnak; nincs hamis kiejtési sikeradat. Saját hang és felismert szöveg nem mentődik.

Ellenőrzés: a végső közös build 118 Node-tesztje sikeres, köztük 11 új adat/matching/mentés/profil/engedély/felvevő életciklus teszt. Chrome és WebKit alatt egyaránt 75 sikeres teljes böngészős ellenőrzés: mind az öt játék, húsz telefon/tablet elrendezés, legalább 44px vezérlők, szófelismerés/helyi hangészlelés, natív MediaRecorder-visszajátszás, megszakítás és késői engedély, offline mintahangok, mentés és változatlan régi eredmények. Mindkét motorban további három mikrofonéletciklus-próba és egy engedélyelutasítási próba sikeres. A Chrome-integrációs próba tíz ellenőrzése igazolja a puzzle, öntés, állatkönyv és R-menü közös működését, egyszeri régi jutalmakat és külön eredményeket. Böngészős játékszkript-hiba nincs. A tesztek kifejezetten headless módúak, szimulált felismerési motorral és szintetikus helyi mikrofonstreammel; emberi gyermekes mikrofonpróbát nem állítunk. A WebKit tesztsegédje prototípuson, track-azonosítóval figyeli a natív stream lezárását, mert az instance-wrapper nem mindig marad ugyanaz. A megszakított szintetikus hangforrás függő resume-ígéretét is kezeli.

A külön munkafába az `ef00ac2` main állapot fast-forward összevezetése bekerült: a más chatek által publikált puzzle és döntögetős öntés megmaradt. A hangjegyzék 425 gépi magyar MP3-at, a teljes csomag 461 MP3-at tartalmaz. A build 527 futtatási fájlt csomagol; offline lenyomat `61f03bcff0755f2c`. A közzététel a GitHub Pages main-folyamatával történik. Tesztsegéd: `tests/browser/r-practice.js`; a felhasználó saját Chrome-ablakaihoz nem nyúltunk.

## 2026. október 8. – Döntögetős öntés Macinak és Nyuszinak

A felhasználó telefon döntögetésével vezérelt öntős ügyességi játékot kért a meglévő játékok közé. **Játsszunk! → Töltsünk a barátainknak!**: saját SVG-kancsó, két pohár, Maci és Nyuszi, jelölt vízszintek, tíz magyar MP3 és halk, helyben előállított csobogás. Három helyben választható, mentett szint: automatikus megállás; önálló adagolás és elfogadó sáv; két különböző mennyiség. Túltöltésnél a kiválasztott pohár üríthető. Mindkét elkészült pohár után a Kész a piknik! gomb egyszer ad jutalmat az aktív profilnak; a beszédpróbákhoz nem ad eredményt.

- Telefonon külön gombból indított mozgásengedély, fél másodperces kezdőhelyzet-kalibrálás, simítás és holtzóna. A döntés iránya választ poharat, mértéke adja a folyás sebességét. Pohárváltás középhelyzet után; álló/fekvő fordításkor új kalibrálás. Elutasítás, késői engedély és hiányzó szenzoradat kezelve. Gombos mód minden eszközön elérhető; érintés/egér nyomva tartás, bal/jobb nyíl, a gombon Enter/Space és kisegítő kattintás támogatott.
- Kilépés, háttér és fókuszvesztés leállítja a folyást, a hangot és a lenyomott bemenetet. Visszatérve a döntést újrakalibrálja; késői engedély nem hozza vissza az elhagyott játékot. Csökkentett mozgásnál álló vízszint és animáció nélküli vízsugár marad.
- Fájlok: `pour-data.js`, `pour-game.js`, `pour.css`, `tests/pour.test.mjs`, `tests/browser/pour.js`. Integráció: app/index, közös hangjegyzék/narráció, helyi beállítás, jutalom és offline csomag. Csomag: 426 futtatási fájl, 365 MP3 (329 magyar + 24 családi + 12 állathang).

Ellenőrzés: teljes build, 107 sikeres Node-teszt; Chrome és WebKit alatt egyaránt 32 sikeres böngészős próba. Teljes kör, egyszeri jutalom, újrajátszás, egér, nyilak, túltöltés-javítás, mentett szint, szimulált mozgásengedély és orientációs adatok, kilépés, nyolc telefon/tablet/gép méret (375×667–1440×900, köztük 932×350), legalább 44px gombok, csökkentett mozgás, offline újratöltés és új hangok cache-elése. Játékszkript-hiba nincs. A valódi iPhone/iPad Safari és főképernyős döntésvezérlés fizikai készülékpróbája még szükséges; a szimulált szenzorpróba ezt nem helyettesíti. A publikálás a meglévő GitHub Pages main-folyamattal történik.

## 2026. október 7. – Lapozható állathangos képeskönyv

A felhasználó a megnyomható állatszimbólumokkal működő hangos könyvekhez hasonló játékot kért, komplexebb képekkel és lapozással. A korábbi párhuzamos fejlesztési engedély alapján a műhely-agent készítette a könyvvezérlőt, a Furfang-agent a valódi állatfelvételeket, a Meseliget-agent a célzott böngészős tesztet; a root generálta az illusztrációkat, végezte az integrációt és a közzétételt. Kiinduló main: `49eff45`; a térkép nélküli ösvényváltozat megmaradt. Usage-reset kredit nem lett beváltva.

- Képek / Játsszunk! → Hangos állatkönyv. Négy képes lap: tanya, kert, tópart, erdő; tehén, ló, bárány, kutya, cica, tyúk, kacsa, béka, liba, bagoly, kakukk, farkas. A teljes képek 3:2 arányúak; mindegyik három nagy, natív gombként működő állatterületet és három alsó szimbólumgombot kapott. A jelölők elrejthetők; a területek a tényleges képen látható állatok helyéhez igazodnak.
- Gombos, oldalszámos gyorsválasztós, billentyűzetes és vízszintes húzásos lapozás; lapfordítási animáció, határon megálló navigáció, megtartott billentyűzetfókusz. Rövid fekvő nézetben kép és vezérlők egymás mellé kerülnek. Csökkentett mozgásnál az animációk leállnak.
- Hanglejátszás a meglévő Web Audio / HTML Audio rendszerben. Betöltéskor csak loadingjel, tényleges induláskor az állat és gomb finom mozgása. Új állat, lapozás, főképernyő, rejtett böngésző és forrásdialog megszakít; késői callback nem indíthat vissza előző hangot/jelzést. Hibánál újrapróbálható állapot; nincs szövegfelolvasással imitált állathang. A fejléc hanggombja az utolsó állatot ismétli az aktuális lapon. Nincs mikrofon, pontozás vagy beszédpróba-módosítás.
- Saját eszközbeállítás `beszedtanulas.animalBook.v1`: utolsó lap és hangpontok láthatósága. Nem eredménymentés és nem felhőszinkron. Sérült vagy tiltott tárhely mellett alapértékekkel, memóriában is használható.
- Négy eredeti beépített image_gen-illusztráció, 1536×1024; változatlan méretű WebP-export 84-es minőséggel, kb. 2 MB. Végső promptok és képfájlok: `assets/animal-book/README.md`, `generation.json`, `farm/garden/pond/forest.webp`. Az eredeti PNG-k megmaradtak a Codex generált képei között.
- 12 valódi, 1,671–4,8s Commons-felvétel, összesen733771 byte, közkincs vagy CC BY-SA 2.5/3.0/4.0. Rövid kivágás, 60Hz mélyvágás, enyhe fel/lekeverés, mérsékelt és egységesített hangerő; minden csúcs≤−3dBTP. A CC BY-SA részletek megtartják az eredeti licencet. A teljes szerző/forrás/revízió/eredetiURL/kivágás/licenc/lenyomat/mérés jegyzék: `animal-book-audio.json`; a könyv forrásdialogja a kötelező attribúciót és módosításokat offline is megjeleníti. Faj/hívástípus a felvevő elsődleges leírásával igazolva; tényleges emberi hanghallgatást ebben a környezetben nem állítunk.
- Az offline csomagba bekerült mind4 kép, mind12 MP3 és a forrásjegyzék, az új JS/CSS automatikusan része. Teljes csomag405 futtatási fájl,350 MP3 (314 gépi magyar +24 családi +12 állathang). Régi saját hangok és magyar narráció érintetlen.

Ellenőrzés: teljes build és 97 sikeres Node-teszt (7 új adat/preferencia/lejátszási életciklus + 3 asset/licenc/offline próba). Chrome és WebKit motorral egyaránt 143/143 böngészős ellenőrzés sikeres: mind a 12 valódi hang indulása és vége, lapozás, érintés, késői válaszok, beállításmentés, 20 kép/képernyőméret-kombináció, csökkentett mozgás, offline képek/hangok/forrásdialog, változatlan játékhaladás. Böngészős játékszkript-hiba nincs. A tesztek kifejezetten headless módban futottak, új Chrome-ablak nélkül; tesztsegéd `tests/browser/animal-book.js`. Az offline lenyomat friss, a teljes csomag 405 futtatási fájl. A tényleges gyermekes fizikai eszközpróba továbbra is külön feladat.

## 2026. október 3. – A narrációt követő animációk

A felhasználó azt kérte, hogy a játékok animálják azt, amiről a hang éppen beszél; példaként a szabálygép bemenetét és kimenetét említette. Ez a munka eredetileg a `codex/narrated-animation` ágon, külön munkafában készült a 765b1bd alapról. A párhuzamos játékfejlesztést koordináló chat a harmadik adagban integrálta a `9aa0a4c` változatot az új műhelyekkel és felülettel.

- `narration.js`: a tényleges Web Audio / HTML Audio lejátszási órát követő kiemelés, teljes életciklussal. Betöltés alatt nincs korai animáció, hangváltáskor és kilépéskor törlődik, render után az új DOM-elemekre kerül át. Böngészős tartalék felolvasásnál a `boundary` karakterpozíciója vezérel. Dokumentumesemények: `narrationstart`, `narrationword`, `narrationend` (`detail.id`, `text`; szóhatárnál `word`, `index`, `time`; végén `reason`). Új műhelyek is kapcsolódhatnak hozzájuk.
- A generátor `WordBoundary` adatot kér az MP3 mellett. A 256 régi klipet a változatlan szöveggel/hanggal/tempóval újrageneráltuk a hiteles szóidőkhöz. A `voice-timing.js` 38 KB, a felhasznált idők a receipts `words` mezőjében is szerepelnek. `npm run check` ellenőrzi a kettő egyezését és az időrendet. Az ismételt generálás 0 új / 256 változatlan hangot igazolt.
- A géppéldán külön bemenet → fogaskerék → kimenet jelzés van. A kosaras rendelésben az aktuális termés/mennyiség, a plusz/mínusz gombok, a gépépítés kezelői, az ösvény csomagjai/háza a megfelelő szavaknál kapnak animációt. A művelet kiválasztásakor a ténylegesen megváltoztatott hely mozog.
- Meseligetben kert → kosár és állat → tányér jelzés; a képkártyán és meglepetéskártyán a megszólaló kép, számoláskor a megérintett tárgy, két szónál a két kép egymás után emelődik ki. Az etetős és öltözős maci beszéd közben mozog, a szája nyílik. A hallás utáni/képes mennyiségválasztás hangszórója aktív; a helyes válasz egyik választós játékban sem kap előzetes kiemelést.
- Csökkentett mozgásnál statikus keret marad. Az ellenőrzés talált egy CSS-specificitási hibát, ezt javítottuk. A böngészős tesztsegéd néhány várakozása/kiválasztója is pontosításra szorult; a végső teljes futások mind sikeresek.
- Ellenőrzés: 72 Node-teszt, ebből 4 új az időzítésre és az életciklusra. Chrome és WebKit: 28–28 sikeres ellenőrzés; további 4 Chrome-ellenőrzés a HTML Audio és a szimulált böngészős felolvasás tartalék útjára. 375×667 / 932×350 / 834×1194 nézet, offline újratöltés, késő hangválasz, azonnali megszakítás, a releváns jelenetek és a csökkentett mozgás. A WebKit egyszeri külső CDN betöltési hibája a teszt előtti Supabase SDK-kéréshez tartozott; a tesztben a külső SDK helyettesítve volt, játékszkript-hiba nem történt. Tesztek: `tests/narration.test.mjs`, `tests/browser/narration.js`, `tests/browser/narration-fallback.js`. Képek: `output/playwright/narration-*`.

### Összevezetés a párhuzamos fejlesztéssel

A narráció és a gazdagabb játékok összevezetve. A receipt fájl 256 régi és 54 új bejegyzése egyesítve; az `npm run generate-voice` az új klipekhez is letöltötte a szóidőket (54 új, 256 változatlan). Így mind a 310 gépi hangnak hiteles időzítése van; a 24 családi felvétel változatlan. A bolt számbemenetei/szállítása, a saját műveletekkel működő géppróba, a róka utazása és a Meseliget-opciók megmaradtak. A szemantikus jelölők és objektumos hangszekvenciák az új felületbe kerültek. A Műhelyliget új mondatrészjelzései, a mérleg célmennyiségének és segítségben megnevezett rúdnak a kiemelése, valamint a memória felfordított képének jelzése is bekötve. A generált `sw.js` friss; 380 cache-fájl és a service worker, összesen 381 futtatási fájl.

Az integrált harmadik adag ellenőrzése: teljes build és 87 sikeres Node-teszt; Chrome és WebKit motoronként 28 narrációs és 16 új műhely/memória hangjelzési próba, 102 műhely- és 146 Furfangliget-regressziópróba. A Chrome tartalék hangútjain további 4 ellenőrzés sikeres. Új célzott teszt: `tests/browser/new-game-narration.js`. Az új hangjelzések offline újratöltés után is működnek; csökkentett mozgás, kilépési megszakítás, rejtett válaszok megőrzése, a célmennyiség és az ajánlott rúd pontos kijelölése ellenőrizve. Az első két adag már az origin/mainen van (`23696c7`, `d25741f`); a narráció a harmadik push része.

## 2026. október 3. – Párhuzamos játékbővítés, első adag

A felhasználó a projektchatek áttekintését, párhuzamos subagent-fejlesztést és ellenőrzött adagok pusholását kérte. Kiinduló main: `765b1bd`. Három külön munkafa: Montessori ihlette Műhelyliget, Furfangliget-felület, Meseliget-opciók. A másik aktív, felhasználó által vezetett chat külön narrated-animation munkafában hanghoz időzített kiemeléseken dolgozik; az integrálást ebben a chatben koordináljuk. A meglévő GitHub Pages CI marad a publikálás módja.

Első adag: **Képpárok**, új memóriajáték 2/3/4/6 párral, témakör szerinti képekkel, visszaforduló téves párral, megszakítható képes segítséggel, újrakezdéssel és egyszeri körjutalommal. Nincs mikrofon vagy pontlevonás; a beszédpróbák számlálóját nem módosítja. Négy új magyar statikus hang. A párok száma eszközbeállítás, a jutalom az aktív profilhoz tartozik. A félbehagyott memóriatábla nem mentődik.

Ellenőrzés: teljes build, 70 Node-teszt, Chrome és WebKit motorban 43–43 játékmeneti/mentési/elrendezési ellenőrzés (mind a négy táblaméret, segítség, téves pár, újrajátszás, egyszeri jutalom, beállítás újratöltés után, 375×667 / 932×350 / 834×1194 / 1194×834, legalább 44 px-es gombok). Tesztsegéd: `tests/browser/memory.js`, csak elkülönített tesztböngészőben. A további három fejlesztési ág integrálása a következő adag.

### Második adag – három műhely, gazdagabb régi játékok

Mindhárom subagent kész munkája integrálva: Műhelyliget (eredeti ág `07bceee`), Furfangliget (`dd7cb0b`), Meseliget (`af60eb8`). A főképernyő Játsszunk! menüje külön képes kapukat ad a három fejtörővilágnak és a memóriának.

- Új Műhelyliget: Válogatókert, Mintaszövő, Egyensúlyműhely; három szint; szín/formaméret-válogatás, AB/AAB/ABC és két párhuzamos szabályú minták, színes rúddal számbontás 15-ig, kötött darabszám és eltérő hosszúság. Natív gombok, szín mellett megkülönböztető jel, három segítségfokozat, lépésenkénti visszavonás, több jó számbontás elfogadása, egyszeri jutalom.
- Új `workshop` mentés, 1. séma: `games[kind]` három szint önálló/segített számlálóival; `sessions[kind]` három külön determinisztikus feladattal. Minden szint megőrzi a munkáját. Profilváltás, JSON-export/import, előnézet, nullázás és visszavonás bekötve. Régi mentés üres műhelyadatot kap; hibás import vagy valótlan megoldottság nem tölthető be. A workshopLevel eszközön közös beállítás; felhős műhelyszinkron nincs.
- Furfangliget: helyi szintválasztó és szülői mező összhangban, közvetlen 0–számkör értékbevitel, ötével csoportosított számlálók, kosárszállítás mindkét rendelés után, a gyerek saját műveleteivel lefutó géppróba, mozgó róka, számozott iránysor, billentyűzet/érintés. A régi generátor és mentés értelmezése változatlan.
- Meseliget: új piknikhez 1–számolási szint, legfeljebb10 szereplő; mentett cél változatlan a szülői szint csökkentésekor is. Fix/váltakozó mennyiségi gyakorlás. Utolsó lépés és aktuális tálca újrakezdése visszavonható. Egy-egy párosítás, hiány/többlet útmutató, alma/tányér animáció, teljes piknikjelenet.
- 50 új magyar műhelyhang. A teljes csomag 310 gépi +24 saját MP3, 376 offline fájl. Új JS/CSS automatikusan része a csomagnak; saját képek helyett CSS/inline SVG a műhelyben. Mozgáscsökkentés kezelt; nincs időbüntetés vagy mikrofon az új játékokban.

Ellenőrzés eddig: 83 Node-teszt sikeres (13 új, köztük több ezer determinisztikus eset és teljes műhelymentési életciklus). Műhelyliget Chrome és WebKit: 102–102 ellenőrzés, mind a kilenc játék/szint, jutalom, segítség, újratöltés, profil, tényleges letöltött JSON visszaállítása, 375×667/932×350/tablet, 44 px. Furfangliget Chrome és WebKit:146–146 meglévő játékmenet/elrendezés-próba az új számbemenetre és animált ellenőrzésre frissített tesztsegéddel. Meseliget:56–56 ellenőrzés, teljes tízfős kaland és mennyiségek, mentett cél megőrzése, fix/szabad játék, visszavonás/újrakezdés. Offline:11–11 próba, mind az50 műhelyhang és4 memóriahang cache-ben, három műhely és a régi világok hálózat nélkül, teljes háromrúdos mérlegmegoldás és MP3-dekódolás. Régi játékok:8–8 böngészős regressziópróba. Kisebb képernyőn a hosszabb műhelyek függőlegesen görgethetők. Fizikai iPhone/iPad- és gyermekpróba továbbra is külön feladat.

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


## 2026-10-12 — Radó Vilmos I–II. teljes gyűjteménye

Izolált managed munkapéldány: `rado-complete-collections`, kiindulás `f3bf89a`; a közös checkout más munkáinak fájljai érintetlenek. Mind az 50 teljes mese importálva (31 + 19), eredeti helyesírással, történetvéggel, az öt eredeti jegyzettel, forráshatárokkal és CC BY-SA 3.0 attribúcióval. Az eredeti WebArchive-ok a Letöltésekben változatlanok; külön tartós másolat, két fő-HTML, két keret-HTML és 21 szkript a repón kívül. A HTML-ekben nincs meseillusztráció; az audio-only megoldás követi a meglévő Mesetárat. Két címazonosság külön változatként megmaradt.

26 teljes fix Jessa/eleven_v4/hu felolvasás elkészült, 106,48 perc; eredeti megjelenített szövegtől külön IPA-input, teljes szóidőzítés és tényleges hanghoz igazított sor-/bekezdésfelirat, könyvjelző és külön ellenőrzött offline letöltés. 24 felolvasás keret miatt várakozik, mindegyik teljes szövege és kérési terve kész. Hiányzó bemenet: 311 983 karakter; kedvezmény nélküli kreditigény ugyanennyi, 10% tartalékkal 343 182. Tényleges, 26 egyedi sikeres kérésből igazolt fogyasztás: 9 545 kredit; utolsó ellenőrzött meglévő egyenleg: 7 074. A következő teljes mese nem fér bele a konzervatív, 1 kredit/karakter + 10% keretbe. Resetkredit, vásárlás, előfizetésmódosítás és későbbi automatikus futtatás nem történt. Fizetett cache, teljes nyers válaszok, tervek és bizonylatok: `~/.config/beszedtanulas/rado-audiobook-cache/`. Újraküldés helyett bizonytalan eredménynél előzmény-helyreállítás szükséges.

Megőrizve a közben publikált `d3bf617` főági változás: három teljes klasszikus, közös offline kereső, Kriza-forrásellenőrzési kártyák, új SVG-jelenetek és ArrayBuffer-kompatibilis privát import. A közös kereső mind az 50 Radó-mesét is tartalmazza. A korábbi 22 hang és felirat minden adata, a családi és állathangok, az SVG-időleképezések, valamint a friss főág összes más katalógus-/hangadata megmaradt. Az összes új hosszú MP3 opcionális offline erőforrás.

Ellenőrzés: teljes build, 225 Node-teszt, 5 alap + 7 Radó + 3 friss klasszikus Python-teszt; minden 51 nyilvános MP3 teljes dekódolása; forrásarchívumok és mind az 50 szöveg bájtpontos ellenőrzése. Chrome és WebKit motoronként 524 végleges Radó-próba, 52 közös keresési/új klasszikus/privát szerzőkeresési próba és 18 privátimport-próba sikeres. A 10 eredeti klasszikus 119 és az alap Mesetár 32 böngészős próbája szintén sikeres mindkét motoron. Telefon/tablet képek átnézve. Fizikai iPhone/iPad és teljes hallás utáni magyar kiejtésvizsgálat nem történt; magánhangzó-hosszúságot nem állítunk gépi átirattal igazoltnak.

Mesénkénti kész/várakozó lefedettség, pontos karakter- és kreditadatok: `content/stories/rado-coverage.md`, `rado-plan.json`, `rado-credit-ledger.json`. Publikálás a meglévő GitHub Pages folyamattal; a kész szöveges gyűjtemény és a 26 hang elérhető, a 24 hiányzó felolvasás a felületen is jelölve van.
