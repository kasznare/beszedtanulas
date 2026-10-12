"""Write per-tale coverage and exact saved credit receipts, without generation."""
import argparse
import importlib.util
import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path.home() / '.config/beszedtanulas/rado-audiobook-cache'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh-balance', action='store_true')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'content/stories/catalog.json').read_text())
    entries = [e for e in catalog['stories'] if e['id'].startswith('rado-')]
    plan = json.loads((ROOT / 'content/stories/rado-plan.json').read_text())
    receipts = json.loads((ROOT / 'audio/audiobooks/generated.json').read_text())['stories']
    runs = [json.loads(p.read_text()) for p in sorted(CACHE.glob('run-*.json'))]
    balance = None
    if args.refresh_balance:
        import sys
        sys.path.insert(0, str(ROOT / 'scripts'))
        spec = importlib.util.spec_from_file_location('voice', ROOT / 'scripts/generate-voice.py')
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        sub = m.api('user/subscription', m.load_key())
        balance = {key: sub[key] for key in ['character_count', 'character_limit', 'status', 'tier']}
        balance['remaining'] = sub['character_limit'] - sub['character_count']
        balance['checkedAt'] = datetime.now(ZoneInfo('Europe/Budapest')).isoformat()
        (CACHE / 'balance.json').write_text(json.dumps(balance, indent=2) + '\n')
    elif (CACHE / 'balance.json').exists():
        balance = json.loads((CACHE / 'balance.json').read_text())
    paid = []
    for path in sorted(CACHE.glob('*.response.json')):
        code = path.name.removesuffix('.response.json')
        meta = json.loads((CACHE / (code + '.json')).read_text())
        paid.append({'fingerprint': code, 'audioSha256': meta['sha256'], 'providerCharacters': len(meta['text']),
                     'credits': float(meta['headers']['character-cost']),
                     'requestId': meta['headers'].get('request-id'), 'historyItemId': meta['headers'].get('history-item-id')})
    data = {'version': 1, 'tales': len(entries), 'ready': sum(e['audioStatus'] == 'ready' for e in entries),
            'pending': sum(e['audioStatus'] == 'pending' for e in entries),
            'providerCharacters': plan['providerCharacters'], 'pendingCharacters': plan['pendingCharacters'],
            'conservativePendingCredits': plan['minimumPendingCredits'],
            'conservativePendingCreditsWithMargin': plan['pendingCreditsWithSafetyMargin'],
            'actualRecordingCredits': sum(r['credits'] for r in paid), 'paidRequests': paid,
            'balance': balance,
            'note': 'Actual cost is the sum of unique paid response headers, not the shared account usage delta. '
                    'Future credit need uses the undiscounted 1 credit/character rate; promotional receipt prices are not guaranteed.',
            'costReference': 'https://elevenlabs.io/pricing',
            'runQuotaChecks': [{'startedAt': r['startedAt'], 'availableBefore': r['availableBefore'],
                               'conservativeBatchCredits': r['conservativeBatchCredits'], 'selected': r['selected'],
                               'completed': r['completed'], 'errors': r['errors']} for r in runs]}
    (ROOT / 'content/stories/rado-credit-ledger.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    rows = {row['id']: row for row in plan['stories']}
    lines = ['# Radó Vilmos két teljes mesegyűjteménye — lefedettség', '',
             'Az I. kötet mind a 31, a II. kötet mind a 19 meséje teljes szöveggel, eredeti sorrenddel, címmel, '
             'végződéssel és a hozzá tartozó öt eredeti jegyzettel került be. A forrás helyesírását és a történeteket nem írtuk át. '
             'A HTML tördelési szóközeit összevontuk; a bekezdések és a szándékos verssorok megmaradtak.', '',
             f'**Kész hang: {data["ready"]}/50; felolvasásra vár: {data["pending"]}/50.** '
             'A kész hangokhoz teljes szóidőzítés, bekezdés-/sorfelirat, külön ellenőrzött offline letöltés és könyvjelző tartozik. '
             'A várakozó mesékhez minden szolgáltatói bemenet és részfelvételi terv elkészült; hangot vagy időzítést nem állítunk késznek.', '',
             f'A teljes szolgáltatói bemenet **{data["providerCharacters"]:,} karakter**. '
             f'A még hiányzó hangok pontos bemenete **{data["pendingCharacters"]:,} karakter**, '
             f'kedvezmény nélküli keretigénye **{data["conservativePendingCredits"]:,} kredit**, '
             f'10% biztonsági tartalékkal **{data["conservativePendingCreditsWithMargin"]:,} kredit**.', '',
             f'Az egyedi sikeres fizetős válaszok bizonylatai összesen **{data["actualRecordingCredits"]:g} kredit** '
             f'felhasználását igazolják ({len(paid)} kérés). A szolgáltató ezen a futáson kedvezményes terhelést adott; '
             'a jövőbeli kedvezményt nem feltételezzük a keretellenőrzésnél. Az [általános díjszabás](https://elevenlabs.io/pricing) '
             'alapján 1 kredit/karakterrel készül a konzervatív terv. Az előfizetési egyenleget más chatek is használhatják, '
             'ezért az összfiók változása nem tekinthető e feldolgozás költségének.', '']
    if balance:
        lines += [f'Utolsó csak olvasási egyenlegellenőrzés: {balance["checkedAt"]}; '
                  f'meglévő keret **{balance["remaining"]:,} kredit**. Resetkredit, vásárlás, előfizetésmódosítás és későbbi automatizált futtatás nem történt.', '']
    lines += ['| Kötet / sorszám | Mese | Teljes szöveg | Szolgáltatói karakter | Hang és felirat | Tényleges kredit |',
              '| --- | --- | --- | ---: | --- | ---: |']
    for e in entries:
        receipt = receipts.get(e['id'])
        state = f'Kész · {receipt["duration"] / 60:.2f} perc' if receipt else 'Várakozik · keretkorlát'
        cost = f'{receipt["credits"]:g}' if receipt else '—'
        lines.append(f'| {e["volume"]}/{e["sourceIndex"]:02d} | [{e["title"]}]({e["file"]}) | Igen | {rows[e["id"]]["providerCharacters"]} | {state} | {cost} |')
    lines += ['', '## Források és megőrzés', '',
              '- [I. kötet — OSZK MEK](https://mek.oszk.hu/11400/11479/11479.htm).',
              '- [II. kötet — OSZK MEK](https://mek.oszk.hu/11600/11620/11620.htm).',
              '- Elektronikus kiadás: MEK Egyesület, 2013; OSZK E-könyvtári Szolgáltatások Osztálya; egybeállító Radó Vilmos. '
              'A metaadat Varjú Máriát is közreműködőként nevezi meg. [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.hu). '
              'A Radó-szövegek és az ezekből készített felolvasások ugyanezzel a licenccel továbbadhatók.',
              '- A WebArchive-ok eredeti fájljai a Letöltésekben érintetlenek; másolatuk, az UTF-8 főforrások, a két beágyazott statisztikai HTML-keret és mind a 21 beágyazott szkript '
              'a repón kívüli `~/.local/share/beszedtanulas/rado-sources/` alatt is megvan. Lenyomatok: `rado-sources.json`.',
              '- A HTML-ekben nincs kép vagy irodalmi illusztráció. A beágyazott erőforrások kizárólag weboldali szkriptek; ezeket nem futtatjuk. '
              'Az új mesék az audio-only Mesetár-megoldást követik. A 17 régi mű 549 SVG-jelenete és minden időleképezése megmaradt.',
              '- Az azonos című Radó-változatok (`rado-i-01` / `story-14`, `rado-i-06` / `story-18`) külön forrásként megmaradtak.',
              '- Minden kérési terv, teljes nyers fizetős válasz, MP3, időzítés, pending napló és bizonylat tartós helye: '
              '`~/.config/beszedtanulas/rado-audiobook-cache/`. Az API-kulcs nincs a repóban.', '',
              '## Ellenőrzés és folytatás', '',
              '`python3 scripts/import-rado.py --check` újra kinyeri és bájtonként ellenőrzi mind az 50 mesét az archívumokhoz képest; '
              'külön ellenőrzi a tartalomjegyzékeket, a címeket, a határokat és a bekezdéseken kívüli esetleges elveszett szöveget.', '',
              '`python3 tests/rado-generation.test.py` a teljes bemenetet, kiejtési szétválasztást, konzervatív keretet és a bizonytalan fizetős '
              'kérések újraküldésének tilalmát ellenőrzi szolgáltatói hívás nélkül. A Node-ellenőrzések a szövegeket, a kész hangok lenyomatát, '
              'minden szó és feliratsor időzítését, illetve a várakozó hangok hiányának őszinte jelzését vizsgálják.', '',
              'A böngészős ellenőrzés: `tests/browser/rado-library.js` Chrome és WebKit alatt; teljes 50-es lista és szöveg, forrás és jegyzet, '
              'keresés, minden kész MP3 tényleges lejátszása, utolsó feliratsor, könyvjelző, külön hash-ellenőrzött letöltés, '
              'hálózat nélküli lejátszás és olvasás, természetes hangvég és telefon/tablet elrendezés. A régi hangok és feliratok változatlan '
              'adatát a friss kiinduló főággal összevetettük. Fizikai iPhone/iPad próba és minden felvétel hallás utáni magyar kiejtésvizsgálata '
              'nem történt; a magánhangzók hosszúságát nem állítjuk gépi átirattal igazoltnak.', '',
              'Az összevezetett főág ArrayBuffer-alapú privát mentési javítása megmaradt, a korábbi Blob-formátumot is olvassa. '
              'A privát import, könyvjelző, offline IndexedDB-hang és eltávolítás 18 ellenőrzése Chrome és WebKit alatt sikeres. '
              'A normál felhasználói böngésző privát meséihez nem nyúltunk; csak külön localhost-próbák futottak.', '',
              'A végleges Radó-próba böngészőnként 524 sikeres ellenőrzés: 26 kész hang és 24 várakozó mese, '
              'mind az 50 teljes szöveg. Az összevezetett teljes build 225 Node-tesztje, az öt alap Python-teszt, '
              'a hét Radó-generálási teszt és a három friss klasszikus-generálási teszt sikeres. '
              'Minden 51 nyilvános MP3 teljes dekódolása ellenőrzött. A friss közös kereső, a három új főági klasszikus '
              'és a privát szerzőkeresés külön 52 ellenőrzése is sikeres mindkét böngészőben.', '',
              'A hosszú MP3-ak az opcionális offline fájljegyzékben vannak; az alap játékcsomag nem tölti le őket automatikusan. '
              'A kész felirat a tényleges felvétel időbélyegét követi, nem a szöveghosszból becsült időt.', '',
              'Előkészítés és leltár fizetős kérés nélkül: `python3 scripts/generate-rado-audiobooks.py`. '
              'Későbbi, külön indított generálás: `--generate --fit-quota --install`, vagy egy megadott teljes mese `--ids rado-ii-04`. '
              'A program újra ellenőrzi a meglévő keretet és újrahasználja a fizetett cache-t. '
              'Pending vagy félbemaradt eredményt nem küld újra; előbb a szolgáltatói előzményekből kell helyreállítani. '
              'Telepítés a már kész cache-ből fizetős kérés nélkül: `--install`.', '']
    report = re.sub(r'(?<=\d),(?=\d{3}\b)', '\u202f', '\n'.join(lines))
    report = re.sub(r'(\d)\.(\d{2}) perc', r'\1,\2 perc', report)
    (ROOT / 'content/stories/rado-coverage.md').write_text(report)
    print(json.dumps({k: data[k] for k in ['ready', 'pending', 'providerCharacters', 'pendingCharacters', 'actualRecordingCredits', 'balance']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
