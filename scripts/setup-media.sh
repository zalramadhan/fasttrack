#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null || ! command -v python3 >/dev/null; then
  if command -v apt-get >/dev/null; then
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg python3-venv
  else
    echo "Install ffmpeg, ffprobe, and python3-venv manually, then rerun." >&2
    exit 1
  fi
fi

if [ ! -x .tools/ytdlp-venv/bin/yt-dlp ]; then
  npm run setup:ytdlp
fi

if ! ls "$HOME/.cache/ms-playwright"/chromium-*/chrome-linux64/chrome >/dev/null 2>&1; then
  npx playwright-core install --with-deps chromium
fi

ffmpeg -version | head -1
ffprobe -version | head -1
.tools/ytdlp-venv/bin/yt-dlp --version
node -e 'const fs=require("fs");const os=require("os");const path=require("path");const dir=path.join(os.homedir(),".cache/ms-playwright");const hit=fs.existsSync(dir)&&fs.readdirSync(dir).some((name)=>/^chromium-\d+$/.test(name)&&fs.existsSync(path.join(dir,name,"chrome-linux64/chrome")));console.log(hit?"chromium: installed":"chromium: missing")'
