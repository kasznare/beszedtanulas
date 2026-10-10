"""Disposable localhost fixture for offline-update.js. Never serves production.
Run after npm run build: python3 tests/browser/offline-update-fixture.py 5190
Optional --legacy serves the actual b009234 release as version A.
"""
import hashlib,io,json,pathlib,re,shutil,subprocess,sys,tarfile,tempfile
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
repo=pathlib.Path(__file__).resolve().parents[2]
base=pathlib.Path(tempfile.mkdtemp(prefix='beszed-update-'))
legacy=None
if '--legacy' in sys.argv:
 legacy=base/'legacy';legacy.mkdir()
 archive=subprocess.check_output(['git','archive','b009234'],cwd=repo)
 with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
  for member in tar.getmembers():
   target=(legacy/member.name).resolve()
   if legacy.resolve() not in target.parents and target!=legacy.resolve(): raise ValueError('Invalid archive path')
   if member.isdir(): target.mkdir(parents=True,exist_ok=True)
   elif member.isfile():
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(tar.extractfile(member).read())
   else: raise ValueError('Unexpected archive member')
for version in 'ABCDE':
 template=legacy if version=='A' and legacy else repo/'dist'
 source=(template/'sw.js').read_text()
 assets=json.loads(source.split('const ASSETS = ',1)[1].split(';\n\n',1)[0])
 runtime=source[source.index('/* CACHE_VERSION'):]
 dest=base/version;dest.mkdir()
 for name in [asset['file'] for asset in assets]+['sw.js']:
  target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(template/name,target)
 index=(dest/'index.html').read_text().replace('<body data-screen="home">',f'<body data-screen="home" data-update-test="{version}">')
 (dest/'index.html').write_text(index)
 listed=[dict(asset) for asset in assets]
 for asset in listed:
  if asset['file']=='index.html': asset['sha256']=hashlib.sha256((dest/'index.html').read_bytes()).hexdigest()
 (dest/'sw.js').write_text(f'const CACHE_VERSION = "qa-{version}";\nconst ASSETS = '+json.dumps(listed)+';\n\n'+runtime)
state={'version':'A','fail':[]}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(base/state['version']),**kwargs)
 def end_headers(self): self.send_header('Cache-Control','no-store');super().end_headers()
 def log_message(self,*args): pass
 def do_GET(self):
  self.directory=str(base/state['version'])
  if self.path.split('?',1)[0].lstrip('/') in state['fail']:
   self.send_response(503);self.end_headers();self.wfile.write(b'QA unavailable');return
  super().do_GET()
 def do_POST(self):
  if self.path!='/__qa/version': self.send_error(404);return
  request=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if request.get('version') not in 'ABCDE' or len(request.get('version',''))!=1: self.send_error(400);return
  state.update(version=request['version'],fail=request.get('fail',[]))
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(state).encode())
try:
 print(f'Disposable update fixture on localhost:{sys.argv[1]}',flush=True)
 ThreadingHTTPServer(('localhost',int(sys.argv[1])),Handler).serve_forever()
finally: shutil.rmtree(base)
