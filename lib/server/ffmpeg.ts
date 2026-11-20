import { spawn, spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

export type AudioClip = {
  path: string;
  trimStart: number;
  duration: number;
};

export type ExportJobConfig = {
  clips: AudioClip[];
  /** Effective overlap per boundary, length = clips.length - 1. */
  transitions?: number[];
  musicPath: string | null;
  framesPath: string;
  outputPath: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  watermark?: boolean;
  sourceVolume: number;
  musicVolume: number;
  musicOffset: number;
  bitrateMbps: number;
};

export function hasAudioStream(file: string): boolean {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "csv=p=0",
      file,
    ],
    { encoding: "utf8" },
  );
  return result.status === 0 && result.stdout.trim().length > 0;
}

const AUDIO_FORMAT = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";

export function buildArgs(config: ExportJobConfig) {
  const {
    clips,
    musicPath,
    framesPath,
    outputPath,
    duration,
    fps,
    width,
    height,
    watermark = false,
    sourceVolume,
    musicVolume,
    musicOffset,
    bitrateMbps,
  } = config;

  const args = [
    "-y",
    "-hide_banner",
    "-nostdin",
    "-f",
    "mjpeg",
    "-framerate",
    String(fps),
    "-i",
    framesPath,
  ];

  const watermarkPad = Math.max(12, Math.round(height * 0.035));
  const videoFilters = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    watermark
      ? `drawtext=font='DejaVu Sans':text='fasttrack':fontcolor=white@0.72:fontsize=${Math.max(14, Math.round(height * 0.04))}:x=w-tw-${watermarkPad}:y=h-th-${watermarkPad}:box=1:boxcolor=black@0.28:boxborderw=${Math.max(6, Math.round(watermarkPad * 0.6))}`
      : null,
    "format=yuv420p",
  ]
    .filter(Boolean)
    .join(",");
  const filters: string[] = [`[0:v]${videoFilters}[v]`];
  const segments: string[] = [];
  let inputIndex = 1;

  const transitions = (config.transitions ?? []).map((value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0,
  );
  const hasTransitions = transitions.some((value) => value > 0.001);

  let cursor = 0;
  for (const [index, clip] of clips.entries()) {
    const transitionIn = index > 0 ? (transitions[index - 1] ?? 0) : 0;
    const transitionOut = index < clips.length - 1 ? (transitions[index] ?? 0) : 0;
    if (index > 0) cursor = cursor + clips[index - 1].duration - transitionIn;

    const useAudio = hasAudioStream(clip.path) && sourceVolume > 0.001;
    if (useAudio) {
      args.push(
        "-ss",
        String(clip.trimStart),
        "-t",
        String(clip.duration),
        "-i",
        clip.path,
      );
    } else {
      args.push(
        "-f",
        "lavfi",
        "-t",
        String(clip.duration),
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=48000",
      );
    }

    const chain = [
      `[${inputIndex}:a]atrim=0:${clip.duration}`,
      "asetpts=PTS-STARTPTS",
      AUDIO_FORMAT,
    ];
    if (useAudio) chain.push(`volume=${sourceVolume}`);

    if (hasTransitions) {
      // Crossfade the overlap so the cut does not jump in volume.
      if (transitionIn > 0.001) {
        chain.push(`afade=t=in:st=0:d=${transitionIn}:curve=tri`);
      }
      if (transitionOut > 0.001) {
        const fadeStart = Math.max(0, clip.duration - transitionOut);
        chain.push(
          `afade=t=out:st=${fadeStart}:d=${transitionOut}:curve=tri`,
        );
      }
      chain.push(`adelay=${Math.round(cursor * 1000)}:all=1`);
    }

    filters.push(`${chain.join(",")}[seg${inputIndex}]`);
    segments.push(`[seg${inputIndex}]`);
    inputIndex += 1;
  }

  let audioOut: string;
  if (segments.length === 1) {
    audioOut = segments[0];
  } else if (hasTransitions) {
    filters.push(
      `${segments.join("")}amix=inputs=${segments.length}:duration=longest:normalize=0[clipsMix]`,
    );
    filters.push(`[clipsMix]atrim=0:${duration},asetpts=PTS-STARTPTS[clips]`);
    audioOut = "[clips]";
  } else {
    filters.push(`${segments.join("")}concat=n=${segments.length}:v=0:a=1[clips]`);
    audioOut = "[clips]";
  }

  if (musicPath && musicVolume > 0.001) {
    args.push("-stream_loop", "-1", "-ss", String(musicOffset), "-i", musicPath);
    filters.push(
      `[${inputIndex}:a]atrim=0:${duration},asetpts=PTS-STARTPTS,${AUDIO_FORMAT},volume=${musicVolume}[music]`,
    );
    filters.push(
      `${audioOut}[music]amix=inputs=2:duration=first:normalize=0[aout]`,
    );
    audioOut = "[aout]";
  }

  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[v]",
    "-map",
    audioOut,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    `${bitrateMbps}M`,
    "-maxrate",
    `${bitrateMbps}M`,
    "-bufsize",
    `${bitrateMbps * 2}M`,
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_range",
    "tv",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    "-t",
    String(duration),
    "-progress",
    "pipe:1",
    "-nostats",
    outputPath,
  );

  return args;
}

export async function assertMediaFile(file: string) {
  const stat = await fs.stat(file);
  if (!stat.size) throw new Error("File media kosong.");
  return stat;
}

export function runExport(
  config: ExportJobConfig,
  onProgress: (ratio: number) => void,
  onDone: (error?: Error) => void,
) {
  const args = buildArgs(config);
  const child = spawn("ffmpeg", args, { cwd: process.cwd() });

  let stderr = "";
  let buffer = "";

  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const [key, value] = line.split("=");
      if (key === "out_time_us" && value) {
        const seconds = Number(value) / 1_000_000;
        if (Number.isFinite(seconds)) {
          onProgress(Math.min(1, seconds / config.duration));
        }
      }
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
    if (stderr.length > 30_000) stderr = stderr.slice(-30_000);
  });

  child.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      onDone(new Error("ffmpeg tidak ditemukan di PATH."));
      return;
    }
    onDone(err);
  });

  child.on("close", (code) => {
    if (code === 0) {
      onDone();
      return;
    }
    const tail = stderr.trim().split("\n").slice(-6).join(" ");
    onDone(new Error(`ffmpeg gagal (exit ${code}): ${tail}`));
  });

  return { file: path.basename(config.outputPath) };
}
