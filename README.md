# Beszédtanulás (Hungarian toddler speech game)

Simple MVP website with:
- picture cards (tap to hear Hungarian word)
- imitate mode (`Mondd: ...`)
- parent progress tracking in local storage

If an `audio/<id>.mp3` file is missing, the app falls back to browser speech synthesis (`hu-HU`).

## Run on Mac

```bash
cd /Users/kasznarandras/Code/beszedtanulas
npm install
npm run start
```

Open: `http://localhost:5173`

## Generate Hungarian audio automatically

1. Edit `scripts/words.txt` with lines in this format:
```txt
file_id|Hungarian text
```

2. Generate mp3 files:
```bash
npm run generate-audio
```

3. Files are written to `audio/` (example: `audio/viz.mp3`).

## Replace with your own voice recordings

You can overwrite any generated file with your own recording while keeping names:
- `audio/viz.mp3`
- `audio/anya.mp3`
- etc.

The app will always prefer your file if it exists.

## Convert your `rawaudio` recordings to app mp3 files

Put recordings into `rawaudio/` (for example `anya.m4a`, `apa.m4a`) and run:

```bash
npm run convert-raw-audio
```

This writes normalized mono mp3 files into `audio/` using the same base filename.

## Record directly from microphone (faster than Voice Memos export)

If you want to record your own voice quickly, you can now do it in one flow:

```bash
npm run record-words
```

What it does:
- asks for the Hungarian word (for example `kanál`)
- suggests a safe file id (for example `kanal`)
- records raw WAV from your mic first, then encodes higher-quality MP3 (`libmp3lame`, VBR)
- adds the `id|word` line to `scripts/words.txt` automatically if it is new

Requirements:
- `ffmpeg` installed (`brew install ffmpeg`)

Tip:
- if you add a new word, also add it to the `words` array in `app.js` so it appears in the game UI.
