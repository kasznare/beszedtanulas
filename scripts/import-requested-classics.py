"""Import three complete MEK texts; preserve every verse line and stanza.

Original responses persist outside Git. --check compares the saved source again.
Requires BeautifulSoup and lxml only for this one-time content preparation.
"""
import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path.home() / '.config/beszedtanulas/requested-classics-sources'
ROWS = [
    ('classic-palko', 'Gyöngyvirág Palkó', 'Benedek Elek', 'Mese', '🌼',
     'https://mek.oszk.hu/00200/00232/html/02.htm', '32', '33', 1929,
     'https://mek.oszk.hu/00200/00232/cimkes.html', 74, 74),
    ('classic-fulemile', 'A fülemile', 'Arany János', 'Vers', '🐦',
     'https://mek.oszk.hu/00500/00597/html/vs185302.htm', '19', None, 1882,
     'https://mek.oszk.hu/00500/00597/cimkes.html', 10, 160),
    ('classic-arany-lacinak', 'Arany Lacinak', 'Petőfi Sándor', 'Vers', '🦋',
     'https://mek.oszk.hu/01000/01006/html/vs184703.htm', '53', '54', 1849,
     'https://mek.oszk.hu/01000/01006/cimkes.html', 2, 72),
]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def extract(raw, anchor, following, kind):
    html = raw.decode('iso-8859-2')
    match = re.search(r'<a name=["\']?' + anchor + r'["\']?>', html, re.I)
    assert match, 'Missing start anchor'
    section = html[match.start():]
    if following:
        end = re.search(r'<a name=["\']?' + following + r'["\']?>', section, re.I)
        assert end, 'Missing next work boundary'
        section = section[:end.start()]
    # Isolating the anchor interval first avoids old HTML's unclosed paragraph
    # tags swallowing later poems. BR is a verse line; P is a stanza.
    soup = BeautifulSoup(section, 'lxml')
    paragraphs = []
    for p in soup.find_all('p'):
        if kind == 'Mese' and p.get('align') != 'JUSTIFY':
            continue
        if kind == 'Vers' and (p.find('h3') or p.find('hr')):
            continue
        fragment = re.sub(r'<br\s*/?>\s*', '\n', str(p), flags=re.I)
        text = BeautifulSoup(fragment, 'lxml').get_text()
        text = '\n'.join(' '.join(line.split()) for line in text.splitlines()).strip()
        if not text:
            continue
        if text == '(1854)' or text.startswith('Szalonta,'):
            break  # Editorial date/place, recorded separately, outside the poem.
        paragraphs.append(text)
    return '\n\n'.join(paragraphs) + '\n', paragraphs

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    source = ROOT / 'content/stories'
    catalog = json.loads((source / 'catalog.json').read_text())
    previous = {e['id']: e for e in catalog['stories']}
    entries, reader, evidence = [], [], []
    for id, title, author, kind, emoji, url, anchor, following, died, bio, blocks, lines in ROWS:
        archive = CACHE / (id + '.html')
        if not archive.exists():
            if args.check:
                raise RuntimeError('Saved original source missing')
            archive.write_bytes(urllib.request.urlopen(url, timeout=60).read())
        raw = archive.read_bytes()
        text, paragraphs = extract(raw, anchor, following, kind)
        assert len(paragraphs) == blocks
        assert len([line for line in text.splitlines() if line.strip()]) == lines
        file = 'requested-classics/' + id + '.txt'
        entry = {'id': id, 'title': title, 'author': author, 'kind': kind, 'emoji': emoji,
                 'file': file, 'sourceUrl': url + '#' + anchor,
                 'collection': 'Magyar klasszikusok', 'ageRange': [5, 8],
                 'illustrated': True, 'visualClock': 'recording',
                 'audioStatus': previous.get(id, {}).get('audioStatus', 'pending'),
                 'words': len(text.split()), 'characters': len(text.rstrip('\n')),
                 'paragraphs': blocks, 'lines': lines, 'sha256': sha(text.encode()),
                 'rights': {'status': 'public-domain', 'authorDiedYear': died,
                            'biographyUrl': bio, 'ruleUrl': 'https://njt.jog.gov.hu/jogszabaly/1999-76-00-00',
                            'basis': 'A szerző halálát követő hetven év eltelt; eredeti magyar szöveg, modern átdolgozás nélkül.'},
                 'sourceNote': 'OSZK MEK teljes mű, saját címhorgonytól a következő műig. Eredeti írásmód és központozás; csak HTML-formázás és környező szóközök rendezve. Minden BR verssor és minden P versszak megmarad.',
                 'opening': paragraphs[0], 'ending': paragraphs[-1]}
        if id == 'classic-fulemile':
            entry.update(searchAliases=['A fülemüle'], sourceDate='1854',
                         sourceNote=entry['sourceNote'] + ' Az eredeti * elválasztó is megmarad; a mű alatti (1854) dátum metaadat.')
        if id == 'classic-arany-lacinak':
            entry['sourceDate'] = 'Szalonta, 1847. június 1-10'
        if args.check:
            assert (source / file).read_text() == text
            assert previous[id]['sha256'] == entry['sha256']
        else:
            (source / file).parent.mkdir(exist_ok=True)
            (source / file).write_text(text)
        entries.append(entry)
        reader.append({**entry, 'text': text.rstrip('\n')})
        evidence.append({'id': id, 'sourceUrl': entry['sourceUrl'], 'sourceSha256': sha(raw),
                         'textSha256': entry['sha256'], 'boundary': {'startAnchor': anchor, 'nextAnchor': following},
                         'paragraphs': blocks, 'nonemptyLines': lines, 'sourceBytes': len(raw)})
        print(f'{title}: {entry["characters"]} characters, {blocks} blocks, {lines} lines')
    if args.check:
        return
    ids = {e['id'] for e in entries}
    catalog['stories'] = [e for e in catalog['stories'] if e['id'] not in ids] + entries
    (source / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    (source / 'requested-classics-sources.json').write_text(json.dumps({'version': 1, 'retrievedOn': '2026-10-12', 'stories': evidence}, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'requested-classics.js').write_text('// Complete public-domain MEK texts, including works awaiting audio.\nexport const REQUESTED_CLASSICS = ' + json.dumps(reader, ensure_ascii=False, indent=2) + ';\n')

if __name__ == '__main__':
    main()
