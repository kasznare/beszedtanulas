// Authored city story. Clip IDs are stable and every spoken line is enumerable.
export const STORY_CLIPS = {};
export const STORY_SCENES = {};

function clip(id, text) {
  const voiceId = `city_story_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`;
  STORY_CLIPS[voiceId] = text;
  return voiceId;
}

function add(id, { title, chapter, location, art, paragraphs, choices = [], activity, variants = [], recap = [], ending }) {
  const voiceIds = paragraphs.map((line, index) => clip(`${id}.p${index + 1}`, line));
  const resolvedChoices = choices.map((choice) => ({ ...choice, voiceId: clip(`${id}.choice.${choice.id}`, choice.label) }));
  const resolvedVariants = variants.map((variant, index) => ({
    ...variant,
    voiceIds: variant.paragraphs.map((line, n) => clip(`${id}.variant${index + 1}.${n + 1}`, line)),
  }));
  const resolvedRecap = recap.map((entry, index) => ({ ...entry, voiceId: clip(`${id}.recap${index + 1}`, entry.text) }));
  const resolvedActivity = activity && {
    ...activity,
    promptVoiceId: clip(`${id}.activity.prompt`, activity.prompt),
    items: activity.items.map((item) => ({
      ...item,
      voiceId: clip(`${id}.activity.item.${item.id}`, item.label),
      ...(item.detail ? { detailVoiceId: clip(`${id}.activity.detail.${item.id}`, item.detail) } : {}),
    })),
  };
  STORY_SCENES[id] = { id, title, chapter, location, art, paragraphs, voiceIds, choices: resolvedChoices, activity: resolvedActivity, variants: resolvedVariants, recap: resolvedRecap, ending };
}

add('film-stop', {
  title: 'A film megáll', chapter: 'A kezdet', location: 'A könyvtár kis udvara', art: 'library',
  paragraphs: [
    'Zsófi kifeszíti a vásznat a könyvtár udvarán. Mira a vetítő elé tartja a kezét, és óriási nyúlfület rajzol az árnyékával.',
    'A régi filmen két gyerek kék padot visz a 12-es, kék kapuhoz. Három vaslevél hajlik a kapu fölé. „Holnap itt találkozunk. Mindenki hozzon valamit!” A kép elsötétül.',
    '„Ennyi van a felvételen” – mondja Zsófi. „A másik másolat is itt ér véget.” Állítsd meg a képkockát, és nézz meg egy részletet közelebbről.',
  ],
  activity: { type: 'inspect', prompt: 'Mit vizsgálsz meg először?', items: [
    { id: 'gate', label: 'A kapu vasleveleit és házszámát', detail: 'A kék kapun tizenkettő áll, fölötte három kovácsoltvas levél. A mellette lévő félköríves ablak sarka csorbult.' },
    { id: 'bench', label: 'A pad javított lábát', detail: 'A kék pad egyik lába fecskefarkú illesztéssel javított. A szín később változhatott, a fa illesztése felismerhető.' },
    { id: 'notebook', label: 'A filmklub füzetét', detail: 'A kopott füzet címe „A mi helyünk”. Az utolsó jelenet terve szerepel benne, de a felvételen nem látszik.' },
  ], minSelections: 1, maxSelections: 1 },
  choices: [{ id: 'begin-investigation', label: 'Nézzük meg, merre indulhatunk.', to: 'route-choice' }],
});

add('route-choice', {
  title: 'Merre induljunk?', chapter: 'A kezdet', location: 'A könyvtár kis udvara', art: 'library',
  paragraphs: [
    'Zsófi a kapu képét, a pad közelképét és az „A mi helyünk” című füzetet teszi eléd. Mindhárom másféle nyomot ígér.',
    '„A mai utcafotókon nincs kék tizenkettős kapu. Dani műhelyében láttam egy hasonló padot. A füzet többi lapja pedig talán a helytörténeti polcon van.”',
    'Mira az ajtó felé lép, aztán megáll. „Melyikkel kezdjük?”',
  ],
  choices: [
    { id: 'route-street', label: 'Keressük meg a kaput az utcán.', hint: 'Helyszíni megfigyelés', icon: 'street', to: 'street-number', route: 'street', clue: 'A kapu képét vittük magunkkal.' },
    { id: 'route-workshop', label: 'Vigyük el a pad képét Danihoz.', hint: 'Tárgyvizsgálat', icon: 'workshop', to: 'workshop-red', route: 'workshop', clue: 'A pad javítását keressük.' },
    { id: 'route-archive', label: 'Rakjuk össze a füzet történetét.', hint: 'Emlékek és képek összevetése', icon: 'archive', to: 'archive-envelope', route: 'archive', clue: 'A filmklub feljegyzéseit keressük.' },
  ],
});

add('street-number', {
  title: 'A szám vagy a minta', chapter: 'A kék kapu nyomában', location: 'A tér és a pékség előtt', art: 'street',
  paragraphs: [
    'A mai 12-es házon barna ajtó van, egyenes rács és szögletes ablak. „A szám jó, minden más rossz” – mondja Mira.',
    'Eszter, a pék, egy üres ládával lép ki. „Az utcát újraszámozták. A képen látható telket ma 18-asnak hívják.”',
    'A régi képen három kovácsoltvas levél és egy csorbult félköríves ablak látszik. A mai zöld kapun mindkettő megvan.',
  ],
  choices: [
    { id: 'street-pattern', label: 'Állítsuk helyre a régi kameraállást.', to: 'street-view', set: { cameraReady: true, camera: 'original' }, clue: 'A 12-es kék kapu ma a 18-as zöld kapu; a levéldísz és az ablak azonosítja.' },
    { id: 'street-map', label: 'Nézzük meg az átszámozás rajzát.', to: 'street-view', set: { sidePassage: true }, clue: 'Az utcarajz a 12-es és 18-as számot ugyanahhoz a telekhez köti, és oldalsó átjárót mutat.' },
  ],
});

add('street-view', {
  title: 'A kép szélén kívül', chapter: 'A kék kapu nyomában', location: 'A 18-as zöld kapu és a pékség', art: 'street',
  paragraphs: [
    'Eszter felismeri magát a képen. „Dani fogta a pad nehezebb végét. Arra emlékszem, hogy Juli később bezárta a kaput.”',
    'A pékség üres kocsija éppen azon a kövön zörren át, ahol a filmen a pad állt. A kapuból a belső kanyar még nem látszik.',
  ],
  variants: [
    { when: { cameraReady: true }, paragraphs: ['Az eredeti kamerahelyről látod: a régi kép széle pontosan levágta a kocsi fordulóját.'] },
    { when: { sidePassage: true }, paragraphs: ['Az átszámozási rajz oldalsó átjárója a szállításhoz és a későbbi sétához is használható.'] },
  ],
  choices: [
    { id: 'street-cart', label: 'Kísérjük végig a kocsit a teljes fordulón.', to: 'street-eszter', set: { cartTurnKnown: true }, clue: 'A pékség kocsijának nemcsak egyenes sáv, hanem széles forduló is kell.' },
    { id: 'street-frame', label: 'Jelöljük krétával, mi maradt ki a képből.', to: 'street-eszter', set: { frameEdgeKnown: true }, clue: 'A régi képkivágás nem mutatta az udvar hátsó fordulóját.' },
  ],
});

