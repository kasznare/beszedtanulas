"""Shared deterministic fingerprints and exact-input timing validation. No API calls."""
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'voice-config.json').read_text())
TOKEN = re.compile(r"\w+(?:[-’']\w+)*", re.UNICODE)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(text, extract=None):
    return sha(compact([CONFIG, text] + ([extract] if extract else [])).encode())


def save(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def validate(audio, meta, text):
    data = audio.read_bytes()
    if len(data) < 1000 or sha(data) != meta['sha256']:
        raise RuntimeError(f'{audio.name}: empty or changed audio')
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(audio), '-f', 'null', '-'], check=True, capture_output=True)
    length = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(audio)], text=True))
    a = meta.get('alignment')
    if not a or ''.join(a['characters']) != text:
        raise RuntimeError(f'{audio.name}: timestamps do not cover exact input text')
    chars, starts, ends = (a[field] for field in ['characters', 'character_start_times_seconds', 'character_end_times_seconds'])
    if not len(chars) == len(starts) == len(ends):
        raise RuntimeError(f'{audio.name}: incomplete alignment')
    for i, (char, start, end) in enumerate(zip(chars, starts, ends)):
        if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in [start, end]) or not 0 <= start <= end:
            raise RuntimeError(f'{audio.name}: invalid timestamp at {i}')
        if i and start < starts[i - 1]:
            raise RuntimeError(f'{audio.name}: backwards timestamp')
        # Pause/punctuation timing can extend beyond the file; spoken letters cannot.
        if char.isalnum() and (start > length + .05 or end > length + .1):
            raise RuntimeError(f'{audio.name}: spoken character {i} extends past audio ({end:.3f}>{length:.3f})')
        if not char.isalnum() and end > length + .5:
            raise RuntimeError(f'{audio.name}: excessive final pause drift')
    words = [[round(starts[m.start()], 4), round(min(ends[m.end() - 1], length), 4), m.group()]
             for m in TOKEN.finditer(text)]
    if not words or words[-1][0] >= length or length < .2:
        raise RuntimeError(f'{audio.name}: missing final spoken word')
    return length, words
