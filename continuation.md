# Beszédtanulás – folytatási terv

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