add('street-eszter', {
  title: 'Mit vállal Eszter?', chapter: 'A kék kapu nyomában', location: 'A pékség', art: 'street',
  paragraphs: [
    '„Fél hétig pakolunk, utána tudok segíteni” – mondja Eszter. „Csak tudnom kell, mit készítsetek elő.”',
    'A régi szereplő emléke fontos, de egyedül még nem bizonyítja, miért maradt el a jelenet.',
  ],
  choices: [
    { id: 'eszter-actor', label: 'Állj újra a kapu elé a mai felvételen.', to: 'street-arrive', set: { eszterActor: true }, clue: 'Eszter a rakodás után szerepelhet az új jelenetben.' },
    { id: 'eszter-schedule', label: 'Tervezzünk a rakodás utánra, és hozd át a székeket.', to: 'street-arrive', set: { eszterSchedule: true }, clue: 'Eszterrel egyeztettük a rakodás utáni időt; a kocsi székeket hozhat.' },
  ],
});

add('street-arrive', {
  title: 'A zöld kapu mögött', chapter: 'A kék kapu nyomában', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: ['Átléptek a zöld kapun. Ugyanaz a félköríves ablak néz az udvarra, amely a kék kapus filmen látszott. Juli a másik kapuszárnyat is kitárja.'],
  choices: [{ id: 'street-to-court', label: 'Kérdezzük meg, mi történt a próbán.', to: 'court-arrival' }],
});

add('workshop-red', {
  title: 'A piros pad', chapter: 'Dani műhelyének titka', location: 'Dani bicikliműhelye', art: 'workshop',
  paragraphs: [
    'Dani műhelyében csengők, küllők és pumpák lógnak. A sarokban egy piros padon biciklikerekek sorakoznak.',
    '„Kék pad? Olyanom nincs.” Mira már fordulna, amikor észreveszed a piros pad lábán a régi képről ismert fecskefarkú javítást.',
    'Dani megfordítja a padot: az alján két bekarcolt kezdőbetű is egyezik. A kék padot időközben pirosra festette.',
  ],
  choices: [
    { id: 'bench-under', label: 'Nézzük meg a pad alá tűzött rajzot.', to: 'workshop-use', set: { benchDrawing: true }, clue: 'A fecskefarkú javítás és a kezdőbetűk azonosítják a pirosra festett régi padot; a rajz színpadnak szánta.' },
    { id: 'bench-rehearse', label: 'Próbáljuk ki a régi felállást a műhelyben.', to: 'workshop-use', set: { benchScale: true }, clue: 'A régi dobogó jóval több helyet foglalt volna, mint a pad önmagában.' },
  ],
});

add('workshop-use', {
  title: 'Mire készítsük elő?', chapter: 'Dani műhelyének titka', location: 'Dani bicikliműhelye', art: 'workshop',
  paragraphs: [
    '„Mi vittük vissza a padot. Akkor már elpakoltunk” – mondja Dani. „Juli csak később zárta a kaput.”',
    'A pad háttámlája levehető. Mellette keskeny bábkeret is állhat, de annak külön nézőtér kell.',
  ],
  choices: [
    { id: 'bench-seat', label: 'Rögzítsük a háttámlát, legyen biztonságos ülőhely.', to: 'workshop-carry', set: { seatReady: true, benchUse: 'seat' }, clue: 'A padot ülőhelynek készítettük elő.' },
    { id: 'bench-puppet', label: 'Próbáljuk ki a keskeny bábkeretet.', to: 'workshop-carry', set: { puppetReady: true, benchUse: 'puppet' }, clue: 'A bábkeretben rövid jelenetet próbáltunk el.' },
  ],
});

add('workshop-carry', {
  title: 'Hogyan jut oda?', chapter: 'Dani műhelyének titka', location: 'A műhely és a kapu közötti járda', art: 'workshop',
  paragraphs: [
    'A pad a szűk járdán kettesben vihető. Dani most elkísérhet, vagy Eszter a rakodás után áthozhatja a kocsin.',
    'Dani a mai utcarajzon megmutatja a 18-as házat. A régi 12-es szám és a kék festés megváltozott; a vaslevelek és az ablak a helyükön maradtak.',
  ],
  choices: [
    { id: 'carry-now', label: 'Vigyük ketten, és próbáljuk ki rögtön.', to: 'workshop-arrive', set: { daniHere: true }, clue: 'Dani személyesen segít az udvari berendezésnél.' },
    { id: 'carry-cart', label: 'Kérjük Eszter kocsiját, addig készítsünk jelenetrajzot.', to: 'workshop-arrive', set: { sceneDrawing: true }, clue: 'A pad később érkezik a kocsin; jelenetrajzzal készülünk.' },
  ],
});

add('workshop-arrive', {
  title: 'A pad újra a kapunál', chapter: 'Dani műhelyének titka', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: ['A zöld kapu vaslevelei egyeznek a régi képpel. A piros pad javított lába ugyanaz, amelyet a filmen láttatok.'],
  variants: [
    { when: { daniHere: true }, paragraphs: ['Dani leteszi a padot, és megmutatja, hogyan pakolták el régen.'] },
    { when: { sceneDrawing: true }, paragraphs: ['Előbb a jelenetrajzot fektetitek a földre. Eszter később hozza a padot; Dani az emlékegyeztetésre ér ide.'] },
  ],
  choices: [{ id: 'workshop-to-court', label: 'Hallgassuk meg a többieket is.', to: 'court-arrival' }],
});

