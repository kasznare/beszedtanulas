"""Offline, unprompted Hungarian ASR for review; never approves pronunciation."""
import argparse
import difflib
import fnmatch
import hashlib
import html
import importlib.metadata
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
OPTIONS = dict(language='hu', task='transcribe', beam_size=5, temperature=0.0,
               condition_on_previous_text=False, initial_prompt=None, prefix=None,
               hotwords=None, word_timestamps=True, vad_filter=False)
MLX_OPTIONS = dict(language='hu', task='transcribe', word_timestamps=True,
                   temperature=0.0, condition_on_previous_text=False,
                   initial_prompt=None, prefix=None, verbose=None)
LIMITATION = ('A gépi átirat eltérése ellenőrzendő jelzés, nem bizonyított kiejtési hiba. '
              'Az egyezés sem igazolja a kiejtést: a felismerő javíthatja a hallott szót. '
              'A szóidők becslések, nem mérik az egyes hangok hosszúságát.')


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def sha_file(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def tokens(text):
    # Accent and consonant length differences are material; never strip accents.
    return re.findall(r'[^\W_]+', unicodedata.normalize('NFC', text).casefold())


def compare(expected, recognized):
    source, heard = tokens(expected), tokens(recognized)
    return [dict(kind=tag, expected=source[a:b], recognized=heard[c:d])
            for tag, a, b, c, d in difflib.SequenceMatcher(
                None, source, heard, autojunk=False).get_opcodes() if tag != 'equal']


def assess(expected, recognized, audio_sha, rejections):
    rejected = [r for r in rejections if any(
        r.get(part, {}).get('sha256') == audio_sha for part in ('source', 'installed'))]
    changes = compare(expected, recognized) if expected is not None else []
    status = ('known-rejected' if rejected else 'no-transcript' if not tokens(recognized)
              else 'transcribed-unverified' if expected is None else
              'transcript-difference' if changes else 'transcript-match-unverified')
    return dict(status=status, differences=changes,
                userRejections=[dict(id=r['id'], reason=r['reason']) for r in rejected],
                pronunciationVerified=False)


def select_inputs(args):
    clips = []
    audio_root = getattr(args, 'audio_root', None)
    if audio_root is not None and not (args.ids or args.all):
        raise ValueError('Az --audio-root a jegyzékből választott hangokhoz használható (--ids vagy --all).')
    if args.ids or args.all:
        manifest_path = args.manifest.resolve()
        manifest = read_json(manifest_path)
        # One explicit base only: never search other directories for a match.
        base = (audio_root.resolve() if audio_root is not None else ROOT
                if manifest_path == (ROOT / 'audio/voice/manifest.json') else manifest_path.parent)
        for pattern in args.ids or []:
            if not any(fnmatch.fnmatchcase(c['id'], pattern) for c in manifest['clips']):
                raise ValueError(f'Ismeretlen hangazonosító: {pattern}')
        clips.extend(dict(id=c['id'], text=c['text'], file=str((base / c['file']).resolve()))
                     for c in manifest['clips'] if args.all or any(
                         fnmatch.fnmatchcase(c['id'], p) for p in args.ids))
    for path in args.samples or []:
        data = read_json(path)
        audio = (path.resolve().parent / data['file']).resolve()
        if data.get('sha256') and sha_file(audio) != data['sha256']:
            raise ValueError(f'A minta ellenőrzőösszege eltér: {path}')
        clips.append(dict(id=data['clip']['id'], text=data['clip']['text'], file=str(audio)))
    if args.audio:
        clips.append(dict(id=args.audio.stem, text=args.expected, file=str(args.audio.resolve())))
    if not clips:
        raise ValueError('Válassz hangokat: --ids, --all, --samples vagy --audio.')
    if args.expected is not None and not args.audio:
        raise ValueError('A --expected kapcsolóhoz --audio is szükséges.')
    if len({c['id'] for c in clips}) != len(clips):
        raise ValueError('Azonos hangazonosító szerepel többször.')
    for clip in clips:
        if not Path(clip['file']).is_file():
            raise ValueError(f"Hiányzó hangfájl: {clip['file']}")
    return clips


def transcribe(model, audio):
    # Reference text is intentionally absent from both the signature and decoder.
    segments, info = model.transcribe(str(audio), **OPTIONS)
    segments = list(segments)
    return dict(text=''.join(s.text for s in segments).strip(), duration=info.duration,
                words=[dict(text=w.word, start=w.start, end=w.end, probability=w.probability)
                       for s in segments for w in (s.words or [])],
                segments=[dict(text=s.text, start=s.start, end=s.end,
                               avgLogProbability=s.avg_logprob,
                               noSpeechProbability=s.no_speech_prob) for s in segments])


def transcribe_mlx(module, model_path, audio):
    # Decode once to retain the actual audio duration, including trailing silence.
    from mlx_whisper.audio import SAMPLE_RATE, load_audio
    waveform = load_audio(str(audio))
    raw = module.transcribe(waveform, path_or_hf_repo=str(model_path), **MLX_OPTIONS)
    segments = raw['segments']
    return dict(text=raw['text'].strip(), duration=len(waveform) / SAMPLE_RATE,
                words=[dict(text=w['word'], start=w['start'], end=w['end'],
                            probability=w['probability'])
                       for s in segments for w in s.get('words', [])],
                segments=[dict(text=s['text'], start=s['start'], end=s['end'],
                               avgLogProbability=s['avg_logprob'],
                               noSpeechProbability=s['no_speech_prob']) for s in segments])


def ffmpeg_identity():
    """Fingerprint the local decoder MLX invokes; -version performs no decoding."""
    executable = shutil.which('ffmpeg')
    if executable is None:
        raise ValueError('Az MLX hangbeolvasáshoz helyi FFmpeg szükséges.')
    path = Path(executable).resolve()
    version = subprocess.check_output([str(path), '-version'], text=True, timeout=10)
    if not version.strip():
        raise ValueError('Az FFmpeg nem adott helyi verzióadatot.')
    return dict(path=str(path), sha256=sha_file(path), version=version.splitlines()[0],
                versionSha256=hashlib.sha256(version.encode()).hexdigest())


def load_backend(args):
    """Resolve only local model files and return an unprompted audio decoder."""
    model_name = args.model or ('mlx-community/whisper-large-v3-turbo'
                               if args.backend == 'mlx' else 'large-v3-turbo')
    model_path = Path(model_name).expanduser()
    if args.backend == 'mlx':
        import mlx_whisper
        if not model_path.is_dir():
            from huggingface_hub import snapshot_download
            model_path = Path(snapshot_download(repo_id=model_name, local_files_only=True))
        model_path = model_path.resolve()
        # Passing a verified local directory prevents MLX's loader from fetching a repo.
        if not (model_path / 'config.json').is_file() or not any(
                (model_path / name).is_file() for name in ('weights.safetensors', 'weights.npz')):
            raise ValueError(f'Hiányos helyi MLX-modell: {model_path}')
        name, options = 'mlx-whisper', MLX_OPTIONS
        dependencies = ('mlx', 'numpy', 'huggingface-hub', 'tiktoken')
        settings = dict(device='metal', computeType='float16', ffmpeg=ffmpeg_identity())
        # mlx-whisper's ModelHolder retains this model across all clip calls.
        decoder = lambda audio: transcribe_mlx(mlx_whisper, model_path, audio)
    else:
        from faster_whisper import WhisperModel
        from faster_whisper.utils import download_model
        if not model_path.is_dir():
            model_path = Path(download_model(model_name, local_files_only=True))
        model_path = model_path.resolve()
        name, options = 'faster-whisper', OPTIONS
        dependencies = ('ctranslate2', 'av', 'numpy', 'tokenizers', 'huggingface-hub')
        settings = dict(device='cpu', computeType='int8', threads=args.threads)
        model = WhisperModel(str(model_path), device='cpu', compute_type='int8',
                             cpu_threads=args.threads, local_files_only=True)
        decoder = lambda audio: transcribe(model, audio)
    identity = {p.name: sha_file(p) for p in sorted(model_path.iterdir()) if p.is_file()}
    engine = dict(name=name, backend=args.backend, version=importlib.metadata.version(name),
                  dependencies={name: importlib.metadata.version(name) for name in dependencies},
                  modelPath=str(model_path), modelFiles=identity, options=options, **settings)
    return decoder, engine


def render_report(report, output):
    labels = {'known-rejected': 'Felhasználó által elutasított hang',
              'no-transcript': 'Nincs felismert szöveg',
              'transcript-difference': 'Eltérő átirat – meghallgatandó',
              'transcript-match-unverified': 'Egyező átirat – kiejtés nem igazolt',
              'transcribed-unverified': 'Átírva – kiejtés nem igazolt',
              'error': 'Nem sikerült feldolgozni'}
    cards = []
    escape = lambda value: html.escape(str(value), quote=True)
    for clip in report['clips']:
        audio = ''
        if clip.get('audioCopy'):
            audio = f'<audio controls preload="none" src="{escape(clip["audioCopy"])}"></audio>'
        changes = '; '.join(' '.join(d['expected']) + ' → ' + ' '.join(d['recognized'])
                            for d in clip.get('differences', []))
        rejection = '; '.join(r['reason'] for r in clip.get('userRejections', []))
        cards.append(f'<article><h2>{escape(clip["id"])}</h2>'
                     f'<p><strong>{escape(labels[clip["status"]])}</strong></p>{audio}'
                     f'<p>Eredeti: {escape(clip.get("expected") or "Nincs megadva")}</p>'
                     f'<p>Felismert: {escape(clip.get("recognized", ""))}</p>'
                     f'<p>{escape(changes)}</p><p>{escape(rejection)}</p>'
                     f'<p>{escape(clip.get("error", ""))}</p></article>')
    document = ('<!doctype html><html lang="hu"><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1">'
                '<title>Helyi hangellenőrzés</title><style>'
                'body{font:17px system-ui;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.5}'
                'article{border:1px solid #bbb;border-radius:12px;padding:16px;margin:20px 0}'
                'h2{font-size:18px;overflow-wrap:anywhere}audio{width:100%}p{overflow-wrap:anywhere}'
                '</style><h1>Helyi hangellenőrzés</h1><p>' + escape(LIMITATION) + '</p>'
                '<p>Helyi Whisper, magyar nyelv. A felismerő nem kapta meg az eredeti szöveget. '
                'A hangok nem kerültek külső szolgáltatóhoz.</p>' + ''.join(cards) + '</html>')
    (output / 'report.html').write_text(document, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ids', nargs='+', help='Hangazonosítók vagy idézőjelezett minták, pl. engineering_*')
    parser.add_argument('--all', action='store_true', help='A rövid játékhangjegyzék teljes ellenőrzése')
    parser.add_argument('--manifest', type=Path, default=ROOT / 'audio/voice/manifest.json',
                        help='Hangjegyzék; egyedi jegyzék relatív hangútvonalainak alapja a jegyzék könyvtára')
    parser.add_argument('--audio-root', type=Path,
                        help='A jegyzék relatív hangútvonalainak kifejezett alapkönyvtára; nincs más helyen keresés')
    parser.add_argument('--samples', nargs='+', type=Path, help='Generálási minták JSON-metaadatai')
    parser.add_argument('--audio', type=Path, help='Egy tetszőleges helyi hangfájl')
    parser.add_argument('--expected', help='Várt szöveg; kizárólag az utólagos összehasonlításhoz')
    parser.add_argument('--backend', choices=('faster-whisper', 'mlx'), default='faster-whisper',
                        help='CPU vagy Apple Silicon Metal felismerő')
    parser.add_argument('--model', help='Már letöltött modell neve vagy helyi könyvtára; alapértéke a háttérhez igazodik')
    parser.add_argument('--output', type=Path, default=ROOT / 'output/voice-transcription')
    parser.add_argument('--cache-dir', type=Path, default=Path.home() / '.cache/beszedtanulas/voice-transcription')
    parser.add_argument('--threads', type=int, default=4)
    args = parser.parse_args()
    try:
        clips = select_inputs(args)
        if args.threads < 1:
            raise ValueError('Legalább egy CPU-szál szükséges.')
        # Fail closed if model files are missing. No implicit download or audio upload.
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
        print('Helyi modell betöltése; hálózat és szöveges súgás nélkül.', flush=True)
        decode_audio, engine = load_backend(args)
    except Exception as error:
        parser.exit(1, f'Nem indult hangfelismerés: {error}\nTelepítés: README.md – Helyi hangátírás.\n')
    rejections_path = ROOT / 'voice-rejections.json'
    rejections = read_json(rejections_path)['recordings'] if rejections_path.exists() else []
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / 'audio').mkdir(exist_ok=True)
    report = dict(version=1, engine=engine, limitation=LIMITATION, clips=[])
    failures = 0
    for index, clip in enumerate(clips, 1):
        result = dict(id=clip['id'], expected=clip['text'], file=clip['file'])
        try:
            audio_sha = sha_file(clip['file'])
            # Human feedback remains visible even if recognition or copying fails.
            result.update(audioSha256=audio_sha)
            result.update(assess(clip['text'], '', audio_sha, rejections))
            signature = dict(version=1, audioSha256=audio_sha, engine=engine)
            key = hashlib.sha256(json.dumps(signature, sort_keys=True).encode()).hexdigest()
            cache_path = args.cache_dir / (key + '.json')
            cached = read_json(cache_path) if cache_path.exists() else None
            if cached and cached.get('signature') == signature:
                transcript = cached['transcript']
            else:
                transcript = decode_audio(clip['file'])
                write_json(cache_path, dict(signature=signature, transcript=transcript))
            relative_audio = 'audio/' + audio_sha + Path(clip['file']).suffix.lower()
            shutil.copyfile(clip['file'], output / relative_audio)
            result.update(audioSha256=audio_sha, audioCopy=relative_audio,
                          recognized=transcript['text'], transcription=transcript)
            result.update(assess(clip['text'], transcript['text'], audio_sha, rejections))
        except Exception as error:
            failures += 1
            result.update(status='error', error=str(error), pronunciationVerified=False)
        report['clips'].append(result)
        write_json(output / 'report.json', report)
        print(f'[{index}/{len(clips)}] {clip["id"]}: {result["status"]} | '
              f'{result.get("recognized", result.get("error", ""))}', flush=True)
    render_report(report, output)
    print(f'Riport: {output / "report.html"}\n{LIMITATION}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
