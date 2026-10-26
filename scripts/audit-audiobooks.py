"""Audit every published story with local, unprompted ASR; never generate speech."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def inventory(root=ROOT, ids=None):
    module = (root / 'audiobook-data.js').read_text(encoding='utf-8')
    stories = json.loads(module.split('export const AUDIOBOOKS = ', 1)[1].strip().removesuffix(';'))
    receipts = json.loads((root / 'audio/audiobooks/generated.json').read_text())['stories']
    ready = [s for s in stories if s.get('audioStatus', 'ready') == 'ready']
    if ids:
        unknown = set(ids) - {s['id'] for s in ready}
        if unknown:
            raise ValueError('Nincs kész felolvasás: ' + ', '.join(sorted(unknown)))
        ready = [s for s in ready if s['id'] in ids]
    clips = []
    for story in ready:
        receipt = receipts[story['id']]
        audio = (root / story['file']).resolve()
        if not audio.is_relative_to((root / 'audio/audiobooks').resolve()):
            raise ValueError('A mese hangja nem a nyilvános mesetárhoz tartozik')
        if sha(audio.read_bytes()) != story['sha256'] or receipt['sha256'] != story['sha256']:
            raise ValueError('Megváltozott hang: ' + story['id'])
        # Original recordings speak a period after the title. Schema 3 preserves the title verbatim.
        text = story['title'] + ('\n\n' if receipt.get('schemaVersion') == 3 else '.\n\n') + story['text']
        if receipt.get('displayTextSha256') and sha(text.encode()) != receipt['displayTextSha256']:
            raise ValueError('Megváltozott felolvasási szöveg: ' + story['id'])
        clips.append(dict(id=story['id'], title=story['title'], text=text, file=story['file'],
                          sha256=story['sha256'], duration=story['duration'],
                          sourceTextSha256=sha(text.encode())))
    return dict(version=1, clips=clips,
                stories=[{k: s[k] for k in ('id', 'title', 'file', 'sha256', 'duration')} for s in ready])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'output/audiobook-qa/review')
    parser.add_argument('--backend', choices=['faster-whisper', 'mlx'], default='faster-whisper')
    parser.add_argument('--model', help='Már letöltött helyi modell')
    parser.add_argument('--ids', nargs='+', help='Csak a megadott kész mesék')
    parser.add_argument('--prepare', action='store_true', help='Csak ellenőrzött bemeneti jegyzék; nincs ASR-futtatás')
    args = parser.parse_args()
    try:
        manifest = inventory(ids=args.ids)
        output = args.output.resolve()
        if not output.is_relative_to((ROOT / 'output').resolve()):
            raise ValueError('A riport az output/ könyvtárba kerüljön')
        output.mkdir(parents=True, exist_ok=True)
        manifest_path = output / 'manifest.json'
        temporary = manifest_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(manifest_path)
        print(f"{len(manifest['clips'])} mese, {sum(c['duration'] for c in manifest['clips']) / 60:.1f} perc. "
              'A referenciaszöveget csak az utólagos összehasonlítás használja.', flush=True)
        if args.prepare:
            return 0
        command = [sys.executable, str(ROOT / 'scripts/transcribe-voice.py'), '--all',
                   '--manifest', str(manifest_path), '--audio-root', str(ROOT),
                   '--backend', args.backend, '--output', str(output)]
        if args.model:
            command += ['--model', args.model]
        result = subprocess.run(command, check=False)
        # Keep a useful partial report when one recording could not be decoded.
        if (output / 'report.json').is_file():
            review = subprocess.run([sys.executable, str(ROOT / 'scripts/review-audiobooks.py'),
                                     '--manifest', str(manifest_path), '--audit', str(output / 'report.json'),
                                     '--output', str(output)], check=False)
            if review.returncode:
                return review.returncode
        return result.returncode
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'Nem indult meseellenőrzés: {error}\n')


if __name__ == '__main__':
    sys.exit(main())