add('archive-envelope', {
  title: 'A hiányzó lapok', chapter: 'Két emlék között', location: 'A könyvtár helytörténeti polca', art: 'archive',
  paragraphs: [
    'A nagy borítékban három kép, udvarrajz és néhány füzetlap van. A képeken a keresztben álló dobogó, a padot hazavivő gyerekek és Juli kapuzárása látszik.',
    'A képeken a téri óra és a pékség redőnye is látszik. Ezekből ellenőrizheted, mikor készült egy-egy felvétel.',
    'Mira az asztalra teszi a képeket. „Eszter a bezárt kapura, Dani az elvitt padra emlékszik. Melyik történt előbb?”',
  ],
  activity: { type: 'order', prompt: 'Mi volt a képek valódi sorrendje?', items: [
    { id: 'closing', label: 'Juli becsukja a kaput; az óra hetet mutat, a pékség redőnye lent' },
    { id: 'setup', label: 'A dobogó elállja az átjárót a berendezési próbán' },
    { id: 'packing', label: 'A gyerekek a padot viszik; az óra negyed ötöt mutat, a pékség nyitva' },
  ] },
  choices: [
    { id: 'archive-details', label: 'A képek óráját és a pékség redőnyét kövessük.', to: 'archive-last', set: { photoProof: true }, clue: 'A nyitott pékség és az órák szerint az elpakolás a kapuzárás előtt történt.' },
    { id: 'archive-note', label: 'Keressük meg ugyanezt a füzetben.', to: 'archive-last', set: { writtenProof: true }, clue: 'A füzet és a javítási cédula megerősíti a délutáni elpakolást.' },
  ],
});

add('archive-last', {
  title: 'Ami nem került filmre', chapter: 'Két emlék között', location: 'A könyvtár olvasóasztala', art: 'archive',
  paragraphs: [
    'Zsófi kisimítja a zárójelenet tervét: „Kinyílik a kapu. Mindenki behoz valamit.” A sor mellett nincs pipa.',
    'Alatta más ceruzával ez áll: „Nem vettük fel. Nem fért el minden úgy, hogy közben át lehessen menni.”',
    'A meghívást egy nappal korábban forgatták. Másnap, még az érkezők előtt próbáltak berendezni; a nagy dobogó elállta az átjárót.',
  ],
  choices: [
    { id: 'archive-plan', label: 'Illesszük össze a régi és mai udvarrajzot.', to: 'archive-share', set: { routePlan: true }, clue: 'A rajz mutatja a mai 18-as kaput, a belső fordulót és a könyvtárhoz vezető utat.' },
    { id: 'archive-juli', label: 'Kérdezzük meg Julit, pontosan mit kért.', to: 'archive-share', set: { juliHelp: true }, clue: 'Juli szabad utat kért a lakóknak és a kocsinak; más elrendezést kipróbálhattak volna.' },
  ],
});

add('archive-share', {
  title: 'Mit mutassunk meg?', chapter: 'Két emlék között', location: 'A könyvtár olvasóasztala', art: 'archive',
  paragraphs: ['Mira két üres kartont hoz. „Ha egyszerre mindent mondunk el, senki sem látja majd, mi volt a fontos.”'],
  choices: [
    { id: 'archive-map', label: 'Rajzoljunk bejárható térképet.', to: 'archive-arrive', set: { mapReady: true }, clue: 'Elkészült az útvonalterv; az udvarnál még be kell járni.' },
    { id: 'archive-strip', label: 'Készítsünk képsort a három eseményről.', to: 'archive-arrive', set: { pictureStrip: true }, clue: 'Elkészült a próba, elpakolás és esti zárás feliratozott képsora.' },
  ],
});

add('archive-arrive', {
  title: 'A képek helye', chapter: 'Két emlék között', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: ['A 18-as zöld kapun felismered a vasleveleket és a félköríves ablakot. A képek most már valódi helyekhez tartoznak.'],
  variants: [{ when: { juliHelp: true }, paragraphs: ['Juli vár a kapuban. „Itt tudjuk kipróbálni, mennyi hely kell valójában.”'] }],
  choices: [{ id: 'archive-to-court', label: 'Rakjuk össze közösen a történetet.', to: 'court-arrival' }],
});

add('court-arrival', {
  title: 'A kapu mögött', chapter: 'Az udvarban összeérő szálak', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: [
    'A kapu mögött virágládák, biciklik és egy falnak támasztott seprű áll. Mira a félköríves ablakra néz. „Innen még sosem láttam.”',
    'Zsófi idehozza a füzet záróbejegyzését és a három fotó másolatát. Ezeket most mindenki ellenőrizheti; a külön nyomozások kész tervei csak annál vannak, aki utánuk járt.',
  ],
  variants: [
    { when: { route: 'street' }, paragraphs: ['Eszter rámutat a régi kamera helyére. „A képen tényleg nem látszott a forduló.”'] },
    { when: { route: 'workshop' }, paragraphs: ['Dani a piros pad javított lábát mutatja. „A dobogó volt az akadály, nem ez a pad magában.”'] },
    { when: { route: 'archive' }, paragraphs: ['Te teszed sorba a három fotót; a füzet feljegyzése megerősíti, hogy a tervezett befejezést soha nem forgatták le.'] },
  ],
  choices: [{ id: 'court-discuss', label: 'Hasonlítsuk össze az emlékeket.', to: 'court-memory' }],
});

add('court-memory', {
  title: 'Kinek az emléke igaz?', chapter: 'Az udvarban összeérő szálak', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: [
    '„Én arra emlékeztem, hogy Juli bezárta” – mondja Eszter. „Mi meg hazavittük a padot” – teszi hozzá Dani. Mindkettő igaz, de az egyik nem okozta a másikat.',
    'Zsófi kiteszi a három fotót és a füzetlapot. A padot vivő képen a téri óra negyed ötöt mutat, a pékség nyitva van. A kapuzárós képen hét óra látszik, a redőny lent van.',
    'Mira rád néz. „Mutassuk meg mindenkinek, melyik pillanat mikor történt.”',
  ],
  activity: { type: 'order', prompt: 'Milyen sorrendben történt a három esemény?', items: [
    { id: 'closing', label: 'Juli becsukja a kaput; este hét, lehúzott redőny' },
    { id: 'setup', label: 'A dobogó elállja az átjárót a berendezési próbán' },
    { id: 'packing', label: 'A padot hazaviszik; negyed öt, nyitott pékség' },
  ] },
  variants: [
    { when: { route: 'archive' }, paragraphs: ['Ezt a sorrendet a könyvtárban már ellenőrizted; most te teheted a többiek elé a képeket.'] },
    { when: { chronologyKnown: true }, paragraphs: ['A próba idején a dobogó elállta a lakók és a kocsi útját. Délután elpakoltak, Juli csak a szokásos esti időben zárta be a kaput.'] },
  ],
  choices: [
    { id: 'memory-enact', label: 'Játsszuk el sorban a három pillanatot.', to: 'court-practice', set: { retelling: 'enact' }, clue: 'Eljátszva látható: a próba, az elpakolás és az esti zárás külön pillanat.' },
    { id: 'memory-frame', label: 'Mutassuk meg a képen kívül maradt fordulót.', needs: [{ frameEdgeKnown: true }, { cartTurnKnown: true }, { benchScale: true }, { routePlan: true }], lockHint: 'Ehhez tudni kell, mi maradt ki a régi képből: a kocsi fordulója, a dobogó mérete vagy az udvarrajz.', to: 'court-practice', set: { retelling: 'frame' }, clue: 'A teljes udvar megmutatja, ami a régi képkivágásból hiányzott.' },
  ],
});

