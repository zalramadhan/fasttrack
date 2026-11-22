import { redirect } from "next/navigation";
import Home from "@/components/Home";
import { getCurrentUser } from "@/lib/server/auth";
import { getProject, getSetting } from "@/lib/server/db";
import type { SavedProject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  let savedProject: SavedProject | null = null;
  let projectUpdatedAt: number | null = null;
  const row = await getProject(user.id);
  if (row) {
    projectUpdatedAt = row.updated_at;
    try {
      const parsed = JSON.parse(row.data) as SavedProject;
      if (parsed.version === 1 && Array.isArray(parsed.clips) && parsed.clips.length > 0) {
        savedProject = parsed;
      }
    } catch {
      // Ignore a corrupt project and let the user start fresh.
    }
  }

  return (
    <Home
      user={user}
      savedProject={
        savedProject && projectUpdatedAt
          ? { project: savedProject, updatedAt: projectUpdatedAt }
          : null
      }
      shopeeUrl={(await getSetting("shopee_url")) ?? ""}
    />
  );
}
