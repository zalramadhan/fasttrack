import { spawnSync } from "node:child_process";
import { accessSync, createWriteStream, promises as fs, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { chromium } from "playwright-core";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function isThreadsUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "threads.net" || host === "threads.com";
  } catch {
    return false;
  }
}

export async function downloadThreadsVideo(url: string, destDir: string) {
  const executablePath = findChromium();
  if (!executablePath) {
    throw new Error(
      "Butuh Chromium untuk mengambil video Threads. Jalankan: npm run setup:browser",
    );
  }

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let videoUrl: string | null = null;
  try {
    const context = await browser.newContext({
      userAgent: UA,
      locale: "en-US",
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    const networkVideos: string[] = [];

    page.on("response", (response) => {
      const type = response.headers()["content-type"] ?? "";
      const target = response.url();
      if (type.startsWith("video/") && target.includes(".mp4")) {
        networkVideos.push(target);
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !videoUrl) {
      const found = await page
        .evaluate(() => {
          const videos = [...document.querySelectorAll("video")];
          const playing = videos.find((video) => (video.currentSrc || video.src).startsWith("http"));
          if (playing) return playing.currentSrc || playing.src;
          return "";
        })
        .catch(() => "");
      if (found) videoUrl = found;
      else if (networkVideos.length) videoUrl = networkVideos[networkVideos.length - 1];
      else await new Promise((resolve) => setTimeout(resolve, 700));
    }
  } finally {
    await browser.close().catch(() => {});
  }

  if (!videoUrl) {
    throw new Error(
      "Video Threads tidak ditemukan. Pastikan post publik dan berisi video, bukan hanya gambar.",
    );
  }

  await fs.mkdir(destDir, { recursive: true });
  const file = path.join(destDir, "file.mp4");
  const response = await fetch(videoUrl, {
    headers: {
      "user-agent": UA,
      referer: "https://www.threads.com/",
      accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Gagal mengunduh video Threads (HTTP ${response.status}).`);
  }
  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(file),
  );

  const stat = await fs.stat(file);
  if (stat.size < 50_000) {
    throw new Error("File video Threads terlalu kecil atau tidak valid.");
  }
  return { file, ext: "mp4" };
}

function findChromium(): string | null {
  const fromEnv = process.env.CHROMIUM_PATH;
  if (fromEnv) {
    try {
      accessSync(fromEnv);
      return fromEnv;
    } catch {
      // fall through
    }
  }

  const cacheRoot = path.join(os.homedir(), ".cache", "ms-playwright");
  try {
    const entries = readdirSync(cacheRoot);
    const dirs = entries
      .filter((name) => name.startsWith("chromium"))
      .sort()
      .reverse();
    for (const dir of dirs) {
      for (const candidate of [
        "chrome-linux64/chrome",
        "chrome-linux/chrome",
        "chrome-headless-shell-linux64/chrome-headless-shell",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      ]) {
        const full = path.join(cacheRoot, dir, candidate);
        try {
          accessSync(full);
          return full;
        } catch {
          // keep looking
        }
      }
    }
  } catch {
    // no playwright cache
  }

  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const result = spawnSync("which", [name], { encoding: "utf8" });
    const found = result.stdout?.trim();
    if (result.status === 0 && found) return found;
  }
  return null;
}
