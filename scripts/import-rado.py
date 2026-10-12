"""Import both complete Radó WebArchives without rewriting their tales.

Requires beautifulsoup4. Original archives and all embedded resources are copied
unchanged outside Git; source scripts are never executed or added to the app.
--check independently re-extracts all 50 tales and compares every text byte.
"""
import argparse
import hashlib
import json
import plistlib
import re
import shutil
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/stories'
BACKUP = Path.home() / '.local/share/beszedtanulas/rado-sources'
VOLUMES = [('i', 31, 'https://mek.oszk.hu/11400/11479/11479.htm'),
           ('ii', 19, 'https://mek.oszk.hu/11600/11620/11620.htm')]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def archive_resources(archive, frame='root'):
    resources = []
    for role, resource in [('main' if frame == 'root' else 'frame-main', archive['WebMainResource'])] + [
            ('embedded' if frame == 'root' else 'frame-embedded', x) for x in archive.get('WebSubresources', [])]:
        url = resource['WebResourceURL']
        parsed = urlsplit(url)
        # Frame analytics contain visitor identifiers. Inventory them by hashes
        # without publishing query parameters from the user's saved archive.
        public_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, '', '')) if parsed.query else url
        resources.append({'url': public_url, 'urlSha256': sha(url.encode()), 'queryOmitted': bool(parsed.query),
                          'mimeType': resource['WebResourceMIMEType'], 'bytes': len(resource['WebResourceData']),
                          'sha256': sha(resource['WebResourceData']), 'role': role, 'frame': frame})
    for index, child in enumerate(archive.get('WebSubframeArchives', [])):
        resources.extend(archive_resources(child, f'{frame}/frame-{index:02d}'))
    return resources


def backup_resources(archive, target):
    target.mkdir(parents=True, exist_ok=True)
    (target / 'main.html').write_bytes(archive['WebMainResource']['WebResourceData'])
    for index, resource in enumerate(archive.get('WebSubresources', [])):
        (target / f'resource-{index:02d}.bin').write_bytes(resource['WebResourceData'])
    for index, child in enumerate(archive.get('WebSubframeArchives', [])):
        backup_resources(child, target / f'frame-{index:02d}')


def paragraph(node):
    # HTML source newlines are wrapping, while <br> is an intentional verse line.
    parts = []
    for child in node.descendants:
        if isinstance(child, NavigableString):
            if child.find_parent('a', class_='sdfootnoteanc'):
                continue
            parts.append(str(child))
        elif child.name == 'br':
            parts.append('\u0000')
    return '\n'.join(re.sub(r'\s+', ' ', line).strip() for line in ''.join(parts).split('\u0000')).strip()


