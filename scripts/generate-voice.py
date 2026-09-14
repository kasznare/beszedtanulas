"""Generate static Hungarian voice clips. Never modifies the family recordings in audio/.
Run: npm run generate-voice
Only dictionary words and app instructions are sent to the speech service.
"""
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / 'audio/voice/manifest.json').read_text())

async def main():
    semaphore = asyncio.Semaphore(2)
    async def generate(clip):
        output = ROOT / clip['file']
        if output.exists() and output.stat().st_size > 1000:
            return
        async with semaphore:
            for attempt in range(3):
                temp = output.with_suffix('.part.mp3')
                try:
                    await edge_tts.Communicate(clip['text'], MANIFEST['voice'], rate=MANIFEST['rate']).save(str(temp))
                    if temp.stat().st_size < 1000:
                        raise RuntimeError('Empty voice response')
                    temp.replace(output)
                    print(clip['id'], flush=True)
                    await asyncio.sleep(.3)
                    return
                except Exception as error:
                    temp.unlink(missing_ok=True)
                    if attempt == 2:
                        raise RuntimeError(f"Could not generate {clip['id']}: {error}") from error
                    await asyncio.sleep(2 ** attempt)
    await asyncio.gather(*(generate(clip) for clip in MANIFEST['clips']))
    print(f"Ready: {len(MANIFEST['clips'])} voice clips.")

asyncio.run(main())
