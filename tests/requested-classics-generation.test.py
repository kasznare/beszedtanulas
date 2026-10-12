"""Safety checks for a paid request: no real key and no network calls."""
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('classics_generator', ROOT / 'scripts/generate-requested-classics.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

class GenerationSafety(unittest.TestCase):
    def test_each_new_part_rechecks_balance_and_subtracts_parallel_requests_before_journaling(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(generator, 'CACHE', Path(directory)), \
                patch.object(generator, 'concurrent_reserve', return_value=24), \
                patch.object(generator.voice_generator, 'api', return_value={'status':'active','character_limit':100,'character_count':70}) as balance, \
                patch.object(generator.urllib.request, 'urlopen', side_effect=AssertionError('Must not send a paid request')):
            with self.assertRaises(generator.QuotaUnavailable):
                generator.paid_part({'displayText':'1234567','spokenText':'1234567'}, {'text':'1234567'}, 'test', 'fake-key')
            balance.assert_called_once_with('user/subscription', 'fake-key')
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_ambiguous_journal_blocks_resending_before_even_reading_the_balance(self):
        body={'text':'A készülő mű.'}
        code=generator.sha(generator.compact([generator.CONFIG,body]).encode())
        with tempfile.TemporaryDirectory() as directory, patch.object(generator,'CACHE',Path(directory)), \
                patch.object(generator.voice_generator,'api',side_effect=AssertionError('Do not retry or inspect quota')):
            journal=Path(directory)/(code+'.pending.json')
            journal.write_text(json.dumps({'body':body}))
            with self.assertRaisesRegex(RuntimeError,'ambiguous'):
                generator.paid_part({'displayText':body['text'],'spokenText':body['text']},body,'test','fake-key')
            self.assertTrue(journal.exists())

    def test_pronunciation_aliases_preserve_every_original_word_position(self):
        text='Még képek és víz. Rakjuk még ide.'
        spoken=generator.phonetic(text)
        self.assertIn('/ˈmeːɡ/',spoken)
        self.assertEqual(len(list(generator.TOKEN.finditer(text))),len(list(generator.SPOKEN_TOKEN.finditer(spoken))))

if __name__=='__main__':
    unittest.main()