add('court-practice', {
  title: 'A próba, amelyet régen kihagytak', chapter: 'Az udvarban összeérő szálak', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: [
    'Mira egyenes krétavonalat húz a kaputól az udvar végéig. Eszter üres kocsija az egyenes szakaszon elfér, a belső fordulónál megakad.',
    'Próbáld ki, melyik elrendezés hagyja szabadon a lakók kijáratát és a kocsi kanyarját is. Az elrontott próba megmutatja, melyik hely maradt ki a tervből.',
  ],
  activity: { type: 'layout', prompt: 'Melyik próba működik az udvarban?', items: [
    { id: 'straight', label: 'Csak egy egyenes sávot hagyunk szabadon' },
    { id: 'crosswise', label: 'A nagy dobogót keresztbe tesszük' },
    { id: 'turn-clear', label: 'A padot a fal mellé fordítjuk, a kanyart is szabadon hagyjuk' },
  ] },
  choices: [{ id: 'practice-plan', label: 'Válasszuk ki az esti berendezés módját.', to: 'court-layout-choice' }],
});

add('court-layout-choice', {
  title: 'Hely mindenkinek', chapter: 'Az udvarban összeérő szálak', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: ['A kocsi most befordul, a lakók kijárata szabad. Juli és Eszter a kipróbált feltételekkel vállalják az esti alkalmat. Milyen formát adsz neki?'],
  choices: [
    { id: 'layout-wall', label: 'Pad a fal mellett, kicsi nézőtér az udvarban.', to: 'ending-choice', set: { layout: 'wall' }, clue: 'A fal mellé fordított pad mellett elfér egy kisebb nézőtér.' },
    { id: 'layout-later', label: 'Rakodás után rendezzük be, addig jelöljük a helyeket.', to: 'ending-choice', set: { layout: 'later' }, clue: 'A berendezést a rakodás utánra időzítjük, a kijárat végig szabad.' },
    { id: 'layout-library', label: 'A hosszabb program a könyvtárnál lesz; itt rövid jelenet.', to: 'ending-choice', set: { layout: 'library' }, clue: 'A kapunál csak rövid jelenet lesz, a hosszabb program a könyvtárnál.' },
  ],
});

add('ending-choice', {
  title: 'Milyen estét készítünk?', chapter: 'A mai folytatás', location: 'A 18-as ház udvara', art: 'courtyard',
  paragraphs: [
    '„A régi utolsó jelenetet soha nem forgatták le” – mondja Zsófi. Mira három lapot tesz eléd: kamerát, függönyt és lábnyomokat rajzolt rájuk.',
    'Mindhárom tervhez megvan a szabad átjáró. A választott nyomozóút valamelyiket előkészítette; ami hiányzik, azt az esti esemény előtt megoldhatod.',
  ],
  variants: [
    { when: { cameraReady: true }, paragraphs: ['A régi kameraállást már kipróbáltad a pékség felől.'] },
    { when: { puppetReady: true }, paragraphs: ['A műhelyben a keskeny bábkeretet már elpróbáltad.'] },
    { when: { mapReady: true }, paragraphs: ['A könyvtári útvonaltérkép készen áll a próbasétára.'] },
  ],
  choices: [
    { id: 'ending-film', label: 'Forgassunk egy mai befejezést.', hint: 'Új jelenet és esti vetítés', icon: 'film', to: 'film-prep', ending: 'film' },
    { id: 'ending-theatre', label: 'Legyen élő előadás.', hint: 'Képek, bábok és emlékek', icon: 'theatre', to: 'theatre-prep', ending: 'theatre' },
    { id: 'ending-walk', label: 'Vezessük végig a többieket a helyszíneken.', hint: 'Séta és könyvtári vetítés', icon: 'walk', to: 'walk-prep', ending: 'walk' },
  ],
});

add('film-prep', {
  title: 'Hol legyen a kamera?', chapter: 'Új befejezést forgatunk', location: 'A 18-as zöld kapu', art: 'courtyard',
  paragraphs: [
    'A mai felvételen a zöld kapu nyílik ki. Zsófi belenéz a kamerába: a régi állásból a kapu szép, de a pad mögött az érkező emberek eltűnnek.',
    'Döntsd el, hogyan mutatod meg egyszerre a régi nézőpontot és a mai, használható udvart.',
  ],
  variants: [
    { when: { cameraReady: true }, paragraphs: ['Ismered az eredeti állást. Onnan indulhat a kép, majd a kamera oldalra mozdulhat a szabad forduló felé.'] },
    { when: { cameraReady: false }, paragraphs: ['Két helyet próbáltok ki most: az utca felől jól látszik a nyíló kapu, az udvarból a megérkező emberek.'] },
  ],
  choices: [
    { id: 'film-angle-shift', label: 'Induljunk a régi képből, aztán tárjuk fel az egész udvart.', needs: { cameraReady: true }, lockHint: 'A régi kameraállást a kék kapu nyomán lehet megtalálni.', to: 'film-eszter', set: { filmAngle: 'shift', camera: 'original' }, clue: 'A mai film kamerája megmutatja a régi kép szélén kívüli szabad utat.' },
    { id: 'film-angle-inside', label: 'Az udvarból vegyük fel az érkezőket és a kaput.', to: 'film-eszter', set: { filmAngle: 'inside', camera: 'wide' }, clue: 'A mai filmben minden érkező és a kocsi fordulója is látszik.' },
  ],
});

add('film-eszter', {
  title: 'Eszter helye a mai filmen', chapter: 'Új befejezést forgatunk', location: 'A pékség és a zöld kapu', art: 'courtyard',
  paragraphs: ['Eszter fél hétig a pékségnél dolgozik. A régi film gyerekszereplője szívesen segít, ha a jelenet a rakodás után készül vagy a mondatát előbb rögzítitek.'],
  variants: [
    { when: { eszterActor: true }, paragraphs: ['Már megbeszéltétek: Eszter a munka után a régi helyére áll a kapunál.'] },
    { when: { eszterActor: false }, paragraphs: ['A szereplést még nem egyeztettétek. Most kell eldönteni, hogyan kerül Eszter hangja vagy személyes jelenléte a mai történetbe.'] },
  ],
  choices: [
    { id: 'film-eszter-live', label: 'Várjuk meg a rakodás végét, Eszter lépjen be a kapun.', to: 'film-direct', set: { filmEszter: 'live' }, clue: 'Eszter személyesen szerepel a mai kapus jelenetben.' },
    { id: 'film-eszter-voice', label: 'Vegyük fel a mondatát a pékségnél; Mira álljon a régi helyére.', to: 'film-direct', set: { filmEszter: 'voice' }, clue: 'Eszter felvett mondata szól; Mira képviseli őt a kapunál, Eszter a vetítésre érkezik.' },
  ],
});

