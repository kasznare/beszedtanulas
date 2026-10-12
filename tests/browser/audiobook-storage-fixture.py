"""Local-only media update fixture; leaves repository recordings untouched.
Run after npm run build: python3 tests/browser/audiobook-storage-fixture.py 5292
"""
import hashlib
import json
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2] / 'dist'
MEDIA = 'audio/audiobooks/classic-arany-lacinak.mp3'
original = (ROOT / MEDIA).read_bytes()
original_hash = hashlib.sha256(original).hexdigest()
tag = lambda value: b'TAG' + value.encode().ljust(125, b'\0')
recordings = {'A': original, 'B': original + tag('QA B'), 'C': original + tag('QA C')}
recordings['D'] = recordings['C']
hashes = {version: hashlib.sha256(data).hexdigest() for version, data in recordings.items()}
source = (ROOT / 'sw.js').read_text()
assets = json.loads(source.split('const ASSETS = ', 1)[1].split(';\n', 1)[0])
optional = json.loads(source.split('const OPTIONAL_ASSETS = ', 1)[1].split(';\n', 1)[0])
runtime = source[source.index('/* CACHE_VERSION'):]
versions = {}
for version in 'ABCD':
    index = (ROOT / 'index.html').read_text().replace('<body data-screen="home">', f'<body data-screen="home" data-storage-test="{version}">')
    catalogue = (ROOT / 'audiobook-data.js').read_text().replace(original_hash, hashes[version])
    if version == 'D':
        catalogue = catalogue.replace('"title": "Arany Lacinak"', '"title": "Arany Lacinak – címjavítás"')
    changes = {'index.html': index.encode(), 'audiobook-data.js': catalogue.encode(), MEDIA: recordings[version]}
    listed = [{**asset, 'sha256': hashlib.sha256(changes[asset['file']]).hexdigest()} if asset['file'] in changes else asset for asset in assets]
    books = [{**asset, 'sha256': hashes[version], 'bytes': len(recordings[version])} if asset['file'] == MEDIA else asset for asset in optional]
    changes['sw.js'] = (f'const CACHE_VERSION = "storage-{version}";\nconst ASSETS = ' + json.dumps(listed) + ';\nconst OPTIONAL_ASSETS = ' + json.dumps(books) + ';\n\n' + runtime).encode()
    versions[version] = changes
state = {'version': 'A', 'corrupt': False}
requests = []


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/__qa/state':
            self.send_error(404)
            return
        payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        if payload.get('version') not in versions:
            self.send_error(400)
            return
        state.update(version=payload['version'], corrupt=bool(payload.get('corrupt')))
        if payload.get('reset'):
            requests.clear()
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps(state).encode())

    def do_GET(self):
        file = urlsplit(self.path).path.lstrip('/') or 'index.html'
        if file == '__qa/requests':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(requests).encode())
            return
        if file.endswith('.mp3') and file.startswith('audio/audiobooks/'):
            requests.append({'file': file, 'range': self.headers.get('Range'), 'version': state['version']})
        data = versions[state['version']].get(file)
        if file == MEDIA and state['corrupt']:
            data = b'corrupt recording'
        if data is None:
            return super().do_GET()
        headers = {}
        status = 200
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers.get('Range', ''))
        if file == MEDIA and match and any(match.groups()):
            length = len(data)
            start = int(match[1]) if match[1] else max(0, length - int(match[2]))
            end = min(length - 1, int(match[2])) if match[1] and match[2] else length - 1
            if start > end or start >= length:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{length}')
                self.end_headers()
                return
            data = data[start:end + 1]
            status = 206
            headers['Content-Range'] = f'bytes {start}-{end}/{length}'
        self.send_response(status)
        self.send_header('Content-Type', 'audio/mpeg' if file.endswith('.mp3') else self.guess_type(file))
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Accept-Ranges', 'bytes')
        for name, value in headers.items():
            self.send_header(name, value)
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass


print(f'Audiobook storage fixture: http://127.0.0.1:{sys.argv[1]}', flush=True)
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), Handler).serve_forever()
