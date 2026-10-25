import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const body = name => { const start = app.indexOf(`function ${name}(`); return app.slice(start, app.indexOf('\n}\n', start)); };

test('"Keressük meg!" from a picture topic uses that topic only while the launched game stays open', () => {
  const launch = body('launchCardPractice');
  assert.doesNotMatch(launch, /settings\.practiceTopic\s*=/, 'the saved picture topic is not overwritten');
  assert.doesNotMatch(launch, /settings\.useFavorites\s*=/, 'favourites are not switched off for good');
  assert.match(launch, /launchedTopic=\{screen,topic:selectedCategory\}/);
  assert.match(body('getPracticeWords'), /launchedTopic\?\.topic \?\? state\.settings\.practiceTopic/);
  assert.match(body('showScreen'), /if \(launchedTopic && launchedTopic\.screen !== screen\) launchedTopic = null;/, 'leaving the game forgets the launch topic');
});

test('the picture games may fill a small topic from the whole word list', () => {
  for (const game of ['listeningGame', 'memoryGame', 'flipGame']) {
    const start = app.indexOf(`${game} = setup`) >= 0 ? app.indexOf(`${game} = setup`) : app.indexOf(`${game}=setup`);
    assert.ok(start >= 0, game);
    assert.match(app.slice(start, app.indexOf('});', start)), /allWords:\s*words/, game);
  }
});
