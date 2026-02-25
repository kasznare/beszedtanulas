import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { tmpdir } from "node:os";

const root = process.cwd();
const wordsFile = path.join(root, "scripts", "words.txt");
const audioDir = path.join(root, "audio");

await ensureFfmpeg();
await fs.mkdir(audioDir, { recursive: true });

const rl = createInterface({ input, output });

try {
  const deviceIndex = await selectAudioDevice(rl);
  const wordsMap = await readWords(wordsFile);

  console.log("");
  console.log("Add and record words directly into this project.");
  console.log("Leave the word empty to finish.");
  console.log("");

  while (true) {
    const labelRaw = await rl.question("Hungarian word: ");
    const label = labelRaw.trim();
    if (!label) break;

    const defaultId = slugify(label);
    if (!defaultId) {
      console.log("Could not build a safe id from that text. Try another word.");
      continue;
    }

    const idRaw = await rl.question(`File id [${defaultId}]: `);
    const id = sanitizeId(idRaw) || defaultId;
    const existing = wordsMap.get(id);

    if (existing && existing !== label) {
      console.log(`Existing id "${id}" has label "${existing}".`);
    }

    const outFile = path.join(audioDir, `${id}.mp3`);
    await recordClip({
      rl,
      deviceIndex,
      outFile,
      id,
      label,
    });

    if (!existing) {
      await appendWord(wordsFile, id, label);
      wordsMap.set(id, label);
      console.log(`Added scripts/words.txt entry: ${id}|${label}`);
    } else if (existing !== label) {
      const overwrite = await yesNoQuestion(
        rl,
        `Update scripts/words.txt label to "${label}" for id "${id}"? [y/N]: `,
        false,
      );
      if (overwrite) {
        wordsMap.set(id, label);
        await writeWords(wordsFile, wordsMap);
        console.log(`Updated scripts/words.txt entry: ${id}|${label}`);
      }
    }

    console.log(`Saved recording: audio/${id}.mp3`);
    console.log("");
  }

  console.log("Done.");
} finally {
  rl.close();
}

async function ensureFfmpeg() {
  await runCommand("ffmpeg", ["-version"]).catch(() => {
    throw new Error("ffmpeg not found. Install first: brew install ffmpeg");
  });
}

async function selectAudioDevice(rl) {
  const outputText = await runCommand("ffmpeg", [
    "-hide_banner",
    "-f",
    "avfoundation",
    "-list_devices",
    "true",
    "-i",
    "",
  ]).catch((error) => error.outputText ?? "");

  const audioDevices = [];
  let currentSection = "unknown";
  for (const line of outputText.split("\n")) {
    const lower = line.toLowerCase();
    if (lower.includes("avfoundation video devices")) {
      currentSection = "video";
      continue;
    }
    if (lower.includes("avfoundation audio devices")) {
      currentSection = "audio";
      continue;
    }

    const match = line.match(/\[(\d+)\]\s+(.+)$/);
    if (!match) continue;
    if (currentSection !== "audio") continue;
    audioDevices.push({ index: match[1], name: match[2] });
  }

  if (audioDevices.length > 0) {
    console.log("Audio input devices:");
    for (const device of audioDevices) {
      console.log(`  ${device.index}: ${device.name}`);
    }
  } else {
    console.log("Could not list audio devices. Falling back to index 0.");
  }

  const answer = await rl.question("Audio device index [0]: ");
  const deviceIndex = answer.trim() || "0";
  console.log("");
  return deviceIndex;
}

async function recordClip({ rl, deviceIndex, outFile, id, label }) {
  const tempWav = path.join(
    tmpdir(),
    `beszedtanulas-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
  );

  await rl.question(`Press Enter to start recording "${label}" (${id})...`);
  console.log("Recording... press Enter to stop.");

  const recorder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "avfoundation",
      "-i",
      `:${deviceIndex}`,
      "-ac",
      "1",
      "-ar",
      "48000",
      "-c:a",
      "pcm_s16le",
      "-y",
      tempWav,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );

  const stopRecording = new Promise((resolve, reject) => {
    recorder.on("error", reject);
    recorder.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  await rl.question("");
  if (recorder.stdin.writable) recorder.stdin.write("q\n");
  await stopRecording;

  await runCommand("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    tempWav,
    "-ac",
    "1",
    "-ar",
    "48000",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    "-af",
    "highpass=f=70,lowpass=f=14500,loudnorm=I=-16:TP=-1.5:LRA=9",
    "-y",
    outFile,
  ]);

  await fs.unlink(tempWav).catch(() => {});
}

async function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdoutText = "";
    let stderrText = "";

    child.stdout.on("data", (chunk) => {
      stdoutText += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderrText += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      const outputText = `${stdoutText}\n${stderrText}`;
      if (code === 0) {
        resolve(outputText);
      } else {
        const error = new Error(`${cmd} exited with code ${code}`);
        error.outputText = outputText;
        reject(error);
      }
    });
  });
}

async function readWords(filePath) {
  const map = new Map();
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [id, label] = line.split("|");
    if (!id || !label) continue;
    map.set(id, label);
  }
  return map;
}

async function appendWord(filePath, id, label) {
  const raw = await fs.readFile(filePath, "utf8");
  const prefix = raw.endsWith("\n") || raw.length === 0 ? "" : "\n";
  await fs.writeFile(filePath, `${raw}${prefix}${id}|${label}\n`, "utf8");
}

async function writeWords(filePath, wordsMap) {
  const lines = [...wordsMap.entries()].map(([id, label]) => `${id}|${label}`);
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

function slugify(inputText) {
  return inputText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function sanitizeId(inputText) {
  return inputText.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function yesNoQuestion(rl, prompt, defaultYes) {
  const answer = (await rl.question(prompt)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}