add('film-direct', {
  title: 'Hogyan nyíljon ki?', chapter: 'Új befejezést forgatunk', location: 'A 18-as zöld kapu', art: 'courtyard',
  paragraphs: [
    'A pad a kipróbált helyén áll, az átjáró szabad. A régi film meghívása után világos felirat kerül majd a vászonra: „Ezt a folytatást ma készítettük.”',
    'Milyen ritmusban érkezzenek a szomszédok?',
  ],
  choices: [
    { id: 'film-sequence', label: 'Egymás után érkezzenek, mindenki tegyen le valamit.', to: 'film-props', set: { filmDirection: 'sequence' }, clue: 'A mai jelenetben sorban áll össze a közös hely.' },
    { id: 'film-together', label: 'Előbb nyissunk helyet, aztán együtt nézzünk be.', to: 'film-props', set: { filmDirection: 'together' }, clue: 'A mai jelenet a közösen megnyitott térre figyel.' },
  ],
});

add('film-props', {
  title: 'Mit hoznak magukkal?', chapter: 'Új befejezést forgatunk', location: 'A 18-as zöld kapu', art: 'courtyard',
  paragraphs: ['Válassz pontosan három felajánlott tárgyat. Ezek látszanak majd a záróképen; a kocsi útját továbbra is szabadon hagyják.'],
  activity: { type: 'props', prompt: 'Melyik három tárgy kerüljön a mai filmbe?', minSelections: 3, maxSelections: 3, items: [
    { id: 'pillow', label: 'Ülőpárna' }, { id: 'board', label: 'Rajztábla' }, { id: 'puppet', label: 'Báb' },
    { id: 'pump', label: 'Biciklipumpa' }, { id: 'book', label: 'Könyv' }, { id: 'bread', label: 'Kenyérkosár' },
  ] },
  choices: [{ id: 'film-show', label: 'Vetítsük le a régi filmet és a mai folytatást.', to: 'film-ending' }],
});

add('film-ending', {
  title: 'A kapu most kinyílik', chapter: 'A mai film', location: 'A könyvtár kis udvara', art: 'movie',
  paragraphs: [
    'A vásznon a régi kék kapu előtt elhangzik: „Holnap itt találkozunk.” A régi film ugyanott ér véget. Utána új felirat jelenik meg: „Ezt a folytatást ma készítettük.”',
    'A zöld kapu kinyílik. Mira a szabadon hagyott kanyarnál áll, Juli mellett a kocsi is befér. A három választott tárgyból közös, használható hely alakul.',
    '„Szerintem most van vége” – mondja Mira. „A filmnek” – feleli Zsófi. A lakók a későbbi alkalmakról együtt dönthetnek.',
  ],
  variants: [
    { when: { layout: 'wall' }, paragraphs: ['A pad a fal mellett marad; a közel ülő nézők a valódi udvar apró részleteit is felismerik.'] },
    { when: { layout: 'later' }, paragraphs: ['A jelenetet a rakodás után vették fel. A krétajelek alapján gyorsan berendezték a helyet, és a kijárat szabad maradt.'] },
    { when: { layout: 'library' }, paragraphs: ['A kapunál rövid jelenet készült. A hosszabb vetítésnek a könyvtár udvara ad helyet.'] },
    { when: { retelling: 'enact' }, paragraphs: ['A vetítés előtt Mira eljátssza a három régi pillanatot, hogy senki se tévessze össze az esti kapuzárást a délutáni próbával.'] },
    { when: { retelling: 'frame' }, paragraphs: ['A régi állókép mellé odateszitek az egész udvar képét: a nézők látják, mi maradt a képen kívül.'] },
    { when: { seatReady: true }, paragraphs: ['A műhelyben előkészített piros padon most kényelmesen ülnek.'] },
    { when: { pictureStrip: true }, paragraphs: ['A könyvtárban készített képsor a vetítés előtt tisztázza a próba, elpakolás és kapuzárás sorrendjét.'] },
    { when: { eszterSchedule: true }, paragraphs: ['Eszter a megbeszélt időben a kocsival székeket is áthozott a vetítésre.'] },
    { when: { filmAngle: 'shift' }, paragraphs: ['A kamera a régi képkivágásból indul, majd oldalra mozdul: látszik a szabad forduló és minden érkező.'] },
    { when: { filmAngle: 'inside' }, paragraphs: ['Az udvar felől a kapu nyílása, az érkezők és a kocsi fordulója egyszerre kerül a képbe.'] },
    { when: { filmEszter: 'live' }, paragraphs: ['Eszter ugyanoda áll, ahol gyerekként a régi filmen. Most maga lép be a kapun.'] },
    { when: { filmEszter: 'voice' }, paragraphs: ['Eszter felvett mondata a pékségből szól; Mira a régi helyére áll a kapunál. Eszter a vetítésre érkezik.'] },
    { when: { filmDirection: 'sequence' }, paragraphs: ['A szomszédok egymás után érkeznek, és a végére áll össze a közös tér.'] },
    { when: { filmDirection: 'together' }, paragraphs: ['Előbb helyet nyitnak egymásnak, aztán együtt néznek be az udvarba.'] },
    { when: { propsIncludes: 'pillow' }, paragraphs: ['Valaki a választott ülőpárnát a padra teszi.'] },
    { when: { propsIncludes: 'board' }, paragraphs: ['A rajztáblán elkezdődik egy új udvarrajz.'] },
    { when: { propsIncludes: 'puppet' }, paragraphs: ['Egy papírbáb integet a kapuból.'] },
    { when: { propsIncludes: 'pump' }, paragraphs: ['Dani a biciklipumpát a fal mellé állítja.'] },
    { when: { propsIncludes: 'book' }, paragraphs: ['Zsófi egy könyvet nyit ki a padon.'] },
    { when: { propsIncludes: 'bread' }, paragraphs: ['A kenyérkosár a közös asztalra kerül.'] },
  ],
  choices: [{ id: 'film-epilogue', label: 'Nézzük meg, mi maradt velünk.', to: 'epilogue' }],
  ending: 'film',
});

