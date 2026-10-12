"""Paid request safety regression tests. All service calls are mocked."""
import base64
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
spec = importlib.util.spec_from_file_location('generator', Path(__file__).resolve().parents[1] / 'scripts/generate-voice.py')
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)


class PaidCacheTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.cache = patch.object(gen, 'CACHE', Path(self.temp.name))
        self.cache.start()
        gen.STOP.clear()

    def tearDown(self):
        self.cache.stop()
        self.temp.cleanup()

    def test_pending_request_cannot_be_resent(self):
        (gen.CACHE / (gen.fingerprint('alma.') + '.pending.json')).write_text('{}')
        with patch.object(gen.urllib.request, 'urlopen') as request:
            with self.assertRaisesRegex(RuntimeError, 'ambiguous'):
                gen.generate('alma.', ['word_alma'], 'test-key')
            request.assert_not_called()

    def test_connection_loss_keeps_request_and_never_retries(self):
        with patch.object(gen.urllib.request, 'urlopen', side_effect=TimeoutError) as request:
            with self.assertRaisesRegex(RuntimeError, 'interrupted'):
                gen.generate('alma.', ['word_alma'], 'test-key')
            self.assertEqual(request.call_count, 1)
            pending = json.loads(next(gen.CACHE.glob('*.pending.json')).read_text())
            self.assertEqual(pending['body']['text'], 'alma.')
            self.assertNotIn('test-key', json.dumps(pending))
            with self.assertRaisesRegex(RuntimeError, 'ambiguous'):
                gen.generate('alma.', ['word_alma'], 'test-key')
            self.assertEqual(request.call_count, 1)

    def test_complete_paid_cache_is_reused_without_api(self):
        text = 'alma.'
        code = gen.fingerprint(text)
        audio = gen.CACHE / (code + '.mp3')
        audio.write_bytes(b'cached-paid-mp3')
        gen.save(gen.CACHE / (code + '.json'), {'fingerprint': code, 'sha256': gen.sha(audio.read_bytes())})
        with patch.object(gen.urllib.request, 'urlopen') as request, patch.object(gen, 'validate', return_value=(1, [[0, .7, 'alma']])):
            result, meta = gen.generate(text, ['word_alma', 'r_word_alma'], 'test-key')
            request.assert_not_called()
            self.assertEqual(result, audio)
            self.assertEqual(meta['words'][0][2], 'alma')

    def test_paid_response_is_saved_even_if_local_validation_fails(self):
        class Response:
            headers = {'character-cost': '1', 'request-id': 'request'}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self): return json.dumps({'audio_base64': base64.b64encode(b'paid-bytes').decode(), 'alignment': {}}).encode()
        with patch.object(gen.urllib.request, 'urlopen', return_value=Response()) as request, patch.object(gen, 'validate', side_effect=RuntimeError('bad timing')):
            with self.assertRaisesRegex(RuntimeError, 'bad timing'):
                gen.generate('alma.', ['word_alma'], 'test-key')
            self.assertEqual(request.call_count, 1)
            self.assertTrue(list(gen.CACHE.glob('*.response.json')))
            self.assertTrue(list(gen.CACHE.glob('*.mp3')))
            self.assertTrue(list(gen.CACHE.glob('*.pending.json')))
            with self.assertRaisesRegex(RuntimeError, 'bad timing'):
                gen.generate('alma.', ['word_alma'], 'test-key')
            self.assertEqual(request.call_count, 1)


class PronunciationTimingTests(unittest.TestCase):
    def test_ipa_syllables_and_affricates_remain_one_displayed_word(self):
        text = '/ˈrɒk.juk/ össze a /ˈkeː.pɛt/ és /ˈki.t͡ʃi/.'
        matches = list(gen.SPOKEN_TOKEN.finditer(text))
        self.assertEqual([m.group() for m in matches], ['/ˈrɒk.juk/', 'össze', 'a', '/ˈkeː.pɛt/', 'és', '/ˈki.t͡ʃi/'])
        for match in matches:
            self.assertEqual(text[match.start():match.end()], match.group())


if __name__ == '__main__':
    unittest.main()
