import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const YTDLP_BIN = path.join(process.cwd(), ".tools", "ytdlp-venv", "bin", "yt-dlp");

export type DownloadResult = { file: string; ext: string };

export async function downloadVideo(url: string, destDir: string): Promise<DownloadResult> {
  await fs.mkdir(destDir, { recursive: true });
  const outputTemplate = path.join(destDir, "file.%(ext)s");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      YTDLP_BIN,
      [
        "--no-playlist",
        "--no-warnings",
        "--restrict-filenames",
        "--max-filesize",
        "400M",
        "--socket-timeout",
        "20",
        "--retries",
        "2",
        "-f",
        "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b",
        "--merge-output-format",
        "mp4",
        "-o",
        outputTemplate,
        url,
      ],
      { cwd: process.cwd() },
    );

    let stderr = "";
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      err ? reject(err) : resolve();
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Pengambilan video melebihi batas waktu (3 menit)."));
    }, 180_000);

    child.stdout.resume();
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        finish(new Error("yt-dlp belum terpasang. Jalankan: npm run setup:ytdlp"));
        return;
      }
      finish(err);
    });
    child.on("close", (code) => {
      if (code === 0) {
        finish();
        return;
      }
      const tail = stderr.trim().split("\n").slice(-4).join(" ");
      finish(new Error(`yt-dlp gagal: ${tail || `exit code ${code}`}`));
    });
  });

  const entries = await fs.readdir(destDir);
  const candidate = entries
    .filter((name) => !name.endsWith(".part") && !name.endsWith(".ytdl") && name.startsWith("file."))
    .sort((a, b) => (a.endsWith(".mp4") ? -1 : 1) - (b.endsWith(".mp4") ? -1 : 1))[0];

  if (!candidate) throw new Error("Video berhasil diunduh tetapi file tidak ditemukan.");
  const ext = path.extname(candidate).slice(1) || "mp4";
  return { file: path.join(destDir, candidate), ext };
}
