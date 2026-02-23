import fs from "node:fs/promises";
import path from "node:path";
import googleTTS from "google-tts-api";

const root = process.cwd();
const wordsFile = path.join(root, "scripts", "words.txt");
const outDir = path.join(root, "audio");

await fs.mkdir(outDir, { recursive: true });
const raw = await fs.readFile(wordsFile, "utf8");
const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);

for (const line of lines) {
  const [id, text] = line.split("|");
  if (!id || !text) {
    console.warn(`Skipping malformed line: ${line}`);
    continue;
  }

  const url = googleTTS.getAudioUrl(text, {
    lang: "hu",
    slow: false,
    host: "https://translate.google.com",
  });

  const outFile = path.join(outDir, `${id}.mp3`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed for "${text}" with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outFile, buffer);
  console.log(`Saved ${outFile}`);
}

console.log("Done. Generated Hungarian audio into /audio.");
