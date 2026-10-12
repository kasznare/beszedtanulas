"""Import the two requested complete tales from archived MEK HTML, without adaptation."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path.home() / '.config/beszedtanulas/kriza-source-review'
ROWS = [
    ('szekely-csillagszemu-juhasz', 'A csillagszemű juhász', 'Benedek Elek', '🌟', '04865', '100', '101', 'iso-8859-2'),
    ('szekely-seprukoto-jakab', 'Seprűkötő Jakab', 'Székely népmese', '🧹', '21111', '8', '9', 'utf-8'),
]
def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def extract(raw, anchor, following, encoding, title):
    html = raw.decode(encoding)
    start = re.search(r'<a name=["\']?' + anchor + r'["\']?>', html, re.I)
    assert start, 'Missing story anchor'
    end = re.search(r'<a name=["\']?' + following + r'["\']?>', html[start.end():], re.I)
    assert end, 'Missing next-story boundary'
    section = html[start.end():start.end() + end.start()]
    soup = BeautifulSoup(section, 'lxml')
    for element in soup(['script', 'style']):
        element.decompose()
    # The linked asterisk belongs to the volume's glossary, not the tale.
    notes = 0
    for link in soup.find_all('a'):
        if link.get_text(strip=True) == '*':
            notes += 1
            link.decompose()
    blocks = []
    for paragraph in soup.find_all('p'):
        if paragraph.get('align', '').lower() not in ('justify', 'left'):
            continue
        for br in paragraph.find_all('br'):
            br.replace_with('\u241f')
        text = '\n'.join(' '.join(line.split()) for line in paragraph.get_text().split('\u241f')).strip()
        if text:
            blocks.append(text)
    # Also inspect all non-paragraph text: there must be no omitted prose.
    for paragraph in soup.find_all('p'):
        paragraph.decompose()
    remainder = ' '.join(soup.get_text().split())
    assert not remainder or remainder.casefold() == title.casefold(), 'Unexpected text outside source paragraphs'
    assert blocks and not any('*' in text for text in blocks)
    return '\n\n'.join(blocks) + '\n', blocks, notes

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    source = ROOT / 'content/stories'
    catalog = json.loads((source / 'catalog.json').read_text())
    previous = {entry['id']: entry for entry in catalog['stories']}
    entries, reader, evidence = [], [], []
    for id, title, author, emoji, number, anchor, following, encoding in ROWS:
        raw = (CACHE / ('mek-' + number + '-original.html')).read_bytes()
        text, blocks, notes = extract(raw, anchor, following, encoding, title)
        url = f'https://mek.oszk.hu/{number[:3]}00/{number}/{number}.htm#{anchor}'
        rights = {'status': 'public-domain', 'authorDiedYear': 1929,
                  'basis': 'Benedek Elek eredeti magyar szövege; a szerző halálát követő hetven év eltelt.'}
        if number == '21111':
            assert 'https://creativecommons.org/licenses/by-sa/4.0/' in raw.decode(encoding)
            rights = {'status': 'licensed', 'license': 'CC BY-SA 4.0',
                      'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/deed.hu',
                      'attribution': 'Székely népmesék (ÁGISZ, Brassó, 1937), R. Berde Mária előszavával. Elektronikus kiadás: Magyar Elektronikus Könyvtárért Egyesület / OSZK, 2021 (MEK-21111).',
                      'changes': 'A teljes történet eredeti írásmóddal; HTML-formázás rendezve. Jessa gépi felolvasás és saját illusztráció/animáció. A történet szövege, felvétele és új jelenetei CC BY-SA 4.0 alatt továbbadhatók.'}
        entry = {'id': id, 'title': title, 'author': author, 'kind': 'Mese', 'emoji': emoji,
                 'collection': 'Székely furfangos mesék', 'tags': ['székely', 'furfangos', 'legény', 'férfi főhős'],
                 'description': 'A furfangos juhász próbái a király udvarában.' if number == '04865' else 'Jakab tréfás vállalásai a király udvarában.',
                 'file': 'szekely/' + id + '.txt', 'sourceUrl': url, 'rights': rights,
                 'audioStatus': previous.get(id, {}).get('audioStatus', 'pending'),
                 'illustrated': True, 'visualClock': 'recording', 'requestPartCharacters': 4000,
                 'characters': len(text.rstrip('\n')), 'words': len(text.split()),
                 'paragraphs': len(blocks), 'lines': len([line for line in text.splitlines() if line.strip()]),
                 'sha256': sha(text.encode()), 'opening': blocks[0], 'ending': blocks[-1],
                 'sourceNote': 'Teljes történet a címhorgonytól a következő műig. Eredeti írásmód és központozás; csak HTML-formázás és környező szóközök rendezve. A versbetétek sorai megmaradnak; a jegyzetjel és a kötet végi szómagyarázat nem felolvasási szöveg.'}
        path = source / entry['file']
        if args.check:
            assert path.read_text() == text and previous[id]['sha256'] == entry['sha256']
        else:
            path.parent.mkdir(exist_ok=True)
            path.write_text(text)
        entries.append(entry)
        reader.append({**entry, 'text': text.rstrip('\n')})
        evidence.append({'id': id, 'sourceUrl': url, 'sourceSha256': sha(raw), 'textSha256': entry['sha256'],
                         'boundary': {'startAnchor': anchor, 'nextAnchor': following},
                         'paragraphs': len(blocks), 'nonemptyLines': entry['lines'], 'removedNoteMarkers': notes})
        print(f'{title}: {entry["characters"]} characters, {len(blocks)} paragraphs, {entry["lines"]} lines; notes {notes}')
    if args.check:
        return
    ids = {entry['id'] for entry in entries}
    catalog['stories'] = [entry for entry in catalog['stories'] if entry['id'] not in ids and not entry['id'].startswith('kriza-')] + entries
    (source / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    (source / 'szekely-sources.json').write_text(json.dumps({'version': 1, 'stories': evidence}, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'kriza-requested.js').write_text('// Complete requested Székely selection; earlier review notes remain archived.\nexport const KRIZA_REQUESTED = ' + json.dumps(reader, ensure_ascii=False, indent=2) + ';\n')

if __name__ == '__main__':
    main()
