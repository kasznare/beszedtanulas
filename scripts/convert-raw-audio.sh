#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAW_DIR="${ROOT_DIR}/rawaudio"
OUT_DIR="${ROOT_DIR}/audio"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install first: brew install ffmpeg"
  exit 1
fi

if [[ ! -d "${RAW_DIR}" ]]; then
  echo "Missing folder: ${RAW_DIR}"
  exit 1
fi

mkdir -p "${OUT_DIR}"

shopt -s nullglob
files=("${RAW_DIR}"/*.{m4a,wav,mp3,aac,flac})

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No supported files found in ${RAW_DIR}"
  exit 1
fi

for input in "${files[@]}"; do
  base="$(basename "${input}")"
  name="${base%.*}"
  output="${OUT_DIR}/${name}.mp3"

  ffmpeg -y -i "${input}" \
    -ar 44100 \
    -ac 1 \
    -b:a 96k \
    -af "loudnorm=I=-18:TP=-1.5:LRA=11" \
    "${output}" >/dev/null 2>&1

  echo "Converted: ${base} -> audio/${name}.mp3"
done

echo "Done. Output folder: ${OUT_DIR}"
