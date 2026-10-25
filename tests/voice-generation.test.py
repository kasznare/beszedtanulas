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

    def test_human_rejected_input_blocks_paid_cache_without_api(self):
        bad_text, good_text = 'hibás hang.', 'jó hang.'
        bad_code, good_code = gen.fingerprint(bad_text), gen.fingerprint(good_text)
        rejected = {'version': 1, 'recordings': [{
            'id': 'bad_clip', 'reason': 'Incorrect pronunciation',
            'source': {'fingerprint': bad_code, 'sha256': gen.sha(b'bad source')},
            'installed': {'fingerprint': 'old-excerpt', 'sha256': gen.sha(b'bad excerpt')},
        }]}
        registry = gen.CACHE / 'rejections.json'
        registry.write_text(json.dumps(rejected))
        bad_audio = gen.CACHE / (bad_code + '.mp3')
        bad_audio.write_bytes(b'bad source')
        gen.save(gen.CACHE / (bad_code + '.json'), {'fingerprint': bad_code, 'sha256': gen.sha(b'bad source')})
        good_audio = gen.CACHE / (good_code + '.mp3')
        good_audio.write_bytes(b'good source')
        gen.save(gen.CACHE / (good_code + '.json'), {'fingerprint': good_code, 'sha256': gen.sha(b'good source')})
        with patch.object(gen, 'REJECTIONS', registry), patch.object(gen.urllib.request, 'urlopen') as request, \
                patch.object(gen, 'validate', return_value=(1, [[0, .7, 'jó']])) as validate:
            with self.assertRaisesRegex(RuntimeError, 'rejected voice recording'):
                gen.generate(bad_text, ['bad_clip'], 'test-key')
            request.assert_not_called()
            validate.assert_not_called()
            self.assertEqual(bad_audio.read_bytes(), b'bad source')
            self.assertFalse(list(gen.CACHE.glob('*.pending.json')))
            result, _ = gen.generate(good_text, ['good_clip'], 'test-key')
            self.assertEqual(result, good_audio)
            request.assert_not_called()

    def test_rejected_manifest_input_stops_before_key_or_quota_lookup(self):
        text = 'rejected instruction'
        registry = gen.CACHE / 'rejections.json'
        registry.write_text(json.dumps({'version': 1, 'recordings': [{
            'id': 'bad_clip', 'reason': 'Incorrect pronunciation',
            'source': {'fingerprint': gen.fingerprint(text), 'sha256': gen.sha(b'bad source')},
            'installed': {'fingerprint': 'old-excerpt', 'sha256': gen.sha(b'bad excerpt')},
        }]}))
        manifest = gen.CACHE / 'audio/voice/manifest.json'
        manifest.parent.mkdir(parents=True)
        manifest.write_text(json.dumps({**gen.CONFIG, 'clips': [{'id': 'bad_clip', 'text': text}]}))
        with patch.object(gen, 'REJECTIONS', registry), patch.object(gen, 'ROOT', gen.CACHE), \
                patch.object(sys, 'argv', ['generate-voice.py', '--generate', '--ids', 'bad_clip']), \
                patch.object(gen, 'load_key') as load_key, patch.object(gen, 'api') as api:
            with self.assertRaisesRegex(RuntimeError, 'rejected voice recording'):
                gen.main()
            load_key.assert_not_called()
            api.assert_not_called()

    def test_rejected_excerpt_bytes_are_blocked_before_install(self):
        registry = gen.CACHE / 'rejections.json'
        registry.write_text(json.dumps({'version': 1, 'recordings': [{
            'id': 'bad_clip', 'reason': 'Incorrect pronunciation',
            'source': {'fingerprint': 'old-source', 'sha256': gen.sha(b'old source')},
            'installed': {'fingerprint': 'old-excerpt', 'sha256': gen.sha(b'rejected bytes')},
        }]}))
        candidate = gen.CACHE / 'candidate.mp3'
        candidate.write_bytes(b'rejected bytes')
        output = gen.CACHE / 'installed.mp3'
        output.write_bytes(b'previous good bytes')
        with patch.object(gen, 'REJECTIONS', registry):
            with self.assertRaisesRegex(RuntimeError, 'rejected voice recording'):
                gen.installed_recording({'id': 'bad_clip'}, candidate, {'fingerprint': 'new-source'})
        self.assertEqual(output.read_bytes(), b'previous good bytes')

    def test_reported_engineering_sources_are_registered_and_blocked(self):
        rejected = json.loads(gen.REJECTIONS.read_text())['recordings']
        self.assertTrue({'engineering_build', 'engineering_bridge', 'engineering_water'}.issubset(
            {item['id'] for item in rejected}))
        for item in rejected:
            with self.assertRaisesRegex(RuntimeError, 'rejected voice recording'):
                gen.assert_not_rejected([item['id']], source_fingerprint=item['source']['fingerprint'])
            with self.assertRaisesRegex(RuntimeError, 'rejected voice recording'):
                gen.assert_not_rejected([item['id']], source_sha=item['source']['sha256'])
            with self.assertRaisesRegex(RuntimeError, 'rejected voice recording'):
                gen.assert_not_rejected([item['id']], installed_fingerprint=item['installed']['fingerprint'])
            with self.assertRaisesRegex(RuntimeError, 'rejected voice recording'):
                gen.assert_not_rejected([item['id']], installed_sha=item['installed']['sha256'])

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