def extract(path, volume, count, url):
    archive_bytes = path.read_bytes()
    archive = plistlib.loads(archive_bytes)
    resource = archive['WebMainResource']
    assert resource['WebResourceURL'] == url
    assert resource['WebResourceMIMEType'] == 'text/html'
    html_bytes = resource['WebResourceData']
    html = html_bytes.decode('utf-8')  # stale HTML meta says iso-8859-2
    soup = BeautifulSoup(html, 'html.parser')
    toc = [a for a in soup.find_all('a', href=True) if re.fullmatch(r'#\d+', a['href'])]
    anchors = [a for a in soup.find_all('a', attrs={'name': True}) if a['name'].isdigit()]
    assert len(toc) == len(anchors) == count
    assert [a['href'][1:] for a in toc] == [str(i) for i in range(1, count + 1)]
    assert [a['name'] for a in anchors] == [str(i) for i in range(1, count + 1)]
    paragraphs = soup.find_all('p')
    nodes = list(soup.descendants)
    node_positions = {id(node): i for i, node in enumerate(nodes)}
    headers = [a.find_parent('p') for a in anchors]
    note_header = next(p for p in paragraphs if paragraph(p) == 'JEGYZETEK')
    notes = {}
    for div in soup.find_all('div', id=re.compile(r'^sdfootnote\d+$')):
        note = div.find('p')
        notes[div['id']] = re.sub(r'^\d+\s*', '', paragraph(note))
    entries = []
    for index, (link, header) in enumerate(zip(toc, headers), 1):
        title = re.sub(r'\s+', ' ', link.get_text()).strip()
        assert title == paragraph(header), (volume, index, title, paragraph(header))
        begin = paragraphs.index(header) + 1
        end = paragraphs.index(headers[index]) if index < count else paragraphs.index(note_header)
        body_nodes = paragraphs[begin:end]
        # Independent completeness guard: meaningful body text must not be lost
        # merely because the source placed it outside a paragraph element.
        next_header = headers[index] if index < count else note_header
        outside = [str(node).strip() for node in nodes[node_positions[id(header)]:node_positions[id(next_header)]]
                   if isinstance(node, NavigableString) and str(node).strip() and not node.find_parent('p')]
        assert not outside, (volume, index, 'Unimported text outside paragraphs', outside)
        lines = [paragraph(p) for p in body_nodes if paragraph(p)]
        assert lines
        text = '\n'.join(lines)
        footnotes = []
        for p in body_nodes:
            for a in p.find_all('a', class_='sdfootnoteanc'):
                key = a['href'][1:].removesuffix('sym')
                footnotes.append({'marker': a.get_text(strip=True), 'text': notes[key],
                                  'paragraph': lines.index(paragraph(p))})
        data = (text + '\n').encode()
        start = html.index(f'<a name="{index}">')
        stop = html.index(f'<a name="{index + 1}">') if index < count else html.index('JEGYZETEK', start)
        entries.append({'id': f'rado-{volume}-{index:02d}', 'title': title,
                        'author': 'Radó Vilmos (egybeállító)', 'kind': 'Mese',
                        'collection': 'Magyar gyermek- és népmesék', 'volume': volume.upper(),
                        'sourceIndex': index, 'sourceUrl': url + f'#{index}',
                        'file': f'rado/{volume}-{index:02d}.txt', 'sha256': sha(data),
                        'characters': len(text), 'words': len(text.split()),
                        'paragraphs': len(lines), 'opening': lines[0], 'ending': lines[-1],
                        'footnotes': footnotes, 'sourceHtmlRange': [start, stop],
                        'sourceRangeSha256': sha(html[start:stop].encode()),
                        'illustrated': False, 'audioStatus': 'pending',
                        'rights': {'status': 'licensed', 'license': 'CC BY-SA 3.0',
                                   'licenseUrl': 'https://creativecommons.org/licenses/by-sa/3.0/',
                                   'attribution': 'Radó Vilmos: Magyar gyermek- és népmesék. '
                                      'Elektronikus változat: Magyar Elektronikus Könyvtárért Egyesület, 2013; '
                                      'Országos Széchényi Könyvtár E-könyvtári Szolgáltatások Osztálya; '
                                      'Varjú Mária (MEK-metaadat).'},
                        'text': text})
    resources = archive_resources(archive)
    inventory = {'volume': volume.upper(), 'archiveName': path.name, 'archiveSha256': sha(archive_bytes),
                 'archiveBytes': len(archive_bytes), 'sourceUrl': url, 'encoding': 'UTF-8',
                 'taleCount': count, 'resources': resources,
                 'images': [x.get('src') for x in soup.find_all('img')],
                 'otherEmbeddedElements': [str(x) for x in soup.find_all(['object', 'embed', 'audio', 'video'])],
                 'references': [{'element': x.name, 'url': urljoin(url, x.get('src') or x.get('href'))}
                                for x in soup.find_all(['script', 'iframe', 'link', 'img']) if x.get('src') or x.get('href')],
                 'toc': [{'index': i, 'title': e['title'], 'id': e['id']} for i, e in enumerate(entries, 1)]}
    assert not inventory['images'] and not inventory['otherEmbeddedElements']
    return entries, inventory, archive


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archives', type=Path, default=Path.home() / 'Downloads')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    catalog = json.loads((SOURCE / 'catalog.json').read_text())
    previous = {x['id']: x for x in catalog['stories']}
    imported, volumes = [], []
    for volume, count, url in VOLUMES:
        matches = [p for p in args.archives.glob('*.webarchive')
                   if plistlib.loads(p.read_bytes()).get('WebMainResource', {}).get('WebResourceURL') == url]
        assert len(matches) == 1, f'Expected one archive for {url}'
        path = matches[0]
        entries, inventory, archive = extract(path, volume, count, url)
        volumes.append(inventory)
        if not args.check:
            target = BACKUP / volume
            target.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target / path.name)
            backup_resources(archive, target)
            write_json(target / 'inventory.json', inventory)
        for entry in entries:
            text = entry.pop('text')
            target = SOURCE / entry['file']
            if args.check:
                assert target.read_bytes() == (text + '\n').encode(), f'Incomplete tale: {entry["id"]}'
                old = previous[entry['id']]
                for key, value in entry.items():
                    if key != 'audioStatus':
                        assert old[key] == value, (entry['id'], key)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(text + '\n')
                if entry['id'] in previous:
                    entry['audioStatus'] = previous[entry['id']].get('audioStatus', 'pending')
            imported.append(entry)
        print(f'{volume.upper()}: {len(entries)}/{count} complete tales, '
              f'{sum(e["characters"] for e in entries)} body characters, through {entries[-1]["title"]}')
    provenance = {'version': 1, 'volumes': volumes,
                  'transformations': ['HTML wrapping whitespace collapsed within paragraphs',
                    'Paragraph boundaries and intentional br verse breaks retained',
                    'Footnote callouts stored separately with their paragraph and full note',
                    'Source spelling, punctuation, titles and story endings unchanged'],
                  'archiveBackup': '~/.local/share/beszedtanulas/rado-sources/'}
    if args.check:
        assert json.loads((SOURCE / 'rado-sources.json').read_text()) == provenance
        assert len([x for x in catalog['stories'] if x['id'].startswith('rado-')]) == 50
        return
    other = [x for x in catalog['stories'] if not x['id'].startswith('rado-')]
    normalize = lambda t: re.sub(r'[^\w]', '', t.casefold())
    for entry in imported:
        entry['sameTitleAs'] = [x['id'] for x in other + imported
                                if x['id'] != entry['id'] and normalize(x['title']) == normalize(entry['title'])]
    catalog['stories'] = other + imported
    write_json(SOURCE / 'catalog.json', catalog)
    write_json(SOURCE / 'rado-sources.json', provenance)
    # Reader data is separate from the ready-to-play AUDIOBOOKS array.
    reader = [{**x, 'text': (SOURCE / x['file']).read_text().rstrip('\n')} for x in imported]
    (ROOT / 'rado-stories.js').write_text('// Generated from complete sources and verified fixed recordings.\n'
        'export const RADO_STORIES = ' + json.dumps(reader, ensure_ascii=False, indent=2) + ';\n')


if __name__ == '__main__':
    main()
