"""Create a local audiobook import bundle from a user-supplied text file.

The source and paid results stay outside the repository. No arguments ever
install private content into the public catalogue. --generate consumes quota;
reruns reuse the verified paid cache and stop on ambiguous requests.
"""
import argparse
import base64
import importlib.util
import json
import math
import os
from pathlib import Path

spec = importlib.util.spec_from_file_location('elevenlabs_generator',
    Path(__file__).with_name('generate-elevenlabs-audiobooks.py'))
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--title', required=True)
    parser.add_argument('--output', type=Path, default=Path.home() / '.local/share/beszedtanulas/private-audiobooks')
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    # Public Pages serves the repository root, including unlisted files.
    if source.is_relative_to(gen.ROOT) or output.is_relative_to(gen.ROOT):
        raise RuntimeError('Private source and output must be outside the public repository')
    title = args.title.strip()
    text = gen.clean(source.read_text())
    if not title or len(title) > 200 or not text or len(text) > 100000:
        raise RuntimeError('Invalid title or text length')
    spoken = title + '.\n\n' + text
    print(f'{len(spoken)} characters; private output: {output}', flush=True)
    if not args.generate:
        return
    os.umask(0o077)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    gen.SOURCE, gen.OUT = source.parent, output
    identifier = 'local-' + gen.sha(spoken.encode())[:24]
    entry = {'id': identifier, 'title': title, 'file': source.name, 'sha256': gen.sha(source.read_bytes())}
    config = dict(line.split('=', 1) for line in gen.CONFIG.read_text().splitlines()
                  if '=' in line and not line.lstrip().startswith('#'))
    key = config['ELEVENLABS_API_KEY'].strip().strip('\"\'')
    before = gen.api('https://api.elevenlabs.io/v1/user/subscription', key)
    # Use full-price character cost as a conservative limit; promotions may end.
    if before.get('status') != 'active' or before['character_limit'] - before['character_count'] < math.ceil(len(spoken) * 1.25):
        raise RuntimeError('Insufficient included quota; no purchase or reset is attempted')
    result = gen.generate_story(entry, key)
    alignment = result.get('alignment') or result.get('normalized_alignment')
    if not alignment or ''.join(alignment['characters']).strip() != spoken:
        raise RuntimeError('Audio cached, but complete source alignment needs inspection')
    lexical_ends = [end for char, end in zip(alignment['characters'], alignment['character_end_times_seconds']) if char.isalnum()]
    if max(lexical_ends, default=math.inf) > result['duration']:
        raise RuntimeError('Audio cached; verify the final spoken word before exporting')
    audio = output / f'{identifier}.mp3'
    if result['bytes'] > 32 * 1024 * 1024 or result['duration'] > 7200:
        raise RuntimeError('Audio exceeds the local importer limit')
    bundle = {'format': 'beszedtanulas-private-audiobook', 'version': 1,
        'story': {field: result[field] for field in ['title', 'text', 'sha256', 'bytes', 'duration']},
        'audio': {'mime': 'audio/mpeg', 'base64': base64.b64encode(audio.read_bytes()).decode()}}
    target = output / f'{identifier}.mese.json'
    gen.save(target, bundle)
    after = gen.api('https://api.elevenlabs.io/v1/user/subscription', key)
    print(json.dumps({'bundle': str(target), 'audio': str(audio), 'minutes': round(result['duration'] / 60, 2),
        'credits': result['credits'], 'quotaRemaining': after['character_limit'] - after['character_count']}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