class AdjacentWordExcerptTests(unittest.TestCase):
    def case(self, text, target, intervals):
        starts, ends = [0.] * len(text), [0.] * len(text)
        for word, (start, stop) in zip(gen.SPOKEN_TOKEN.finditer(text), intervals):
            for offset, index in enumerate(range(word.start(), word.end())):
                starts[index] = start + (stop - start) * offset / len(word.group())
                ends[index] = start + (stop - start) * (offset + 1) / len(word.group())
        begin = text.index(target)
        clip = dict(id='boundary_test', text=target, spokenText=text, spokenTarget=target,
                    extract=dict(from_=begin, to=begin + len(target), before=.025, after=.12,
                                 boundToAdjacentWords=True, text=target))
        clip['extract']['from'] = clip['extract'].pop('from_')
        return clip, dict(characters=list(text), character_start_times_seconds=starts,
                          character_end_times_seconds=ends)

    def test_whole_following_short_word_is_excluded(self):
        clip, alignment = self.case('Robot őrzi a répát', 'Robot őrzi',
                                    [(0, .4), (.48, .8), (.84, .88), (.92, 1.2)])
        start, stop = gen.bound_excerpt_to_adjacent_words(clip, alignment, 0, .92, 1.3)
        self.assertEqual(start, 0)
        self.assertAlmostEqual(stop, .84)

    def test_leading_padding_cannot_include_previous_word(self):
        clip, alignment = self.case('még kérek', 'kérek', [(0, .4), (.42, .8)])
        start, stop = gen.bound_excerpt_to_adjacent_words(clip, alignment, .32, .92, 1)
        self.assertAlmostEqual(start, .4)
        self.assertAlmostEqual(stop, .92)

    def test_no_neighbors_keeps_padding(self):
        clip, alignment = self.case('/ˈkeː.pɛt/!', '/ˈkeː.pɛt/', [(.2, .5)])
        self.assertEqual(gen.bound_excerpt_to_adjacent_words(clip, alignment, .175, .62, .8),
                         (.175, .62))

    def test_ipa_tokens_bound_both_sides_without_changing_word_count(self):
        clip, alignment = self.case('/r/ /ˈkeː.pɛt/ /ˈki.t͡ʃi/', '/ˈkeː.pɛt/',
                                    [(0, .4), (.42, .8), (.84, 1.2)])
        start, stop = gen.bound_excerpt_to_adjacent_words(clip, alignment, .3, .92, 1.3)
        self.assertAlmostEqual(start, .4)
        self.assertAlmostEqual(stop, .84)
        self.assertEqual(len(list(gen.SPOKEN_TOKEN.finditer(clip['spokenTarget']))), 1)

    def test_conflicting_alignment_and_partial_ipa_token_are_rejected(self):
        clip, alignment = self.case('még kérek', 'kérek', [(0, .5), (.42, .8)])
        with self.assertRaisesRegex(RuntimeError, 'cut target speech'):
            gen.bound_excerpt_to_adjacent_words(clip, alignment, .32, .92, 1)
        clip, alignment = self.case('/ˈkeː.pɛt/', 'keː', [(0, .8)])
        with self.assertRaisesRegex(RuntimeError, 'invalid adjacent-word excerpt span'):
            gen.bound_excerpt_to_adjacent_words(clip, alignment, 0, .9, 1)

    def test_opt_in_controls_actual_ffmpeg_cut_and_metadata_without_api(self):
        clip, alignment = self.case('Robot őrzi a répát', 'Robot őrzi',
                                    [(0, .4), (.48, .8), (.84, .88), (.92, 1.2)])
        with tempfile.TemporaryDirectory() as folder:
            cache = Path(folder)
            source = cache / 'source.mp3'
            source.write_bytes(b'existing paid source')
            meta = dict(fingerprint=gen.fingerprint(clip['spokenText']),
                        sha256=gen.sha(source.read_bytes()), alignment=alignment, duration=1.3)
            def ffmpeg(command, **kwargs):
                if command[-1] != '-':
                    Path(command[-1]).write_bytes(b'recut audio')
            with patch.object(gen, 'CACHE', cache), patch.object(gen, 'assert_not_rejected'), \
                    patch.object(gen.subprocess, 'run', side_effect=ffmpeg) as run, \
                    patch.object(gen.subprocess, 'check_output', return_value=b'.85'), \
                    patch.object(gen.urllib.request, 'urlopen') as api:
                _, bounded = gen.installed_recording(clip, source, meta)
                command = run.call_args_list[0].args[0]
                self.assertAlmostEqual(float(command[command.index('-t') + 1]), .84)
                self.assertAlmostEqual(bounded['sourceEnd'], .84)
                self.assertEqual([word[2] for word in bounded['words']], ['Robot', 'őrzi'])
                bounded_fingerprint = bounded['fingerprint']
                del clip['extract']['boundToAdjacentWords']
                _, ordinary = gen.installed_recording(clip, source, meta)
                self.assertAlmostEqual(ordinary['sourceEnd'], .92)
                self.assertNotEqual(bounded_fingerprint, ordinary['fingerprint'])
                api.assert_not_called()

    def test_source_alignment_tail_drift_cannot_be_saved_as_installed_word_timing(self):
        clip, alignment = self.case('sátor', 'sátor', [(.025, 1.385)])
        del clip['extract']['boundToAdjacentWords']
        with tempfile.TemporaryDirectory() as folder:
            cache = Path(folder)
            source = cache / 'source.mp3'
            source.write_bytes(b'unchanged paid source')
            meta = dict(fingerprint=gen.fingerprint(clip['spokenText']),
                        sha256=gen.sha(source.read_bytes()), alignment=alignment, duration=1.304989)
            def ffmpeg(command, **kwargs):
                if command[-1] != '-':
                    Path(command[-1]).write_bytes(b'encoded short excerpt')
            with patch.object(gen, 'CACHE', cache), patch.object(gen, 'assert_not_rejected'), \
                    patch.object(gen.subprocess, 'run', side_effect=ffmpeg), \
                    patch.object(gen.subprocess, 'check_output', return_value=b'1.304989'), \
                    patch.object(gen.urllib.request, 'urlopen') as api:
                with self.assertRaisesRegex(RuntimeError, 'invalid excerpt word timing'):
                    gen.installed_recording(clip, source, meta)
                api.assert_not_called()
            self.assertFalse(list(cache.glob('*.excerpt.json')))
            self.assertEqual(source.read_bytes(), b'unchanged paid source')


if __name__ == '__main__':
    unittest.main()
