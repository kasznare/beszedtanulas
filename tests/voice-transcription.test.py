"""The local ASR report must not become a pronunciation approval gate."""
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/transcribe-voice.py'
spec = importlib.util.spec_from_file_location('voice_transcription', SCRIPT)
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class LocalTranscriptionTests(unittest.TestCase):
    def test_material_hungarian_differences_are_not_normalized_away(self):
        for expected, heard in [('széles', 'szeles'), ('csobbant', 'csoban'),
                                ('rúddal', 'rúdal'), ('széles', 'szééles')]:
            with self.subTest(expected=expected):
                result = qa.assess(expected, heard, 'new', [])
                self.assertEqual(result['status'], 'transcript-difference')
                self.assertTrue(result['differences'])
                self.assertFalse(result['pronunciationVerified'])

    def test_case_punctuation_and_unicode_composition_are_immaterial(self):
        result = qa.assess('Próbálj széles alapot!', 'PRÓBÁLJ sze\u0301les alapot.', 'new', [])
        self.assertEqual(result['status'], 'transcript-match-unverified')
        self.assertEqual(result['differences'], [])
        self.assertFalse(result['pronunciationVerified'])

    def test_user_rejection_overrides_exact_asr_match_for_both_hashes(self):
        rejection = dict(id='clip', reason='Rövid é.', source={'sha256': 'source'},
                         installed={'sha256': 'excerpt'})
        for audio_sha in ['source', 'excerpt']:
            result = qa.assess('széles', 'széles', audio_sha, [rejection])
            self.assertEqual(result['status'], 'known-rejected')
            self.assertEqual(result['userRejections'][0]['reason'], 'Rövid é.')
        self.assertEqual(qa.assess('széles', 'széles', 'new', [rejection])['status'],
                         'transcript-match-unverified')

    def test_empty_transcript_is_never_an_approval(self):
        for expected in ['Próbálj!', '', None]:
            result = qa.assess(expected, '...', 'new', [])
            self.assertEqual(result['status'], 'no-transcript')
            self.assertFalse(result['pronunciationVerified'])

    def test_insertions_and_omissions_are_visible(self):
        self.assertEqual(qa.compare('Próbálj széles alapot építeni', 'Próbálj alapot építeni'),
                         [dict(kind='delete', expected=['széles'], recognized=[])])
        self.assertEqual(qa.compare('széles alapot', 'széles széles alapot'),
                         [dict(kind='insert', expected=[], recognized=['széles'])])

    def test_recognizer_gets_no_reference_text_or_previous_clip_context(self):
        class Model:
            def transcribe(self, audio, **options):
                self.audio, self.options = audio, options
                return iter([SimpleNamespace(text=' Szeles!', start=0, end=1,
                            words=[SimpleNamespace(word=' Szeles!', start=0, end=1,
                                                   probability=.9)],
                            avg_logprob=-.1, no_speech_prob=.01)]), SimpleNamespace(duration=1.2)
        model = Model()
        actual = qa.transcribe(model, Path('test.mp3'))
        self.assertEqual(actual['text'], 'Szeles!')
        self.assertEqual(actual['words'][0]['text'], ' Szeles!')
        self.assertEqual(model.options['language'], 'hu')
        self.assertFalse(model.options['condition_on_previous_text'])
        for key in ('initial_prompt', 'prefix', 'hotwords'):
            self.assertIsNone(model.options[key])

    def test_html_escapes_source_and_never_labels_a_match_as_approved(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            qa.render_report({'clips': [dict(id='<script>alert(1)</script>',
                expected='széles', recognized='széles', status='transcript-match-unverified',
                audioCopy='audio/test.mp3')]}, output)
            document = (output / 'report.html').read_text()
            self.assertNotIn('<script>', document)
            self.assertIn('kiejtés nem igazolt', document)
            self.assertIn('<audio controls', document)

    def test_mlx_adapter_preserves_words_and_uses_unprompted_decode(self):
        module = SimpleNamespace(transcribe=Mock(return_value=dict(text=' Szeles!', segments=[dict(
            text=' Szeles!', start=0, end=.8, avg_logprob=-.1, no_speech_prob=.01,
            words=[dict(word=' Szeles!', start=0, end=.8, probability=.9)])])))
        loader = Mock(return_value=[0] * 19200)
        with patch.dict(qa.sys.modules, {'mlx_whisper.audio': SimpleNamespace(
                SAMPLE_RATE=16000, load_audio=loader)}):
            actual = qa.transcribe_mlx(module, Path('/local/model'), Path('test.mp3'))
        self.assertEqual(actual['text'], 'Szeles!')
        self.assertEqual(actual['duration'], 1.2)
        self.assertEqual(actual['words'][0]['probability'], .9)
        options = module.transcribe.call_args.kwargs
        self.assertEqual(options['path_or_hf_repo'], '/local/model')
        self.assertEqual(options['language'], 'hu')
        self.assertFalse(options['condition_on_previous_text'])
        for key in ('initial_prompt', 'prefix'):
            self.assertIsNone(options[key])
        self.assertNotIn('beam_size', options)
        self.assertNotIn('hotwords', options)

    def test_mlx_resolves_only_cached_model_and_records_distinct_provenance(self):
        with tempfile.TemporaryDirectory() as folder:
            model = Path(folder)
            (model / 'config.json').write_text('{}')
            (model / 'weights.safetensors').write_bytes(b'mock weights')
            resolve = Mock(return_value=str(model))
            args = SimpleNamespace(backend='mlx', model=None, threads=4)
            with patch.dict(qa.sys.modules, {'mlx_whisper': SimpleNamespace(),
                    'huggingface_hub': SimpleNamespace(snapshot_download=resolve)}), \
                    patch.object(qa.importlib.metadata, 'version', return_value='test'), \
                    patch.object(qa, 'ffmpeg_identity', return_value={'sha256': 'decoder-v1'}):
                decoder, engine = qa.load_backend(args)
                with patch.object(qa, 'ffmpeg_identity', return_value={'sha256': 'decoder-v2'}):
                    _, changed_engine = qa.load_backend(args)
            self.assertEqual(resolve.call_count, 2)
            resolve.assert_called_with(repo_id='mlx-community/whisper-large-v3-turbo',
                                       local_files_only=True)
            self.assertTrue(callable(decoder))
            self.assertEqual(engine['backend'], 'mlx')
            self.assertEqual(engine['device'], 'metal')
            self.assertEqual(engine['modelPath'], str(model.resolve()))
            self.assertIn('weights.safetensors', engine['modelFiles'])
            self.assertEqual(engine['ffmpeg']['sha256'], 'decoder-v1')
            # The full engine participates in the ASR cache key, including decoder identity.
            self.assertNotEqual(engine, changed_engine)

    def test_local_ffmpeg_identity_tracks_binary_and_version_without_audio_or_shell(self):
        with tempfile.TemporaryDirectory() as folder:
            executable = Path(folder) / 'ffmpeg'
            executable.write_bytes(b'decoder-v1')
            with patch.object(qa.shutil, 'which', return_value=str(executable)), \
                    patch.object(qa.subprocess, 'check_output', return_value='ffmpeg version test\nlibavcodec 1\n') as probe:
                before = qa.ffmpeg_identity()
                probe.assert_called_once_with([str(executable.resolve()), '-version'], text=True, timeout=10)
                executable.write_bytes(b'decoder-v2')
                binary_changed = qa.ffmpeg_identity()
                probe.return_value = 'ffmpeg version test\nlibavcodec 2\n'
                library_changed = qa.ffmpeg_identity()
            self.assertEqual(before['path'], str(executable.resolve()))
            self.assertEqual(before['version'], 'ffmpeg version test')
            self.assertNotEqual(before['sha256'], binary_changed['sha256'])
            self.assertEqual(binary_changed['sha256'], library_changed['sha256'])
            self.assertNotEqual(binary_changed['versionSha256'], library_changed['versionSha256'])

    def test_missing_ffmpeg_fails_locally(self):
        with patch.object(qa.shutil, 'which', return_value=None), \
                patch.object(qa.subprocess, 'check_output') as probe:
            with self.assertRaisesRegex(ValueError, 'helyi FFmpeg'):
                qa.ffmpeg_identity()
            probe.assert_not_called()

    def test_incomplete_local_mlx_model_fails_without_download(self):
        with tempfile.TemporaryDirectory() as folder:
            resolve = Mock(side_effect=AssertionError('must not fetch'))
            args = SimpleNamespace(backend='mlx', model=folder, threads=4)
            with patch.dict(qa.sys.modules, {'mlx_whisper': SimpleNamespace(),
                    'huggingface_hub': SimpleNamespace(snapshot_download=resolve)}):
                with self.assertRaisesRegex(ValueError, 'Hiányos'):
                    qa.load_backend(args)
            resolve.assert_not_called()

    def test_modified_sample_is_rejected_before_recognition(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'sample.mp3').write_bytes(b'changed audio')
            sample = root / 'sample.json'
            sample.write_text(json.dumps(dict(file='sample.mp3', sha256='old',
                                              clip=dict(id='sample', text='széles'))))
            args = SimpleNamespace(ids=None, all=False, samples=[sample], audio=None,
                                   expected=None)
            with self.assertRaisesRegex(ValueError, 'ellenőrzőösszege'):
                qa.select_inputs(args)

    def test_default_manifest_keeps_project_root_audio_base(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            manifest = root / 'audio/voice/manifest.json'
            manifest.parent.mkdir(parents=True)
            audio = manifest.parent / 'clip.mp3'
            audio.write_bytes(b'audio')
            qa.write_json(manifest, {'clips': [dict(id='clip', text='széles', file='audio/voice/clip.mp3')]})
            args = SimpleNamespace(ids=['clip'], all=False, manifest=manifest, audio_root=None,
                                   samples=None, audio=None, expected=None)
            with patch.object(qa, 'ROOT', root):
                self.assertEqual(qa.select_inputs(args)[0]['file'], str(audio.resolve()))

    def test_custom_manifest_uses_one_explicit_audio_root_without_fallback_search(self):
        with tempfile.TemporaryDirectory() as folder:
            sandbox = Path(folder)
            manifest = sandbox / 'audio/voice/manifest.json'
            manifest.parent.mkdir(parents=True)
            audio = manifest.parent / 'clip.mp3'
            audio.write_bytes(b'audio')
            qa.write_json(manifest, {'clips': [dict(id='clip', text='széles', file='audio/voice/clip.mp3')]})
            args = SimpleNamespace(ids=['clip'], all=False, manifest=manifest, audio_root=None,
                                   samples=None, audio=None, expected=None)
            with self.assertRaisesRegex(ValueError, 'Hiányzó hangfájl'):
                qa.select_inputs(args)
            args.audio_root = sandbox
            self.assertEqual(qa.select_inputs(args)[0]['file'], str(audio.resolve()))
            args.audio_root = sandbox / 'wrong-root'
            with self.assertRaisesRegex(ValueError, 'Hiányzó hangfájl'):
                qa.select_inputs(args)
            # A custom adjacent-file manifest remains supported without --audio-root.
            qa.write_json(manifest, {'clips': [dict(id='clip', text='széles', file='clip.mp3')]})
            args.audio_root = None
            self.assertEqual(qa.select_inputs(args)[0]['file'], str(audio.resolve()))

    def test_audio_root_requires_manifest_selection(self):
        args = SimpleNamespace(ids=None, all=False, audio_root=Path('/explicit/root'))
        with self.assertRaisesRegex(ValueError, '--ids vagy --all'):
            qa.select_inputs(args)

    def test_decode_failure_preserves_human_rejection_and_offline_loading(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            audio = root / 'rejected.mp3'
            audio.write_bytes(b'rejected audio')
            model_dir = root / 'model'
            model_dir.mkdir()
            (model_dir / 'model.bin').write_bytes(b'mock weights')
            qa.write_json(root / 'voice-rejections.json', dict(recordings=[dict(
                id='clip', reason='Hibás kiejtés.', installed={'sha256': qa.sha_file(audio)})]))
            model = Mock()
            model.transcribe.side_effect = RuntimeError('decode failed')
            constructor = Mock(return_value=model)
            modules = {'faster_whisper': SimpleNamespace(WhisperModel=constructor),
                       'faster_whisper.utils': SimpleNamespace(download_model=Mock())}
            argv = [str(SCRIPT), '--audio', str(audio), '--expected', 'széles',
                    '--model', str(model_dir), '--output', str(root / 'report'),
                    '--cache-dir', str(root / 'cache')]
            with patch.object(qa, 'ROOT', root), patch.object(qa.sys, 'argv', argv), \
                    patch.dict(qa.sys.modules, modules), patch.dict(qa.os.environ, {}, clear=True), \
                    patch.object(qa.importlib.metadata, 'version', return_value='test'), \
                    patch('builtins.print'):
                self.assertEqual(qa.main(), 1)
                self.assertEqual(qa.os.environ['HF_HUB_OFFLINE'], '1')
                self.assertTrue(constructor.call_args.kwargs['local_files_only'])
            clip = qa.read_json(root / 'report/report.json')['clips'][0]
            self.assertEqual(clip['status'], 'error')
            self.assertEqual(clip['audioSha256'], qa.sha_file(audio))
            self.assertEqual(clip['userRejections'][0]['reason'], 'Hibás kiejtés.')
            self.assertFalse(clip['pronunciationVerified'])


if __name__ == '__main__':
    unittest.main()
