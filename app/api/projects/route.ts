import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getProject, saveProject } from "@/lib/server/db";
import { isSafeId, pinAsset, readAsset, unpinAsset } from "@/lib/server/storage";
import { MAX_CLIPS, type SavedProject } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function projectAssetIds(project: SavedProject) {
  const ids = new Set<string>();
  for (const clip of project.clips) {
    const id = clip.asset?.id;
    if (typeof id === "string") ids.add(id);
  }
  if (project.music?.id) ids.add(project.music.id);
  return ids;
}

function parseAssetIds(raw: string) {
  try {
    return projectAssetIds(JSON.parse(raw) as SavedProject);
  } catch {
    return new Set<string>();
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { project?: SavedProject };
    const project = body.project;

    if (
      !project ||
      project.version !== 1 ||
      !Array.isArray(project.clips) ||
      project.clips.length === 0 ||
      project.clips.length > MAX_CLIPS ||
      !Array.isArray(project.layers) ||
      !project.videoFrame
    ) {
      return NextResponse.json({ error: "Project tidak valid." }, { status: 400 });
    }

    const serialized = JSON.stringify(project);
    if (serialized.length > 500_000) {
      return NextResponse.json({ error: "Project terlalu besar." }, { status: 413 });
    }

    const ids = projectAssetIds(project);
    for (const id of ids) {
      if (!isSafeId(id)) {
        return NextResponse.json({ error: "Media project tidak valid." }, { status: 400 });
      }
      const asset = await readAsset(id);
      if (!asset || (asset.ownerId && asset.ownerId !== user.id)) {
        return NextResponse.json(
          { error: "Salah satu media project sudah tidak tersedia. Upload ulang." },
          { status: 409 },
        );
      }
    }

    const previous = getProject(user.id);
    const previousIds = previous ? parseAssetIds(previous.data) : new Set<string>();

    for (const id of ids) {
      if (!(await pinAsset(id, user.id))) {
        return NextResponse.json(
          { error: "Salah satu media project tidak bisa disimpan." },
          { status: 409 },
        );
      }
    }

    const updatedAt = saveProject(user.id, serialized);

    for (const id of previousIds) {
      if (!ids.has(id)) await unpinAsset(id, user.id);
    }

    return NextResponse.json({ updatedAt });
  } catch (error) {
    console.error("[projects/save]", error);
    return NextResponse.json({ error: "Gagal menyimpan project." }, { status: 500 });
  }
}
