"""Published stories need an exact, hash-bound ASR reference, never phonetic prompts."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('audit', Path(__file__).resolve().parents[1] / 'scripts/audit-audiobooks.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AudiobookAuditTests(unittest.TestCase):
    def fixture(self, root):
        (root / 'audio/audiobooks').mkdir(parents=True)
        stories, receipts = [], {}
        for id, title, schema in [('story-01', 'Régi mese', 2), ('rado-i-01', '1. Mese.', 3)]:
            audio = root / f'audio/audiobooks/{id}.mp3'
            audio.write_bytes(id.encode())
            digest = hashlib.sha256(audio.read_bytes()).hexdigest()
            text = 'Próbálj széles alapot építeni.'
            stories.append(dict(id=id, title=title, author='Nem felolvasott szerző', text=text,
                                duration=20, file=str(audio.relative_to(root)), sha256=digest))
            receipts[id] = dict(sha256=digest)
            if schema == 3:
                receipts[id].update(schemaVersion=3, displayTextSha256=audit.sha((title + '\n\n' + text).encode()))
        stories.append(dict(id='pending', audioStatus='pending'))
        (root / 'audiobook-data.js').write_text('export const AUDIOBOOKS = ' + json.dumps(stories) + ';\n')
        (root / 'audio/audiobooks/generated.json').write_text(json.dumps(dict(stories=receipts)))

    def test_ready_only_exact_title_punctuation_no_author_or_phonetic_prompt(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            clips = audit.inventory(root)['clips']
            self.assertEqual(len(clips), 2)
            self.assertEqual(clips[0]['text'], 'Régi mese.\n\nPróbálj széles alapot építeni.')
            self.assertEqual(clips[1]['text'], '1. Mese.\n\nPróbálj széles alapot építeni.')
            self.assertTrue(all(c['sourceTextSha256'] == audit.sha(c['text'].encode()) for c in clips))

    def test_subset_and_unknown_or_unrecorded_id(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            self.assertEqual([c['id'] for c in audit.inventory(root, ['rado-i-01'])['clips']], ['rado-i-01'])
            for id in ['pending', 'missing']:
                with self.assertRaises(ValueError): audit.inventory(root, [id])

    def test_stale_audio_and_display_text_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            audio = root / 'audio/audiobooks/story-01.mp3'
            original = audio.read_bytes(); audio.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'Megváltozott hang'): audit.inventory(root)
            audio.write_bytes(original)
            module = root / 'audiobook-data.js'
            module.write_text(module.read_text().replace('1. Mese.', '2. Mese.'))
            with self.assertRaisesRegex(ValueError, 'Megváltozott felolvasási'): audit.inventory(root)


if __name__ == '__main__': unittest.main()
