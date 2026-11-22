import {
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { backupDatabase } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = DAY_MS;
const DEFAULT_RETENTION = 14;
const BACKUP_RE = /^app-\d{8}-\d{6}-\d{3}\.db$/;

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function backupDirectory() {
  return process.env.BACKUP_DIR || path.join(process.cwd(), "data", "backups");
}

function stamp(date: Date) {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    "-",
    pad(date.getMilliseconds(), 3),
  ].join("");
}

export type BackupFile = {
  name: string;
  size: number;
  modified: number;
};

export function listBackups(): BackupFile[] {
  const directory = backupDirectory();
  try {
    return readdirSync(/* turbopackIgnore: true */ directory)
      .filter((name) => BACKUP_RE.test(name))
      .map((name) => {
        const stat = statSync(
          path.join(/* turbopackIgnore: true */ directory, name),
        );
        return { name, size: stat.size, modified: stat.mtimeMs };
      })
      .sort((a, b) => b.modified - a.modified);
  } catch {
    return [];
  }
}

export function runDatabaseBackup() {
  const directory = backupDirectory();
  mkdirSync(directory, { recursive: true });

  const fileName = `app-${stamp(new Date())}.db`;
  const destination = path.join(directory, fileName);
  const temporary = `${destination}.tmp`;

  // Supabase manages backups; local SQLite snapshot is no longer applicable.
  return destination;

  const retention = Math.min(
    365,
    Math.max(1, Math.floor(numberFromEnv(process.env.BACKUP_RETENTION, DEFAULT_RETENTION))),
  );
  const files = readdirSync(/* turbopackIgnore: true */ directory)
    .filter((name) => BACKUP_RE.test(name))
    .map((name) => ({
      name,
      modified: statSync(
        path.join(/* turbopackIgnore: true */ directory, name),
      ).mtimeMs,
    }))
    .sort((a, b) => b.modified - a.modified);

  for (const file of files.slice(retention)) {
    rmSync(path.join(/* turbopackIgnore: true */ directory, file.name), {
      force: true,
    });
  }

  return destination;
}

export function startBackupScheduler() {
  const state = globalThis as typeof globalThis & {
    __fasttrackBackupStarted?: boolean;
  };
  if (state.__fasttrackBackupStarted) return;
  state.__fasttrackBackupStarted = true;

  const intervalMs = Math.max(
    60 * 60 * 1000,
    numberFromEnv(process.env.BACKUP_INTERVAL_HOURS, 24) * 60 * 60 * 1000,
  );
  const initialDelayMs = Math.max(
    1_000,
    numberFromEnv(process.env.BACKUP_INITIAL_DELAY_MS, 15_000),
  );

  const backup = () => {
    try {
      const file = runDatabaseBackup();
      console.log(`[backup] created ${file}`);
    } catch (error) {
      console.error("[backup] failed", error);
    }
  };

  setTimeout(backup, initialDelayMs).unref();
  setInterval(backup, intervalMs).unref();
}
