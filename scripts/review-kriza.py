"""Inventory the requested 1961 Kriza edition without publishing adapted text.

Full source and all three numbered hazug tales stay outside Git. No TTS calls.
The old manuscript or edition permission must be verified before publication.
"""
import json
import re
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup
from elevenlabs_voice import CONFIG, TOKEN, sha

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path.home() / '.config/beszedtanulas/kriza-source-review'
URL = 'https://mek.oszk.hu/00200/00237/00237.htm'

def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    archive = CACHE / 'mek-00237-original.html'
    if not archive.exists():
        archive.write_bytes(urllib.request.urlopen(URL, timeout=60).read())
    raw = archive.read_bytes()
    html = raw.decode('iso-8859-2')
    pronunciation = json.loads((ROOT / 'voice-pronunciation.json').read_text())['words']
    rows = []
    for id, title, anchor, following in [
        ('kriza-fortelyos', 'A fortélyos leány', '10', '11'),
        ('kriza-asszony-ordog', 'Az egyszeri asszony meg az ördög', '17', '18'),
        ('kriza-harom-hazug', 'Három hazug mese', '22', None),
    ]:
        start = re.search(r'<a name=["\']?' + anchor + r'["\']?>', html, re.I)
        fragment = html[start.end():]
        if following:
            fragment = fragment[:re.search(r'<a name=["\']?' + following + r'["\']?>', fragment, re.I).start()]
        paragraphs = []
        for p in BeautifulSoup(fragment, 'lxml').find_all('p'):
            text = ' '.join(p.get_text(' ', strip=True).split())
            if not text or (p.get('align') == 'CENTER' and text not in ['1', '2', '3', '1.', '2.', '3.']):
                continue
            paragraphs.append(text)
        text = '\n\n'.join(paragraphs) + '\n'
        if anchor == '22':
            numbers = [p.rstrip('.') for p in paragraphs if p in ['1', '2', '3', '1.', '2.', '3.']]
            assert numbers == ['1', '2', '3'], numbers
        (CACHE / (id + '.txt')).write_text(text)
        displayed = title + '\n\n' + text.rstrip('\n')
        spoken = TOKEN.sub(lambda m: '/' + pronunciation[m.group().lower()] + '/' if m.group().lower() in pronunciation else m.group(), displayed)
        (CACHE / (id + '.plan.json')).write_text(json.dumps({'id': id, 'displayText': displayed, 'spokenText': spoken,
            'config': CONFIG, 'providerCharacters': len(spoken), 'rightsStatus': 'edition-review-required'}, ensure_ascii=False, indent=2) + '\n')
        row = {'id': id, 'title': title, 'author': 'Kriza János gyűjtése', 'kind': 'Mese', 'emoji': '🧩',
            'collection': 'Székely furfangos mesék', 'description': 'Tréfás székely népmese furfangról és talpraesettségről.',
            'tags': ['székely', 'furfangos', 'tréfás'], 'sourceUrl': URL + '#' + anchor,
            'audioStatus': 'rights-pending', 'illustrated': False, 'providerCharacters': len(spoken),
            'rights': {'status': 'edition-review-required', 'collectorDiedYear': 1875, 'editionYear': 1961,
                'editor': 'Kovács Ágnes', 'basis': 'Az 1961-es kiadás stiláris átdolgozás; a gyűjtő közkincs státusza nem igazolja önmagában ennek a változatnak újraközlését.',
                'editionUrl': 'https://vmek.oszk.hu/00200/00237/cimkes.html',
                'adaptationEvidence': 'https://nti.abtk.hu/images/adattar/mese/mnk8.pdf',
                'originalManuscriptEvidence': 'https://real.mtak.hu/33056/1/Domokos_pdfa.pdf'},
            'sourceNote': 'A teljes MEK-szöveg magán forrásellenőrzési cache-ben megőrizve, nincs a webhelyen vagy Gitben; publikálás és hanggenerálás eredeti forrásra vagy jogengedélyre vár.',
            'reviewCharacters': len(text.rstrip('\n')), 'reviewParagraphs': len(paragraphs), 'reviewTextSha256': sha(text.encode())}
        if anchor == '22':
            row['partsInWork'] = 3
        rows.append(row)
        print(f'{title}: {row["reviewCharacters"]} displayed / {len(spoken)} provider characters, {len(paragraphs)} blocks; edition review required')
    ids = {r['id'] for r in rows}
    path = ROOT / 'content/stories/catalog.json'
    catalog = json.loads(path.read_text())
    catalog['stories'] = [e for e in catalog['stories'] if e['id'] not in ids] + rows
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    reader = [{**row, 'text': 'A teljes mű jogszerűen publikálható, eredeti lejegyzésének ellenőrzése folyamatban. A megadott MEK-kiadás modern átdolgozást tartalmaz.'} for row in rows]
    (ROOT / 'kriza-requested.js').write_text('// Metadata only; adapted texts stay in a private source-review cache.\nexport const KRIZA_REQUESTED = ' + json.dumps(reader, ensure_ascii=False, indent=2) + ';\n')
    (ROOT / 'content/stories/kriza-source-review.json').write_text(json.dumps({'version': 1, 'reviewedOn': '2026-10-12',
        'sourceSha256': sha(raw), 'reviewOnly': True, 'privateCache': '~/.config/beszedtanulas/kriza-source-review/', 'stories': rows,
        'checkedOldSources': ['https://mek.oszk.hu/11500/11577/11577.htm', 'https://mek.oszk.hu/07000/07022/07022.htm', 'https://mek.oszk.hu/21100/21111/21111.htm'],
        'oldSourceResult': 'A három kért teljes változat nem szerepel ezekben a régi kötetekben; eltérő meséket nem helyettesítettünk a kért címekkel.'}, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
