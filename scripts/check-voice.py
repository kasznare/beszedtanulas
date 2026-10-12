"""Verify every installed Jessa MP3 and its full text/timing, with no API calls."""
import concurrent.futures
import json
import subprocess

from elevenlabs_voice import ROOT, CONFIG, TOKEN, fingerprint, sha


def main():
    manifest = json.loads((ROOT / 'audio/voice/manifest.json').read_text())
    generated = json.loads((ROOT / 'audio/voice/generated.json').read_text())
    if generated['version'] != 2 or generated['config'] != CONFIG:
        raise RuntimeError('Stale provider/settings')
    def check(clip):
        audio = ROOT / clip['file']
        receipt = generated['clips'][clip['id']]
        if receipt['fingerprint'] != fingerprint(clip.get('spokenText', clip['text']), clip.get('extract')) or sha(audio.read_bytes()) != receipt['sha256']:
            raise RuntimeError(f"{clip['id']}: stale text, settings or audio")
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(audio), '-f', 'null', '-'], check=True, capture_output=True)
        length = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
            'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(audio)], text=True))
        if abs(length - receipt['duration']) > .002:
            raise RuntimeError(f"{clip['id']}: wrong recording duration")
        words = receipt['words']
        if [w[2] for w in words] != [m.group() for m in TOKEN.finditer(clip['text'])]:
            raise RuntimeError(f"{clip['id']}: incomplete source coverage")
        for i, (start, end, text) in enumerate(words):
            if not 0 <= start <= end <= length + .001 or (i and start < words[i - 1][0]):
                raise RuntimeError(f"{clip['id']}: invalid or truncated word {text}")
        return length
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        lengths = list(pool.map(check, manifest['clips']))
    print(f"Verified {len(lengths)} complete Jessa MP3s, {sum(lengths)/60:.1f} minutes; exact text and final words covered.")


if __name__ == '__main__':
    main()