add('theatre-prep', {
  title: 'Mivel meséljünk?', chapter: 'Élő előadást rendezünk', location: 'A 18-as ház udvara', art: 'theatre',
  paragraphs: [
    'Mira két figurát tart fel. Az egyik padot, a másik kulcsot fog. „Ha a kulcsos becsukja, a pados elmegy…” Eszter megrázza a fejét. „Éppen ezt értettük félre.”',
    'A kelléknek el kell férnie a szabad átjáró mellett. Válassz egy valóban felállítható formát.',
  ],
  variants: [
    { when: { puppetReady: true }, paragraphs: ['A műhelyben kipróbált bábkeret készen áll; most a nézők helyét kell mellé jelölni.'] },
    { when: { pictureStrip: true }, paragraphs: ['A könyvtárban elkészült háromképes történet már segít az előadás sorrendjében.'] },
    { when: { puppetReady: false }, paragraphs: ['A bábkeretet még nem próbáltátok. A keskeny keret vagy a könyvtár mozgatható képtartója közül választhatsz.'] },
  ],
  choices: [
    { id: 'theatre-puppets', label: 'Állítsuk fel a keskeny bábkeretet és jelöljük ki a nézőteret.', needs: { puppetReady: true }, lockHint: 'A bábkeretet Dani műhelyében lehet kipróbálni.', to: 'theatre-direct', set: { theatreForm: 'puppets' }, clue: 'A bábkeret elfér a kipróbált szabad átjáró mellett.' },
    { id: 'theatre-boards', label: 'Mozgatható képtartókkal mutassuk meg a három képet.', to: 'theatre-direct', set: { theatreForm: 'boards' }, clue: 'A mozgatható képtartókat félre lehet állítani, ha a kocsi érkezik.' },
  ],
});

add('theatre-direct', {
  title: 'Ki mondja el a kapu történetét?', chapter: 'Élő előadást rendezünk', location: 'A 18-as ház udvara', art: 'theatre',
  paragraphs: ['A régi három kép sorrendje biztos. Az előadás azt is megmutathatja, hogyan lett két igaz emlékből téves következtetés.'],
  choices: [
    { id: 'theatre-rethink', label: 'Játsszuk el előbb Mira tévedését, aztán nézzük újra.', to: 'theatre-ending', set: { theatreStory: 'rethink' }, clue: 'A nézők a téves feltételezés után maguk fedezik fel a helyes sorrendet.' },
    { id: 'theatre-voices', label: 'Eszter, Dani és Juli mondjon el egy-egy pillanatot.', to: 'theatre-ending', set: { theatreStory: 'voices' }, clue: 'Három személyes emlékből áll össze az előadás története.' },
  ],
});

add('theatre-ending', {
  title: 'A nézőtéren is kinyílik valami', chapter: 'Az élő előadás', location: 'A 18-as ház udvara', art: 'theatre',
  paragraphs: [
    'A képzeletbeli nagy kocsi megakad a túl szűk kanyarnál. Egy kisgyerek az első sorból megszólal: „Fordítsátok el a padot!” A kipróbált mai elrendezésben már szabad az út.',
    'Juli feláll: „A kaput csak este csuktam be.” Dani hozzáteszi: „Mi délután vittük el a padot.” Eszter ránéz a három képre. „Sokáig egyetlen pillanatnak láttam.”',
    'A függöny vagy a képtartó félrekerül. Mögötte a valódi udvar és a szabad átjáró látszik. A nézők tovább beszélgetnek arról, hogyan használhatják közösen a helyet.',
  ],
  variants: [
    { when: { layout: 'wall' }, paragraphs: ['A nézők a fal mellé fordított pad előtt ülnek; a belső forduló szabad.'] },
    { when: { layout: 'later' }, paragraphs: ['A bábokat és képeket csak a rakodás után tették ki; a krétával jelölt út addig is szabad maradt.'] },
    { when: { layout: 'library' }, paragraphs: ['A kapunál rövid jelenetet adnak elő, a hosszabb beszélgetés a könyvtár udvarán folytatódik.'] },
    { when: { retelling: 'enact' }, paragraphs: ['A délutáni közös próbán kiválasztott hárommozdulatos eljátszás most az előadásba is bekerül.'] },
    { when: { retelling: 'frame' }, paragraphs: ['A régi képkivágás mellé a teljes udvar képe kerül; a nézők egyszerre látják a hiányzó fordulót.'] },
    { when: { puppetReady: true, theatreForm: 'puppets' }, paragraphs: ['Mira a műhelyben begyakorolt mozdulattal fordítja el a kis bábkocsit.'] },
    { when: { pictureStrip: true }, paragraphs: ['A könyvtárban készített képsor feliratai most a nézőknek is segítenek elkülöníteni a három pillanatot.'] },
    { when: { eszterSchedule: true }, paragraphs: ['Eszter a korábban egyeztetett rakodás után érkezik a kocsival és a nézők székeivel.'] },
    { when: { theatreForm: 'puppets' }, paragraphs: ['A keskeny bábkeretben a papírkocsi újra megpróbál befordulni, ezúttal sikerül.'] },
    { when: { theatreForm: 'boards' }, paragraphs: ['A nagy képtáblák egymás után fordulnak meg: próba, elpakolás, esti zárás.'] },
    { when: { theatreStory: 'rethink' }, paragraphs: ['Mira első változatánál a nézők elhiszik, hogy a kapuzárás állította meg a próbát. A második játékban maguk javítják ki a sorrendet.'] },
    { when: { theatreStory: 'voices' }, paragraphs: ['Eszter, Dani és Juli külön mondatot kapnak. Egyiküket sem kell kinevetni ahhoz, hogy a teljes történet összeálljon.'] },
  ],
  choices: [{ id: 'theatre-epilogue', label: 'Nézzük meg, mi maradt velünk.', to: 'epilogue' }],
  ending: 'theatre',
});

add('walk-prep', {
  title: 'Egy séta, amelyet végig is lehet járni', chapter: 'A város lesz a történet helyszíne', location: 'A tér és a zöld kapu', art: 'walk',
  paragraphs: [
    '„A vásznon csak egy kép. Itt át lehet nézni rajta” – mondja Mira. Zsófi a könyvtárnál várja majd a csoportot a régi film vetítésére.',
    'A pékség bejáratát és a ház átjáróját szabadon kell hagyni. A sétának csak olyan állomása lehet, amelyet ma ellenőrizni tudtok.',
  ],
  variants: [
    { when: { mapReady: true }, paragraphs: ['A könyvtári térképed kész. Most bejárjátok, hogy a rajzon kijelölt megállók valóban működnek-e.'] },
    { when: { mapReady: false }, paragraphs: ['Térkép még nincs. A régi képet, a kaput és a könyvtárat most kötitek össze bejárható útvonallá.'] },
    { when: { sidePassage: true }, paragraphs: ['Az átszámozási rajzon talált oldalsó átjáró a kisebb csoportnak jó kerülőút lehet.'] },
  ],
  choices: [
    { id: 'walk-short', label: 'Három állomás: régi nézőpont, zöld kapu, könyvtár.', to: 'walk-door', set: { walkRoute: 'short' }, clue: 'A rövid séta három ellenőrzött állomásból áll.' },
    { id: 'walk-long', label: 'Tegyük bele Dani műhelyét és egy mozgatható képtáblát.', needs: { route: 'workshop' }, lockHint: 'Ehhez előbb Dani műhelyében kell járnod.', to: 'walk-workshop', set: { walkRoute: 'long' }, clue: 'A hosszabb séta a műhely padjának javítását is megmutatja.' },
  ],
});

