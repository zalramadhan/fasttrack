import { spawnSync } from "node:child_process";
import { accessSync, createWriteStream, promises as fs, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { chromium } from "playwright-core";
import { assertSafeFetchUrl } from "./url-safety";

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

    // Share links redirect client-side to the canonical post URL. Resolve it
    // first so the video is taken from that post, not from feed recommendations.
    await page
      .waitForFunction(
        () => {
          const canonical = document
            .querySelector('link[rel="canonical"]')
            ?.getAttribute("href");
          const href = canonical || location.href;
          return /\/@[^/]+\/post\/[^/?#]+/.test(href);
        },
        { timeout: 20_000 },
      )
      .catch(() => {});

    const canonical = await page
      .evaluate(() => {
        const link = document
          .querySelector('link[rel="canonical"]')
          ?.getAttribute("href");
        return link && /\/@[^/]+\/post\/[^/?#]+/.test(link) ? link : location.href;
      })
      .catch(() => "");
    const postPath = canonical.match(/\/@[^/]+\/post\/[^/?#]+/)?.[0] ?? null;

    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline && !videoUrl) {
      const found = await page
        .evaluate((path) => {
          if (!path) return "";
          const links = [...document.querySelectorAll("a[href]")].filter((anchor) => {
            const href = anchor.getAttribute("href") ?? "";
            return href === path || href.startsWith(`${path}?`);
          });
          // The timestamp link is an exact match; the breadcrumb often carries
          // a tracking query and sits in a container with feed videos.
          links.sort((a, b) => {
            const ah = a.getAttribute("href") ?? "";
            const bh = b.getAttribute("href") ?? "";
            return Number(bh === path) - Number(ah === path);
          });

          for (const link of links) {
            let el: Element | null = link;
            while (el && el !== document.body) {
              const src = [...el.querySelectorAll("video")]
                .map((video) => video.currentSrc || video.src)
                .find((value) => value.startsWith("http"));
              if (src) return src;
              el = el.parentElement;
            }
          }
          return "";
        }, postPath)
        .catch(() => "");
      if (found) videoUrl = found;
      else if (!postPath && networkVideos.length) videoUrl = networkVideos[0];
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

  const safeVideoUrl = (await assertSafeFetchUrl(videoUrl)).toString();
  await fs.mkdir(destDir, { recursive: true });
  const file = path.join(destDir, "file.mp4");
  const response = await fetch(safeVideoUrl, {
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
