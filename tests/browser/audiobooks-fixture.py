"""Disposable local server with MP3 byte ranges, like the production host.
Run: python3 tests/browser/audiobooks-fixture.py 5187
"""
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = Path(self.translate_path(self.path))
        requested = self.headers.get('Range', '')
        if path.suffix != '.mp3' or not path.is_file() or not requested:
            return super().do_GET()
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested)
        size = path.stat().st_size
        if not match or not any(match.groups()):
            self.send_error(416)
            return
        start = int(match[1]) if match[1] else max(0, size - int(match[2]))
        end = min(size - 1, int(match[2])) if match[1] and match[2] else size - 1
        if start > end or start >= size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return
        self.send_response(206)
        self.send_header('Content-Type', 'audio/mpeg')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        try:
            with path.open('rb') as audio:
                audio.seek(start)
                self.wfile.write(audio.read(end - start + 1))
        except (BrokenPipeError, ConnectionResetError):
            pass


print(f'Audiobook QA server: http://127.0.0.1:{sys.argv[1]}', flush=True)
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), Handler).serve_forever()