add('walk-workshop', {
  title: 'A műhely megállója', chapter: 'A város lesz a történet helyszíne', location: 'Dani bicikliműhelye', art: 'workshop',
  paragraphs: [
    'Dani felemeli a piros pad egyik végét. A fecskefarkú javítás és a két kezdőbetű ugyanaz, mint a régi filmen. A szín változott, a tárgy nem.',
    'A mozgatható képtáblán a próba, az elpakolás és az esti kapuzárás külön képet kap. A csoport továbbindulhat, a műhely bejárata szabad marad.',
  ],
  variants: [{ when: { route: 'workshop' }, paragraphs: ['Ezt a javítást te ismerted fel először; most megmutathatod a többieknek.'] }],
  choices: [{ id: 'walk-from-workshop', label: 'Próbáljuk ki a következő megállót.', to: 'walk-door', set: { walkWorkshopChecked: true }, clue: 'Dani a hosszabb séta műhelymegállójában segít.' }],
});

add('walk-door', {
  title: 'A pékség ajtaja előtt', chapter: 'A város lesz a történet helyszíne', location: 'A pékség és a tér', art: 'walk',
  paragraphs: [
    'A próbajáráson észreveszed, hogy a tervezett megálló éppen a pékség ajtaját takarja. Eszter kocsija akkor sem férne ki, ha az udvarban jó a rend.',
    'Hová álljon a csoport, hogy a nyomot jól lássa, és a bejárat is szabad maradjon?',
  ],
  choices: [
    { id: 'walk-wide', label: 'Álljunk az utca szélesebb részére.', to: 'walk-ending', set: { walkStop: 'wide' }, clue: 'A csoport a tér szélesebb részéről figyeli meg a kaput.' },
    { id: 'walk-small', label: 'Előbb mutassuk a képtáblát, majd kisebb csoportban lépjünk közelebb.', needs: [{ walkWorkshopChecked: true }, { pictureStrip: true }], lockHint: 'Ehhez képtábla vagy képsor kell: a műhelyben vagy a könyvtárban készülhet.', to: 'walk-ending', set: { walkStop: 'small' }, clue: 'A pékség bejárata a kisebb csoportos megfigyelésnél is szabad marad.' },
  ],
});

add('walk-ending', {
  title: 'A történet, amely mellett eddig elmentünk', chapter: 'A történetséta', location: 'A tér, a zöld kapu és a könyvtár', art: 'walk',
  paragraphs: [
    'Mira felemeli a régi képet a tér szélén. Valaki a számot, más a színt keresi. Te a három vaslevélre és a félköríves ablakra mutatsz: a kék 12-es ma zöld 18-as.',
    'A kapunál Eszter a régi helyére áll, majd odébb lép, hogy a kocsi elférjen. „Ez a rész nem látszott a filmen.”',
    'A könyvtárban újra levetítik a régi felvételt. Ugyanott ér véget, mint délután. Most már mindenki tudja, hol volt az az „itt”, és miért nem készült el az utolsó jelenet.',
  ],
  variants: [
    { when: { layout: 'wall' }, paragraphs: ['Az udvarban a fal mellé fordított pad mellett megmutatod a kocsi szabad kanyarját.'] },
    { when: { layout: 'later' }, paragraphs: ['A séta a rakodás után ér a kapuhoz; a krétával jelölt átjáró végig szabad.'] },
    { when: { layout: 'library' }, paragraphs: ['A kapunál csak rövid ideig álltok meg. A hosszabb elmesélés a könyvtár udvarában kap helyet.'] },
    { when: { retelling: 'enact' }, paragraphs: ['A kapunál három egyszerű mozdulattal mutatjátok meg a próbát, az elpakolást és az esti zárást.'] },
    { when: { retelling: 'frame' }, paragraphs: ['A régi kép után félrelépsz, és az egész udvarra mutatsz: a forduló is a történet része.'] },
    { when: { mapReady: true }, paragraphs: ['A könyvtári térképet a bejárt állomások alapján pontosítottad, mielőtt a csoport elindult.'] },
    { when: { sidePassage: true }, paragraphs: ['Az átszámozási rajzon megtalált oldalsó átjárót is megmutatod, de a csoport csak a szabad, kipróbált úton halad.'] },
    { when: { walkRoute: 'short' }, paragraphs: ['A három rövid megállóban egy-egy erős nyomra marad idő.'] },
    { when: { walkRoute: 'long' }, paragraphs: ['A műhelyben Dani a pad javított lábát is megmutatja; a képtáblán együtt rakjátok sorba a napot.'] },
    { when: { walkStop: 'wide' }, paragraphs: ['A csoport a tér szélesebb részéről nézi a kaput, a pékség ajtaja szabad.'] },
    { when: { walkStop: 'small' }, paragraphs: ['Előbb a képtáblát nézik, majd néhányan lépnek közelebb; Eszter kocsija szabadon kijut.'] },
  ],
  choices: [{ id: 'walk-epilogue', label: 'Nézzük meg, mi maradt velünk.', to: 'epilogue' }],
  ending: 'walk',
});

add('epilogue', {
  title: 'A mi folytatásunk', chapter: 'Emlékezés', location: 'A könyvtár kis udvara', art: 'library',
  paragraphs: [
    'Mira maga elé teszi a kapu képét, a pad rajzát és a füzetet. A közelebbről megismert nyomra mutat.',
    '„Én az elején azt hittem, valaki eldugta a film végét. Végül nekünk kellett kitalálni, mi legyen utána.”',
  ],
  recap: [
    { when: { route: 'street' }, text: 'A kaput a régi vaslevelek és az ablak alapján találtad meg.' },
    { when: { route: 'workshop' }, text: 'A padot a javított láb és a kezdőbetűk alapján azonosítottad.' },
    { when: { route: 'archive' }, text: 'A három kép és a füzet megmutatta az események valódi sorrendjét.' },
    { when: { ending: 'film' }, text: 'A mai filmen új jelenet készült, világosan elkülönítve a régi felvételtől.' },
    { when: { ending: 'theatre' }, text: 'Az élő előadásban a nézők együtt rakták össze a három emléket.' },
    { when: { ending: 'walk' }, text: 'A sétán a régi képekhez valódi, bejárható helyek társultak.' },
  ],
  choices: [
    { id: 'recall-clue', label: 'A legjobb nyomot nézzük meg még egyszer.', to: 'recall-clue' },
    { id: 'recall-help', label: 'Mutasd meg, mi lett azzal, amiben segítettünk.', to: 'recall-help' },
  ],
  ending: 'recap',
});

