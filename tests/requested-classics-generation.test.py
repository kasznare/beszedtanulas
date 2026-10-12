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
    def test_smaller_requests_preserve_paragraphs_without_changing_the_paid_input(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(generator, 'SOURCE', Path(directory)):
            text=('Ez egy teljes bekezdés. ' * 30).strip() + '\n\n'
            raw=(text * 9).encode()
            Path(directory, 'story.txt').write_bytes(raw)
            entry={'id':'szekely-test','title':'Minta','file':'story.txt','sha256':generator.sha(raw),
                   'rights':{},'requestPartCharacters':4000}
            plan=generator.plan(entry)
            self.assertGreater(len(plan['parts']),1)
            self.assertTrue(all(len(part['spokenText'])<=4000 for part in plan['parts']))
            self.assertEqual(''.join(part['displayText'] for part in plan['parts']),plan['displayText'])
            self.assertEqual(''.join(part['spokenText'] for part in plan['parts']),plan['spokenText'])

    def test_sentence_cues_cover_every_word_and_anchor_to_its_recorded_start(self):
        plan={'title':'Minta','text':'A fiú jön. „Itt vagy?” Itt!\n\nEgy verssor\nMásik verssor.'}
        display=plan['title']+'\n\n'+plan['text']
        words=[{'displayOffset':m.start(),'time':i*1.25} for i,m in enumerate(generator.TOKEN.finditer(display))]
        cues,starts=generator.sentence_captions(plan,words)
        self.assertEqual([c['text'] for c in cues],['A fiú jön.','„Itt vagy?”','Itt!','Egy verssor','Másik verssor.'])
        self.assertEqual(starts,[0,3,4])
        self.assertEqual(cues[0]['time'],1.25)
        self.assertEqual(' '.join(c['text'] for c in cues).split(),plan['text'].split())

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
