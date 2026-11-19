import type { MediaAsset } from "./types";

async function readError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function uploadMedia(file: File, kind: "video" | "audio"): Promise<MediaAsset> {
  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);
  const res = await fetch("/api/source/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { asset: MediaAsset };
  return data.asset;
}

export async function importFromLink(url: string): Promise<MediaAsset> {
  const res = await fetch("/api/source/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { asset: MediaAsset };
  return data.asset;
}

export function probeVideo(
  url: string,
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      video.removeAttribute("src");
    };
    video.onerror = () => reject(new Error("Video tidak bisa dibaca browser."));
  });
}

export function probeAudio(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      audio.removeAttribute("src");
    };
    audio.onerror = () => resolve(0);
  });
}
