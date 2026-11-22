import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/server/media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ToolCheck = { ok: boolean; version?: string; path?: string };

function runTool(command: string, args: string[]): ToolCheck {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 4000,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return {
    ok: result.status === 0,
    version: output.split("\n")[0]?.slice(0, 120) || undefined,
  };
}

function findChromium(): string | null {
  const candidates = [
    process.env.CHROMIUM_PATH,
    path.join(os.homedir(), ".cache", "ms-playwright"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(/* turbopackIgnore: true */ candidate).isFile()) return candidate;
    } catch {
      // Not a direct executable path; look inside the Playwright cache.
    }
    try {
      for (const name of fs.readdirSync(candidate)) {
        if (!name.startsWith("chromium-")) continue;
        for (const relative of [
          "chrome-linux64/chrome",
          "chrome-linux/chrome",
          "chrome-headless-shell-linux64/chrome-headless-shell",
          "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        ]) {
          const full = path.join(/* turbopackIgnore: true */ candidate, name, relative);
          if (fs.existsSync(/* turbopackIgnore: true */ full)) return full;
        }
      }
    } catch {
      // Cache directory does not exist yet.
    }
  }
  return null;
}

let toolCache: { at: number; checks: Record<string, ToolCheck> } | null = null;

function toolChecks() {
  if (toolCache && Date.now() - toolCache.at < 60_000) return toolCache.checks;
  const chromium = findChromium();
  const checks = {
    ffmpeg: runTool("ffmpeg", ["-version"]),
    ffprobe: runTool("ffprobe", ["-version"]),
    ytdlp: runTool(path.join(process.cwd(), ".tools", "ytdlp-venv", "bin", "yt-dlp"), [
      "--version",
    ]),
    chromium: { ok: Boolean(chromium) },
  };
  toolCache = { at: Date.now(), checks };
  return checks;
}

export async function GET() {
  const checks: Record<string, ToolCheck> = { ...toolChecks() };
  let ok = Object.values(checks).every((check) => check.ok);

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").select("id").limit(1);
    checks.database = { ok: !error };
    if (error) ok = false;

    const { data: bucket, error: storageError } = await admin.storage.getBucket(MEDIA_BUCKET);
    checks.storage = {
      ok: Boolean(bucket) && !storageError,
      version: bucket ? MEDIA_BUCKET : undefined,
    };
    if (storageError || !bucket) ok = false;
  } catch {
    checks.database = { ok: false };
    checks.storage = { ok: false };
    ok = false;
  }

  return NextResponse.json(
    {
      ok,
      time: new Date().toISOString(),
      checks,
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