add('recall-clue', {
  title: 'A legjobb nyom', chapter: 'Emlékezés', location: 'A könyvtár kis udvara', art: 'archive',
  paragraphs: ['A régi film utolsó képe nem rejtett befejezés. Egy kérdés volt, amelyre a helyek, a tárgyak és az emberek együtt adtak választ.'],
  variants: [
    { when: { route: 'street' }, paragraphs: ['A 12-es kék kapu ma 18-as és zöld. A vaslevelek és az ablak régi helyükön maradtak.'] },
    { when: { route: 'workshop' }, paragraphs: ['A kék pad piros lett, de a fecskefarkú javítás és a két kezdőbetű megmaradt.'] },
    { when: { route: 'archive' }, paragraphs: ['Előbb a próba, utána a délutáni elpakolás, végül az esti kapuzárás történt. Az utolsó jelenetet soha nem forgatták le.'] },
  ],
  choices: [{ id: 'clue-back', label: 'Vissza Mirához.', to: 'epilogue' }], ending: 'recap',
});

add('recall-help', {
  title: 'Amit együtt készítettetek', chapter: 'Emlékezés', location: 'A könyvtár kis udvara', art: 'library',
  paragraphs: ['Az esti esemény után az emberek elpakolnak, de a kipróbált ötleteket megtartják a következő közös alkalomra.'],
  variants: [
    { when: { ending: 'film' }, paragraphs: ['Valaki a mai filmet nézi újra, és felismeri, hol maradt szabad a kocsi kanyarja.'] },
    { when: { ending: 'theatre' }, paragraphs: ['Mira félreteszi a bábokat vagy képtáblákat. Juli és Dani még a képek előtt beszélgetnek.'] },
    { when: { ending: 'walk' }, paragraphs: ['Egy új néző a térképet követve a három vaslevél alapján maga találja meg a zöld kaput.'] },
  ],
  choices: [{ id: 'help-back', label: 'Vissza Mirához.', to: 'epilogue' }], ending: 'recap',
});

export const STORY_ENDINGS = ['film', 'theatre', 'walk'];
export const STORY_ROUTES = ['street', 'workshop', 'archive'];
// Stamp collection labels (shown, not spoken). The first close look points to a route.
export const STORY_ROUTE_INFO = { street: { label: 'Kapu', icon: '🚪', clue: 'gate' }, workshop: { label: 'Pad', icon: '🪑', clue: 'bench' }, archive: { label: 'Füzet', icon: '📓', clue: 'notebook' } };
export const STORY_ENDING_INFO = { film: { label: 'Film', icon: '🎬' }, theatre: { label: 'Előadás', icon: '🎭' }, walk: { label: 'Séta', icon: '🚶' } };

export const STORY_FEEDBACK = {
  inspectInvalid: clip('feedback.inspectInvalid', 'Válassz egy látható részletet a képkockán; utána indulhatunk tovább.'),
  orderInvalid: clip('feedback.orderInvalid', 'Mindhárom képet tedd sorba. Nézd meg újra az órát és a pékség redőnyét.'),
  orderWrong: clip('feedback.orderWrong', 'Mira megáll: a kapuzárós képen már este hét van. A padot negyed ötkor vitték el. Próbáld újra!'),
  layoutInvalid: clip('feedback.layoutInvalid', 'Válassz egy elrendezést, és próbáljuk ki a kocsi útját.'),
  layoutWrongStraight: clip('feedback.layoutWrongStraight', 'Az egyenes sávon elfér a kocsi, de a belső kanyarnál megakad. Hagyj helyet a fordulónak is!'),
  layoutWrongCrosswise: clip('feedback.layoutWrongCrosswise', 'A keresztbe állított dobogó elzárja az átjárót. Keress más helyet a padnak!'),
  propsInvalid: clip('feedback.propsInvalid', 'Pontosan három különböző felajánlott tárgyat válassz a mai filmhez.'),
  propsDone: clip('feedback.propsDone', 'Megvan a három tárgy. A szabad átjárót meghagyva kezdődhet a mai jelenet.'),
  orderDone: clip('feedback.orderDone', 'Így történt: próba, délutáni elpakolás, majd esti kapuzárás.'),
  layoutDone: clip('feedback.layoutDone', 'Most a kocsi be tud fordulni, és a lakók kijárata is szabad.'),
  alreadyDone: clip('feedback.alreadyDone', 'Ezt a nyomot már ellenőrizted. Válaszd a következő lépést.'),
  noActivity: clip('feedback.noActivity', 'Itt nincs megoldandó feladat. Válassz egy történetlépést.'),
};

// The journal uses IDs so two distinct decisions with similar text remain distinguishable.
export const STORY_CLUES = Object.fromEntries([
  ['inspect:gate', { title: 'A kapu részlete', text: STORY_SCENES['film-stop'].activity.items[0].detail, artKey: 'street' }],
  ['inspect:bench', { title: 'A pad javítása', text: STORY_SCENES['film-stop'].activity.items[1].detail, artKey: 'workshop' }],
  ['inspect:notebook', { title: 'A filmklub füzete', text: STORY_SCENES['film-stop'].activity.items[2].detail, artKey: 'archive' }],
  ['order:archive-envelope', { title: 'A képek sorrendje', text: 'A berendezési próba után délután elpakoltak. Juli csak a szokásos esti időben zárta be a kaput.', artKey: 'archive' }],
  ['order:court-memory', { title: 'A közös bizonyíték', text: 'A három fotó és az óra szerint a berendezési próba után délután elpakoltak; Juli csak este zárta be a kaput.', artKey: 'courtyard' }],
  ['layout:court-practice', { title: 'A működő udvar', text: 'A padot a fal mellé fordítva a kocsi be tud kanyarodni, a lakók kijárata is szabad.', artKey: 'courtyard' }],
  ['props:film-props', { title: 'A mai film három tárgya', text: 'A választott három tárgy a mai záróképre kerül.', artKey: 'film' }],
  ...Object.values(STORY_SCENES).flatMap((scene) => scene.choices.filter((choice) => choice.clue).map((choice) => [
    `choice:${choice.id}`, { title: choice.label.replace(/[.!?]$/, ''), text: choice.clue, artKey: scene.art },
  ])),
].map(([id, clue]) => [id, { id, ...clue }]));
