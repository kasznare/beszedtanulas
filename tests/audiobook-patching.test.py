import copy
import importlib.util
import json
import math
import struct
import tempfile
import unittest
import wave
from pathlib import Path

spec = importlib.util.spec_from_file_location('patching', Path(__file__).resolve().parents[1] / 'scripts/patch-audiobook.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def tone(path, seconds, frequency):
    samples = b''.join(struct.pack('<h', round(12000 * math.sin(2 * math.pi * frequency * i / m.RATE))) for i in range(round(seconds * m.RATE)))
    with wave.open(str(path), 'wb') as stream:
        stream.setparams((1, 2, m.RATE, 0, 'NONE', 'not compressed'))
        stream.writeframes(samples)
    return samples


class Patching(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for directory in ['content/stories', 'audio/audiobooks']:
            (self.root / directory).mkdir(parents=True)
        self.base = self.root / 'audio/audiobooks/a.wav'
        self.original = tone(self.base, 3, 440)
        self.replacement = self.root / 'replacement.wav'; self.patch_pcm = tone(self.replacement, 2, 660)
        source = self.root / 'content/stories/a.txt'; source.write_text('Egy kettő három.')
        story = {'id': 'story-a', 'title': 'Számok', 'text': source.read_text(), 'duration': 3,
                 'file': 'audio/audiobooks/a.wav', 'sha256': m.sha(self.base)}
        (self.root / 'audiobook-data.js').write_text('export const AUDIOBOOKS = ' + json.dumps([story]) + ';')
        (self.root / 'content/stories/catalog.json').write_text(json.dumps({'stories': [{'id': 'story-a', 'file': 'a.txt', 'sha256': m.sha(source)}]}))
        (self.root / 'audio/audiobooks/generated.json').write_text(json.dumps({'stories': {'story-a': {}}}))
        (self.root / 'voice-config.json').write_text(json.dumps({'model_id': 'eleven_v4', 'language_code': 'hu'}))
        display = 'Számok.\n\nEgy kettő három.'; start = display.index('kettő')
        self.plan = {'storyId': 'story-a', 'baseAudioSha256': story['sha256'], 'sourceTextSha256': m.hashlib.sha256(display.encode()).hexdigest(), 'patches': [
            {'id': 'fix-1', 'start': 1, 'end': 2, 'displayStart': start, 'displayEnd': start + 5,
             'text': 'kettő', 'spokenText': '/kɛtːøː/', 'replacementFile': str(self.replacement),
             'replacementSha256': m.sha(self.replacement), 'replacementStart': .25, 'replacementEnd': 1.75}]}

    def test_pcm_unchanged_and_shift_accounted(self):
        destination = self.root / 'output/repair'
        receipt = m.stage(self.plan, destination, root=self.root)
        with wave.open(str(destination / 'staged.wav'), 'rb') as stream:
            actual = stream.readframes(stream.getnframes())
        self.assertEqual(actual[:m.RATE * 2], self.original[:m.RATE * 2])
        self.assertEqual(actual[m.RATE * 2:round(2.5 * m.RATE) * 2], self.patch_pcm[round(.25 * m.RATE) * 2:round(1.75 * m.RATE) * 2])
        self.assertEqual(actual[round(2.5 * m.RATE) * 2:], self.original[2 * m.RATE * 2:])
        self.assertEqual(receipt['newSamples'], round(3.5 * m.RATE))
        self.assertEqual(receipt['clockMap']['points'], [[0, 0], [1, 1], [2, 2.5], [3, 3.5]])
        self.assertFalse(receipt['readyForInstall']); self.assertEqual(receipt['wavSha256'], m.sha(destination / 'staged.wav'))

    def test_two_patches_accumulate_clock_and_keep_middle_pcm(self):
        first = self.plan['patches'][0]
        first.update(start=.5, end=1, replacementStart=0, replacementEnd=.75)
        second = {**first, 'id': 'fix-2', 'start': 2, 'end': 2.5,
                  'displayStart': first['displayEnd'] + 1, 'displayEnd': first['displayEnd'] + 6,
                  'text': 'három', 'spokenText': '/haːrom/', 'replacementEnd': .25}
        self.plan['patches'].append(second)
        destination = self.root / 'output/two'
        receipt = m.stage(self.plan, destination, root=self.root)
        self.assertEqual(receipt['clockMap']['points'], [[0, 0], [.5, .5], [1, 1.25], [2, 2.25], [2.5, 2.5], [3, 3]])
        self.assertEqual(receipt['sourceFileSha256'], m.sha(self.root / 'content/stories/a.txt'))
        self.assertEqual(receipt['phoneticConfigSha256'], m.sha(self.root / 'voice-config.json'))
        with wave.open(str(destination / 'staged.wav'), 'rb') as stream:
            actual = stream.readframes(stream.getnframes())
        self.assertEqual(actual[round(1.25 * m.RATE) * 2:round(2.25 * m.RATE) * 2], self.original[m.RATE * 2:2 * m.RATE * 2])

    def test_wrong_model_or_source_file_hash_rejected(self):
        (self.root / 'voice-config.json').write_text(json.dumps({'model_id': 'other', 'language_code': 'hu'}))
        with self.assertRaises(ValueError): m.stage(self.plan, self.root / 'output/wrong-model', root=self.root, dry=True)
        (self.root / 'voice-config.json').write_text(json.dumps({'model_id': 'eleven_v4', 'language_code': 'hu'}))
        (self.root / 'content/stories/a.txt').write_text('Changed source')
        with self.assertRaises(ValueError): m.stage(self.plan, self.root / 'output/stale-source', root=self.root, dry=True)

    def test_optional_mp3_is_new_staging_output(self):
        original_hash, replacement_hash = m.sha(self.base), m.sha(self.replacement)
        destination = self.root / 'output/encoded'
        receipt = m.stage(self.plan, destination, root=self.root, mp3=True)
        self.assertEqual(receipt['mp3Sha256'], m.sha(destination / 'staged.mp3'))
        self.assertGreater(len(m.decode(destination / 'staged.mp3', self.root / 'decoded.wav')), 0)
        self.assertEqual(m.sha(self.base), original_hash)
        self.assertEqual(m.sha(self.replacement), replacement_hash)

    def test_dry_does_not_write(self):
        destination = self.root / 'output/dry'
        self.assertTrue(m.stage(self.plan, destination, root=self.root, dry=True)['dryValidation'])
        self.assertFalse(destination.exists())

    def test_bad_plans_rejected(self):
        mutations = [lambda p: p.update(baseAudioSha256='old'), lambda p: p.update(sourceTextSha256='old'),
                     lambda p: p['patches'][0].update(start=float('nan')),
                     lambda p: p['patches'][0].update(end=4), lambda p: p['patches'][0].update(text='más'),
                     lambda p: p['patches'][0].update(spokenText='kettő'),
                     lambda p: p['patches'][0].update(spokenText='/kɛtːøː/ plusz'),
                     lambda p: p['patches'][0].update(spokenText='/kɛtːøː//'),
                     lambda p: p['patches'][0].update(spokenText='/ /'),
                     lambda p: p['patches'][0].update(replacementSha256='old'),
                     lambda p: p['patches'][0].update(replacementEnd=4),
                     lambda p: p['patches'].append({**p['patches'][0], 'id': 'overlap'})]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                plan = copy.deepcopy(self.plan); mutate(plan)
                with self.assertRaises(ValueError): m.stage(plan, self.root / 'output/bad', root=self.root, dry=True)

    def test_published_or_existing_destination_rejected(self):
        for target in [self.base, self.root / 'audio/new', self.root / 'output']:
            with self.assertRaises(ValueError): m.stage(self.plan, target, root=self.root, dry=True)
        target = self.root / 'output/existing'; target.mkdir(parents=True)
        with self.assertRaises(ValueError): m.stage(self.plan, target, root=self.root)

    def test_unplayable_replacement_rejected(self):
        self.replacement.write_bytes(b'not audio'); self.plan['patches'][0]['replacementSha256'] = m.sha(self.replacement)
        import subprocess
        with self.assertRaises(subprocess.CalledProcessError):
            m.stage(self.plan, self.root / 'output/bad-media', root=self.root, dry=True)


if __name__ == '__main__':
    unittest.main()
